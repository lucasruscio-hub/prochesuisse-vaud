import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchB3ApremadolApplySql, buildBatchB3ApremadolRollbackSql,
  compileBatchB3Apremadol } from "../lib/phase5f-batch-b3-apremadol.mjs";

const data = compileBatchB3Apremadol();
test("B3 compiles the exact APREMADOL manifest subset", () => {
  assert.deepEqual([data.providers.length,data.providerSources.length,data.providerOrganizations.length,
    data.offerings.length,data.offeringSources.length,data.identityLinks.length,data.designations.length,
    data.batch.netNewRows], [4,4,8,4,4,4,4,32]);
  assert.deepEqual(data.providers.map((item) => item.name), [
    "CMS de Bussigny et Villars-Ste-Croix",
    "CMS d’Ecublens, Saint-Sulpice et Chavannes-près-Renens",
    "CMS de Renens Nord-Crissier", "CMS Renens Sud",
  ]);
});
test("B3 CMS are minimal, unpublished, unverified, and have only APREMADOL/AVASAD links", () => {
  assert.ok(data.providers.every((item) => item.primary_type==="domicile" && !item.is_published
    && item.verification_status==="unverified" && item.canton_code===null
    && item.municipality_id===null && item.locality===null && item.service_codes.length===0
    && item.language_codes.length===0));
  for (const provider of data.providers) assert.deepEqual(data.providerOrganizations
    .filter((item) => item.provider_id===provider.id)
    .map((item) => [item.organization_slug,item.relationship_type,item.is_primary]), [
      ["apremadol","operator",true],["avasad","network",false],
    ]);
  assert.ok(data.offerings.every((item) => item.offering_type==="home_care" && !item.is_published));
});
test("B3 classification stays narrow and unknown regulatory fields remain null", () => {
  assert.ok(data.designations.every((item) => item.scheme==="vd_home_care_provider_class"
    && item.designation_code==="cms" && item.designation_status===null
    && item.issuing_organization_id===null && item.effective_on===null && !item.is_published));
});
test("B3 SQL requires exact B2, supports dry-run, and creates no enrichment", () => {
  const sql=buildBatchB3ApremadolApplySql({rollback:true});
  assert.match(sql,/providers\)<>82/); assert.match(sql,/slug='apremadol'/);
  assert.match(sql,/ROLLBACK;\s*$/); assert.match(sql,/Unpublished B3 data became public/);
  assert.doesNotMatch(sql,/INSERT INTO public\.provider_service_areas|INSERT INTO public\.care_offering_features|INSERT INTO public\.care_offering_availability/);
});
test("B3 rollback uses deterministic rows in reverse dependency order", () => {
  const sql=buildBatchB3ApremadolRollbackSql();
  const order=["care_offering_regulatory_designations","provider_identity_links",
    "care_offering_sources","care_offerings","provider_organizations","provider_sources","providers"];
  for(let i=1;i<order.length;i++) assert.ok(sql.indexOf(`DELETE FROM public.${order[i-1]}`)<sql.indexOf(`DELETE FROM public.${order[i]}`));
});
