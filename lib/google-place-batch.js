import { providers } from "./providers.js";

const blockedSlugs = new Set(["nova-via"]);
const reviewedSearchNames = new Map([
  ["ems-boveresses", "Tertianum Les Boveresses"],
  ["senevita-vaud", "Senevita Casa Vaud"],
]);

const providerBySlug = new Map(providers.map((provider) => [provider.id, provider]));

export function validateBatchInput(input) {
  if (input?.schemaVersion !== 1 || typeof input.batchId !== "string"
    || !/^[a-z0-9][a-z0-9-]{2,63}$/.test(input.batchId)
    || !Array.isArray(input.slugs) || input.slugs.length === 0 || input.slugs.length > 25) {
    throw new Error("Invalid Google Place batch input");
  }
  const unique = new Set(input.slugs);
  if (unique.size !== input.slugs.length || input.slugs.some((slug) => typeof slug !== "string"
    || blockedSlugs.has(slug) || !providerBySlug.has(slug))) {
    throw new Error("Batch contains a duplicate, blocked, or unknown provider slug");
  }
  return input;
}

export function candidateMultiplicity(count) {
  if (count === 0) return "zero";
  if (count === 1) return "one";
  return "multiple";
}

export function searchIdentityForSlug(slug) {
  const provider = providerBySlug.get(slug);
  if (!provider || blockedSlugs.has(slug)) return null;
  const name = reviewedSearchNames.get(slug) ?? provider.name;
  const identityScope = provider.type === "domicile" ? "office" : "establishment";
  return {
    slug, name, identityScope, locality: provider.commune, postalCode: provider.npa,
    query: [name, provider.commune, provider.npa, "Suisse"].filter(Boolean).join(" "),
  };
}

/** Candidate discovery only. Every candidate and final selection remains unreviewed. */
export async function buildGooglePlaceBatchReport(input, { search, now = () => new Date() }) {
  validateBatchInput(input);
  if (typeof search !== "function") throw new Error("A candidate search adapter is required");
  const entries = [];
  for (const slug of input.slugs) {
    const identity = searchIdentityForSlug(slug);
    try {
      const candidates = await search(identity.query) ?? [];
      entries.push({
        ...identity,
        candidateMultiplicity: candidateMultiplicity(candidates.length),
        returnedCandidateCount: candidates.length,
        candidates: candidates.map((candidate) => ({
          placeId: candidate.placeId,
          googleName: candidate.googleName,
          googleAddress: candidate.googleAddress,
          googleMapsUrl: candidate.googleMapsUrl,
          plausibility: "unreviewed",
          reviewerNote: null,
        })),
        humanDecision: { decision: "pending", selectedPlaceId: null, reviewedBy: null,
          reviewedOn: null, identityNote: null },
      });
    } catch {
      entries.push({ ...identity, candidateMultiplicity: "unknown", returnedCandidateCount: null,
        candidates: [], searchError: true,
        humanDecision: { decision: "pending", selectedPlaceId: null, reviewedBy: null,
          reviewedOn: null, identityNote: null } });
    }
  }
  return {
    schemaVersion: 1,
    batchId: input.batchId,
    generatedAt: now().toISOString(),
    storage: "temporary-local-human-review-only",
    automaticApprovals: 0,
    instructions: "Review every candidate. This report never approves or updates a mapping.",
    entries,
  };
}
