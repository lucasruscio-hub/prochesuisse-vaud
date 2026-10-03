import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchB1FslApplySql, buildBatchB1FslRollbackSql, compileBatchB1Fsl }
  from "../lib/phase5f-batch-b1-fsl.mjs";

const data = compileBatchB1Fsl();

test("B1 compiles the exact 64-row B-FSL manifest subset", () => {
  assert.equal(data.providers.length, 8);
  assert.equal(data.providerSources.length, 8);
  assert.equal(data.offerings.length, 8);
  assert.equal(data.offeringSources.length, 8);
  assert.equal(data.providerOrganizations.length, 16);
  assert.equal(data.identityLinks.length, 8);
  assert.equal(data.designations.length, 8);
  assert.equal(data.subBatch.netNewRows, 64);
  assert.deepEqual(data.providers.map((item) => item.name), [
    "CMS Ancien-Stand", "CMS Centre-Ville", "CMS Chailly-Sallaz", "CMS Montelly",
    "CMS Ouchy", "CMS des Peupliers", "CMS Riponne", "CMS Valency",
  ]);
});

test("every CMS is minimal, unpublished, unverified, and has no inferred location or services", () => {
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

test("each CMS has FSL as primary operator and AVASAD only as network", () => {
  for (const provider of data.providers) {
    const links = data.providerOrganizations.filter((item) => item.provider_id === provider.id);
    assert.deepEqual(links.map((item) => [item.organization_slug, item.relationship_type, item.is_primary]), [
      ["fondation-soins-lausanne", "operator", true], ["avasad", "network", false],
    ]);
  }
  assert.ok(data.providerOrganizations.every((item) => !["owner", "brand"].includes(item.relationship_type)));
});

test("CMS classification preserves unknown status, dates, and issuer", () => {
  for (const item of data.designations) {
    assert.equal(item.designation_type, "classification");
    assert.equal(item.scheme, "vd_home_care_provider_class");
    assert.equal(item.designation_code, "cms");
    assert.equal(item.designation_label, "centres médico-sociaux");
    assert.equal(item.jurisdiction_country_code, "CH");
    assert.equal(item.jurisdiction_code, "VD");
    assert.equal(item.issuing_organization_id, null);
    assert.equal(item.designation_status, null);
    assert.equal(item.effective_on, null);
    assert.equal(item.expires_on, null);
    assert.equal(item.is_published, false);
  }
});

test("guarded B1 apply is exact-Batch-A scoped and dry-run capable", () => {
  const sql = buildBatchB1FslApplySql({ rollback: true });
  assert.match(sql, /count\(\*\) FROM public\.providers\) <> 66/);
  assert.match(sql, /fondation-soins-lausanne/);
  assert.match(sql, /INSERT INTO public\.provider_identity_links/);
  assert.ok(data.identityLinks.every((item) => item.relationship_type === "split_into"));
  assert.match(sql, /Unpublished B1 data became public/);
  assert.match(sql, /ROLLBACK;\s*$/);
  assert.doesNotMatch(sql, /INSERT INTO public\.provider_service_areas|INSERT INTO public\.care_offering_features|INSERT INTO public\.care_offering_availability/);
});

test("rollback deletes only deterministic B1 rows in dependency order", () => {
  const sql = buildBatchB1FslRollbackSql();
  const order = ["care_offering_regulatory_designations", "provider_identity_links",
    "care_offering_sources", "care_offerings", "provider_organizations", "provider_sources", "providers"];
  for (let index = 1; index < order.length; index++) {
    assert.ok(sql.indexOf(`DELETE FROM public.${order[index - 1]}`)
      < sql.indexOf(`DELETE FROM public.${order[index]}`));
  }
});
