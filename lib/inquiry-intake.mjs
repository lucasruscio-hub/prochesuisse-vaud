export const MAX_INTAKE_BODY_BYTES = 16 * 1024;
export const LEGACY_PRIVACY_NOTICE_VERSION = "homepage-intake-2026-10-13";
export const PRIVACY_NOTICE_VERSION = "homepage-intake-v1-2026-10-13";

const V1_CARE_TYPES = new Set([
  "ems", "home_care", "home_support", "senior_residence", "respite", "unsure",
]);
const V1_RELATIONSHIPS = new Set([
  "self", "parent", "partner", "relative", "friend", "other",
]);
const V1_TIMING = new Set([
  "within_7_days", "within_1_month", "within_3_months", "planning", "information_only",
]);
const V1_NEEDS = new Set([
  "personal_care", "meals", "medication_support", "household_support", "companionship",
  "transport", "mobility_support", "regular_presence", "night_support", "nursing_care",
  "cognitive_support", "unsure",
]);
const CONTACT_METHODS = new Set(["email", "phone", "either"]);

const LEGACY_CARE_TYPES = new Map([
  ["Un EMS / établissement médico-social", "ems"],
  ["Une aide à domicile / Spitex privé", "home_care"],
  ["Une résidence senior / appartement protégé", "senior_residence"],
  ["Un court séjour / répit", "respite"],
  ["Je ne sais pas encore", "unsure"],
]);
const LEGACY_TIMING = new Map([
  ["Très urgent — cette semaine", "within_7_days"],
  ["Dans le mois", "within_1_month"],
  ["Dans les 3 mois", "within_3_months"],
  ["Je planifie à l’avance", "planning"],
  ["Simple renseignement", "information_only"],
]);
const LEGACY_NEEDS = new Map([
  ["Aide pour se laver / s’habiller", "personal_care"],
  ["Aide pour les repas", "meals"],
  ["Aide à la prise de médicaments", "medication_support"],
  ["Courses / repas / ménage", "household_support"],
  ["Compagnie / présence", "companionship"],
  ["Transport / rendez-vous médicaux", "transport"],
  ["Mobilité réduite", "mobility_support"],
  ["Fauteuil roulant", "mobility_support"],
  ["Surveillance régulière", "regular_presence"],
  ["Présence de nuit", "night_support"],
  ["Soins infirmiers", "nursing_care"],
  ["Troubles cognitifs / Alzheimer / démence", "cognitive_support"],
  ["Je ne sais pas encore", "unsure"],
]);
const LEGACY_SITUATIONS = new Set([
  "Mon proche vit seul et ce n’est plus sûr",
  "Sortie d’hôpital prévue ou récente",
  "Chute récente / perte d’autonomie",
  "Troubles cognitifs / Alzheimer / démence",
  "La famille est épuisée ou ne peut plus assurer l’aide nécessaire",
  "Nous voulons anticiper",
  "Autre situation",
]);
const LEGACY_AGES = new Set([
  "Moins de 65 ans", "65–74 ans", "75–84 ans", "85 ans et plus", "Je ne sais pas",
]);
const LEGACY_FUNDING = new Set([
  "Oui, c’est une inquiétude importante", "Oui, mais ce n’est pas urgent",
  "Non, nous avons déjà une idée claire", "Je ne sais pas encore",
]);

const COMMON_KEYS = [
  "location", "firstName", "lastName", "email", "phone", "consentContact", "source", "page",
];
const LEGACY_KEYS = ["need", "urgency", "situation", "needs", "age", "funding", "details"];
const V1_KEYS = [
  "careType", "beneficiaryRelationship", "timing", "needCodes", "contextSummary",
  "preferredContactMethod", "privacyAcknowledged",
];
const ALLOWED_KEYS = new Set([...COMMON_KEYS, ...LEGACY_KEYS, ...V1_KEYS]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class IntakeValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "IntakeValidationError";
    this.status = status;
  }
}

function requiredString(value, name, maximum) {
  if (typeof value !== "string") throw new IntakeValidationError(`Invalid ${name}`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new IntakeValidationError(`Invalid ${name}`);
  return normalized;
}

function optionalString(value, name, maximum) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new IntakeValidationError(`Invalid ${name}`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maximum) throw new IntakeValidationError(`Invalid ${name}`);
  return normalized;
}

function controlledValue(value, name, allowed) {
  const normalized = requiredString(value, name, 200);
  if (!allowed.has(normalized)) throw new IntakeValidationError(`Invalid ${name}`);
  return normalized;
}

export function normalizePhone(value) {
  const phone = optionalString(value, "phone", 40);
  if (phone === null) return null;
  if (/[^0-9+().\s/-]/.test(phone) || (phone.match(/\+/g) ?? []).length > 1
    || (phone.includes("+") && !phone.startsWith("+"))) {
    throw new IntakeValidationError("Invalid phone");
  }
  const compact = phone.replace(/[().\s/-]/g, "");
  let normalized;
  if (compact.startsWith("+")) normalized = compact;
  else if (compact.startsWith("00")) normalized = `+${compact.slice(2)}`;
  else if (/^0[0-9]+$/.test(compact)) normalized = `+41${compact.slice(1)}`;
  else throw new IntakeValidationError("Invalid phone");
  if (!/^\+[1-9][0-9]{6,14}$/.test(normalized)) throw new IntakeValidationError("Invalid phone");
  return normalized;
}

function normalizeLandingPage(value) {
  const page = optionalString(value, "page", 500);
  if (page === null) return null;
  if (page === "homepage") return "/";
  if (!page.startsWith("/") || page.includes("?") || /^[a-z][a-z0-9+.-]*:\/\//i.test(page)) {
    throw new IntakeValidationError("Invalid page");
  }
  return page;
}

function normalizeNeedArray(values, { legacy }) {
  const allowed = legacy ? LEGACY_NEEDS : V1_NEEDS;
  const maximum = legacy ? LEGACY_NEEDS.size : V1_NEEDS.size;
  if (!Array.isArray(values) || values.length > maximum) throw new IntakeValidationError("Invalid needs");
  const mapped = values.map((value) => {
    if (typeof value !== "string" || !allowed.has(value)) throw new IntakeValidationError("Invalid needs");
    return legacy ? allowed.get(value) : value;
  });
  const canonical = [...new Set(mapped)].sort();
  if (canonical.length > 12) throw new IntakeValidationError("Invalid needs");
  return canonical;
}

function commonValues(body) {
  const firstName = requiredString(body.firstName, "firstName", 100);
  const lastName = requiredString(body.lastName, "lastName", 100);
  const email = requiredString(body.email, "email", 320).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new IntakeValidationError("Invalid email");
  const location = requiredString(body.location, "location", 160);
  const source = optionalString(body.source, "source", 200);
  if (source !== null && source !== "landing") throw new IntakeValidationError("Invalid source");
  if (body.consentContact !== true) throw new IntakeValidationError("Contact consent is required");
  return { firstName, lastName, email, location, source, phone: normalizePhone(body.phone),
    landingPage: normalizeLandingPage(body.page) };
}

function normalizeV1(body) {
  if (LEGACY_KEYS.some((key) => Object.hasOwn(body, key))) {
    throw new IntakeValidationError("Legacy and V1 intake fields cannot be mixed");
  }
  const shared = commonValues(body);
  const careType = controlledValue(body.careType, "careType", V1_CARE_TYPES);
  const relationship = controlledValue(
    body.beneficiaryRelationship, "beneficiaryRelationship", V1_RELATIONSHIPS,
  );
  const timing = controlledValue(body.timing, "timing", V1_TIMING);
  const contactMethod = controlledValue(
    body.preferredContactMethod, "preferredContactMethod", CONTACT_METHODS,
  );
  if (body.privacyAcknowledged !== true) {
    throw new IntakeValidationError("Privacy acknowledgement is required");
  }
  if (contactMethod !== "email" && shared.phone === null) {
    throw new IntakeValidationError("Phone is required for the selected contact method");
  }
  const needCodes = normalizeNeedArray(body.needCodes ?? [], { legacy: false });
  const contextSummary = optionalString(body.contextSummary, "contextSummary", 1000);
  return { ...shared, careType, relationship, timing, contactMethod, needCodes, contextSummary,
    privacyNoticeVersion: PRIVACY_NOTICE_VERSION };
}

function normalizeLegacy(body) {
  if (V1_KEYS.some((key) => Object.hasOwn(body, key))) {
    throw new IntakeValidationError("Legacy and V1 intake fields cannot be mixed");
  }
  const shared = commonValues(body);
  const need = controlledValue(body.need, "need", new Set(LEGACY_CARE_TYPES.keys()));
  const urgency = controlledValue(body.urgency, "urgency", new Set(LEGACY_TIMING.keys()));
  controlledValue(body.situation, "situation", LEGACY_SITUATIONS);
  controlledValue(body.age, "age", LEGACY_AGES);
  controlledValue(body.funding, "funding", LEGACY_FUNDING);
  return { ...shared, careType: LEGACY_CARE_TYPES.get(need), relationship: "unspecified",
    timing: LEGACY_TIMING.get(urgency), contactMethod: "email",
    needCodes: normalizeNeedArray(body.needs ?? [], { legacy: true }),
    contextSummary: optionalString(body.details, "details", 1000),
    privacyNoticeVersion: LEGACY_PRIVACY_NOTICE_VERSION, notificationCareType: need,
    notificationTiming: urgency };
}

export function normalizeInquiryIntake(body, idempotencyKey) {
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.getPrototypeOf(body) !== Object.prototype) {
    throw new IntakeValidationError("Request body must be an object");
  }
  if (Object.keys(body).some((key) => !ALLOWED_KEYS.has(key))) {
    throw new IntakeValidationError("Unknown request field");
  }
  if (typeof idempotencyKey !== "string" || !UUID_PATTERN.test(idempotencyKey)) {
    throw new IntakeValidationError("A valid Idempotency-Key header is required");
  }
  const isV1 = V1_KEYS.some((key) => Object.hasOwn(body, key));
  const value = isV1 ? normalizeV1(body) : normalizeLegacy(body);
  return {
    notification: {
      firstName: value.firstName, lastName: value.lastName, email: value.email,
      phone: value.phone, careType: value.notificationCareType ?? value.careType,
      timing: value.notificationTiming ?? value.timing, needCodes: value.needCodes,
      location: value.location, contextSummary: value.contextSummary,
    },
    rpcArgs: {
      p_intake_idempotency_key: idempotencyKey.toLowerCase(),
      p_first_name: value.firstName,
      p_last_name: value.lastName,
      p_email: value.email,
      p_phone: value.phone,
      p_preferred_contact_method: value.contactMethod,
      p_care_type_code: value.careType,
      p_beneficiary_relation_code: value.relationship,
      p_timing_code: value.timing,
      p_need_codes: value.needCodes,
      p_location_text: value.location,
      p_context_summary: value.contextSummary,
      p_source_channel: "homepage",
      p_source_detail: value.source,
      p_landing_page: value.landingPage,
      p_privacy_notice_version: value.privacyNoticeVersion,
    },
  };
}

export const normalizeLegacyLead = normalizeInquiryIntake;

function publicResult(status, body) {
  return { status, body };
}

export async function processLegacyLead({ rawBody, idempotencyKey, createInquiry,
  sendNotification, logger = console }) {
  if (typeof rawBody !== "string" || Buffer.byteLength(rawBody, "utf8") > MAX_INTAKE_BODY_BYTES) {
    return publicResult(413, { error: "Request body is too large" });
  }
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return publicResult(400, { error: "Malformed JSON" });
  }
  let intake;
  try {
    intake = normalizeInquiryIntake(body, idempotencyKey);
  } catch (error) {
    if (error instanceof IntakeValidationError) return publicResult(error.status, { error: error.message });
    throw error;
  }
  const result = await createInquiry(intake.rpcArgs);
  if (result?.error) {
    if (String(result.error.message ?? "").includes("intake_idempotency_conflict")) {
      return publicResult(409, { error: "Idempotency key conflicts with another submission" });
    }
    logger.error("Could not persist inquiry");
    return publicResult(500, { error: "Could not save inquiry" });
  }
  const row = Array.isArray(result?.data) ? result.data[0] : result?.data;
  if (!row || typeof row.created !== "boolean") {
    logger.error("Inquiry RPC returned an invalid result");
    return publicResult(500, { error: "Could not save inquiry" });
  }
  if (row.created) {
    try {
      const notificationResult = await sendNotification(intake.notification);
      if (notificationResult?.error) logger.error("Inquiry stored, but notification delivery failed");
    } catch {
      logger.error("Inquiry stored, but notification delivery failed");
    }
  }
  return publicResult(200, { success: true });
}
