import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  allowedNextStatuses, projectInquiryDetail, projectInquirySummaries,
} from "../lib/lia-inquiry-domain.mjs";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = source("supabase/migrations/20261013000200_create_internal_inquiry_workflow_rpcs.sql");
const sqlTest = source("supabase/tests/internal_inquiry_workflow_dry_run.sql");

test("inbox projection returns only the required operational summary fields", () => {
  const projected = projectInquirySummaries([
    { id: "closed", primary_contact_id: "c1", care_type_code: "ems", location_text: "Nyon",
      timing_code: "planning", workflow_status: "closed", submitted_at: "2026-10-13T12:00:00Z",
      last_activity_at: "2026-10-13T13:00:00Z", context_summary: "must not leak" },
    { id: "new", primary_contact_id: "c2", care_type_code: "home_care", location_text: "Lausanne",
      timing_code: "within_7_days", workflow_status: "new", submitted_at: "2026-10-12T12:00:00Z",
      last_activity_at: "2026-10-12T13:00:00Z" },
  ], [{ id: "c1", first_name: "A", last_name: "B", email: "private@example.test" },
    { id: "c2", first_name: "C", last_name: "D" }]);
  assert.equal(projected[0].id, "new", "actionable requests sort before closed requests");
  assert.deepEqual(Object.keys(projected[0]).sort(), [
    "careType", "contactName", "id", "lastActivityAt", "location", "submittedAt", "timing", "workflowStatus",
  ].sort());
  assert.doesNotMatch(JSON.stringify(projected), /must not leak|private@example/);
});

test("detail projection preserves approved data and orders activities chronologically", () => {
  const detail = projectInquiryDetail({
    id: "i1", primary_contact_id: "private", municipality_id: "m1", context_summary: "Contexte",
  }, { first_name: "Lia", email: "lia@example.test" }, [
    { id: "b", occurred_at: "2026-10-13T12:00:00Z" },
    { id: "a", occurred_at: "2026-10-13T11:00:00Z" },
  ], { official_name: "Lausanne" });
  assert.equal(detail.context_summary, "Contexte");
  assert.equal(detail.contact.email, "lia@example.test");
  assert.equal(detail.municipality.official_name, "Lausanne");
  assert.deepEqual(detail.activities.map((item) => item.id), ["a", "b"]);
  assert.equal("primary_contact_id" in detail, false);
  assert.equal("municipality_id" in detail, false);
});

test("the UI exposes only approved forward workflow transitions", () => {
  assert.deepEqual(allowedNextStatuses("new"), ["reviewing", "closed"]);
  assert.deepEqual(allowedNextStatuses("reviewing"), ["qualified", "closed"]);
  assert.deepEqual(allowedNextStatuses("qualified"), ["matching", "closed"]);
  assert.deepEqual(allowedNextStatuses("matching"), ["closed"]);
  assert.deepEqual(allowedNextStatuses("closed"), []);
});

test("workflow migration is narrowly scoped, atomic, optimistic, and service-role only", () => {
  assert.match(migration, /CREATE FUNCTION public\.transition_internal_inquiry_status/);
  assert.match(migration, /CREATE FUNCTION public\.add_internal_inquiry_note/);
  assert.match(migration, /SECURITY INVOKER/g);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /stale_inquiry_status/);
  assert.match(migration, /active_referral_blocks_closure/);
  assert.match(migration, /activity_type, actor_type, actor_label/);
  assert.match(migration, /'inquiry_status_changed'/);
  assert.match(migration, /'note_added'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/);
  assert.doesNotMatch(migration, /GRANT[^;]+TO authenticated|CREATE TABLE|inquiry_referrals\s*\(/);
});

test("transactional SQL covers atomic failures, notes, closure, privileges, and zero referral output", () => {
  for (const expected of [
    "Invalid transition succeeded", "Stale transition succeeded", "Rejected transition changed inquiry state",
    "Oversized note succeeded", "Closure with active referral succeeded", "Internal workflow RPC privileges are unsafe",
  ]) assert.match(sqlTest, new RegExp(expected));
  assert.match(sqlTest, /context_summary[\s\S]*Valeur familiale originale/);
  assert.match(sqlTest, /ROLLBACK;/);
  assert.match(sqlTest, /count\(\*\) FROM public\.inquiry_referrals/);
});

test("server actions authorize first and call only the approved workflow RPCs", () => {
  const actions = source("app/lia/inquiries/actions.js");
  const firstGuard = actions.indexOf("await requireLiaStaff()");
  assert.ok(firstGuard > -1 && firstGuard < actions.indexOf("supabase.rpc"));
  assert.match(actions, /transition_internal_inquiry_status/);
  assert.match(actions, /add_internal_inquiry_note/);
  assert.doesNotMatch(actions, /from\("inquiry_referrals"\)|create.*referral/i);
});

test("detail UI makes absent sharing permission explicit and referral action inert", () => {
  const page = source("app/lia/inquiries/[id]/page.js");
  assert.match(page, /Non enregistré — aucun partage autorisé/);
  assert.match(page, /Lia ne peut pas transmettre/);
  assert.match(page, /Trouver des prestataires/);
  assert.match(page, /<button disabled/);
});
