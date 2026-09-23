import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildBoveressesCarePacket, validateBoveressesCarePacket } from "../lib/care-review-packet.mjs";
import { buildBoveressesCareApplySql } from "../lib/care-review-apply.mjs";
import { inspectLegacyProviders } from "../scripts/ingest-legacy-providers.mjs";

const phase3 = JSON.parse(readFileSync(new URL("../docs/research/phase3b-pilots/canonical/ems-boveresses.json", import.meta.url), "utf8"));
const canonical = JSON.parse(readFileSync(new URL("../docs/research/phase4b-pilots/canonical/ems-boveresses-care.json", import.meta.url), "utf8"));
const baseline = inspectLegacyProviders().rows.find((row) => row.legacyId === "ems-boveresses").provider;
const phase3Patch = Object.fromEntries(phase3.claims.filter((claim) => claim.target)
  .map((claim) => [claim.target, claim.value]));
const expectedProvider = { ...baseline, ...phase3Patch };

test("canonical care packet is a deterministic projection of reviewed Phase 3B evidence", () => {
  const expected = buildBoveressesCarePacket(phase3);
  const compared = structuredClone(canonical);
  compared.approval.localApply = false;
  assert.deepEqual(compared, expected);
  assert.deepEqual(validateBoveressesCarePacket(canonical), {
    valid: true, localApplyReady: true, offeringCount: 1,
    importedFeatureCount: 5, deferredCount: 3, unresolvedCount: 0,
  });
});

test("only supported offering facts are approved and unknowns remain null or absent", () => {
  const offering = canonical.offerings[0];
  assert.deepEqual(offering.capacity, {
    value: 42, unit: "beds", evidence: offering.capacity.evidence,
  });
  assert.equal(offering.stayModes.longStay.value, true);
  assert.equal(offering.stayModes.shortStay, null);
  assert.equal(offering.stayModes.respiteStay, null);
  assert.deepEqual(offering.careProfiles, []);
  assert.deepEqual(offering.features.map((feature) => feature.code), [
    "palliative_care", "physiotherapy", "occupational_therapy", "podology", "hairdressing",
  ]);
  for (const key of ["admissions", "financing", "publicInterestStatus", "pricing"]) {
    assert.equal(offering[key], null);
  }
  assert.ok(canonical.deferred.some((claim) => claim.field === "service.short_respite_stay"));
  assert.ok(canonical.deferred.some((claim) => claim.field === "care_profile"));
  assert.doesNotMatch(JSON.stringify(canonical), /google/i);
});

test("unknown feature codes and altered evidence fail controlled review", () => {
  const unknown = structuredClone(canonical);
  unknown.offerings[0].features[0].code = "invented_service";
  assert.throws(() => validateBoveressesCarePacket(unknown), /Unsupported controlled care feature/);
  const altered = structuredClone(phase3);
  altered.claims.find((claim) => claim.field === "capacity.beds").value = 99;
  assert.throws(() => buildBoveressesCarePacket(altered), /Missing unique reviewed research claim/);
});

test("guarded SQL is additive, offering scoped, sourced, and rejects repeat state", () => {
  const sql = buildBoveressesCareApplySql(canonical, expectedProvider, { rollback: true });
  assert.match(sql, /INSERT INTO public\.organizations/);
  assert.match(sql, /INSERT INTO public\.care_offerings/);
  assert.match(sql, /INSERT INTO public\.care_offering_features/);
  assert.match(sql, /INSERT INTO public\.care_offering_sources/);
  assert.match(sql, /INSERT INTO public\.provider_organizations/);
  assert.match(sql, /Existing reviewed care state requires reconciliation/);
  assert.match(sql, /Unrelated or existing data changed/);
  assert.match(sql, /ROLLBACK;\s*$/);
  assert.match(sql, /INSERT INTO public\.provider_sources/);
  assert.doesNotMatch(sql, /UPDATE public\.|DELETE FROM public\.|\bUPSERT\b|ON CONFLICT\s*\(/i);
});
