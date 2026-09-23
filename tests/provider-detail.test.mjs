import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { providerPath, providerMetadata, providerBreadcrumbs, providerDetailView, providerDetailSections, providerHeroMedia } from "../lib/provider-detail.js";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { listProviders, getProviderBySlug } = await import("../lib/provider-repository.js");

test("all provider detail URLs round-trip to the repository's stable slugs", async () => {
  for (const provider of await listProviders()) {
    const path = providerPath(provider.slug);
    assert.equal(path, `/prestataires/${provider.slug}`);
    assert.deepEqual(await getProviderBySlug(decodeURIComponent(path.split("/").at(-1))), provider);
    const metadata = providerMetadata(provider);
    assert.ok(metadata.title.includes(provider.name));
    assert.ok(metadata.description.includes(provider.commune));
    assert.equal(metadata.alternates.canonical, `https://liavaud.ch${path}`);
    const breadcrumbs = providerBreadcrumbs(provider);
    assert.equal(breadcrumbs["@type"], "BreadcrumbList");
    assert.equal(breadcrumbs.itemListElement.at(-1).item, metadata.alternates.canonical);
    assert.equal(breadcrumbs.itemListElement.at(-1).name, provider.name);
  }
});

test("unknown and malformed slugs have no provider; URL segments stay encoded", async () => {
  for (const slug of ["unknown-provider", "", null, undefined, "../ems-chateau-rive", "EMS-CHATEAU-RIVE"]) {
    assert.equal(await getProviderBySlug(slug), null);
  }
  assert.equal(providerPath("a/b?c#d"), "/prestataires/a%2Fb%3Fc%23d");
});

test("metadata handles missing locality and excludes unverified tags and extra claims", () => {
  const provider = { slug: "example", name: "Example", type: "domicile", commune: null,
    tags: ["Public", "Bilingue", "Tout Vaud"], price: 500, rating: 4.8 };
  const metadata = providerMetadata(provider);
  assert.equal(metadata.title, "Example | Aide à domicile | Lia");
  assert.doesNotMatch(JSON.stringify([metadata, providerBreadcrumbs(provider)]), /null|undefined|Bilingue|Tout Vaud|rating|500|4\.8/);
});

test("sparse legacy providers show identity and transparency without invented sections", async () => {
  for (const provider of await listProviders()) {
    const view = providerDetailView(provider);
    assert.equal(view.name, provider.name);
    assert.deepEqual(view.legacyTags, provider.tags);
    assert.deepEqual(view.photos, []);
    assert.equal(view.overview, null);
    assert.deepEqual(view.facts, []);
    assert.deepEqual(view.offerings, []);
    assert.equal(view.admissions, null);
    assert.equal(view.pricing, null);
    assert.equal(view.availability, null);
    assert.equal(view.mapUrl, null);
    assert.deepEqual(view.reviews, { lia: [] });
    assert.equal(view.operator, null);
    assert.equal(view.sourceFreshness, null);
    assert.deepEqual(providerDetailSections(view).map(([id]) => id), ["reperes", "sources"]);
  }
});

test("curated detail sections support multiple offerings and keep review sources separate", () => {
  const view = providerDetailView({ slug: "example", name: "Example", type: "residence", npa: "1820",
    commune: "Montreux", address: "Montreux · 1820", tags: ["Bilingue"], detail: {
      photos: [{ src: "/example.jpg", alt: "Site Example" }, { src: "", alt: "" }],
      overview: { text: "Présentation confirmée.", verified: true },
      facts: [{ label: "Capacité", value: "12 places" }, { label: "Inconnu", value: "" }],
      offerings: [
        { name: "Résidence", accommodation: ["Appartements"] },
        { name: "Unité de soins", services: ["Accompagnement"] },
      ],
      admissions: "Contacter l’équipe.", pricing: "Tarifs communiqués sur demande.",
      availability: { text: "Disponible", checkedAt: "2026-09-22" },
      location: { address: "Place de la Paix", mapUrl: "https://maps.example.test/site" },
      reviews: { google: [{ quote: "Accueil agréable", author: "A" }],
        lia: [{ quote: "Suivi utile", author: "B" }] },
      operator: { name: "Organisation Example" },
      sourceFreshness: { verified: true, label: "Revue le", date: "2026-09-22" },
    } });
  assert.equal(view.offerings.length, 2);
  assert.deepEqual(view.offerings.map((offering) => offering.name), ["Résidence", "Unité de soins"]);
  assert.equal(view.google, null);
  assert.equal(view.reviews.lia.length, 1);
  assert.equal(view.locationLabel, "Place de la Paix");
  assert.deepEqual(view.availability, { text: "Disponible", checkedAt: "2026-09-22" });
  assert.deepEqual(providerDetailSections(view).map(([id]) => id),
    ["reperes", "accompagnement", "pratique", "localisation", "avis", "organisation", "sources"]);
  assert.equal(view.legacyTags[0], "Bilingue");
  assert.ok(!view.offerings.some((offering) => offering.services.includes("Bilingue")));
});

test("incomplete or unverified rich fields stay hidden", () => {
  const view = providerDetailView({ slug: "example", name: "Example", type: "domicile", commune: "Renens",
    npa: "1020", tags: ["Tout Vaud"], price: 500, rating: 4.8, detail: {
      photos: [{ src: "javascript:alert(1)", alt: "Photo" }, { src: "/photo.jpg", alt: "" }],
      overview: { text: "Unreviewed claim", verified: false },
      offerings: [{ name: "", services: ["Unreviewed service"] }],
      reviews: { google: [{ quote: "", author: "A" }] },
      location: { mapUrl: "javascript:alert(1)" },
      sourceFreshness: { verified: false, label: "Verified" },
      availability: { text: "Disponible" },
    } });
  assert.deepEqual(view.photos, []);
  assert.equal(view.overview, null);
  assert.deepEqual(view.offerings, []);
  assert.deepEqual(view.reviews, { lia: [] });
  assert.equal(view.mapUrl, null);
  assert.equal(view.sourceFreshness, null);
  assert.equal(view.availability, null);
  assert.deepEqual(providerDetailSections(view).map(([id]) => id), ["reperes", "sources"]);
  assert.equal(view.locationLabel, "1020 Renens");
});

test("hero media uses legitimate photos and retains the decorative empty state", () => {
  const empty = { photos: [], google: null };
  assert.deepEqual(providerHeroMedia(empty), { source: "none", photos: [] });
  const providerPhoto = { src: "/provider.jpg", alt: "Provider" };
  assert.deepEqual(providerHeroMedia({ photos: [providerPhoto], google: null }),
    { source: "provider", photos: [providerPhoto] });
  const googlePhoto = { src: "https://lh3.googleusercontent.com/place", alt: "Google" };
  assert.deepEqual(providerHeroMedia({ photos: [providerPhoto], google: { photos: [googlePhoto] } }),
    { source: "google", photos: [googlePhoto] });
});
