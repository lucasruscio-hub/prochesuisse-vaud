import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  authorizeStaffUser, buildStaffOtpRequest, isAllowlistedStaffEmail,
  normalizeStaffEmail, parseStaffEmailAllowlist,
} from "../lib/lia-staff-auth-core.mjs";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("staff emails are normalized and matched against an exact server allowlist", () => {
  assert.equal(normalizeStaffEmail(" Staff@Lia.Example "), "staff@lia.example");
  assert.equal(normalizeStaffEmail("not-an-email"), "");
  assert.deepEqual([...parseStaffEmailAllowlist(" Staff@Lia.Example,other@lia.example ")],
    ["staff@lia.example", "other@lia.example"]);
  assert.equal(isAllowlistedStaffEmail("staff@lia.example", "staff@lia.example"), true);
  assert.equal(isAllowlistedStaffEmail("staff+other@lia.example", "staff@lia.example"), false);
});

test("authoritative authorization rejects missing and non-allowlisted users", async () => {
  assert.equal(await authorizeStaffUser(async () => ({ data: { user: null }, error: null }),
    "staff@lia.example"), null);
  assert.equal(await authorizeStaffUser(async () => ({
    data: { user: { id: "user-1", email: "outsider@example.test" } }, error: null,
  }), "staff@lia.example"), null);
  assert.deepEqual(await authorizeStaffUser(async () => ({
    data: { user: { id: "user-2", email: " Staff@Lia.Example " } }, error: null,
  }), "staff@lia.example"), { id: "user-2", email: "staff@lia.example" });
});

test("passwordless login never creates users and uses only the fixed callback", () => {
  assert.deepEqual(buildStaffOtpRequest("STAFF@LIA.EXAMPLE", "https://lia.example"), {
    email: "staff@lia.example",
    options: {
      shouldCreateUser: false,
      emailRedirectTo: "https://lia.example/lia/auth/callback",
    },
  });
  assert.throws(() => buildStaffOtpRequest("staff@lia.example", "http://lia.example"), /HTTPS/);
});

test("login checks the allowlist before requesting an OTP and returns generic copy", () => {
  const action = source("app/lia/login/actions.js");
  assert.ok(action.indexOf("isAllowlistedStaffEmail") < action.indexOf("signInWithOtp"));
  assert.match(action, /GENERIC_LOGIN_MESSAGE/);
  assert.match(source("lib/lia-staff-auth-core.mjs"), /shouldCreateUser:\s*false/);
});

test("every internal page and mutation uses the authoritative staff guard", () => {
  for (const path of [
    "app/lia/inquiries/layout.js", "app/lia/inquiries/page.js",
    "app/lia/inquiries/[id]/page.js", "app/lia/inquiries/actions.js",
  ]) assert.match(source(path), /requireLiaStaff\(/, path);
  assert.match(source("lib/lia-auth.js"), /auth\.auth\.getUser\(\)/);
  assert.doesNotMatch(source("lib/lia-auth.js"), /getSession\(/);
});

test("service-role access is server-only and absent from client components", () => {
  assert.match(source("lib/supabase.js"), /^import "server-only";/);
  for (const path of ["app/lia/login/LoginForm.js", "app/page.js", "app/recherche/RechercheClient.js"]) {
    const contents = source(path);
    assert.doesNotMatch(contents, /SUPABASE_SERVICE_ROLE_KEY|@\/lib\/supabase/);
  }
});
