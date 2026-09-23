import assert from "node:assert/strict";
import { buildBoveressesCareApplySql } from "../lib/care-review-apply.mjs";
import { LOCAL_CONFIRMATION, parseLocalArgs, runLocalSql } from "../lib/local-provider-writer.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { expectedProvider, reviewedPacket } from "./phase4b-care.mjs";
import { projectBoveressesCareDetail } from "../lib/provider-care-projection.js";

if (parseLocalArgs(process.argv.slice(2)).mode !== "--write-local") {
  throw new Error(`Rollback tests require --write-local --confirm ${LOCAL_CONFIRMATION}`);
}

const fingerprintSql = `SELECT jsonb_build_object(
  'providers',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.providers t),
  'providerSources',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.provider_sources t),
  'serviceAreas',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.provider_service_areas t),
  'municipalities',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.municipalities t),
  'organizations',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.organizations t),
  'relationships',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY provider_id,organization_id),'[]') FROM public.provider_organizations t),
  'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.care_offerings t),
  'features',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY offering_id,feature_kind,feature_code),'[]') FROM public.care_offering_features t),
  'offeringSources',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY offering_id,source_id),'[]') FROM public.care_offering_sources t),
  'availability',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.care_offering_availability t));`;
const snapshot = () => JSON.parse(runLocalSql(fingerprintSql).trim());
const before = snapshot();
const packet = reviewedPacket();
const sql = buildBoveressesCareApplySql(packet, expectedProvider, { rollback: true });
const existing = before.offerings.filter((offering) => offering.provider_id
  === before.providers.find((provider) => provider.slug === "ems-boveresses")?.id).length;

if (existing === 0) {
  const result = JSON.parse(runLocalSql(sql).trim());
  assert.equal(result.provider, "ems-boveresses");
  assert.equal(result.providerSourcesAdded, 0);
  assert.equal(result.features, 5);
  assert.equal(result.offeringSources, 2);
  assert.equal(result.published, false);
  assert.equal(result.verified, false);
  assert.deepEqual(snapshot(), before, "rollback apply changed the local database");

  const conflict = sql.replace("DO $apply$", "INSERT INTO public.organizations(slug,name) VALUES ('tertianum-vaud-sa','Conflict');\nDO $apply$");
  assert.throws(() => runLocalSql(conflict), /Existing reviewed care state requires reconciliation/);
  assert.deepEqual(snapshot(), before, "conflict test changed the local database");

  const unrelated = sql.replace("END $apply$;", "END $apply$;\nUPDATE public.providers SET name='Unsafe unrelated mutation' WHERE slug='ems-chateau-rive';");
  assert.throws(() => runLocalSql(unrelated), /Unrelated or existing data changed/);
  assert.deepEqual(snapshot(), before, "unrelated mutation test changed the local database");
} else {
  assert.equal(existing, 1, "unexpected Boveresses offering count");
  assert.throws(() => runLocalSql(sql), /Existing reviewed care state requires reconciliation/);
  const detailSnapshot = JSON.parse(runLocalSql(buildLocalProviderDetailSql("ems-boveresses")).trim());
  assert.ok(projectBoveressesCareDetail(detailSnapshot), "existing care projection is invalid");
  assert.deepEqual(snapshot(), before, "repeat rejection changed the local database");
}

console.log(JSON.stringify({ mode: "rollback-only", provider: "ems-boveresses",
  startingState: existing === 0 ? "pristine" : "already-applied",
  rollbackApplyPassed: existing === 0, repeatRejectedSafely: existing === 1,
  conflictRejected: true, unrelatedMutationRejected: existing === 0,
  localDatabaseUnchanged: true }, null, 2));
