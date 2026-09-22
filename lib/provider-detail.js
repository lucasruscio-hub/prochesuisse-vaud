import { PROVIDER_TYPES } from "./provider-config.js";

// Same canonical origin as the existing guide pages.
const SITE_URL = "https://liavaud.ch";

export function providerPath(slug) {
  return `/prestataires/${encodeURIComponent(slug)}`;
}

export function providerMetadata(provider) {
  const label = PROVIDER_TYPES[provider.type];
  const location = provider.commune ? ` à ${provider.commune}` : "";
  return {
    title: `${provider.name} | ${label}${location} | Lia`,
    description: `Consultez la fiche de ${provider.name}, dans la catégorie ${label}${location}. Informations de l’annuaire à confirmer auprès du prestataire.`,
    alternates: { canonical: `${SITE_URL}${providerPath(provider.slug)}` },
  };
}

export function providerBreadcrumbs(provider) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Rechercher un prestataire", item: `${SITE_URL}/recherche` },
      { "@type": "ListItem", position: 3, name: provider.name, item: `${SITE_URL}${providerPath(provider.slug)}` },
    ],
  };
}

const text = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const items = (value) => Array.isArray(value) ? value : [];
const safeUrl = (value, { local = false } = {}) => {
  const candidate = text(value);
  if (!candidate) return null;
  if (local && candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try { return new URL(candidate).protocol === "https:" ? candidate : null; }
  catch { return null; }
};

/** Curated detail projection. Optional fields are never derived from legacy tags. */
export function providerDetailView(provider) {
  const detail = provider.detail ?? {};
  const photos = items(detail.photos).filter((photo) => safeUrl(photo?.src, { local: true }) && text(photo?.alt))
    .map((photo) => ({ src: safeUrl(photo.src, { local: true }), alt: text(photo.alt) }));
  const facts = items(detail.facts).filter((fact) => text(fact?.label) && text(fact?.value))
    .map((fact) => ({ label: text(fact.label), value: text(fact.value) }));
  const offerings = items(detail.offerings).filter((offering) => text(offering?.name))
    .map((offering) => ({
      name: text(offering.name), summary: text(offering.summary),
      services: items(offering.services).map(text).filter(Boolean),
      accommodation: items(offering.accommodation).map(text).filter(Boolean),
      facilities: items(offering.facilities).map(text).filter(Boolean),
    }));
  const reviews = Object.fromEntries(["google", "lia"].map((source) => [source,
    items(detail.reviews?.[source]).filter((review) => text(review?.quote) && text(review?.author))
      .map((review) => ({ quote: text(review.quote), author: text(review.author), date: text(review.date) }))]));
  const locality = [text(provider.npa), text(provider.commune)].filter(Boolean).join(" ");
  const locationLabel = text(detail.location?.address) || locality || text(provider.address);
  const email = text(detail.contact?.email);
  const contact = {
    phone: text(detail.contact?.phone),
    email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    website: safeUrl(detail.contact?.website),
  };
  return {
    slug: provider.slug, name: provider.name, type: provider.type,
    typeLabel: PROVIDER_TYPES[provider.type] ?? provider.type,
    locality, commune: text(provider.commune),
    // Legacy address is a display location, never promoted into a street or service area.
    locationLabel,
    photos, overview: detail.overview?.verified === true ? text(detail.overview.text) : null,
    facts, offerings,
    contact,
    admissions: text(detail.admissions), pricing: text(detail.pricing),
    availability: text(detail.availability?.text) && text(detail.availability?.checkedAt)
      ? { text: text(detail.availability.text), checkedAt: text(detail.availability.checkedAt) } : null,
    mapUrl: safeUrl(detail.location?.mapUrl),
    reviews,
    operator: text(detail.operator?.name) ? { name: text(detail.operator.name),
      description: text(detail.operator.description) } : null,
    sourceFreshness: detail.sourceFreshness?.verified === true && text(detail.sourceFreshness.label)
      ? { label: text(detail.sourceFreshness.label), date: text(detail.sourceFreshness.date) } : null,
    legacyTags: items(provider.tags).map(text).filter(Boolean),
  };
}

export function providerDetailSections(view) {
  return [
    ["reperes", "Repères"],
    ...(view.contact.phone || view.contact.email || view.contact.website ? [["contact", "Coordonnées"]] : []),
    ...(view.offerings.length ? [["accompagnement", "Accompagnement"]] : []),
    ...(view.admissions || view.pricing || view.availability ? [["pratique", "Informations pratiques"]] : []),
    ...(view.mapUrl ? [["localisation", "Localisation"]] : []),
    ...(view.reviews.google.length || view.reviews.lia.length ? [["avis", "Avis"]] : []),
    ...(view.operator ? [["organisation", "Organisation"]] : []),
    ["sources", "Transparence"],
  ];
}
