import "server-only";
import { providers } from "./providers.js";
import { LOCAL_DETAIL_PILOTS, projectLocalReviewedProvider } from "./provider-local-projection.js";
import { loadApprovedGooglePlaceId } from "./google-place-approval.js";
import { projectGooglePlace, withGooglePlace } from "./google-place-projection.js";

/**
 * @typedef {Object} ProviderSummary
 * @property {string} id Stable opaque identity (legacy ID now, UUID after import).
 * @property {string} slug Stable URL identifier; preserve the legacy ID as slug.
 * @property {string} name
 * @property {string} type
 * @property {string} commune Display locality, not municipality identity.
 * @property {string} npa Postal code as text.
 * @property {string} address Display location, never a claimed street address.
 * @property {string[]} tags Original unverified display tags, not verified services.
 */

/** @returns {Promise<ProviderSummary[]>} */
export async function listProviders() {
  // This is the ONLY runtime data-source import. No Supabase access in Phase 1.
  // A future server adapter must select published/active rows and project this DTO.
  return providers.map((provider) => ({
    id: provider.id,
    slug: provider.id,
    name: provider.name,
    type: provider.type,
    commune: provider.commune,
    npa: provider.npa,
    address: provider.address,
    tags: [...provider.tags],
  }));
}

/** @returns {Promise<ProviderSummary | null>} */
export async function getProviderBySlug(slug) {
  if (typeof slug !== "string") return null;
  return (await listProviders()).find((provider) => provider.slug === slug) ?? null;
}

export function localDetailPreviewEnabled() {
  return process.env.NODE_ENV === "development" && process.env.LIA_PROVIDER_DETAIL_SOURCE === "local";
}

async function readLocalDetail(slug) {
  const { readLocalReviewedProvider } = await import("./provider-local-detail.js");
  return readLocalReviewedProvider(slug);
}

async function readGoogleDetail(placeId) {
  const { getRichGooglePlace } = await import("./google-places.js");
  return getRichGooglePlace(placeId);
}

/** Static public fallback; optional local-only overlay for the two reviewed pilots. */
export async function getProviderDetailBySlug(slug, {
  preview = localDetailPreviewEnabled(), readLocal = readLocalDetail,
  includeGoogle = true, approvedPlaceId = loadApprovedGooglePlaceId, readGoogle = readGoogleDetail,
} = {}) {
  const fallback = await getProviderBySlug(slug);
  if (!fallback || !preview || !LOCAL_DETAIL_PILOTS.includes(slug)) return fallback;
  try {
    const reviewed = projectLocalReviewedProvider(fallback, await readLocal(slug));
    if (!reviewed) console.warn(`Local provider detail rejected for ${slug}; using static fallback`);
    if (!reviewed || !includeGoogle || slug !== "ems-boveresses" || !process.env.GOOGLE_PLACES_API_KEY) return reviewed ?? fallback;
    const placeId = approvedPlaceId(slug);
    if (!placeId) return reviewed;
    try {
      const result = await readGoogle(placeId);
      return withGooglePlace(reviewed, projectGooglePlace(placeId, result, {
        embedKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY,
      }));
    } catch {
      // Places outages or quota failures never suppress reviewed Lia information.
      return reviewed;
    }
  } catch (error) {
    console.warn(`Local provider detail unavailable for ${slug}; using static fallback`);
    return fallback;
  }
}
