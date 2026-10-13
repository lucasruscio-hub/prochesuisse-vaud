export const INQUIRY_STATUSES = ["new", "reviewing", "qualified", "matching", "closed"];
export const CLOSURE_OUTCOMES = [
  "care_started", "admission_or_placement", "other_success", "resolved_without_referral",
  "family_withdrew", "unreachable", "duplicate", "out_of_scope", "no_solution_found", "other",
];

export const STATUS_LABELS = {
  new: "Nouvelle", reviewing: "En cours d’examen", qualified: "Qualifiée",
  matching: "Recherche de solutions", closed: "Clôturée",
};
export const CARE_TYPE_LABELS = {
  ems: "EMS", home_care: "Soins à domicile", home_support: "Aide à domicile",
  senior_residence: "Résidence senior", respite: "Court séjour / répit", unsure: "À déterminer",
};
export const RELATIONSHIP_LABELS = {
  self: "La personne elle-même", parent: "Parent", partner: "Partenaire",
  relative: "Autre membre de la famille", friend: "Proche / ami", other: "Autre",
  unspecified: "Non précisé",
};
export const TIMING_LABELS = {
  within_7_days: "Dans les 7 jours", within_1_month: "Dans le mois",
  within_3_months: "Dans les 3 mois", planning: "Planification",
  information_only: "Information uniquement",
};
export const NEED_LABELS = {
  personal_care: "Soins personnels", meals: "Repas", medication_support: "Soutien à la médication",
  household_support: "Aide au ménage", companionship: "Présence et compagnie", transport: "Transport",
  mobility_support: "Mobilité", regular_presence: "Présence régulière", night_support: "Soutien de nuit",
  nursing_care: "Soins infirmiers", cognitive_support: "Soutien cognitif", unsure: "À déterminer",
};
export const ACTIVITY_LABELS = {
  inquiry_created: "Demande reçue", inquiry_status_changed: "Statut modifié",
  contact_permission_changed: "Permission de contact modifiée",
  provider_sharing_permission_changed: "Permission de partage modifiée",
  contact_attempted: "Tentative de contact", note_added: "Note interne ajoutée",
  referral_created: "Orientation créée", referral_status_changed: "Statut d’orientation modifié",
  referral_sharing_authorized: "Partage autorisé",
  referral_sharing_authorization_withdrawn: "Autorisation de partage retirée",
  referral_shared: "Informations partagées", provider_response_recorded: "Réponse prestataire",
  family_contact_recorded: "Contact famille", visit_scheduled: "Visite planifiée",
  outcome_recorded: "Résultat enregistré", correction_recorded: "Correction enregistrée",
  retention_action_recorded: "Action de conservation enregistrée",
};
export const CLOSURE_OUTCOME_LABELS = {
  care_started: "Prise en charge commencée", admission_or_placement: "Admission / placement",
  other_success: "Autre issue positive", resolved_without_referral: "Résolue sans orientation",
  family_withdrew: "Retrait de la famille", unreachable: "Famille injoignable",
  duplicate: "Doublon", out_of_scope: "Hors périmètre", no_solution_found: "Aucune solution trouvée",
  other: "Autre",
};

export const REFERRAL_STATUS_LABELS = {
  shortlisted: "Présélectionnée", ready_to_share: "Prête à transmettre",
  shared: "Informations transmises", engaged: "Réponse reçue",
  converted: "Aboutie", closed: "Clôturée",
};
export const REFERRAL_AUTHORIZATION_LABELS = {
  general_permission: "Permission générale", referral_specific_permission: "Permission spécifique à cette orientation",
};
export const REFERRAL_SUCCESS_OUTCOMES = ["care_started", "admission_or_placement", "other_success"];
export const REFERRAL_CLOSED_OUTCOMES = [
  "provider_declined", "family_declined", "no_response", "unavailable", "unsuitable", "withdrawn", "duplicate", "other",
];
export const REFERRAL_OUTCOME_LABELS = {
  care_started: "Prise en charge commencée", admission_or_placement: "Admission / placement",
  other_success: "Autre issue positive", provider_declined: "Refus du prestataire",
  family_declined: "Refus de la famille", no_response: "Aucune réponse",
  unavailable: "Indisponible", unsuitable: "Solution inadaptée", withdrawn: "Orientation retirée",
  duplicate: "Doublon", other: "Autre",
};
export const OFFERING_TYPE_LABELS = {
  ems: "EMS", home_care: "Soins à domicile", home_support: "Aide à domicile",
  senior_residence: "Résidence senior", medicalized_care_unit: "Unité médicalisée",
};

const NEXT_STATUSES = {
  new: ["reviewing", "closed"], reviewing: ["qualified", "closed"],
  qualified: ["matching", "closed"], matching: ["closed"], closed: [],
};
const ACTION_PRIORITY = { new: 0, reviewing: 1, qualified: 2, matching: 3, closed: 4 };

export function allowedNextStatuses(status) {
  return NEXT_STATUSES[status] ?? [];
}

export function isInquiryStatus(value) {
  return INQUIRY_STATUSES.includes(value);
}

export function isClosureOutcome(value) {
  return CLOSURE_OUTCOMES.includes(value);
}

export function sortInquirySummaries(items) {
  return [...items].sort((a, b) => (ACTION_PRIORITY[a.workflowStatus] ?? 99)
    - (ACTION_PRIORITY[b.workflowStatus] ?? 99)
    || new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export function projectInquirySummaries(inquiries, contacts) {
  const contactById = new Map(contacts.map((contact) => [contact.id, contact]));
  return sortInquirySummaries(inquiries.map((inquiry) => {
    const contact = contactById.get(inquiry.primary_contact_id);
    return {
      id: inquiry.id,
      submittedAt: inquiry.submitted_at,
      contactName: [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || "Contact anonymisé",
      careType: inquiry.care_type_code,
      location: inquiry.location_text,
      timing: inquiry.timing_code,
      workflowStatus: inquiry.workflow_status,
      lastActivityAt: inquiry.last_activity_at,
    };
  }));
}

export function projectInquiryDetail(inquiry, contact, activities, municipality) {
  const safeInquiry = { ...inquiry };
  delete safeInquiry.primary_contact_id;
  delete safeInquiry.municipality_id;
  return {
    ...safeInquiry,
    contact,
    municipality,
    activities: [...activities].sort((a, b) => new Date(a.occurred_at).getTime()
      - new Date(b.occurred_at).getTime() || String(a.id).localeCompare(String(b.id))),
  };
}

export function formatLabel(labels, value) {
  return labels[value] ?? value ?? "—";
}
