import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectLegacyProviders } from "../scripts/ingest-legacy-providers.mjs";
import { normalizeResearchPacket, validateReviewPacket } from "../lib/provider-review-packet.mjs";
import { buildReviewApplySql } from "../lib/provider-review-apply.mjs";

const baselines = new Map(inspectLegacyProviders().rows.map((row) => [row.legacyId, row.provider]));
const ids = ["ems-boveresses", "nova-via", "senevita-vaud"];
const locallyApproved = new Set(["ems-boveresses", "senevita-vaud"]);
const raw = (id) => JSON.parse(readFileSync(new URL(`../docs/research/phase3b-pilots/${id}.review.json`, import.meta.url), "utf8"));
const clone = (value) => structuredClone(value);

test("all three pilot packets normalize deterministically with explicit deferred facts", () => {
  for (const id of ids) {
    const research = raw(id);
    const baseline = baselines.get(id);
    const packet = normalizeResearchPacket(research, baseline);
    assert.deepEqual(packet, normalizeResearchPacket(research, baseline));
    const canonical = JSON.parse(readFileSync(new URL(`../docs/research/phase3b-pilots/canonical/${id}.json`, import.meta.url), "utf8"));
    const withoutApproval = clone(canonical);
    withoutApproval.approval.localApply = false;
    assert.deepEqual(withoutApproval, packet, `${id}: only local approval may differ from research`);
    assert.equal(canonical.approval.localApply, locallyApproved.has(id));
    const checked = validateReviewPacket(canonical, baseline);
    assert.equal(checked.valid, true);
    assert.equal(checked.localApplyReady, locallyApproved.has(id));
    assert.equal(canonical.approval.publish, false);
    assert.equal(canonical.approval.verify, false);
    assert.deepEqual(canonical.legacyTags, baseline.original_tags);
    assert.ok(canonical.claims.every((claim) => claim.evidence && claim.evidence.url));
    assert.ok(checked.deferredClaims > 0);
    if (locallyApproved.has(id)) assert.match(buildReviewApplySql(canonical, baseline, { rollback: true }), /ROLLBACK;\n$/);
    else assert.throws(() => buildReviewApplySql(canonical, baseline), /approval/);
  }
  const nova = normalizeResearchPacket(raw("nova-via"), baselines.get("nova-via"));
  assert.deepEqual(nova.offerings, ["senior_residence", "medicalized_care_unit"]);
  assert.ok(nova.holdReasons.length);
  assert.throws(() => buildReviewApplySql({ ...nova, approval: { ...nova.approval, localApply: true } }, baselines.get("nova-via")), /Held/);
  const home = normalizeResearchPacket(raw("senevita-vaud"), baselines.get("senevita-vaud"));
  assert.equal(home.locationKind, "office");
  assert.ok(home.claims.find((item) => item.field === "service_area.regions" && !item.target));
  assert.ok(!home.claims.some((item) => item.target === "service_area" || item.target === "service_codes"));
  assert.ok(!home.claims.some((item) => item.target === "canton_code"));
});

test("research validation rejects unsafe facts, provenance and identity changes", () => {
  const baseline = baselines.get("ems-boveresses");
  const base = raw("ems-boveresses");
  const mutations = [
    (p) => { p.identity.provider_type.value = "hospital"; },
    (p) => { p.contact.website.value = "http://unsafe.example"; },
    (p) => { p.contact.email.value = "bad-email"; },
    (p) => { p.contact.phone.value = "123"; },
    (p) => { delete p.contact.phone.source; },
    (p) => { p.identity.canonical_name.source.url = "https://user:pass@example.com/"; },
    (p) => { p.legacy_id = "another-provider"; },
    (p) => { p.publication_allowed = true; },
    (p) => { p.verification_granted = true; },
    (p) => { p.legacy_tags_are_verified = true; },
    (p) => { p.legacy_tags.push("new inferred service"); },
    (p) => { p.verified_services[0].source = null; },
    (p) => { p.dynamic_data.availability = "available"; },
    (p) => { p.unsupported_new_fact = "silent data loss"; },
  ];
  for (const change of mutations) { const item = clone(base); change(item); assert.throws(() => normalizeResearchPacket(item, baseline)); }
});

test("canonical validation prevents publication, silent verification and tag promotion", () => {
  const baseline = baselines.get("ems-boveresses");
  const packet = normalizeResearchPacket(raw("ems-boveresses"), baseline);
  for (const change of [
    (p) => { p.approval.publish = true; },
    (p) => { p.approval.verify = true; },
    (p) => { p.identity.slug = "different-site"; },
    (p) => { p.claims[0].target = "service_codes"; },
    (p) => { p.claims.find((c) => c.field === "service.palliative_care").target = "name"; },
    (p) => { p.claims[0].evidence = null; },
    (p) => { p.legacyTagsVerified = true; },
  ]) { const item = clone(packet); change(item); assert.throws(() => validateReviewPacket(item, baseline)); }
  const approved = clone(packet); approved.approval.localApply = true;
  const sql = buildReviewApplySql(approved, baseline, { rollback: true });
  assert.match(sql, /ROLLBACK;\n$/);
  assert.doesNotMatch(sql, /UPDATE public\.provider_service_areas|UPDATE public\.leads|SET is_published|SET verification_status/i);
  assert.ok(!sql.includes("Gériatrie"));
});
