const endpoint = "https://places.googleapis.com/v1";
export const MATCH_FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.googleMapsUri";
export const DETAIL_FIELD_MASK = "id,googleMapsUri,googleMapsLinks,photos,rating,userRatingCount,reviews,attributions";
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
