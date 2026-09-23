import { controlledCareFeature } from "./care-feature-taxonomy.js";

const REQUIRED_PROVIDER_URL = "https://www.tertianum.ch/fr/etablissement-medico-sociaux/tertianum-les-boveresses";
const REQUIRED_PUBLIC_URL = "https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf";

const featureClaims = Object.freeze([
  ["service.palliative_care", "palliative_care"],
  ["service.physiotherapy", "physiotherapy"],
  ["service.occupational_therapy", "occupational_therapy"],
  ["service.podology", "podology"],
  // The reviewed research used a source label; V1 stores one canonical concept.
  ["service.hairdresser", "hairdressing"],
]);

function exactClaim(phase3, field, value) {
  const matches = phase3?.claims?.filter((claim) => claim.field === field && claim.value === value) ?? [];
  if (matches.length !== 1 || !matches[0].evidence) throw new Error(`Missing unique reviewed Phase 3B claim: ${field}`);
  return structuredClone(matches[0].evidence);
}

function evidence(field, source) {
  return { phase3Field: field, ...source };
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
  if (operator.url !== REQUIRED_PUBLIC_URL || type.url !== REQUIRED_PUBLIC_URL || capacity.url !== REQUIRED_PUBLIC_URL
    || longStay.url !== REQUIRED_PROVIDER_URL || features.some((feature) => feature.evidence.url !== REQUIRED_PROVIDER_URL)) {
    throw new Error("Unexpected evidence source in Phase 3B packet");
  }

  return {
    version: 1,
    identity: {
      legacyId: "ems-boveresses", slug: "ems-boveresses",
      expectedName: "Tertianum Les Boveresses", expectedType: "ems",
    },
    approval: { localApply: false, publish: false, verify: false },
    organization: {
      slug: "tertianum-vaud-sa", name: "Tertianum Vaud SA",
      relationshipType: "operator", isPrimary: true,
      evidence: evidence("identity.operator", operator),
    },
    offering: {
      slug: "ems", name: "Établissement médico-social", offeringType: "ems",
      typeEvidence: evidence("identity.type", type),
      capacity: { value: 42, unit: "beds", evidence: evidence("capacity.beds", capacity) },
      stayModes: {
        longStay: { value: true, evidence: evidence("service.long_term_care", longStay) },
        shortStay: null,
        respiteStay: null,
      },
      careProfiles: [],
      features,
      admissions: null,
      financing: null,
      publicInterestStatus: null,
      pricing: null,
    },
    deferred: [
      { field: "service.short_respite_stay", value: "short_respite_stay",
        reason: "The reviewed claim combines short stay and respite; it cannot safely populate either independent field.",
        evidence: evidence("service.short_respite_stay", combinedStay) },
      { field: "care_profile", value: [...phase3.legacyTags],
        reason: "Legacy tags remain explicitly unverified and cannot become controlled care-profile facts." },
      { field: "availability", value: null,
        reason: "No timestamped availability observation exists in the reviewed packet." },
    ],
  };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function validateBoveressesCarePacket(packet) {
  if (!packet || packet.version !== 1 || packet.identity?.legacyId !== "ems-boveresses"
    || packet.identity.slug !== "ems-boveresses" || packet.identity.expectedName !== "Tertianum Les Boveresses"
    || packet.identity.expectedType !== "ems" || packet.approval?.publish !== false
    || packet.approval?.verify !== false || typeof packet.approval.localApply !== "boolean"
    || packet.organization?.slug !== "tertianum-vaud-sa" || packet.organization.name !== "Tertianum Vaud SA"
    || packet.organization.relationshipType !== "operator" || packet.organization.isPrimary !== true
    || packet.offering?.slug !== "ems" || packet.offering.name !== "Établissement médico-social"
    || packet.offering.offeringType !== "ems" || packet.offering.capacity?.value !== 42
    || packet.offering.capacity.unit !== "beds" || packet.offering.stayModes?.longStay?.value !== true
    || packet.offering.stayModes.shortStay !== null || packet.offering.stayModes.respiteStay !== null
    || !Array.isArray(packet.offering.careProfiles) || packet.offering.careProfiles.length !== 0
    || packet.offering.admissions !== null || packet.offering.financing !== null
    || packet.offering.publicInterestStatus !== null || packet.offering.pricing !== null
    || !Array.isArray(packet.offering.features) || packet.offering.features.length !== featureClaims.length
    || !Array.isArray(packet.deferred) || packet.deferred.length !== 3) {
    throw new Error("Invalid Boveresses care packet structure or approval state");
  }
  const projected = packet.offering.features.map((feature) => controlledCareFeature(
    feature.kind, feature.code, feature.details,
  ));
  if (!same(projected, packet.offering.features.map((feature) => ({
    kind: feature.kind, code: feature.code, displayName: feature.displayName, details: feature.details,
  })))) {
    throw new Error("Care feature labels or codes do not match the controlled taxonomy");
  }
  const evidenceItems = [packet.organization.evidence, packet.offering.typeEvidence,
    packet.offering.capacity.evidence, packet.offering.stayModes.longStay.evidence,
    ...packet.offering.features.map((feature) => feature.evidence)];
  if (evidenceItems.some((item) => !item || !["provider", "public"].includes(item.kind)
    || typeof item.name !== "string" || !item.name.trim() || typeof item.url !== "string"
    || ![REQUIRED_PROVIDER_URL, REQUIRED_PUBLIC_URL].includes(item.url)
    || item.accessedOn !== "2026-09-21" || typeof item.phase3Field !== "string")) {
    throw new Error("Every imported care fact requires approved Phase 3B evidence");
  }
  return {
    valid: true,
    localApplyReady: packet.approval.localApply,
    importedFeatureCount: packet.offering.features.length,
    deferredCount: packet.deferred.length,
  };
}
