import test from "node:test";
import assert from "node:assert/strict";
import { buildPoleSantePrerequisiteApplySql, buildPoleSantePrerequisiteRollbackSql,
  compilePoleSantePrerequisite } from "../lib/phase5f-b4-pole-sante-prerequisite.mjs";

const data = compilePoleSantePrerequisite();

test("Pôle Santé prerequisite isolates exactly three Batch D rows", () => {
  assert.deepEqual(data.expectedRows,
    { organizations: 1, organizationSources: 1, organizationNames: 1, netNewRows: 3 });
  assert.equal(data.organization.name, "Pôle Santé du Pays-d'Enhaut");
  assert.equal(data.organization.legal_name, null);
  assert.equal(data.organizationName.name, "Pôle Santé du Pays d'Enhaut");
  assert.equal(data.organizationName.name_type, "trading");
});

test("prerequisite creates no provider, relationship, offering, or enrichment", () => {
  const sql = buildPoleSantePrerequisiteApplySql();
  assert.doesNotMatch(sql, /INSERT INTO public\.(providers|provider_organizations|care_offerings|organization_relationships)/);
  assert.doesNotMatch(sql, /INSERT INTO public\.(provider_service_areas|care_offering_features|care_offering_availability)/);
  assert.ok(!data.organization.is_published && data.organization.verification_status === "unverified");
});

test("prerequisite apply is exact-B3 scoped and supports dry-run", () => {
  const sql = buildPoleSantePrerequisiteApplySql({ rollback: true });
  assert.match(sql, /providers\)<>86/);
  assert.match(sql, /organizations\)<>30/);
  assert.match(sql, /Pôle Santé prerequisite became public/);
  assert.match(sql, /ROLLBACK;\s*$/);
});

test("prerequisite rollback is deterministic and refuses to orphan B4 links", () => {
  const sql = buildPoleSantePrerequisiteRollbackSql();
  assert.ok(sql.indexOf("DELETE FROM public.organization_names") <
    sql.indexOf("DELETE FROM public.organization_sources"));
  assert.ok(sql.indexOf("DELETE FROM public.organization_sources") <
    sql.indexOf("DELETE FROM public.organizations"));
  assert.match(sql, /cannot roll back after B4/);
});
