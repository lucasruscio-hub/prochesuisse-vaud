import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchCApplySql, buildBatchCRollbackSql, compileBatchC }
  from "../lib/phase5f-batch-c-private-organizations.mjs";

const data = compileBatchC();

test("Batch C compiles the exact cleared four-row manifest subset", () => {
  assert.deepEqual(data.expectedRows,
    { organizations:2, organizationSources:2, providers:0, netNewRows:4 });
  assert.deepEqual(data.organizations.map((item) => [item.slug,item.name,item.legal_name]), [
    ["nurse-home-care-sarl","Nurse Home Care Sàrl","Nurse Home Care Sàrl"],
    ["soinvaud-sarl","SoinVaud Sàrl","SoinVaud Sàrl"],
  ]);
  assert.deepEqual(data.organizationSources.map((item) => item.external_record_id),
    ["CHE-270.603.185","CHE-394.182.275"]);
});

test("Batch C uses current official UID evidence only for its organization writes", () => {
  assert.ok(data.organizationSources.every((item) => item.source_type==="public"
    && item.source_url.startsWith("https://www.uid.admin.ch/Detail.aspx?uid_id=CHE-")
    && item.fields_supported.join(",")==="name,legal_name,status"));
  assert.ok(data.organizations.every((item) => !item.is_published
    && item.verification_status==="unverified" && item.website===null));
});

test("Batch C creates no provider, alias, relationship, offering, or enrichment rows", () => {
  const sql=buildBatchCApplySql();
  assert.doesNotMatch(sql, /INSERT INTO public\.(providers|provider_sources|provider_names|provider_organizations)/);
  assert.doesNotMatch(sql, /INSERT INTO public\.(care_offerings|care_offering_sources|care_offering_regulatory_designations)/);
  assert.doesNotMatch(sql, /INSERT INTO public\.(provider_service_areas|care_offering_features|care_offering_availability|organization_names|organization_relationships)/);
});

test("Batch C is exact-public-CMS guarded and supports rollback-only dry runs", () => {
  const sql=buildBatchCApplySql({rollback:true});
  assert.match(sql, /providers\)<>116/);
  assert.match(sql, /organizations\)<>31/);
  assert.match(sql, /organization_sources\)<>9/);
  assert.match(sql, /providers WHERE slug LIKE 'cms-%'\)<>50/);
  assert.match(sql, /ROLLBACK;\s*$/);
});

test("Batch C rollback removes sources before organizations and refuses dependents", () => {
  const sql=buildBatchCRollbackSql();
  assert.ok(sql.indexOf("DELETE FROM public.organization_sources")
    < sql.indexOf("DELETE FROM public.organizations"));
  assert.match(sql, /rollback refuses dependent rows/);
});
