import assert from "node:assert/strict";
import { buildCareApplySql } from "../lib/care-review-apply.mjs";
import { controlledCareFeature } from "../lib/care-feature-taxonomy.js";
import { LOCAL_CONFIRMATION, parseLocalArgs, runLocalSql } from "../lib/local-provider-writer.mjs";
import { inspectLegacyProviders } from "./ingest-legacy-providers.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { expectedProvider as boveressesProvider, reviewedPacket as readBoveressesPacket } from "./phase4b-care.mjs";
import { projectReviewedCareDetail } from "../lib/provider-care-projection.js";

if (parseLocalArgs(process.argv.slice(2)).mode !== "--write-local") {
  throw new Error(`Rollback tests require --write-local --confirm ${LOCAL_CONFIRMATION}`);
}

const fingerprintSql = `SELECT jsonb_build_object(
  'providers',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.providers t),
  'providerSources',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.provider_sources t),
  'serviceAreas',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.provider_service_areas t),
  'municipalities',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.municipalities t),
  'organizations',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.organizations t),
  'relationships',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY provider_id,organization_id),'[]') FROM public.provider_organizations t),
  'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.care_offerings t),
  'features',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY offering_id,feature_kind,feature_code),'[]') FROM public.care_offering_features t),
  'offeringSources',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY offering_id,source_id),'[]') FROM public.care_offering_sources t),
  'availability',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.care_offering_availability t));`;
const snapshot = () => JSON.parse(runLocalSql(fingerprintSql).trim());
const before = snapshot();
const baseline = inspectLegacyProviders().rows.find((row) => row.legacyId === "ems-chateau-rive").provider;
const evidence = { researchField: "test.synthetic", kind: "lia", name: "Rollback-only Phase 4C fixture",
  url: "https://example.test/phase4c-rollback", accessedOn: "2026-09-23" };
const packet = { version: 1,
  identity: { legacyId: "ems-chateau-rive", slug: "ems-chateau-rive",
    expectedName: baseline.name, expectedType: baseline.primary_type },
  approval: { localApply: true, publish: false, verify: false }, organizations: [],
  offerings: [{ slug: "ems-test", name: "Rollback-only test offering", offeringType: "ems",
    typeEvidence: evidence, capacity: null,
    stayModes: { longStay: null, shortStay: null, respiteStay: null }, careProfiles: [],
    features: [{ ...controlledCareFeature("service", "palliative_care"), evidence }],
    admissions: null, financing: null, publicInterestStatus: null, pricing: null }],
  deferred: [], unresolved: [] };

const result = JSON.parse(runLocalSql(buildCareApplySql(packet, baseline, { rollback: true })).trim());
assert.deepEqual({ provider: result.provider, organizations: result.organizations, offerings: result.offerings,
  features: result.features, offeringSources: result.offeringSources, providerSourcesAdded: result.providerSourcesAdded,
  published: result.published, verified: result.verified },
{ provider: "ems-chateau-rive", organizations: 0, offerings: 1, features: 1,
  offeringSources: 1, providerSourcesAdded: 1, published: false, verified: false });
assert.deepEqual(snapshot(), before, "generic rollback apply changed the local database");

const boveressesSnapshot = JSON.parse(runLocalSql(buildLocalProviderDetailSql("ems-boveresses")).trim());
assert.ok(projectReviewedCareDetail(boveressesSnapshot), "existing Boveresses projection is invalid");
assert.throws(() => runLocalSql(buildCareApplySql(readBoveressesPacket(), boveressesProvider, { rollback: true })),
  /Existing reviewed care state requires reconciliation/);
assert.deepEqual(snapshot(), before, "repeat-rejection test changed the local database");

console.log(JSON.stringify({ mode: "rollback-only", syntheticProvider: "ems-chateau-rive",
  temporaryOfferingAppliedThenRolledBack: true, existingBoveressesRejectedSafely: true,
  localDatabaseUnchanged: true }, null, 2));
