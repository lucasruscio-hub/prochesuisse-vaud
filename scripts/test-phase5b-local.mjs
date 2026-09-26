import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LOCAL_CONFIRMATION, parseLocalArgs, runLocalSql } from "../lib/local-provider-writer.mjs";

const migration = readFileSync(new URL(
  "../supabase/migrations/20260926000100_home_care_foundation.sql", import.meta.url,
), "utf8");
const dryRun = readFileSync(new URL(
  "../supabase/tests/home_care_foundation_dry_run.sql", import.meta.url,
), "utf8");
const migrationBody = migration.replace(/^BEGIN;\s*$/m, "").replace(/^COMMIT;\s*$/m, "");

const stateSql = `SELECT jsonb_build_object(
  'providers',(SELECT count(*) FROM public.providers),
  'sources',(SELECT count(*) FROM public.provider_sources),
  'serviceAreas',(SELECT count(*) FROM public.provider_service_areas),
  'municipalities',(SELECT count(*) FROM public.municipalities),
  'organizations',(SELECT count(*) FROM public.organizations),
  'relationships',(SELECT count(*) FROM public.provider_organizations),
  'offerings',(SELECT count(*) FROM public.care_offerings),
  'features',(SELECT count(*) FROM public.care_offering_features),
  'offeringSources',(SELECT count(*) FROM public.care_offering_sources),
  'availability',(SELECT count(*) FROM public.care_offering_availability),
  'enrichedEms',(SELECT count(DISTINCT p.id) FROM public.providers p
    JOIN public.care_offerings o ON o.provider_id=p.id WHERE p.primary_type='ems'),
  'publishedProviders',(SELECT count(*) FROM public.providers WHERE is_published),
  'verifiedProviders',(SELECT count(*) FROM public.providers WHERE verification_status<>'unverified'),
  'publishedOfferings',(SELECT count(*) FROM public.care_offerings WHERE is_published),
  'verifiedOfferings',(SELECT count(*) FROM public.care_offerings WHERE verification_status<>'unverified'),
  'homeCareOfferings',(SELECT count(*) FROM public.care_offerings WHERE offering_type='home_care'),
  'homeCareFeatures',(SELECT count(*) FROM public.care_offering_features f
    JOIN public.providers p ON p.id=f.provider_id WHERE p.primary_type='domicile'),
  'homeCareRelationships',(SELECT count(*) FROM public.provider_organizations po
    JOIN public.providers p ON p.id=po.provider_id WHERE p.primary_type='domicile'),
  'accessedOnColumn',(SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='provider_sources' AND column_name='accessed_on'),
  'coverageLabelColumn',(SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='provider_service_areas' AND column_name='coverage_label'),
  'knownAccessDates',(SELECT count(*) FROM public.provider_sources s
    WHERE to_jsonb(s)->>'accessed_on' IS NOT NULL),
  'dataHash',md5(concat_ws('|',
    (SELECT coalesce(string_agg((to_jsonb(t))::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.providers t),
    (SELECT coalesce(string_agg((to_jsonb(t)-'accessed_on')::text,E'\\n' ORDER BY (to_jsonb(t)-'accessed_on')::text),'') FROM public.provider_sources t),
    (SELECT coalesce(string_agg((to_jsonb(t)-'coverage_label')::text,E'\\n' ORDER BY (to_jsonb(t)-'coverage_label')::text),'') FROM public.provider_service_areas t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.municipalities t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offerings t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_features t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_availability t)
  )));`;

function state() {
  return JSON.parse(runLocalSql(stateSql).trim());
}

function assertDataContract(value) {
  assert.equal(value.providers, 66, "unexpected provider count");
  assert.equal(value.enrichedEms, 31, "expected all 31 enriched EMS");
  assert.equal(value.serviceAreas, 0, "real service-area rows must remain zero");
  assert.equal(value.homeCareOfferings, 0, "home-care offerings must remain absent");
  assert.equal(value.homeCareFeatures, 0, "home-care features must remain absent");
  assert.equal(value.homeCareRelationships, 0, "home-care organization links must remain absent");
  assert.equal(value.publishedProviders, 0, "provider publication state changed");
  assert.equal(value.verifiedProviders, 0, "provider verification state changed");
  assert.equal(value.publishedOfferings, 0, "offering publication state changed");
  assert.equal(value.verifiedOfferings, 0, "offering verification state changed");
  assert.equal(value.knownAccessDates, 0, "historical access dates must remain unknown");
}

const args = parseLocalArgs(process.argv.slice(2));
const before = state();
assertDataContract(before);

if (args.mode === "--write-local") {
  assert.equal(before.accessedOnColumn, 0, "provider_sources.accessed_on already exists");
  assert.equal(before.coverageLabelColumn, 0, "provider_service_areas.coverage_label already exists");

  runLocalSql(`BEGIN;\n${migrationBody}\n${dryRun.replace(/^BEGIN;\s*$/m, "").replace(/^ROLLBACK;\s*$/m, "")}\nROLLBACK;`);
  assert.deepEqual(state(), before, "rollback validation changed local data or schema");
  runLocalSql(migration);
}

runLocalSql(dryRun);
const after = state();
assertDataContract(after);
assert.equal(after.accessedOnColumn, 1, "accessed_on migration missing");
assert.equal(after.coverageLabelColumn, 1, "coverage_label migration missing");
assert.equal(after.dataHash, before.dataHash, "provider/care data changed during schema migration");

console.log(JSON.stringify({
  target: "verified-local-container",
  confirmation: args.mode === "--write-local" ? LOCAL_CONFIRMATION : undefined,
  migration: "20260926000100_home_care_foundation",
  sqlRollbackValidation: args.mode === "--write-local" ? "passed" : "not-requested",
  localMigration: args.mode === "--write-local" ? "applied" : "already-applied",
  existing31EmsUnchanged: true,
  providerPublicationVerificationUnchanged: true,
  databaseCounts: after,
}, null, 2));
