import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL(
  "../supabase/migrations/20260928000100_phase5f_home_care_identity_foundation.sql",
  import.meta.url,
), "utf8");
const executable = migration.replace(/--[^\n]*/g, "");
const dryRun = readFileSync(new URL(
  "../supabase/tests/phase5f_home_care_identity_foundation_dry_run.sql", import.meta.url,
), "utf8");

test("Phase 5F migration is schema-only and leaves providers untouched", () => {
  assert.doesNotMatch(executable,
    /\bINSERT\s+INTO\b|\bUPDATE\s+public\b|\bDELETE\s+FROM\b|\bTRUNCATE\b|\bCOPY\s+public\b/i);
  assert.doesNotMatch(executable, /ALTER\s+TABLE\s+public\.providers\b/i);
  assert.match(migration, /Schema only: no provider, organization, offering, relationship, or evidence rows are created/);
  assert.deepEqual([...migration.matchAll(/CREATE TABLE public\.(\w+)/g)].map((match) => match[1]), [
    "organization_sources",
    "provider_names",
    "organization_names",
    "provider_identity_links",
    "organization_relationships",
    "care_offering_regulatory_designations",
  ]);
});

test("organizations have independently owned private evidence", () => {
  assert.match(migration, /CREATE TABLE public\.organization_sources/);
  assert.match(migration, /organization_id uuid NOT NULL REFERENCES public\.organizations\(id\)/);
  assert.match(migration, /accessed_on date/);
  assert.match(migration, /fields_supported text\[\] NOT NULL DEFAULT '\{\}'/);
  assert.doesNotMatch(migration, /GRANT SELECT ON TABLE[^;]*organization_sources[^;]*TO anon/i);
  assert.doesNotMatch(migration, /CREATE POLICY organization_sources/i);
});

test("historical names and provider identity links require entity-owned evidence", () => {
  for (const type of ["current_public", "legal", "trading", "historical"]) {
    assert.match(migration, new RegExp(`'${type}'`));
  }
  assert.match(migration, /provider_names_own_source FOREIGN KEY \(provider_id, source_id\)/);
  assert.match(migration, /organization_names_own_source FOREIGN KEY \(organization_id, source_id\)/);
  assert.match(migration, /provider_names_current_public_key[\s\S]*WHERE name_type = 'current_public'/);
  assert.match(migration, /organization_names_current_public_key[\s\S]*WHERE name_type = 'current_public'/);
  assert.match(migration, /relationship_type IN \([\s\S]*'successor'[\s\S]*'duplicate_of'[\s\S]*'split_into'/);
  assert.match(migration, /provider_identity_links_distinct/);
  assert.match(migration, /provider_identity_links_own_source/);
  assert.doesNotMatch(migration, /GRANT SELECT ON TABLE[^;]*provider_identity_links[^;]*TO anon/i);
});

test("network membership is distinct from ownership at both organization and provider layers", () => {
  assert.match(migration, /CREATE TABLE public\.organization_relationships/);
  assert.match(migration, /relationship_type text NOT NULL CHECK \(relationship_type IN \('network_member'\)\)/);
  assert.match(migration, /provider_organizations_relationship_type_check[\s\S]*'operator', 'owner', 'brand', 'network'/);
  assert.match(migration, /organization_relationships_own_source/);
  assert.doesNotMatch(migration, /delegated_operator/);
});

test("home support is a separate offering type without data migration", () => {
  assert.match(migration, /care_offerings_offering_type_check[\s\S]*'home_care', 'home_support'/);
  assert.doesNotMatch(executable, /SET\s+offering_type|INSERT\s+INTO\s+public\.care_offerings/i);
});

test("regulatory designations are offering-scoped, sourced, and time-aware", () => {
  assert.match(migration, /designation_type text NOT NULL CHECK \(designation_type IN \('authorization', 'classification'\)\)/);
  assert.match(migration, /designation_code text CHECK \([\s\S]*designation_code IS NULL OR/);
  assert.match(migration, /jurisdiction_country_code text CHECK/);
  assert.match(migration, /issuing_organization_id uuid REFERENCES public\.organizations/);
  assert.match(migration, /designation_status text CHECK/);
  for (const date of ["effective_on", "expires_on", "observed_on"]) {
    const definition = migration.match(new RegExp(`${date}[^\\n]*`))?.[0] ?? "";
    assert.doesNotMatch(definition, /NOT NULL|DEFAULT/i, `${date} must preserve unknown`);
  }
  assert.match(migration, /care_offering_regulatory_designations_own_offering/);
  assert.match(migration, /care_offering_regulatory_designations_own_source/);
  assert.match(migration, /is_published boolean NOT NULL DEFAULT false/);
});

test("Phase 5F SQL dry-run proves constraints and rolls every fixture back", () => {
  assert.match(dryRun, /count\(\*\) FROM public\.providers\) <> 66/);
  assert.match(dryRun, /count\(DISTINCT p\.id\)[\s\S]*primary_type = 'ems'\) <> 31/);
  assert.match(dryRun, /WHERE p\.slug='senevita-vaud'/);
  assert.match(dryRun, /Provider name accepted another provider source/);
  assert.match(dryRun, /Organization name accepted another organization source/);
  assert.match(dryRun, /Regulatory designation accepted an invalid date range/);
  assert.match(dryRun, /Unpublished Phase 5F rollback fixtures became public/);
  assert.match(dryRun, /ROLLBACK;/);
});
