import { CARE_FEATURE_TAXONOMY } from "./care-feature-taxonomy.js";

const PUBLIC_VERIFICATION = new Set(["partially_verified", "verified"]);
const STAGED_VERIFICATION = "unverified";
const text = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const list = (value) => Array.isArray(value) ? value : [];
const dateOnly = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? value : null;

function manifestIndex(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || !dateOnly(manifest.reviewedOn)
    || !Array.isArray(manifest.providers)) throw new Error("Invalid Vaud V1 publication manifest");
  const entries = new Map();
  const ids = new Set();
  for (const entry of manifest.providers) {
    if (!entry || typeof entry.id !== "string" || typeof entry.slug !== "string"
      || !["ems", "domicile", "residence"].includes(entry.category)
      || entries.has(entry.slug) || ids.has(entry.id)) throw new Error("Invalid or duplicate manifest identity");
    entries.set(entry.slug, entry);
    ids.add(entry.id);
  }
  return entries;
}

function publicationMode(row, entry, manifest) {
  if (!row || row.id !== entry.id || row.slug !== entry.slug || row.primary_type !== entry.category
    || row.status !== "active") return null;
  if (row.is_published === true && PUBLIC_VERIFICATION.has(row.verification_status)
    && text(row.last_reviewed_at)) return "database";
  const staged = manifest.transitionalDatabaseState;
  if (row.is_published === staged?.isPublished
    && row.verification_status === staged?.verificationStatus
    && row.last_reviewed_at === staged?.lastReviewedAt) return "reviewed_manifest";
  return null;
}

function sourceIndexes(state) {
  const byId = new Map(list(state.providerSources).map((source) => [source.id, source]));
  const providerFields = new Map();
  for (const source of list(state.providerSources)) {
    if (!["public", "provider", "lia"].includes(source.source_type)) continue;
    const supported = providerFields.get(source.provider_id) ?? new Set();
    for (const field of list(source.fields_supported)) supported.add(field);
    providerFields.set(source.provider_id, supported);
  }
  const offeringFields = new Map();
  for (const link of list(state.offeringSources)) {
    const source = byId.get(link.source_id);
    if (!source || source.provider_id !== link.provider_id
      || !["public", "provider", "lia"].includes(source.source_type)) continue;
    const supported = offeringFields.get(link.offering_id) ?? new Set();
    for (const field of list(link.fields_supported)) supported.add(field);
    offeringFields.set(link.offering_id, supported);
  }
  return { byId, providerFields, offeringFields };
}

function offeringIsVisible(offering, mode, supported) {
  if (!offering || offering.status !== "active" || !supported?.has("offering_type")) return false;
  if (mode === "database") return offering.is_published === true
    && PUBLIC_VERIFICATION.has(offering.verification_status) && text(offering.last_reviewed_at);
  return offering.is_published === false && offering.verification_status === STAGED_VERIFICATION
    && offering.last_reviewed_at === null;
}

function capacityLabel(value, unit) {
  const labels = { beds: ["lit", "lits"], places: ["place", "places"],
    apartments: ["appartement", "appartements"], units: ["unité", "unités"] };
  return Number.isInteger(value) && value > 0 && labels[unit]
    ? `${value} ${labels[unit][value === 1 ? 0 : 1]}` : null;
}

function projectOffering(offering, supported, state, sourceById) {
  const features = list(state.features).filter((feature) => feature.provider_id === offering.provider_id
    && feature.offering_id === offering.id && sourceById.get(feature.source_id)?.provider_id === offering.provider_id);
  const featureGroups = { care_profile: [], service: [], facility: [] };
  for (const feature of features) {
    const label = CARE_FEATURE_TAXONOMY[feature.feature_kind]?.[feature.feature_code];
    if (label && label === feature.display_name) featureGroups[feature.feature_kind].push(label);
  }
  const coverage = list(state.serviceAreas).filter((area) => area.provider_id === offering.provider_id
    && area.care_offering_id === offering.id && sourceById.get(area.source_id)?.provider_id === offering.provider_id)
    .map((area) => area.coverage_type === "region" ? text(area.coverage_label)
      : area.coverage_type === "canton" && /^[A-Z]{2}$/.test(area.canton_code ?? "")
        ? `Canton ${area.canton_code}` : null).filter(Boolean);
  const stayModes = [
    supported.has("long_stay") && offering.long_stay === true ? "Long séjour" : null,
    supported.has("short_stay") && offering.short_stay === true ? "Court séjour" : null,
    supported.has("respite_stay") && offering.respite_stay === true ? "Séjour de répit" : null,
  ].filter(Boolean);
  const capacity = supported.has("capacity_value") && supported.has("capacity_unit")
    ? capacityLabel(offering.capacity_value, offering.capacity_unit) : null;
  return {
    name: offering.name,
    summary: supported.has("summary") ? text(offering.summary) : null,
    careProfiles: featureGroups.care_profile,
    capacity,
    stayModes,
    services: featureGroups.service,
    coverage,
    unknownNotice: "Les prestations et zones non affichées restent non confirmées.",
    accommodation: [],
    facilities: featureGroups.facility,
    admissions: supported.has("admissions_notes") ? text(offering.admissions_notes) : null,
    financing: supported.has("financing_notes") ? text(offering.financing_notes) : null,
    pricing: supported.has("pricing_notes") ? text(offering.pricing_notes) : null,
    publicInterestStatus: supported.has("public_interest_status") ? offering.public_interest_status : null,
  };
}

function heroImage(value) {
  if (!value || value.origin !== "provider" || !text(value.url) || !text(value.alt)
    || !text(value.sourceUrl) || !text(value.credit) || !text(value.rightsBasis)
    || !dateOnly(value.reviewedAt)) return null;
  try {
    const url = new URL(value.url);
    const source = new URL(value.sourceUrl);
    if (url.protocol !== "https:" || source.protocol !== "https:") return null;
  } catch { return null; }
  return { origin: "provider", url: value.url, alt: value.alt, sourceUrl: value.sourceUrl,
    credit: value.credit, rightsBasis: value.rightsBasis, reviewedAt: value.reviewedAt };
}

function displayLocation(provider, supported) {
  const street = [supported.has("street") ? text(provider.street) : null,
    supported.has("house_number") ? text(provider.house_number) : null].filter(Boolean).join(" ");
  const localityName = supported.has("locality") ? text(provider.locality) : null;
  const postalCode = supported.has("postal_code") ? text(provider.postal_code) : null;
  const locality = [postalCode, localityName].filter(Boolean).join(" ");
  return {
    locality: localityName,
    postalCode,
    address: street || null,
    displayLabel: [street, locality].filter(Boolean).join(", ") || "Canton de Vaud",
  };
}

function projectProvider(provider, entry, manifest, state, indexes, googleRegistry) {
  const mode = publicationMode(provider, entry, manifest);
  if (!mode) return null;
  const offerings = list(state.offerings).filter((offering) => offering.provider_id === provider.id
    && offeringIsVisible(offering, mode, indexes.offeringFields.get(offering.id)))
    .map((offering) => projectOffering(offering, indexes.offeringFields.get(offering.id), state, indexes.byId));
  if (!offerings.length) return null;
  const operatorLink = list(state.organizationLinks).find((link) => link.provider_id === provider.id
    && link.relationship_type === "operator" && link.is_primary === true
    && indexes.byId.get(link.source_id)?.provider_id === provider.id);
  const operator = operatorLink ? list(state.organizations).find((item) => item.id === operatorLink.organization_id
    && item.status === "active" && (mode === "database"
      ? item.is_published === true && PUBLIC_VERIFICATION.has(item.verification_status) && text(item.last_reviewed_at)
      : item.is_published === false && item.verification_status === STAGED_VERIFICATION
        && item.last_reviewed_at === null)) : null;
  const providerFields = indexes.providerFields.get(provider.id) ?? new Set();
  const location = displayLocation(provider, providerFields);
  const badges = [...new Set(offerings.flatMap((offering) => [
    ...offering.careProfiles, ...offering.services, ...offering.facilities, ...offering.stayModes,
    offering.publicInterestStatus === "recognized" ? "Public" : null,
  ].filter(Boolean)))];
  const media = heroImage(entry.heroImage);
  const googlePlace = googleRegistry?.[provider.slug];
  const single = offerings.length === 1 ? offerings[0] : null;
  return {
    id: provider.id,
    slug: provider.slug,
    name: provider.name,
    category: provider.primary_type,
    type: provider.primary_type,
    location,
    commune: location.locality ?? "Canton de Vaud",
    npa: location.postalCode ?? "",
    address: location.displayLabel,
    badges,
    lia: {
      verificationStatus: provider.verification_status,
      reviewedAt: mode === "database" ? provider.last_reviewed_at : manifest.reviewedOn,
      publicationBasis: mode,
    },
    ...(media ? { heroImage: media } : {}),
    ...(googlePlace ? { approvedGooglePlace: { placeId: googlePlace.placeId } } : {}),
    detail: {
      ...(media ? { photos: [{ src: media.url, alt: media.alt, sourceUrl: media.sourceUrl,
        credit: media.credit, rightsBasis: media.rightsBasis }] } : {}),
      ...(providerFields.has("description") && text(provider.description)
        ? { overview: { text: provider.description, verified: true } } : {}),
      contact: {
        phone: providerFields.has("phone") ? text(provider.phone) : null,
        email: providerFields.has("email") ? text(provider.email) : null,
        website: providerFields.has("website") ? text(provider.website) : null,
      },
      location: { address: location.displayLabel },
      offerings,
      ...(single?.admissions ? { admissions: single.admissions } : {}),
      ...(single && (single.pricing || single.financing) ? {
        pricing: [single.pricing, single.financing].filter(Boolean).join(" "),
      } : {}),
      ...(operator ? { operator: { name: operator.name } } : {}),
      sourceFreshness: { reviewed: true, label: mode === "database"
        ? "Informations revues et publiées par Lia" : "Cohorte Vaud V1 revue par Lia",
      date: mode === "database" ? provider.last_reviewed_at : manifest.reviewedOn },
    },
  };
}

export function projectPublicProviders(state, manifest, { googleRegistry = {} } = {}) {
  const entries = manifestIndex(manifest);
  const providers = new Map(list(state.providers).map((provider) => [provider.slug, provider]));
  const indexes = sourceIndexes(state);
  return [...entries.values()].map((entry) => projectProvider(providers.get(entry.slug), entry,
    manifest, state, indexes, googleRegistry)).filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export function resolvePublicProviderRoute(slug, projected, state, redirects = {}) {
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { kind: "not_found" };
  const exact = projected.find((provider) => provider.slug === slug);
  if (exact) return { kind: "provider", provider: exact };
  const targetSlug = redirects[slug];
  if (!targetSlug) return { kind: "not_found" };
  const target = projected.find((provider) => provider.slug === targetSlug);
  const predecessor = list(state.providers).find((provider) => provider.slug === slug);
  const successor = target && list(state.identityLinks).some((link) => link.predecessor_provider_id === predecessor?.id
    && link.successor_provider_id === target.id && link.relationship_type === "successor");
  return successor ? { kind: "redirect", slug: target.slug } : { kind: "not_found" };
}

export const VAUD_V1_REDIRECTS = Object.freeze({ homeinstead: "dovida" });
