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
