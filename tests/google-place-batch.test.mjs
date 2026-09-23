import test from "node:test";
import assert from "node:assert/strict";
import { approvedGooglePlaceId } from "../lib/google-place-approval.js";
import { buildGooglePlaceBatchReport, searchIdentityForSlug, validateBatchInput } from "../lib/google-place-batch.js";

const place = (suffix) => ({ placeId: `ChIJcandidate${suffix}`, googleName: `Candidate ${suffix}`,
  googleAddress: `${suffix} rue Example, Vaud`, googleMapsUrl: `https://www.google.com/maps/place/${suffix}` });

test("batch report records zero, one, and multiple candidate outcomes without approving", async () => {
  const input = { schemaVersion: 1, batchId: "test-batch", slugs: [
    "ems-clair-soleil", "ems-chateau-rive", "ems-boissonnet",
  ] };
  const results = [[], [place("one")], [place("a"), place("b")]];
  const report = await buildGooglePlaceBatchReport(input, {
    search: async () => results.shift(), now: () => new Date("2026-09-23T10:00:00Z"),
  });
  assert.deepEqual(report.entries.map((entry) => entry.candidateMultiplicity), ["zero", "one", "multiple"]);
  assert.deepEqual(report.entries.map((entry) => entry.returnedCandidateCount), [0, 1, 2]);
  assert.equal(report.automaticApprovals, 0);
  assert.ok(report.entries.every((entry) => entry.humanDecision.decision === "pending"
    && entry.humanDecision.selectedPlaceId === null
    && entry.candidates.every((candidate) => candidate.plausibility === "unreviewed")));
  assert.doesNotMatch(JSON.stringify(report), /"status"\s*:\s*"approved"/);
});

test("queries use reviewed names where available and keep home-care as an office identity", () => {
  assert.equal(searchIdentityForSlug("ems-boveresses").name, "Tertianum Les Boveresses");
  assert.match(searchIdentityForSlug("ems-boveresses").query, /Lausanne 1010 Suisse$/);
  assert.equal(searchIdentityForSlug("senevita-vaud").identityScope, "office");
  assert.equal(searchIdentityForSlug("ems-clair-soleil").identityScope, "establishment");
});

test("unknown, duplicate, and Nova Vita slugs are rejected before search", () => {
  for (const slugs of [["unknown"], ["ems-boveresses", "ems-boveresses"], ["nova-via"]]) {
    assert.throws(() => validateBatchInput({ schemaVersion: 1, batchId: "test-batch", slugs }));
  }
});

test("batch discovery cannot modify or invalidate the existing Boveresses approval", async () => {
  const id = "ChIJBoveressesApproved";
  const approvals = { "ems-boveresses": { status: "approved", placeId: id,
    reviewedBy: "Human", reviewedOn: "2026-09-22", identityNote: "Site identity checked" },
    "ems-clair-soleil": { status: "held", placeId: null } };
  const before = structuredClone(approvals);
  await buildGooglePlaceBatchReport({ schemaVersion: 1, batchId: "test-batch", slugs: ["ems-boveresses"] },
    { search: async () => [place("new")] });
  assert.deepEqual(approvals, before);
  assert.equal(approvedGooglePlaceId(approvals, "ems-boveresses"), id);
});

test("the same approved Place ID cannot silently attach to two Lia providers", () => {
  const shared = { status: "approved", placeId: "ChIJSharedPlace123", reviewedBy: "Human",
    reviewedOn: "2026-09-23", identityNote: "Independently reviewed" };
  const approvals = { "ems-boveresses": shared, "ems-clair-soleil": { ...shared } };
  assert.equal(approvedGooglePlaceId(approvals, "ems-boveresses"), null);
  assert.equal(approvedGooglePlaceId(approvals, "ems-clair-soleil"), null);
  assert.equal(approvedGooglePlaceId({ "nova-via": shared }, "nova-via"), null);
});
