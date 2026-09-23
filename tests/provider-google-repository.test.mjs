import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { approvedGooglePlaceId } from "../lib/google-place-approval.js";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { getProviderDetailBySlug } = await import("../lib/provider-repository.js");

const approval = (placeId) => ({ status: "approved", placeId, reviewedBy: "Human reviewer",
  reviewedOn: "2026-09-23", identityNote: "Current establishment identity and location checked" });
const ids = {
  "ems-boveresses": "ChIJBoveresses123",
  "ems-chateau-rive": "ChIJChateauRive123",
  "ems-clair-soleil": "ChIJClairSoleil123",
};

async function projected(slug, mapping) {
  return getProviderDetailBySlug(slug, {
    preview: false,
    approvedPlaceId: (candidateSlug) => approvedGooglePlaceId(mapping, candidateSlug),
    readGoogle: async (placeId) => ({ place: { id: placeId,
      googleMapsUri: `https://www.google.com/maps/place/${placeId}`,
      rating: 4.5, userRatingCount: 25 } }),
  });
}

test("approved Boveresses, Château, and another provider all use the generic Google path", async () => {
  const mapping = Object.fromEntries(Object.entries(ids).map(([slug, id]) => [slug, approval(id)]));
  const priorKey = process.env.GOOGLE_PLACES_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "test-key";
  try {
    for (const slug of ["ems-boveresses", "ems-chateau-rive", "ems-clair-soleil"]) {
      const provider = await projected(slug, mapping);
      assert.equal(provider.detail.google.placeId, ids[slug]);
      assert.equal(provider.detail.google.rating, 4.5);
    }
  } finally {
    if (priorKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = priorKey;
  }
});

test("unapproved, Nova Vita, malformed, and duplicate approvals get no Google enrichment", async () => {
  const priorKey = process.env.GOOGLE_PLACES_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "test-key";
  try {
    const unapproved = await projected("ems-le-home", {});
    assert.equal(unapproved.detail, undefined);

    const nova = await projected("nova-via", { "nova-via": approval("ChIJNovaVita123") });
    assert.equal(nova.detail, undefined);

    const malformed = await projected("ems-chateau-rive", {
      "ems-chateau-rive": { ...approval(ids["ems-chateau-rive"]), reviewedBy: "" },
    });
    assert.equal(malformed.detail, undefined);

    const duplicate = {
      "ems-chateau-rive": approval("ChIJSharedPlace123"),
      "ems-clair-soleil": approval("ChIJSharedPlace123"),
    };
    assert.equal((await projected("ems-chateau-rive", duplicate)).detail, undefined);
    assert.equal((await projected("ems-clair-soleil", duplicate)).detail, undefined);
  } finally {
    if (priorKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = priorKey;
  }
});
