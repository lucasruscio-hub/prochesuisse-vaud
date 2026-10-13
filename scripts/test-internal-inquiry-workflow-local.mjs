import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectLocalTarget, parseLocalArgs, runLocalSql } from "../lib/local-provider-writer.mjs";

const migrationName = "20261013000200_create_internal_inquiry_workflow_rpcs";
const migration = readFileSync(new URL(
  `../supabase/migrations/${migrationName}.sql`, import.meta.url,
), "utf8");
const dryRun = readFileSync(new URL(
  "../supabase/tests/internal_inquiry_workflow_dry_run.sql", import.meta.url,
), "utf8");
const withoutTransaction = (sql) => sql.replace(/^BEGIN;\s*$/m, "")
  .replace(/^COMMIT;\s*$/m, "").replace(/^ROLLBACK;\s*$/m, "");

const stateSql = `SELECT jsonb_build_object(
  'contacts',(SELECT count(*) FROM public.inquiry_contacts),
  'inquiries',(SELECT count(*) FROM public.inquiries),
  'referrals',(SELECT count(*) FROM public.inquiry_referrals),
  'activities',(SELECT count(*) FROM public.inquiry_activities),
  'statusFunction',(to_regprocedure('public.transition_internal_inquiry_status(uuid,text,text,text)') IS NOT NULL),
  'noteFunction',(to_regprocedure('public.add_internal_inquiry_note(uuid,text)') IS NOT NULL),
  'providerDomainFingerprint',md5(concat_ws('|',
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.providers t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.municipalities t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_service_areas t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_names t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.organization_relationships t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_names t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_identity_links t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.provider_organizations t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offerings t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_sources t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_features t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_availability t),
    (SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.care_offering_regulatory_designations t)
  ))
);`;

const args = parseLocalArgs(process.argv.slice(2));
assert.notEqual(args.mode, "--write-local",
  "Apply migrations through Supabase migration tooling; this verifier never writes persistently");
const target = inspectLocalTarget();
const before = JSON.parse(runLocalSql(stateSql).trim());
assert.deepEqual({ contacts: before.contacts, inquiries: before.inquiries,
  referrals: before.referrals, activities: before.activities },
{ contacts: 0, inquiries: 0, referrals: 0, activities: 0 });

if (args.mode === "--dry-run") {
  assert.equal(before.statusFunction, false, "Internal workflow RPC is already applied");
  assert.equal(before.noteFunction, false, "Internal note RPC is already applied");
  runLocalSql(`BEGIN;\n${withoutTransaction(migration)}\n${withoutTransaction(dryRun)}\nROLLBACK;`);
} else {
  assert.equal(before.statusFunction, true, "Status RPC migration is not applied");
  assert.equal(before.noteFunction, true, "Note RPC migration is not applied");
  runLocalSql(dryRun);
}

const after = JSON.parse(runLocalSql(stateSql).trim());
assert.deepEqual(after, before, "Workflow verification changed local data or schema state");
console.log(JSON.stringify({ mode: args.mode, target, migration: migrationName,
  atomicWorkflowTests: "passed", providerDomainUnchanged: true, finalState: after }, null, 2));
