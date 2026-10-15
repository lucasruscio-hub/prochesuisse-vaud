import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { providers } from "../lib/providers.js";
import { searchProviders } from "../lib/provider-search.js";
import { SPECIAL_FILTERS, SERVICE_CODES, proposeLegacyServices } from "../lib/provider-config.js";
import { buildLegacyMappingRows, renderLegacyMappingReport } from "../scripts/generate-legacy-provider-report.mjs";
import { readFixtureState } from "./fixtures/public-provider-state.mjs";

// Next resolves this build-time boundary marker. Node's isolated unit harness
// substitutes ONLY the marker; the real repository implementation is unchanged.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { listProviders, getProviderBySlug } = await import("../lib/provider-repository.js");

test("repository exposes the exact canonical V1 manifest with stable UUIDs and slugs", async () => {
  const summaries = await listProviders({ readState: readFixtureState });
  assert.equal(summaries.length, 111);
  assert.equal(new Set(summaries.map((provider) => provider.id)).size, 111);
  assert.equal(new Set(summaries.map((provider) => provider.slug)).size, 111);
  for (const provider of summaries) assert.match(provider.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  const first = summaries[0];
  assert.deepEqual(await getProviderBySlug(first.slug, { readState: readFixtureState }), first);
  assert.equal(await getProviderBySlug("missing-provider", { readState: readFixtureState }), null);
  assert.equal(await getProviderBySlug(null, { readState: readFixtureState }), null);
});

test("search uses canonical names, locations, postcodes and badges without legacy tags", async () => {
  const summaries = await listProviders({ readState: readFixtureState });
  assert.ok(searchProviders(summaries, "Lausanne", "ems").length > 0);
  assert.ok(searchProviders(summaries, "1000", "domicile").length > 0);
  assert.deepEqual(searchProviders(summaries, "no-match", "residence"), []);
  assert.deepEqual(SPECIAL_FILTERS, ["Alzheimer", "Court séjour", "Vue lac", "Public"]);
});

test("mapping report preserves original data and does not silently infer broad-tag services", () => {
  const rows = buildLegacyMappingRows();
  assert.equal(rows.length, 66);
  rows.forEach((row, index) => {
    assert.equal(row.legacyId, providers[index].id);
    assert.deepEqual(row.originalTags, providers[index].tags);
    assert.equal(row.originalLocationText, providers[index].address);
    assert.ok(row.concerns.length > 0);
    row.proposedServiceCodes.forEach((code) => assert.ok(Object.hasOwn(SERVICE_CODES, code)));
  });
  const ambiguous = ["Bilingue", "Public", "LAMal", "Spitex", "CMS", "OSAD", "HAD", "Soins", "24h/24", "Tout Vaud", "LADA"];
  assert.deepEqual(proposeLegacyServices(ambiguous), { proposedServiceCodes: [], unmappedTags: ambiguous });
  assert.deepEqual(proposeLegacyServices(["Alzheimer", "Démence"]).proposedServiceCodes, ["dementia_support"]);
  assert.equal(readFileSync(new URL("../docs/legacy-provider-mapping.md", import.meta.url), "utf8"), renderLegacyMappingReport());
});

test("app code never directly imports the legacy data or privileged Supabase client for discovery", () => {
  function walk(url) {
    for (const entry of readdirSync(url, { withFileTypes: true })) {
      const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), url);
      if (entry.isDirectory()) walk(child);
      else if (/\.js$/.test(entry.name)) {
        const source = readFileSync(child, "utf8");
        assert.doesNotMatch(source, /from\s+["'][^"']*\/providers(?:\.js)?["']/);
      }
    }
  }
  walk(new URL("../app/", import.meta.url));
  const repository = readFileSync(new URL("../lib/provider-repository.js", import.meta.url), "utf8");
  assert.match(repository, /import "server-only"/);
  assert.doesNotMatch(repository, /from\s+["'][^"']*supabase/);
});

test("migration remains schema-only and never changes existing leads or schema-wide grants", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260920000100_provider_foundation.sql", import.meta.url), "utf8").replace(/--[^\n]*/g, "");
  assert.doesNotMatch(sql, /\bleads\b|\bINSERT\s+INTO\b|\bCOPY\b|\bALTER\s+DEFAULT\s+PRIVILEGES\b|\bON\s+ALL\s+TABLES\b/i);
  const tables = [...sql.matchAll(/CREATE TABLE public\.(\w+)/g)].map((m) => m[1]);
  assert.deepEqual(tables.sort(), ["municipalities", "provider_service_areas", "provider_sources", "providers"]);
  for (const table of tables) assert.ok(sql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`));
  assert.match(sql, /is_published boolean NOT NULL DEFAULT false/);
  assert.doesNotMatch(sql, /CREATE POLICY[^;]*FOR (INSERT|UPDATE|DELETE|ALL)/i);
  assert.doesNotMatch(sql, /CREATE POLICY[^;]*ON public\.provider_sources/i);
  // Static guards only: these do not replace execution of RLS/constraint tests.
});
