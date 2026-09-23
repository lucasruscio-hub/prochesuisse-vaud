import test from "node:test";
import assert from "node:assert/strict";
import { approvedGooglePlaceId } from "../lib/google-place-approval.js";
import { projectGooglePlace, withGooglePlace } from "../lib/google-place-projection.js";
import { getRichGooglePlace, searchGooglePlaceCandidates, MATCH_FIELD_MASK, DETAIL_FIELD_MASK } from "../lib/google-places-core.js";
import { providerDetailView, providerDetailSections } from "../lib/provider-detail.js";

const id = "ChIJ1234567890abc";
const approval = { "ems-boveresses": { status: "approved", placeId: id,
  reviewedBy: "Human reviewer", reviewedOn: "2026-09-22", identityNote: "Site and street checked on Maps" } };
const placeUrl = "https://www.google.com/maps/place/example";
const photoName = `places/${id}/photos/AaBb123`;

test("missing key or human approval cannot fetch or expose Google content", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error("Unexpected fetch"); };
  assert.equal(await getRichGooglePlace(id, { apiKey: "", fetchImpl }), null);
  assert.equal(await searchGooglePlaceCandidates("Boveresses", { apiKey: "", fetchImpl }), null);
  assert.equal(calls, 0);
  assert.equal(approvedGooglePlaceId({ "ems-boveresses": { status: "held", placeId: id } }, "ems-boveresses"), null);
  assert.equal(approvedGooglePlaceId(approval, "nova-via"), null);
  assert.equal(approvedGooglePlaceId(approval, "ems-boveresses"), id);
  assert.equal(approvedGooglePlaceId({ "ems-boveresses": { ...approval["ems-boveresses"], reviewedBy: "" } }, "ems-boveresses"), null);
});

test("candidate search uses a limited explicit mask and never chooses a result", async () => {
  const requests = [];
  const matches = await searchGooglePlaceCandidates("Tertianum Les Boveresses", { apiKey: "test-key",
    fetchImpl: async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ({ places: [
      { id, displayName: { text: "Tertianum Les Boveresses" }, formattedAddress: "Lausanne", googleMapsUri: placeUrl },
    ] }) }; } });
  assert.equal(matches[0].placeId, id);
  assert.equal(matches[0].googleName, "Tertianum Les Boveresses");
  assert.equal(requests[0].options.headers["X-Goog-FieldMask"], MATCH_FIELD_MASK);
  assert.doesNotMatch(MATCH_FIELD_MASK, /reviews|photos|rating|\*/);
  assert.equal(requests[0].options.cache, "no-store");
});

test("fresh rich details project photo and review attribution without exposing photo resource names", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => url.includes("/media?")
      ? { photoUri: "https://lh3.googleusercontent.com/example" }
      : { id, googleMapsUri: placeUrl, googleMapsLinks: { reviewsUri: placeUrl }, rating: 4.4,
        userRatingCount: 17, photos: [{ name: photoName, googleMapsUri: placeUrl,
          authorAttributions: [{ displayName: "Photo author", uri: placeUrl,
            photoUri: "https://lh3.googleusercontent.com/photo-author" }] }],
        reviews: [{ text: { text: "Accueil chaleureux", languageCode: "fr" }, rating: 5,
          authorAttribution: { displayName: "Reviewer", uri: placeUrl,
            photoUri: "https://lh3.googleusercontent.com/reviewer" }, googleMapsUri: placeUrl,
          relativePublishTimeDescription: "il y a 2 mois" }],
        attributions: [{ provider: "Example source", providerUri: placeUrl }] } };
  };
  const response = await getRichGooglePlace(id, { apiKey: "test-key", fetchImpl });
  assert.equal(requests[0].options.headers["X-Goog-FieldMask"], DETAIL_FIELD_MASK);
  assert.doesNotMatch(DETAIL_FIELD_MASK, /\*/);
  assert.match(requests[1].url, /skipHttpRedirect=true/);
  assert.ok(requests.every(({ options }) => options.cache === "no-store"));
  const google = projectGooglePlace(id, response, { embedKey: "browser-key" });
  assert.equal(google.photos[0].authors[0].name, "Photo author");
  assert.equal(google.photos[0].authors[0].photoUri, "https://lh3.googleusercontent.com/photo-author");
  assert.equal(google.photos[0].sourceUrl, placeUrl);
  assert.equal(google.reviews[0].author.name, "Reviewer");
  assert.equal(google.reviews[0].author.photoUri, "https://lh3.googleusercontent.com/reviewer");
  assert.equal(google.reviews[0].sourceUrl, placeUrl);
  assert.equal(google.rating, 4.4);
  assert.equal(google.reviewCount, 17);
  assert.match(google.embedUrl, /place_id%3AChIJ1234567890abc/);
  assert.doesNotMatch(JSON.stringify(google), /photos\/AaBb123|test-key/);
});

test("Google projection cannot replace reviewed Lia identity, contacts, or Lia reviews", () => {
  const provider = { slug: "ems-boveresses", name: "Tertianum Les Boveresses", type: "ems",
    commune: "Lausanne", npa: "1010", tags: ["legacy"], detail: {
      contact: { phone: "021 654 06 06", email: "approved@example.test" },
      reviews: { lia: [{ quote: "Lia review", author: "Lia author" }] },
    } };
  const google = projectGooglePlace(id, { place: { id, googleMapsUri: placeUrl,
    displayName: { text: "Different Google name" }, formattedAddress: "Different Google address",
    internationalPhoneNumber: "wrong number", reviews: [{ text: { text: "Google review" },
      authorAttribution: { displayName: "Google author" }, googleMapsUri: placeUrl }] } });
  const view = providerDetailView(withGooglePlace(provider, google));
  assert.equal(view.name, provider.name);
  assert.equal(view.locality, "1010 Lausanne");
  assert.equal(view.contact.phone, provider.detail.contact.phone);
  assert.equal(view.reviews.lia[0].quote, "Lia review");
  assert.equal(view.google.reviews[0].quote, "Google review");
  assert.equal(view.google.embedUrl, null);
  assert.ok(providerDetailSections(view).some(([section]) => section === "avis"));
  assert.ok(!providerDetailSections(view).some(([section]) => section === "localisation"));
});

test("long Google reviews expand while short reviews remain compact without losing text", () => {
  const longQuote = "Une expérience détaillée. ".repeat(20);
  const provider = { slug: "ems-boveresses", name: "Example", type: "ems", commune: "Lausanne",
    npa: "1010", tags: [], detail: { google: { placeUrl, reviews: [
      { quote: longQuote, author: { name: "Long author" }, sourceUrl: placeUrl },
      { quote: "Avis bref.", author: { name: "Short author" }, sourceUrl: placeUrl },
    ] } } };
  const view = providerDetailView(provider);
  assert.equal(view.google.reviews[0].expandable, true);
  assert.equal(view.google.reviews[0].quote, longQuote);
  assert.equal(view.google.reviews[1].expandable, false);
  assert.equal(view.google.reviews[1].quote, "Avis bref.");
});
