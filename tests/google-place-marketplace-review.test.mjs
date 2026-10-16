import test from "node:test";
import assert from "node:assert/strict";
import { assessGoogleCandidate, buildGoogleReviewQuery, classifyGoogleCandidates }
  from "../lib/google-place-marketplace-review.js";
import { getGooglePlaceReviewEvidence, searchGooglePlaceReviewCandidates, REVIEW_DETAIL_FIELD_MASK,
  REVIEW_MATCH_FIELD_MASK } from "../lib/google-places-core.js";

const provider = { slug: "example", name: "EMS Exemple", address: "Rue du Lac 7",
  postalCode: "1000", locality: "Lausanne", officialWebsite: "https://example.ch/contact" };
const exact = { placeId: "ChIJExactExample123", googleName: "EMS Exemple",
  googleAddress: "Rue du Lac 7, 1000 Lausanne, Suisse", officialWebsite: "https://www.example.ch/",
  rating: 4.5, reviewCount: 12, hasUsablePhoto: true };

test("review queries combine canonical identity and address evidence", () => {
  assert.equal(buildGoogleReviewQuery(provider), "EMS Exemple Rue du Lac 7 1000 Lausanne Vaud Suisse");
});

test("only independently corroborated unique candidates are high confidence", () => {
  const assessed = assessGoogleCandidate(provider, exact);
  assert.equal(assessed.objectivelyStrong, true);
  assert.equal(assessed.evidence.officialWebsite, true);
  assert.equal(classifyGoogleCandidates(provider, [exact]).classification, "HIGH CONFIDENCE");
  assert.equal(classifyGoogleCandidates({ ...provider, address: null, postalCode: null,
    locality: null, officialWebsite: null }, [exact]).classification, "NEEDS HUMAN REVIEW");
});

test("ambiguity and cross-provider Place IDs cannot become high confidence", () => {
  const competing = { ...exact, placeId: "ChIJCompeting12345", googleAddress: "Rue du Lac 9, 1000 Lausanne" };
  assert.equal(classifyGoogleCandidates(provider, [exact, competing]).classification, "NEEDS HUMAN REVIEW");
  assert.equal(classifyGoogleCandidates(provider, [exact], {
    approvedPlaceIds: new Map([[exact.placeId, "another-provider"]]),
  }).classification, "NEEDS HUMAN REVIEW");
});

test("review candidate search returns transient evidence without choosing a Place", async () => {
  const requests = [];
  const result = await searchGooglePlaceReviewCandidates("EMS Exemple", { apiKey: "test-key",
    fetchImpl: async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ({
      places: [{ id: exact.placeId, displayName: { text: exact.googleName },
        formattedAddress: exact.googleAddress, websiteUri: exact.officialWebsite,
        rating: exact.rating, userRatingCount: exact.reviewCount, photos: [{ name: "places/x/photos/y" }] }],
    }) }; } });
  assert.equal(requests[0].options.headers["X-Goog-FieldMask"], REVIEW_MATCH_FIELD_MASK);
  assert.equal(result[0].hasUsablePhoto, true);
  assert.equal(result[0].rating, 4.5);
  assert.equal(result[0].reviewCount, 12);
  assert.ok(!Object.hasOwn(result[0], "selected"));
});

test("approved-place review evidence is fetched directly without photo media URLs", async () => {
  const requests = [];
  const result = await getGooglePlaceReviewEvidence(exact.placeId, { apiKey: "test-key",
    fetchImpl: async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ({
      id: exact.placeId, displayName: { text: exact.googleName }, formattedAddress: exact.googleAddress,
      rating: exact.rating, userRatingCount: exact.reviewCount, photos: [{ name: "places/x/photos/y" }],
    }) }; } });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.headers["X-Goog-FieldMask"], REVIEW_DETAIL_FIELD_MASK);
  assert.equal(result.placeId, exact.placeId);
  assert.equal(result.hasUsablePhoto, true);
  assert.doesNotMatch(requests[0].url, /\/media/);
});
