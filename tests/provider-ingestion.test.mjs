import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { providers } from "../lib/providers.js";
import { inspectProviderDataset, transformProviderDataset } from "../lib/provider-ingestion.mjs";
import { buildLegacyMappingRows } from "../scripts/generate-legacy-provider-report.mjs";
import { inspectLegacyProviders, renderIngestionReport } from "../scripts/ingest-legacy-providers.mjs";

const options = { source: { type: "legacy", name: "Test source" } };
const minimal = { id: "test-provider", name: " Unchanged name ", type: "ems" };

test("all 66 records preserve exact legacy values and category totals", () => {
  const result = inspectLegacyProviders();
  assert.equal(result.summary.totalSourceRecords, 66);
  assert.equal(result.summary.validRecords, 66);
  assert.equal(result.summary.rejectedRecords, 0);
  assert.deepEqual(result.summary.countsByCategory, { ems: 46, domicile: 12, residence: 8, unknown: 0 });
  for (const [i, row] of result.rows.entries()) {
    const original = providers[i];
    const p = row.provider;
    assert.equal(p.legacy_id, original.id);
    assert.equal(p.slug, original.id);
    assert.equal(p.name, original.name);
    assert.equal(p.primary_type, original.type);
    assert.equal(p.locality, original.commune);
    assert.equal(p.postal_code, original.npa);
    assert.equal(p.original_location_text, original.address);
    assert.deepEqual(p.original_tags, original.tags);
    assert.equal(row.verificationRequired, true);
    assert.equal(p.last_reviewed_at, null);
    assert.equal(p.status, "active");
    assert.equal(p.is_published, false);
    assert.equal(p.verification_status, "unverified");
    assert.equal(p.canton_code, null);
    assert.equal(p.municipality_id, null);
    assert.deepEqual(p.service_codes, []);
    assert.deepEqual(p.language_codes, []);
    assert.deepEqual(p.attributes, {});
    assert.deepEqual(row.serviceAreas, []);
    assert.equal(row.source.source_type, "legacy");
    assert.match(row.source.source_name, /Lia legacy static/);
    assert.equal(row.source.external_record_id, original.id);
    assert.equal(row.source.source_url, null);
    assert.equal(row.source.reviewed_at, null);
    assert.equal(row.source.retrieved_at, null);
  }
});

test("missing facts stay unknown; supplied untrusted enrichment cannot change defaults", () => {
  const [{ provider, serviceAreas }] = transformProviderDataset([{ ...minimal,
    is_published: true, verification_status: "verified", service_codes: ["nursing"],
    latitude: 46, longitude: 6, language_codes: ["fr"], price: 100, operating: true,
  }], options);
  for (const key of ["postal_code", "locality", "original_location_text", "street", "house_number",
    "latitude", "longitude", "phone", "email", "website", "description", "last_reviewed_at", "canton_code", "municipality_id"]) {
    assert.equal(provider[key], null, key);
  }
  for (const key of ["original_tags", "subtypes", "service_codes", "language_codes"]) assert.deepEqual(provider[key], []);
  assert.deepEqual(provider.attributes, {});
  assert.equal(provider.name, minimal.name);
  assert.equal(provider.is_published, false);
  assert.equal(provider.verification_status, "unverified");
  assert.deepEqual(serviceAreas, []);
});

test("unknown/missing types, missing names, malformed fields are rejected without partial strict output", () => {
  for (const patch of [{ type: "spitex" }, { type: null }, { type: "toString" },
    { name: " " }, { id: null }, { slug: "Bad Slug" }, { npa: 1000 },
    { tags: "Public" }, { tags: [1] }, { canton_code: "XX" }]) {
    const input = [{ ...minimal, ...patch }];
    const inspected = inspectProviderDataset(input, options);
    assert.equal(inspected.summary.rejectedRecords, 1);
    assert.equal(inspected.rows[0].provider, null);
    assert.throws(() => transformProviderDataset(input, options), /Provider ingestion rejected/);
  }
  const bad = inspectProviderDataset([{ ...minimal, name: null, type: null }], options);
  assert.deepEqual(bad.summary.missingNames, [0]);
  assert.deepEqual(bad.summary.missingOrInvalidTypes, [0]);
  assert.equal(inspectProviderDataset([null], options).summary.rejectedRecords, 1);
});

test("all duplicate ID/slug occurrences are rejected independently; identities never merge", () => {
  const ids = inspectProviderDataset([minimal, { ...minimal, slug: "other-slug" }], options);
  assert.deepEqual(ids.summary.duplicateLegacyIds, [{ value: minimal.id, indices: [0, 1] }]);
  assert.equal(ids.summary.rejectedRecords, 2);
  assert.deepEqual(ids.summary.duplicateSlugs, []);
  const slugs = inspectProviderDataset([{ ...minimal, slug: "shared" }, { ...minimal, id: "another", slug: "shared" }], options);
  assert.deepEqual(slugs.summary.duplicateSlugs, [{ value: "shared", indices: [0, 1] }]);
  assert.deepEqual(slugs.summary.duplicateLegacyIds, []);
  assert.equal(slugs.summary.rejectedRecords, 2);
  assert.equal(transformProviderDataset([minimal, { ...minimal, id: "another" }], options).length, 2);
});

test("deterministic output with no input mutation or shared tag arrays", () => {
  const before = JSON.stringify(providers);
  assert.deepEqual(inspectLegacyProviders(), inspectLegacyProviders());
  assert.deepEqual(transformProviderDataset(providers, options), transformProviderDataset(providers, options));
  const result = transformProviderDataset(providers, options);
  result[0].provider.original_tags.push("mutation");
  assert.equal(JSON.stringify(providers), before);
});

test("the same pipeline accepts Swiss canton adapters without guessing missing canton", () => {
  for (const canton of ["VD", "GE", "ZH", "TI", "GR"]) {
    const [row] = transformProviderDataset([{ ...minimal, canton_code: canton }], options);
    assert.equal(row.provider.canton_code, canton);
    assert.equal(row.provider.country_code, "CH");
    assert.equal(row.provider.municipality_id, null);
  }
  assert.throws(() => inspectProviderDataset([minimal]), /source/);
});

test("review report preserves every existing concern and stays reproducible", () => {
  const result = inspectLegacyProviders();
  const mapping = buildLegacyMappingRows();
  const specialCount = mapping.filter((row) => row.specialReviewConcerns.length > 0).length;
  assert.equal(result.summary.recordsRequiringVerification, 66);
  assert.equal(result.summary.recordsNeedingSpecialReview, specialCount);
  assert.equal(result.summary.recordsNeedingManualReview, specialCount);
  assert.ok(specialCount > 0 && specialCount < 66);
  for (const [index, row] of result.rows.entries()) {
    assert.deepEqual(row.specialReviewConcerns, mapping[index].specialReviewConcerns);
    assert.equal(row.needsSpecialReview, row.specialReviewConcerns.length > 0);
    assert.equal(row.needsManualReview, row.needsSpecialReview);
    for (const concern of mapping[index].concerns) assert.ok(row.concerns.includes(concern));
  }
  for (const id of ["ems-pre-pariset", "cerisiers-morges", "village-senior-crissier"]) {
    const row = result.rows.find((row) => row.legacyId === id);
    assert.equal(row.needsSpecialReview, false, id);
    assert.equal(row.verificationRequired, true);
  }
  for (const id of ["avasad-cms", "pro-senectute", "senevita-vaud", "alterimo", "netage",
    "epsm-borde", "epsm-collonges", "epsm-rouvraie", "ems-laurelles-vevey", "laurelles-residence", "ems-odysse", "ems-arcades", "homeinstead", "dovida", "ems-grand-pre", "ems-valency", "swisscaring"]) {
    const row = result.rows.find((row) => row.legacyId === id);
    assert.ok(row.needsSpecialReview, id);
    assert.ok(row.needsManualReview);
    assert.ok(row.concerns.length >= 4, id);
  }
  assert.equal(readFileSync(new URL("../docs/legacy-provider-ingestion-review.md", import.meta.url), "utf8"), renderIngestionReport());
});

test("CLI defaults to dry-run and refuses import/target arguments even with a remote URL in environment", () => {
  const run = (args) => spawnSync(process.execPath, ["scripts/ingest-legacy-providers.mjs", ...args], {
    encoding: "utf8", cwd: new URL("../", import.meta.url),
    env: { ...process.env, SUPABASE_URL: "https://example.supabase.co" },
  });
  const normal = run([]);
  assert.equal(normal.status, 0, normal.stderr);
  assert.equal(JSON.parse(normal.stdout).mode, "dry-run");
  assert.equal(JSON.parse(normal.stdout).databaseWrites, 0);
  for (const args of [["--import"], ["--url", "http://127.0.0.1:54321"], ["--write-report", "--check-report"]]) {
    assert.notEqual(run(args).status, 0);
  }
});

test("review classification depends on structured concerns, never note wording or missing canton", () => {
  const note = "Identity and physical address unverified; name/locality/NPA alone do not establish a unique site.";
  const inspect = (review) => inspectProviderDataset([minimal], {
    ...options, reviewNotes: { [minimal.id]: review },
  });
  const baseline = inspect({ verificationNotes: [note, "Investigate operator ambiguity"], specialReviewConcerns: [] });
  assert.equal(baseline.rows[0].needsSpecialReview, false);
  assert.equal(baseline.summary.recordsRequiringVerification, 1);
  const special = inspect({ verificationNotes: [], specialReviewConcerns: [note] });
  assert.equal(special.rows[0].needsSpecialReview, true);
  assert.equal(special.summary.recordsNeedingSpecialReview, 1);
  assert.equal(inspectProviderDataset([minimal], options).rows[0].needsSpecialReview, false);
});
