import { CARE_FEATURE_TAXONOMY } from "./care-feature-taxonomy.js";

const sourceIsSafe = (source) => {
  if (!source || !["public", "provider", "lia"].includes(source.source_type)
    || typeof source.source_name !== "string" || !source.source_name.trim()
    || source.source_url !== source.external_record_id) return false;
  try {
    const url = new URL(source.source_url);
    return url.protocol === "https:" && !/(^|\.)google(?:usercontent)?\./i.test(url.hostname)
      && !/(^|\.)gstatic\.com$/i.test(url.hostname);
  } catch { return false; }
};
const list = (value) => Array.isArray(value) ? value : [];
const unitLabel = { beds: ["lit", "lits"], places: ["place", "places"],
  apartments: ["appartement", "appartements"], units: ["unité", "unités"] };
const capacityLabel = (value, unit) => Number.isInteger(value) && value > 0 && unitLabel[unit]
  ? `${value} ${unitLabel[unit][value === 1 ? 0 : 1]}` : null;

function projectOrganization(provider, link) {
  const organization = link?.organization;
  const relationship = link?.relationship;
  if (!organization || relationship?.provider_id !== provider.id
    || relationship.organization_id !== organization.id
    || !["operator", "owner", "brand"].includes(relationship.relationship_type)
    || organization.status !== "active" || organization.verification_status !== "unverified"
    || organization.is_published !== false || !sourceIsSafe(link.source)) return null;
  return { relationshipType: relationship.relationship_type, primary: relationship.is_primary === true,
    name: organization.name };
}

function projectOffering(provider, entry) {
  const offering = entry?.offering;
  if (!offering || offering.provider_id !== provider.id || offering.status !== "active"
    || offering.verification_status !== "unverified" || offering.is_published !== false
    || !Array.isArray(entry.sources) || !Array.isArray(entry.features) || entry.availabilityCount !== 0
    || (offering.capacity_value === null) !== (offering.capacity_unit === null)) return null;
  const sourced = new Set();
  for (const item of entry.sources) {
    if (item.link?.provider_id !== provider.id || item.link.offering_id !== offering.id
      || !Array.isArray(item.link.fields_supported) || !sourceIsSafe(item.source)) return null;
    for (const field of item.link.fields_supported) sourced.add(field);
  }
  const required = ["offering_type"];
  if (offering.capacity_value !== null || offering.capacity_unit !== null) required.push("capacity_value", "capacity_unit");
  for (const field of ["long_stay", "short_stay", "respite_stay", "admissions_notes",
    "financing_notes", "public_interest_status", "pricing_notes"]) {
    if (offering[field] !== null) required.push(field);
  }
  if (required.some((field) => !sourced.has(field))) return null;
  const groups = { care_profile: [], service: [], facility: [] };
  const identities = new Set();
  for (const item of entry.features) {
    const feature = item.feature;
    const label = CARE_FEATURE_TAXONOMY[feature?.feature_kind]?.[feature?.feature_code];
    const identity = `${feature?.feature_kind}.${feature?.feature_code}`;
    if (!label || label !== feature.display_name || feature.provider_id !== provider.id
      || feature.offering_id !== offering.id || !sourceIsSafe(item.source)
      || identities.has(identity)) return null;
    identities.add(identity);
    groups[feature.feature_kind].push(label);
  }
  return {
    name: offering.name,
    summary: offering.summary,
    careProfiles: groups.care_profile,
    capacity: capacityLabel(offering.capacity_value, offering.capacity_unit),
    stayModes: [offering.long_stay === true ? "Long séjour" : null,
      offering.short_stay === true ? "Court séjour" : null,
      offering.respite_stay === true ? "Séjour de répit" : null].filter(Boolean),
    services: groups.service,
    accommodation: [],
    facilities: groups.facility,
    admissions: offering.admissions_notes,
    financing: offering.financing_notes,
    pricing: offering.pricing_notes,
    publicInterestStatus: offering.public_interest_status,
  };
}

/** Projects any intact unpublished local care state without exposing provenance rows. */
export function projectReviewedCareDetail(snapshot) {
  const provider = snapshot?.provider;
  if (!provider || provider.status !== "active" || provider.is_published !== false
    || provider.verification_status !== "unverified" || !Array.isArray(snapshot.organizationLinks)
    || !Array.isArray(snapshot.offerings) || snapshot.offerings.length === 0) return null;
  const organizations = snapshot.organizationLinks.map((link) => projectOrganization(provider, link));
  const offerings = snapshot.offerings.map((entry) => projectOffering(provider, entry));
  if (organizations.some((item) => !item) || offerings.some((item) => !item)) return null;
  const primaryOperator = organizations.find((item) => item.relationshipType === "operator" && item.primary);
  const single = offerings.length === 1 ? offerings[0] : null;
  return {
    offerings,
    ...(single?.admissions ? { admissions: single.admissions } : {}),
    ...(single && (single.pricing || single.financing) ? {
      pricing: [single.pricing, single.financing].filter(Boolean).join(" "),
    } : {}),
    ...(primaryOperator ? { operator: { name: primaryOperator.name } } : {}),
    sourceFreshness: { reviewed: true, label: "Informations de soins issues de sources revues", date: null },
  };
}

export const projectBoveressesCareDetail = projectReviewedCareDetail;
