import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CARE_FEATURE_TAXONOMY } from "../lib/care-feature-taxonomy.js";
import { ALL_PHASE4C_EVIDENCE_SLUGS, PHASE4C_BATCH_2_EVIDENCE_SLUGS, PHASE4C_BATCH_3_EVIDENCE_SLUGS,
  PHASE4C_BATCH_4_EVIDENCE_SLUGS, PHASE4C_EVIDENCE_SLUGS,
  PHASE4E_CLOSURE_EVIDENCE_SLUGS } from "../lib/provider-care-evidence.mjs";
import { buildPhase4cEvidenceSet } from "../scripts/phase4c-care-evidence.mjs";

const entries = buildPhase4cEvidenceSet();
const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
const approvedSlugs = ["ems-chateau-rive", "ems-clair-soleil", "ems-le-home", "ems-girarde",
  ...PHASE4C_BATCH_2_EVIDENCE_SLUGS, ...PHASE4C_BATCH_3_EVIDENCE_SLUGS,
  ...PHASE4C_BATCH_4_EVIDENCE_SLUGS, ...PHASE4E_CLOSURE_EVIDENCE_SLUGS];

test("durable evidence files match the immutable workbook and repository identities", () => {
  assert.deepEqual(entries.map((entry) => entry.slug), [...ALL_PHASE4C_EVIDENCE_SLUGS]);
  for (const entry of entries) {
    assert.equal(entry.value.identity.status, "reconciled");
    assert.equal(entry.packet.approval.localApply, approvedSlugs.includes(entry.slug));
    assert.equal(entry.packet.approval.publish, false);
    assert.equal(entry.packet.approval.verify, false);
    assert.ok(entry.value.workbook.rows.every((row) => /^(Master Audit|Deep Enrichment|Structural Resolution)!/.test(row)));
    assert.doesNotMatch(JSON.stringify(entry.value), /google/i);
    assert.deepEqual(JSON.parse(readFileSync(entry.canonicalPath, "utf8")), entry.packet);
  }
});

test("batch two has human local-apply approval and does not alter batch one approval state", () => {
  assert.deepEqual(entries.slice(0, PHASE4C_EVIDENCE_SLUGS.length).map((entry) => entry.slug),
    [...PHASE4C_EVIDENCE_SLUGS]);
  for (const slug of PHASE4C_BATCH_2_EVIDENCE_SLUGS) {
    const entry = bySlug.get(slug);
    assert.equal(entry.value.review.status, "approved_for_local_apply");
    assert.deepEqual(entry.packet.approval, { localApply: true, publish: false, verify: false });
    assert.deepEqual(entry.packet.unresolved, []);
  }
  assert.equal(bySlug.get("ems-signal").value.review.status, "held");
  assert.equal(bySlug.get("ems-signal").packet.approval.localApply, false);
});

test("batch three has human local-apply approval and preserves publication gates", () => {
  assert.deepEqual(PHASE4C_BATCH_3_EVIDENCE_SLUGS, [
    "ems-arcades", "ems-meillerie", "ems-valency", "ems-meridienne", "ems-paix-soir", "ems-vernie",
  ]);
  for (const slug of PHASE4C_BATCH_3_EVIDENCE_SLUGS) {
    const entry = bySlug.get(slug);
    assert.equal(entry.value.review.status, "approved_for_local_apply");
    assert.deepEqual(entry.packet.approval, { localApply: true, publish: false, verify: false });
    assert.deepEqual(entry.packet.unresolved, []);
    assert.deepEqual(entry.value.taxonomyProposals, []);
  }
});

test("batch four has human local-apply approval and preserves publication gates", () => {
  assert.deepEqual(PHASE4C_BATCH_4_EVIDENCE_SLUGS, [
    "ems-boissonnet", "ems-odysse", "ems-pre-pariset", "ems-pre-tour", "ems-tremieres",
  ]);
  for (const slug of PHASE4C_BATCH_4_EVIDENCE_SLUGS) {
    const entry = bySlug.get(slug);
    assert.equal(entry.value.review.status, "approved_for_local_apply");
    assert.deepEqual(entry.packet.approval, { localApply: true, publish: false, verify: false });
    assert.deepEqual(entry.packet.unresolved, []);
    assert.deepEqual(entry.value.taxonomyProposals, []);
  }
});

test("Phase 4E closure packets are approved and remain deliberately narrow", () => {
  assert.deepEqual(PHASE4E_CLOSURE_EVIDENCE_SLUGS, [
    "ems-chantemerle", "ems-joli-automne", "ems-grand-pre", "ems-lys",
    "ems-rozavere", "ems-laurelles-vevey", "ems-palmiers",
  ]);
  for (const slug of PHASE4E_CLOSURE_EVIDENCE_SLUGS) {
    const entry = bySlug.get(slug);
    assert.equal(entry.value.review.status, "approved_for_local_apply");
    assert.deepEqual(entry.packet.approval, { localApply: true, publish: false, verify: false });
    assert.deepEqual(entry.packet.unresolved, []);
    assert.deepEqual(entry.value.taxonomyProposals, []);
    assert.deepEqual(entry.packet.offerings[0].stayModes,
      { longStay: null, shortStay: null, respiteStay: null });
  }
  assert.equal(bySlug.get("ems-chantemerle").packet.offerings[0].capacity, null);
  assert.deepEqual(bySlug.get("ems-chantemerle").packet.offerings[0].features.map((item) => item.code),
    ["geriatric_care"]);
  assert.equal(bySlug.get("ems-joli-automne").packet.offerings[0].capacity.value, 17);
  assert.equal(bySlug.get("ems-grand-pre").packet.offerings[0].capacity.value, 34);
  assert.equal(bySlug.get("ems-lys").packet.offerings[0].capacity.value, 36);
  assert.equal(bySlug.get("ems-rozavere").packet.offerings[0].capacity.value, 161);
  assert.equal(bySlug.get("ems-laurelles-vevey").packet.offerings[0].capacity.value, 33);
  assert.deepEqual(bySlug.get("ems-laurelles-vevey").packet.offerings[0].features
    .map((item) => `${item.kind}.${item.code}`),
  ["care_profile.geriatric_care", "facility.garden_or_park"]);
  assert.equal(bySlug.get("ems-palmiers").packet.offerings[0].capacity.value, 43);
  assert.equal(bySlug.get("ems-grand-pre").packet.organizations[0].slug, "fondation-primeroche");
  assert.equal(bySlug.get("ems-lys").packet.organizations[0].slug, "fondation-primeroche");
  assert.equal(bySlug.get("ems-laurelles-vevey").packet.organizations[0].slug, "fondation-balcons-du-lac");
  assert.equal(bySlug.get("ems-palmiers").packet.organizations[0].slug, "fondation-balcons-du-lac");
  assert.ok(bySlug.get("ems-grand-pre").packet.deferred.some((item) => item.field === "offering.epsm"));
  assert.ok(bySlug.get("ems-lys").packet.deferred.some((item) => item.field === "offering.epsm"));
  assert.ok(bySlug.get("ems-rozavere").packet.deferred.some((item) => item.field === "offering.spah"));
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
  const proposals = entries.slice(0, PHASE4C_EVIDENCE_SLUGS.length)
    .flatMap((entry) => entry.value.taxonomyProposals);
  assert.deepEqual(proposals, []);
  assert.equal(CARE_FEATURE_TAXONOMY.service.social_activities, "Activités sociales et socioculturelles");
  assert.equal(CARE_FEATURE_TAXONOMY.facility.garden_or_park, "Jardin ou parc");
  assert.ok(bySlug.get("ems-clair-soleil").packet.offerings[0].features
    .some((feature) => feature.code === "garden_or_park"));
  assert.ok(!bySlug.get("ems-signal").packet.offerings[0].features
    .some((feature) => ["social_activities", "garden_or_park"].includes(feature.code)));
});

test("batch two projects only approved supported facts and keeps dentistry deferred", () => {
  const marronnier = bySlug.get("ems-marronnier").packet.offerings[0];
  assert.equal(marronnier.capacity.value, 56);
  assert.equal(marronnier.stayModes.longStay.value, true);
  assert.equal(marronnier.stayModes.shortStay.value, false);

  const prazJoret = bySlug.get("ems-praz-joret").packet.offerings[0];
  assert.equal(prazJoret.capacity.value, 26);
  assert.deepEqual(prazJoret.features.map((item) => `${item.kind}.${item.code}`), [
    "care_profile.geriatric_care", "care_profile.psychiatric_care", "service.palliative_care",
    "service.social_activities", "facility.garden_or_park",
  ]);

  const pins = bySlug.get("ems-pins").packet.offerings[0];
  assert.equal(pins.publicInterestStatus.value, "recognized");
  assert.match(pins.publicInterestStatus.evidence.researchField, /^Deep Enrichment!J31$/);

  for (const entry of PHASE4C_BATCH_2_EVIDENCE_SLUGS.map((slug) => bySlug.get(slug))) {
    assert.deepEqual(entry.value.taxonomyProposals, []);
  }
  const restaurantSlugs = PHASE4C_BATCH_2_EVIDENCE_SLUGS.filter((slug) => bySlug.get(slug).packet.offerings[0]
    .features.some((item) => item.kind === "facility" && item.code === "restaurant"));
  assert.deepEqual(restaurantSlugs, ["ems-petit-flon", "ems-sauvabelin", "ems-jardins-leman"]);
  const jardins = bySlug.get("ems-jardins-leman");
  assert.ok(jardins.packet.deferred.some((item) => item.field === "service.dentistry"));
  assert.ok(!jardins.packet.offerings[0].features.some((item) => item.code === "dentistry"));
});

test("batch three projects only narrow workbook-supported EMS facts", () => {
  const arcades = bySlug.get("ems-arcades").packet.offerings[0];
  assert.equal(arcades.capacity.value, 29);
  assert.deepEqual(arcades.features.map((item) => item.code), ["psychiatric_care"]);

  const meillerie = bySlug.get("ems-meillerie");
  assert.equal(meillerie.packet.offerings[0].capacity.value, 26);
  assert.deepEqual(meillerie.packet.offerings[0].features.map((item) => item.code), ["geriatric_care"]);
  for (const code of ["physiotherapy", "occupational_therapy", "podology"]) {
    assert.ok(meillerie.packet.deferred.some((item) => item.field === `service.${code}`));
    assert.ok(!meillerie.packet.offerings[0].features.some((item) => item.code === code));
  }
  assert.ok(meillerie.packet.deferred.some((item) => item.field === "service.dentistry"));

  const valency = bySlug.get("ems-valency").packet.offerings[0];
  assert.equal(valency.capacity.value, 20);
  assert.equal(valency.financing.value, "Établissement conventionné dans le canton de Vaud.");
  assert.equal(valency.publicInterestStatus, null);

  const meridienne = bySlug.get("ems-meridienne").packet.offerings[0];
  assert.equal(meridienne.capacity.value, 14);
  assert.equal(meridienne.stayModes.longStay.value, true);
  assert.equal(meridienne.stayModes.shortStay, null);

  const paixSoir = bySlug.get("ems-paix-soir").packet.offerings[0];
  assert.equal(paixSoir.capacity.value, 84);
  assert.deepEqual(paixSoir.features.map((item) => `${item.kind}.${item.code}`), [
    "service.social_activities", "facility.restaurant",
  ]);

  const vernie = bySlug.get("ems-vernie");
  assert.equal(vernie.packet.offerings[0].capacity.value, 30);
  assert.equal(vernie.packet.offerings[0].stayModes.longStay.value, true);
  assert.ok(vernie.packet.deferred.some((item) => item.field === "offering.epsm"));
  assert.ok(vernie.packet.deferred.some((item) => item.field === "service.dentistry"));
  assert.ok(!vernie.packet.offerings[0].features.some((item) => item.code === "dentistry"));
});

test("batch four keeps narrow site-scoped facts and defers ambiguous claims", () => {
  const boissonnet = bySlug.get("ems-boissonnet").packet.offerings[0];
  assert.equal(boissonnet.capacity.value, 106);
  assert.deepEqual(boissonnet.features.map((item) => item.code), ["social_activities", "hairdressing"]);

  const odysse = bySlug.get("ems-odysse").packet.offerings[0];
  assert.equal(odysse.capacity.value, 53);
  assert.deepEqual(odysse.features.map((item) => item.code), ["geriatric_care"]);

  const prePariset = bySlug.get("ems-pre-pariset").packet.offerings[0];
  assert.equal(prePariset.capacity.value, 82);
  assert.equal(prePariset.stayModes.longStay.value, true);
  assert.equal(prePariset.publicInterestStatus.value, "recognized");
  assert.deepEqual(prePariset.features.map((item) => item.code), [
    "podology", "hairdressing", "social_activities", "garden_or_park",
  ]);

  const preTour = bySlug.get("ems-pre-tour").packet.offerings[0];
  assert.equal(preTour.capacity.value, 50);
  assert.equal(preTour.stayModes.longStay.value, true);
  assert.equal(preTour.stayModes.shortStay, null);
  assert.equal(preTour.publicInterestStatus.value, "recognized");
  assert.deepEqual(preTour.features.map((item) => `${item.kind}.${item.code}`), [
    "service.social_activities", "facility.restaurant",
  ]);

  const tremieres = bySlug.get("ems-tremieres").packet.offerings[0];
  assert.equal(tremieres.capacity.value, 28);
  assert.deepEqual(tremieres.features.map((item) => item.code), ["geriatric_care"]);
});
