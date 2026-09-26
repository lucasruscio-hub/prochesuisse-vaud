import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HOME_CARE_V1_CONTRACT } from "../lib/home-care-foundation.js";

const migration = readFileSync(new URL(
  "../supabase/migrations/20260926000100_home_care_foundation.sql", import.meta.url,
), "utf8");
const executable = migration.replace(/--[^\n]*/g, "");
const dryRun = readFileSync(new URL(
  "../supabase/tests/home_care_foundation_dry_run.sql", import.meta.url,
), "utf8");

test("Phase 5B migration is additive schema-only and preserves unknown access dates", () => {
  assert.match(migration, /ALTER TABLE public\.provider_sources\s+ADD COLUMN accessed_on date;/);
  const accessDefinition = migration.match(/ADD COLUMN accessed_on[^;]*/)?.[0] ?? "";
  assert.doesNotMatch(accessDefinition, /NOT NULL|DEFAULT/i);
  assert.doesNotMatch(executable, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|COPY)\b/i);
  assert.doesNotMatch(executable, /CREATE TABLE/i);
  assert.match(migration, /NULL means unknown and must not be fabricated/i);
});

test("local dry-run verifies the 31 EMS baseline and zero home-care writes", () => {
  assert.match(dryRun, /count\(DISTINCT p\.id\)[\s\S]*primary_type = 'ems'\) <> 31/);
  assert.match(dryRun, /count\(\*\) FROM public\.provider_service_areas\) <> 0/);
  assert.match(dryRun, /provider_sources WHERE accessed_on IS NOT NULL/);
  assert.match(dryRun, /care_offerings WHERE offering_type = 'home_care'/);
  assert.match(dryRun, /Provider- and offering-scoped narrative coverage failed/);
  assert.match(dryRun, /Narrative coverage accepted a structured target/);
  assert.match(dryRun, /Structured coverage accepted a narrative label/);
  assert.match(dryRun, /Coverage accepted a missing source/);
  assert.match(dryRun, /Narrative coverage accepted a normalized duplicate/);
  assert.match(dryRun, /ROLLBACK;/);
  assert.doesNotMatch(dryRun.replace(/--[^\n]*/g, ""), /\b(?:UPDATE|DELETE|TRUNCATE|COPY)\b/i);
});

test("narrative regions are sourced, offering-scope compatible, and not structured geography", () => {
  assert.match(migration, /ADD COLUMN coverage_label text;/);
  assert.match(migration, /coverage_type IN \('municipality', 'canton', 'region'\)/);
  assert.match(migration, /coverage_type = 'region'[\s\S]*municipality_id IS NULL[\s\S]*canton_code IS NULL[\s\S]*btrim\(coverage_label\) <> ''/);
  assert.match(migration, /coverage_type = 'municipality'[\s\S]*coverage_label IS NULL/);
  assert.match(migration, /coverage_type = 'canton'[\s\S]*coverage_label IS NULL/);
  assert.match(migration, /ALTER COLUMN source_id SET NOT NULL/);
  assert.match(migration, /provider_service_areas_provider_region_key[\s\S]*care_offering_id IS NULL/);
  assert.match(migration, /provider_service_areas_offering_region_key[\s\S]*care_offering_id IS NOT NULL/);
  assert.match(migration, /display\/context only, never structured municipality matching/i);
});

test("home-care V1 maps every approved fact to existing architecture without defaults", () => {
  assert.equal(HOME_CARE_V1_CONTRACT.offeringType, "home_care");
  assert.deepEqual(Object.values(HOME_CARE_V1_CONTRACT.services)
    .map(({ kind, code }) => `${kind}.${code}`), [
    "service.home_nursing",
    "service.basic_care",
    "service.daily_life_assistance",
    "service.household_help",
    "care_profile.dementia_support",
    "service.palliative_care",
    "service.night_watch",
    "service.on_call_24h",
    "service.companionship",
    "service.meal_delivery",
    "service.respite_at_home",
    "service.emergency_call_service",
  ]);
  assert.ok(Object.values(HOME_CARE_V1_CONTRACT.services)
    .every(({ requiresExplicitEvidence }) => requiresExplicitEvidence));
  assert.deepEqual(HOME_CARE_V1_CONTRACT.narrativeFacts, {
    admissionsOrContact: "care_offerings.admissions_notes",
    reimbursementOrPublicPrivateContext: "care_offerings.financing_notes",
    pricingOrMinimumVisit: "care_offerings.pricing_notes",
    languages: "providers.language_codes",
  });
  assert.deepEqual(HOME_CARE_V1_CONTRACT.coverage.structured.types, ["municipality", "canton"]);
  assert.equal(HOME_CARE_V1_CONTRACT.coverage.narrative.use, "display_only");
  assert.equal(HOME_CARE_V1_CONTRACT.coverage.narrative.createsMunicipalityCoverage, false);
  assert.equal(HOME_CARE_V1_CONTRACT.unknownFacts, "absent");
});
