import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchB2ApromadApplySql, buildBatchB2ApromadRollbackSql, compileBatchB2Apromad }
  from "../lib/phase5f-batch-b2-apromad.mjs";

const data = compileBatchB2Apromad();

test("B2 compiles the exact 64-row B-APROMAD manifest subset and matches B1 structure", () => {
  assert.deepEqual([data.providers.length, data.providerSources.length, data.offerings.length,
    data.offeringSources.length, data.providerOrganizations.length, data.identityLinks.length,
    data.designations.length, data.subBatch.netNewRows], [8, 8, 8, 8, 16, 8, 8, 64]);
  assert.deepEqual(data.providers.map((item) => item.name), [
    "CMS de Cully", "CMS d’Echallens", "CMS d’Epalinges", "CMS du Mont",
    "CMS d’Oron", "CMS de Prilly Nord", "CMS de Prilly Sud", "CMS de Pully",
  ]);
});

test("B2 CMS stay minimal, unpublished, unverified, and location-free", () => {
  for (const provider of data.providers) {
    assert.equal(provider.primary_type, "domicile");
    assert.equal(provider.is_published, false);
    assert.equal(provider.verification_status, "unverified");
    for (const key of ["canton_code", "municipality_id", "postal_code", "locality", "street",
      "house_number", "latitude", "longitude", "phone", "email", "website", "description"]) {
      assert.equal(provider[key], null, `${provider.slug}.${key}`);
    }
    assert.deepEqual(provider.service_codes, []);
    assert.deepEqual(provider.language_codes, []);
  }
  assert.ok(data.offerings.every((item) => item.offering_type === "home_care"
    && item.summary === null && item.capacity_value === null && item.is_published === false));
});

test("each B2 CMS has APROMAD as primary operator and AVASAD only as network", () => {
  for (const provider of data.providers) {
    const links = data.providerOrganizations.filter((item) => item.provider_id === provider.id);
    assert.deepEqual(links.map((item) => [item.organization_slug, item.relationship_type, item.is_primary]), [
      ["apromad", "operator", true], ["avasad", "network", false],
    ]);
  }
  assert.ok(data.providerOrganizations.every((item) => !["owner", "brand"].includes(item.relationship_type)));
});

test("B2 CMS classifications preserve every unsupported regulatory field as null", () => {
  for (const item of data.designations) {
    assert.deepEqual({ type: item.designation_type, scheme: item.scheme, code: item.designation_code,
      label: item.designation_label, country: item.jurisdiction_country_code,
      jurisdiction: item.jurisdiction_code, issuer: item.issuing_organization_id,
      status: item.designation_status, effective: item.effective_on, expires: item.expires_on,
      published: item.is_published }, { type: "classification", scheme: "vd_home_care_provider_class",
      code: "cms", label: "centres médico-sociaux", country: "CH", jurisdiction: "VD",
      issuer: null, status: null, effective: null, expires: null, published: false });
  }
});

test("guarded B2 apply requires exact B1 and remains rollback capable", () => {
  const sql = buildBatchB2ApromadApplySql({ rollback: true });
  assert.match(sql, /count\(\*\) FROM public\.providers\) <> 74/);
  assert.match(sql, /slug='apromad'/);
  assert.match(sql, /B2 requires the exact applied B1 baseline/);
  assert.match(sql, /INSERT INTO public\.provider_identity_links/);
  assert.match(sql, /Unpublished B2 data became public/);
  assert.match(sql, /ROLLBACK;\s*$/);
  assert.doesNotMatch(sql, /INSERT INTO public\.provider_service_areas|INSERT INTO public\.care_offering_features|INSERT INTO public\.care_offering_availability/);
});

test("B2 rollback deletes only deterministic rows in dependency order", () => {
  const sql = buildBatchB2ApromadRollbackSql();
  const order = ["care_offering_regulatory_designations", "provider_identity_links",
    "care_offering_sources", "care_offerings", "provider_organizations", "provider_sources", "providers"];
  for (let index = 1; index < order.length; index++) {
    assert.ok(sql.indexOf(`DELETE FROM public.${order[index - 1]}`)
      < sql.indexOf(`DELETE FROM public.${order[index]}`));
  }
});
