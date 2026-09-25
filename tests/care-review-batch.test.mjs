import test from "node:test";
import assert from "node:assert/strict";
import { controlledCareFeature } from "../lib/care-feature-taxonomy.js";
import { validateCarePacket } from "../lib/care-review-packet.mjs";
import {
  describeCareApplyPlan,
  loadCareBatch,
  selectApprovedPackets,
  validateCareBatch,
} from "../scripts/phase4c-care-batch.mjs";

const source = { researchField: "identity.type", kind: "public", name: "Fixture public register",
  url: "https://example.test/register", accessedOn: "2026-09-23" };

function packet(slug = "ems-chateau-rive") {
  return { version: 1,
    identity: { legacyId: slug, slug, expectedName: "Fixture establishment", expectedType: "ems" },
    approval: { localApply: false, publish: false, verify: false },
    organizations: [],
    offerings: [{ slug: "ems", name: "Établissement médico-social", offeringType: "ems",
      typeEvidence: source, capacity: null,
      stayModes: { longStay: null, shortStay: null, respiteStay: null },
      careProfiles: [], features: [], admissions: null, financing: null,
      publicInterestStatus: null, pricing: null }],
    deferred: [], unresolved: [] };
}

function manifestFor(value, status = value.approval.localApply
  ? "packet_approved_for_local_apply" : "packet_ready_for_review") {
  const manifest = structuredClone(loadCareBatch());
  for (const item of manifest.candidates) Object.assign(item, { status: "evidence_missing_from_repo",
    repositoryMaterial: [], supportedCareFacts: [], proposedFacts: [], deferred: [],
    taxonomyMappings: [], sourceNames: [], unresolved: ["Fixture omitted"], localApply: false });
  const candidate = manifest.candidates.find((item) => item.slug === value.identity.slug);
  Object.assign(candidate, { status, repositoryMaterial: [], supportedCareFacts: ["fixture"],
    proposedFacts: ["fixture"], deferred: [], taxonomyMappings: [],
    sourceNames: [source.name], unresolved: value.unresolved.map((item) => item.description),
    localApply: value.approval.localApply });
  manifest.packetPaths = [{ slug: value.identity.slug, path: "fixture.json" }];
  return manifest;
}

test("the Phase 4C.1 batch exposes exactly four locally approved packets and holds Signal", () => {
  const checked = validateCareBatch(loadCareBatch());
  assert.equal(checked.candidates.size, 5);
  assert.equal(checked.packets.size, 5);
  assert.deepEqual(checked.readyForHumanReview, []);
  assert.deepEqual(checked.heldPackets.map((item) => item.packet.identity.slug), ["ems-signal"]);
  assert.deepEqual(checked.approvedForLocalApply.map((item) => item.packet.identity.slug),
    ["ems-chateau-rive", "ems-clair-soleil", "ems-le-home", "ems-girarde"]);
  assert.equal(checked.evidenceMissing.length, 0);
  for (const candidate of checked.candidates.values()) {
    assert.equal(candidate.localApply, candidate.slug !== "ems-signal");
  }
});

test("the Phase 4C.2 batch exposes eight locally approved packets and protects prior state", () => {
  const checked = validateCareBatch(loadCareBatch("phase4c-care-batch-02"));
  assert.equal(checked.candidates.size, 8);
  assert.equal(checked.packets.size, 8);
  assert.deepEqual(checked.readyForHumanReview, []);
  assert.deepEqual(checked.approvedForLocalApply.map((item) => item.packet.identity.slug), [
    "ems-marronnier", "ems-petit-flon", "ems-pre-fleuri", "ems-praz-joret",
    "ems-sauvabelin", "ems-mauri", "ems-pins", "ems-jardins-leman",
  ]);
  assert.deepEqual(checked.heldPackets, []);
  assert.deepEqual(checked.evidenceMissing, []);
  assert.deepEqual(loadCareBatch("phase4c-care-batch-02").protectedExisting,
    ["ems-boveresses", "ems-chateau-rive", "ems-clair-soleil", "ems-le-home", "ems-girarde", "ems-signal"]);
});

test("the Phase 4C.3 batch exposes six locally approved packets and protects all prior state", () => {
  const checked = validateCareBatch(loadCareBatch("phase4c-care-batch-03"));
  assert.equal(checked.candidates.size, 6);
  assert.equal(checked.packets.size, 6);
  assert.deepEqual(checked.readyForHumanReview, []);
  assert.deepEqual(checked.approvedForLocalApply.map((item) => item.packet.identity.slug), [
    "ems-arcades", "ems-meillerie", "ems-valency", "ems-meridienne", "ems-paix-soir", "ems-vernie",
  ]);
  assert.deepEqual(checked.heldPackets, []);
  assert.deepEqual(checked.evidenceMissing, []);
  assert.deepEqual(loadCareBatch("phase4c-care-batch-03").protectedExisting, [
    "ems-boveresses", "ems-chateau-rive", "ems-clair-soleil", "ems-le-home", "ems-girarde", "ems-signal",
    "ems-marronnier", "ems-petit-flon", "ems-pre-fleuri", "ems-praz-joret", "ems-sauvabelin",
    "ems-mauri", "ems-pins", "ems-jardins-leman",
  ]);
});

test("a valid packet is reviewable but cannot be selected before explicit approval", () => {
  const value = packet();
  const manifest = manifestFor(value);
  const checked = validateCareBatch(manifest, () => value);
  assert.equal(checked.readyForHumanReview.length, 1);
  assert.equal(checked.approvedForLocalApply.length, 0);
  assert.throws(() => selectApprovedPackets(manifest, [value.identity.slug], () => value),
    /lacks human local-apply approval/);
});

test("explicitly approved packets can be selected while protected and unresolved packets are refused", () => {
  const value = packet();
  value.approval.localApply = true;
  const manifest = manifestFor(value);
  assert.equal(selectApprovedPackets(manifest, [value.identity.slug], () => value).length, 1);
  assert.throws(() => selectApprovedPackets(manifest, ["ems-boveresses"], () => value), /protected/);

  const unresolved = packet();
  unresolved.unresolved.push({ code: "identity_review", description: "Identity still needs review." });
  const heldManifest = manifestFor(unresolved, "packet_held");
  assert.throws(() => selectApprovedPackets(heldManifest, [unresolved.identity.slug], () => unresolved),
    /lacks human local-apply approval/);
});

test("apply planning exposes exact operations and provenance without changing approval state", () => {
  const value = packet();
  value.approval.localApply = true;
  value.offerings[0].capacity = { value: 10, unit: "beds", evidence: source };
  value.offerings[0].features = [{ ...controlledCareFeature("service", "social_activities"), evidence: source }];
  const [selected] = selectApprovedPackets(manifestFor(value), [value.identity.slug], () => value);
  const plan = describeCareApplyPlan(selected);
  assert.equal(plan.organizations.length, 0);
  assert.equal(plan.offerings[0].action, "create");
  assert.deepEqual(plan.offerings[0].capacity, { value: 10, unit: "beds" });
  assert.equal(plan.offerings[0].features[0].code, "social_activities");
  assert.deepEqual(plan.approval, { localApply: true, publish: false, verify: false });
  assert.deepEqual(plan.provenance[0].uses.map((use) => use.field),
    ["offering_type", "capacity", "service.social_activities"]);
});

test("the generic contract accepts multiple distinct sourced offerings", () => {
  const value = packet();
  const second = structuredClone(value.offerings[0]);
  second.slug = "medicalized-care";
  second.name = "Unité de soins médicalisés";
  second.offeringType = "medicalized_care_unit";
  second.features = [{ ...controlledCareFeature("facility", "emergency_call_system"), evidence: source }];
  value.offerings.push(second);
  const result = validateCarePacket(value);
  assert.equal(result.offeringCount, 2);
  assert.equal(result.importedFeatureCount, 1);
});

test("unknown, duplicate, and Google-derived controlled facts are rejected", () => {
  const unknown = packet();
  unknown.offerings[0].features = [{ kind: "service", code: "invented", displayName: "Inventé",
    details: null, evidence: source }];
  assert.throws(() => validateCarePacket(unknown), /Unsupported controlled care feature/);

  const duplicate = packet();
  const feature = { ...controlledCareFeature("service", "palliative_care"), evidence: source };
  duplicate.offerings[0].features = [feature, structuredClone(feature)];
  assert.throws(() => validateCarePacket(duplicate), /Duplicate controlled care feature/);

  const google = packet();
  google.offerings[0].typeEvidence = { ...source, url: "https://maps.google.com/place/test" };
  assert.throws(() => validateCarePacket(google), /cannot use Google/);
});
