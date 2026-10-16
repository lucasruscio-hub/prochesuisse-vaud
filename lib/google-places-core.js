const endpoint = "https://places.googleapis.com/v1";
export const MATCH_FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.googleMapsUri";
export const REVIEW_MATCH_FIELD_MASK = `${MATCH_FIELD_MASK},places.websiteUri,places.rating,places.userRatingCount,places.photos`;
export const REVIEW_DETAIL_FIELD_MASK = "id,displayName,formattedAddress,googleMapsUri,websiteUri,rating,userRatingCount,photos";
export const DETAIL_FIELD_MASK = "id,googleMapsUri,googleMapsLinks,photos,rating,userRatingCount,reviews,attributions";
export const CARD_FIELD_MASK = "id,googleMapsUri,photos,rating,userRatingCount,attributions";
const maxPhotos = 4;

async function requestJson(url, { apiKey, fetchImpl = fetch, ...options }) {
  if (!apiKey) return null;
  const response = await fetchImpl(url, {
    ...options, cache: "no-store", signal: AbortSignal.timeout(10000),
    headers: { "X-Goog-Api-Key": apiKey, ...options.headers },
  });
  if (!response.ok) throw new Error(`Google Places request failed (${response.status})`);
  return response.json();
}

/** Text Search (New): candidate evidence only. It never writes an approval. */
export async function searchGooglePlaceCandidates(query, { apiKey = process.env.GOOGLE_PLACES_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) return null;
  const result = await requestJson(`${endpoint}/places:searchText`, { apiKey, fetchImpl, method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-FieldMask": MATCH_FIELD_MASK },
    body: JSON.stringify({ textQuery: query, languageCode: "fr", regionCode: "CH", pageSize: 5 }) });
  return (result?.places ?? []).filter((place) => typeof place.id === "string").map((place) => ({
    placeId: place.id, googleName: place.displayName?.text ?? null,
    googleAddress: place.formattedAddress ?? null, googleMapsUrl: place.googleMapsUri ?? null,
  }));
}

/** Human-review discovery adds transient evidence, but still never selects or approves a Place. */
export async function searchGooglePlaceReviewCandidates(query, {
  apiKey = process.env.GOOGLE_PLACES_API_KEY, fetchImpl = fetch,
} = {}) {
  if (!apiKey) return null;
  const result = await requestJson(`${endpoint}/places:searchText`, { apiKey, fetchImpl, method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-FieldMask": REVIEW_MATCH_FIELD_MASK },
    body: JSON.stringify({ textQuery: query, languageCode: "fr", regionCode: "CH", pageSize: 5 }) });
  return (result?.places ?? []).filter((place) => typeof place.id === "string").map((place) => ({
    placeId: place.id,
    googleName: place.displayName?.text ?? null,
    googleAddress: place.formattedAddress ?? null,
    googleMapsUrl: place.googleMapsUri ?? null,
    officialWebsite: place.websiteUri ?? null,
    rating: Number.isFinite(place.rating) && place.rating >= 1 && place.rating <= 5 ? place.rating : null,
    reviewCount: Number.isInteger(place.userRatingCount) && place.userRatingCount >= 0
      ? place.userRatingCount : null,
    hasUsablePhoto: Array.isArray(place.photos) && place.photos.some((photo) => typeof photo?.name === "string"),
  }));
}

/** Direct transient evidence for an already-approved identity; photo media URLs are intentionally not requested. */
export async function getGooglePlaceReviewEvidence(placeId, {
  apiKey = process.env.GOOGLE_PLACES_API_KEY, fetchImpl = fetch,
} = {}) {
  if (!apiKey || !/^[A-Za-z0-9_-]{10,256}$/.test(placeId ?? "")) return null;
  const query = new URLSearchParams({ languageCode: "fr", regionCode: "CH" });
  const place = await requestJson(`${endpoint}/places/${encodeURIComponent(placeId)}?${query}`, {
    apiKey, fetchImpl, headers: { "X-Goog-FieldMask": REVIEW_DETAIL_FIELD_MASK },
  });
  if (place?.id !== placeId) return null;
  return {
    placeId: place.id,
    googleName: place.displayName?.text ?? null,
    googleAddress: place.formattedAddress ?? null,
    googleMapsUrl: place.googleMapsUri ?? null,
    officialWebsite: place.websiteUri ?? null,
    rating: Number.isFinite(place.rating) && place.rating >= 1 && place.rating <= 5 ? place.rating : null,
    reviewCount: Number.isInteger(place.userRatingCount) && place.userRatingCount >= 0
      ? place.userRatingCount : null,
    hasUsablePhoto: Array.isArray(place.photos) && place.photos.some((photo) => typeof photo?.name === "string"),
  };
}

/** Card-only request: current rating plus at most one attributed photo; no reviews or durable media. */
export async function getGooglePlaceCard(placeId, {
  apiKey = process.env.GOOGLE_PLACES_API_KEY, fetchImpl = fetch,
} = {}) {
  if (!apiKey || !/^[A-Za-z0-9_-]{10,256}$/.test(placeId ?? "")) return null;
  const query = new URLSearchParams({ languageCode: "fr", regionCode: "CH" });
  const place = await requestJson(`${endpoint}/places/${encodeURIComponent(placeId)}?${query}`, {
    apiKey, fetchImpl, headers: { "X-Goog-FieldMask": CARD_FIELD_MASK },
  });
  if (place?.id !== placeId) return null;
  const photo = Array.isArray(place.photos) ? place.photos[0] : null;
  const uri = photo ? await photoMediaUri(photo.name, placeId, { apiKey, fetchImpl }).catch(() => null) : null;
  return { place: { ...place, photos: photo ? [photo] : [] },
    photoUris: photo && uri ? { [photo.name]: uri } : {} };
}

async function photoMediaUri(photoName, placeId, { apiKey, fetchImpl }) {
  if (typeof photoName !== "string" || !photoName.startsWith(`places/${placeId}/photos/`)
    || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9._~-]+$/.test(photoName)) return null;
  const result = await requestJson(`${endpoint}/${photoName}/media?maxWidthPx=1200&skipHttpRedirect=true`,
    { apiKey, fetchImpl });
  return result?.photoUri ?? null;
}

/** Fresh Place Details (New) plus fresh Photo Media URLs; no persistence or image proxy. */
export async function getRichGooglePlace(placeId, { apiKey = process.env.GOOGLE_PLACES_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey || !/^[A-Za-z0-9_-]{10,256}$/.test(placeId ?? "")) return null;
  const query = new URLSearchParams({ languageCode: "fr", regionCode: "CH" });
  const place = await requestJson(`${endpoint}/places/${encodeURIComponent(placeId)}?${query}`, {
    apiKey, fetchImpl, headers: { "X-Goog-FieldMask": DETAIL_FIELD_MASK },
  });
  if (place?.id !== placeId) return null;
  const photos = Array.isArray(place.photos) ? place.photos.slice(0, maxPhotos) : [];
  const media = await Promise.allSettled(photos.map(async (photo) => ({
    name: photo.name, uri: await photoMediaUri(photo.name, placeId, { apiKey, fetchImpl }),
  })));
  const photoUris = Object.fromEntries(media.filter((item) => item.status === "fulfilled" && item.value.uri)
    .map((item) => [item.value.name, item.value.uri]));
  return { place, photoUris };
}
