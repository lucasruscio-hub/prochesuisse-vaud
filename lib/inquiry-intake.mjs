export const MAX_INTAKE_BODY_BYTES = 16 * 1024;
export const PRIVACY_NOTICE_VERSION = "homepage-intake-2026-10-13";

const CARE_TYPES = new Map([
  ["Un EMS / établissement médico-social", "ems"],
  ["Une aide à domicile / Spitex privé", "home_care"],
  ["Une résidence senior / appartement protégé", "senior_residence"],
  ["Un court séjour / répit", "respite"],
  ["Je ne sais pas encore", "unsure"],
]);

const TIMING_CODES = new Map([
  ["Très urgent — cette semaine", "within_7_days"],
  ["Dans le mois", "within_1_month"],
  ["Dans les 3 mois", "within_3_months"],
  ["Je planifie à l’avance", "planning"],
  ["Simple renseignement", "information_only"],
]);

const NEED_CODES = new Map([
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

const SITUATIONS = new Set([
  "Mon proche vit seul et ce n’est plus sûr",
  "Sortie d’hôpital prévue ou récente",
  "Chute récente / perte d’autonomie",
  "Troubles cognitifs / Alzheimer / démence",
  "La famille est épuisée ou ne peut plus assurer l’aide nécessaire",
  "Nous voulons anticiper",
  "Autre situation",
]);

const AGES = new Set([
  "Moins de 65 ans", "65–74 ans", "75–84 ans", "85 ans et plus", "Je ne sais pas",
]);

const FUNDING = new Set([
  "Oui, c’est une inquiétude importante",
  "Oui, mais ce n’est pas urgent",
  "Non, nous avons déjà une idée claire",
  "Je ne sais pas encore",
]);

const ALLOWED_KEYS = new Set([
  "need", "location", "urgency", "situation", "needs", "age", "funding", "details",
  "firstName", "lastName", "email", "phone", "consentContact", "source", "page",
]);

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
  if (!/^\+[1-9][0-9]{6,14}$/.test(normalized)) {
    throw new IntakeValidationError("Invalid phone");
  }
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

export function normalizeLegacyLead(body, idempotencyKey) {
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.getPrototypeOf(body) !== Object.prototype) {
    throw new IntakeValidationError("Request body must be an object");
  }
  const unknown = Object.keys(body).filter((key) => !ALLOWED_KEYS.has(key));
  if (unknown.length) throw new IntakeValidationError("Unknown request field");
  if (typeof idempotencyKey !== "string" || !UUID_PATTERN.test(idempotencyKey)) {
    throw new IntakeValidationError("A valid Idempotency-Key header is required");
  }

  const firstName = requiredString(body.firstName, "firstName", 100);
  const lastName = requiredString(body.lastName, "lastName", 100);
  const email = requiredString(body.email, "email", 320).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new IntakeValidationError("Invalid email");
  const location = requiredString(body.location, "location", 160);
  const need = controlledValue(body.need, "need", new Set(CARE_TYPES.keys()));
  const urgency = controlledValue(body.urgency, "urgency", new Set(TIMING_CODES.keys()));

  // Deprecated compatibility fields are validated but deliberately not persisted.
  controlledValue(body.situation, "situation", SITUATIONS);
  controlledValue(body.age, "age", AGES);
  controlledValue(body.funding, "funding", FUNDING);

  if (body.consentContact !== true) {
    throw new IntakeValidationError("Contact consent is required");
  }
  const submittedNeeds = body.needs ?? [];
  if (!Array.isArray(submittedNeeds) || submittedNeeds.length > NEED_CODES.size) {
    throw new IntakeValidationError("Invalid needs");
  }
  const mappedNeeds = submittedNeeds.map((value) => {
    if (typeof value !== "string" || !NEED_CODES.has(value)) {
      throw new IntakeValidationError("Invalid needs");
    }
    return NEED_CODES.get(value);
  });
  const needCodes = [...new Set(mappedNeeds)].sort();
  if (needCodes.length > 12) throw new IntakeValidationError("Invalid needs");

  const source = optionalString(body.source, "source", 200);
  if (source !== null && source !== "landing") throw new IntakeValidationError("Invalid source");
  const details = optionalString(body.details, "details", 1000);

  return {
    notification: { firstName, lastName, email, phone: normalizePhone(body.phone),
      careType: need, timing: urgency, needCodes, location, contextSummary: details },
    rpcArgs: {
      p_intake_idempotency_key: idempotencyKey.toLowerCase(),
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: email,
      p_phone: normalizePhone(body.phone),
      p_preferred_contact_method: "email",
      p_care_type_code: CARE_TYPES.get(need),
      p_beneficiary_relation_code: "unspecified",
      p_timing_code: TIMING_CODES.get(urgency),
      p_need_codes: needCodes,
      p_location_text: location,
      p_context_summary: details,
      p_source_channel: "homepage",
      p_source_detail: source,
      p_landing_page: normalizeLandingPage(body.page),
      p_privacy_notice_version: PRIVACY_NOTICE_VERSION,
    },
  };
}

function publicResult(status, body) {
  return { status, body };
}

export async function processLegacyLead({ rawBody, idempotencyKey, createInquiry,
  sendNotification, logger = console }) {
  if (typeof rawBody !== "string"
    || Buffer.byteLength(rawBody, "utf8") > MAX_INTAKE_BODY_BYTES) {
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
    intake = normalizeLegacyLead(body, idempotencyKey);
  } catch (error) {
    if (error instanceof IntakeValidationError) {
      return publicResult(error.status, { error: error.message });
    }
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
