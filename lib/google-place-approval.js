import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pilot = "ems-boveresses";
const placeIdPattern = /^[A-Za-z0-9_-]{10,256}$/;

export function approvedGooglePlaceId(mapping, slug) {
  if (slug !== pilot || !mapping || Object.keys(mapping).some((key) => key !== pilot)) return null;
  const entry = mapping[pilot];
  if (!entry || entry.status !== "approved" || !placeIdPattern.test(entry.placeId ?? "")
    || typeof entry.reviewedBy !== "string" || !entry.reviewedBy.trim()
    || typeof entry.identityNote !== "string" || !entry.identityNote.trim()
    || typeof entry.reviewedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewedOn)
    || Number.isNaN(Date.parse(`${entry.reviewedOn}T00:00:00Z`))) return null;
  return entry.placeId;
}

export function loadApprovedGooglePlaceId(slug) {
  if (process.env.NODE_ENV !== "development" || process.env.LIA_GOOGLE_PLACES_PREVIEW !== "1") return null;
  try {
    const file = resolve(process.cwd(), "config", "google-place-approvals.local.json");
    return approvedGooglePlaceId(JSON.parse(readFileSync(file, "utf8")), slug);
  } catch { return null; }
}
