import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  buildPrivateHomeCareApplySql,
  buildPrivateHomeCareRollbackSql,
  compilePrivateHomeCareCompleteness,
} from "../lib/vaud-v1-private-home-care-completeness.mjs";
import { inspectLocalTarget, LOCAL_CONFIRMATION, runLocalSql } from "../lib/local-provider-writer.mjs";

const data = compilePrivateHomeCareCompleteness();
const providerIds = data.providers.map(({ id }) => `'${id}'::uuid`).join(",");
const organizationIds = data.organizations.map(({ id }) => `'${id}'::uuid`).join(",");
const fingerprint = (table, where = "") => `(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'')) FROM public.${table} t ${where})`;
const relatedFingerprint = (providerWhere, organizationWhere = "FALSE") => `md5(concat_ws('|',
  ${fingerprint("providers", `WHERE ${providerWhere}`)},
  (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,E'\\n' ORDER BY to_jsonb(s)::text),'')) FROM public.provider_sources s JOIN public.providers p ON p.id=s.provider_id WHERE ${providerWhere.replaceAll("t.", "p.")}),
  (SELECT md5(coalesce(string_agg(to_jsonb(n)::text,E'\\n' ORDER BY to_jsonb(n)::text),'')) FROM public.provider_names n JOIN public.providers p ON p.id=n.provider_id WHERE ${providerWhere.replaceAll("t.", "p.")}),
  (SELECT md5(coalesce(string_agg(to_jsonb(x)::text,E'\\n' ORDER BY to_jsonb(x)::text),'')) FROM public.provider_organizations x JOIN public.providers p ON p.id=x.provider_id WHERE ${providerWhere.replaceAll("t.", "p.")}),
  (SELECT md5(coalesce(string_agg(to_jsonb(o)::text,E'\\n' ORDER BY to_jsonb(o)::text),'')) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE ${providerWhere.replaceAll("t.", "p.")}),
  (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,E'\\n' ORDER BY to_jsonb(s)::text),'')) FROM public.care_offering_sources s JOIN public.providers p ON p.id=s.provider_id WHERE ${providerWhere.replaceAll("t.", "p.")}),
  (SELECT md5(coalesce(string_agg(to_jsonb(d)::text,E'\\n' ORDER BY to_jsonb(d)::text),'')) FROM public.care_offering_regulatory_designations d JOIN public.providers p ON p.id=d.provider_id WHERE ${providerWhere.replaceAll("t.", "p.")}),
  (SELECT md5(coalesce(string_agg(to_jsonb(f)::text,E'\\n' ORDER BY to_jsonb(f)::text),'')) FROM public.care_offering_features f JOIN public.providers p ON p.id=f.provider_id WHERE ${providerWhere.replaceAll("t.", "p.")}),
  (SELECT md5(coalesce(string_agg(to_jsonb(a)::text,E'\\n' ORDER BY to_jsonb(a)::text),'')) FROM public.provider_service_areas a JOIN public.providers p ON p.id=a.provider_id WHERE ${providerWhere.replaceAll("t.", "p.")}),
  ${fingerprint("organizations", `WHERE ${organizationWhere}`)},
  (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,E'\\n' ORDER BY to_jsonb(s)::text),'')) FROM public.organization_sources s JOIN public.organizations o ON o.id=s.organization_id WHERE ${organizationWhere.replaceAll("t.", "o.")}),
  (SELECT md5(coalesce(string_agg(to_jsonb(n)::text,E'\\n' ORDER BY to_jsonb(n)::text),'')) FROM public.organization_names n JOIN public.organizations o ON o.id=n.organization_id WHERE ${organizationWhere.replaceAll("t.", "o.")})
))`;

const allFingerprint = `md5(concat_ws('|',
  ${fingerprint("providers")},${fingerprint("provider_sources")},${fingerprint("organizations")},
  ${fingerprint("organization_sources")},${fingerprint("organization_names")},${fingerprint("organization_relationships")},
  ${fingerprint("provider_names")},${fingerprint("provider_identity_links")},${fingerprint("provider_organizations")},
  ${fingerprint("care_offerings")},${fingerprint("care_offering_sources")},${fingerprint("care_offering_regulatory_designations")},
  ${fingerprint("care_offering_features")},${fingerprint("care_offering_availability")},${fingerprint("provider_service_areas")}
))`;

const heldSlugs = [
  "amad-homecare-yverdon", "sciensus-home-therapy", "cp-alexandra", "nurse-home-care", "soinvaud-provider",
  "vitadomo", "senior-plus", "pro-senectute", "alterum", "aide-familiale-morges",
];
const stateSql = `SELECT jsonb_build_object(
  'providers',(SELECT count(*) FROM public.providers),
  'providerSources',(SELECT count(*) FROM public.provider_sources),
  'organizations',(SELECT count(*) FROM public.organizations),
  'organizationSources',(SELECT count(*) FROM public.organization_sources),
  'organizationNames',(SELECT count(*) FROM public.organization_names),
  'organizationRelationships',(SELECT count(*) FROM public.organization_relationships),
  'providerNames',(SELECT count(*) FROM public.provider_names),
  'identityLinks',(SELECT count(*) FROM public.provider_identity_links),
  'providerOrganizations',(SELECT count(*) FROM public.provider_organizations),
  'offerings',(SELECT count(*) FROM public.care_offerings),
  'offeringSources',(SELECT count(*) FROM public.care_offering_sources),
  'designations',(SELECT count(*) FROM public.care_offering_regulatory_designations),
  'features',(SELECT count(*) FROM public.care_offering_features),
  'availability',(SELECT count(*) FROM public.care_offering_availability),
  'serviceAreas',(SELECT count(*) FROM public.provider_service_areas),
  'cms',(SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%'),
  'homeSupport',(SELECT count(*) FROM public.care_offerings WHERE offering_type='home_support'),
  'targetProviders',(SELECT count(*) FROM public.providers WHERE id IN (${providerIds})),
  'targetOrganizations',(SELECT count(*) FROM public.organizations WHERE id IN (${organizationIds})),
  'targetOfferings',(SELECT count(*) FROM public.care_offerings WHERE provider_id IN (${providerIds})),
  'targetDesignations',(SELECT count(*) FROM public.care_offering_regulatory_designations WHERE provider_id IN (${providerIds})),
  'targetProviderNames',(SELECT count(*) FROM public.provider_names WHERE provider_id IN (${providerIds})),
  'targetServiceAreas',(SELECT count(*) FROM public.provider_service_areas WHERE provider_id IN (${providerIds})),
  'targetFeatures',(SELECT count(*) FROM public.care_offering_features WHERE provider_id IN (${providerIds})),
  'targetAvailability',(SELECT count(*) FROM public.care_offering_availability WHERE provider_id IN (${providerIds})),
  'allFingerprint',${allFingerprint},
  'nonTargetFingerprint',${relatedFingerprint(`t.id NOT IN (${providerIds})`, `t.id NOT IN (${organizationIds})`)},
  'cmsFingerprint',${relatedFingerprint("t.slug LIKE 'cms-%'")},
  'emsFingerprint',${relatedFingerprint("t.primary_type='ems'")},
  'senevitaFingerprint',${relatedFingerprint("t.slug='senevita-vaud'", "t.slug='senevita-ag'")},
  'batchDFingerprint',${relatedFingerprint("t.slug IN ('amad-homecare-lutry','amad-homecare-nyon','vivradom-renens','vivradom-orbe','dovida','homeinstead')", "t.slug IN ('amad-homecare-sa','amad-homecare-la-cote-sa','vivradom-sarl','vivradom-jura-nord-vaudois-sarl','seniorendienste-schweiz-ag')")},
  'batchEFingerprint',${relatedFingerprint("t.slug IN ('osad-beau-sejour','samsa-levant')", "t.slug IN ('fondation-beau-sejour','fondation-du-levant','sciensus-ag','cpse-alexandra')")},
  'altoanFingerprint',${relatedFingerprint("t.slug='altoan'", "t.slug='altoan-sa'")},
  'heldFingerprint',${relatedFingerprint(`t.slug IN (${heldSlugs.map((slug) => `'${slug}'`).join(",")})`)},
  'heldCount',(SELECT count(*) FROM public.providers WHERE slug IN (${heldSlugs.map((slug) => `'${slug}'`).join(",")}))
)`;

const state = () => JSON.parse(runLocalSql(stateSql).trim());
const invariantKeys = [
  "organizationNames", "organizationRelationships", "identityLinks", "features", "availability", "serviceAreas",
  "cms", "homeSupport", "targetServiceAreas", "targetFeatures", "targetAvailability", "nonTargetFingerprint",
  "cmsFingerprint", "emsFingerprint", "senevitaFingerprint", "batchDFingerprint", "batchEFingerprint",
  "altoanFingerprint", "heldFingerprint", "heldCount",
];

function assertDelta(before, after) {
  const deltas = {
    providers: 14, providerSources: 16, organizations: 16, organizationSources: 16, providerNames: 2,
    providerOrganizations: 16, offerings: 16, offeringSources: 16, designations: 16,
    targetProviders: 14, targetOrganizations: 16, targetOfferings: 16, targetDesignations: 16, targetProviderNames: 2,
  };
  for (const [key, delta] of Object.entries(deltas)) assert.equal(after[key], before[key] + delta, key);
  for (const key of invariantKeys) assert.deepEqual(after[key], before[key], key);
}

function exactRows() {
  return JSON.parse(runLocalSql(`SELECT jsonb_build_object(
    'providers',(SELECT jsonb_agg(jsonb_build_object('slug',p.slug,'name',p.name,'published',p.is_published,'verification',p.verification_status,'canton',p.canton_code,'municipality',p.municipality_id,'services',cardinality(p.service_codes),'languages',cardinality(p.language_codes)) ORDER BY p.slug) FROM public.providers p WHERE p.id IN (${providerIds})),
    'organizations',(SELECT jsonb_agg(jsonb_build_object('slug',o.slug,'name',o.name,'legalName',o.legal_name,'published',o.is_published,'verification',o.verification_status) ORDER BY o.slug) FROM public.organizations o WHERE o.id IN (${organizationIds})),
    'offerings',(SELECT count(*) FROM public.care_offerings WHERE provider_id IN (${providerIds}) AND offering_type='home_care' AND NOT is_published AND verification_status='unverified'),
    'designations',(SELECT count(*) FROM public.care_offering_regulatory_designations WHERE provider_id IN (${providerIds}) AND scheme='vd_osad_official_list' AND observed_on=DATE '2026-03-02' AND NOT is_published),
    'aliases',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.name,'type',n.name_type) ORDER BY n.name),'[]') FROM public.provider_names n WHERE n.provider_id IN (${providerIds})),
    'serviceAreas',(SELECT count(*) FROM public.provider_service_areas WHERE provider_id IN (${providerIds})),
    'features',(SELECT count(*) FROM public.care_offering_features WHERE provider_id IN (${providerIds})),
    'availability',(SELECT count(*) FROM public.care_offering_availability WHERE provider_id IN (${providerIds}))
  )`).trim());
}

function assertFinal(current) {
  assert.deepEqual({
    providers: current.providers, providerSources: current.providerSources, organizations: current.organizations,
    organizationSources: current.organizationSources, organizationNames: current.organizationNames,
    organizationRelationships: current.organizationRelationships, providerNames: current.providerNames,
    identityLinks: current.identityLinks, providerOrganizations: current.providerOrganizations,
    offerings: current.offerings, offeringSources: current.offeringSources, designations: current.designations,
    features: current.features, availability: current.availability, serviceAreas: current.serviceAreas,
    cms: current.cms, homeSupport: current.homeSupport, targetProviders: current.targetProviders,
    targetOrganizations: current.targetOrganizations, targetOfferings: current.targetOfferings,
    targetDesignations: current.targetDesignations, targetProviderNames: current.targetProviderNames,
    targetServiceAreas: current.targetServiceAreas, targetFeatures: current.targetFeatures,
    targetAvailability: current.targetAvailability,
  }, {
    providers: 137, providerSources: 211, organizations: 59, organizationSources: 37,
    organizationNames: 4, organizationRelationships: 7, providerNames: 5, identityLinks: 51,
    providerOrganizations: 157, offerings: 106, offeringSources: 127, designations: 72,
    features: 84, availability: 0, serviceAreas: 4, cms: 50, homeSupport: 1,
    targetProviders: 16, targetOrganizations: 16, targetOfferings: 16, targetDesignations: 16,
    targetProviderNames: 2, targetServiceAreas: 0, targetFeatures: 0, targetAvailability: 0,
  });
}

function main(args) {
  if (args.length === 1 && args[0] === "--check") {
    console.log(JSON.stringify({ mode: "check", identities: data.providers.map(({ identity_id, action, slug, name }) => ({ identityId: identity_id, action, slug, name })), expectedRows: data.expectedRows }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === "--dry-run-local") {
    const target = inspectLocalTarget();
    const before = state();
    const result = JSON.parse(runLocalSql(buildPrivateHomeCareApplySql({ rollback: true })).trim());
    const after = state();
    assert.deepEqual(after, before);
    console.log(JSON.stringify({ mode: "dry-run-local", databaseWrites: 0, target, result, before, rollback: "exact predecessor restored" }, null, 2));
    return;
  }
  if (args.length === 3 && args[0] === "--write-cycle-local" && args[1] === "--confirm" && args[2] === LOCAL_CONFIRMATION) {
    const target = inspectLocalTarget();
    const before = state();
    const applied = JSON.parse(runLocalSql(buildPrivateHomeCareApplySql()).trim());
    const first = state();
    assertDelta(before, first);
    runLocalSql(buildPrivateHomeCareRollbackSql());
    const restored = state();
    assert.deepEqual(restored, before);
    const reapplied = JSON.parse(runLocalSql(buildPrivateHomeCareApplySql()).trim());
    const final = state();
    assertDelta(before, final);
    assertFinal(final);
    console.log(JSON.stringify({ mode: "write-cycle-local", target, applied, first, rollback: "exact predecessor restored", reapplied, final, rows: exactRows() }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === "--verify-local") {
    const target = inspectLocalTarget();
    const current = state();
    assertFinal(current);
    console.log(JSON.stringify({ mode: "verify-local", databaseWrites: 0, target, current, rows: exactRows() }, null, 2));
    return;
  }
  throw new Error(`Use --check, --dry-run-local, --write-cycle-local --confirm ${LOCAL_CONFIRMATION}, or --verify-local`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.stack ?? error.message); process.exitCode = 1; }
}
