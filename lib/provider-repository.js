import "server-only";
import { readCanonicalProviderState } from "./canonical-provider-source.js";
import { projectPublicProviders, resolvePublicProviderRoute, VAUD_V1_REDIRECTS } from "./public-provider-projection.js";
import { projectGooglePlace, withGoogleCard, withGooglePlace } from "./google-place-projection.js";
import publicationManifest from "../config/vaud-v1-publication-manifest.json" with { type: "json" };
import googleRegistry from "../config/google-place-approvals.json" with { type: "json" };

async function readGoogleDetail(placeId) {
  const { getRichGooglePlace } = await import("./google-places.js");
  return getRichGooglePlace(placeId);
}

async function readGoogleCard(placeId) {
  const { getGooglePlaceCard } = await import("./google-places.js");
  return getGooglePlaceCard(placeId);
}

async function canonicalProjection(readState = readCanonicalProviderState) {
  const state = await readState();
  return { state, providers: projectPublicProviders(state, publicationManifest, { googleRegistry }) };
}

/** The one server-side marketplace list projection. */
export async function listProviders({ readState, includeGoogle = true, readGoogle = readGoogleCard } = {}) {
  const providers = (await canonicalProjection(readState)).providers;
  if (!includeGoogle || !process.env.GOOGLE_PLACES_API_KEY) return providers;
  return Promise.all(providers.map(async (provider) => {
    const placeId = provider.approvedGooglePlace?.placeId;
    if (!placeId) return provider;
    try {
      const result = await readGoogle(placeId);
      return withGoogleCard(provider, projectGooglePlace(placeId, result));
    } catch { return provider; }
  }));
}

/** Exact canonical-slug lookup only. Redirect decisions use resolveProviderRoute(). */
export async function getProviderBySlug(slug, { readState } = {}) {
  if (typeof slug !== "string") return null;
  return (await canonicalProjection(readState)).providers.find((provider) => provider.slug === slug) ?? null;
}

export async function resolveProviderRoute(slug, { readState } = {}) {
  const projection = await canonicalProjection(readState);
  return resolvePublicProviderRoute(slug, projection.providers, projection.state, VAUD_V1_REDIRECTS);
}

/** Canonical Lia facts first; approved Google data is fetched separately at request time. */
export async function getProviderDetailBySlug(slug, {
  readState, includeGoogle = true, readGoogle = readGoogleDetail,
} = {}) {
  const provider = await getProviderBySlug(slug, { readState });
  if (!provider || !includeGoogle || !provider.approvedGooglePlace || !process.env.GOOGLE_PLACES_API_KEY) {
    return provider;
  }
  try {
    const placeId = provider.approvedGooglePlace.placeId;
    const result = await readGoogle(placeId);
    return withGooglePlace(provider, projectGooglePlace(placeId, result, {
      embedKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY,
    }));
  } catch {
    // External outages, quota limits, or malformed responses never suppress Lia facts.
    return provider;
  }
}

export const __marketplaceConfig = Object.freeze({ publicationManifest, googleRegistry });
