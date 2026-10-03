import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { buildBatchB1FslApplySql, buildBatchB1FslRollbackSql, compileBatchB1Fsl }
  from "../lib/phase5f-batch-b1-fsl.mjs";
import { inspectLocalTarget, LOCAL_CONFIRMATION, runLocalSql }
  from "../lib/local-provider-writer.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { projectReviewedCareDetail } from "../lib/provider-care-projection.js";

const data = compileBatchB1Fsl();
const slugs = data.providers.map((item) => `'${item.slug}'`).join(",");
const targetIds = data.providers.map((item) => `'${item.id}'::uuid`).join(",");
const hash = (sql) => `(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'')) FROM (${sql}) t)`;
const stateSql = `SELECT jsonb_build_object(
  'providers',(SELECT count(*) FROM public.providers),
  'providerSources',(SELECT count(*) FROM public.provider_sources),
  'organizations',(SELECT count(*) FROM public.organizations),
  'organizationSources',(SELECT count(*) FROM public.organization_sources),
  'organizationRelationships',(SELECT count(*) FROM public.organization_relationships),
  'providerOrganizations',(SELECT count(*) FROM public.provider_organizations),
  'offerings',(SELECT count(*) FROM public.care_offerings),
  'features',(SELECT count(*) FROM public.care_offering_features),
  'offeringSources',(SELECT count(*) FROM public.care_offering_sources),
  'availability',(SELECT count(*) FROM public.care_offering_availability),
  'serviceAreas',(SELECT count(*) FROM public.provider_service_areas),
  'municipalities',(SELECT count(*) FROM public.municipalities),
  'providerNames',(SELECT count(*) FROM public.provider_names),
  'organizationNames',(SELECT count(*) FROM public.organization_names),
  'providerIdentityLinks',(SELECT count(*) FROM public.provider_identity_links),
  'regulatoryDesignations',(SELECT count(*) FROM public.care_offering_regulatory_designations),
  'homeSupportOfferings',(SELECT count(*) FROM public.care_offerings WHERE offering_type='home_support'),
  'targetProviders',(SELECT count(*) FROM public.providers WHERE id IN (${targetIds})),
  'otherCmsProviders',(SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%' AND id NOT IN (${targetIds})),
  'emsFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers ep ON ep.id=o.provider_id WHERE ep.primary_type='ems'),
    'features',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.offering_id,f.feature_kind,f.feature_code),'[]'::jsonb) FROM public.care_offering_features f JOIN public.providers ep ON ep.id=f.provider_id WHERE ep.primary_type='ems'),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers ep ON ep.id=a.provider_id WHERE ep.primary_type='ems'))::text FROM public.providers p WHERE p.primary_type='ems')),
  'nonTargetDomicileFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers hp ON hp.id=o.provider_id WHERE hp.primary_type='domicile' AND hp.slug NOT IN ('senevita-vaud','avasad-cms',${slugs})),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers hp ON hp.id=a.provider_id WHERE hp.primary_type='domicile' AND hp.slug NOT IN ('senevita-vaud','avasad-cms',${slugs})))::text FROM public.providers p WHERE p.primary_type='domicile' AND p.slug NOT IN ('senevita-vaud','avasad-cms',${slugs}))),
  'batchAStructureFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_relationships t),
    (SELECT to_jsonb(p)::text FROM public.providers p WHERE p.slug='avasad-cms'),
    (SELECT coalesce(string_agg(to_jsonb(s)::text,E'\\n' ORDER BY to_jsonb(s)::text),'') FROM public.provider_sources s JOIN public.providers p ON p.id=s.provider_id WHERE p.slug='avasad-cms'))),
  'unrelatedProviderHash',${hash(`SELECT * FROM public.providers WHERE slug NOT IN (${slugs})`)},
  'unrelatedProviderSourceHash',${hash(`SELECT s.* FROM public.provider_sources s WHERE s.provider_id NOT IN (${targetIds})`)},
  'unrelatedProviderOrganizationHash',${hash(`SELECT po.* FROM public.provider_organizations po WHERE po.provider_id NOT IN (${targetIds})`)},
  'unrelatedOfferingHash',${hash(`SELECT o.* FROM public.care_offerings o WHERE o.provider_id NOT IN (${targetIds})`)},
  'unrelatedFeatureHash',${hash(`SELECT f.* FROM public.care_offering_features f WHERE f.provider_id NOT IN (${targetIds})`)},
  'unrelatedOfferingSourceHash',${hash(`SELECT s.* FROM public.care_offering_sources s WHERE s.provider_id NOT IN (${targetIds})`)},
  'unrelatedAvailabilityHash',${hash(`SELECT a.* FROM public.care_offering_availability a WHERE a.provider_id NOT IN (${targetIds})`)},
  'unrelatedServiceAreaHash',${hash(`SELECT a.* FROM public.provider_service_areas a WHERE a.provider_id NOT IN (${targetIds})`)}
);`;

const state = () => JSON.parse(runLocalSql(stateSql).trim());

function projection() {
  const snapshot = JSON.parse(runLocalSql(buildLocalProviderDetailSql("senevita-vaud")).trim());
  const detail = projectReviewedCareDetail(snapshot);
  return { organization: snapshot.organizationLinks[0]?.organization.name,
    offerings: detail?.offerings.length, services: detail?.offerings[0]?.services.length,
    careProfiles: detail?.offerings[0]?.careProfiles.length, coverage: detail?.offerings[0]?.coverage };
}

const unchangedKeys = ["organizations", "organizationSources", "organizationRelationships",
  "features", "availability", "serviceAreas", "municipalities", "providerNames",
  "organizationNames", "homeSupportOfferings", "emsFingerprint", "nonTargetDomicileFingerprint",
  "batchAStructureFingerprint", "unrelatedProviderHash", "unrelatedProviderSourceHash",
  "unrelatedProviderOrganizationHash", "unrelatedOfferingHash", "unrelatedFeatureHash",
  "unrelatedOfferingSourceHash", "unrelatedAvailabilityHash", "unrelatedServiceAreaHash"];

function assertCompatibility(before, after) {
  assert.equal(after.providers, before.providers + 8);
  assert.equal(after.providerSources, before.providerSources + 8);
  assert.equal(after.providerOrganizations, before.providerOrganizations + 16);
  assert.equal(after.offerings, before.offerings + 8);
  assert.equal(after.offeringSources, before.offeringSources + 8);
  assert.equal(after.providerIdentityLinks, before.providerIdentityLinks + 8);
  assert.equal(after.regulatoryDesignations, before.regulatoryDesignations + 8);
  assert.equal(after.targetProviders, 8);
  assert.equal(after.otherCmsProviders, 0);
  assert.equal(after.emsFingerprint, "b8756e81599062f1091dc7ee64359653");
  for (const key of unchangedKeys) assert.deepEqual(after[key], before[key], `Changed: ${key}`);
}

function exactRows() {
  return JSON.parse(runLocalSql(`SELECT jsonb_build_object(
    'providers',(SELECT jsonb_agg(jsonb_build_object('slug',p.slug,'name',p.name,'published',p.is_published,
      'verification',p.verification_status) ORDER BY p.name) FROM public.providers p WHERE p.id IN (${targetIds})),
    'organizationLinks',(SELECT jsonb_agg(jsonb_build_object('provider',p.slug,'organization',o.slug,
      'relationship',po.relationship_type,'primary',po.is_primary) ORDER BY p.slug,o.slug)
      FROM public.provider_organizations po JOIN public.providers p ON p.id=po.provider_id
      JOIN public.organizations o ON o.id=po.organization_id WHERE p.id IN (${targetIds})),
    'offerings',(SELECT jsonb_agg(jsonb_build_object('provider',p.slug,'type',o.offering_type,'name',o.name)
      ORDER BY p.slug) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.id IN (${targetIds})),
    'evidence',(SELECT jsonb_agg(jsonb_build_object('provider',p.slug,'sourceType',s.source_type,
      'sourceName',s.source_name,'externalRecordId',s.external_record_id,'accessedOn',s.accessed_on)
      ORDER BY p.slug) FROM public.provider_sources s JOIN public.providers p ON p.id=s.provider_id WHERE p.id IN (${targetIds})),
    'offeringEvidence',(SELECT count(*) FROM public.care_offering_sources WHERE provider_id IN (${targetIds})),
    'splitLinks',(SELECT count(*) FROM public.provider_identity_links WHERE successor_provider_id IN (${targetIds})
      AND predecessor_provider_id='14b8abc0-33da-4b2e-9ebb-7a2046024c0f'::uuid AND relationship_type='split_into'),
    'designations',(SELECT jsonb_agg(jsonb_build_object('provider',p.slug,'scheme',d.scheme,'code',d.designation_code,
      'label',d.designation_label,'jurisdiction',concat_ws('-',d.jurisdiction_country_code,d.jurisdiction_code),
      'status',d.designation_status,'published',d.is_published) ORDER BY p.slug)
      FROM public.care_offering_regulatory_designations d JOIN public.providers p ON p.id=d.provider_id
      WHERE p.id IN (${targetIds})));
  `).trim());
}

function assertFinal(value) {
  assert.deepEqual({ providers: value.providers, providerSources: value.providerSources,
    providerOrganizations: value.providerOrganizations, offerings: value.offerings,
    offeringSources: value.offeringSources, providerIdentityLinks: value.providerIdentityLinks,
    regulatoryDesignations: value.regulatoryDesignations, targetProviders: value.targetProviders,
    otherCmsProviders: value.otherCmsProviders }, {
    providers: 74, providerSources: 144, providerOrganizations: 48, offerings: 40,
    offeringSources: 61, providerIdentityLinks: 8, regulatoryDesignations: 8,
    targetProviders: 8, otherCmsProviders: 0,
  });
  assert.equal(value.emsFingerprint, "b8756e81599062f1091dc7ee64359653");
  assert.equal(value.nonTargetDomicileFingerprint, "153f50c79913cd0b3f47646cbf82ecb2");
}

function main(args) {
  if (args.length === 1 && args[0] === "--check") {
    console.log(JSON.stringify({ mode: "check", subBatch: data.subBatch,
      providers: data.providers.map(({ id, slug, name }) => ({ id, slug, name })) }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === "--dry-run-local") {
    const target = inspectLocalTarget();
    const before = state();
    const result = JSON.parse(runLocalSql(buildBatchB1FslApplySql({ rollback: true })).trim());
    assert.deepEqual(state(), before, "B1 dry-run did not restore exact pre-B1 state");
    console.log(JSON.stringify({ mode: "dry-run-local", databaseWrites: 0, target, result,
      rollback: "exact pre-B1 state restored" }, null, 2));
    return;
  }
  if (args.length === 3 && args[0] === "--write-cycle-local" && args[1] === "--confirm"
    && args[2] === LOCAL_CONFIRMATION) {
    const target = inspectLocalTarget();
    const before = state();
    const beforeProjection = projection();
    const applied = JSON.parse(runLocalSql(buildBatchB1FslApplySql()).trim());
    const firstApply = state();
    assertCompatibility(before, firstApply);
    assert.deepEqual(projection(), beforeProjection, "Senevita projection changed on apply");
    runLocalSql(buildBatchB1FslRollbackSql());
    assert.deepEqual(state(), before, "Committed B1 rollback did not restore exact pre-B1 state");
    assert.deepEqual(projection(), beforeProjection, "Senevita projection changed after rollback");
    const reapplied = JSON.parse(runLocalSql(buildBatchB1FslApplySql()).trim());
    const final = state();
    assertCompatibility(before, final);
    assert.deepEqual(projection(), beforeProjection, "Senevita projection changed after reapply");
    console.log(JSON.stringify({ mode: "write-cycle-local", target, applied, firstApply,
      rollback: "exact pre-B1 state restored", reapplied, final, rows: exactRows(),
      senevita: beforeProjection }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === "--verify-local") {
    const target = inspectLocalTarget();
    const current = state();
    assertFinal(current);
    const senevita = projection();
    assert.deepEqual(senevita, { organization: "Senevita AG", offerings: 1, services: 10,
      careProfiles: 1, coverage: ["dans la région de Vaud"] });
    console.log(JSON.stringify({ mode: "verify-local", databaseWrites: 0, target, current,
      rows: exactRows(), senevita }, null, 2));
    return;
  }
  throw new Error(`Use --check, --dry-run-local, --write-cycle-local --confirm ${LOCAL_CONFIRMATION}, or --verify-local`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.stack ?? error.message); process.exitCode = 1; }
}
