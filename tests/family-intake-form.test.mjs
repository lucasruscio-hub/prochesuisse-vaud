import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CARE_TYPE_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  EMPTY_PUBLIC_INTAKE,
  NEED_OPTIONS,
  RELATIONSHIP_OPTIONS,
  TIMING_OPTIONS,
  buildPublicIntakePayload,
  validatePublicIntakeStep,
} from "../lib/public-intake-form.mjs";
import {
  PRIVACY_NOTICE_VERSION,
  normalizeInquiryIntake,
  processLegacyLead,
} from "../lib/inquiry-intake.mjs";

const page = readFileSync(new URL("../app/page.js", import.meta.url), "utf8");
const heroForm = page.match(/function HeroForm\(\)[\s\S]*?function FAQItem/)?.[0] ?? "";
const key = "20000000-0000-4000-8000-000000000001";
const validForm = {
  ...EMPTY_PUBLIC_INTAKE,
  careType: "home_support",
  beneficiaryRelationship: "parent",
  timing: "within_3_months",
  location: "1000 Lausanne",
  needCodes: ["companionship", "household_support"],
  contextSummary: "Un accompagnement léger serait utile.",
  firstName: "Alice",
  lastName: "Example",
  email: "alice@example.test",
  phone: "",
  preferredContactMethod: "email",
  privacyAcknowledged: true,
  consentContact: true,
};

test("V1 options use only the approved controlled vocabularies", () => {
  assert.deepEqual(CARE_TYPE_OPTIONS.map(({ value }) => value), [
    "ems", "home_care", "home_support", "senior_residence", "respite", "unsure",
  ]);
  assert.deepEqual(RELATIONSHIP_OPTIONS.map(({ value }) => value), [
    "self", "parent", "partner", "relative", "friend", "other",
  ]);
  assert.deepEqual(TIMING_OPTIONS.map(({ value }) => value), [
    "within_7_days", "within_1_month", "within_3_months", "planning", "information_only",
  ]);
  assert.deepEqual(CONTACT_METHOD_OPTIONS.map(({ value }) => value), ["email", "phone"]);
  assert.equal(NEED_OPTIONS.length, 12);
});

test("the public V1 payload contains every approved field and no deprecated legacy field", () => {
  const payload = buildPublicIntakePayload(validForm);
  assert.deepEqual(payload, {
    careType: "home_support",
    beneficiaryRelationship: "parent",
    timing: "within_3_months",
    location: "1000 Lausanne",
    needCodes: ["companionship", "household_support"],
    contextSummary: "Un accompagnement léger serait utile.",
    firstName: "Alice",
    lastName: "Example",
    email: "alice@example.test",
    phone: "",
    preferredContactMethod: "email",
    privacyAcknowledged: true,
    consentContact: true,
    source: "landing",
    page: "homepage",
  });
  for (const removed of ["need", "urgency", "situation", "needs", "age", "funding", "details"]) {
    assert.equal(Object.hasOwn(payload, removed), false);
  }
});

test("each required form step blocks missing or malformed input", () => {
  assert.match(validatePublicIntakeStep(0, { ...validForm, careType: "" }), /type de solution/);
  assert.match(validatePublicIntakeStep(1, { ...validForm, beneficiaryRelationship: "" }), /pour qui/);
  assert.match(validatePublicIntakeStep(2, { ...validForm, timing: "" }), /délai/);
  assert.match(validatePublicIntakeStep(3, { ...validForm, location: " " }), /commune/);
  assert.match(validatePublicIntakeStep(6, { ...validForm, firstName: "" }), /prénom/);
  assert.match(validatePublicIntakeStep(6, { ...validForm, lastName: "" }), /nom/);
  assert.match(validatePublicIntakeStep(6, { ...validForm, email: "invalid" }), /e-mail valide/);
  assert.match(validatePublicIntakeStep(6, { ...validForm, preferredContactMethod: "" }), /comment/);
  assert.match(validatePublicIntakeStep(7, { ...validForm, privacyAcknowledged: false }), /confidentialité/);
  assert.match(validatePublicIntakeStep(7, { ...validForm, consentContact: false }), /contacter/);
});

test("phone is optional for email and required when phone is preferred", () => {
  assert.equal(validatePublicIntakeStep(6, validForm), "");
  assert.match(validatePublicIntakeStep(6, {
    ...validForm, preferredContactMethod: "phone", phone: "",
  }), /numéro de téléphone/);
  assert.equal(validatePublicIntakeStep(6, {
    ...validForm, preferredContactMethod: "phone", phone: "079 000 00 00",
  }), "");
});

test("optional needs and context remain bounded and non-clinical in the UI", () => {
  assert.equal(validatePublicIntakeStep(4, { ...validForm, needCodes: [] }), "");
  assert.equal(validatePublicIntakeStep(5, { ...validForm, contextSummary: "x".repeat(1000) }), "");
  assert.match(validatePublicIntakeStep(5, {
    ...validForm, contextSummary: "x".repeat(1001),
  }), /1 000/);
  assert.match(heroForm, /maxLength=\{1000\}/);
  assert.match(heroForm, /dossier médical/);
  assert.match(heroForm, /numéro AVS/);
  assert.doesNotMatch(heroForm, /type="file"/);
});

test("the V1 endpoint maps relationship, preference, needs, and privacy evidence exactly", () => {
  const normalized = normalizeInquiryIntake(buildPublicIntakePayload(validForm), key);
  assert.equal(normalized.rpcArgs.p_care_type_code, "home_support");
  assert.equal(normalized.rpcArgs.p_beneficiary_relation_code, "parent");
  assert.equal(normalized.rpcArgs.p_timing_code, "within_3_months");
  assert.equal(normalized.rpcArgs.p_preferred_contact_method, "email");
  assert.deepEqual(normalized.rpcArgs.p_need_codes, ["companionship", "household_support"]);
  assert.equal(normalized.rpcArgs.p_privacy_notice_version, PRIVACY_NOTICE_VERSION);
  assert.equal(normalized.rpcArgs.p_phone, null);
});

test("the endpoint rejects invalid V1 consent, preference, codes, and mixed legacy fields", () => {
  const payload = buildPublicIntakePayload(validForm);
  assert.throws(() => normalizeInquiryIntake({ ...payload, privacyAcknowledged: false }, key),
    /Privacy acknowledgement/);
  assert.throws(() => normalizeInquiryIntake({ ...payload, consentContact: false }, key),
    /Contact consent/);
  assert.throws(() => normalizeInquiryIntake({ ...payload,
    preferredContactMethod: "phone", phone: "" }, key), /Phone is required/);
  assert.throws(() => normalizeInquiryIntake({ ...payload, careType: "hospital" }, key),
    /Invalid careType/);
  assert.throws(() => normalizeInquiryIntake({ ...payload, age: "75–84 ans" }, key),
    /cannot be mixed/);
});

test("a valid V1 submission preserves the stable response and one-notification behavior", async () => {
  let persistenceCalls = 0;
  let notifications = 0;
  const result = await processLegacyLead({
    rawBody: JSON.stringify(buildPublicIntakePayload(validForm)), idempotencyKey: key,
    createInquiry: async () => {
      persistenceCalls += 1;
      return { data: [{ inquiry_id: key, created: true }], error: null };
    },
    sendNotification: async () => { notifications += 1; return { error: null }; },
  });
  assert.deepEqual(result, { status: 200, body: { success: true } });
  assert.equal(persistenceCalls, 1);
  assert.equal(notifications, 1);
});

test("the rendered form separates privacy and contact and retains retry protection", () => {
  assert.match(heroForm, /privacyAcknowledged/);
  assert.match(heroForm, /consentContact/);
  assert.match(heroForm, /n’autorisent aucun partage avec un prestataire/);
  assert.match(heroForm, /disabled=\{isSubmitting\}/);
  assert.match(heroForm, /Idempotency-Key/);
  assert.match(heroForm, /crypto\.randomUUID\(\)/);
  assert.doesNotMatch(heroForm, /updateField\("(?:situation|age|funding)"/);
});
