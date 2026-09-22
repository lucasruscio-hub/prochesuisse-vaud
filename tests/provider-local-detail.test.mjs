import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { providerDetailView, providerDetailSections } from "../lib/provider-detail.js";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { getProviderBySlug, getProviderDetailBySlug, localDetailPreviewEnabled } = await import("../lib/provider-repository.js");

const source = (type, url, fields) => ({ source_type: type, source_url: url, fields_supported: fields });
function snapshot(base, patch, reviewedSources) {
  return { provider: {
    legacy_id: base.slug, slug: base.slug, name: base.name, primary_type: base.type,
    country_code: "CH", canton_code: null, postal_code: base.npa, locality: base.commune,
    original_location_text: base.address, original_tags: [...base.tags],
    is_published: false, verification_status: "unverified", status: "active", last_reviewed_at: null,
    municipality_id: null, street: null, house_number: null, latitude: null, longitude: null,
    description: null, service_codes: [], subtypes: [], language_codes: [], attributes: {},
    phone: null, email: null, website: null, ...patch,
  }, sources: [{ source_type: "legacy", external_record_id: base.slug }, ...reviewedSources],
  serviceAreaCount: 0 };
}

test("detail repository keeps static fallback by default and for non-pilots", async () => {
  assert.equal(localDetailPreviewEnabled(), false);
  const base = await getProviderBySlug("ems-boveresses");
  assert.deepEqual(await getProviderDetailBySlug(base.slug), base);
  let called = false;
  const nova = await getProviderBySlug("nova-via");
  assert.deepEqual(await getProviderDetailBySlug(nova.slug, { preview: true,
    readLocal: async () => { called = true; return null; } }), nova);
  assert.equal(called, false);
});

test("local reviewed Boveresses projects only approved structured identity and contact", async () => {
  const base = await getProviderBySlug("ems-boveresses");
  const local = snapshot(base, { name: "Tertianum Les Boveresses", canton_code: "VD",
    phone: "021 654 06 06", email: "lesboveresses@tertianum.ch",
    website: "https://www.tertianum.ch/fr/etablissement-medico-sociaux/tertianum-les-boveresses" }, [
    source("provider", "https://www.tertianum.ch/fr/etablissement-medico-sociaux/tertianum-les-boveresses",
      ["name", "postal_code", "locality", "phone", "email", "website"]),
    source("public", "https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf",
      ["primary_type", "canton_code"]),
  ]);
  const projected = await getProviderDetailBySlug(base.slug, { preview: true, readLocal: async () => local });
  assert.equal(projected.name, "Tertianum Les Boveresses");
  assert.equal(projected.commune, "Lausanne");
  assert.equal(projected.npa, "1010");
  assert.deepEqual(projected.detail.contact, { phone: "021 654 06 06",
    email: "lesboveresses@tertianum.ch", website: local.provider.website });
  assert.deepEqual(projected.tags, base.tags);
  assert.ok(!JSON.stringify(projected).includes("fields_supported"));
  const view = providerDetailView(projected);
  assert.deepEqual(providerDetailSections(view).map(([id]) => id), ["reperes", "contact", "sources"]);
  assert.deepEqual(view.offerings, []);
  assert.equal(view.sourceFreshness, null);
});

test("local Senevita shows office locality and sourced contact without coverage", async () => {
  const base = await getProviderBySlug("senevita-vaud");
  const local = snapshot(base, { phone: "021 311 19 20",
    website: "https://www.senevita.ch/fr/sites/spitex-vaud/" }, [
    source("provider", "https://www.senevita.ch/fr/sites/spitex-vaud/",
      ["name", "primary_type", "postal_code", "locality", "phone", "website"]),
  ]);
  const projected = await getProviderDetailBySlug(base.slug, { preview: true, readLocal: async () => local });
  const view = providerDetailView(projected);
  assert.equal(view.locationLabel, "1020 Renens");
  assert.equal(view.contact.email, null);
  assert.equal(view.mapUrl, null);
  assert.deepEqual(view.offerings, []);
  assert.deepEqual(projected.tags, base.tags);
  local.serviceAreaCount = 1;
  const fallback = await getProviderDetailBySlug(base.slug, { preview: true, readLocal: async () => local });
  assert.deepEqual(fallback, base);
});

test("unpublished and provenance guards reject unsafe local data without losing static fallback", async () => {
  const base = await getProviderBySlug("senevita-vaud");
  const local = snapshot(base, { phone: "021 311 19 20" }, []);
  for (const change of [
    (s) => { s.provider.is_published = true; },
    (s) => { s.provider.verification_status = "verified"; },
    (s) => { s.provider.service_codes = ["nursing"]; },
    (s) => { s.provider.original_tags.push("New claim"); },
    (s) => { s.provider.canton_code = "VD"; },
    (s) => { s.provider.email = "unapproved@example.test"; },
  ]) {
    const unsafe = structuredClone(local); change(unsafe);
    assert.deepEqual(await getProviderDetailBySlug(base.slug, { preview: true, readLocal: async () => unsafe }), base);
  }
  assert.deepEqual(await getProviderDetailBySlug(base.slug, { preview: true,
    readLocal: async () => { throw new Error("offline"); } }), base);
});
