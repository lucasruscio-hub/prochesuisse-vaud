import test from "node:test";
import assert from "node:assert/strict";
import { projectBoveressesCareDetail } from "../lib/provider-care-projection.js";
import { providerDetailSections, providerDetailView } from "../lib/provider-detail.js";
import { withGooglePlace } from "../lib/google-place-projection.js";
import { CARE_FEATURE_TAXONOMY } from "../lib/care-feature-taxonomy.js";

const publicUrl = "https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf";
const providerUrl = "https://www.tertianum.ch/fr/etablissement-medico-sociaux/tertianum-les-boveresses";
const source = (type, url) => ({ source_type: type, source_name: type === "public" ? "Canton de Vaud — Liste officielle 2026 des établissements" : "Tertianum", source_url: url, external_record_id: url });

function snapshot() {
  const provider = { id: "provider-1", slug: "ems-boveresses", legacy_id: "ems-boveresses",
    name: "Tertianum Les Boveresses", primary_type: "ems", is_published: false,
    verification_status: "unverified" };
  const organization = { id: "org-1", slug: "tertianum-vaud-sa", name: "Tertianum Vaud SA",
    legal_name: null, website: null, status: "active", verification_status: "unverified",
    is_published: false, last_reviewed_at: null };
  const offering = { id: "offering-1", provider_id: provider.id, slug: "ems",
    name: "Établissement médico-social", offering_type: "ems", summary: null,
    capacity_value: 42, capacity_unit: "beds", long_stay: true, short_stay: null,
    respite_stay: null, admissions_notes: null, financing_notes: null,
    public_interest_status: null, pricing_notes: null, status: "active",
    verification_status: "unverified", is_published: false, last_reviewed_at: null };
  const providerSource = source("provider", providerUrl);
  const codes = ["hairdressing", "occupational_therapy", "palliative_care", "physiotherapy", "podology"];
  return { provider, serviceAreaCount: 0,
    organizationLinks: [{ organization,
      relationship: { provider_id: provider.id, organization_id: organization.id,
        relationship_type: "operator", is_primary: true }, source: source("public", publicUrl) }],
    offerings: [{ offering, availabilityCount: 0,
      sources: [
        { link: { provider_id: provider.id, offering_id: offering.id,
          fields_supported: ["offering_type", "capacity_value", "capacity_unit"] }, source: source("public", publicUrl) },
        { link: { provider_id: provider.id, offering_id: offering.id,
          fields_supported: ["long_stay"] }, source: providerSource },
      ],
      features: codes.map((code) => ({ feature: { provider_id: provider.id, offering_id: offering.id,
        feature_kind: "service", feature_code: code, display_name: CARE_FEATURE_TAXONOMY.service[code],
        details: null, reviewed_at: null }, source: providerSource })),
    }],
  };
}

test("Boveresses care projection exposes only applied offering facts", () => {
  const detail = projectBoveressesCareDetail(snapshot());
  assert.deepEqual(detail.offerings[0], {
    name: "Établissement médico-social", summary: null, careProfiles: [], capacity: "42 lits",
    stayModes: ["Long séjour"], services: ["Coiffure", "Ergothérapie", "Soins palliatifs", "Physiothérapie", "Podologie"],
    accommodation: [], facilities: [],
  });
  assert.deepEqual(detail.operator, { name: "Tertianum Vaud SA" });
  assert.ok(!JSON.stringify(detail).includes("source_url"));
});

test("partial, published, cross-provider, or unsourced care state is hidden", () => {
  for (const change of [
    (value) => { value.offerings[0].offering.capacity_value = null; },
    (value) => { value.offerings[0].offering.is_published = true; },
    (value) => { value.offerings[0].features.pop(); },
    (value) => { value.offerings[0].features[0].feature.provider_id = "other"; },
    (value) => { value.offerings[0].features[0].source.source_url = "https://example.test"; },
  ]) {
    const value = snapshot(); change(value);
    assert.equal(projectBoveressesCareDetail(value), null);
  }
});

test("Google enrichment stays separate and cannot create or overwrite Lia care facts", () => {
  const base = { slug: "ems-boveresses", name: "Tertianum Les Boveresses", type: "ems",
    commune: "Lausanne", npa: "1010", tags: [], detail: projectBoveressesCareDetail(snapshot()) };
  const enriched = withGooglePlace(base, { rating: 4.5, reviews: [], photos: [] });
  assert.deepEqual(enriched.detail.offerings, base.detail.offerings);
  assert.equal(enriched.detail.google.rating, 4.5);
  const noCare = withGooglePlace({ ...base, detail: {} }, { rating: 4.5, reviews: [], photos: [] });
  assert.equal(noCare.detail.offerings, undefined);
});

test("detail normalization hides empty care sections and presents scoped facts", () => {
  const sparse = providerDetailView({ slug: "sparse", name: "Sparse", type: "ems", tags: [] });
  assert.deepEqual(sparse.offerings, []);
  assert.ok(!providerDetailSections(sparse).some(([id]) => id === "accompagnement"));
  const rich = providerDetailView({ slug: "ems-boveresses", name: "Tertianum Les Boveresses",
    type: "ems", tags: ["Gériatrie"], detail: projectBoveressesCareDetail(snapshot()) });
  assert.equal(rich.offerings[0].capacity, "42 lits");
  assert.deepEqual(rich.offerings[0].stayModes, ["Long séjour"]);
  assert.deepEqual(rich.offerings[0].careProfiles, []);
  assert.ok(providerDetailSections(rich).some(([id]) => id === "accompagnement"));
  assert.deepEqual(rich.legacyTags, ["Gériatrie"]);
});
