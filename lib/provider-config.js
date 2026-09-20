// Controlled identifiers, independent of UI translations. No claims are inferred.
export const PROVIDER_TYPES = Object.freeze({
  ems: "EMS",
  domicile: "Aide à domicile",
  residence: "Résidence senior",
});

export const PROVIDER_STATUSES = Object.freeze(["active", "inactive", "archived"]);
export const VERIFICATION_STATUSES = Object.freeze([
  "unverified", "partially_verified", "verified", "stale",
]);
export const PROVIDER_SOURCE_TYPES = Object.freeze(["public", "provider", "lia", "legacy"]);
export const SERVICE_CODES = Object.freeze({
  dementia_support: "Accompagnement Alzheimer / démence",
  short_stay: "Court séjour",
  long_stay: "Long séjour",
  palliative_care: "Soins palliatifs",
  night_care: "Présence / accompagnement de nuit",
  weekend_service: "Service le week-end",
  nursing: "Soins infirmiers",
  domestic_help: "Aide ménagère",
  companionship: "Compagnie",
  adapted_housing: "Logement adapté",
});
// Initial standard identifiers; this is not a list of languages known for legacy providers.
export const LANGUAGE_CODES = Object.freeze(["fr", "de", "it", "en", "rm"]);

// Exact lexical proposals ONLY. The legacy tags themselves are unverified.
// A reviewer must approve a proposal before a future import populates service_codes.
export const LEGACY_TAG_SERVICE_PROPOSALS = Object.freeze({
  Alzheimer: "dementia_support",
  "Démence": "dementia_support",
  "Court séjour": "short_stay",
  "Long séjour": "long_stay",
  "Soins palliatifs": "palliative_care",
  Nuit: "night_care",
  "Week-end": "weekend_service",
  "Infirmières": "nursing",
  "Aide ménagère": "domestic_help",
  Compagnie: "companionship",
  "Appartement adapté": "adapted_housing",
});

export function proposeLegacyServices(tags) {
  return {
    proposedServiceCodes: [...new Set(tags.flatMap((tag) =>
      Object.hasOwn(LEGACY_TAG_SERVICE_PROPOSALS, tag)
        ? [LEGACY_TAG_SERVICE_PROPOSALS[tag]] : []))],
    unmappedTags: tags.filter((tag) => !Object.hasOwn(LEGACY_TAG_SERVICE_PROPOSALS, tag)),
  };
}

// Preserve the existing filter contract, including its current limitations.
export const SPECIAL_FILTERS = Object.freeze(["Alzheimer", "Court séjour", "Vue lac", "Public"]);
