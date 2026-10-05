import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { buildBatchCApplySql, buildBatchCRollbackSql, compileBatchC }
  from "../lib/phase5f-batch-c-private-organizations.mjs";
import { inspectLocalTarget, LOCAL_CONFIRMATION, runLocalSql }
  from "../lib/local-provider-writer.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { projectReviewedCareDetail } from "../lib/provider-care-projection.js";

const data = compileBatchC();
const ids = data.organizations.map((item) => `'${item.id}'::uuid`).join(",");
const futureSlugs = ["amad-homecare-sa", "amad-homecare-la-cote-sa", "seniorendienste-schweiz-ag",
  "vivradom-sarl", "vivradom-jura-nord-vaudois-sarl", "fondation-beau-sejour",
  "fondation-du-levant", "sciensus-ag", "cpse-alexandra", "altoan-sa"]
  .map((item) => `'${item}'`).join(",");
const stateSql = `SELECT jsonb_build_object(
  'providers',(SELECT count(*) FROM public.providers),
  'providerSources',(SELECT count(*) FROM public.provider_sources),
  'organizations',(SELECT count(*) FROM public.organizations),
  'organizationSources',(SELECT count(*) FROM public.organization_sources),
  'organizationNames',(SELECT count(*) FROM public.organization_names),
  'organizationRelationships',(SELECT count(*) FROM public.organization_relationships),
  'providerOrganizations',(SELECT count(*) FROM public.provider_organizations),
  'offerings',(SELECT count(*) FROM public.care_offerings),
  'offeringSources',(SELECT count(*) FROM public.care_offering_sources),
  'identityLinks',(SELECT count(*) FROM public.provider_identity_links),
  'designations',(SELECT count(*) FROM public.care_offering_regulatory_designations),
  'features',(SELECT count(*) FROM public.care_offering_features),
  'availability',(SELECT count(*) FROM public.care_offering_availability),
  'serviceAreas',(SELECT count(*) FROM public.provider_service_areas),
  'cms',(SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%'),
  'targetOrganizations',(SELECT count(*) FROM public.organizations WHERE id IN (${ids})),
  'futureOrganizations',(SELECT count(*) FROM public.organizations WHERE slug IN (${futureSlugs})),
  'providerDataFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.providers t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offerings t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_features t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_availability t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_service_areas t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_identity_links t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_regulatory_designations t))),
  'cmsFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.providers t WHERE slug LIKE 'cms-%'),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_sources t JOIN public.providers p ON p.id=t.provider_id WHERE p.slug LIKE 'cms-%'),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_organizations t JOIN public.providers p ON p.id=t.provider_id WHERE p.slug LIKE 'cms-%'),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offerings t JOIN public.providers p ON p.id=t.provider_id WHERE p.slug LIKE 'cms-%'))),
  'unrelatedOrganizationFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organizations t WHERE id NOT IN (${ids})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_sources t WHERE organization_id NOT IN (${ids})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_names t WHERE organization_id NOT IN (${ids})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_relationships t WHERE parent_organization_id NOT IN (${ids}) AND member_organization_id NOT IN (${ids})))),
  'emsFingerprint',md5((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id)::text FROM public.providers p WHERE primary_type='ems')),
  'nonTargetDomicileFingerprint',md5((SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb)::text FROM public.providers p WHERE primary_type='domicile' AND slug NOT LIKE 'cms-%'))
);`;

const state = () => JSON.parse(runLocalSql(stateSql).trim());
function projection() {
  const snapshot = JSON.parse(runLocalSql(buildLocalProviderDetailSql("senevita-vaud")).trim());
  const detail = projectReviewedCareDetail(snapshot);
  return { organization:snapshot.organizationLinks[0]?.organization.name,
    offerings:detail?.offerings.length, services:detail?.offerings[0]?.services.length,
    careProfiles:detail?.offerings[0]?.careProfiles.length, coverage:detail?.offerings[0]?.coverage };
}
function exactRows() {
  return JSON.parse(runLocalSql(`SELECT jsonb_build_object(
    'organizations',(SELECT jsonb_agg(jsonb_build_object('slug',slug,'name',name,'legalName',legal_name,'status',status,'published',is_published,'verification',verification_status) ORDER BY slug) FROM public.organizations WHERE id IN (${ids})),
    'sources',(SELECT jsonb_agg(jsonb_build_object('organization',o.slug,'type',s.source_type,'name',s.source_name,'url',s.source_url,'externalRecordId',s.external_record_id,'accessedOn',s.accessed_on,'fieldsSupported',s.fields_supported) ORDER BY o.slug) FROM public.organization_sources s JOIN public.organizations o ON o.id=s.organization_id WHERE o.id IN (${ids})),
    'providerLinks',(SELECT count(*) FROM public.provider_organizations WHERE organization_id IN (${ids})),
    'organizationNames',(SELECT count(*) FROM public.organization_names WHERE organization_id IN (${ids})),
    'organizationRelationships',(SELECT count(*) FROM public.organization_relationships WHERE parent_organization_id IN (${ids}) OR member_organization_id IN (${ids}))
  );`).trim());
}
function assertDelta(before, after) {
  assert.equal(after.organizations, before.organizations + 2);
  assert.equal(after.organizationSources, before.organizationSources + 2);
  assert.equal(after.targetOrganizations, 2);
  for (const key of ["providers","providerSources","organizationNames","organizationRelationships",
    "providerOrganizations","offerings","offeringSources","identityLinks","designations","features",
    "availability","serviceAreas","cms","futureOrganizations","providerDataFingerprint","cmsFingerprint",
    "unrelatedOrganizationFingerprint","emsFingerprint","nonTargetDomicileFingerprint"])
    assert.deepEqual(after[key], before[key], key);
}
function assertFinal(value) {
  assert.deepEqual({providers:value.providers,providerSources:value.providerSources,
    organizations:value.organizations,organizationSources:value.organizationSources,
    organizationNames:value.organizationNames,organizationRelationships:value.organizationRelationships,
    providerOrganizations:value.providerOrganizations,offerings:value.offerings,
    offeringSources:value.offeringSources,identityLinks:value.identityLinks,
    designations:value.designations,features:value.features,availability:value.availability,
    serviceAreas:value.serviceAreas,cms:value.cms,targetOrganizations:value.targetOrganizations,
    futureOrganizations:value.futureOrganizations},
  {providers:116,providerSources:186,organizations:33,organizationSources:11,
    organizationNames:1,organizationRelationships:7,providerOrganizations:133,offerings:82,
    offeringSources:103,identityLinks:50,designations:50,features:84,availability:0,
    serviceAreas:1,cms:50,targetOrganizations:2,futureOrganizations:0});
  assert.equal(value.emsFingerprint, "9e1fd6db294788f35e84d8f44faa0317");
  assert.equal(value.nonTargetDomicileFingerprint, "21202f8e21440773e50abd6f3e2517e7");
}
function main(args) {
  if (args.length===1 && args[0]==="--check") {
    console.log(JSON.stringify({mode:"check",expectedRows:data.expectedRows,
      organizations:data.organizations,organizationSources:data.organizationSources},null,2)); return;
  }
  if (args.length===1 && args[0]==="--dry-run-local") {
    const target=inspectLocalTarget(); const before=state(); const beforeProjection=projection();
    const result=JSON.parse(runLocalSql(buildBatchCApplySql({rollback:true})).trim());
    assert.deepEqual(state(),before); assert.deepEqual(projection(),beforeProjection);
    console.log(JSON.stringify({mode:"dry-run-local",databaseWrites:0,target,result,
      preBatchC:before,rollback:"exact pre-C state restored",senevita:beforeProjection},null,2)); return;
  }
  if (args.length===3 && args[0]==="--write-cycle-local" && args[1]==="--confirm"
      && args[2]===LOCAL_CONFIRMATION) {
    const target=inspectLocalTarget(); const before=state(); const beforeProjection=projection();
    const applied=JSON.parse(runLocalSql(buildBatchCApplySql()).trim());
    const firstApply=state(); assertDelta(before,firstApply); assert.deepEqual(projection(),beforeProjection);
    runLocalSql(buildBatchCRollbackSql()); assert.deepEqual(state(),before);
    assert.deepEqual(projection(),beforeProjection);
    const reapplied=JSON.parse(runLocalSql(buildBatchCApplySql()).trim());
    const final=state(); assertDelta(before,final); assertFinal(final);
    assert.deepEqual(projection(),beforeProjection);
    console.log(JSON.stringify({mode:"write-cycle-local",target,applied,firstApply,
      rollback:"exact pre-C state restored",reapplied,final,rows:exactRows(),
      senevita:beforeProjection},null,2)); return;
  }
  if (args.length===1 && args[0]==="--verify-local") {
    const target=inspectLocalTarget(); const current=state(); assertFinal(current);
    const rows=exactRows(); assert.equal(rows.providerLinks,0); assert.equal(rows.organizationNames,0);
    assert.equal(rows.organizationRelationships,0);
    const senevita=projection(); assert.deepEqual(senevita,{organization:"Senevita AG",offerings:1,
      services:10,careProfiles:1,coverage:["dans la région de Vaud"]});
    console.log(JSON.stringify({mode:"verify-local",databaseWrites:0,target,current,rows,senevita},null,2)); return;
  }
  throw new Error(`Use --check, --dry-run-local, --write-cycle-local --confirm ${LOCAL_CONFIRMATION}, or --verify-local`);
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.stack??error.message); process.exitCode=1; }
}
