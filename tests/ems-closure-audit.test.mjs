import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { providers } from "../lib/providers.js";
import { PHASE4E_CLOSURE_EVIDENCE_SLUGS } from "../lib/provider-care-evidence.mjs";
import { buildPhase4cEvidenceSet } from "../scripts/phase4c-care-evidence.mjs";
import { validatePhase4eIdentityBatch } from "../scripts/phase4e-identity.mjs";
import { loadCareBatch, selectApprovedPackets } from "../scripts/phase4c-care-batch.mjs";

const auditPath = new URL("../docs/research/phase4e-ems-closure/audit.json", import.meta.url);
const audit = JSON.parse(readFileSync(auditPath, "utf8"));
const repositoryBySlug = new Map(providers.map((provider) => [provider.id, provider]));
const packetBySlug = new Map(buildPhase4cEvidenceSet().map((entry) => [entry.slug, entry.packet]));

test("closure audit partitions every existing EMS record exactly once", () => {
  assert.equal(audit.schemaVersion, 1);
  assert.equal(audit.auditId, "phase4e-existing-provider-ems-closure");
  assert.deepEqual(audit.approval,
    { identityCorrections: true, localApply: true, publish: false, verify: false });
  assert.deepEqual(audit.counts, { repositoryEmsRecords: 46, alreadyEnriched: 24,
    resolvableNow: 7, freshResearchHolds: 5, deferOrExcludeV1: 10 });

  const groups = [audit.alreadyEnriched, audit.carePlans.map((item) => item.slug),
    audit.freshResearchHolds.map((item) => item.slug), audit.deferOrExcludeV1.map((item) => item.slug)];
  const assigned = groups.flat();
  assert.equal(new Set(assigned).size, 46);
  assert.deepEqual([...new Set(assigned)].sort(),
    providers.filter((provider) => provider.type === "ems").map((provider) => provider.id).sort());
});

test("identity corrections are exact, slug-stable and approved for guarded planning", () => {
  const expected = {
    "ems-chantemerle": ["EMS Chantemerle", "Lausanne", "1010", "Lausanne · 1010"],
    "ems-rozavere": ["EMS Rovéréaz", "Lausanne", "1012", "Lausanne · 1012"],
    "ems-laurelles-vevey": ["EMS Les Laurelles", "Montreux", "1820", "Montreux · 1820"],
    "ems-palmiers": ["EMS Les Palmiers", "Montreux", "1820", "Montreux · 1820"],
  };
  assert.deepEqual(audit.identityCorrections.map((item) => item.slug), Object.keys(expected));
  for (const item of audit.identityCorrections) {
    const repository = repositoryBySlug.get(item.slug);
    assert.deepEqual(item.currentRepository,
      { name: repository.name, commune: repository.commune, npa: repository.npa, address: repository.address });
    assert.deepEqual(Object.values(item.proposedRepositoryCorrection), expected[item.slug]);
    assert.equal(item.slugRemainsStable, true);
    assert.equal(item.redirect, null);
    assert.equal(item.safeWithoutUnrelatedProviderMutation, true);
    assert.equal(item.carePacketBlockedUntilIdentityApproval, false);
    assert.ok(audit.carePlans.find((plan) => plan.slug === item.slug).packetPath);
    assert.equal(existsSync(new URL(`../docs/research/provider-evidence/${item.slug}.json`, import.meta.url)), true);
  }
  const laurelles = audit.identityCorrections.find((item) => item.slug === "ems-laurelles-vevey");
  assert.deepEqual(laurelles.duplicateImplications,
    [{ slug: "laurelles-residence", finding: "The workbook finds no separate current residence entity.",
      actionNow: "leave completely untouched", futureWorkflow: "senior-residence duplicate resolution" }]);
  const checked = validatePhase4eIdentityBatch();
  assert.equal(checked.packets.length, 4);
  for (const { packet, baseline, postIdentityBaseline } of checked.packets) {
    assert.deepEqual(packet.approval, { localApply: true, publish: false, verify: false });
    assert.equal(postIdentityBaseline.slug, baseline.slug);
    assert.equal(postIdentityBaseline.original_location_text, baseline.original_location_text);
  }
});

test("all seven closure packets are approved while publication gates stay closed", () => {
  assert.deepEqual(audit.carePlans.map((item) => item.slug), [...PHASE4E_CLOSURE_EVIDENCE_SLUGS]);
  for (const plan of audit.carePlans) {
    assert.ok(existsSync(new URL(`../${plan.packetPath}`, import.meta.url)));
    const packet = packetBySlug.get(plan.slug);
    assert.deepEqual(packet.approval, { localApply: true, publish: false, verify: false });
    assert.equal(packet.offerings.length, 1);
    assert.equal(packet.offerings[0].offeringType, "ems");
    assert.equal(packet.offerings[0].capacity?.value ?? null, plan.capacityBeds);
  }
  const selected = selectApprovedPackets(loadCareBatch("phase4e-ems-closure"),
    [...PHASE4E_CLOSURE_EVIDENCE_SLUGS]);
  assert.equal(selected.length, 7);
  assert.equal(selected.find((item) => item.slug === "ems-laurelles-vevey").baseline.locality, "Montreux");
  assert.equal(repositoryBySlug.get("laurelles-residence").name, "Les Laurelles – Résidence");
});

test("holds and V1 exclusions remain formal classifications only", () => {
  assert.deepEqual(audit.freshResearchHolds.map((item) => item.slug),
    ["ems-signal", "ems-bethanie", "ems-novalles", "ems-oriel", "ems-gottrause"]);
  assert.deepEqual(audit.deferOrExcludeV1.map((item) => item.slug), [
    "ems-orme", "ems-naz", "ems-mont-calme", "ems-aubepines", "ems-praz-sechaud",
    "epsm-borde", "epsm-collonges", "epsm-rouvraie", "ems-penates", "ems-ligniere",
  ]);
  assert.match(audit.closureCondition, /31 enriched, 5 fresh-research holds and 10 V1 exclusions/);
});
