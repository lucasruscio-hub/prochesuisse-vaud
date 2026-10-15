import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { readCanonicalProviderState } = await import("../lib/canonical-provider-source.js");

test("canonical source performs only explicit server-side selects", async () => {
  const calls = [];
  const client = { from(table) { return { async select(columns) {
    calls.push({ table, columns }); return { data: [{ table }], error: null };
  } }; } };
  const state = await readCanonicalProviderState(client);
  assert.equal(calls.length, 9);
  assert.deepEqual(calls.map(({ table }) => table), ["providers", "provider_sources", "care_offerings",
    "care_offering_sources", "care_offering_features", "provider_service_areas",
    "provider_organizations", "organizations", "provider_identity_links"]);
  assert.ok(calls.every(({ columns }) => !/(^|,)notes(,|$)|source_url/.test(columns)));
  assert.deepEqual(state.providers, [{ table: "providers" }]);
});

test("canonical source fails closed when any table read fails", async () => {
  const client = { from(table) { return { async select() {
    return table === "care_offerings" ? { data: null, error: { message: "offline" } }
      : { data: [], error: null };
  } }; } };
  await assert.rejects(() => readCanonicalProviderState(client), /care_offerings: offline/);
});
