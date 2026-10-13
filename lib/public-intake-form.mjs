export const CARE_TYPE_OPTIONS = [
  { value: "ems", label: "Un EMS / établissement médico-social" },
  { value: "home_care", label: "Des soins à domicile / Spitex" },
  { value: "home_support", label: "De l’aide et de l’accompagnement à domicile" },
  { value: "senior_residence", label: "Une résidence senior / un appartement protégé" },
  { value: "respite", label: "Un court séjour / une solution de répit" },
  { value: "unsure", label: "Je ne sais pas encore" },
];

export const RELATIONSHIP_OPTIONS = [
  { value: "self", label: "Pour moi" },
  { value: "parent", label: "Pour ma mère ou mon père" },
  { value: "partner", label: "Pour mon ou ma partenaire" },
  { value: "relative", label: "Pour un autre membre de ma famille" },
  { value: "friend", label: "Pour un ami ou une amie" },
  { value: "other", label: "Pour une personne que j’accompagne" },
];

export const TIMING_OPTIONS = [
  { value: "within_7_days", label: "Cette semaine" },
  { value: "within_1_month", label: "Dans le mois" },
  { value: "within_3_months", label: "Dans les 3 mois" },
  { value: "planning", label: "Je planifie à l’avance" },
  { value: "information_only", label: "Je cherche seulement des informations" },
];

export const NEED_OPTIONS = [
  { value: "personal_care", label: "Toilette et habillage" },
  { value: "meals", label: "Repas" },
  { value: "medication_support", label: "Soutien pour la prise de médicaments" },
  { value: "household_support", label: "Courses et ménage" },
  { value: "companionship", label: "Compagnie et présence" },
  { value: "transport", label: "Transport et rendez-vous" },
  { value: "mobility_support", label: "Mobilité" },
  { value: "regular_presence", label: "Présence régulière" },
  { value: "night_support", label: "Présence de nuit" },
  { value: "nursing_care", label: "Soins infirmiers" },
  { value: "cognitive_support", label: "Soutien lié à la mémoire ou à l’orientation" },
  { value: "unsure", label: "Je ne sais pas encore" },
];

export const CONTACT_METHOD_OPTIONS = [
  { value: "email", label: "Par e-mail" },
  { value: "phone", label: "Par téléphone" },
];

export const EMPTY_PUBLIC_INTAKE = Object.freeze({
  careType: "",
  beneficiaryRelationship: "",
  timing: "",
  location: "",
  needCodes: [],
  contextSummary: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  preferredContactMethod: "",
  privacyAcknowledged: false,
  consentContact: false,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePublicIntakeStep(step, data) {
  if (step === 0 && !data.careType) return "Veuillez sélectionner le type de solution recherché.";
  if (step === 1 && !data.beneficiaryRelationship) return "Veuillez indiquer pour qui est la demande.";
  if (step === 2 && !data.timing) return "Veuillez sélectionner un délai.";
  if (step === 3 && data.location.trim().length < 2) return "Veuillez indiquer une commune, une région ou un NPA.";
  if (step === 5 && data.contextSummary.length > 1000) return "Le contexte ne peut pas dépasser 1 000 caractères.";
  if (step === 6 && !data.firstName.trim()) return "Veuillez indiquer votre prénom.";
  if (step === 6 && !data.lastName.trim()) return "Veuillez indiquer votre nom.";
  if (step === 6 && !EMAIL_PATTERN.test(data.email.trim())) return "Veuillez indiquer une adresse e-mail valide.";
  if (step === 6 && !data.preferredContactMethod) return "Veuillez choisir comment Lia peut vous contacter.";
  if (step === 6 && data.preferredContactMethod === "phone" && !data.phone.trim()) {
    return "Veuillez indiquer un numéro de téléphone pour être contacté par téléphone.";
  }
  if (step === 7 && !data.privacyAcknowledged) return "Veuillez confirmer avoir pris connaissance des informations de confidentialité.";
  if (step === 7 && !data.consentContact) return "Veuillez autoriser Lia à vous contacter au sujet de cette demande.";
  return "";
}

export function buildPublicIntakePayload(data) {
  return {
    careType: data.careType,
    beneficiaryRelationship: data.beneficiaryRelationship,
    timing: data.timing,
    location: data.location,
    needCodes: [...data.needCodes],
    contextSummary: data.contextSummary,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    preferredContactMethod: data.preferredContactMethod,
    privacyAcknowledged: data.privacyAcknowledged,
    consentContact: data.consentContact,
    source: "landing",
    page: "homepage",
  };
}
