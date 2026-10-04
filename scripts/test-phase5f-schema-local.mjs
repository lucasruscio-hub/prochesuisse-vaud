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
  'batchAOrganizations',(SELECT count(*) FROM public.organizations WHERE slug IN
    ('avasad','fondation-soins-lausanne','apromad','apremadol','asante-sana','absmad','fondation-de-la-cote','aspmad')),
  'batchAArchivedProvider',(SELECT count(*) FROM public.providers WHERE slug='avasad-cms'
    AND status='archived' AND NOT is_published AND verification_status='unverified'),
  'batchB1Providers',(SELECT count(*) FROM public.providers WHERE slug IN
    ('cms-ancien-stand','cms-centre-ville','cms-chailly-sallaz','cms-montelly',
     'cms-ouchy','cms-des-peupliers','cms-riponne','cms-valency')),
  'batchB2Providers',(SELECT count(*) FROM public.providers WHERE slug IN
    ('cms-cully','cms-echallens','cms-epalinges','cms-du-mont',
     'cms-oron','cms-prilly-nord','cms-prilly-sud','cms-pully')),
  'batchB3Providers',(SELECT count(*) FROM public.providers WHERE slug IN
    ('cms-bussigny-villars-ste-croix','cms-ecublens-saint-sulpice-chavannes',
     'cms-renens-nord-crissier','cms-renens-sud')),
  'poleSanteOrganizations',(SELECT count(*) FROM public.organizations
    WHERE slug='pole-sante-pays-denhaut'),
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
  'nonTargetHomeFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb)
      FROM public.care_offerings o JOIN public.providers hp ON hp.id=o.provider_id
      WHERE hp.primary_type='domicile' AND hp.slug NOT IN ('senevita-vaud','avasad-cms',
        'cms-ancien-stand','cms-centre-ville','cms-chailly-sallaz','cms-montelly',
        'cms-ouchy','cms-des-peupliers','cms-riponne','cms-valency','cms-cully',
        'cms-echallens','cms-epalinges','cms-du-mont','cms-oron','cms-prilly-nord',
        'cms-prilly-sud','cms-pully','cms-bussigny-villars-ste-croix',
        'cms-ecublens-saint-sulpice-chavannes','cms-renens-nord-crissier','cms-renens-sud')),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb)
      FROM public.provider_service_areas a JOIN public.providers hp ON hp.id=a.provider_id
      WHERE hp.primary_type='domicile' AND hp.slug NOT IN ('senevita-vaud','avasad-cms',
        'cms-ancien-stand','cms-centre-ville','cms-chailly-sallaz','cms-montelly',
        'cms-ouchy','cms-des-peupliers','cms-riponne','cms-valency','cms-cully',
        'cms-echallens','cms-epalinges','cms-du-mont','cms-oron','cms-prilly-nord',
        'cms-prilly-sud','cms-pully','cms-bussigny-villars-ste-croix',
        'cms-ecublens-saint-sulpice-chavannes','cms-renens-nord-crissier','cms-renens-sud')))::text
      FROM public.providers p WHERE p.primary_type='domicile'
        AND p.slug NOT IN ('senevita-vaud','avasad-cms','cms-ancien-stand','cms-centre-ville',
          'cms-chailly-sallaz','cms-montelly','cms-ouchy','cms-des-peupliers','cms-riponne','cms-valency',
          'cms-cully','cms-echallens','cms-epalinges','cms-du-mont','cms-oron','cms-prilly-nord',
          'cms-prilly-sud','cms-pully','cms-bussigny-villars-ste-croix',
          'cms-ecublens-saint-sulpice-chavannes','cms-renens-nord-crissier','cms-renens-sud'))),
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
  assert.ok(value.batchB1Providers === 0 || value.batchB1Providers === 8,
    "partial Batch B1 provider state detected");
  assert.ok(value.batchB2Providers === 0 || value.batchB2Providers === 8,
    "partial Batch B2 provider state detected");
  assert.ok(value.batchB3Providers === 0 || value.batchB3Providers === 4,
    "partial Batch B3 provider state detected");
  assert.ok(value.poleSanteOrganizations === 0 || value.poleSanteOrganizations === 1,
    "partial Pôle Santé prerequisite state detected");
  if (value.batchB2Providers === 8) assert.equal(value.batchB1Providers, 8,
    "Batch B2 cannot exist without Batch B1");
  if (value.batchB3Providers === 4) assert.equal(value.batchB2Providers, 8,
    "Batch B3 cannot exist without Batch B2");
  if (value.poleSanteOrganizations === 1) assert.equal(value.batchB3Providers, 4,
    "Pôle Santé prerequisite cannot exist without Batch B3");
  assert.equal(value.providers, 66 + value.batchB1Providers + value.batchB2Providers
    + value.batchB3Providers,
    "existing provider count changed");
  assert.equal(value.enrichedEms, 31, "31 EMS enrichment baseline changed");
  assert.equal(value.emsFingerprint, "b8756e81599062f1091dc7ee64359653",
    "31 EMS enrichment fingerprint changed");
  assert.equal(value.nonTargetHomeFingerprint, "153f50c79913cd0b3f47646cbf82ecb2",
    "non-target legacy domicile fingerprint changed");
  const batchAApplied = value.batchAOrganizations === 8 && value.batchAArchivedProvider === 1;
  if (!batchAApplied) {
    assert.equal(value.batchAOrganizations, 0, "partial Batch A organization state detected");
    assert.equal(value.batchAArchivedProvider, 0, "partial Batch A provider state detected");
    assert.equal(value.otherHomeFingerprint, "367ce3bc3612c56d3da6386167739020",
      "pre-Batch-A legacy domicile fingerprint changed");
  }
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
const batchAAlreadyApplied = before.batchAOrganizations === 8 && before.batchAArchivedProvider === 1;
const batchB1AlreadyApplied = before.batchB1Providers === 8;
const batchB2AlreadyApplied = before.batchB2Providers === 8;
const batchB3AlreadyApplied = before.batchB3Providers === 4;
const poleSanteAlreadyApplied = before.poleSanteOrganizations === 1;

if (args.mode === "--write-local") {
  assert.equal(batchAAlreadyApplied, false,
    "Schema migration write mode is unavailable after Phase 5F identity batches begin");
  assert.equal(before.newTables, 0, "Phase 5F migration is already present");
  runLocalSql(`BEGIN;\n${withoutTransaction(migration)}\n${withoutTransaction(dryRun)}\nROLLBACK;`);
  assert.deepEqual(state(), before, "combined rollback validation changed schema or existing data");
  runLocalSql(migration);
}

if (!batchAAlreadyApplied) runLocalSql(dryRun);
const after = state();
assertBaseline(after);
assert.equal(after.newTables, 6, "Phase 5F schema tables are incomplete");
assert.equal(after.providerFingerprint, before.providerFingerprint, "provider rows changed");
assert.equal(after.existingDataFingerprint, before.existingDataFingerprint, "existing provider/care data changed");
const newRows = JSON.parse(runLocalSql(newStateSql).trim());
const batchAApplied = after.batchAOrganizations === 8 && after.batchAArchivedProvider === 1;
assert.deepEqual(newRows, poleSanteAlreadyApplied ? {
  organizationSources: 9,
  providerNames: 0,
  organizationNames: 1,
  providerIdentityLinks: 20,
  organizationRelationships: 7,
  regulatoryDesignations: 20,
} : batchB3AlreadyApplied ? {
  organizationSources: 8,
  providerNames: 0,
  organizationNames: 0,
  providerIdentityLinks: 20,
  organizationRelationships: 7,
  regulatoryDesignations: 20,
} : batchB2AlreadyApplied ? {
  organizationSources: 8,
  providerNames: 0,
  organizationNames: 0,
  providerIdentityLinks: 16,
  organizationRelationships: 7,
  regulatoryDesignations: 16,
} : batchB1AlreadyApplied ? {
  organizationSources: 8,
  providerNames: 0,
  organizationNames: 0,
  providerIdentityLinks: 8,
  organizationRelationships: 7,
  regulatoryDesignations: 8,
} : batchAApplied ? {
  organizationSources: 8,
  providerNames: 0,
  organizationNames: 0,
  providerIdentityLinks: 0,
  organizationRelationships: 7,
  regulatoryDesignations: 0,
} : {
  organizationSources: 0,
  providerNames: 0,
  organizationNames: 0,
  providerIdentityLinks: 0,
  organizationRelationships: 0,
  regulatoryDesignations: 0,
}, "Phase 5F foundation/identity-batch state is inconsistent");
const senevita = verifySenevitaProjection();

console.log(JSON.stringify({
  mode: args.mode,
  target,
  confirmation: args.mode === "--write-local" ? LOCAL_CONFIRMATION : undefined,
  migration: migrationName,
  rollbackValidation: args.mode === "--write-local" ? "passed" : "not-requested",
  foundationConstraintDryRun: batchAAlreadyApplied ? "skipped-after-Batch-A" : "passed",
  schemaVerificationDidNotMutateProviderRows: true,
  schemaVerificationDidNotMutateExistingData: true,
  existing31EmsFingerprintUnchanged: true,
  nonTargetLegacyDomicileFingerprintUnchanged: true,
  targetIncludedLegacyDomicileFingerprint: after.otherHomeFingerprint,
  batchAState: batchAApplied ? "applied" : "not-applied",
  batchB1State: batchB1AlreadyApplied ? "applied" : "not-applied",
  batchB2State: batchB2AlreadyApplied ? "applied" : "not-applied",
  batchB3State: batchB3AlreadyApplied ? "applied" : "not-applied",
  poleSantePrerequisiteState: poleSanteAlreadyApplied ? "applied" : "not-applied",
  phase5fRows: newRows,
  senevitaProjection: senevita,
  databaseCounts: after,
}, null, 2));
