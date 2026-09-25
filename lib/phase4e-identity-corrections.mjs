import { validateReviewPacket } from "./provider-review-packet.mjs";

export const PHASE4E_IDENTITY_CORRECTION_SLUGS = Object.freeze([
  "ems-chantemerle", "ems-rozavere", "ems-laurelles-vevey", "ems-palmiers",
]);

const allowedTargets = new Set(["name", "primary_type", "postal_code", "locality"]);

export function buildPostIdentityBaseline(packet, baseline) {
  const checked = validateReviewPacket(packet, baseline);
  if (!checked.localApplyReady) throw new Error(`Identity correction is not approved: ${packet.identity.slug}`);
  const changes = packet.claims.filter((claim) => claim.target);
  if (changes.some((claim) => !allowedTargets.has(claim.target))) {
    throw new Error(`Phase 4E identity correction exceeds approved fields: ${packet.identity.slug}`);
  }
  const updated = { ...baseline };
  for (const claim of changes) updated[claim.target] = claim.value;
  if (updated.slug !== baseline.slug || updated.legacy_id !== baseline.legacy_id
    || updated.primary_type !== baseline.primary_type || updated.original_location_text !== baseline.original_location_text) {
    throw new Error(`Phase 4E identity correction changed a protected identity field: ${packet.identity.slug}`);
  }
  return updated;
}
