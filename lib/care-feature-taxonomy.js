export const CARE_FEATURE_KINDS = Object.freeze(["care_profile", "service", "facility"]);

export const CARE_FEATURE_TAXONOMY = Object.freeze({
  care_profile: Object.freeze({
    geriatric_care: "Accompagnement gériatrique",
    dementia_support: "Accompagnement des troubles cognitifs",
    psychiatric_care: "Accompagnement psychiatrique",
  }),
  service: Object.freeze({
    palliative_care: "Soins palliatifs",
    physiotherapy: "Physiothérapie",
    occupational_therapy: "Ergothérapie",
    podology: "Podologie",
    hairdressing: "Coiffure",
    home_nursing: "Soins infirmiers à domicile",
    basic_care: "Soins de base",
    daily_life_assistance: "Aide à la vie quotidienne",
    household_help: "Aide au ménage",
    complex_care: "Soins complexes",
    night_watch: "Veille de nuit",
    continuous_assistance: "Assistance continue",
    family_caregiver_support: "Soutien aux proches aidants",
  }),
  facility: Object.freeze({
    emergency_call_system: "Système d’appel d’urgence",
  }),
});

export function controlledCareFeature(kind, code, details = null) {
  if (!CARE_FEATURE_KINDS.includes(kind) || typeof code !== "string"
    || !Object.hasOwn(CARE_FEATURE_TAXONOMY[kind], code)) {
    throw new Error(`Unsupported controlled care feature: ${kind}.${code}`);
  }
  if (details !== null && (typeof details !== "string" || !details.trim())) {
    throw new Error("Feature details must be null or non-empty text");
  }
  return { kind, code, displayName: CARE_FEATURE_TAXONOMY[kind][code],
    details: details === null ? null : details.trim() };
}

/** NULL means the feature family has not been assessed. */
export function projectControlledCareFeatures(value) {
  if (value == null) return null;
  if (!Array.isArray(value)) throw new Error("Controlled care features must be an array or null");
  const seen = new Set();
  return value.map((feature) => {
    const projected = controlledCareFeature(feature?.kind, feature?.code, feature?.details ?? null);
    const identity = `${projected.kind}.${projected.code}`;
    if (seen.has(identity)) throw new Error(`Duplicate controlled care feature: ${identity}`);
    seen.add(identity);
    return projected;
  });
}
