import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { buildPoleSantePrerequisiteApplySql, buildPoleSantePrerequisiteRollbackSql,
  compilePoleSantePrerequisite } from "../lib/phase5f-b4-pole-sante-prerequisite.mjs";
import { inspectLocalTarget, LOCAL_CONFIRMATION, runLocalSql }
  from "../lib/local-provider-writer.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { projectReviewedCareDetail } from "../lib/provider-care-projection.js";

const data = compilePoleSantePrerequisite();
const orgId = `'${data.organization.id}'::uuid`;
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
  'targetOrganization',(SELECT count(*) FROM public.organizations WHERE id=${orgId}),
  'providerDataFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.providers t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offerings t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_features t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_service_areas t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_identity_links t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_regulatory_designations t))),
  'unrelatedOrganizationFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organizations t WHERE id<>${orgId}),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_sources t WHERE organization_id<>${orgId}),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_names t WHERE organization_id<>${orgId}),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_relationships t WHERE parent_organization_id<>${orgId} AND member_organization_id<>${orgId}))),
  'emsFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers ep ON ep.id=o.provider_id WHERE ep.primary_type='ems'),
    'features',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.offering_id,f.feature_kind,f.feature_code),'[]'::jsonb) FROM public.care_offering_features f JOIN public.providers ep ON ep.id=f.provider_id WHERE ep.primary_type='ems'),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers ep ON ep.id=a.provider_id WHERE ep.primary_type='ems'))::text FROM public.providers p WHERE p.primary_type='ems')),
  'nonTargetDomicileFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers hp ON hp.id=o.provider_id WHERE hp.primary_type='domicile' AND hp.slug NOT LIKE 'cms-%'),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers hp ON hp.id=a.provider_id WHERE hp.primary_type='domicile' AND hp.slug NOT LIKE 'cms-%'))::text FROM public.providers p WHERE p.primary_type='domicile' AND p.slug NOT LIKE 'cms-%'))
);`;

const state = () => JSON.parse(runLocalSql(stateSql).trim());
function projection() {
  const snapshot = JSON.parse(runLocalSql(buildLocalProviderDetailSql("senevita-vaud")).trim());
  const detail = projectReviewedCareDetail(snapshot);
  return { organization: snapshot.organizationLinks[0]?.organization.name,
    offerings: detail?.offerings.length, services: detail?.offerings[0]?.services.length,
    careProfiles: detail?.offerings[0]?.careProfiles.length, coverage: detail?.offerings[0]?.coverage };
}
function exactRows() {
  return JSON.parse(runLocalSql(`SELECT jsonb_build_object(
    'organization',(SELECT to_jsonb(o) FROM public.organizations o WHERE o.id=${orgId}),
    'organizationSources',(SELECT count(*) FROM public.organization_sources WHERE organization_id=${orgId}),
    'organizationNames',(SELECT jsonb_agg(jsonb_build_object('name',name,'type',name_type,'published',is_published)) FROM public.organization_names WHERE organization_id=${orgId}),
    'providerLinks',(SELECT count(*) FROM public.provider_organizations WHERE organization_id=${orgId}));`).trim());
}
function assertDelta(before, after) {
  assert.equal(after.organizations, before.organizations + 1);
  assert.equal(after.organizationSources, before.organizationSources + 1);
  assert.equal(after.organizationNames, before.organizationNames + 1);
  assert.equal(after.targetOrganization, 1);
  for (const key of ["providers","providerSources","organizationRelationships","providerOrganizations",
    "offerings","offeringSources","identityLinks","designations","features","availability",
    "serviceAreas","cms","providerDataFingerprint","unrelatedOrganizationFingerprint","emsFingerprint",
    "nonTargetDomicileFingerprint"]) assert.deepEqual(after[key], before[key], key);
}
function assertFinal(value) {
  assert.deepEqual({ providers:value.providers,organizations:value.organizations,
    organizationSources:value.organizationSources,organizationNames:value.organizationNames,
    cms:value.cms,target:value.targetOrganization },
  { providers:86,organizations:31,organizationSources:9,organizationNames:1,cms:20,target:1 });
  assert.equal(value.emsFingerprint, "b8756e81599062f1091dc7ee64359653");
}
function main(args) {
  if (args.length===1 && args[0]==="--check") {
    console.log(JSON.stringify({ mode:"check",expectedRows:data.expectedRows,
      organization:data.organization,organizationName:data.organizationName },null,2)); return;
  }
  if (args.length===1 && args[0]==="--dry-run-local") {
    const target=inspectLocalTarget(); const before=state();
    const result=JSON.parse(runLocalSql(buildPoleSantePrerequisiteApplySql({rollback:true})).trim());
    assert.deepEqual(state(),before);
    console.log(JSON.stringify({mode:"dry-run-local",databaseWrites:0,target,result,
      prePrerequisite:before,rollback:"exact pre-prerequisite state restored"},null,2)); return;
  }
  if (args.length===3 && args[0]==="--write-cycle-local" && args[1]==="--confirm"
      && args[2]===LOCAL_CONFIRMATION) {
    const target=inspectLocalTarget(); const before=state(); const beforeProjection=projection();
    const applied=JSON.parse(runLocalSql(buildPoleSantePrerequisiteApplySql()).trim());
    const firstApply=state(); assertDelta(before,firstApply); assert.deepEqual(projection(),beforeProjection);
    runLocalSql(buildPoleSantePrerequisiteRollbackSql()); assert.deepEqual(state(),before);
    assert.deepEqual(projection(),beforeProjection);
    const reapplied=JSON.parse(runLocalSql(buildPoleSantePrerequisiteApplySql()).trim());
    const final=state(); assertDelta(before,final); assert.deepEqual(projection(),beforeProjection);
    console.log(JSON.stringify({mode:"write-cycle-local",target,applied,firstApply,
      rollback:"exact pre-prerequisite state restored",reapplied,final,rows:exactRows(),
      senevita:beforeProjection},null,2)); return;
  }
  if (args.length===1 && args[0]==="--verify-local") {
    const target=inspectLocalTarget(); const current=state(); assertFinal(current);
    const senevita=projection(); assert.deepEqual(senevita,{organization:"Senevita AG",offerings:1,
      services:10,careProfiles:1,coverage:["dans la région de Vaud"]});
    console.log(JSON.stringify({mode:"verify-local",databaseWrites:0,target,current,
      rows:exactRows(),senevita},null,2)); return;
  }
  throw new Error(`Use --check, --dry-run-local, --write-cycle-local --confirm ${LOCAL_CONFIRMATION}, or --verify-local`);
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.stack??error.message); process.exitCode=1; }
}
