import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectLegacyProviders } from "./ingest-legacy-providers.mjs";
import { normalizeResearchPacket } from "../lib/provider-review-packet.mjs";
import { buildReviewApplySql } from "../lib/provider-review-apply.mjs";
import { LOCAL_CONFIRMATION, parseLocalArgs, runLocalSql } from "../lib/local-provider-writer.mjs";

if (parseLocalArgs(process.argv.slice(2)).mode !== "--write-local") {
  throw new Error(`Rollback tests require --write-local --confirm ${LOCAL_CONFIRMATION}`);
}
const baselines = new Map(inspectLegacyProviders().rows.map((row) => [row.legacyId, row.provider]));
const packet = (id) => {
  const raw = JSON.parse(readFileSync(new URL(`../docs/research/phase3b-pilots/${id}.review.json`, import.meta.url), "utf8"));
  const normalized = normalizeResearchPacket(raw, baselines.get(id));
  normalized.approval.localApply = true; // Only this test's in-memory copy; transaction always rolls back.
  return normalized;
};
const fingerprintSql = `SELECT jsonb_build_object(
  'providers',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY id),'[]') FROM public.providers p),
  'sources',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY id),'[]') FROM public.provider_sources s),
  'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY id),'[]') FROM public.provider_service_areas a),
  'municipalities',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY id),'[]') FROM public.municipalities m),
  'leadsExists',to_regclass('public.leads') IS NOT NULL);`;
const snapshot = () => JSON.parse(runLocalSql(fingerprintSql).trim());
const before = snapshot();
assert.equal(before.providers.length, 66, "Expected the existing local legacy batch");
const outcomes = [];
const withoutDatabaseFields = (row) => Object.fromEntries(Object.entries(row)
  .filter(([key]) => !["id", "created_at", "updated_at"].includes(key)));
try {
  for (const [id, sources] of [["ems-boveresses", 2], ["senevita-vaud", 1]]) {
    const sql = buildReviewApplySql(packet(id), baselines.get(id), { rollback: true });
    const current = before.providers.find((provider) => provider.legacy_id === id);
    assert.ok(current, `${id}: provider missing`);
    const sourceCount = before.sources.filter((source) => source.provider_id === current.id).length;
    const approvedPatch = Object.fromEntries(packet(id).claims.filter((claim) => claim.target)
      .map((claim) => [claim.target, claim.value]));
    const pristine = sourceCount === 1;
    assert.deepEqual(withoutDatabaseFields(current),
      pristine ? baselines.get(id) : { ...baselines.get(id), ...approvedPatch }, `${id}: unexpected local state`);
    if (pristine) {
      const result = JSON.parse(runLocalSql(sql).trim());
      assert.equal(result.sourcesAdded, sources);
      assert.equal(result.published, false);
      assert.equal(result.verified, false);
    } else {
      assert.equal(sourceCount, sources + 1, `${id}: unexpected source count`);
      assert.throws(() => runLocalSql(sql), /Provider identity or reviewed-state conflict/);
    }
    assert.deepEqual(snapshot(), before, `${id}: rollback changed local state`);
    outcomes.push({ id, state: pristine ? "pristine" : "already-applied", rollbackPassed: true,
      proposedSources: sources, deferredClaims: packet(id).claims.filter((claim) => !claim.target).length });
  }
  const base = buildReviewApplySql(packet("ems-boveresses"), baselines.get("ems-boveresses"), { rollback: true });
  if (outcomes[0].state === "pristine") {
    const conflict = base.replace("DO $apply$", "UPDATE public.providers SET name = 'Conflicting local edit' WHERE legacy_id = 'ems-boveresses';\nDO $apply$");
    assert.throws(() => runLocalSql(conflict), /Provider identity or reviewed-state conflict/);
    assert.deepEqual(snapshot(), before);
    const trigger = `CREATE FUNCTION pg_temp.phase3b_mutate_other() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN UPDATE public.providers SET name = 'Unexpected other mutation' WHERE legacy_id = 'ems-chateau-rive'; RETURN NEW; END $$;
    CREATE TRIGGER phase3b_unrelated AFTER UPDATE ON public.providers FOR EACH ROW
      WHEN (NEW.legacy_id = 'ems-boveresses') EXECUTE FUNCTION pg_temp.phase3b_mutate_other();\n`;
    assert.throws(() => runLocalSql(base.replace("DO $apply$", () => trigger + "DO $apply$")), /Unrelated provider, source or coverage changed/);
    assert.deepEqual(snapshot(), before);
  }
} finally {
  assert.deepEqual(snapshot(), before, "Local provider database changed");
}
console.log(JSON.stringify({ mode: "rollback-only", databaseWrites: 0, pilots: outcomes,
  identityConflictRejected: true, unrelatedProviderMutationTested: outcomes[0].state === "pristine",
  localDatabaseUnchanged: true }, null, 2));
