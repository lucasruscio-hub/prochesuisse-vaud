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
    social_activities: "Activités sociales et socioculturelles",
    home_nursing: "Soins infirmiers à domicile",
    basic_care: "Soins de base",
    daily_life_assistance: "Aide à la vie quotidienne",
    household_help: "Aide au ménage",
    complex_care: "Soins complexes",
    night_watch: "Veille de nuit",
    continuous_assistance: "Assistance continue",
    family_caregiver_support: "Soutien aux proches aidants",
    on_call_24h: "Permanence 24h/24",
    companionship: "Présence et compagnie",
    meal_delivery: "Livraison de repas",
    respite_at_home: "Relève à domicile",
    emergency_call_service: "Service de téléalarme",
  }),
  facility: Object.freeze({
    emergency_call_system: "Système d’appel d’urgence",
    garden_or_park: "Jardin ou parc",
    restaurant: "Restaurant sur place",
  }),
});

export const HOME_CARE_SERVICE_DEFINITIONS = Object.freeze({
  on_call_24h: Object.freeze({
    label: CARE_FEATURE_TAXONOMY.service.on_call_24h,
    meaning: "Support du prestataire explicitement disponible sur appel 24h/24, sans présumer une présence continue à domicile.",
    evidenceRule: "Exiger une source qui décrit explicitement une permanence ou disponibilité sur appel 24h/24.",
  }),
  companionship: Object.freeze({
    label: CARE_FEATURE_TAXONOMY.service.companionship,
    meaning: "Présence relationnelle et compagnie fournies directement au domicile.",
    evidenceRule: "Exiger une mention explicite de présence ou compagnie; ne jamais l’inférer d’une offre générique de soins à domicile.",
  }),
  meal_delivery: Object.freeze({
    label: CARE_FEATURE_TAXONOMY.service.meal_delivery,
    meaning: "Livraison ou apport de repas au domicile par le prestataire dans le cadre de l’offre.",
    evidenceRule: "Exiger une preuve explicite de livraison ou d’apport de repas; ne pas confondre avec préparation, conseil nutritionnel ou renvoi à un tiers.",
  }),
  respite_at_home: Object.freeze({
    label: CARE_FEATURE_TAXONOMY.service.respite_at_home,
    meaning: "Relève temporaire au domicile qui remplace concrètement le proche aidant.",
    evidenceRule: "Exiger une preuve explicite de relève ou répit fourni au domicile; le simple soutien aux proches aidants ne suffit pas.",
  }),
  emergency_call_service: Object.freeze({
    label: CARE_FEATURE_TAXONOMY.service.emergency_call_service,
    meaning: "Téléalarme ou dispositif d’appel d’urgence à domicile fourni, organisé ou surveillé comme service.",
    evidenceRule: "Exiger une preuve explicite de téléalarme ou d’appel d’urgence; ne pas confondre avec une permanence de personnel soignant 24h/24.",
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
