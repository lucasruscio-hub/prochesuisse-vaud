const text = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const normalize = (value) => (text(value) ?? "").normalize("NFKD").replaceAll(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("fr").replaceAll(/[^a-z0-9]+/g, " ").trim();
const tokens = (value) => new Set(normalize(value).split(" ").filter((token) => token.length > 1));

function similarity(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aa = tokens(a);
  const bb = tokens(b);
  const overlap = [...aa].filter((token) => bb.has(token)).length;
  return overlap / Math.max(aa.size, bb.size);
}

function hostname(value) {
  const raw = text(value);
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch { return null; }
}

function addressEvidence(provider, candidate) {
  const address = normalize(candidate.googleAddress);
  const locality = normalize(provider.locality);
  const street = normalize(provider.address);
  const postalCode = text(provider.postalCode);
  return {
    postalCode: Boolean(postalCode && new RegExp(`(^|\\D)${postalCode}(\\D|$)`).test(candidate.googleAddress ?? "")),
    locality: Boolean(locality && address.includes(locality)),
    street: Boolean(street && [...tokens(street)].filter((token) => token.length > 2)
      .every((token) => address.includes(token))),
  };
}

export function buildGoogleReviewQuery(provider) {
  return [provider.name, provider.address, provider.postalCode, provider.locality, "Vaud Suisse"]
    .filter((value, index, values) => text(value) && values.indexOf(value) === index).join(" ");
}

export function assessGoogleCandidate(provider, candidate) {
  const nameSimilarity = similarity(provider.name, candidate.googleName);
  const address = addressEvidence(provider, candidate);
  const liaHost = hostname(provider.officialWebsite);
  const googleHost = hostname(candidate.officialWebsite);
  const officialWebsite = Boolean(liaHost && googleHost && liaHost === googleHost);
  const addressSignals = Object.values(address).filter(Boolean).length;
  const strongAddress = address.street && (address.locality || address.postalCode);
  const objectivelyStrong = (officialWebsite && nameSimilarity >= 0.5
      && (addressSignals > 0 || (!provider.locality && !provider.postalCode)))
    || (nameSimilarity >= 0.9 && strongAddress);
  const plausible = nameSimilarity >= 0.35 || officialWebsite || addressSignals >= 2;
  const evidence = [
    `name similarity ${nameSimilarity.toFixed(2)}`,
    address.postalCode ? "postcode matches" : null,
    address.locality ? "locality matches" : null,
    address.street ? "street matches" : null,
    officialWebsite ? `official website matches (${liaHost})` : null,
  ].filter(Boolean);
  return { ...candidate, evidence: { nameSimilarity, address, officialWebsite }, objectivelyStrong,
    plausible, reason: evidence.join("; ") || "no corroborating identity evidence" };
}

export function classifyGoogleCandidates(provider, candidates, {
  approvedPlaceIds = new Map(), selectedPlaceIds = new Map(),
} = {}) {
  const assessed = candidates.map((candidate) => assessGoogleCandidate(provider, candidate))
    .sort((a, b) => Number(b.objectivelyStrong) - Number(a.objectivelyStrong)
      || b.evidence.nameSimilarity - a.evidence.nameSimilarity);
  if (!assessed.length) return { classification: "NO RELIABLE MATCH", selected: null,
    reason: "Google Places returned no candidate.", candidates: assessed };
  const best = assessed[0];
  const closeCompetitor = assessed.slice(1).some((candidate) => candidate.plausible
    && best.evidence.nameSimilarity - candidate.evidence.nameSimilarity < 0.15);
  const approvedOwner = approvedPlaceIds.get(best.placeId);
  const selectedOwner = selectedPlaceIds.get(best.placeId);
  if (best.objectivelyStrong && !closeCompetitor && (!approvedOwner || approvedOwner === provider.slug)
    && (!selectedOwner || selectedOwner === provider.slug)) {
    return { classification: "HIGH CONFIDENCE", selected: best,
      reason: `Unique strongly corroborated candidate: ${best.reason}.`, candidates: assessed };
  }
  if (assessed.some((candidate) => candidate.plausible)) {
    const conflict = approvedOwner && approvedOwner !== provider.slug
      ? ` Place ID is already approved for ${approvedOwner}.` : selectedOwner && selectedOwner !== provider.slug
        ? ` Place ID is also selected for ${selectedOwner}.` : "";
    return { classification: "NEEDS HUMAN REVIEW", selected: best,
      reason: `${closeCompetitor ? "Competing plausible candidates. " : "Candidate is plausible but not objectively exact. "}${best.reason}.${conflict}`,
      candidates: assessed };
  }
  return { classification: "NO RELIABLE MATCH", selected: null,
    reason: `Returned candidates lack reliable corroboration; best candidate: ${best.reason}.`, candidates: assessed };
}
