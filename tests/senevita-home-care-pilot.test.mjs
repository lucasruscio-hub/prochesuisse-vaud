import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { buildSenevitaCarePacket, validateSenevitaCanonicalPacket, validateSenevitaReviewPacket }
  from "../lib/senevita-home-care-review.mjs";
import { buildCareApplySql } from "../lib/care-review-apply.mjs";
import { projectReviewedCareDetail } from "../lib/provider-care-projection.js";
import { providerDetailView } from "../lib/provider-detail.js";
import { expectedProvider } from "../scripts/phase5d-senevita-care.mjs";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { getProviderBySlug, getProviderDetailBySlug } = await import("../lib/provider-repository.js");

const raw = JSON.parse(readFileSync(new URL("../docs/research/phase5d-senevita-home-care/senevita-vaud-care.review.json", import.meta.url), "utf8"));
const canonical = JSON.parse(readFileSync(new URL("../docs/research/phase5d-senevita-home-care/canonical/senevita-vaud-care.json", import.meta.url), "utf8"));
const source = (evidence) => ({ source_type: evidence.kind, source_name: evidence.name,
  source_url: evidence.url, external_record_id: evidence.url });

function snapshot() {
  const provider = { ...expectedProvider, id: "provider-senevita" };
  const offeringPacket = canonical.offerings[0];
  const offering = { id: "offering-home", provider_id: provider.id, slug: offeringPacket.slug,
    name: offeringPacket.name, offering_type: offeringPacket.offeringType, summary: offeringPacket.summary.value,
    capacity_value: null, capacity_unit: null, long_stay: null, short_stay: null, respite_stay: null,
    admissions_notes: offeringPacket.admissions.value, financing_notes: offeringPacket.financing.value,
    public_interest_status: null, pricing_notes: offeringPacket.pricing.value, status: "active",
    verification_status: "unverified", is_published: false, last_reviewed_at: null };
  const fields = ["offering_type", "summary", "admissions_notes", "financing_notes", "pricing_notes"];
  return { provider, serviceAreaCount: 1,
    sources: [{ source_type: "legacy", external_record_id: "senevita-vaud",
      fields_supported: ["legacy_id", "name"] },
    { source_type: "provider", source_url: "https://www.senevita.ch/fr/sites/spitex-vaud/",
      external_record_id: "https://www.senevita.ch/fr/sites/spitex-vaud/",
      fields_supported: ["name", "primary_type", "postal_code", "locality", "phone", "website"] },
    ...raw.sources.filter((item) => item.id !== "site").map((item) => ({ source_type: item.kind,
      source_url: item.url, external_record_id: item.url, fields_supported: [] }))],
    organizationLinks: [{ organization: { id: "org-senevita", slug: "senevita-ag", name: "Senevita AG",
      status: "active", verification_status: "unverified", is_published: false, last_reviewed_at: null },
    relationship: { provider_id: provider.id, organization_id: "org-senevita",
      relationship_type: "operator", is_primary: true }, source: source(canonical.organizations[0].evidence) }],
    offerings: [{ offering, availabilityCount: 0,
      sources: [{ link: { provider_id: provider.id, offering_id: offering.id, fields_supported: fields },
        source: source(offeringPacket.typeEvidence) }],
      features: offeringPacket.features.map((item) => ({ feature: { provider_id: provider.id,
        offering_id: offering.id, feature_kind: item.kind, feature_code: item.code,
        display_name: item.displayName, details: null, reviewed_at: null }, source: source(item.evidence) })),
      serviceAreas: [{ area: { provider_id: provider.id, care_offering_id: offering.id,
        coverage_type: "region", coverage_label: "dans la région de Vaud", municipality_id: null,
        canton_code: null }, source: source(canonical.serviceAreas[0].evidence) }],
    }],
  };
}

test("review packet deterministically produces the guarded canonical packet", () => {
  const review = validateSenevitaReviewPacket(raw);
  assert.equal(review.databaseWrites, 0);
  assert.equal(review.acceptedFacts, 18);
  assert.equal(review.deferredFacts, 6);
  assert.deepEqual(canonical, buildSenevitaCarePacket(raw));
  assert.deepEqual(validateSenevitaCanonicalPacket(canonical, raw), {
    valid: true, localApplyReady: true, offeringCount: 1, importedFeatureCount: 11,
    serviceAreaCount: 1, deferredCount: 6, unresolvedCount: 0,
  });
});

test("unknown home-care facts remain absent rather than inferred", () => {
  const codes = canonical.offerings[0].features.map((item) => item.code);
  for (const code of ["on_call_24h", "continuous_assistance", "meal_delivery", "emergency_call_service"]) {
    assert.ok(!codes.includes(code));
  }
  assert.deepEqual(canonical.serviceAreas[0], {
    offeringSlug: "home-care", coverageType: "region", coverageLabel: "dans la région de Vaud",
    cantonCode: null, municipalityId: null, evidence: canonical.serviceAreas[0].evidence,
  });
  assert.equal(canonical.offerings[0].publicInterestStatus, null);
});

test("guarded SQL is target-scoped, offering-scoped, dated, and rollback-capable", () => {
  const sql = buildCareApplySql(canonical, expectedProvider, { rollback: true });
  assert.match(sql, /INSERT INTO public\.provider_service_areas/);
  assert.match(sql, /care_offering_id/);
  assert.match(sql, /accessed_on/);
  assert.match(sql, /Existing reviewed care state requires reconciliation/);
  assert.match(sql, /other_service_areas/);
  assert.match(sql, /ROLLBACK;\s*$/);
});

test("provider projection distinguishes confirmed facts, narrative coverage, and unknowns", () => {
  const detail = projectReviewedCareDetail(snapshot());
  assert.equal(detail.operator.name, "Senevita AG");
  assert.equal(detail.offerings[0].services.length, 10);
  assert.deepEqual(detail.offerings[0].careProfiles, ["Accompagnement des troubles cognitifs"]);
  assert.deepEqual(detail.offerings[0].coverage, ["dans la région de Vaud"]);
  assert.match(detail.offerings[0].unknownNotice, /non confirmées/);
  const view = providerDetailView({ slug: "senevita-vaud", name: "Senevita Casa Vaud",
    type: "domicile", tags: [], detail });
  assert.equal(view.admissions, canonical.offerings[0].admissions.value);
  assert.match(view.pricing, /Durée minimale/);
});

test("repository preview combines reviewed identity and care into the consumer detail model", async () => {
  const base = await getProviderBySlug("senevita-vaud");
  const local = snapshot();
  const projected = await getProviderDetailBySlug("senevita-vaud", {
    preview: true, includeGoogle: false, readLocal: async () => local,
  });
  assert.notDeepEqual(projected, base);
  assert.equal(projected.detail.contact.phone, "021 311 19 20");
  assert.equal(projected.detail.operator.name, "Senevita AG");
  assert.deepEqual(projected.detail.offerings[0].coverage, ["dans la région de Vaud"]);
  assert.equal(providerDetailView(projected).offerings[0].services.length, 10);
});

test("unsafe coverage, publication, or an altered packet is rejected", () => {
  const published = snapshot(); published.offerings[0].offering.is_published = true;
  assert.equal(projectReviewedCareDetail(published), null);
  const municipalityInference = snapshot();
  municipalityInference.offerings[0].serviceAreas[0].area.municipality_id = "invented";
  assert.equal(projectReviewedCareDetail(municipalityInference), null);
  const altered = structuredClone(canonical); altered.offerings[0].features.push(altered.offerings[0].features[0]);
  assert.throws(() => validateSenevitaCanonicalPacket(altered, raw), /Stale or altered/);
});
