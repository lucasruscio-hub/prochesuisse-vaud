// The two Phase 3B local pilots are a development preview, never a publication source.
const pilotSources = {
  "ems-boveresses": [
    { type: "provider", url: "https://www.tertianum.ch/fr/etablissement-medico-sociaux/tertianum-les-boveresses",
      fields: ["name", "postal_code", "locality", "phone", "email", "website"] },
    { type: "public", url: "https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf",
      fields: ["primary_type", "canton_code"] },
  ],
  "senevita-vaud": [
    { type: "provider", url: "https://www.senevita.ch/fr/sites/spitex-vaud/",
      fields: ["name", "primary_type", "postal_code", "locality", "phone", "website"] },
  ],
};

export const LOCAL_DETAIL_PILOTS = Object.freeze(Object.keys(pilotSources));

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const empty = (value) => Array.isArray(value) && value.length === 0;
const stringOrNull = (value) => value == null || typeof value === "string";
const approvedSource = (actual, expected) => actual?.source_type === expected.type
  && actual.source_url === expected.url
  && same(actual.fields_supported, expected.fields);

/** Return a client-safe detail DTO only for an intact, unpublished local pilot. */
export function projectLocalReviewedProvider(staticProvider, snapshot) {
  const expectedSources = pilotSources[staticProvider?.slug];
  const row = snapshot?.provider;
  const sources = snapshot?.sources;
  if (!expectedSources || !row || !Array.isArray(sources)
    || row.legacy_id !== staticProvider.slug || row.slug !== staticProvider.slug
    || row.primary_type !== staticProvider.type || row.country_code !== "CH"
    || row.is_published !== false || row.verification_status !== "unverified"
    || row.status !== "active" || row.last_reviewed_at !== null
    || row.original_location_text !== staticProvider.address
    || !same(row.original_tags, staticProvider.tags)
    || row.municipality_id !== null || row.street !== null || row.house_number !== null
    || row.latitude !== null || row.longitude !== null || row.description !== null
    || !empty(row.service_codes) || !empty(row.subtypes) || !empty(row.language_codes)
    || !same(row.attributes, {}) || snapshot.serviceAreaCount !== 0
    || typeof row.name !== "string" || !row.name.trim()
    || !stringOrNull(row.postal_code) || !stringOrNull(row.locality)
    || !stringOrNull(row.phone) || !stringOrNull(row.email) || !stringOrNull(row.website)
    || (staticProvider.slug === "senevita-vaud" && (row.canton_code !== null || row.email !== null))
    || (staticProvider.slug === "ems-boveresses" && row.canton_code !== "VD")) return null;

  const legacy = sources.filter((source) => source.source_type === "legacy");
  const reviewed = sources.filter((source) => source.source_type !== "legacy");
  if (legacy.length !== 1 || legacy[0].external_record_id !== staticProvider.slug
    || reviewed.length !== expectedSources.length
    || !expectedSources.every((expected) => reviewed.some((source) => approvedSource(source, expected)))) return null;

  return {
    ...staticProvider,
    name: row.name,
    type: row.primary_type,
    commune: row.locality,
    npa: row.postal_code,
    // A locality/NPA display label does not claim a street address or service area.
    address: [row.locality, row.postal_code].filter(Boolean).join(" · "),
    detail: { contact: { phone: row.phone, email: row.email, website: row.website } },
  };
}
