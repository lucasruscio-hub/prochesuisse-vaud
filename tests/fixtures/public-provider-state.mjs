import { readFileSync } from "node:fs";

export const manifest = JSON.parse(readFileSync(new URL("../../config/vaud-v1-publication-manifest.json", import.meta.url), "utf8"));

export function publicProviderState() {
  const providers = manifest.providers.map((entry, index) => ({
    id: entry.id, slug: entry.slug, name: `Provider ${entry.slug}`, primary_type: entry.category,
    country_code: "CH", postal_code: index % 2 ? "1000" : null,
    locality: index % 2 ? "Lausanne" : null, street: null, house_number: null,
    phone: null, email: null, website: null, description: null,
    status: "active", verification_status: "unverified", is_published: false, last_reviewed_at: null,
  }));
  const providerSources = providers.map((provider) => ({ id: `source-${provider.id}`,
    provider_id: provider.id, source_type: "lia", fields_supported: ["name", "primary_type",
      "postal_code", "locality", "street", "house_number", "phone", "email", "website", "description"] }));
  const offerings = providers.map((provider) => ({ id: `offering-${provider.id}`,
    provider_id: provider.id, name: provider.primary_type === "ems" ? "Hébergement médico-social" : "Aide et soins à domicile",
    offering_type: provider.primary_type === "ems" ? "ems" : "home_care", summary: null,
    capacity_value: null, capacity_unit: null, long_stay: null, short_stay: null,
    respite_stay: null, admissions_notes: null, financing_notes: null,
    public_interest_status: null, pricing_notes: null, status: "active",
    verification_status: "unverified", is_published: false, last_reviewed_at: null,
  }));
  const offeringSources = offerings.map((offering) => ({ provider_id: offering.provider_id,
    offering_id: offering.id, source_id: `source-${offering.provider_id}`,
    fields_supported: ["name", "offering_type"] }));
  const homeInstead = { id: "9fa47aa0-144e-404d-8ce2-c8abd28ba23d", slug: "homeinstead",
    name: "Home Instead Lausanne", primary_type: "domicile", status: "archived",
    verification_status: "unverified", is_published: false, last_reviewed_at: null };
  const dovida = providers.find(({ slug }) => slug === "dovida");
  return { providers: [...providers, homeInstead], providerSources, offerings, offeringSources,
    features: [], serviceAreas: [], organizationLinks: [], organizations: [],
    identityLinks: [{ predecessor_provider_id: homeInstead.id, successor_provider_id: dovida.id,
      relationship_type: "successor" }] };
}

export const readFixtureState = async () => publicProviderState();
