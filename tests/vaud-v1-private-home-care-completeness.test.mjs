import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPrivateHomeCareApplySql,
  buildPrivateHomeCareRollbackSql,
  compilePrivateHomeCareCompleteness,
} from "../lib/vaud-v1-private-home-care-completeness.mjs";

const data = compilePrivateHomeCareCompleteness();

test("private-home-care cohort compiles the exact 16-identity and 128-row plan", () => {
  assert.equal(data.providers.length, 16);
  assert.equal(data.providers.filter(({ action }) => action === "create").length, 14);
  assert.equal(data.providers.filter(({ action }) => action === "update").length, 2);
  assert.deepEqual(data.expectedRows, {
    organizations: 16,
    organizationSources: 16,
    providersCreated: 14,
    providersUpdated: 2,
    providerSources: 16,
    providerNames: 2,
    providerOrganizations: 16,
    careOfferings: 16,
    careOfferingSources: 16,
    designations: 16,
    serviceAreas: 0,
    features: 0,
    availability: 0,
    netNewRows: 128,
  });
});

test("Swisscaring and La Boîte O reconcile stable existing provider identities", () => {
  const swisscaring = data.providers.find(({ identity_id }) => identity_id === "swisscaring-vaud");
  const boiteO = data.providers.find(({ identity_id }) => identity_id === "la-boite-o-services");
  assert.deepEqual(
    [swisscaring.action, swisscaring.id, swisscaring.slug, swisscaring.name],
    ["update", "0acfb233-c6c1-46b4-8fb2-38de37b8c274", "swisscaring", "Swisscaring Vaud"],
  );
  assert.deepEqual(
    [boiteO.action, boiteO.id, boiteO.slug, boiteO.name],
    ["update", "478d51b3-9158-4b69-8f85-4929931f6fbf", "boite-o", "La Boîte O Services"],
  );
});

test("every implemented identity has only a minimum home-care offering and dated official-file designation", () => {
  assert.equal(data.offerings.length, 16);
  assert.ok(data.offerings.every((offering) => offering.offering_type === "home_care"));
  assert.ok(data.offerings.every((offering) => offering.summary === null));
  assert.equal(data.designations.length, 16);
  assert.ok(data.designations.every((designation) => designation.scheme === "vd_osad_official_list"));
  assert.ok(data.designations.every((designation) => designation.observed_on === "2026-03-02"));
  assert.ok(data.designations.every((designation) => designation.designation_status === null));
});

test("the cohort preserves unknown coverage, services, availability, capacity, languages, prices and financing", () => {
  for (const provider of data.providers) {
    assert.equal(provider.canton_code, null);
    assert.equal(provider.municipality_id, null);
    assert.deepEqual(provider.service_codes, []);
    assert.deepEqual(provider.language_codes, []);
  }
  for (const offering of data.offerings) {
    for (const key of ["capacity_value", "capacity_unit", "admissions_notes", "financing_notes", "public_interest_status", "pricing_notes"]) {
      assert.equal(offering[key], null);
    }
  }
  const sql = buildPrivateHomeCareApplySql();
  assert.doesNotMatch(sql, /INSERT INTO public\.(provider_service_areas|care_offering_features|care_offering_availability)/);
});

test("La Source aliases are preserved without creating duplicate providers", () => {
  assert.deepEqual(
    data.providerNames.map(({ name, name_type }) => [name, name_type]),
    [["UniQue Care", "historical"], ["Unique Soins à domicile", "historical"]],
  );
  assert.equal(data.providers.filter(({ identity_id }) => identity_id === "la-source-a-domicile").length, 1);
});

test("the guarded SQL requires the exact Batch F predecessor and rollback restores updates", () => {
  const applySql = buildPrivateHomeCareApplySql({ rollback: true });
  assert.match(applySql, /Private-home-care cohort predecessor mismatch/);
  assert.match(applySql, /providersUpdated',2/);
  assert.match(applySql, /ROLLBACK;/);
  const rollbackSql = buildPrivateHomeCareRollbackSql();
  assert.match(rollbackSql, /DISABLE TRIGGER providers_set_updated_at/);
  assert.match(rollbackSql, /ENABLE TRIGGER providers_set_updated_at/);
  assert.ok(rollbackSql.indexOf("care_offering_regulatory_designations") < rollbackSql.indexOf("care_offerings"));
  assert.ok(rollbackSql.indexOf("provider_sources") < rollbackSql.indexOf("providers p USING"));
  assert.ok(rollbackSql.indexOf("organization_sources") < rollbackSql.indexOf("organizations o USING"));
});
