import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const LOCAL_TARGET = "postgresql://127.0.0.1:54322/postgres";
export const LOCAL_CONFIRMATION = "Lia-vaud:local:54322";
const root = fileURLToPath(new URL("../", import.meta.url));
const project = "Lia-vaud";
const container = `supabase_db_${project}`;
const dockerHost = process.platform === "win32"
  ? "npipe:////./pipe/dockerDesktopLinuxEngine" : "unix:///var/run/docker.sock";

export function parseLocalArgs(args) {
  const allowed = new Set(["--dry-run", "--write-local", "--verify-local", "--confirm", "--target"]);
  const values = new Map();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!allowed.has(flag) || values.has(flag)) throw new Error("Unknown or repeated argument; local targets only");
    const value = ["--confirm", "--target"].includes(flag) ? args[++i] : true;
    if (!value || String(value).startsWith("--")) throw new Error(`Missing value for ${flag}`);
    values.set(flag, value);
  }
  const target = values.get("--target") ?? LOCAL_TARGET;
  if (target !== LOCAL_TARGET) throw new Error("Refusing unexpected target: only the fixed local database is allowed");
  const modes = ["--dry-run", "--write-local", "--verify-local"].filter((key) => values.has(key));
  if (modes.length > 1) throw new Error("Choose exactly one mode");
  const mode = modes[0] ?? "--dry-run";
  if (mode === "--write-local" && values.get("--confirm") !== LOCAL_CONFIRMATION) {
    throw new Error(`Local writes require --confirm ${LOCAL_CONFIRMATION}`);
  }
  if (mode !== "--write-local" && values.has("--confirm")) throw new Error("Confirmation requires --write-local");
  return { mode, target };
}

// No Docker context, DATABASE_URL, PG*, Supabase keys or application .env loading.
function docker(args, input) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^(DOCKER_|PG|SUPABASE_|DATABASE_URL$)/i.test(key)));
  const result = spawnSync("docker", ["--host", dockerHost, ...args], {
    cwd: root, env, input, encoding: "utf8", timeout: 120000, maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Local Docker/psql failed; uncommitted work rolls back. ${result.error?.message ?? result.stderr}`);
  }
  return result.stdout;
}

export function assertLocalContainer(info, config, workspace = root) {
  const section = (name) => config.split(/^\[/m)
    .find((part) => part.startsWith(`${name}]`)) ?? "";
  if (!/^project_id\s*=\s*"Lia-vaud"\s*$/m.test(config)
    || !/^port\s*=\s*54322\s*$/m.test(section("db"))
    || !/^port\s*=\s*54321\s*$/m.test(section("api"))) {
    throw new Error("Unexpected local Supabase project configuration");
  }
  const labels = info.Config?.Labels ?? {};
  const ports = info.NetworkSettings?.Ports?.["5432/tcp"];
  if (info.Name !== `/${container}` || !info.State?.Running
    || labels["com.supabase.cli.project"] !== project
    || resolve(labels["com.supabase.cli.workdir"] ?? "") !== resolve(workspace)
    || !/^public\.ecr\.aws\/supabase\/postgres:17\./.test(info.Config?.Image ?? "")
    || !Array.isArray(ports) || !ports.length || ports.some((p) => p.HostPort !== "54322"
      || !["0.0.0.0", "::", "127.0.0.1", "::1"].includes(p.HostIp))
    || !/^[a-f0-9]{64}$/.test(info.Id ?? "")) {
    throw new Error("Cannot prove the container is this workspace's local Supabase database");
  }
  return info.Id;
}

/** Executes only inside a verified local container, through its Unix socket.
 * Pin the inspected immutable container ID, not a replaceable container name.
 * Does not accept database URLs, credentials, arbitrary hosts or Docker contexts.
 */
export function runLocalSql(sql) {
  const config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
  const [info] = JSON.parse(docker(["inspect", container]));
  const id = assertLocalContainer(info, config);
  return docker(["exec", "-i", id, "env", "-i", "PATH=/usr/local/bin:/usr/bin:/bin",
    "PGCLIENTENCODING=UTF8", "psql", "-X", "-w", "-h", "/var/run/postgresql", "-p", "5432",
    "-U", "postgres", "-d", "postgres", "-A", "-t", "-q", "-v", "ON_ERROR_STOP=1"], sql);
}

// Hex-encoded JSON keeps arbitrary source text out of SQL syntax and psql commands.
export const jsonSql = (value) => `convert_from(decode('${Buffer.from(JSON.stringify(value), "utf8").toString("hex")}', 'hex'), 'UTF8')::jsonb`;

export const beginLocalSql = `BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = pg_catalog, public;
DO $guard$
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'postgres'
    OR inet_server_addr() IS NOT NULL OR current_setting('port') <> '5432'
    OR current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'Unexpected database identity; local container socket required';
  END IF;
  IF (SELECT count(*) FROM pg_class WHERE oid IN
    ('public.providers'::regclass, 'public.provider_sources'::regclass,
     'public.provider_service_areas'::regclass, 'public.municipalities'::regclass)
    AND relkind = 'r' AND relrowsecurity) <> 4 THEN
    RAISE EXCEPTION 'Expected Phase 1 tables and RLS required';
  END IF;
  IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
    AND NOT rolsuper AND NOT rolbypassrls) <> 2 THEN
    RAISE EXCEPTION 'Unsafe client roles';
  END IF;
END $guard$;
`;

export const snapshotSql = `
CREATE TEMP TABLE lia_untouched (name text PRIMARY KEY, snapshot jsonb);
DO $snapshot$
DECLARE snapshot jsonb;
BEGIN
  IF to_regclass('public.leads') IS NULL THEN
    INSERT INTO lia_untouched VALUES ('leads', '{"exists":false}'::jsonb);
  ELSE
    LOCK TABLE public.leads IN SHARE MODE;
    EXECUTE 'SELECT jsonb_build_object(''exists'', true, ''count'', count(*), ''hash'', md5(coalesce(string_agg(to_jsonb(t)::text, E''\\n'' ORDER BY to_jsonb(t)::text), ''''))) FROM public.leads t' INTO snapshot;
    INSERT INTO lia_untouched VALUES ('leads', snapshot);
  END IF;
  INSERT INTO lia_untouched SELECT 'municipalities', coalesce(jsonb_agg(to_jsonb(m) ORDER BY id), '[]') FROM public.municipalities m;
END $snapshot$;
`;

export function importBlock(rows, { verifyOnly = false } = {}) {
  if (!rows.length || rows.some((row) => row.errors?.length || !row.provider || !row.source || row.serviceAreas.length)) {
    throw new Error("Refusing invalid or empty candidate batch");
  }
  const providerColumns = Object.keys(rows[0].provider);
  const sourceColumns = Object.keys(rows[0].source);
  for (const key of [...providerColumns, ...sourceColumns]) {
    if (!/^[a-z_]+$/.test(key) || ["id", "provider_id", "created_at", "updated_at"].includes(key)) throw new Error("Unexpected candidate column");
  }
  const batch = rows.map(({ provider, source }) => ({ provider, source }));
  return `
DO $import$
DECLARE item jsonb; expected jsonb; evidence jsonb; existing jsonb; source_row jsonb;
  provider_uuid uuid; matches integer; inserted integer := 0; skipped integer := 0;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(${jsonSql(batch)}) LOOP
    expected := item->'provider'; evidence := item->'source';
    SELECT count(*) INTO matches FROM public.providers
      WHERE legacy_id = expected->>'legacy_id' OR slug = expected->>'slug';
    IF matches = 0 THEN
      ${verifyOnly ? "RAISE EXCEPTION 'Missing provider: %', expected->>'legacy_id';" : `
      INSERT INTO public.providers (${providerColumns.join(", ")})
        SELECT ${providerColumns.map((key) => `p.${key}`).join(", ")}
        FROM jsonb_populate_record(NULL::public.providers, expected) p RETURNING id INTO provider_uuid;
      INSERT INTO public.provider_sources (provider_id, ${sourceColumns.join(", ")})
        SELECT provider_uuid, ${sourceColumns.map((key) => `s.${key}`).join(", ")}
        FROM jsonb_populate_record(NULL::public.provider_sources, evidence) s;
      inserted := inserted + 1;`}
    ELSE
      IF matches <> 1 THEN RAISE EXCEPTION 'Identity collision: %', expected->>'legacy_id'; END IF;
      SELECT id, to_jsonb(p) - ARRAY['id','created_at','updated_at'] INTO provider_uuid, existing
        FROM public.providers p WHERE legacy_id = expected->>'legacy_id' OR slug = expected->>'slug';
      IF existing IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'Provider conflict (reconciliation required): %', expected->>'legacy_id';
      END IF;
      SELECT count(*) INTO matches FROM public.provider_sources
        WHERE provider_id = provider_uuid AND source_type = evidence->>'source_type'
          AND source_name = evidence->>'source_name' AND external_record_id = evidence->>'external_record_id';
      SELECT to_jsonb(s) - ARRAY['id','provider_id','created_at'] INTO source_row FROM public.provider_sources s
        WHERE provider_id = provider_uuid AND source_type = evidence->>'source_type'
          AND source_name = evidence->>'source_name' AND external_record_id = evidence->>'external_record_id';
      IF matches <> 1 OR source_row IS DISTINCT FROM evidence THEN
        RAISE EXCEPTION 'Provenance conflict (reconciliation required): %', expected->>'legacy_id';
      END IF;
      skipped := skipped + 1;
    END IF;
  END LOOP;
  INSERT INTO lia_import_result VALUES (inserted, skipped);
END $import$;
`;
}

export function verificationSql(rows) {
  // Inline relations remain subject to the current role's RLS during visibility checks.
  const ids = jsonSql(rows.map(({ provider }) => provider.legacy_id));
  const providers = `(SELECT p.* FROM public.providers p
    WHERE p.legacy_id IN (SELECT jsonb_array_elements_text(${ids}))) batch_providers`;
  const evidence = jsonSql(rows.map(({ provider, source }) => ({ legacy_id: provider.legacy_id,
    source_type: source.source_type, source_name: source.source_name,
    external_record_id: source.external_record_id })));
  const sources = `(SELECT s.* FROM public.provider_sources s
    JOIN public.providers p ON p.id = s.provider_id
    JOIN jsonb_to_recordset(${evidence}) AS e(legacy_id text, source_type text, source_name text, external_record_id text)
      ON p.legacy_id = e.legacy_id AND s.source_type = e.source_type
        AND s.source_name = e.source_name AND s.external_record_id = e.external_record_id) batch_sources`;
  const areas = `(SELECT a.* FROM public.provider_service_areas a
    JOIN public.providers p ON p.id = a.provider_id
    WHERE p.legacy_id IN (SELECT jsonb_array_elements_text(${ids}))) batch_areas`;
  return `
DO $verify$
DECLARE after_leads jsonb;
BEGIN
  IF (SELECT count(*) FROM ${providers}) <> 66
    OR (SELECT count(*) FROM ${sources}) <> 66
    OR (SELECT count(*) FROM ${providers} WHERE primary_type = 'ems') <> 46
    OR (SELECT count(*) FROM ${providers} WHERE primary_type = 'domicile') <> 12
    OR (SELECT count(*) FROM ${providers} WHERE primary_type = 'residence') <> 8
    OR (SELECT count(DISTINCT legacy_id) FROM ${providers}) <> 66
    OR (SELECT count(DISTINCT slug) FROM ${providers}) <> 66
    OR EXISTS (SELECT FROM ${areas})
    OR EXISTS (SELECT FROM ${providers} WHERE is_published OR verification_status <> 'unverified'
      OR status <> 'active' OR last_reviewed_at IS NOT NULL OR canton_code IS NOT NULL
      OR municipality_id IS NOT NULL OR cardinality(service_codes) <> 0 OR cardinality(language_codes) <> 0) THEN
    RAISE EXCEPTION 'Legacy dataset verification failed';
  END IF;
  IF to_regclass('public.leads') IS NULL THEN after_leads := '{"exists":false}';
  ELSE
    EXECUTE 'SELECT jsonb_build_object(''exists'', true, ''count'', count(*), ''hash'', md5(coalesce(string_agg(to_jsonb(t)::text, E''\\n'' ORDER BY to_jsonb(t)::text), ''''))) FROM public.leads t' INTO after_leads;
  END IF;
  IF after_leads IS DISTINCT FROM (SELECT snapshot FROM lia_untouched WHERE name = 'leads') THEN
    RAISE EXCEPTION 'Leads changed; rolling back';
  END IF;
  IF (SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY id), '[]') FROM public.municipalities m)
    IS DISTINCT FROM (SELECT snapshot FROM lia_untouched WHERE name = 'municipalities') THEN
    RAISE EXCEPTION 'Municipalities changed; rolling back';
  END IF;
END $verify$;
SET LOCAL ROLE anon;
DO $rls$ BEGIN
  IF EXISTS (SELECT FROM ${providers}) THEN RAISE EXCEPTION 'anon can see unpublished providers'; END IF;
  IF has_table_privilege(current_user, 'public.provider_sources', 'SELECT') THEN RAISE EXCEPTION 'Sources visible to anon'; END IF;
END $rls$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $rls$ BEGIN
  IF EXISTS (SELECT FROM ${providers}) THEN RAISE EXCEPTION 'authenticated can see unpublished providers'; END IF;
  IF has_table_privilege(current_user, 'public.provider_sources', 'SELECT') THEN RAISE EXCEPTION 'Sources visible to authenticated'; END IF;
END $rls$;
RESET ROLE;
SELECT jsonb_build_object(
  'scope', 'legacy-batch',
  'providers', (SELECT count(*) FROM ${providers}),
  'sources', (SELECT count(*) FROM ${sources}),
  'ems', (SELECT count(*) FROM ${providers} WHERE primary_type = 'ems'),
  'domicile', (SELECT count(*) FROM ${providers} WHERE primary_type = 'domicile'),
  'residence', (SELECT count(*) FROM ${providers} WHERE primary_type = 'residence'),
  'published', (SELECT count(*) FROM ${providers} WHERE is_published),
  'unverified', (SELECT count(*) FROM ${providers} WHERE verification_status = 'unverified'),
  'nullCantons', (SELECT count(*) FROM ${providers} WHERE canton_code IS NULL),
  'serviceAreas', (SELECT count(*) FROM ${areas}),
  'serviceCodes', (SELECT sum(cardinality(service_codes)) FROM ${providers}),
  'languageCodes', (SELECT sum(cardinality(language_codes)) FROM ${providers}),
  'uniqueLegacyIds', (SELECT count(DISTINCT legacy_id) FROM ${providers}),
  'uniqueSlugs', (SELECT count(DISTINCT slug) FROM ${providers}),
  'exactProviderAndProvenanceMatches', 66,
  'anonVisible', 0, 'authenticatedVisible', 0,
  'leadsUnchanged', true, 'leadsBefore', (SELECT snapshot FROM lia_untouched WHERE name = 'leads'),
  'municipalitiesUnchanged', true,
  'inserted', (SELECT inserted FROM lia_import_result ORDER BY ctid DESC LIMIT 1),
  'skipped', (SELECT skipped FROM lia_import_result ORDER BY ctid DESC LIMIT 1));
`;
}

export function buildLocalImportSql(rows, { verifyOnly = false } = {}) {
  return beginLocalSql
    + `LOCK TABLE public.providers, public.provider_sources, public.provider_service_areas, public.municipalities IN ${verifyOnly ? "SHARE" : "SHARE ROW EXCLUSIVE"} MODE;\n`
    + snapshotSql + "CREATE TEMP TABLE lia_import_result (inserted integer, skipped integer);\n"
    + importBlock(rows, { verifyOnly })
    // Re-read every field after insertion, including trigger effects, before commit.
    + (verifyOnly ? "" : importBlock(rows, { verifyOnly: true }).replace("INSERT INTO lia_import_result VALUES (inserted, skipped);", "NULL;"))
    + verificationSql(rows) + (verifyOnly ? "ROLLBACK;\n" : "COMMIT;\n");
}
