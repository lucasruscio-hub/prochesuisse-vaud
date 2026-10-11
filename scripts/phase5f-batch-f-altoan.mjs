import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { buildBatchFApplySql, buildBatchFRollbackSql, compileBatchF } from "../lib/phase5f-batch-f-altoan.mjs";
import { inspectLocalTarget, LOCAL_CONFIRMATION, runLocalSql } from "../lib/local-provider-writer.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { projectReviewedCareDetail } from "../lib/provider-care-projection.js";

const data = compileBatchF();
const providerId = `'${data.provider.id}'::uuid`;
const organizationId = `'${data.organization.id}'::uuid`;
const fingerprint = (table, where = "") => `(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'')) FROM public.${table} t ${where})`;

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
  'providerNames',(SELECT count(*) FROM public.provider_names),
  'identityLinks',(SELECT count(*) FROM public.provider_identity_links),
  'designations',(SELECT count(*) FROM public.care_offering_regulatory_designations),
  'features',(SELECT count(*) FROM public.care_offering_features),
  'availability',(SELECT count(*) FROM public.care_offering_availability),
  'serviceAreas',(SELECT count(*) FROM public.provider_service_areas),
  'cms',(SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%'),
  'targetProviders',(SELECT count(*) FROM public.providers WHERE id = ${providerId}),
  'targetOrganizations',(SELECT count(*) FROM public.organizations WHERE id = ${organizationId}),
  'homeSupport',(SELECT count(*) FROM public.care_offerings WHERE offering_type = 'home_support'),
  'held',(SELECT count(*) FROM public.providers WHERE slug IN ('amad-homecare-yverdon','sciensus-home-therapy','cp-alexandra','nurse-home-care','soinvaud-provider')),
  'allFingerprint',md5(concat_ws('|',
    ${fingerprint("providers")},${fingerprint("provider_sources")},${fingerprint("organizations")},${fingerprint("organization_sources")},
    ${fingerprint("organization_names")},${fingerprint("organization_relationships")},${fingerprint("provider_organizations")},
    ${fingerprint("care_offerings")},${fingerprint("care_offering_sources")},${fingerprint("care_offering_features")},
    ${fingerprint("care_offering_availability")},${fingerprint("provider_service_areas")},${fingerprint("provider_names")},
    ${fingerprint("provider_identity_links")},${fingerprint("care_offering_regulatory_designations")})),
  'nonTargetFingerprint',md5(concat_ws('|',
    ${fingerprint("providers",`WHERE t.id <> ${providerId}`)},
    ${fingerprint("provider_sources",`WHERE t.provider_id <> ${providerId}`)},
    ${fingerprint("organizations",`WHERE t.id <> ${organizationId}`)},
    ${fingerprint("organization_sources",`WHERE t.organization_id <> ${organizationId}`)},
    ${fingerprint("provider_organizations",`WHERE t.provider_id <> ${providerId}`)},
    ${fingerprint("care_offerings",`WHERE t.provider_id <> ${providerId}`)},
    ${fingerprint("care_offering_sources",`WHERE t.provider_id <> ${providerId}`)},
    ${fingerprint("provider_service_areas",`WHERE t.provider_id <> ${providerId}`)})),
  'cmsFingerprint',md5(concat_ws('|',
    ${fingerprint("providers","WHERE t.slug LIKE 'cms-%'")},
    (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,E'\\n' ORDER BY to_jsonb(s)::text),'')) FROM public.provider_sources s JOIN public.providers p ON p.id=s.provider_id WHERE p.slug LIKE 'cms-%'),
    (SELECT md5(coalesce(string_agg(to_jsonb(x)::text,E'\\n' ORDER BY to_jsonb(x)::text),'')) FROM public.provider_organizations x JOIN public.providers p ON p.id=x.provider_id WHERE p.slug LIKE 'cms-%'),
    (SELECT md5(coalesce(string_agg(to_jsonb(o)::text,E'\\n' ORDER BY to_jsonb(o)::text),'')) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.slug LIKE 'cms-%'))),
  'emsFingerprint',md5(concat_ws('|',
    ${fingerprint("providers","WHERE t.primary_type = 'ems'")},
    (SELECT md5(coalesce(string_agg(to_jsonb(o)::text,E'\\n' ORDER BY to_jsonb(o)::text),'')) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.primary_type='ems'),
    (SELECT md5(coalesce(string_agg(to_jsonb(f)::text,E'\\n' ORDER BY to_jsonb(f)::text),'')) FROM public.care_offering_features f JOIN public.providers p ON p.id=f.provider_id WHERE p.primary_type='ems'),
    (SELECT md5(coalesce(string_agg(to_jsonb(a)::text,E'\\n' ORDER BY to_jsonb(a)::text),'')) FROM public.provider_service_areas a JOIN public.providers p ON p.id=a.provider_id WHERE p.primary_type='ems'))),
  'batchDFingerprint',md5(concat_ws('|',
    (SELECT md5(coalesce(string_agg(to_jsonb(p)::text,E'\\n' ORDER BY p.id),'')) FROM public.providers p WHERE p.slug IN ('amad-homecare-lutry','amad-homecare-nyon','vivradom-renens','vivradom-orbe','dovida','homeinstead')),
    (SELECT md5(coalesce(string_agg(to_jsonb(o)::text,E'\\n' ORDER BY o.id),'')) FROM public.organizations o WHERE o.slug IN ('amad-homecare-sa','amad-homecare-la-cote-sa','vivradom-sarl','vivradom-jura-nord-vaudois-sarl','seniorendienste-schweiz-ag')),
    (SELECT md5(coalesce(string_agg(to_jsonb(x)::text,E'\\n' ORDER BY x.provider_id,x.organization_id),'')) FROM public.provider_organizations x JOIN public.providers p ON p.id=x.provider_id WHERE p.slug IN ('amad-homecare-lutry','amad-homecare-nyon','vivradom-renens','vivradom-orbe','dovida','homeinstead')),
    (SELECT md5(coalesce(string_agg(to_jsonb(o)::text,E'\\n' ORDER BY o.id),'')) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.slug IN ('amad-homecare-lutry','amad-homecare-nyon','vivradom-renens','vivradom-orbe','dovida','homeinstead')))),
  'batchEFingerprint',md5(concat_ws('|',
    (SELECT md5(coalesce(string_agg(to_jsonb(p)::text,E'\\n' ORDER BY p.id),'')) FROM public.providers p WHERE p.slug IN ('osad-beau-sejour','samsa-levant')),
    (SELECT md5(coalesce(string_agg(to_jsonb(o)::text,E'\\n' ORDER BY o.id),'')) FROM public.organizations o WHERE o.slug IN ('fondation-beau-sejour','fondation-du-levant','sciensus-ag','cpse-alexandra')),
    (SELECT md5(coalesce(string_agg(to_jsonb(n)::text,E'\\n' ORDER BY n.id),'')) FROM public.provider_names n JOIN public.providers p ON p.id=n.provider_id WHERE p.slug IN ('osad-beau-sejour','samsa-levant')),
    (SELECT md5(coalesce(string_agg(to_jsonb(d)::text,E'\\n' ORDER BY d.id),'')) FROM public.care_offering_regulatory_designations d JOIN public.providers p ON p.id=d.provider_id WHERE p.slug IN ('osad-beau-sejour','samsa-levant')),
    (SELECT md5(coalesce(string_agg(to_jsonb(a)::text,E'\\n' ORDER BY a.id),'')) FROM public.provider_service_areas a JOIN public.providers p ON p.id=a.provider_id WHERE p.slug IN ('osad-beau-sejour','samsa-levant'))))
)`;

const state = () => JSON.parse(runLocalSql(stateSql).trim());
function senevita() {
  const raw = JSON.parse(runLocalSql(buildLocalProviderDetailSql("senevita-vaud")).trim());
  const projected = projectReviewedCareDetail(raw);
  return { organization: raw.organizationLinks[0]?.organization.name, offerings: projected?.offerings.length, services: projected?.offerings[0]?.services.length, careProfiles: projected?.offerings[0]?.careProfiles.length, coverage: projected?.offerings[0]?.coverage };
}
function assertDelta(before, after) {
  for (const [key, delta] of Object.entries({ providers: 1, providerSources: 1, organizations: 1, organizationSources: 1, providerOrganizations: 1, offerings: 1, offeringSources: 1, serviceAreas: 1, targetProviders: 1, targetOrganizations: 1, homeSupport: 1 })) assert.equal(after[key], before[key] + delta, key);
  for (const key of ["organizationNames","organizationRelationships","providerNames","identityLinks","designations","features","availability","cms","held","nonTargetFingerprint","cmsFingerprint","emsFingerprint","batchDFingerprint","batchEFingerprint"]) assert.deepEqual(after[key], before[key], key);
}
function exactRows() {
  return JSON.parse(runLocalSql(`SELECT jsonb_build_object(
    'provider',(SELECT to_jsonb(p) FROM public.providers p WHERE id=${providerId}),
    'organization',(SELECT to_jsonb(o) FROM public.organizations o WHERE id=${organizationId}),
    'operatorLinks',(SELECT count(*) FROM public.provider_organizations WHERE provider_id=${providerId}),
    'offering',(SELECT jsonb_build_object('name',name,'type',offering_type,'summary',summary,'published',is_published,'verification',verification_status,'capacity',capacity_value,'financing',financing_notes,'pricing',pricing_notes) FROM public.care_offerings WHERE provider_id=${providerId}),
    'serviceArea',(SELECT jsonb_build_object('type',coverage_type,'country',country_code,'canton',canton_code,'municipality',municipality_id,'label',coverage_label) FROM public.provider_service_areas WHERE provider_id=${providerId}),
    'designations',(SELECT count(*) FROM public.care_offering_regulatory_designations WHERE provider_id=${providerId}),
    'features',(SELECT count(*) FROM public.care_offering_features WHERE provider_id=${providerId}),
    'availability',(SELECT count(*) FROM public.care_offering_availability WHERE provider_id=${providerId})
  )`).trim());
}

function main(args) {
  if (args.length === 1 && args[0] === "--check") {
    console.log(JSON.stringify({ mode: "check", expectedRows: data.expectedRows, identity: { organization: data.organization.name, provider: data.provider.name }, offeringType: data.offering.offering_type, serviceArea: data.serviceArea }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === "--dry-run-local") {
    const target = inspectLocalTarget(); const before = state(); const senevitaBefore = senevita();
    const result = JSON.parse(runLocalSql(buildBatchFApplySql({ rollback: true })).trim());
    assert.deepEqual(state(), before); assert.deepEqual(senevita(), senevitaBefore);
    console.log(JSON.stringify({ mode: "dry-run-local", databaseWrites: 0, target, result, before, rollback: "exact pre-F state restored", senevita: senevitaBefore }, null, 2));
    return;
  }
  if (args.length === 3 && args[0] === "--write-cycle-local" && args[1] === "--confirm" && args[2] === LOCAL_CONFIRMATION) {
    const target = inspectLocalTarget(); const before = state(); const senevitaBefore = senevita();
    const applied = JSON.parse(runLocalSql(buildBatchFApplySql()).trim()); const first = state();
    assertDelta(before, first); assert.deepEqual(senevita(), senevitaBefore);
    runLocalSql(buildBatchFRollbackSql()); assert.deepEqual(state(), before); assert.deepEqual(senevita(), senevitaBefore);
    const reapplied = JSON.parse(runLocalSql(buildBatchFApplySql()).trim()); const final = state();
    assertDelta(before, final); assert.deepEqual(senevita(), senevitaBefore);
    console.log(JSON.stringify({ mode: "write-cycle-local", target, applied, first, rollback: "exact pre-F state restored", reapplied, final, rows: exactRows(), senevita: senevitaBefore }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === "--verify-local") {
    const target = inspectLocalTarget(); const current = state();
    assert.deepEqual({ providers:current.providers,providerSources:current.providerSources,organizations:current.organizations,organizationSources:current.organizationSources,organizationNames:current.organizationNames,providerOrganizations:current.providerOrganizations,offerings:current.offerings,offeringSources:current.offeringSources,providerNames:current.providerNames,identityLinks:current.identityLinks,designations:current.designations,features:current.features,availability:current.availability,serviceAreas:current.serviceAreas,cms:current.cms,targetProviders:current.targetProviders,targetOrganizations:current.targetOrganizations,homeSupport:current.homeSupport,held:current.held }, { providers:123,providerSources:195,organizations:43,organizationSources:21,organizationNames:4,providerOrganizations:141,offerings:90,offeringSources:111,providerNames:3,identityLinks:51,designations:56,features:84,availability:0,serviceAreas:4,cms:50,targetProviders:1,targetOrganizations:1,homeSupport:1,held:0 });
    console.log(JSON.stringify({ mode: "verify-local", databaseWrites: 0, target, current, rows: exactRows(), senevita: senevita() }, null, 2));
    return;
  }
  throw new Error(`Use --check, --dry-run-local, --write-cycle-local --confirm ${LOCAL_CONFIRMATION}, or --verify-local`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.stack ?? error.message); process.exitCode = 1; }
}
