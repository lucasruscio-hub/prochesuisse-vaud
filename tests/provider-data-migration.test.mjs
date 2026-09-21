import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { DATA_MIGRATION, VERIFICATION_FILE, legacyCandidates, renderProviderDataSql } from "../lib/provider-data-migration.mjs";
import { inspectLegacyProviders } from "../scripts/ingest-legacy-providers.mjs";

test("data migration and verification are deterministic generated artifacts of the safe transform", () => {
  assert.deepEqual(legacyCandidates(), inspectLegacyProviders().rows.map(({ provider, source }) => ({ provider, source })));
  for (const [path, verifyOnly] of [[`migrations/${DATA_MIGRATION}`, false], [`verification/${VERIFICATION_FILE}`, true]]) {
    const sql = renderProviderDataSql({ verifyOnly });
    assert.equal(sql, renderProviderDataSql({ verifyOnly }));
    assert.equal(readFileSync(new URL(`../supabase/${path}`, import.meta.url), "utf8"), sql);
    assert.equal((sql.match(/^BEGIN;/gm) ?? []).length, 1);
    assert.match(sql, verifyOnly ? /ROLLBACK;\n$/ : /COMMIT;\n$/);
    assert.doesNotMatch(sql, /\b(?:UPDATE|DELETE|TRUNCATE|ALTER|GRANT|REVOKE)\s+(?:TABLE\s+)?public\./i);
    assert.doesNotMatch(sql, /CREATE POLICY|DROP POLICY|ON CONFLICT/i);
    assert.doesNotMatch(sql, /INSERT INTO public\.(leads|municipalities|provider_service_areas)/i);
    if (verifyOnly) assert.doesNotMatch(sql, /INSERT INTO public\./i);
  }
});

test("generator check runs without database access and refuses execution/target flags", () => {
  const run = (args) => spawnSync(process.execPath, ["scripts/generate-provider-data-migration.mjs", ...args], {
    cwd: new URL("../", import.meta.url), encoding: "utf8", env: { ...process.env,
      DOCKER_HOST: "tcp://invalid:2375", DATABASE_URL: "postgresql://invalid/postgres", PGHOST: "invalid" },
  });
  const checked = run(["--check"]);
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /66 providers \+ 66 legacy sources; no database access/);
  for (const args of [[], ["--write", "--check"], ["--execute"], ["--db-url", "remote"]]) assert.notEqual(run(args).status, 0);
});
