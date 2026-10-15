import test from "node:test";
import assert from "node:assert/strict";
import { projectPublicProviders, resolvePublicProviderRoute, VAUD_V1_REDIRECTS } from "../lib/public-provider-projection.js";
import { manifest, publicProviderState } from "./fixtures/public-provider-state.mjs";

test("reviewed manifest exposes exactly 31 EMS and 80 home-care identities", () => {
  const projected = projectPublicProviders(publicProviderState(), manifest);
  assert.equal(projected.length, 111);
  assert.deepEqual(projected.reduce((counts, provider) => ({ ...counts,
    [provider.category]: (counts[provider.category] ?? 0) + 1 }), {}), { domicile: 80, ems: 31 });
  assert.ok(projected.every((provider) => provider.lia.publicationBasis === "reviewed_manifest"));
  assert.ok(projected.every((provider) => !Object.hasOwn(provider, "tags")));
});

test("visibility rejects identity drift, lifecycle drift, and unsourced offerings", () => {
  for (const mutate of [
    (state, target) => { target.id = "wrong-id"; },
    (state, target) => { target.status = "archived"; },
    (state, target) => { target.verification_status = "stale"; },
    (state, target) => { state.offeringSources = state.offeringSources.filter((item) => item.provider_id !== target.id); },
  ]) {
    const state = publicProviderState();
    const target = state.providers.find(({ slug }) => slug === "ems-boveresses");
    mutate(state, target);
    assert.ok(!projectPublicProviders(state, manifest).some(({ slug }) => slug === "ems-boveresses"));
  }
});

test("published rows require allowed verification and review timestamps", () => {
  const state = publicProviderState();
  const provider = state.providers.find(({ slug }) => slug === "ems-boveresses");
  const offering = state.offerings.find(({ provider_id }) => provider_id === provider.id);
  Object.assign(provider, { is_published: true, verification_status: "partially_verified",
    last_reviewed_at: "2026-10-14T10:00:00Z" });
  Object.assign(offering, { is_published: true, verification_status: "partially_verified",
    last_reviewed_at: "2026-10-14T10:00:00Z" });
  const result = projectPublicProviders(state, manifest).find(({ slug }) => slug === provider.slug);
  assert.equal(result.lia.publicationBasis, "database");
  offering.last_reviewed_at = null;
  assert.ok(!projectPublicProviders(state, manifest).some(({ slug }) => slug === provider.slug));
});

test("canonical badges and detail fields remain sourced and office location is not coverage", () => {
  const state = publicProviderState();
  const provider = state.providers.find(({ slug }) => slug === "ems-boveresses");
  Object.assign(provider, { name: "Tertianum Les Boveresses", postal_code: "1010", locality: "Lausanne",
    street: "Rue des Boveresses", house_number: "29", phone: "+41 21 000 00 00" });
  const offering = state.offerings.find(({ provider_id }) => provider_id === provider.id);
  Object.assign(offering, { short_stay: true, public_interest_status: "recognized" });
  const source = state.offeringSources.find(({ offering_id }) => offering_id === offering.id);
  source.fields_supported.push("short_stay", "public_interest_status");
  state.features.push({ provider_id: provider.id, offering_id: offering.id,
    feature_kind: "care_profile", feature_code: "geriatric_care", display_name: "Accompagnement gériatrique",
    source_id: source.source_id });
  const result = projectPublicProviders(state, manifest).find(({ slug }) => slug === provider.slug);
  assert.deepEqual(result.badges.sort(), ["Accompagnement gériatrique", "Court séjour", "Public"]);
  assert.equal(result.location.displayLabel, "Rue des Boveresses 29, 1010 Lausanne");
  assert.deepEqual(result.detail.offerings[0].coverage, []);
});

test("only the evidenced Home Instead successor redirects", () => {
  const state = publicProviderState();
  const projected = projectPublicProviders(state, manifest);
  assert.deepEqual(resolvePublicProviderRoute("homeinstead", projected, state, VAUD_V1_REDIRECTS),
    { kind: "redirect", slug: "dovida" });
  assert.deepEqual(resolvePublicProviderRoute("ems-orme", projected, state, VAUD_V1_REDIRECTS), { kind: "not_found" });
  state.identityLinks = [];
  assert.deepEqual(resolvePublicProviderRoute("homeinstead", projected, state, VAUD_V1_REDIRECTS), { kind: "not_found" });
});
