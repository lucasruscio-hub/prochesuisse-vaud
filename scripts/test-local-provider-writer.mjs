// Explicit local-only integration tests. All fixtures and mutations roll back.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectLegacyProviders } from "./ingest-legacy-providers.mjs";
import { LOCAL_CONFIRMATION, parseLocalArgs, runLocalSql, beginLocalSql,
  snapshotSql, importBlock, verificationSql } from "../lib/local-provider-writer.mjs";

const options = parseLocalArgs(process.argv.slice(2));
if (options.mode !== "--write-local") throw new Error(`Tests require --write-local --confirm ${LOCAL_CONFIRMATION}`);
const rows = inspectLegacyProviders().rows;
// Reuse the exact Phase 1 schema/RLS in a transaction-local test namespace.
// Never empty or mutate the already imported public tables to rerun fixtures.
const testSchema = "lia_provider_writer_test";
const migration = readFileSync(new URL("../supabase/migrations/20260920000100_provider_foundation.sql", import.meta.url), "utf8")
  .replace(/^BEGIN;\s*$/m, "").replace(/^COMMIT;\s*$/m, "")
  .replaceAll("public.", `${testSchema}.`);
const runTestSql = (sql) => runLocalSql(beginLocalSql
  + `CREATE SCHEMA ${testSchema}; GRANT USAGE ON SCHEMA ${testSchema} TO anon, authenticated;\n`
  + migration + sql.replace(/^BEGIN;\s*/, "")
    .replace(/public\.(providers|provider_sources|provider_service_areas|municipalities)\b/g, `${testSchema}.$1`));
const assertRolledBack = () => runLocalSql(beginLocalSql
  + `DO $check$ BEGIN IF to_regnamespace('${testSchema}') IS NOT NULL THEN RAISE EXCEPTION 'Test schema persisted'; END IF; END $check$; ROLLBACK;`);
const quote = (text) => "'" + text.replaceAll("'", "''") + "'";
const block = importBlock(rows);
const assertion = (condition, message) => `DO $assert$ BEGIN IF NOT (${condition}) THEN RAISE EXCEPTION '${message}'; END IF; END $assert$;\n`;
const expectConflict = (setup, pattern) => `
DO $case$ BEGIN
  BEGIN
    ${setup}
    EXECUTE ${quote(block)};
    RAISE EXCEPTION 'Expected conflict was not raised';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '${pattern}%' THEN RAISE; END IF;
  END;
END $case$;
`;
const lock = "LOCK TABLE public.providers, public.provider_sources, public.provider_service_areas, public.municipalities IN SHARE ROW EXCLUSIVE MODE;\n";
const setup = beginLocalSql + lock + snapshotSql + "CREATE TEMP TABLE lia_import_result (inserted integer, skipped integer);\n";
const empty = assertion("(SELECT count(*) FROM public.providers) = 0 AND (SELECT count(*) FROM public.provider_sources) = 0", "Integration tests require empty local provider/source tables; no cleanup is performed");

// A psql error after all inserts must roll back the connection's entire transaction.
assert.throws(() => runTestSql(setup + empty + block + "SELECT 1/0;\nCOMMIT;"), /division by zero/);
assertRolledBack();

// A late collision must also roll back earlier inserts, not merely the fixture.
const late = rows.at(-1).provider;
const lateFixture = `INSERT INTO public.providers (legacy_id, slug, name, primary_type) VALUES (${quote(late.legacy_id)}, ${quote(late.slug)}, 'Conflict fixture', 'ems');`;
assert.throws(() => runTestSql(setup + empty + lateFixture + block + "COMMIT;"), /Provider conflict/);
assertRolledBack();

const result = runTestSql(setup + empty + block
  + assertion("(SELECT inserted FROM lia_import_result LIMIT 1) = 66 AND (SELECT count(*) FROM public.provider_sources) = 66", "First insert count failed")
  + "CREATE TEMP TABLE lia_saved_providers AS SELECT * FROM public.providers;\nCREATE TEMP TABLE lia_saved_sources AS SELECT * FROM public.provider_sources;\n"
  + block
  + assertion("(SELECT count(*) FROM lia_import_result WHERE inserted = 0 AND skipped = 66) = 1", "Second import did not skip all records")
  + expectConflict("UPDATE public.providers SET name = 'Conflicting name' WHERE legacy_id = 'ems-chateau-rive';", "Provider conflict")
  + expectConflict("UPDATE public.providers SET legacy_id = 'different-legacy-id' WHERE legacy_id = 'ems-chateau-rive';", "Provider conflict")
  + expectConflict("UPDATE public.providers SET slug = 'different-slug' WHERE legacy_id = 'ems-chateau-rive';", "Provider conflict")
  + expectConflict("UPDATE public.providers SET is_published = true, verification_status = 'verified', last_reviewed_at = now() WHERE legacy_id = 'ems-chateau-rive';", "Provider conflict")
  + expectConflict("UPDATE public.providers SET status = 'archived' WHERE legacy_id = 'ems-chateau-rive';", "Provider conflict")
  + expectConflict("UPDATE public.provider_sources SET notes = 'Manually reviewed evidence' WHERE external_record_id = 'ems-chateau-rive';", "Provenance conflict")
  + expectConflict("INSERT INTO public.provider_sources (provider_id, source_type, source_name, external_record_id) SELECT provider_id, source_type, source_name, external_record_id FROM public.provider_sources WHERE external_record_id = 'ems-chateau-rive';", "Provenance conflict")
  + expectConflict("UPDATE public.provider_sources SET external_record_id = 'unrelated-record' WHERE external_record_id = 'ems-chateau-rive';", "Provenance conflict")
  + assertion("NOT EXISTS ((TABLE public.providers EXCEPT TABLE lia_saved_providers) UNION ALL (TABLE lia_saved_providers EXCEPT TABLE public.providers))", "Provider rows changed on rerun or conflict")
  + assertion("NOT EXISTS ((TABLE public.provider_sources EXCEPT TABLE lia_saved_sources) UNION ALL (TABLE lia_saved_sources EXCEPT TABLE public.provider_sources))", "Source rows changed on rerun or conflict")
  // Each identity component independently distinguishes an unrelated source.
  + `INSERT INTO public.provider_sources (provider_id, source_type, source_name, external_record_id)
      SELECT provider_id, 'provider', source_name, external_record_id FROM public.provider_sources WHERE external_record_id = 'ems-chateau-rive';
    INSERT INTO public.provider_sources (provider_id, source_type, source_name, external_record_id)
      SELECT provider_id, source_type, 'Official canton source fixture', external_record_id FROM public.provider_sources WHERE external_record_id = 'ems-chateau-rive' AND source_type = 'legacy';
    INSERT INTO public.provider_sources (provider_id, source_type, source_name, external_record_id)
      SELECT provider_id, source_type, source_name, 'another-external-id' FROM public.provider_sources WHERE external_record_id = 'ems-chateau-rive' AND source_type = 'legacy' AND source_name LIKE 'Lia legacy%';
    INSERT INTO public.providers (legacy_id, slug, name, primary_type, is_published, verification_status, canton_code, service_codes, language_codes)
      VALUES ('unrelated-swiss-provider', 'unrelated-swiss-provider', 'Swiss test fixture', 'domicile', true, 'verified', 'GE', ARRAY['nursing'], ARRAY['fr']);
    INSERT INTO public.provider_sources (provider_id, source_type, source_name, external_record_id)
      SELECT p.id, s.source_type, s.source_name, s.external_record_id FROM public.providers p CROSS JOIN lia_saved_sources s
      WHERE p.legacy_id = 'unrelated-swiss-provider' AND s.external_record_id = 'ems-chateau-rive';
    INSERT INTO public.provider_service_areas (provider_id, coverage_type, canton_code)
      SELECT id, 'canton', 'GE' FROM public.providers WHERE legacy_id = 'unrelated-swiss-provider';
    CREATE TEMP TABLE lia_enriched_providers AS SELECT * FROM public.providers;
    CREATE TEMP TABLE lia_enriched_sources AS SELECT * FROM public.provider_sources;
    CREATE TEMP TABLE lia_enriched_areas AS SELECT * FROM public.provider_service_areas;
    `
  + block
  + assertion("(SELECT count(*) FROM lia_import_result WHERE inserted = 0 AND skipped = 66) = 2", "Enriched rerun did not skip all records")
  + importBlock(rows, { verifyOnly: true })
  + assertion("(SELECT count(*) FROM public.providers) = 67 AND (SELECT count(*) FROM public.provider_sources) = 70", "Unrelated fixtures missing")
  + assertion("NOT EXISTS ((TABLE public.providers EXCEPT TABLE lia_enriched_providers) UNION ALL (TABLE lia_enriched_providers EXCEPT TABLE public.providers))", "Enriched provider rows changed")
  + assertion("NOT EXISTS ((TABLE public.provider_sources EXCEPT TABLE lia_enriched_sources) UNION ALL (TABLE lia_enriched_sources EXCEPT TABLE public.provider_sources))", "Enrichment sources changed")
  + assertion("NOT EXISTS ((TABLE public.provider_service_areas EXCEPT TABLE lia_enriched_areas) UNION ALL (TABLE lia_enriched_areas EXCEPT TABLE public.provider_service_areas))", "Unrelated coverage changed")
  + verificationSql(rows) + "ROLLBACK;");
assertRolledBack();
console.log(JSON.stringify({ integrationTests: "passed", firstInsert: { providers: 66, sources: 66 },
  secondInsert: { providers: 0, sources: 0, skipped: 66 },
  conflicts: ["name", "legacy_id", "slug", "publication/verification/review", "lifecycle", "source notes", "duplicate matching source", "missing matching source"],
  enrichment: { databaseProviders: 67, databaseSources: 70, unrelatedServiceAreas: 1, inserted: 0, skipped: 66 },
  rollback: ["failure after all inserts", "late identity conflict", "all test fixtures"],
  verification: JSON.parse(result.trim()), committedDatabaseWrites: 0 }, null, 2));
