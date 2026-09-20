import "server-only";
import { providers } from "./providers.js";

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
