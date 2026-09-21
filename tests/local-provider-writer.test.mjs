import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inspectLegacyProviders } from "../scripts/ingest-legacy-providers.mjs";
import { LOCAL_TARGET, LOCAL_CONFIRMATION, parseLocalArgs, assertLocalContainer,
  buildLocalImportSql, jsonSql } from "../lib/local-provider-writer.mjs";

test("local writer requires explicit write opt-in and exact target; rejects remote/unknown targets", () => {
  assert.equal(parseLocalArgs([]).mode, "--dry-run");
  assert.equal(parseLocalArgs(["--verify-local"]).mode, "--verify-local");
  assert.equal(parseLocalArgs(["--write-local", "--confirm", LOCAL_CONFIRMATION]).mode, "--write-local");
  assert.throws(() => parseLocalArgs(["--write-local"]), /require/);
  for (const args of [["--confirm", LOCAL_CONFIRMATION], ["--write-local", "--confirm", "production"],
    ["--dry-run", "--write-local", "--confirm", LOCAL_CONFIRMATION], ["--import"], ["--target"],
    ["--dry-run", "--dry-run"]]) assert.throws(() => parseLocalArgs(args));
  for (const target of ["postgresql://remote.supabase.co:5432/postgres", "https://remote.supabase.co",
    "postgresql://192.168.1.5:54322/postgres", "postgresql://127.0.0.1:5432/postgres",
    "postgresql://127.0.0.1:54322/other", "postgresql://127.0.0.1.evil:54322/postgres",
    "postgresql://127.0.0.1:54322/postgres?host=remote", "postgresql://user:secret@127.0.0.1:54322/postgres",
    "postgresql://localhost:54322/postgres"]) assert.throws(() => parseLocalArgs(["--target", target]));
  assert.equal(parseLocalArgs(["--target", LOCAL_TARGET]).target, LOCAL_TARGET);
});

test("container guard requires local project, workspace, image, port and immutable ID", () => {
  const workspace = fileURLToPath(new URL("../", import.meta.url));
  const config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
  const info = { Id: "a".repeat(64), Name: "/supabase_db_Lia-vaud", State: { Running: true },
    Config: { Image: "public.ecr.aws/supabase/postgres:17.6.1.167", Labels: {
      "com.supabase.cli.project": "Lia-vaud", "com.supabase.cli.workdir": workspace,
    } }, NetworkSettings: { Ports: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "54322" }] } } };
  assert.equal(assertLocalContainer(info, config, workspace), info.Id);
  for (const mutate of [
    (i) => { i.Name = "/other"; }, (i) => { i.State.Running = false; },
    (i) => { i.Config.Labels["com.supabase.cli.project"] = "other"; },
    (i) => { i.Config.Labels["com.supabase.cli.workdir"] = "other-workspace"; },
    (i) => { i.Config.Image = "postgres:17"; }, (i) => { i.Id = "name"; },
    (i) => { i.NetworkSettings.Ports["5432/tcp"][0].HostPort = "5432"; },
    (i) => { i.NetworkSettings.Ports["5432/tcp"][0].HostIp = "192.168.1.5"; },
  ]) { const copy = structuredClone(info); mutate(copy); assert.throws(() => assertLocalContainer(copy, config, workspace)); }
  assert.throws(() => assertLocalContainer(info, config.replace('project_id = "Lia-vaud"', 'project_id = "other"'), workspace));
  assert.throws(() => assertLocalContainer(info, config.replace("port = 54322", "port = 5432"), workspace));
  assert.throws(() => assertLocalContainer(info, config.replace("port = 54321", "port = 54320"), workspace));
  assert.throws(() => assertLocalContainer(info, config.replace("[db]", "[unknown]"), workspace));
});

test("SQL is deterministic, preserves payloads, has no broad upsert, and rolls back verification", () => {
  const rows = inspectLegacyProviders().rows;
  const sql = buildLocalImportSql(rows);
  assert.equal(sql, buildLocalImportSql(rows));
  assert.match(sql, /SHARE ROW EXCLUSIVE/);
  assert.match(sql, /COMMIT;\n$/);
  assert.doesNotMatch(sql, /ON CONFLICT|UPDATE public\.|DELETE FROM|INSERT INTO public\.(leads|municipalities|provider_service_areas)/i);
  const verify = buildLocalImportSql(rows, { verifyOnly: true });
  assert.match(verify, /ROLLBACK;\n$/);
  assert.doesNotMatch(verify, /INSERT INTO public\./);
  assert.throws(() => buildLocalImportSql([]));
  assert.throws(() => buildLocalImportSql([{ ...rows[0], errors: ["invalid"] }]));
  const malicious = "'); COMMIT; \\! echo unsafe\n$import$ É";
  assert.ok(!jsonSql(malicious).includes(malicious));
  assert.equal(JSON.parse(Buffer.from(jsonSql(malicious).match(/decode\('([^']+)'/)[1], "hex").toString("utf8")), malicious);
});

test("CLI dry-run ignores inherited remote credentials and invalid writes fail before Docker", () => {
  const run = (args) => spawnSync(process.execPath, ["scripts/import-local-providers.mjs", ...args], {
    cwd: new URL("../", import.meta.url), encoding: "utf8", env: { ...process.env,
      DATABASE_URL: "postgresql://remote.supabase.co/postgres", SUPABASE_URL: "https://remote.supabase.co",
      PGHOST: "remote.supabase.co", DOCKER_HOST: "tcp://remote:2375" },
  });
  const dry = run([]);
  assert.equal(dry.status, 0, dry.stderr);
  assert.equal(JSON.parse(dry.stdout).databaseWrites, 0);
  assert.equal(JSON.parse(dry.stdout).recordsNeedingSpecialReview, 42);
  const denied = run(["--write-local"]);
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /require --confirm/);
});
