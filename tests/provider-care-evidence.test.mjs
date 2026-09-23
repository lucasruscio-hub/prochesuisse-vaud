import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CARE_FEATURE_TAXONOMY } from "../lib/care-feature-taxonomy.js";
import { PHASE4C_EVIDENCE_SLUGS } from "../lib/provider-care-evidence.mjs";
import { buildPhase4cEvidenceSet } from "../scripts/phase4c-care-evidence.mjs";

const entries = buildPhase4cEvidenceSet();
const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
const approvedSlugs = ["ems-chateau-rive", "ems-clair-soleil", "ems-le-home", "ems-girarde"];

test("five durable evidence files match the immutable workbook and repository identities", () => {
  assert.deepEqual(entries.map((entry) => entry.slug), [...PHASE4C_EVIDENCE_SLUGS]);
  for (const entry of entries) {
    assert.equal(entry.value.identity.status, "reconciled");
    assert.equal(entry.packet.approval.localApply, approvedSlugs.includes(entry.slug));
    assert.equal(entry.packet.approval.publish, false);
    assert.equal(entry.packet.approval.verify, false);
    assert.ok(entry.value.workbook.rows.every((row) => /^(Master Audit|Deep Enrichment)!/.test(row)));
    assert.doesNotMatch(JSON.stringify(entry.value), /google/i);
    assert.deepEqual(JSON.parse(readFileSync(entry.canonicalPath, "utf8")), entry.packet);
  }
});

test("only workbook-supported facts enter canonical packets", () => {
  const chateau = bySlug.get("ems-chateau-rive").packet.offerings[0];
  assert.equal(chateau.capacity.value, 103);
  assert.equal(chateau.stayModes.longStay.value, true);
  assert.equal(chateau.stayModes.shortStay.value, true);
  assert.deepEqual(chateau.features.map((item) => `${item.kind}.${item.code}`), [
    "care_profile.geriatric_care", "service.physiotherapy", "service.podology", "service.hairdressing",
  ]);

  const clair = bySlug.get("ems-clair-soleil").packet.offerings[0];
  assert.equal(clair.capacity.value, 94);
  assert.equal(clair.stayModes.longStay.value, true);
  assert.deepEqual(clair.features.map((item) => `${item.kind}.${item.code}`), [
    "service.social_activities", "facility.garden_or_park",
  ]);

  const home = bySlug.get("ems-le-home").packet.offerings[0];
  assert.equal(home.capacity.value, 31);
  assert.deepEqual(home.features.map((item) => item.code), ["hairdressing", "social_activities"]);

  const girarde = bySlug.get("ems-girarde").packet.offerings[0];
  assert.equal(girarde.capacity.value, 62);
  assert.equal(girarde.admissions.value, "Admissions gérées par le BRIO.");
  assert.equal(girarde.publicInterestStatus, null);
  assert.deepEqual(girarde.features.map((item) => item.code), [
    "psychiatric_care", "podology", "hairdressing", "social_activities",
  ]);
});

test("Signal remains held and no conflicting capacity is projected", () => {
  const entry = bySlug.get("ems-signal");
  assert.equal(entry.value.review.status, "held");
  assert.equal(entry.packet.approval.localApply, false);
  assert.equal(entry.packet.offerings[0].capacity, null);
  assert.deepEqual(entry.packet.unresolved.map((item) => item.code), ["capacity_conflict"]);
  assert.ok(entry.packet.deferred.some((item) => item.field === "offering.capacity"));
});

test("accepted taxonomy additions enter only approved, workbook-supported packets", () => {
  const proposals = entries.flatMap((entry) => entry.value.taxonomyProposals);
  assert.deepEqual(proposals, []);
  assert.equal(CARE_FEATURE_TAXONOMY.service.social_activities, "Activités sociales et socioculturelles");
  assert.equal(CARE_FEATURE_TAXONOMY.facility.garden_or_park, "Jardin ou parc");
  assert.ok(bySlug.get("ems-clair-soleil").packet.offerings[0].features
    .some((feature) => feature.code === "garden_or_park"));
  assert.ok(!bySlug.get("ems-signal").packet.offerings[0].features
    .some((feature) => ["social_activities", "garden_or_park"].includes(feature.code)));
});
