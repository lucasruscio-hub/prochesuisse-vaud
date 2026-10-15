import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const placeIdPattern = /^[A-Za-z0-9_-]{10,256}$/;
const blockedSlugs = new Set(["nova-via"]);

export function approvedGooglePlaceId(mapping, slug, knownSlugs = Object.keys(mapping ?? {})) {
  if (blockedSlugs.has(slug) || !new Set(knownSlugs).has(slug)
    || !mapping || typeof mapping !== "object") return null;
  const entry = mapping[slug];
  if (!entry || entry.status !== "approved" || !placeIdPattern.test(entry.placeId ?? "")
    || typeof entry.reviewedBy !== "string" || !entry.reviewedBy.trim()
    || typeof entry.identityNote !== "string" || !entry.identityNote.trim()
    || typeof entry.reviewedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewedOn)
    || Number.isNaN(Date.parse(`${entry.reviewedOn}T00:00:00Z`))) return null;
  const duplicateApprovedId = Object.entries(mapping).some(([otherSlug, other]) => otherSlug !== slug
    && other?.status === "approved" && other.placeId === entry.placeId);
  if (duplicateApprovedId) return null;
  return entry.placeId;
}

export function loadApprovedGooglePlaceId(slug) {
  try {
    const file = resolve(process.cwd(), "config", "google-place-approvals.json");
    const mapping = JSON.parse(readFileSync(file, "utf8"));
    return approvedGooglePlaceId(mapping, slug);
  } catch { return null; }
}
