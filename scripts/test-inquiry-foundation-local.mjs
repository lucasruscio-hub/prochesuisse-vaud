import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectLocalTarget, parseLocalArgs, runLocalSql } from "../lib/local-provider-writer.mjs";

const migrationName = "20261012000100_inquiry_foundation";
const migration = readFileSync(new URL(
  `../supabase/migrations/${migrationName}.sql`, import.meta.url,
), "utf8");
const dryRun = readFileSync(new URL(
  "../supabase/tests/inquiry_foundation_dry_run.sql", import.meta.url,
), "utf8");
const withoutTransaction = (sql) => sql.replace(/^BEGIN;\s*$/m, "")
  .replace(/^COMMIT;\s*$/m, "").replace(/^ROLLBACK;\s*$/m, "");

const stateSql = `SELECT jsonb_build_object(
  'providers',(SELECT count(*) FROM public.providers),
  'organizations',(SELECT count(*) FROM public.organizations),
  'offerings',(SELECT count(*) FROM public.care_offerings),
  'cms',(SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%' AND primary_type='domicile'),
  'features',(SELECT count(*) FROM public.care_offering_features),
  'serviceAreas',(SELECT count(*) FROM public.provider_service_areas),
  'availability',(SELECT count(*) FROM public.care_offering_availability),
  'inquiryTables',(SELECT count(*) FROM information_schema.tables WHERE table_schema='public'
    AND table_name IN ('inquiry_contacts','inquiries','inquiry_referrals','inquiry_activities')),
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

const inquiryStateSql = `SELECT jsonb_build_object(
  'contacts',(SELECT count(*) FROM public.inquiry_contacts),
  'inquiries',(SELECT count(*) FROM public.inquiries),
  'referrals',(SELECT count(*) FROM public.inquiry_referrals),
  'activities',(SELECT count(*) FROM public.inquiry_activities),
  'constraints',(SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace
    AND conrelid IN ('public.inquiry_contacts'::regclass,'public.inquiries'::regclass,
      'public.inquiry_referrals'::regclass,'public.inquiry_activities'::regclass)),
  'indexes',(SELECT count(*) FROM pg_indexes WHERE schemaname='public'
    AND tablename IN ('inquiry_contacts','inquiries','inquiry_referrals','inquiry_activities')),
  'rlsTables',(SELECT count(*) FROM pg_class WHERE oid IN
    ('public.inquiry_contacts'::regclass,'public.inquiries'::regclass,
     'public.inquiry_referrals'::regclass,'public.inquiry_activities'::regclass)
    AND relrowsecurity),
  'clientPolicies',(SELECT count(*) FROM pg_policies WHERE schemaname='public'
    AND tablename IN ('inquiry_contacts','inquiries','inquiry_referrals','inquiry_activities'))
);`;

function state() {
  return JSON.parse(runLocalSql(stateSql).trim());
}

function assertProviderBaseline(value) {
  assert.equal(value.providers, 141);
  assert.equal(value.organizations, 64);
  assert.equal(value.offerings, 111);
  assert.equal(value.cms, 50);
  assert.equal(value.features, 84);
  assert.equal(value.serviceAreas, 4);
  assert.equal(value.availability, 0);
}

const args = parseLocalArgs(process.argv.slice(2));
assert.notEqual(args.mode, "--write-local",
  "Apply the migration through Supabase migration tooling; this verifier never writes persistently");
const target = inspectLocalTarget();
const before = state();
assertProviderBaseline(before);

if (args.mode === "--dry-run") {
  assert.equal(before.inquiryTables, 0, "Inquiry Foundation is already applied");
  runLocalSql(`BEGIN;\n${withoutTransaction(migration)}\n${withoutTransaction(dryRun)}\nROLLBACK;`);
  assert.deepEqual(state(), before, "rollback-only validation changed schema or provider data");
} else {
  assert.equal(before.inquiryTables, 4, "Inquiry Foundation tables are incomplete");
  const inquiryBefore = JSON.parse(runLocalSql(inquiryStateSql).trim());
  assert.deepEqual({
    contacts: inquiryBefore.contacts,
    inquiries: inquiryBefore.inquiries,
    referrals: inquiryBefore.referrals,
    activities: inquiryBefore.activities,
    rlsTables: inquiryBefore.rlsTables,
    clientPolicies: inquiryBefore.clientPolicies,
  }, { contacts: 0, inquiries: 0, referrals: 0, activities: 0, rlsTables: 4, clientPolicies: 0 });
  assert.ok(inquiryBefore.constraints >= 35, "Inquiry constraints are incomplete");
  assert.ok(inquiryBefore.indexes >= 15, "Inquiry indexes are incomplete");
  runLocalSql(dryRun);
  assert.deepEqual(state(), before, "constraint dry run changed schema or provider data");
  assert.deepEqual(JSON.parse(runLocalSql(inquiryStateSql).trim()), inquiryBefore,
    "constraint dry run changed inquiry schema or row counts");
}

console.log(JSON.stringify({
  mode: args.mode,
  target,
  migration: migrationName,
  rollbackValidation: args.mode === "--dry-run" ? "passed" : "not-requested",
  constraintDryRun: args.mode === "--verify-local" ? "passed" : "included-in-rollback",
  providerDomainUnchanged: true,
  databaseCounts: state(),
  inquiryState: args.mode === "--verify-local"
    ? JSON.parse(runLocalSql(inquiryStateSql).trim()) : { tables: 0, rows: 0 },
}, null, 2));
