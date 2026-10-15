import "server-only";

const queries = Object.freeze({
  providers: "id,slug,name,primary_type,country_code,postal_code,locality,street,house_number,phone,email,website,description,status,verification_status,is_published,last_reviewed_at",
  providerSources: "id,provider_id,source_type,fields_supported",
  offerings: "id,provider_id,name,offering_type,summary,capacity_value,capacity_unit,long_stay,short_stay,respite_stay,admissions_notes,financing_notes,public_interest_status,pricing_notes,status,verification_status,is_published,last_reviewed_at",
  offeringSources: "provider_id,offering_id,source_id,fields_supported",
  features: "provider_id,offering_id,feature_kind,feature_code,display_name,source_id",
  serviceAreas: "provider_id,care_offering_id,coverage_type,coverage_label,canton_code,municipality_id,source_id",
  organizationLinks: "provider_id,organization_id,relationship_type,is_primary,source_id",
  organizations: "id,name,status,verification_status,is_published,last_reviewed_at",
  identityLinks: "predecessor_provider_id,successor_provider_id,relationship_type",
});

async function defaultClient() {
  const { supabase } = await import("./supabase.js");
  return supabase;
}

export async function readCanonicalProviderState(client) {
  const database = client ?? await defaultClient();
  const requests = [
    ["providers", "providers"], ["providerSources", "provider_sources"],
    ["offerings", "care_offerings"], ["offeringSources", "care_offering_sources"],
    ["features", "care_offering_features"], ["serviceAreas", "provider_service_areas"],
    ["organizationLinks", "provider_organizations"], ["organizations", "organizations"],
    ["identityLinks", "provider_identity_links"],
  ];
  const results = await Promise.all(requests.map(([key, table]) => database.from(table).select(queries[key])));
  const state = {};
  results.forEach((result, index) => {
    if (result.error) throw new Error(`Canonical provider read failed for ${requests[index][1]}: ${result.error.message}`);
    state[requests[index][0]] = result.data ?? [];
  });
  return state;
}
