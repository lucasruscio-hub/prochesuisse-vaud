import { CARE_FEATURE_TAXONOMY } from "./care-feature-taxonomy.js";

const feature = (kind, code) => Object.freeze({
  kind, code, displayName: CARE_FEATURE_TAXONOMY[kind][code], requiresExplicitEvidence: true,
});

export const HOME_CARE_V1_CONTRACT = Object.freeze({
  offeringType: "home_care",
  services: Object.freeze({
    nursingCare: feature("service", "home_nursing"),
    personalCare: feature("service", "basic_care"),
    dailyLivingAssistance: feature("service", "daily_life_assistance"),
    householdHelp: feature("service", "household_help"),
    dementiaSupport: feature("care_profile", "dementia_support"),
    palliativeCare: feature("service", "palliative_care"),
    nightCare: feature("service", "night_watch"),
    onCall24h: feature("service", "on_call_24h"),
    companionship: feature("service", "companionship"),
    mealDelivery: feature("service", "meal_delivery"),
    respiteAtHome: feature("service", "respite_at_home"),
    emergencyCallService: feature("service", "emergency_call_service"),
  }),
  narrativeFacts: Object.freeze({
    admissionsOrContact: "care_offerings.admissions_notes",
    reimbursementOrPublicPrivateContext: "care_offerings.financing_notes",
    pricingOrMinimumVisit: "care_offerings.pricing_notes",
    languages: "providers.language_codes",
  }),
  coverage: Object.freeze({
    structured: Object.freeze({
      relation: "provider_service_areas",
      types: Object.freeze(["municipality", "canton"]),
      use: "filtering",
      requiresExplicitEvidence: true,
    }),
    narrative: Object.freeze({
      relation: "provider_service_areas",
      type: "region",
      field: "coverage_label",
      use: "display_only",
      createsMunicipalityCoverage: false,
      requiresExplicitEvidence: true,
    }),
  }),
  unknownFacts: "absent",
});
