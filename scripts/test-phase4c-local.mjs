import assert from "node:assert/strict";
import { buildCareApplySql } from "../lib/care-review-apply.mjs";
import { controlledCareFeature } from "../lib/care-feature-taxonomy.js";
import { jsonSql, LOCAL_CONFIRMATION, parseLocalArgs, runLocalSql } from "../lib/local-provider-writer.mjs";
import { inspectLegacyProviders } from "./ingest-legacy-providers.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { expectedProvider as boveressesProvider, reviewedPacket as readBoveressesPacket } from "./phase4b-care.mjs";
import { buildPhase4cEvidenceSet } from "./phase4c-care-evidence.mjs";

const approvedSlugs = ["ems-chateau-rive", "ems-clair-soleil", "ems-le-home", "ems-girarde"];
const protectedSlugs = new Set(["ems-boveresses", ...approvedSlugs, "ems-signal", "nova-via"]);
const legacyRows = inspectLegacyProviders().rows;
const baselineBySlug = new Map(legacyRows.map((row) => [row.legacyId, row.provider]));
const approvedEntries = buildPhase4cEvidenceSet().filter((entry) => approvedSlugs.includes(entry.slug));

const fingerprintSql = `BEGIN;
CREATE TEMP TABLE lia_phase4c_leads (snapshot jsonb);
DO $leads$
DECLARE state jsonb;
BEGIN
  IF to_regclass('public.leads') IS NULL THEN state := '{"exists":false}'::jsonb;
  ELSE EXECUTE 'SELECT jsonb_build_object(''exists'',true,''count'',count(*),''hash'',md5(coalesce(string_agg(to_jsonb(t)::text,E''\\n'' ORDER BY to_jsonb(t)::text),''''))) FROM public.leads t' INTO state; END IF;
  INSERT INTO lia_phase4c_leads VALUES(state);
END $leads$;
SELECT jsonb_build_object(
  'providers',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.providers t),
  'providerSources',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.provider_sources t),
  'serviceAreas',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.provider_service_areas t),
  'municipalities',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.municipalities t),
  'organizations',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.organizations t),
  'relationships',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY provider_id,organization_id),'[]') FROM public.provider_organizations t),
  'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.care_offerings t),
  'features',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY offering_id,feature_kind,feature_code),'[]') FROM public.care_offering_features t),
  'offeringSources',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY offering_id,source_id),'[]') FROM public.care_offering_sources t),
  'availability',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.care_offering_availability t),
  'leads',(SELECT snapshot FROM lia_phase4c_leads));
ROLLBACK;`;

function snapshot() {
  return JSON.parse(runLocalSql(fingerprintSql).trim());
}

function sameSource(actual, expected) {
  return actual.source_type === expected.kind && actual.source_name === expected.name
    && actual.source_url === expected.url && actual.external_record_id === expected.url;
}

function expectedOfferingSources(offering) {
  const groups = new Map();
  const add = (evidence, ...fields) => {
    const key = JSON.stringify([evidence.kind, evidence.name, evidence.url]);
    if (!groups.has(key)) groups.set(key, { evidence, fields: [] });
    groups.get(key).fields.push(...fields);
  };
  add(offering.typeEvidence, "offering_type");
  if (offering.capacity) add(offering.capacity.evidence, "capacity_value", "capacity_unit");
  for (const [packetField, column] of [["longStay", "long_stay"], ["shortStay", "short_stay"],
    ["respiteStay", "respite_stay"]]) {
    if (offering.stayModes[packetField]) add(offering.stayModes[packetField].evidence, column);
  }
  for (const [packetField, column] of [["admissions", "admissions_notes"], ["financing", "financing_notes"],
    ["publicInterestStatus", "public_interest_status"], ["pricing", "pricing_notes"]]) {
    if (offering[packetField]) add(offering[packetField].evidence, column);
  }
  return [...groups.values()];
}

function verifyAppliedPacket(packet, detail) {
  assert.equal(detail.provider?.legacy_id, packet.identity.legacyId);
  assert.equal(detail.provider?.slug, packet.identity.slug);
  assert.equal(detail.provider?.name, packet.identity.expectedName);
  assert.equal(detail.provider?.primary_type, packet.identity.expectedType);
  assert.equal(detail.provider?.is_published, false);
  assert.equal(detail.provider?.verification_status, "unverified");
  assert.equal(detail.serviceAreaCount, 0, `${packet.identity.slug} has an invented service area`);

  const expectedSources = new Map();
  const remember = (evidence) => expectedSources.set(JSON.stringify([evidence.kind, evidence.name, evidence.url]), evidence);
  for (const organization of packet.organizations) remember(organization.evidence);
  for (const offering of packet.offerings) {
    remember(offering.typeEvidence);
    if (offering.capacity) remember(offering.capacity.evidence);
    for (const fact of Object.values(offering.stayModes)) if (fact) remember(fact.evidence);
    for (const feature of offering.features) remember(feature.evidence);
    for (const field of ["admissions", "financing", "publicInterestStatus", "pricing"]) {
      if (offering[field]) remember(offering[field].evidence);
    }
  }
  for (const evidence of expectedSources.values()) {
    assert.equal(detail.sources.filter((source) => sameSource(source, evidence)).length, 1,
      `${packet.identity.slug} has missing or duplicate provider provenance`);
  }

  assert.equal(detail.organizationLinks.length, packet.organizations.length);
  for (const expected of packet.organizations) {
    const matches = detail.organizationLinks.filter(({ organization }) => organization.slug === expected.slug);
    assert.equal(matches.length, 1, `${packet.identity.slug} has missing or duplicate operator links`);
    const [{ organization, relationship, source }] = matches;
    assert.equal(organization.name, expected.name);
    assert.equal(organization.is_published, false);
    assert.equal(organization.verification_status, "unverified");
    assert.equal(relationship.relationship_type, expected.relationshipType);
    assert.equal(relationship.is_primary, expected.isPrimary);
    assert.ok(sameSource(source, expected.evidence));
  }

  assert.equal(detail.offerings.length, packet.offerings.length);
  for (const expected of packet.offerings) {
    const matches = detail.offerings.filter(({ offering }) => offering.slug === expected.slug);
    assert.equal(matches.length, 1, `${packet.identity.slug} has missing or duplicate offerings`);
    const [{ offering, features, sources, availabilityCount }] = matches;
    assert.equal(offering.name, expected.name);
    assert.equal(offering.offering_type, expected.offeringType);
    assert.equal(offering.capacity_value, expected.capacity?.value ?? null);
    assert.equal(offering.capacity_unit, expected.capacity?.unit ?? null);
    assert.equal(offering.long_stay, expected.stayModes.longStay?.value ?? null);
    assert.equal(offering.short_stay, expected.stayModes.shortStay?.value ?? null);
    assert.equal(offering.respite_stay, expected.stayModes.respiteStay?.value ?? null);
    assert.equal(offering.admissions_notes, expected.admissions?.value ?? null);
    assert.equal(offering.financing_notes, expected.financing?.value ?? null);
    assert.equal(offering.public_interest_status, expected.publicInterestStatus?.value ?? null);
    assert.equal(offering.pricing_notes, expected.pricing?.value ?? null);
    assert.equal(offering.is_published, false);
    assert.equal(offering.verification_status, "unverified");
    assert.equal(availabilityCount, 0, `${packet.identity.slug} has invented availability`);

    assert.equal(features.length, expected.features.length);
    assert.equal(new Set(features.map(({ feature }) => `${feature.feature_kind}.${feature.feature_code}`)).size,
      features.length, `${packet.identity.slug} has duplicate features`);
    for (const expectedFeature of expected.features) {
      const featureMatches = features.filter(({ feature }) => feature.feature_kind === expectedFeature.kind
        && feature.feature_code === expectedFeature.code);
      assert.equal(featureMatches.length, 1);
      assert.equal(featureMatches[0].feature.display_name, expectedFeature.displayName);
      assert.equal(featureMatches[0].feature.details, expectedFeature.details);
      assert.ok(sameSource(featureMatches[0].source, expectedFeature.evidence));
    }

    const expectedSourcesForOffering = expectedOfferingSources(expected);
    assert.equal(sources.length, expectedSourcesForOffering.length);
    for (const group of expectedSourcesForOffering) {
      const sourceMatches = sources.filter(({ source }) => sameSource(source, group.evidence));
      assert.equal(sourceMatches.length, 1, `${packet.identity.slug} has missing or duplicate offering provenance`);
      assert.deepEqual([...sourceMatches[0].link.fields_supported].sort(), [...group.fields].sort());
    }
  }
  return { slug: packet.identity.slug,
    organization: packet.organizations.map(({ slug, name, relationshipType, isPrimary }) => ({
      slug, name, relationshipType, isPrimary,
    })),
    offerings: packet.offerings.map((offering) => ({ slug: offering.slug, name: offering.name,
      offeringType: offering.offeringType,
      capacity: offering.capacity ? { value: offering.capacity.value, unit: offering.capacity.unit } : null,
      stayModes: Object.fromEntries(Object.entries(offering.stayModes)
        .map(([field, fact]) => [field, fact?.value ?? null])),
      careProfiles: offering.features.filter((feature) => feature.kind === "care_profile").map((feature) => feature.code),
      services: offering.features.filter((feature) => feature.kind === "service").map((feature) => feature.code),
      facilities: offering.features.filter((feature) => feature.kind === "facility").map((feature) => feature.code),
      admissions: offering.admissions?.value ?? null,
    })),
    provenance: [...expectedSources.values()].map(({ kind, name, url }) => ({ kind, name, url })),
    organizationCount: detail.organizationLinks.length,
    offeringCount: detail.offerings.length,
    featureCount: detail.offerings.reduce((count, item) => count + item.features.length, 0),
    offeringSourceCount: detail.offerings.reduce((count, item) => count + item.sources.length, 0),
    serviceAreas: detail.serviceAreaCount,
    availability: detail.offerings.reduce((count, item) => count + item.availabilityCount, 0),
    published: false, verified: false };
}

function visibilityFor(role, slugs, organizationSlugs) {
  const sql = `BEGIN READ ONLY;
SET LOCAL ROLE ${role};
SELECT jsonb_build_object(
  'providers',(SELECT count(*) FROM public.providers WHERE slug IN (SELECT jsonb_array_elements_text(${jsonSql(slugs)}))),
  'organizations',(SELECT count(*) FROM public.organizations WHERE slug IN (SELECT jsonb_array_elements_text(${jsonSql(organizationSlugs)}))),
  'offerings',(SELECT count(*) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.slug IN (SELECT jsonb_array_elements_text(${jsonSql(slugs)}))),
  'features',(SELECT count(*) FROM public.care_offering_features f JOIN public.providers p ON p.id=f.provider_id WHERE p.slug IN (SELECT jsonb_array_elements_text(${jsonSql(slugs)}))),
  'providerSourcesReadable',has_table_privilege(current_user,'public.provider_sources','SELECT'),
  'offeringSourcesReadable',has_table_privilege(current_user,'public.care_offering_sources','SELECT'));
ROLLBACK;`;
  return JSON.parse(runLocalSql(sql).trim());
}

function verifyAppliedProviders() {
  const results = approvedEntries.map(({ packet }) => verifyAppliedPacket(packet,
    JSON.parse(runLocalSql(buildLocalProviderDetailSql(packet.identity.slug)).trim())));
  const organizationSlugs = approvedEntries.flatMap(({ packet }) => packet.organizations.map((item) => item.slug));
  for (const role of ["anon", "authenticated"]) {
    assert.deepEqual(visibilityFor(role, approvedSlugs, organizationSlugs), {
      providers: 0, organizations: 0, offerings: 0, features: 0,
      providerSourcesReadable: false, offeringSourcesReadable: false,
    });
  }
  return results;
}

function databaseCounts(state) {
  return { providers: state.providers.length, providerSources: state.providerSources.length,
    serviceAreas: state.serviceAreas.length, municipalities: state.municipalities.length,
    organizations: state.organizations.length, relationships: state.relationships.length,
    offerings: state.offerings.length, features: state.features.length,
    offeringSources: state.offeringSources.length, availability: state.availability.length,
    leads: state.leads };
}

function fixtureLinkCheck(slug, organizationSlug, sourceUrl) {
  return `DO $fixture_links$
DECLARE provider_uuid uuid; offering_uuid uuid; source_uuid uuid; organization_uuid uuid;
BEGIN
  SELECT id INTO provider_uuid FROM public.providers WHERE slug=${jsonSql(slug)} #>> '{}';
  SELECT id INTO source_uuid FROM public.provider_sources WHERE provider_id=provider_uuid
    AND source_url=${jsonSql(sourceUrl)} #>> '{}';
  SELECT id INTO organization_uuid FROM public.organizations WHERE slug=${jsonSql(organizationSlug)} #>> '{}';
  SELECT id INTO offering_uuid FROM public.care_offerings WHERE provider_id=provider_uuid AND slug='rollback-fixture';
  IF provider_uuid IS NULL OR source_uuid IS NULL OR organization_uuid IS NULL OR offering_uuid IS NULL
    OR (SELECT count(*) FROM public.provider_sources WHERE provider_id=provider_uuid AND source_url=${jsonSql(sourceUrl)} #>> '{}') <> 1
    OR (SELECT count(*) FROM public.provider_organizations WHERE provider_id=provider_uuid
      AND organization_id=organization_uuid AND source_id=source_uuid AND relationship_type='operator' AND is_primary) <> 1
    OR (SELECT count(*) FROM public.care_offerings WHERE id=offering_uuid AND offering_type='ems'
      AND capacity_value=1 AND capacity_unit='beds' AND long_stay IS NULL AND short_stay IS NULL
      AND respite_stay IS NULL AND NOT is_published AND verification_status='unverified') <> 1
    OR (SELECT count(*) FROM public.care_offering_features WHERE provider_id=provider_uuid
      AND offering_id=offering_uuid AND source_id=source_uuid AND feature_kind='service'
      AND feature_code='palliative_care') <> 1
    OR (SELECT count(*) FROM public.care_offering_sources WHERE provider_id=provider_uuid
      AND offering_id=offering_uuid AND source_id=source_uuid AND fields_supported=ARRAY['offering_type','capacity_value','capacity_unit']) <> 1
    OR EXISTS (SELECT FROM public.care_offering_availability WHERE offering_id=offering_uuid) THEN
    RAISE EXCEPTION 'Rollback fixture linkage verification failed';
  END IF;
END $fixture_links$;`;
}

function runRollbackSuite() {
  const before = snapshot();
  const verifiedBefore = verifyAppliedProviders();
  const pristine = legacyRows.find((row) => !protectedSlugs.has(row.legacyId)
    && !before.offerings.some((offering) => offering.provider_id
      === before.providers.find((provider) => provider.slug === row.legacyId)?.id)
    && !before.relationships.some((relationship) => relationship.provider_id
      === before.providers.find((provider) => provider.slug === row.legacyId)?.id));
  assert.ok(pristine, "No pristine provider is available for the rollback-only fixture");
  const baseline = pristine.provider;
  const current = before.providers.find((provider) => provider.slug === pristine.legacyId);
  assert.deepEqual(Object.fromEntries(Object.entries(current)
    .filter(([key]) => !["id", "created_at", "updated_at"].includes(key))), baseline,
  "Rollback fixture provider no longer matches its exact legacy identity");

  const organizationSlug = `phase4c-rollback-${pristine.legacyId}`;
  const sourceUrl = "https://example.test/phase4c-rollback";
  const evidence = { researchField: "test.synthetic", kind: "lia", name: "Rollback-only Phase 4C fixture",
    url: sourceUrl, accessedOn: "2026-09-24" };
  const packet = { version: 1,
    identity: { legacyId: pristine.legacyId, slug: pristine.legacyId,
      expectedName: baseline.name, expectedType: baseline.primary_type },
    approval: { localApply: true, publish: false, verify: false },
    organizations: [{ slug: organizationSlug, name: "Rollback-only organization",
      relationshipType: "operator", isPrimary: true, evidence }],
    offerings: [{ slug: "rollback-fixture", name: "Rollback-only test offering", offeringType: "ems",
      typeEvidence: evidence, capacity: { value: 1, unit: "beds", evidence },
      stayModes: { longStay: null, shortStay: null, respiteStay: null }, careProfiles: [],
      features: [{ ...controlledCareFeature("service", "palliative_care"), evidence }],
      admissions: null, financing: null, publicInterestStatus: null, pricing: null }],
    deferred: [], unresolved: [] };

  const plainSql = buildCareApplySql(packet, baseline, { rollback: true });
  const checkedSql = plainSql.replace("SET LOCAL ROLE anon;",
    `${fixtureLinkCheck(pristine.legacyId, organizationSlug, sourceUrl)}\nSET LOCAL ROLE anon;`);
  const result = JSON.parse(runLocalSql(checkedSql).trim());
  assert.deepEqual({ provider: result.provider, organizations: result.organizations,
    offerings: result.offerings, features: result.features, offeringSources: result.offeringSources,
    providerSourcesAdded: result.providerSourcesAdded, published: result.published, verified: result.verified },
  { provider: pristine.legacyId, organizations: 1, offerings: 1, features: 1,
    offeringSources: 1, providerSourcesAdded: 1, published: false, verified: false });
  assert.deepEqual(snapshot(), before, "successful rollback fixture changed the local database");

  const identityConflict = structuredClone(packet);
  identityConflict.identity.expectedName = "Wrong rollback identity";
  assert.throws(() => runLocalSql(buildCareApplySql(identityConflict, baseline, { rollback: true })),
    /Provider identity or reviewed-state conflict/);

  const organizationConflict = plainSql.replace("DO $apply$",
    `INSERT INTO public.organizations(slug,name) VALUES (${jsonSql(organizationSlug)} #>> '{}','Conflicting organization');\nDO $apply$`);
  assert.throws(() => runLocalSql(organizationConflict), /Organization conflict/);

  const duplicateState = plainSql.replace("DO $apply$",
    "INSERT INTO public.care_offerings(provider_id,slug,name,offering_type) SELECT provider_id,'duplicate-fixture','Duplicate fixture','ems' FROM lia_care_target;\nDO $apply$");
  assert.throws(() => runLocalSql(duplicateState), /Existing reviewed care state requires reconciliation/);

  const unsafeUnrelated = plainSql.replace("END $apply$;",
    "END $apply$;\nUPDATE public.providers SET name='Unsafe unrelated mutation' WHERE slug='ems-signal';");
  assert.throws(() => runLocalSql(unsafeUnrelated), /Unrelated or existing data changed/);

  const appliedPackets = [{ packet: readBoveressesPacket(), baseline: boveressesProvider },
    ...approvedEntries.map(({ packet }) => ({ packet, baseline: baselineBySlug.get(packet.identity.slug) }))];
  for (const item of appliedPackets) {
    assert.throws(() => runLocalSql(buildCareApplySql(item.packet, item.baseline, { rollback: true })),
      /Existing reviewed care state requires reconciliation/);
  }
  assert.deepEqual(snapshot(), before, "rejection checks changed the local database");
  const verifiedAfter = verifyAppliedProviders();
  assert.deepEqual(verifiedAfter, verifiedBefore, "approved provider verification changed during rollback suite");
  assert.deepEqual(snapshot(), before, "Phase 4C rollback suite changed legitimate local care data");
  return { mode: "rollback-only", syntheticProvider: pristine.legacyId,
    guardedLocalExecution: true, exactIdentityRejected: true, linkageVerifiedInsideTransaction: true,
    organizationConflictRejected: true, duplicateCareStateRejected: true,
    unrelatedMutationRejected: true, repeatApplyRejectedForAllFiveAppliedProviders: true,
    signalUnchanged: true, legitimateCareStateUnchanged: true,
    approvedProviders: verifiedAfter, databaseCounts: databaseCounts(before) };
}

const args = parseLocalArgs(process.argv.slice(2));
if (args.mode === "--verify-local") {
  const state = snapshot();
  console.log(JSON.stringify({ mode: "verify-local", databaseWrites: 0,
    approvedProviders: verifyAppliedProviders(), signalHeldAndUntouched: !state.offerings.some((offering) =>
      offering.provider_id === state.providers.find((provider) => provider.slug === "ems-signal")?.id),
    databaseCounts: databaseCounts(state) }, null, 2));
} else if (args.mode === "--write-local") {
  console.log(JSON.stringify(runRollbackSuite(), null, 2));
} else {
  throw new Error(`Use --verify-local or --write-local --confirm ${LOCAL_CONFIRMATION}`);
}
