import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectLocalTarget, parseLocalArgs, runLocalSql } from "../lib/local-provider-writer.mjs";

const migrationName = "20261013000300_create_internal_referral_workflow_rpcs";
const migration = readFileSync(new URL(`../supabase/migrations/${migrationName}.sql`, import.meta.url), "utf8");
const dryRun = readFileSync(new URL("../supabase/tests/internal_referral_workflow_dry_run.sql", import.meta.url), "utf8");
const withoutTransaction = (sql) => sql.replace(/^BEGIN;\s*$/m, "").replace(/^COMMIT;\s*$/m, "").replace(/^ROLLBACK;\s*$/m, "");
const functionNames = ["create_internal_inquiry_referral", "authorize_internal_referral_sharing",
  "withdraw_internal_referral_sharing_authorization", "mark_internal_referral_shared",
  "record_internal_referral_response", "transition_internal_referral_status"];
const stateSql = `SELECT jsonb_build_object(
  'contacts',(SELECT count(*) FROM public.inquiry_contacts),
  'inquiries',(SELECT count(*) FROM public.inquiries),
  'referrals',(SELECT count(*) FROM public.inquiry_referrals),
  'activities',(SELECT count(*) FROM public.inquiry_activities),
  'functions',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname = ANY(ARRAY[${functionNames.map((name) => `'${name}'`).join(",")}])) ,
  'providerDomainFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.providers t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offerings t)
  ))
);`;

const args = parseLocalArgs(process.argv.slice(2));
assert.notEqual(args.mode, "--write-local", "Apply migrations through Supabase migration tooling; this verifier never writes persistently");
const target = inspectLocalTarget();
const before = JSON.parse(runLocalSql(stateSql).trim());
assert.deepEqual({ contacts: before.contacts, inquiries: before.inquiries, referrals: before.referrals, activities: before.activities },
  { contacts: 0, inquiries: 0, referrals: 0, activities: 0 });
if (args.mode === "--dry-run") {
  assert.equal(before.functions, 0, "Internal referral RPC migration is already applied");
  runLocalSql(`BEGIN;\n${withoutTransaction(migration)}\n${withoutTransaction(dryRun)}\nROLLBACK;`);
} else {
  assert.equal(before.functions, functionNames.length, "Internal referral RPC migration is not applied");
  runLocalSql(dryRun);
}
const after = JSON.parse(runLocalSql(stateSql).trim());
assert.deepEqual(after, before, "Referral workflow verification changed local data or schema state");
console.log(JSON.stringify({ mode: args.mode, target, migration: migrationName,
  atomicReferralTests: "passed", providerDomainUnchanged: true, finalState: after }, null, 2));
