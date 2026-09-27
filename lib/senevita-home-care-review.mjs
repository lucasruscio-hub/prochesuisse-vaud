import { controlledCareFeature } from "./care-feature-taxonomy.js";
import { validateCarePacket } from "./care-review-packet.mjs";

const acceptedFeatureMap = Object.freeze({
  "service.home_nursing": ["service", "home_nursing"],
  "service.basic_care": ["service", "basic_care"],
  "service.daily_life_assistance": ["service", "daily_life_assistance"],
  "service.household_help": ["service", "household_help"],
  "service.complex_care": ["service", "complex_care"],
  "care_profile.dementia_support": ["care_profile", "dementia_support"],
  "service.palliative_care": ["service", "palliative_care"],
  "service.night_watch": ["service", "night_watch"],
  "service.companionship": ["service", "companionship"],
  "service.respite_at_home": ["service", "respite_at_home"],
  "service.family_caregiver_support": ["service", "family_caregiver_support"],
});
const deferredFields = Object.freeze(["service.on_call_24h", "service.continuous_assistance",
  "service.meal_delivery", "service.emergency_call_service", "languages", "coverage.structured"]);
const nonempty = (value) => typeof value === "string" && value.trim() === value && value.length > 0;

function sourceMap(raw) {
  if (!Array.isArray(raw.sources) || raw.sources.length !== 8) throw new Error("Expected eight official sources");
  const sources = new Map();
  for (const source of raw.sources) {
    if (!nonempty(source.id) || sources.has(source.id) || source.kind !== "provider"
      || !nonempty(source.name) || !nonempty(source.titleContext)
      || source.temporalContext !== "current" || source.accessedOn !== "2026-09-27") {
      throw new Error("Invalid Senevita source metadata");
    }
    const url = new URL(source.url);
    if (url.protocol !== "https:" || !/(^|\.)senevita\.ch$/.test(url.hostname)) {
      throw new Error("Senevita pilot requires first-party HTTPS evidence");
    }
    sources.set(source.id, source);
  }
  return sources;
}

function factMap(raw, sources) {
  if (!Array.isArray(raw.facts)) throw new Error("Missing reviewed Senevita facts");
  const facts = new Map();
  for (const fact of raw.facts) {
    if (!nonempty(fact.field) || facts.has(fact.field) || !sources.has(fact.sourceId)
      || !nonempty(fact.evidenceContext) || !["high", "medium"].includes(fact.confidence)
      || !["accepted", "deferred"].includes(fact.reviewStatus)
      || (fact.reviewStatus === "accepted" && fact.value === null)
      || (fact.reviewStatus === "deferred" && fact.value !== null)) {
      throw new Error(`Invalid reviewed fact: ${fact?.field ?? "unknown"}`);
    }
    facts.set(fact.field, fact);
  }
  const required = ["identity.operator", "offering.type", "offering.summary", ...Object.keys(acceptedFeatureMap),
    "coverage.narrative", "admissions", "financing", "pricing", ...deferredFields];
  if (facts.size !== required.length || required.some((field) => !facts.has(field))) {
    throw new Error("Senevita fact inventory is incomplete or expanded without review");
  }
  return facts;
}

const evidence = (field, facts, sources) => {
  const fact = facts.get(field);
  const source = sources.get(fact.sourceId);
  return { researchField: field, kind: source.kind, name: source.name, url: source.url,
    accessedOn: source.accessedOn, evidenceContext: fact.evidenceContext,
    confidence: fact.confidence, reviewStatus: fact.reviewStatus };
};

export function buildSenevitaCarePacket(raw, { localApply = true } = {}) {
  if (raw?.version !== 1 || raw.reviewState !== "care_evidence_reviewed_for_local_pilot"
    || raw.identity?.legacyId !== "senevita-vaud" || raw.identity.slug !== "senevita-vaud"
    || raw.identity.expectedName !== "Senevita Casa Vaud" || raw.identity.expectedType !== "domicile"
    || raw.approval?.localApply !== false || raw.approval.publish !== false || raw.approval.verify !== false
    || !Array.isArray(raw.dataWrites) || raw.dataWrites.length !== 0) {
    throw new Error("Senevita research packet safety or identity mismatch");
  }
  const sources = sourceMap(raw);
  const facts = factMap(raw, sources);
  const fact = (field) => facts.get(field);
  const features = Object.entries(acceptedFeatureMap).map(([field, [kind, code]]) => ({
    ...controlledCareFeature(kind, code), evidence: evidence(field, facts, sources),
  }));
  const packet = {
    version: 1,
    identity: { legacyId: "senevita-vaud", slug: "senevita-vaud",
      expectedName: "Senevita Casa Vaud", expectedType: "domicile" },
    approval: { localApply, publish: false, verify: false },
    organizations: [{ slug: "senevita-ag", name: fact("identity.operator").value,
      relationshipType: "operator", isPrimary: true, evidence: evidence("identity.operator", facts, sources) }],
    offerings: [{
      slug: "home-care", name: "Aide et soins à domicile", offeringType: "home_care",
      typeEvidence: evidence("offering.type", facts, sources),
      summary: { value: fact("offering.summary").value, evidence: evidence("offering.summary", facts, sources) },
      capacity: null, stayModes: { longStay: null, shortStay: null, respiteStay: null },
      careProfiles: ["dementia_support"], features,
      admissions: { value: fact("admissions").value, evidence: evidence("admissions", facts, sources) },
      financing: { value: fact("financing").value, evidence: evidence("financing", facts, sources) },
      publicInterestStatus: null,
      pricing: { value: fact("pricing").value, evidence: evidence("pricing", facts, sources) },
    }],
    serviceAreas: [{ offeringSlug: "home-care", coverageType: "region",
      coverageLabel: fact("coverage.narrative").value, cantonCode: null, municipalityId: null,
      evidence: evidence("coverage.narrative", facts, sources) }],
    deferred: deferredFields.map((field) => ({ field, value: null,
      reason: fact(field).evidenceContext, evidence: evidence(field, facts, sources) })),
    unresolved: [],
  };
  validateCarePacket(packet);
  return packet;
}

export function validateSenevitaReviewPacket(raw) {
  const packet = buildSenevitaCarePacket(raw, { localApply: false });
  return { valid: true, databaseWrites: 0, sources: raw.sources.length, facts: raw.facts.length,
    acceptedFacts: raw.facts.filter((item) => item.reviewStatus === "accepted").length,
    deferredFacts: packet.deferred.length, ...validateCarePacket(packet) };
}

export function validateSenevitaCanonicalPacket(packet, raw) {
  const expected = buildSenevitaCarePacket(raw);
  if (JSON.stringify(packet) !== JSON.stringify(expected)) throw new Error("Stale or altered Senevita canonical packet");
  return validateCarePacket(packet);
}
