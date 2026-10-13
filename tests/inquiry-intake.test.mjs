import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAX_INTAKE_BODY_BYTES,
  PRIVACY_NOTICE_VERSION,
  normalizeLegacyLead,
  normalizePhone,
  processLegacyLead,
} from "../lib/inquiry-intake.mjs";

const migration = readFileSync(new URL(
  "../supabase/migrations/20261013000100_create_inquiry_intake_rpc.sql", import.meta.url,
), "utf8");
const page = readFileSync(new URL("../app/page.js", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/leads/route.js", import.meta.url), "utf8");
const architecture = readFileSync(new URL(
  "../docs/architecture/lia-inquiry-foundation.md", import.meta.url,
), "utf8");

const key = "10000000-0000-4000-8000-000000000001";
const validBody = {
  need: "Une aide à domicile / Spitex privé",
  location: " Lausanne ",
  urgency: "Dans le mois",
  situation: "Nous voulons anticiper",
  needs: ["Fauteuil roulant", "Aide pour les repas", "Mobilité réduite"],
  age: "75–84 ans",
  funding: "Je ne sais pas encore",
  details: " Quelques précisions. ",
  firstName: " Alice ",
  lastName: " Example ",
  email: " ALICE@EXAMPLE.TEST ",
  phone: "079 000 00 00",
  consentContact: true,
  source: "landing",
  page: "homepage",
};

test("legacy payload maps only approved normalized values into the intake RPC", () => {
  const normalized = normalizeLegacyLead(validBody, key);
  assert.deepEqual(normalized.rpcArgs, {
    p_intake_idempotency_key: key,
    p_first_name: "Alice",
    p_last_name: "Example",
    p_email: "alice@example.test",
    p_phone: "+41790000000",
    p_preferred_contact_method: "email",
    p_care_type_code: "home_care",
    p_beneficiary_relation_code: "unspecified",
    p_timing_code: "within_1_month",
    p_need_codes: ["meals", "mobility_support"],
    p_location_text: "Lausanne",
    p_context_summary: "Quelques précisions.",
    p_source_channel: "homepage",
    p_source_detail: "landing",
    p_landing_page: "/",
    p_privacy_notice_version: PRIVACY_NOTICE_VERSION,
  });
  for (const deprecated of ["situation", "age", "funding"]) {
    assert.equal(JSON.stringify(normalized).includes(validBody[deprecated]), false);
  }
});

test("optional Swiss and international phone values normalize safely", () => {
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone("021 555 12 34"), "+41215551234");
  assert.equal(normalizePhone("0044 20 7946 0958"), "+442079460958");
  assert.throws(() => normalizePhone("079 call me"), /Invalid phone/);
  assert.throws(() => normalizePhone("41790000000"), /Invalid phone/);
});

test("validation rejects malformed and caller-controlled internal values", () => {
  assert.throws(() => normalizeLegacyLead({ ...validBody, email: "not-an-email" }, key),
    /Invalid email/);
  assert.throws(() => normalizeLegacyLead({ ...validBody, urgency: "Immediately" }, key),
    /Invalid urgency/);
  assert.throws(() => normalizeLegacyLead({ ...validBody, providerId: key }, key),
    /Unknown request field/);
  assert.throws(() => normalizeLegacyLead({ ...validBody, consentContact: "true" }, key),
    /Contact consent is required/);
  assert.throws(() => normalizeLegacyLead(validBody, "alice@example.test"),
    /Idempotency-Key/);
});

test("validation enforces free-text and array bounds", () => {
  assert.throws(() => normalizeLegacyLead({ ...validBody, details: "x".repeat(1001) }, key),
    /Invalid details/);
  assert.throws(() => normalizeLegacyLead({ ...validBody, location: "x".repeat(161) }, key),
    /Invalid location/);
  assert.throws(() => normalizeLegacyLead({ ...validBody, needs: ["Unknown"] }, key),
    /Invalid needs/);
});

test("a newly persisted inquiry sends one notification and returns the stable response", async () => {
  let notifications = 0;
  const result = await processLegacyLead({
    rawBody: JSON.stringify(validBody), idempotencyKey: key,
    createInquiry: async () => ({ data: [{ inquiry_id: key, created: true }], error: null }),
    sendNotification: async () => { notifications += 1; return { error: null }; },
  });
  assert.deepEqual(result, { status: 200, body: { success: true } });
  assert.equal(notifications, 1);
});

test("an exact idempotent retry sends no duplicate notification", async () => {
  let notifications = 0;
  const result = await processLegacyLead({
    rawBody: JSON.stringify(validBody), idempotencyKey: key,
    createInquiry: async () => ({ data: [{ inquiry_id: key, created: false }], error: null }),
    sendNotification: async () => { notifications += 1; },
  });
  assert.deepEqual(result, { status: 200, body: { success: true } });
  assert.equal(notifications, 0);
});

test("idempotency conflicts are public-safe and do not notify", async () => {
  let notifications = 0;
  const result = await processLegacyLead({
    rawBody: JSON.stringify(validBody), idempotencyKey: key,
    createInquiry: async () => ({ data: null,
      error: { message: "intake_idempotency_conflict" } }),
    sendNotification: async () => { notifications += 1; },
  });
  assert.equal(result.status, 409);
  assert.equal(notifications, 0);
  assert.equal(JSON.stringify(result).includes(key), false);
});

test("notification return errors and thrown failures remain successful after persistence", async () => {
  const messages = [];
  const logger = { error: (message) => messages.push(message) };
  for (const sendNotification of [
    async () => ({ error: { message: "delivery failed" } }),
    async () => { throw new Error("delivery failed"); },
  ]) {
    const result = await processLegacyLead({
      rawBody: JSON.stringify(validBody), idempotencyKey: key,
      createInquiry: async () => ({ data: [{ inquiry_id: key, created: true }], error: null }),
      sendNotification, logger,
    });
    assert.deepEqual(result, { status: 200, body: { success: true } });
  }
  assert.deepEqual(messages, [
    "Inquiry stored, but notification delivery failed",
    "Inquiry stored, but notification delivery failed",
  ]);
});

test("invalid and oversized requests never call persistence", async () => {
  let calls = 0;
  const createInquiry = async () => { calls += 1; };
  const malformed = await processLegacyLead({ rawBody: "{", idempotencyKey: key,
    createInquiry, sendNotification: async () => {} });
  const oversized = await processLegacyLead({ rawBody: "x".repeat(MAX_INTAKE_BODY_BYTES + 1),
    idempotencyKey: key, createInquiry, sendNotification: async () => {} });
  assert.equal(malformed.status, 400);
  assert.equal(oversized.status, 413);
  assert.equal(calls, 0);
});

test("migration is one scoped security-invoker RPC with service-role-only execution", () => {
  assert.match(migration, /CREATE FUNCTION public\.create_inquiry_from_public_intake/);
  assert.match(migration, /SECURITY INVOKER/);
  assert.match(migration, /SET search_path = pg_catalog, public/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /TO service_role/);
  assert.equal((migration.match(/INSERT INTO public\.inquiry_contacts/g) ?? []).length, 1);
  assert.equal((migration.match(/INSERT INTO public\.inquiries/g) ?? []).length, 1);
  assert.equal((migration.match(/INSERT INTO public\.inquiry_activities/g) ?? []).length, 1);
  assert.doesNotMatch(migration, /INSERT INTO public\.inquiry_referrals/);
  assert.doesNotMatch(migration, /CREATE TABLE|ADD COLUMN/);
});

test("caller preserves a retry key and resets it on edits or confirmed success", () => {
  assert.match(page, /useRef\(null\)/);
  assert.match(page, /Idempotency-Key": idempotencyKey/);
  assert.match(page, /idempotencyKeyRef\.current \?\? crypto\.randomUUID\(\)/);
  assert.ok((page.match(/idempotencyKeyRef\.current = null/g) ?? []).length >= 3);
  assert.doesNotMatch(route, /\.from\("leads"\)/);
  assert.match(route, /\.rpc\("create_inquiry_from_public_intake"/);
});

test("privacy evidence version is server-owned and documented", () => {
  assert.equal(PRIVACY_NOTICE_VERSION, "homepage-intake-2026-10-13");
  assert.doesNotMatch(JSON.stringify(validBody), /privacy_notice_version|privacyNoticeVersion/);
  assert.match(architecture, /homepage-intake-2026-10-13/);
});
