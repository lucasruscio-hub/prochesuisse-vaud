import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchFApplySql, buildBatchFRollbackSql, compileBatchF } from "../lib/phase5f-batch-f-altoan.mjs";

const data = compileBatchF();

test("Batch F compiles the exact reconciled 8-row plan", () => {
  assert.deepEqual(data.expectedRows, { organizations: 1, organizationSources: 1, providers: 1, providerSources: 1, providerOrganizations: 1, careOfferings: 1, careOfferingSources: 1, serviceAreas: 1, designations: 0, netNewRows: 8 });
  assert.deepEqual([data.organization.slug, data.provider.slug], ["altoan-sa", "altoan"]);
});

test("Altoan is strictly non-medical home support", () => {
  assert.equal(data.offering.offering_type, "home_support");
  assert.notEqual(data.offering.offering_type, "home_care");
  assert.match(data.offering.summary, /strictement non médical/);
  assert.match(data.offering.summary, /aucune prestation de soins infirmiers/);
});

test("Batch F preserves unknowns and the legal-name evidence gap", () => {
  assert.equal(data.organization.legal_name, null);
  assert.equal(data.provider.canton_code, null);
  assert.deepEqual(data.provider.service_codes, []);
  assert.deepEqual(data.provider.language_codes, []);
  for (const key of ["capacity_value", "capacity_unit", "admissions_notes", "financing_notes", "pricing_notes"]) assert.equal(data.offering[key], null);
});

test("Batch F adds only the explicitly evidenced in-scope canton row and no enrichment", () => {
  assert.deepEqual([data.serviceArea.coverage_type, data.serviceArea.country_code, data.serviceArea.canton_code, data.serviceArea.municipality_id, data.serviceArea.coverage_label], ["canton", "CH", "VD", null, null]);
  const sql = buildBatchFApplySql();
  assert.doesNotMatch(sql, /INSERT INTO public\.(care_offering_regulatory_designations|care_offering_features|care_offering_availability|provider_names|provider_identity_links)/);
});

test("Batch F is exact-E guarded and rolls back in dependency order", () => {
  assert.match(buildBatchFApplySql({ rollback: true }), /Batch F predecessor mismatch[\s\S]*ROLLBACK;/);
  const sql = buildBatchFRollbackSql();
  const order = ["provider_service_areas", "care_offering_sources", "care_offerings", "provider_organizations", "provider_sources", "providers", "organization_sources", "organizations"];
  for (let index = 1; index < order.length; index += 1) assert.ok(sql.indexOf(`DELETE FROM public.${order[index - 1]}`) < sql.indexOf(`DELETE FROM public.${order[index]}`));
});
