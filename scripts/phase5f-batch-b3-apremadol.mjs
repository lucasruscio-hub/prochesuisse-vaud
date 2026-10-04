import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { buildBatchB3ApremadolApplySql, buildBatchB3ApremadolRollbackSql,
  compileBatchB3Apremadol } from "../lib/phase5f-batch-b3-apremadol.mjs";
import { inspectLocalTarget, LOCAL_CONFIRMATION, runLocalSql }
  from "../lib/local-provider-writer.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { projectReviewedCareDetail } from "../lib/provider-care-projection.js";

const data=compileBatchB3Apremadol();
const targetIds=data.providers.map((item)=>`'${item.id}'::uuid`).join(",");
const targetSlugs=data.providers.map((item)=>`'${item.slug}'`).join(",");
const priorSlugs=["cms-ancien-stand","cms-centre-ville","cms-chailly-sallaz","cms-montelly",
  "cms-ouchy","cms-des-peupliers","cms-riponne","cms-valency","cms-cully","cms-echallens",
  "cms-epalinges","cms-du-mont","cms-oron","cms-prilly-nord","cms-prilly-sud","cms-pully"]
  .map((item)=>`'${item}'`).join(",");
const excluded=`${priorSlugs},${targetSlugs}`;
const stateSql=`SELECT jsonb_build_object(
  'providers',(SELECT count(*) FROM public.providers),
  'providerSources',(SELECT count(*) FROM public.provider_sources),
  'providerOrganizations',(SELECT count(*) FROM public.provider_organizations),
  'offerings',(SELECT count(*) FROM public.care_offerings),
  'offeringSources',(SELECT count(*) FROM public.care_offering_sources),
  'identityLinks',(SELECT count(*) FROM public.provider_identity_links),
  'designations',(SELECT count(*) FROM public.care_offering_regulatory_designations),
  'features',(SELECT count(*) FROM public.care_offering_features),
  'availability',(SELECT count(*) FROM public.care_offering_availability),
  'serviceAreas',(SELECT count(*) FROM public.provider_service_areas),
  'targetProviders',(SELECT count(*) FROM public.providers WHERE id IN (${targetIds})),
  'priorCms',(SELECT count(*) FROM public.providers WHERE slug IN (${priorSlugs})),
  'laterCms',(SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%' AND slug NOT IN (${excluded})),
  'emsFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers ep ON ep.id=o.provider_id WHERE ep.primary_type='ems'),
    'features',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.offering_id,f.feature_kind,f.feature_code),'[]'::jsonb) FROM public.care_offering_features f JOIN public.providers ep ON ep.id=f.provider_id WHERE ep.primary_type='ems'),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers ep ON ep.id=a.provider_id WHERE ep.primary_type='ems'))::text FROM public.providers p WHERE p.primary_type='ems')),
  'nonTargetDomicileFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers hp ON hp.id=o.provider_id WHERE hp.primary_type='domicile' AND hp.slug NOT IN ('senevita-vaud','avasad-cms',${excluded})),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers hp ON hp.id=a.provider_id WHERE hp.primary_type='domicile' AND hp.slug NOT IN ('senevita-vaud','avasad-cms',${excluded})))::text FROM public.providers p WHERE p.primary_type='domicile' AND p.slug NOT IN ('senevita-vaud','avasad-cms',${excluded}))),
  'batchAStructureFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_relationships t),
    (SELECT to_jsonb(p)::text FROM public.providers p WHERE p.slug='avasad-cms'),
    (SELECT coalesce(string_agg(to_jsonb(s)::text,E'\\n' ORDER BY to_jsonb(s)::text),'') FROM public.provider_sources s JOIN public.providers p ON p.id=s.provider_id WHERE p.slug='avasad-cms'))),
  'priorCmsFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.providers t WHERE slug IN (${priorSlugs})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_sources t JOIN public.providers p ON p.id=t.provider_id WHERE p.slug IN (${priorSlugs})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_organizations t JOIN public.providers p ON p.id=t.provider_id WHERE p.slug IN (${priorSlugs})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offerings t JOIN public.providers p ON p.id=t.provider_id WHERE p.slug IN (${priorSlugs})))),
  'unrelatedFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.providers t WHERE id NOT IN (${targetIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_sources t WHERE provider_id NOT IN (${targetIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_organizations t WHERE provider_id NOT IN (${targetIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offerings t WHERE provider_id NOT IN (${targetIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_features t WHERE provider_id NOT IN (${targetIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_sources t WHERE provider_id NOT IN (${targetIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_service_areas t WHERE provider_id NOT IN (${targetIds}))))
);`;
const state=()=>JSON.parse(runLocalSql(stateSql).trim());
function projection(){const snapshot=JSON.parse(runLocalSql(buildLocalProviderDetailSql("senevita-vaud")).trim());
  const detail=projectReviewedCareDetail(snapshot);return {organization:snapshot.organizationLinks[0]?.organization.name,
    offerings:detail?.offerings.length,services:detail?.offerings[0]?.services.length,
    careProfiles:detail?.offerings[0]?.careProfiles.length,coverage:detail?.offerings[0]?.coverage};}
function assertDelta(before,after){
  for(const [key,delta] of Object.entries({providers:4,providerSources:4,providerOrganizations:8,
    offerings:4,offeringSources:4,identityLinks:4,designations:4})) assert.equal(after[key],before[key]+delta,key);
  assert.equal(after.targetProviders,4);assert.equal(after.priorCms,16);assert.equal(after.laterCms,0);
  for(const key of ["features","availability","serviceAreas","emsFingerprint","nonTargetDomicileFingerprint",
    "batchAStructureFingerprint","priorCmsFingerprint","unrelatedFingerprint"]) assert.deepEqual(after[key],before[key],key);
}
function exactRows(){return JSON.parse(runLocalSql(`SELECT jsonb_build_object(
  'providers',(SELECT jsonb_agg(jsonb_build_object('slug',p.slug,'name',p.name,'published',p.is_published,'verification',p.verification_status) ORDER BY p.name) FROM public.providers p WHERE p.id IN (${targetIds})),
  'links',(SELECT jsonb_agg(jsonb_build_object('provider',p.slug,'organization',o.slug,'type',po.relationship_type,'primary',po.is_primary) ORDER BY p.slug,o.slug) FROM public.provider_organizations po JOIN public.providers p ON p.id=po.provider_id JOIN public.organizations o ON o.id=po.organization_id WHERE p.id IN (${targetIds})),
  'offerings',(SELECT count(*) FROM public.care_offerings WHERE provider_id IN (${targetIds})),
  'providerEvidence',(SELECT count(*) FROM public.provider_sources WHERE provider_id IN (${targetIds})),
  'offeringEvidence',(SELECT count(*) FROM public.care_offering_sources WHERE provider_id IN (${targetIds})),
  'splitLinks',(SELECT count(*) FROM public.provider_identity_links WHERE successor_provider_id IN (${targetIds})),
  'designations',(SELECT count(*) FROM public.care_offering_regulatory_designations WHERE provider_id IN (${targetIds})));
`).trim());}
function assertFinal(value){assert.deepEqual({providers:value.providers,sources:value.providerSources,
  links:value.providerOrganizations,offerings:value.offerings,offeringSources:value.offeringSources,
  identity:value.identityLinks,designations:value.designations,target:value.targetProviders,
  prior:value.priorCms,later:value.laterCms},{providers:86,sources:156,links:72,offerings:52,
  offeringSources:73,identity:20,designations:20,target:4,prior:16,later:0});
  assert.equal(value.emsFingerprint,"b8756e81599062f1091dc7ee64359653");
  assert.equal(value.nonTargetDomicileFingerprint,"153f50c79913cd0b3f47646cbf82ecb2");}
function main(args){
  if(args.length===1&&args[0]==="--check"){console.log(JSON.stringify({mode:"check",batch:data.batch,
    providers:data.providers.map(({id,slug,name})=>({id,slug,name}))},null,2));return;}
  if(args.length===1&&args[0]==="--dry-run-local"){const target=inspectLocalTarget();const before=state();
    const result=JSON.parse(runLocalSql(buildBatchB3ApremadolApplySql({rollback:true})).trim());
    assert.deepEqual(state(),before);console.log(JSON.stringify({mode:"dry-run-local",databaseWrites:0,target,
      result,preB3:before,rollback:"exact pre-B3 state restored"},null,2));return;}
  if(args.length===3&&args[0]==="--write-cycle-local"&&args[1]==="--confirm"&&args[2]===LOCAL_CONFIRMATION){
    const target=inspectLocalTarget();const before=state();const beforeProjection=projection();
    const applied=JSON.parse(runLocalSql(buildBatchB3ApremadolApplySql()).trim());const firstApply=state();
    assertDelta(before,firstApply);assert.deepEqual(projection(),beforeProjection);
    runLocalSql(buildBatchB3ApremadolRollbackSql());assert.deepEqual(state(),before);
    assert.deepEqual(projection(),beforeProjection);const reapplied=JSON.parse(runLocalSql(buildBatchB3ApremadolApplySql()).trim());
    const final=state();assertDelta(before,final);assert.deepEqual(projection(),beforeProjection);
    console.log(JSON.stringify({mode:"write-cycle-local",target,applied,firstApply,
      rollback:"exact pre-B3 state restored",reapplied,final,rows:exactRows(),senevita:beforeProjection},null,2));return;}
  if(args.length===1&&args[0]==="--verify-local"){const target=inspectLocalTarget();const current=state();assertFinal(current);
    const senevita=projection();assert.deepEqual(senevita,{organization:"Senevita AG",offerings:1,services:10,
      careProfiles:1,coverage:["dans la région de Vaud"]});console.log(JSON.stringify({mode:"verify-local",
      databaseWrites:0,target,current,rows:exactRows(),senevita},null,2));return;}
  throw new Error(`Use --check, --dry-run-local, --write-cycle-local --confirm ${LOCAL_CONFIRMATION}, or --verify-local`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main(process.argv.slice(2));}
  catch(error){console.error(error.stack??error.message);process.exitCode=1;}}
