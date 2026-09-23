import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20260923000100_care_information_foundation.sql", import.meta.url), "utf8");
const coverageMigration = readFileSync(new URL("../supabase/migrations/20260923000200_offering_scoped_service_areas.sql", import.meta.url), "utf8");
const executable = migration.replace(/--[^\n]*/g, "");
const coverageExecutable = coverageMigration.replace(/--[^\n]*/g, "");

test("Phase 4A adds only the minimum organization and offering relations", () => {
  const tables = [...migration.matchAll(/CREATE TABLE public\.(\w+)/g)].map((match) => match[1]);
  assert.deepEqual(tables, ["organizations", "provider_organizations", "care_offerings",
    "care_offering_features", "care_offering_sources", "care_offering_availability"]);
  assert.doesNotMatch(executable, /\bINSERT\s+INTO\b|\bCOPY\b|google_place|\bALTER\s+TABLE\s+public\.providers\b/i);
  assert.match(migration, /provider_id uuid NOT NULL REFERENCES public\.providers\(id\)/);
  assert.match(migration, /UNIQUE \(provider_id, slug\)/);
  assert.match(migration, /offering_type IN \([\s\S]*'ems'[\s\S]*'home_care'[\s\S]*'senior_residence'[\s\S]*'medicalized_care_unit'/);
});

test("unknown facts remain nullable and capacity is scoped and paired", () => {
  for (const column of ["capacity_value", "capacity_unit", "long_stay", "short_stay", "respite_stay",
    "admissions_notes", "financing_notes", "public_interest_status", "pricing_notes"]) {
    const definition = migration.match(new RegExp(`\\b${column}\\b[^\\n]*`))?.[0] ?? "";
    assert.doesNotMatch(definition, /NOT NULL|DEFAULT false|DEFAULT 0/i, `${column} must preserve unknown`);
  }
  assert.match(migration, /care_offerings_capacity_pair CHECK \(\(capacity_value IS NULL\) = \(capacity_unit IS NULL\)\)/);
  assert.match(migration, /Positive, sourced facts only\. Missing rows remain unknown rather than false/);
});

test("new facts have owned provenance and home-care coverage is not inferred", () => {
  assert.match(migration, /care_offering_sources_own_source FOREIGN KEY \(provider_id, source_id\)/);
  assert.match(migration, /care_offering_features_own_source FOREIGN KEY \(provider_id, source_id\)/);
  assert.match(migration, /care_offering_availability_own_source FOREIGN KEY \(provider_id, source_id\)/);
  assert.match(migration, /provider_organizations_own_source FOREIGN KEY \(provider_id, source_id\)/);
  assert.doesNotMatch(migration, /INSERT INTO public\.provider_service_areas|UPDATE public\.provider_service_areas/i);
});

test("existing coverage gains optional same-provider offering scope without new facts", () => {
  assert.match(coverageMigration, /ALTER TABLE public\.provider_service_areas\s+ADD COLUMN care_offering_id uuid;/);
  assert.doesNotMatch(coverageMigration.match(/ADD COLUMN care_offering_id[^;]*/)?.[0] ?? "", /NOT NULL|DEFAULT/i);
  assert.match(coverageMigration, /FOREIGN KEY \(provider_id, care_offering_id\)\s+REFERENCES public\.care_offerings\(provider_id, id\)/);
  assert.doesNotMatch(coverageExecutable, /\bINSERT\s+INTO\b|\bUPDATE\b|\bDELETE\s+FROM\b|CREATE TABLE/i);
  assert.match(coverageMigration, /provider_service_areas_provider_canton_key[\s\S]*care_offering_id IS NULL/);
  assert.match(coverageMigration, /provider_service_areas_offering_canton_key[\s\S]*care_offering_id IS NOT NULL/);
  assert.match(coverageMigration, /care_offering_id IS NULL[\s\S]*o\.provider_id = provider_service_areas\.provider_id[\s\S]*o\.is_published/);
});

test("feature families are database typed while feature codes remain application controlled", () => {
  assert.match(migration, /feature_kind text NOT NULL CHECK \(feature_kind IN \('care_profile', 'service', 'facility'\)\)/);
  assert.ok(migration.includes("feature_code text NOT NULL CHECK (feature_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$')"));
  assert.doesNotMatch(migration, /feature_code[^\n]*IN \(/);
  assert.doesNotMatch(migration, /CREATE TYPE[^;]*(care_profile|palliative_care|emergency_call_system)/i);
});

test("RLS requires deliberate publication and offering provenance remains private", () => {
  const tables = ["organizations", "provider_organizations", "care_offerings",
    "care_offering_features", "care_offering_sources", "care_offering_availability"];
  for (const table of tables) assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
  assert.match(migration, /care_offerings_public_read[\s\S]*is_published AND status = 'active'[\s\S]*p\.is_published/);
  assert.match(migration, /care_offering_availability_public_read[\s\S]*is_published/);
  assert.doesNotMatch(migration, /GRANT SELECT ON TABLE[^;]*care_offering_sources TO anon/i);
  assert.doesNotMatch(migration, /CREATE POLICY care_offering_sources/i);
  assert.doesNotMatch(migration, /CREATE POLICY[^;]*FOR (INSERT|UPDATE|DELETE|ALL)/i);
});
