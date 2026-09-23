const text = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const list = (value) => Array.isArray(value) ? value : [];
const https = (value) => {
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : null; }
  catch { return null; }
};
const mapsUrl = (value) => {
  const url = https(value);
  if (!url) return null;
  const host = new URL(url).hostname;
  return host === "google.com" || host === "www.google.com" || host === "maps.google.com" ? url : null;
};
const googlePhotoUrl = (value) => {
  const url = https(value);
  return url && new URL(url).hostname.endsWith(".googleusercontent.com") ? url : null;
};
const attribution = (value) => ({
  name: text(value?.displayName), uri: https(value?.uri), photoUri: googlePhotoUrl(value?.photoUri),
});

export function projectGooglePlace(placeId, response, { embedKey = null } = {}) {
  const place = response?.place;
  if (!place || place.id !== placeId) return null;
  const placeUrl = mapsUrl(place.googleMapsUri);
  if (!placeUrl) return null;
  const photos = list(place.photos).map((photo) => {
    const authors = list(photo.authorAttributions).map(attribution);
    if (authors.some((author) => !author.name)) return null;
    const src = googlePhotoUrl(response.photoUris?.[photo.name]);
    const sourceUrl = mapsUrl(photo.googleMapsUri);
    return src && sourceUrl ? { src, sourceUrl, authors, alt: "Photo fournie par Google Maps" } : null;
  }).filter(Boolean);
  const reviews = list(place.reviews).map((review) => {
    const quote = text(review.text?.text);
    const author = attribution(review.authorAttribution);
    const sourceUrl = mapsUrl(review.googleMapsUri);
    if (!quote || !author.name || !sourceUrl) return null;
    return { quote, author, sourceUrl,
      rating: Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5 ? review.rating : null,
      relativeDate: text(review.relativePublishTimeDescription),
      visitDate: Number.isInteger(review.visitDate?.year) && Number.isInteger(review.visitDate?.month)
        && review.visitDate.month >= 1 && review.visitDate.month <= 12
        ? `${String(review.visitDate.month).padStart(2, "0")}/${review.visitDate.year}` : null,
      translated: Boolean(review.originalText?.languageCode && review.text?.languageCode
        && review.originalText.languageCode !== review.text.languageCode),
    };
  }).filter(Boolean);
  const rating = Number.isFinite(place.rating) && place.rating >= 1 && place.rating <= 5 ? place.rating : null;
  const reviewCount = Number.isInteger(place.userRatingCount) && place.userRatingCount >= 0
    ? place.userRatingCount : null;
  const embedUrl = text(embedKey) ? `https://www.google.com/maps/embed/v1/place?${new URLSearchParams({
    key: embedKey, q: `place_id:${placeId}`, language: "fr", region: "CH",
  })}` : null;
  return {
    placeId, placeUrl, reviewsUrl: mapsUrl(place.googleMapsLinks?.reviewsUri) ?? placeUrl,
    photos, reviews, rating, reviewCount, embedUrl,
    attributions: list(place.attributions).filter((item) => text(item?.provider)).map((item) => ({
      name: text(item.provider), uri: https(item.providerUri),
    })),
  };
}

/** Google stays in its own namespace and cannot replace Lia facts or Lia reviews. */
export function withGooglePlace(provider, google) {
  return google ? { ...provider, detail: { ...provider.detail, google } } : provider;
}
