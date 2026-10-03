import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { buildBatchB2ApromadApplySql, buildBatchB2ApromadRollbackSql, compileBatchB2Apromad }
  from "../lib/phase5f-batch-b2-apromad.mjs";
import { inspectLocalTarget, LOCAL_CONFIRMATION, runLocalSql }
  from "../lib/local-provider-writer.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { projectReviewedCareDetail } from "../lib/provider-care-projection.js";

const data = compileBatchB2Apromad();
const targetSlugs = data.providers.map((item) => `'${item.slug}'`).join(",");
const targetIds = data.providers.map((item) => `'${item.id}'::uuid`).join(",");
const b1Slugs = data.priorProviders.map((item) => `'${item.slug}'`).join(",");
const b1Ids = data.priorProviders.map((item) => `'${item.id}'::uuid`).join(",");
const allBatchSlugs = `${b1Slugs},${targetSlugs}`;
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
  'b1Providers',(SELECT count(*) FROM public.providers WHERE id IN (${b1Ids})),
  'futureCmsProviders',(SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%'
    AND slug NOT IN (${allBatchSlugs})),
  'emsFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers ep ON ep.id=o.provider_id WHERE ep.primary_type='ems'),
    'features',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.offering_id,f.feature_kind,f.feature_code),'[]'::jsonb) FROM public.care_offering_features f JOIN public.providers ep ON ep.id=f.provider_id WHERE ep.primary_type='ems'),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers ep ON ep.id=a.provider_id WHERE ep.primary_type='ems'))::text FROM public.providers p WHERE p.primary_type='ems')),
  'nonTargetDomicileFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers hp ON hp.id=o.provider_id WHERE hp.primary_type='domicile' AND hp.slug NOT IN ('senevita-vaud','avasad-cms',${allBatchSlugs})),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers hp ON hp.id=a.provider_id WHERE hp.primary_type='domicile' AND hp.slug NOT IN ('senevita-vaud','avasad-cms',${allBatchSlugs})))::text FROM public.providers p WHERE p.primary_type='domicile' AND p.slug NOT IN ('senevita-vaud','avasad-cms',${allBatchSlugs}))),
  'batchAStructureFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_relationships t),
    (SELECT to_jsonb(p)::text FROM public.providers p WHERE p.slug='avasad-cms'),
    (SELECT coalesce(string_agg(to_jsonb(s)::text,E'\\n' ORDER BY to_jsonb(s)::text),'') FROM public.provider_sources s JOIN public.providers p ON p.id=s.provider_id WHERE p.slug='avasad-cms'))),
  'b1Fingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.providers t WHERE id IN (${b1Ids})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_sources t WHERE provider_id IN (${b1Ids})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_organizations t WHERE provider_id IN (${b1Ids})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offerings t WHERE provider_id IN (${b1Ids})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_sources t WHERE provider_id IN (${b1Ids})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_identity_links t WHERE successor_provider_id IN (${b1Ids})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_regulatory_designations t WHERE provider_id IN (${b1Ids})))),
  'unrelatedProviderHash',${hash(`SELECT * FROM public.providers WHERE id NOT IN (${targetIds})`)},
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
  "organizationNames", "homeSupportOfferings", "b1Providers", "emsFingerprint",
  "nonTargetDomicileFingerprint", "batchAStructureFingerprint", "b1Fingerprint",
  "unrelatedProviderHash", "unrelatedProviderSourceHash", "unrelatedProviderOrganizationHash",
  "unrelatedOfferingHash", "unrelatedFeatureHash", "unrelatedOfferingSourceHash",
  "unrelatedAvailabilityHash", "unrelatedServiceAreaHash"];

function assertCompatibility(before, after) {
  assert.equal(after.providers, before.providers + 8);
  assert.equal(after.providerSources, before.providerSources + 8);
  assert.equal(after.providerOrganizations, before.providerOrganizations + 16);
  assert.equal(after.offerings, before.offerings + 8);
  assert.equal(after.offeringSources, before.offeringSources + 8);
  assert.equal(after.providerIdentityLinks, before.providerIdentityLinks + 8);
  assert.equal(after.regulatoryDesignations, before.regulatoryDesignations + 8);
  assert.equal(after.targetProviders, 8);
  assert.equal(after.b1Providers, 8);
  assert.equal(after.futureCmsProviders, 0);
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
    b1Providers: value.b1Providers, futureCmsProviders: value.futureCmsProviders }, {
    providers: 82, providerSources: 152, providerOrganizations: 64, offerings: 48,
    offeringSources: 69, providerIdentityLinks: 16, regulatoryDesignations: 16,
    targetProviders: 8, b1Providers: 8, futureCmsProviders: 0,
  });
  assert.equal(value.emsFingerprint, "b8756e81599062f1091dc7ee64359653");
  assert.equal(value.nonTargetDomicileFingerprint, "153f50c79913cd0b3f47646cbf82ecb2");
  assert.equal(value.batchAStructureFingerprint, "30c2128ca365168525c9f682821f6530");
  assert.equal(value.b1Fingerprint, "9d7be47cddd130bb995f0137c86a9eb5");
  assert.deepEqual({ provider: value.unrelatedProviderHash,
    providerSource: value.unrelatedProviderSourceHash,
    providerOrganization: value.unrelatedProviderOrganizationHash,
    offering: value.unrelatedOfferingHash, feature: value.unrelatedFeatureHash,
    offeringSource: value.unrelatedOfferingSourceHash,
    availability: value.unrelatedAvailabilityHash, serviceArea: value.unrelatedServiceAreaHash }, {
    provider: "2ce29dc760db9dbe1aaaa3bed562bcd3",
    providerSource: "304d5bfc55cb2f07a479a8da6c9625f8",
    providerOrganization: "11d14e353a5096e92f10c451fe5dedae",
    offering: "1f0212929103b28e9ee0dd7c6a46904b",
    feature: "11265ecdc1e2ddb6dbe9959de7de8138",
    offeringSource: "cacfd08497c6504cfdfe1f242ee0c9ba",
    availability: "d41d8cd98f00b204e9800998ecf8427e",
    serviceArea: "d84e558828159e0331c5ed4771406deb",
  });
}

function main(args) {
  if (args.length === 1 && args[0] === "--check") {
    console.log(JSON.stringify({ mode: "check", subBatch: data.subBatch,
      comparedWithB1: compileBatchB2Apromad().subBatch.netNewRows === 64,
      providers: data.providers.map(({ id, slug, name }) => ({ id, slug, name })) }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === "--dry-run-local") {
    const target = inspectLocalTarget();
    const before = state();
    const result = JSON.parse(runLocalSql(buildBatchB2ApromadApplySql({ rollback: true })).trim());
    assert.deepEqual(state(), before, "B2 dry-run did not restore exact pre-B2 state");
    console.log(JSON.stringify({ mode: "dry-run-local", databaseWrites: 0, target, result,
      preB2: before, rollback: "exact pre-B2 state restored" }, null, 2));
    return;
  }
  if (args.length === 3 && args[0] === "--write-cycle-local" && args[1] === "--confirm"
    && args[2] === LOCAL_CONFIRMATION) {
    const target = inspectLocalTarget();
    const before = state();
    const beforeProjection = projection();
    const applied = JSON.parse(runLocalSql(buildBatchB2ApromadApplySql()).trim());
    const firstApply = state();
    assertCompatibility(before, firstApply);
    assert.deepEqual(projection(), beforeProjection, "Senevita projection changed on apply");
    runLocalSql(buildBatchB2ApromadRollbackSql());
    assert.deepEqual(state(), before, "Committed B2 rollback did not restore exact pre-B2 state");
    assert.deepEqual(projection(), beforeProjection, "Senevita projection changed after rollback");
    const reapplied = JSON.parse(runLocalSql(buildBatchB2ApromadApplySql()).trim());
    const final = state();
    assertCompatibility(before, final);
    assert.deepEqual(projection(), beforeProjection, "Senevita projection changed after reapply");
    console.log(JSON.stringify({ mode: "write-cycle-local", target, applied, firstApply,
      rollback: "exact pre-B2 state restored", reapplied, final, rows: exactRows(),
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
