import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { compileBatchA, buildBatchAApplySql, buildBatchARollbackSql }
  from "../lib/phase5f-batch-a.mjs";
import { inspectLocalTarget, LOCAL_CONFIRMATION, runLocalSql }
  from "../lib/local-provider-writer.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { projectReviewedCareDetail } from "../lib/provider-care-projection.js";

const data = compileBatchA();
const hash = (table, where = "true") => `(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'')) FROM public.${table} t WHERE ${where})`;
const stateSql = `SELECT jsonb_build_object(
  'providers',(SELECT count(*) FROM public.providers),
  'providerSources',(SELECT count(*) FROM public.provider_sources),
  'organizations',(SELECT count(*) FROM public.organizations),
  'organizationSources',(SELECT count(*) FROM public.organization_sources),
  'organizationRelationships',(SELECT count(*) FROM public.organization_relationships),
  'providerNames',(SELECT count(*) FROM public.provider_names),
  'organizationNames',(SELECT count(*) FROM public.organization_names),
  'providerIdentityLinks',(SELECT count(*) FROM public.provider_identity_links),
  'regulatoryDesignations',(SELECT count(*) FROM public.care_offering_regulatory_designations),
  'providerOrganizations',(SELECT count(*) FROM public.provider_organizations),
  'offerings',(SELECT count(*) FROM public.care_offerings),
  'features',(SELECT count(*) FROM public.care_offering_features),
  'offeringSources',(SELECT count(*) FROM public.care_offering_sources),
  'serviceAreas',(SELECT count(*) FROM public.provider_service_areas),
  'municipalities',(SELECT count(*) FROM public.municipalities),
  'homeSupportOfferings',(SELECT count(*) FROM public.care_offerings WHERE offering_type='home_support'),
  'enrichedEms',(SELECT count(DISTINCT p.id) FROM public.providers p JOIN public.care_offerings o ON o.provider_id=p.id WHERE p.primary_type='ems'),
  'cmsProviderRows',(SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%'),
  'avasadProvider',(SELECT to_jsonb(p) FROM public.providers p WHERE slug='avasad-cms'),
  'providerHash',${hash("providers")},
  'providerSourceHash',${hash("provider_sources")},
  'organizationHash',${hash("organizations")},
  'organizationSourceHash',${hash("organization_sources")},
  'organizationRelationshipHash',${hash("organization_relationships")},
  'providerOrganizationHash',${hash("provider_organizations")},
  'offeringHash',${hash("care_offerings")},
  'featureHash',${hash("care_offering_features")},
  'offeringSourceHash',${hash("care_offering_sources")},
  'serviceAreaHash',${hash("provider_service_areas")},
  'emsFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers ep ON ep.id=o.provider_id WHERE ep.primary_type='ems'),
    'features',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.offering_id,f.feature_kind,f.feature_code),'[]'::jsonb) FROM public.care_offering_features f JOIN public.providers ep ON ep.id=f.provider_id WHERE ep.primary_type='ems'),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers ep ON ep.id=a.provider_id WHERE ep.primary_type='ems'))::text FROM public.providers p WHERE p.primary_type='ems')),
  'legacyDomicileFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers hp ON hp.id=o.provider_id WHERE hp.primary_type='domicile' AND hp.slug<>'senevita-vaud'),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers hp ON hp.id=a.provider_id WHERE hp.primary_type='domicile' AND hp.slug<>'senevita-vaud'))::text FROM public.providers p WHERE p.primary_type='domicile' AND p.slug<>'senevita-vaud')),
  'nonTargetDomicileFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers hp ON hp.id=o.provider_id WHERE hp.primary_type='domicile' AND hp.slug NOT IN ('senevita-vaud','avasad-cms')),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers hp ON hp.id=a.provider_id WHERE hp.primary_type='domicile' AND hp.slug NOT IN ('senevita-vaud','avasad-cms')))::text FROM public.providers p WHERE p.primary_type='domicile' AND p.slug NOT IN ('senevita-vaud','avasad-cms')))
);`;

const state = () => JSON.parse(runLocalSql(stateSql).trim());

function projection() {
  const snapshot = JSON.parse(runLocalSql(buildLocalProviderDetailSql("senevita-vaud")).trim());
  const detail = projectReviewedCareDetail(snapshot);
  return { organization: snapshot.organizationLinks[0]?.organization.name,
    offerings: detail?.offerings.length, services: detail?.offerings[0]?.services.length,
    careProfiles: detail?.offerings[0]?.careProfiles.length, coverage: detail?.offerings[0]?.coverage };
}

function assertCompatibility(before, after) {
  assert.equal(after.providers, 66);
  assert.equal(after.enrichedEms, 31);
  assert.equal(after.emsFingerprint, "b8756e81599062f1091dc7ee64359653");
  assert.equal(after.cmsProviderRows, before.cmsProviderRows, "Batch A created a CMS provider row");
  for (const key of ["providerOrganizations", "offerings", "features", "offeringSources",
    "serviceAreas", "municipalities", "homeSupportOfferings", "providerNames",
    "organizationNames", "providerIdentityLinks", "regulatoryDesignations",
    "providerOrganizationHash", "offeringHash", "featureHash", "offeringSourceHash",
    "serviceAreaHash", "nonTargetDomicileFingerprint"]) {
    assert.deepEqual(after[key], before[key], `Compatibility value changed: ${key}`);
  }
  assert.equal(after.organizations, before.organizations + 8);
  assert.equal(after.organizationSources, before.organizationSources + 8);
  assert.equal(after.organizationRelationships, before.organizationRelationships + 7);
  assert.equal(after.providerSources, before.providerSources + 1);
  assert.equal(after.avasadProvider.status, "archived");
  assert.equal(after.avasadProvider.is_published, false);
  assert.equal(after.avasadProvider.verification_status, "unverified");
}

function exactRows() {
  const ids = data.organizations.map((item) => `'${item.id}'::uuid`).join(",");
  return JSON.parse(runLocalSql(`SELECT jsonb_build_object(
    'organizations',(SELECT jsonb_agg(jsonb_build_object('slug',o.slug,'name',o.name,'legalName',o.legal_name,
      'published',o.is_published,'verification',o.verification_status) ORDER BY o.slug)
      FROM public.organizations o WHERE o.id IN (${ids})),
    'sources',(SELECT jsonb_agg(jsonb_build_object('organization',o.slug,'sourceName',s.source_name,
      'sourceUrl',s.source_url,'accessedOn',s.accessed_on,'fieldsSupported',s.fields_supported) ORDER BY o.slug)
      FROM public.organization_sources s JOIN public.organizations o ON o.id=s.organization_id WHERE o.id IN (${ids})),
    'relationships',(SELECT jsonb_agg(jsonb_build_object('parent',p.slug,'member',m.slug,'type',r.relationship_type,
      'evidenceOwner',e.slug) ORDER BY m.slug) FROM public.organization_relationships r
      JOIN public.organizations p ON p.id=r.parent_organization_id
      JOIN public.organizations m ON m.id=r.member_organization_id
      JOIN public.organizations e ON e.id=r.evidence_organization_id WHERE p.slug='avasad'),
    'legacyProviderSource',(SELECT jsonb_build_object('sourceName',s.source_name,'sourceType',s.source_type,
      'accessedOn',s.accessed_on,'fieldsSupported',s.fields_supported) FROM public.provider_sources s
      WHERE s.id='${data.providerSource.id}'::uuid));`).trim());
}

function checkedFinalState() {
  const current = state();
  assert.equal(current.providers, 66);
  assert.equal(current.providerSources, 136);
  assert.equal(current.organizations, 30);
  assert.equal(current.organizationSources, 8);
  assert.equal(current.organizationRelationships, 7);
  assert.equal(current.enrichedEms, 31);
  assert.equal(current.emsFingerprint, "b8756e81599062f1091dc7ee64359653");
  assert.equal(current.offerings, 32);
  assert.equal(current.features, 84);
  assert.equal(current.offeringSources, 53);
  assert.equal(current.serviceAreas, 1);
  assert.equal(current.homeSupportOfferings, 0);
  assert.equal(current.avasadProvider.status, "archived");
  const senevita = projection();
  assert.deepEqual(senevita, { organization: "Senevita AG", offerings: 1, services: 10,
    careProfiles: 1, coverage: ["dans la région de Vaud"] });
  return { current, rows: exactRows(), senevita };
}

function main(args) {
  if (args.length === 1 && args[0] === "--check") {
    console.log(JSON.stringify({ mode: "check", expectedRows: data.batch.expectedRows,
      expectedNetNewRows: data.batch.expectedNetNewRows, organizations: data.organizations.map((item) => item.slug) }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === "--dry-run-local") {
    const target = inspectLocalTarget();
    const before = state();
    const result = JSON.parse(runLocalSql(buildBatchAApplySql({ rollback: true })).trim());
    assert.deepEqual(state(), before, "Batch A dry-run did not roll back exactly");
    console.log(JSON.stringify({ mode: "dry-run-local", databaseWrites: 0, target,
      result, rollback: "exact pre-Batch-A state restored" }, null, 2));
    return;
  }
  if (args.length === 3 && args[0] === "--write-cycle-local" && args[1] === "--confirm"
    && args[2] === LOCAL_CONFIRMATION) {
    const target = inspectLocalTarget();
    const before = state();
    const beforeProjection = projection();
    const applied = JSON.parse(runLocalSql(buildBatchAApplySql()).trim());
    const firstApply = state();
    assertCompatibility(before, firstApply);
    assert.deepEqual(projection(), beforeProjection, "Senevita projection changed on first apply");
    runLocalSql(buildBatchARollbackSql(before.avasadProvider));
    const rolledBack = state();
    assert.deepEqual(rolledBack, before, "Committed Batch A rollback did not restore the exact pre-state");
    assert.deepEqual(projection(), beforeProjection, "Senevita projection changed after rollback");
    const reapplied = JSON.parse(runLocalSql(buildBatchAApplySql()).trim());
    const final = state();
    assertCompatibility(before, final);
    assert.deepEqual(projection(), beforeProjection, "Senevita projection changed after reapply");
    console.log(JSON.stringify({ mode: "write-cycle-local", target, applied, firstApply,
      rollback: "exact pre-Batch-A state restored", reapplied, final, senevita: beforeProjection }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === "--verify-local") {
    const target = inspectLocalTarget();
    console.log(JSON.stringify({ mode: "verify-local", databaseWrites: 0, target,
      ...checkedFinalState() }, null, 2));
    return;
  }
  throw new Error(`Use --check, --dry-run-local, --write-cycle-local --confirm ${LOCAL_CONFIRMATION}, or --verify-local`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.stack ?? error.message); process.exitCode = 1; }
}
