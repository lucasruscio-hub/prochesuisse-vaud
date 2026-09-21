import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { providerPath, providerMetadata, providerBreadcrumbs } from "../lib/provider-detail.js";

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
