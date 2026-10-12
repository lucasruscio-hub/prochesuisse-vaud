import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  buildHomeCareClosureApplySql,
  buildHomeCareClosureRollbackSql,
  compileHomeCareClosure,
} from "../lib/vaud-v1-home-care-closure.mjs";
import { inspectLocalTarget, LOCAL_CONFIRMATION, runLocalSql } from "../lib/local-provider-writer.mjs";

const data = compileHomeCareClosure();
const providerIds = data.providers.map(({ id }) => `'${id}'::uuid`).join(",");
const organizationIds = data.organizations.map(({ id }) => `'${id}'::uuid`).join(",");
const protectedSlugs = [
  "senevita-vaud", "amad-homecare-lutry", "amad-homecare-nyon", "vivradom-renens", "vivradom-orbe",
  "dovida", "homeinstead", "osad-beau-sejour", "samsa-levant", "altoan", "alterum",
  "aide-familiale-morges", "vitadomo", "senior-plus", "pro-senectute",
  ...JSON.parse(await import("node:fs").then(({ readFileSync }) => readFileSync(
    new URL("../docs/research/vaud-v1-private-home-care-completeness-manifest.json", import.meta.url), "utf8",
  ))).identities.map(({ provider }) => provider.slug),
];
const quotedProtectedSlugs = protectedSlugs.map((slug) => `'${slug.replaceAll("'", "''")}'`).join(",");
const heldOrganizationSlugs = ["nurse-home-care-sarl", "soinvaud-sarl", "sciensus-ag", "amad-homecare-sa", "amad-homecare-la-cote-sa"]
  .map((slug) => `'${slug}'`).join(",");

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
  'ems',(SELECT count(*) FROM public.providers WHERE primary_type='ems'),
  'targets',(SELECT count(*) FROM public.providers WHERE id IN (${providerIds})),
  'targetOrganizations',(SELECT count(*) FROM public.organizations WHERE id IN (${organizationIds})),
  'heldProviders',(SELECT count(*) FROM public.providers WHERE slug IN ('amad-homecare-yverdon','nurse-home-care','soinvaud-provider','sciensus-home-therapy')),
  'targetFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg((to_jsonb(t)-'created_at'-'updated_at')::text,E'\\n' ORDER BY (to_jsonb(t)-'created_at'-'updated_at')::text),'') FROM public.providers t WHERE id IN (${providerIds})),
    (SELECT coalesce(string_agg((to_jsonb(t)-'created_at')::text,E'\\n' ORDER BY (to_jsonb(t)-'created_at')::text),'') FROM public.provider_sources t WHERE provider_id IN (${providerIds})),
    (SELECT coalesce(string_agg((to_jsonb(t)-'created_at'-'updated_at')::text,E'\\n' ORDER BY (to_jsonb(t)-'created_at'-'updated_at')::text),'') FROM public.organizations t WHERE id IN (${organizationIds})),
    (SELECT coalesce(string_agg((to_jsonb(t)-'created_at')::text,E'\\n' ORDER BY (to_jsonb(t)-'created_at')::text),'') FROM public.organization_sources t WHERE organization_id IN (${organizationIds})),
    (SELECT coalesce(string_agg((to_jsonb(t)-'created_at')::text,E'\\n' ORDER BY (to_jsonb(t)-'created_at')::text),'') FROM public.provider_organizations t WHERE provider_id IN (${providerIds})),
    (SELECT coalesce(string_agg((to_jsonb(t)-'created_at'-'updated_at')::text,E'\\n' ORDER BY (to_jsonb(t)-'created_at'-'updated_at')::text),'') FROM public.care_offerings t WHERE provider_id IN (${providerIds})),
    (SELECT coalesce(string_agg((to_jsonb(t)-'created_at')::text,E'\\n' ORDER BY (to_jsonb(t)-'created_at')::text),'') FROM public.care_offering_sources t WHERE provider_id IN (${providerIds})),
    (SELECT coalesce(string_agg((to_jsonb(t)-'created_at')::text,E'\\n' ORDER BY (to_jsonb(t)-'created_at')::text),'') FROM public.care_offering_regulatory_designations t WHERE provider_id IN (${providerIds}))
  )),
  'allFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.providers t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_names t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_relationships t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offerings t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_names t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_identity_links t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_regulatory_designations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_features t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_availability t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_service_areas t)
  )),
  'nonTargetFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.providers t WHERE id NOT IN (${providerIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_sources t WHERE provider_id NOT IN (${providerIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organizations t WHERE id NOT IN (${organizationIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_sources t WHERE organization_id NOT IN (${organizationIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_names t WHERE organization_id NOT IN (${organizationIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_relationships t WHERE parent_organization_id NOT IN (${organizationIds}) AND member_organization_id NOT IN (${organizationIds}) AND evidence_organization_id NOT IN (${organizationIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_organizations t WHERE provider_id NOT IN (${providerIds}) AND organization_id NOT IN (${organizationIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offerings t WHERE provider_id NOT IN (${providerIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_sources t WHERE provider_id NOT IN (${providerIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_names t WHERE provider_id NOT IN (${providerIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_identity_links t WHERE predecessor_provider_id NOT IN (${providerIds}) AND successor_provider_id NOT IN (${providerIds}) AND evidence_provider_id NOT IN (${providerIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_regulatory_designations t WHERE provider_id NOT IN (${providerIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_features t WHERE provider_id NOT IN (${providerIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_availability t WHERE provider_id NOT IN (${providerIds})),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_service_areas t WHERE provider_id NOT IN (${providerIds}))
  )),
  'cmsFingerprint',md5(concat_ws('|',
    (SELECT string_agg(to_jsonb(p)::text,E'\\n' ORDER BY p.id) FROM public.providers p WHERE p.slug LIKE 'cms-%'),
    (SELECT string_agg(to_jsonb(o)::text,E'\\n' ORDER BY o.id) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.slug LIKE 'cms-%')
  )),
  'emsFingerprint',md5(concat_ws('|',
    (SELECT string_agg(to_jsonb(p)::text,E'\\n' ORDER BY p.id) FROM public.providers p WHERE p.primary_type='ems'),
    (SELECT string_agg(to_jsonb(o)::text,E'\\n' ORDER BY o.id) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.primary_type='ems')
  )),
  'protectedFingerprint',md5(concat_ws('|',
    (SELECT string_agg(to_jsonb(p)::text,E'\\n' ORDER BY p.id) FROM public.providers p WHERE p.slug IN (${quotedProtectedSlugs})),
    (SELECT string_agg(to_jsonb(o)::text,E'\\n' ORDER BY o.id) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.slug IN (${quotedProtectedSlugs})),
    (SELECT string_agg(to_jsonb(g)::text,E'\\n' ORDER BY g.id) FROM public.organizations g WHERE g.slug IN (${heldOrganizationSlugs}))
  ))
)`;

const state = () => JSON.parse(runLocalSql(stateSql).trim());
const assertApplied = (before, after) => {
  assert.equal(after.providers, before.providers + 4);
  assert.equal(after.organizations, before.organizations + 5);
  assert.equal(after.offerings, before.offerings + 5);
  assert.equal(after.targets, 5);
  assert.equal(after.targetOrganizations, 5);
  assert.equal(after.heldProviders, 0);
  for (const key of ["nonTargetFingerprint", "cmsFingerprint", "emsFingerprint", "protectedFingerprint"]) {
    assert.equal(after[key], before[key], `${key} changed`);
  }
};

export function run(mode, confirmation) {
  assert.equal(confirmation, LOCAL_CONFIRMATION, "Exact local confirmation required");
  inspectLocalTarget();
  const before = state();
  if (mode === "--dry-run") {
    const result = JSON.parse(runLocalSql(buildHomeCareClosureApplySql({ rollback: true })).trim());
    assert.deepEqual(state(), before);
    return { mode, result, before };
  }
  if (mode === "--apply") {
    const result = JSON.parse(runLocalSql(buildHomeCareClosureApplySql()).trim());
    const after = state();
    assertApplied(before, after);
    return { mode, result, after };
  }
  if (mode === "--rollback") {
    runLocalSql(buildHomeCareClosureRollbackSql());
    return { mode, after: state() };
  }
  if (mode === "--verify") return { mode, after: before };
  if (mode === "--full-cycle") {
    const dryRun = JSON.parse(runLocalSql(buildHomeCareClosureApplySql({ rollback: true })).trim());
    assert.deepEqual(state(), before);
    const appliedResult = JSON.parse(runLocalSql(buildHomeCareClosureApplySql()).trim());
    const applied = state();
    assertApplied(before, applied);
    runLocalSql(buildHomeCareClosureRollbackSql());
    assert.deepEqual(state(), before, "rollback did not restore the exact predecessor");
    const reappliedResult = JSON.parse(runLocalSql(buildHomeCareClosureApplySql()).trim());
    const reapplied = state();
    const comparableApplied = { ...applied, allFingerprint: null };
    const comparableReapplied = { ...reapplied, allFingerprint: null };
    assert.deepEqual(comparableReapplied, comparableApplied, "reapply did not reproduce the verified authored state");
    return { mode, dryRun, appliedResult, reappliedResult, before, after: reapplied };
  }
  throw new Error("Use --dry-run, --apply, --rollback, --verify, or --full-cycle");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) console.log(JSON.stringify(run(process.argv[2], process.argv[3]), null, 2));
