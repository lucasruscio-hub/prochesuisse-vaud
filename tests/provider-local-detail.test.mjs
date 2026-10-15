import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { providerDetailView } from "../lib/provider-detail.js";
import { publicProviderState, readFixtureState } from "./fixtures/public-provider-state.mjs";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { getProviderBySlug, getProviderDetailBySlug, resolveProviderRoute } = await import("../lib/provider-repository.js");

test("canonical detail uses the same projection as search and held identities stay unavailable", async () => {
  const provider = await getProviderBySlug("ems-boveresses", { readState: readFixtureState });
  const detail = await getProviderDetailBySlug("ems-boveresses", {
    readState: readFixtureState, includeGoogle: false,
  });
  assert.deepEqual(detail, provider);
  assert.equal(providerDetailView(detail).offerings.length, 1);
  assert.equal(await getProviderBySlug("nova-via", { readState: readFixtureState }), null);
});

test("route resolution proves the canonical successor link before redirecting", async () => {
  assert.deepEqual(await resolveProviderRoute("homeinstead", { readState: readFixtureState }),
    { kind: "redirect", slug: "dovida" });
  assert.deepEqual(await resolveProviderRoute("ems-orme", { readState: readFixtureState }), { kind: "not_found" });
  const state = publicProviderState();
  state.identityLinks = [];
  assert.deepEqual(await resolveProviderRoute("homeinstead", { readState: async () => state }), { kind: "not_found" });
});

test("Google failure never removes canonical detail", async () => {
  const previous = process.env.GOOGLE_PLACES_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "test-key";
  try {
    const provider = await getProviderDetailBySlug("ems-boveresses", {
      readState: readFixtureState, readGoogle: async () => { throw new Error("offline"); },
    });
    assert.equal(provider.slug, "ems-boveresses");
    assert.equal(provider.detail.google, undefined);
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = previous;
  }
});
