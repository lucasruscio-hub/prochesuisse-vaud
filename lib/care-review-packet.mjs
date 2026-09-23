import { controlledCareFeature, projectControlledCareFeatures } from "./care-feature-taxonomy.js";

const BOVERESSES_PROVIDER_URL = "https://www.tertianum.ch/fr/etablissement-medico-sociaux/tertianum-les-boveresses";
const BOVERESSES_PUBLIC_URL = "https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf";
const offeringTypes = new Set(["ems", "home_care", "senior_residence", "medicalized_care_unit"]);
const providerTypes = new Set(["ems", "domicile", "residence"]);
const capacityUnits = new Set(["beds", "places", "apartments", "units"]);
const sourceKinds = new Set(["public", "provider", "lia"]);
const featureClaims = Object.freeze([
  ["service.palliative_care", "palliative_care"],
  ["service.physiotherapy", "physiotherapy"],
  ["service.occupational_therapy", "occupational_therapy"],
  ["service.podology", "podology"],
  ["service.hairdresser", "hairdressing"],
]);

const nonempty = (value) => typeof value === "string" && Boolean(value.trim());
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function exactClaim(research, field, value) {
  const matches = research?.claims?.filter((claim) => claim.field === field && claim.value === value) ?? [];
  if (matches.length !== 1 || !matches[0].evidence) throw new Error(`Missing unique reviewed research claim: ${field}`);
  return structuredClone(matches[0].evidence);
}

function evidence(field, source) {
  return { researchField: field, ...source };
}

export function validateCareEvidence(value, label = "care fact") {
  if (!value || !nonempty(value.researchField) || !sourceKinds.has(value.kind)
    || !nonempty(value.name) || !nonempty(value.url) || !/^\d{4}-\d{2}-\d{2}$/.test(value.accessedOn ?? "")) {
    throw new Error(`${label} requires exact reviewed source evidence`);
  }
  let url;
  try { url = new URL(value.url); } catch { throw new Error(`${label} requires a valid source URL`); }
  if (url.protocol !== "https:" || /(^|\.)google(?:usercontent)?\./i.test(url.hostname)
    || /(^|\.)gstatic\.com$/i.test(url.hostname)) {
    throw new Error(`${label} cannot use Google or a non-HTTPS source as Lia care evidence`);
  }
  return value;
}

function validateNullableTextFact(fact, label) {
  if (fact === null) return;
  if (!nonempty(fact?.value)) throw new Error(`${label} must be null or sourced non-empty text`);
  validateCareEvidence(fact.evidence, label);
}

export function validateCarePacket(packet) {
  if (!packet || packet.version !== 1 || !nonempty(packet.identity?.legacyId)
    || packet.identity.slug !== packet.identity.legacyId || !nonempty(packet.identity.expectedName)
    || !providerTypes.has(packet.identity.expectedType) || packet.approval?.publish !== false
    || packet.approval?.verify !== false || typeof packet.approval.localApply !== "boolean"
    || !Array.isArray(packet.organizations) || !Array.isArray(packet.offerings) || !packet.offerings.length
    || !Array.isArray(packet.deferred) || !Array.isArray(packet.unresolved)) {
    throw new Error("Invalid care packet structure or approval state");
  }
  const organizationSlugs = new Set();
  for (const organization of packet.organizations) {
    if (!nonempty(organization?.slug) || !nonempty(organization.name)
      || !["operator", "owner", "brand"].includes(organization.relationshipType)
      || typeof organization.isPrimary !== "boolean" || organizationSlugs.has(organization.slug)) {
      throw new Error("Invalid or duplicate care organization");
    }
    organizationSlugs.add(organization.slug);
    validateCareEvidence(organization.evidence, `organization ${organization.slug}`);
  }
  if (packet.organizations.filter((item) => item.relationshipType === "operator" && item.isPrimary).length > 1) {
    throw new Error("A provider can have only one primary operator");
  }

  const offeringSlugs = new Set();
  let featureCount = 0;
  for (const offering of packet.offerings) {
    if (!nonempty(offering?.slug) || !nonempty(offering.name) || !offeringTypes.has(offering.offeringType)
      || offeringSlugs.has(offering.slug) || !Array.isArray(offering.features)
      || !offering.stayModes || !Array.isArray(offering.careProfiles)) {
      throw new Error("Invalid or duplicate care offering");
    }
    offeringSlugs.add(offering.slug);
    validateCareEvidence(offering.typeEvidence, `offering ${offering.slug} type`);
    if (offering.capacity !== null) {
      if (!Number.isInteger(offering.capacity?.value) || offering.capacity.value <= 0
        || !capacityUnits.has(offering.capacity.unit)) throw new Error("Capacity must be a positive sourced value and known unit");
      validateCareEvidence(offering.capacity.evidence, `offering ${offering.slug} capacity`);
    }
    if (!same(Object.keys(offering.stayModes).sort(), ["longStay", "respiteStay", "shortStay"])) {
      throw new Error("Every stay mode must be explicitly present and nullable");
    }
    for (const [mode, fact] of Object.entries(offering.stayModes)) {
      if (fact !== null && typeof fact?.value !== "boolean") throw new Error(`Invalid stay mode: ${mode}`);
      if (fact) validateCareEvidence(fact.evidence, `offering ${offering.slug} ${mode}`);
    }
    const projected = projectControlledCareFeatures(offering.features.map((feature) => ({
      kind: feature.kind, code: feature.code, details: feature.details,
    })));
    if (!same(projected, offering.features.map((feature) => ({
      kind: feature.kind, code: feature.code, displayName: feature.displayName, details: feature.details,
    })))) throw new Error("Care feature labels or codes do not match the controlled taxonomy");
    for (const feature of offering.features) validateCareEvidence(feature.evidence,
      `offering ${offering.slug} feature ${feature.kind}.${feature.code}`);
    const profileCodes = offering.features.filter((item) => item.kind === "care_profile").map((item) => item.code);
    if (!same(offering.careProfiles, profileCodes)) {
      throw new Error("careProfiles must list exactly the sourced care-profile feature codes");
    }
    validateNullableTextFact(offering.admissions, `offering ${offering.slug} admissions`);
    validateNullableTextFact(offering.financing, `offering ${offering.slug} financing`);
    validateNullableTextFact(offering.pricing, `offering ${offering.slug} pricing`);
    if (offering.publicInterestStatus !== null) {
      if (!["recognized", "not_recognized"].includes(offering.publicInterestStatus?.value)) {
        throw new Error("Invalid public-interest status");
      }
      validateCareEvidence(offering.publicInterestStatus.evidence, `offering ${offering.slug} public-interest status`);
    }
    featureCount += offering.features.length;
  }
  for (const item of packet.deferred) {
    if (!nonempty(item?.field) || !nonempty(item.reason)) throw new Error("Deferred claims require a field and reason");
    if (item.evidence) validateCareEvidence(item.evidence, `deferred ${item.field}`);
  }
  for (const item of packet.unresolved) {
    if (!nonempty(item?.code) || !nonempty(item.description)) throw new Error("Unresolved issues require a code and description");
  }
  return {
    valid: true,
    localApplyReady: packet.approval.localApply && packet.unresolved.length === 0,
    offeringCount: packet.offerings.length,
    importedFeatureCount: featureCount,
    deferredCount: packet.deferred.length,
    unresolvedCount: packet.unresolved.length,
  };
}

export function buildBoveressesCarePacket(phase3) {
  if (phase3?.identity?.legacyId !== "ems-boveresses" || phase3.identity.slug !== "ems-boveresses"
    || phase3.identity.expectedType !== "ems" || phase3.approval?.publish !== false
    || phase3.approval?.verify !== false || phase3.legacyTagsVerified !== false) {
    throw new Error("Unexpected Phase 3B Boveresses packet");
  }
  const operator = exactClaim(phase3, "identity.operator", "Tertianum Vaud SA");
  const type = exactClaim(phase3, "identity.type", "ems");
  const capacity = exactClaim(phase3, "capacity.beds", 42);
  const longStay = exactClaim(phase3, "service.long_term_care", "long_term_care");
  const features = featureClaims.map(([field, code]) => {
    const sourceValue = field === "service.hairdresser" ? "hairdresser" : code;
    return { ...controlledCareFeature("service", code), evidence: evidence(field, exactClaim(phase3, field, sourceValue)) };
  });
  const combinedStay = exactClaim(phase3, "service.short_respite_stay", "short_respite_stay");
  if (operator.url !== BOVERESSES_PUBLIC_URL || type.url !== BOVERESSES_PUBLIC_URL
    || capacity.url !== BOVERESSES_PUBLIC_URL || longStay.url !== BOVERESSES_PROVIDER_URL
    || features.some((feature) => feature.evidence.url !== BOVERESSES_PROVIDER_URL)) {
    throw new Error("Unexpected evidence source in Phase 3B packet");
  }
  const packet = {
    version: 1,
    identity: { legacyId: "ems-boveresses", slug: "ems-boveresses",
      expectedName: "Tertianum Les Boveresses", expectedType: "ems" },
    approval: { localApply: false, publish: false, verify: false },
    organizations: [{ slug: "tertianum-vaud-sa", name: "Tertianum Vaud SA",
      relationshipType: "operator", isPrimary: true, evidence: evidence("identity.operator", operator) }],
    offerings: [{
      slug: "ems", name: "Établissement médico-social", offeringType: "ems",
      typeEvidence: evidence("identity.type", type),
      capacity: { value: 42, unit: "beds", evidence: evidence("capacity.beds", capacity) },
      stayModes: { longStay: { value: true, evidence: evidence("service.long_term_care", longStay) },
        shortStay: null, respiteStay: null },
      careProfiles: [], features,
      admissions: null, financing: null, publicInterestStatus: null, pricing: null,
    }],
    deferred: [
      { field: "service.short_respite_stay", value: "short_respite_stay",
        reason: "The reviewed claim combines short stay and respite; it cannot safely populate either independent field.",
        evidence: evidence("service.short_respite_stay", combinedStay) },
      { field: "care_profile", value: [...phase3.legacyTags],
        reason: "Legacy tags remain explicitly unverified and cannot become controlled care-profile facts." },
      { field: "availability", value: null,
        reason: "No timestamped availability observation exists in the reviewed packet." },
    ],
    unresolved: [],
  };
  validateCarePacket(packet);
  return packet;
}

export const validateBoveressesCarePacket = validateCarePacket;
