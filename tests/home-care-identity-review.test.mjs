import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectLegacyProviders } from "../scripts/ingest-legacy-providers.mjs";
import { normalizeIdentityResearch, validateCanonicalIdentityPacket }
  from "../lib/home-care-identity-review.mjs";
import { loadPhase5cManifest, validatePhase5cIdentityBatch } from "../scripts/phase5c-home-care-identity.mjs";

const baselines = new Map(inspectLegacyProviders().rows.map((row) => [row.legacyId, row.provider]));
const raw = (slug) => JSON.parse(readFileSync(
  new URL(`../docs/research/phase5c-home-care-identities/${slug}.review.json`, import.meta.url), "utf8"));

test("Phase 5C packets are deterministic, sourced and strictly non-writing", () => {
  const checked = validatePhase5cIdentityBatch();
  assert.equal(checked.packets.length, 4);
  for (const { slug, packet } of checked.packets) {
    assert.deepEqual(packet, normalizeIdentityResearch(raw(slug), baselines.get(slug)));
    assert.deepEqual(packet.approval, { localApply: false, publish: false, verify: false });
    assert.deepEqual(packet.dataWrites, []);
    assert.ok(packet.evidence.every((source) => source.url.startsWith("https://")
      && source.accessedOn === "2026-09-27"));
    assert.ok(packet.conclusions.every((claim) => claim.sourceIds.length > 0));
    assert.deepEqual(validateCanonicalIdentityPacket(packet, baselines.get(slug)).databaseWrites, 0);
  }
  assert.deepEqual(loadPhase5cManifest().safety, {
    databaseWrites: 0, providerWrites: false, organizationWrites: false, offeringWrites: false,
    featureWrites: false, languageWrites: false, serviceAreaWrites: false,
    publicationWrites: false, verificationWrites: false,
  });
});

test("Phase 5C validation rejects write approval, baseline drift and unsourced claims", () => {
  const baseline = baselines.get("senevita-vaud");
  const packet = raw("senevita-vaud");
  for (const change of [
    (item) => { item.approval.localApply = true; },
    (item) => { item.approval.publish = true; },
    (item) => { item.approval.verify = true; },
    (item) => { item.legacyIdentity.name = "Changed"; },
    (item) => { item.dataWrites.push("providers"); },
    (item) => { item.conclusions[0].sourceIds = []; },
    (item) => { item.sources[0].url = "http://example.com"; },
    (item) => { item.sources[0].accessedOn = "unknown"; },
  ]) {
    const mutated = structuredClone(packet);
    change(mutated);
    assert.throws(() => normalizeIdentityResearch(mutated, baseline));
  }
});

test("Phase 5C recommendations preserve organization and operating-unit boundaries", () => {
  const checked = validatePhase5cIdentityBatch();
  const bySlug = new Map(checked.packets.map(({ slug, packet }) => [slug, packet]));
  assert.deepEqual(bySlug.get("senevita-vaud").recommendation.actions, ["keep", "link_as_organization"]);
  assert.ok(bySlug.get("avasad-cms").recommendation.actions.includes("split_later"));
  assert.deepEqual(bySlug.get("pro-senectute").proposedIdentity.scopes, ["cantonal_organization"]);
  assert.ok(bySlug.get("dovida").recommendation.actions.includes("supersede_historically"));
  assert.ok(bySlug.get("dovida").unresolved.some((item) => item.includes("partner agency")));
});
