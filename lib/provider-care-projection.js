import { CARE_FEATURE_TAXONOMY } from "./care-feature-taxonomy.js";

const PUBLIC_URL = "https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf";
const PROVIDER_URL = "https://www.tertianum.ch/fr/etablissement-medico-sociaux/tertianum-les-boveresses";
const expectedServices = Object.freeze([
  "hairdressing", "occupational_therapy", "palliative_care", "physiotherapy", "podology",
]);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const expectedSource = (source, type, url) => source?.source_type === type
  && source.source_url === url && source.external_record_id === url;

/** Converts an exact, guarded local Phase 4B snapshot into a client-safe detail fragment. */
export function projectBoveressesCareDetail(snapshot) {
  const provider = snapshot?.provider;
  const links = snapshot?.organizationLinks;
  const offerings = snapshot?.offerings;
  if (provider?.slug !== "ems-boveresses" || provider.legacy_id !== "ems-boveresses"
    || provider.name !== "Tertianum Les Boveresses" || provider.primary_type !== "ems"
    || provider.is_published !== false || provider.verification_status !== "unverified"
    || snapshot.serviceAreaCount !== 0 || !Array.isArray(links) || links.length !== 1
    || !Array.isArray(offerings) || offerings.length !== 1) return null;

  const { organization, relationship, source: operatorSource } = links[0];
  if (organization?.slug !== "tertianum-vaud-sa" || organization.name !== "Tertianum Vaud SA"
    || organization.legal_name !== null || organization.website !== null || organization.status !== "active"
    || organization.verification_status !== "unverified" || organization.is_published !== false
    || organization.last_reviewed_at !== null || relationship?.provider_id !== provider.id
    || relationship.organization_id !== organization.id || relationship.relationship_type !== "operator"
    || relationship.is_primary !== true || !expectedSource(operatorSource, "public", PUBLIC_URL)) return null;

  const entry = offerings[0];
  const offering = entry?.offering;
  if (!offering || offering.provider_id !== provider.id || offering.slug !== "ems"
    || offering.name !== "Établissement médico-social" || offering.offering_type !== "ems"
    || offering.summary !== null || offering.capacity_value !== 42 || offering.capacity_unit !== "beds"
    || offering.long_stay !== true || offering.short_stay !== null || offering.respite_stay !== null
    || offering.admissions_notes !== null || offering.financing_notes !== null
    || offering.public_interest_status !== null || offering.pricing_notes !== null
    || offering.status !== "active" || offering.verification_status !== "unverified"
    || offering.is_published !== false || offering.last_reviewed_at !== null
    || entry.availabilityCount !== 0 || !Array.isArray(entry.sources) || entry.sources.length !== 2
    || !Array.isArray(entry.features) || entry.features.length !== expectedServices.length) return null;

  const sourceByType = Object.fromEntries(entry.sources.map((item) => [item.source?.source_type, item]));
  const publicLink = sourceByType.public;
  const providerLink = sourceByType.provider;
  if (!expectedSource(publicLink?.source, "public", PUBLIC_URL)
    || !expectedSource(providerLink?.source, "provider", PROVIDER_URL)
    || publicLink.link?.provider_id !== provider.id || publicLink.link.offering_id !== offering.id
    || providerLink.link?.provider_id !== provider.id || providerLink.link.offering_id !== offering.id
    || !same(publicLink.link.fields_supported, ["offering_type", "capacity_value", "capacity_unit"])
    || !same(providerLink.link.fields_supported, ["long_stay"])) return null;

  const projectedFeatures = entry.features.map(({ feature, source }) => {
    if (feature?.provider_id !== provider.id || feature.offering_id !== offering.id
      || feature.feature_kind !== "service" || feature.details !== null || feature.reviewed_at !== null
      || !expectedSource(source, "provider", PROVIDER_URL)
      || CARE_FEATURE_TAXONOMY.service[feature.feature_code] !== feature.display_name) return null;
    return { code: feature.feature_code, label: feature.display_name };
  });
  if (projectedFeatures.some((feature) => !feature)
    || !same(projectedFeatures.map((feature) => feature.code).sort(), [...expectedServices])) return null;

  return {
    offerings: [{
      name: offering.name,
      summary: null,
      careProfiles: [],
      capacity: "42 lits",
      stayModes: ["Long séjour"],
      services: projectedFeatures.map((feature) => feature.label),
      accommodation: [],
      facilities: [],
    }],
    operator: { name: organization.name },
    sourceFreshness: { reviewed: true, label: "Informations de soins issues de sources officielles revues", date: null },
  };
}
