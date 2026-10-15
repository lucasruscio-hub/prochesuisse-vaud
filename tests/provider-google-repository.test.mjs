import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFixtureState } from "./fixtures/public-provider-state.mjs";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { getProviderDetailBySlug } = await import("../lib/provider-repository.js");

const ids = {
  "ems-boveresses": "ChIJ_xiUXPIvjEcR4n-sfZwEmOI",
  "ems-chateau-rive": "ChIJQR9rVTovjEcRhdKaRYr9vYg",
  "ems-clair-soleil": "ChIJl9Ku9BkxjEcRwivjNZ5qmCs",
};

async function projected(slug) {
  return getProviderDetailBySlug(slug, {
    readState: readFixtureState,
    readGoogle: async (placeId) => ({ place: { id: placeId,
      googleMapsUri: `https://www.google.com/maps/place/${placeId}`,
      rating: 4.5, userRatingCount: 25 } }),
  });
}

test("approved Boveresses, Château, and another provider all use the generic Google path", async () => {
  const priorKey = process.env.GOOGLE_PLACES_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "test-key";
  try {
    for (const slug of ["ems-boveresses", "ems-chateau-rive", "ems-clair-soleil"]) {
      const provider = await projected(slug);
      assert.equal(provider.detail.google.placeId, ids[slug]);
      assert.equal(provider.detail.google.rating, 4.5);
      assert.deepEqual(provider.externalRating.source, "google");
    }
  } finally {
    if (priorKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = priorKey;
  }
});

test("unapproved and held providers get no Google enrichment", async () => {
  const priorKey = process.env.GOOGLE_PLACES_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "test-key";
  try {
    const unapproved = await projected("ems-arcades");
    assert.equal(unapproved.detail.google, undefined);

    assert.equal(await projected("nova-via"), null);
  } finally {
    if (priorKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = priorKey;
  }
});
