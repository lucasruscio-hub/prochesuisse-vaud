import test from "node:test";
import assert from "node:assert/strict";
import { buildBatchAApplySql, buildBatchARollbackSql, compileBatchA }
  from "../lib/phase5f-batch-a.mjs";

const data = compileBatchA();

test("Batch A compiles exactly the manifest's 24 net-new rows", () => {
  assert.equal(data.organizations.length, 8);
  assert.equal(data.organizationSources.length, 8);
  assert.equal(data.relationships.length, 7);
  assert.equal(data.batch.expectedNetNewRows, 24);
  assert.deepEqual(data.organizations.map((item) => item.name), [
    "AVASAD", "Fondation Soins Lausanne", "APROMAD", "APREMADOL",
    "ASANTE SANA", "ABSMAD", "Fondation de La Côte", "ASPMAD",
  ]);
});

test("unknown legal names stay null and only supported FSL legal identity is populated", () => {
  const legalNames = Object.fromEntries(data.organizations.map((item) => [item.slug, item.legal_name]));
  assert.equal(legalNames["fondation-soins-lausanne"], "Fondation Soins Lausanne");
  for (const [slug, value] of Object.entries(legalNames)) {
    if (slug !== "fondation-soins-lausanne") assert.equal(value, null, slug);
  }
  assert.ok(data.organizations.every((item) => item.website === null));
});

test("network membership is sourced by the member and never modeled as ownership", () => {
  const avasad = data.organizations.find((item) => item.slug === "avasad");
  assert.ok(data.relationships.every((item) => item.parent_organization_id === avasad.id));
  assert.ok(data.relationships.every((item) => item.relationship_type === "network_member"));
  assert.ok(data.relationships.every((item) => item.evidence_organization_id === item.member_organization_id));
  assert.ok(data.relationships.every((item) => data.organizationSources.some((source) =>
    source.organization_id === item.evidence_organization_id && source.id === item.source_id)));
});

test("guarded apply is local-baseline scoped, non-publishing, and rollback capable", () => {
  const dryRun = buildBatchAApplySql({ rollback: true });
  assert.match(dryRun, /count\(\*\) FROM public\.providers\) <> 66/);
  assert.match(dryRun, /slug='avasad-cms'/);
  assert.match(dryRun, /status='archived'/);
  assert.match(dryRun, /relationship_type<>'network_member'/);
  assert.match(dryRun, /Unpublished Batch A identities became public/);
  assert.match(dryRun, /ROLLBACK;\s*$/);
  assert.doesNotMatch(dryRun, /INSERT INTO public\.care_offerings|INSERT INTO public\.provider_organizations/);
});

test("rollback deletes only deterministic Batch A rows and restores the serialized provider before-image", () => {
  const sql = buildBatchARollbackSql({ id: "14b8abc0-33da-4b2e-9ebb-7a2046024c0f",
    slug: "avasad-cms", status: "active", is_published: false,
    updated_at: "2026-09-21T08:23:54.766516+00:00" });
  assert.match(sql, /DELETE FROM public\.organization_relationships/);
  assert.match(sql, /DELETE FROM public\.organization_sources/);
  assert.match(sql, /DELETE FROM public\.organizations/);
  assert.match(sql, /DELETE FROM public\.provider_sources/);
  assert.match(sql, /session_replication_role = replica/);
  assert.match(sql, /WHERE id=.*::uuid AND slug='avasad-cms'/s);
});
