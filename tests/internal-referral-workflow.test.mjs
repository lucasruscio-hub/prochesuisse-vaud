import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = source("supabase/migrations/20261013000300_create_internal_referral_workflow_rpcs.sql");
const dryRun = source("supabase/tests/internal_referral_workflow_dry_run.sql");

test("referral workflow RPCs are atomic, optimistic, and service-role only", () => {
  for (const name of ["create_internal_inquiry_referral", "authorize_internal_referral_sharing",
    "withdraw_internal_referral_sharing_authorization", "mark_internal_referral_shared",
    "record_internal_referral_response", "transition_internal_referral_status"]) {
    assert.match(migration, new RegExp(`CREATE FUNCTION public\\.${name}`));
  }
  assert.match(migration, /FOR UPDATE/g);
  assert.match(migration, /stale_referral_status/);
  assert.match(migration, /manual_disclosure_attested/);
  assert.match(migration, /never transmits data or contacts a recipient/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/);
  assert.doesNotMatch(migration, /GRANT[^;]+TO authenticated|CREATE TABLE/);
});

test("database verification covers no auto-share, authorization, idempotency, response, and outcome", () => {
  for (const phrase of ["Shortlist creation was not atomic and non-sharing",
    "General authorization without inquiry permission succeeded", "Authorization or readiness auto-shared data",
    "Manual share recording was not idempotent and atomic", "Response or outcome was not recorded atomically",
    "Sharing after authorization withdrawal succeeded", "Withdrawal or pre-share closure was not preserved atomically"]) {
    assert.match(dryRun, new RegExp(phrase));
  }
  assert.match(dryRun, /ROLLBACK;/);
});

test("Lia actions authorize before mutation and expose only internal RPC operations", () => {
  const actions = source("app/lia/inquiries/actions.js");
  for (const rpc of ["create_internal_inquiry_referral", "authorize_internal_referral_sharing",
    "withdraw_internal_referral_sharing_authorization", "mark_internal_referral_shared",
    "record_internal_referral_response", "transition_internal_referral_status"]) assert.match(actions, new RegExp(rpc));
  assert.doesNotMatch(actions, /resend|sendEmail|fetch\(|from\("inquiry_referrals"\)/);
  assert.ok(actions.indexOf("await requireLiaStaff()") < actions.indexOf("supabase.rpc"));
});

test("Lia UI separates shortlist, authorization, readiness, manual sharing, response, and outcome", () => {
  const page = source("app/lia/inquiries/[id]/page.js") + source("app/lia/inquiries/[id]/ReferralShareForm.js");
  for (const phrase of ["Ajouter à la présélection", "Enregistrer l’autorisation",
    "Marquer prête à transmettre", "Lia n’envoie aucune donnée",
    "Enregistrer la réponse", "Marquer aboutie"]) assert.match(page, new RegExp(phrase));
});
