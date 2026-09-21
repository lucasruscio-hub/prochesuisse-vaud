// Applies the exact generated artifact only to fresh disposable databases inside
// the existing guarded local Supabase container. Never uses db push or a remote URL.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LOCAL_CONFIRMATION, parseLocalArgs, runLocalSql, beginLocalSql } from "../lib/local-provider-writer.mjs";
import { DATA_MIGRATION, VERIFICATION_FILE, renderProviderDataSql } from "../lib/provider-data-migration.mjs";

if (parseLocalArgs(process.argv.slice(2)).mode !== "--write-local") {
  throw new Error(`Tests require --write-local --confirm ${LOCAL_CONFIRMATION}`);
}
const migration = readFileSync(new URL(`../supabase/migrations/${DATA_MIGRATION}`, import.meta.url), "utf8");
const verification = readFileSync(new URL(`../supabase/verification/${VERIFICATION_FILE}`, import.meta.url), "utf8");
const foundation = readFileSync(new URL("../supabase/migrations/20260920000100_provider_foundation.sql", import.meta.url), "utf8");
assert.equal(migration, renderProviderDataSql());
assert.equal(verification, renderProviderDataSql({ verifyOnly: true }));
const created = [];
const results = [];
const marker = `Lia Phase 2B disposable test, process ${process.pid}`;
const validName = (name) => {
  if (!new RegExp(`^lia_phase2b_test_${process.pid}_[0-9]+$`).test(name)) throw new Error("Unsafe disposable database name");
  return name;
};
const run = (name, sql) => runLocalSql(`\\connect ${validName(name)} postgres /var/run/postgresql 5432
DO $local$ BEGIN
  IF current_database() <> '${name}' OR current_user <> 'postgres' OR inet_server_addr() IS NOT NULL
    OR current_setting('port') <> '5432' THEN RAISE EXCEPTION 'Not the disposable local database'; END IF;
END $local$;
${sql}`);

const fingerprint = `CREATE TEMP TABLE test_fingerprint (name text, state jsonb);
DO $snapshot$ DECLARE t text; data jsonb; BEGIN
  FOREACH t IN ARRAY ARRAY['providers','provider_sources','provider_service_areas','municipalities','leads'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN data := 'null';
    ELSE
      EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text), ''[]'') FROM public.%I x', t) INTO data;
    END IF;
    INSERT INTO test_fingerprint VALUES (t, data);
  END LOOP;
END $snapshot$;
SELECT jsonb_build_object('rows',(SELECT jsonb_object_agg(name,state) FROM test_fingerprint),
  'schema',(SELECT jsonb_agg(jsonb_build_array(c.relname,c.relrowsecurity,c.relforcerowsecurity,
    (SELECT jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum)
      FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped),
    (SELECT jsonb_agg(pg_get_constraintdef(oid) ORDER BY conname) FROM pg_constraint WHERE conrelid = c.oid),
    (SELECT jsonb_agg(to_jsonb(p) ORDER BY policyname) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname)) ORDER BY c.relname)
    FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'));
`;
const capture = (name) => JSON.parse(run(name, fingerprint).trim());
const fixtures = `
CREATE TABLE public.leads (id integer PRIMARY KEY, note text NOT NULL);
INSERT INTO public.leads VALUES (1, 'Local fixture only'), (2, 'Must remain untouched');
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY test_leads_private ON public.leads FOR SELECT TO anon USING (false);
INSERT INTO public.municipalities (country_code,canton_code,official_name,normalized_name,bfs_number)
  VALUES ('CH','GE','Fixture municipality','fixture municipality',9999);
INSERT INTO public.providers (legacy_id,slug,name,primary_type,is_published,verification_status,canton_code,service_codes,language_codes)
  VALUES ('unrelated-swiss-provider','unrelated-swiss-provider','Local fixture','domicile',true,'verified','GE',ARRAY['nursing'],ARRAY['fr']);
INSERT INTO public.provider_sources (provider_id,source_type,source_name,external_record_id)
  SELECT id,'provider','Unrelated website fixture','unrelated' FROM public.providers;
INSERT INTO public.provider_service_areas (provider_id,coverage_type,canton_code)
  SELECT id,'canton','GE' FROM public.providers;
`;
const conflictProvider = (legacy, slug) => `INSERT INTO public.providers (legacy_id,slug,name,primary_type) VALUES ('${legacy}','${slug}','Collision fixture','ems');`;
const cases = [
  { name: "clean first import", setup: "" },
  { name: "unrelated providers, sources, coverage, municipalities and populated leads", setup: fixtures },
  { name: "legacy ID collision", setup: conflictProvider("ems-chateau-rive", "different-slug"), error: /Legacy ID collision/ },
  { name: "slug collision", setup: conflictProvider("different-id", "ems-chateau-rive"), error: /Slug collision/ },
  { name: "existing legacy provenance", setup: fixtures + `INSERT INTO public.provider_sources (provider_id,source_type,source_name,external_record_id)
    SELECT id,'legacy','Lia legacy static provider dataset (lib/providers.js)','ems-chateau-rive' FROM public.providers;`, error: /Legacy provenance collision/ },
  { name: "missing table", setup: "DROP TABLE public.provider_service_areas;", error: /Missing Phase 1 table or RLS/ },
  { name: "RLS disabled", setup: "ALTER TABLE public.provider_sources DISABLE ROW LEVEL SECURITY;", error: /Missing Phase 1 table or RLS/ },
  { name: "missing type constraint", setup: "ALTER TABLE public.providers DROP CONSTRAINT providers_primary_type_check;", error: /Missing validated state\/type constraint/ },
  { name: "incompatible status constraint", setup: "ALTER TABLE public.providers DROP CONSTRAINT providers_status_check; ALTER TABLE public.providers ADD CHECK (status IN ('inactive','archived'));", error: /Incompatible state\/type constraint/ },
  { name: "incompatible verification column", setup: "ALTER TABLE public.providers ALTER COLUMN verification_status TYPE varchar;", error: /Incompatible column/ },
  { name: "public source privilege", setup: "GRANT SELECT ON public.provider_sources TO anon;", error: /anon has access to private sources/ },
  { name: "unsafe provider visibility", setup: "CREATE POLICY bad_test_visibility ON public.providers FOR SELECT TO anon USING (true);", error: /anon can see legacy providers/ },
  { name: "post-insert mismatch rolls back entire batch", setup: `CREATE FUNCTION public.test_corrupt_candidate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.name := 'Corrupted by test trigger'; RETURN NEW; END $$;
    CREATE TRIGGER test_corrupt BEFORE INSERT ON public.providers FOR EACH ROW EXECUTE FUNCTION public.test_corrupt_candidate();`, error: /Legacy batch identity, safe defaults or provenance mismatch/ },
];

// Check the original local stack and retain a full baseline without printing its data.
runLocalSql(beginLocalSql + "ROLLBACK;");
const original = JSON.parse(runLocalSql(fingerprint).trim());
try {
  for (const [index, scenario] of cases.entries()) {
    const name = validName(`lia_phase2b_test_${process.pid}_${index}`);
    runLocalSql(`CREATE DATABASE ${name} TEMPLATE template0;`);
    created.push(name);
    runLocalSql(`COMMENT ON DATABASE ${name} IS '${marker}';`);
    run(name, "GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;\n" + foundation);
    if (scenario.setup) run(name, scenario.setup);
    const before = capture(name);
    if (scenario.error) {
      assert.throws(() => run(name, migration), scenario.error, scenario.name);
      assert.deepEqual(capture(name), before, `${scenario.name}: migration did not fully roll back`);
      results.push({ test: scenario.name, result: "rejected; complete rollback verified" });
    } else {
      const imported = JSON.parse(run(name, migration).trim());
      assert.equal(imported.providers, 66);
      assert.equal(imported.sources, 66);
      assert.deepEqual(JSON.parse(run(name, verification).trim()), imported);
      const after = capture(name);
      assert.equal(after.rows.providers.length - before.rows.providers.length, 66);
      assert.equal(after.rows.provider_sources.length - before.rows.provider_sources.length, 66);
      for (const table of ["leads", "municipalities", "provider_service_areas"]) assert.deepEqual(after.rows[table], before.rows[table]);
      assert.deepEqual(after.schema, before.schema);
      for (const table of ["providers", "provider_sources"]) {
        for (const row of before.rows[table]) assert.deepEqual(after.rows[table].find((item) => item.id === row.id), row);
      }
      assert.throws(() => run(name, migration), /Legacy ID collision/);
      assert.deepEqual(capture(name), after, "Second execution must fail without changing any rows");
      results.push({ test: scenario.name, result: "passed", imported, replay: "rejected without changes" });
    }
  }
} finally {
  // Drop only databases successfully created by this process and still bearing its marker.
  for (const name of created) {
    validName(name);
    const found = runLocalSql(`SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname = '${name}';`).trim();
    assert.equal(found, marker, "Refusing to remove an unrecognized database");
    runLocalSql(`DROP DATABASE ${name};`);
  }
  assert.deepEqual(JSON.parse(runLocalSql(fingerprint).trim()), original, "Existing local stack changed");
}
console.log(JSON.stringify({ tests: results.length, passed: results.length, disposableDatabasesRemoved: created.length,
  originalLocalDatabaseUnchanged: true, results }, null, 2));
