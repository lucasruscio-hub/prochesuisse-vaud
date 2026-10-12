import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHomeCareClosureApplySql,
  buildHomeCareClosureRollbackSql,
  compileHomeCareClosure,
} from "../lib/vaud-v1-home-care-closure.mjs";

const data = compileHomeCareClosure();

test("closure cohort reviews eleven candidates and compiles five safe identities", () => {
  assert.equal(data.manifest.identities.length + data.manifest.holds.length, 11);
  assert.equal(data.providers.length, 5);
  assert.equal(data.providers.filter(({ action }) => action === "create").length, 4);
  assert.equal(data.providers.filter(({ action }) => action === "update").length, 1);
  assert.equal(data.manifest.holds.length, 6);
  assert.equal(data.expectedRows.netNewRows, 39);
});

test("Sitex reconciles its stable legacy provider instead of duplicating it", () => {
  const sitex = data.providers.find(({ slug }) => slug === "sitex");
  assert.deepEqual(
    [sitex.action, sitex.id, sitex.legacy_id, sitex.name, sitex.locality],
    ["update", "97015bc2-f47d-492e-8bf9-d18f08d450d0", "sitex", "Sitex SA", "Gland"],
  );
});

test("implemented providers retain narrow specialist home-care offerings", () => {
  assert.equal(data.offerings.length, 5);
  assert.ok(data.offerings.every(({ offering_type }) => offering_type === "home_care"));
  assert.ok(data.offerings.every(({ summary }) => summary?.includes("aucune gamme généraliste n’est affirmée")));
  assert.deepEqual(
    data.offerings.map(({ name }) => name),
    ["Soins de plaies à domicile", "Soins respiratoires à domicile", "Soins psychiatriques à domicile", "Soins à domicile spécialisés", "Soins à domicile spécialisés"],
  );
});

test("only dated official-file designations are created", () => {
  assert.equal(data.designations.length, 5);
  assert.ok(data.designations.every(({ scheme }) => scheme === "vd_osad_official_list"));
  assert.ok(data.designations.every(({ observed_on }) => observed_on === "2026-03-02"));
  assert.ok(data.designations.every(({ designation_status }) => designation_status === null));
});

test("unknown coverage, features, availability and commercial facts remain absent", () => {
  for (const provider of data.providers) {
    assert.equal(provider.canton_code, null);
    assert.equal(provider.municipality_id, null);
    assert.deepEqual(provider.service_codes, []);
    assert.deepEqual(provider.language_codes, []);
    assert.equal(provider.is_published, false);
    assert.equal(provider.verification_status, "unverified");
  }
  for (const offering of data.offerings) {
    for (const key of ["capacity_value", "capacity_unit", "admissions_notes", "financing_notes", "public_interest_status", "pricing_notes"]) {
      assert.equal(offering[key], null);
    }
  }
  const sql = buildHomeCareClosureApplySql();
  assert.doesNotMatch(sql, /INSERT INTO public\.(provider_service_areas|care_offering_features|care_offering_availability|provider_names)/);
});

test("all six evidence-limited identities stay held", () => {
  assert.deepEqual(
    data.manifest.holds.map(({ identity }) => identity),
    ["AMAD Homecare Yverdon", "Nurse Home Care", "SoinVaud / Soinsvaud", "Sciensus", "Alterum", "Service d’aide familiale de Morges"],
  );
});

test("guarded SQL requires the exact predecessor and rollback restores Sitex", () => {
  const dryRun = buildHomeCareClosureApplySql({ rollback: true });
  assert.match(dryRun, /Home-care closure predecessor mismatch/);
  assert.match(dryRun, /Held provider unexpectedly exists/);
  assert.match(dryRun, /'providersUpdated',1/);
  assert.match(dryRun, /ROLLBACK;/);
  const rollback = buildHomeCareClosureRollbackSql();
  assert.match(rollback, /DISABLE TRIGGER providers_set_updated_at/);
  assert.match(rollback, /ENABLE TRIGGER providers_set_updated_at/);
  assert.ok(rollback.indexOf("care_offering_regulatory_designations") < rollback.indexOf("care_offerings"));
});
