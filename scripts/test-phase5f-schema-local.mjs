import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LOCAL_CONFIRMATION, inspectLocalTarget, parseLocalArgs, runLocalSql }
  from "../lib/local-provider-writer.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { projectReviewedCareDetail } from "../lib/provider-care-projection.js";

const migrationName = "20260928000100_phase5f_home_care_identity_foundation";
const migration = readFileSync(new URL(`../supabase/migrations/${migrationName}.sql`, import.meta.url), "utf8");
const dryRun = readFileSync(new URL(
  "../supabase/tests/phase5f_home_care_identity_foundation_dry_run.sql", import.meta.url,
), "utf8");
const withoutTransaction = (sql) => sql.replace(/^BEGIN;\s*$/m, "").replace(/^COMMIT;\s*$/m, "")
  .replace(/^ROLLBACK;\s*$/m, "");

const stateSql = `SELECT jsonb_build_object(
  'providers',(SELECT count(*) FROM public.providers),
  'providerSources',(SELECT count(*) FROM public.provider_sources),
  'organizations',(SELECT count(*) FROM public.organizations),
  'providerOrganizations',(SELECT count(*) FROM public.provider_organizations),
  'offerings',(SELECT count(*) FROM public.care_offerings),
  'features',(SELECT count(*) FROM public.care_offering_features),
  'offeringSources',(SELECT count(*) FROM public.care_offering_sources),
  'availability',(SELECT count(*) FROM public.care_offering_availability),
  'serviceAreas',(SELECT count(*) FROM public.provider_service_areas),
  'municipalities',(SELECT count(*) FROM public.municipalities),
  'enrichedEms',(SELECT count(DISTINCT p.id) FROM public.providers p
    JOIN public.care_offerings o ON o.provider_id=p.id WHERE p.primary_type='ems'),
  'homeSupportOfferings',(SELECT count(*) FROM public.care_offerings WHERE offering_type='home_support'),
  'senevitaOrganizations',(SELECT count(*) FROM public.provider_organizations po
    JOIN public.providers p ON p.id=po.provider_id WHERE p.slug='senevita-vaud'),
  'senevitaOfferings',(SELECT count(*) FROM public.care_offerings o
    JOIN public.providers p ON p.id=o.provider_id WHERE p.slug='senevita-vaud'),
  'senevitaFeatures',(SELECT count(*) FROM public.care_offering_features f
    JOIN public.providers p ON p.id=f.provider_id WHERE p.slug='senevita-vaud'),
  'senevitaServiceAreas',(SELECT count(*) FROM public.provider_service_areas a
    JOIN public.providers p ON p.id=a.provider_id WHERE p.slug='senevita-vaud'),
  'newTables',(SELECT count(*) FROM information_schema.tables WHERE table_schema='public'
    AND table_name IN ('organization_sources','provider_names','organization_names',
      'provider_identity_links','organization_relationships','care_offering_regulatory_designations')),
  'emsFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb)
      FROM public.care_offerings o JOIN public.providers ep ON ep.id=o.provider_id
      WHERE ep.primary_type='ems'),
    'features',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.offering_id,f.feature_kind,f.feature_code),'[]'::jsonb)
      FROM public.care_offering_features f JOIN public.providers ep ON ep.id=f.provider_id
      WHERE ep.primary_type='ems'),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb)
      FROM public.provider_service_areas a JOIN public.providers ep ON ep.id=a.provider_id
      WHERE ep.primary_type='ems'))::text FROM public.providers p WHERE p.primary_type='ems')),
  'otherHomeFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb)
      FROM public.care_offerings o JOIN public.providers hp ON hp.id=o.provider_id
      WHERE hp.primary_type='domicile' AND hp.slug<>'senevita-vaud'),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb)
      FROM public.provider_service_areas a JOIN public.providers hp ON hp.id=a.provider_id
      WHERE hp.primary_type='domicile' AND hp.slug<>'senevita-vaud'))::text
      FROM public.providers p WHERE p.primary_type='domicile' AND p.slug<>'senevita-vaud')),
  'providerFingerprint',md5((SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb)::text
    FROM public.providers p)),
  'existingDataFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.providers t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_service_areas t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.municipalities t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offerings t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_features t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_availability t)
  ))
);`;

const newStateSql = `SELECT jsonb_build_object(
  'organizationSources',(SELECT count(*) FROM public.organization_sources),
  'providerNames',(SELECT count(*) FROM public.provider_names),
  'organizationNames',(SELECT count(*) FROM public.organization_names),
  'providerIdentityLinks',(SELECT count(*) FROM public.provider_identity_links),
  'organizationRelationships',(SELECT count(*) FROM public.organization_relationships),
  'regulatoryDesignations',(SELECT count(*) FROM public.care_offering_regulatory_designations)
);`;

const state = () => JSON.parse(runLocalSql(stateSql).trim());

function assertBaseline(value) {
  assert.equal(value.providers, 66, "existing provider count changed");
  assert.equal(value.enrichedEms, 31, "31 EMS enrichment baseline changed");
  assert.equal(value.emsFingerprint, "b8756e81599062f1091dc7ee64359653",
    "31 EMS enrichment fingerprint changed");
  assert.equal(value.otherHomeFingerprint, "367ce3bc3612c56d3da6386167739020",
    "legacy domicile fingerprint changed");
  assert.equal(value.homeSupportOfferings, 0, "home_support must not be assigned automatically");
  assert.equal(value.senevitaOrganizations, 1);
  assert.equal(value.senevitaOfferings, 1);
  assert.equal(value.senevitaFeatures, 11);
  assert.equal(value.senevitaServiceAreas, 1);
}

function verifySenevitaProjection() {
  const snapshot = JSON.parse(runLocalSql(buildLocalProviderDetailSql("senevita-vaud")).trim());
  const detail = projectReviewedCareDetail(snapshot);
  assert.equal(snapshot.provider.slug, "senevita-vaud");
  assert.equal(snapshot.organizationLinks.length, 1);
  assert.equal(snapshot.organizationLinks[0].organization.name, "Senevita AG");
  assert.equal(detail.offerings.length, 1);
  assert.equal(detail.offerings[0].services.length, 10);
  assert.equal(detail.offerings[0].careProfiles.length, 1);
  assert.deepEqual(detail.offerings[0].coverage, ["dans la région de Vaud"]);
  return { provider: snapshot.provider.slug, organization: "Senevita AG", offerings: 1,
    services: 10, careProfiles: 1, coverage: detail.offerings[0].coverage };
}

const args = parseLocalArgs(process.argv.slice(2));
const target = inspectLocalTarget();
const before = state();
assertBaseline(before);

if (args.mode === "--write-local") {
  assert.equal(before.newTables, 0, "Phase 5F migration is already present");
  runLocalSql(`BEGIN;\n${withoutTransaction(migration)}\n${withoutTransaction(dryRun)}\nROLLBACK;`);
  assert.deepEqual(state(), before, "combined rollback validation changed schema or existing data");
  runLocalSql(migration);
}

runLocalSql(dryRun);
const after = state();
assertBaseline(after);
assert.equal(after.newTables, 6, "Phase 5F schema tables are incomplete");
assert.equal(after.providerFingerprint, before.providerFingerprint, "provider rows changed");
assert.equal(after.existingDataFingerprint, before.existingDataFingerprint, "existing provider/care data changed");
const newRows = JSON.parse(runLocalSql(newStateSql).trim());
assert.ok(Object.values(newRows).every((count) => count === 0), "Phase 5F migration wrote foundation data");
const senevita = verifySenevitaProjection();

console.log(JSON.stringify({
  mode: args.mode,
  target,
  confirmation: args.mode === "--write-local" ? LOCAL_CONFIRMATION : undefined,
  migration: migrationName,
  rollbackValidation: args.mode === "--write-local" ? "passed" : "not-requested",
  providerRowsUntouched: true,
  existingDataUntouched: true,
  existing31EmsFingerprintUnchanged: true,
  legacyDomicileFingerprintUnchanged: true,
  newFoundationRows: newRows,
  senevitaProjection: senevita,
  databaseCounts: after,
}, null, 2));
