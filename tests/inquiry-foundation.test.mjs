import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL(
  "../supabase/migrations/20261012000100_inquiry_foundation.sql", import.meta.url,
), "utf8");
const executable = migration.replace(/--[^\n]*/g, "");
const dryRun = readFileSync(new URL(
  "../supabase/tests/inquiry_foundation_dry_run.sql", import.meta.url,
), "utf8");
const rollback = readFileSync(new URL(
  "../supabase/tests/inquiry_foundation_rollback.sql", import.meta.url,
), "utf8");
const architecture = readFileSync(new URL(
  "../docs/architecture/lia-inquiry-foundation.md", import.meta.url,
), "utf8");

test("Inquiry Foundation migration is schema-only and creates exactly four domain tables", () => {
  assert.doesNotMatch(executable,
    /\bINSERT\s+INTO\s+public\.(providers|organizations|care_offerings|inquiry_contacts|inquiries|inquiry_referrals|inquiry_activities)\b/i);
  assert.doesNotMatch(executable, /\bUPDATE\s+public\b|\bDELETE\s+FROM\b|\bTRUNCATE\b|\bCOPY\s+public\b/i);
  assert.deepEqual([...migration.matchAll(/CREATE TABLE public\.(\w+)/g)].map((match) => match[1]), [
    "inquiry_contacts", "inquiries", "inquiry_referrals", "inquiry_activities",
  ]);
});

test("approved inquiry and referral status vocabularies are exact", () => {
  assert.match(migration,
    /inquiries_workflow_status_check[\s\S]*'new', 'reviewing', 'qualified', 'matching', 'closed'/);
  assert.match(migration,
    /inquiry_referrals_status_check[\s\S]*'shortlisted', 'ready_to_share', 'shared', 'engaged', 'converted', 'closed'/);
  assert.doesNotMatch(migration, /service_started|'family_contacted'/);
  for (const outcome of ["care_started", "admission_or_placement", "other_success"]) {
    assert.match(migration, new RegExp(`'${outcome}'`));
  }
});

test("contacts are separate, reusable, non-deduplicated, and anonymizable", () => {
  assert.match(migration, /CREATE TABLE public\.inquiry_contacts/);
  assert.match(migration, /primary_contact_id uuid NOT NULL REFERENCES public\.inquiry_contacts\(id\) ON DELETE RESTRICT/);
  assert.doesNotMatch(migration, /UNIQUE\s*\(email\)|UNIQUE\s*\(phone\)/i);
  assert.match(migration, /inquiry_contacts_identity_state_check/);
  assert.match(dryRun, /count\(\*\) FROM public\.inquiries WHERE primary_contact_id = v_contact\) <> 2/);
});

test("referrals require an organization while provider and offering remain optional", () => {
  assert.match(migration,
    /recipient_organization_id uuid NOT NULL REFERENCES public\.organizations\(id\) ON DELETE RESTRICT/);
  assert.match(migration, /provider_id uuid REFERENCES public\.providers\(id\) ON DELETE RESTRICT/);
  assert.match(migration, /care_offering_id uuid,/);
  assert.match(migration,
    /FOREIGN KEY \(provider_id, care_offering_id\)[\s\S]*REFERENCES public\.care_offerings\(provider_id, id\)/);
  assert.match(dryRun, /multiple independent referrals/);
});

test("provider targeting accepts responsible relationships and rejects network-only links", () => {
  assert.match(migration,
    /po\.relationship_type IN \('operator', 'owner', 'brand'\)/);
  const validationFunction = migration.match(
    /CREATE FUNCTION public\.validate_inquiry_referral_target\(\)[\s\S]*?\$\$;/,
  )?.[0] ?? "";
  assert.doesNotMatch(validationFunction, /'network'/);
  assert.match(dryRun, /Network-only provider relationship was accepted/);
  assert.match(dryRun, /Legacy residence without an organization relationship was accepted/);
  assert.match(dryRun, /Offering from another provider was accepted/);
});

test("active referrals block inquiry closure and terminal referrals allow it", () => {
  assert.match(migration,
    /Inquiry cannot close while an active referral remains/);
  assert.match(migration,
    /referral_status IN \('shortlisted', 'ready_to_share', 'shared', 'engaged'\)/);
  assert.match(dryRun, /Inquiry closed with active referrals/);
  assert.match(dryRun, /Inquiry did not close after referrals became terminal/);
});

test("sharing authorization and disclosure evidence remain separate", () => {
  assert.match(migration, /provider_sharing_permission_status text NOT NULL DEFAULT 'not_recorded'/);
  assert.match(migration, /sharing_authorization_basis text/);
  assert.match(migration, /sharing_authorized_at timestamptz/);
  assert.match(migration, /sharing_authorization_withdrawn_at timestamptz/);
  assert.match(migration, /shared_at timestamptz/);
  assert.match(migration, /inquiry_referrals_shared_state_check/);
  assert.match(dryRun, /Referral creation implicitly shared family data/);
  assert.match(dryRun, /Shared referral without authorization was accepted/);
});

test("activities are append-only while current state remains on inquiry and referral rows", () => {
  assert.match(migration, /CREATE TABLE public\.inquiry_activities/);
  assert.match(migration, /CREATE TRIGGER inquiry_activities_append_only/);
  assert.match(migration, /Inquiry activities are append-only/);
  assert.match(migration, /workflow_status text NOT NULL DEFAULT 'new'/);
  assert.match(migration, /referral_status text NOT NULL DEFAULT 'shortlisted'/);
  assert.match(dryRun, /Append-only activity accepted an update/);
  assert.match(dryRun, /Append-only activity accepted a delete/);
});

test("the four inquiry tables are private and have no client policies", () => {
  for (const table of ["inquiry_contacts", "inquiries", "inquiry_referrals", "inquiry_activities"]) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
  }
  assert.match(migration,
    /REVOKE ALL ON TABLE public\.inquiry_contacts, public\.inquiries,[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration,
    /FROM PUBLIC, anon, authenticated, service_role;[\s\S]*GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE/);
  assert.match(migration,
    /GRANT SELECT, INSERT ON TABLE public\.inquiry_activities TO service_role/);
  assert.doesNotMatch(migration, /CREATE POLICY/);
  assert.doesNotMatch(migration, /GRANT [^;]+ TO anon|GRANT [^;]+ TO authenticated/i);
  assert.match(dryRun, /anon\/authenticated received ordinary inquiry-table privileges/);
  assert.match(dryRun, /service_role inquiry CRUD grants are not least-privilege/);
  assert.match(dryRun, /service_role activity grants are not append-only\/least-privilege/);
});

test("migration vocabulary and approved architecture stay aligned", () => {
  for (const value of [
    "ems", "home_care", "home_support", "senior_residence", "respite", "unsure",
    "within_7_days", "within_1_month", "within_3_months", "planning", "information_only",
    "general_permission", "referral_specific_permission",
  ]) {
    assert.match(migration, new RegExp(`'${value}'`));
    assert.match(architecture, new RegExp(`\\b${value}\\b`));
  }
  assert.match(migration, /retention_due_at timestamptz/);
  assert.doesNotMatch(migration, /retention_due_at[^\n]*(interval|day|month|year)/i);
});

test("verification rollback removes only Inquiry Foundation objects", () => {
  assert.deepEqual([...rollback.matchAll(/DROP TABLE public\.(\w+)/g)].map((match) => match[1]), [
    "inquiry_activities", "inquiry_referrals", "inquiries", "inquiry_contacts",
  ]);
  assert.doesNotMatch(rollback,
    /public\.(providers|organizations|provider_organizations|care_offerings|supabase_migrations)/);
  assert.match(rollback, /DROP FUNCTION public\.inquiry_text_array_is_unique\(text\[\]\)/);
});
