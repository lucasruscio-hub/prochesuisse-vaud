import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildReviewApplySql } from "../lib/provider-review-apply.mjs";
import { normalizeResearchPacket, validateReviewPacket } from "../lib/provider-review-packet.mjs";
import { jsonSql, LOCAL_CONFIRMATION, runLocalSql } from "../lib/local-provider-writer.mjs";
import { buildPostIdentityBaseline, PHASE4E_IDENTITY_CORRECTION_SLUGS }
  from "../lib/phase4e-identity-corrections.mjs";
import { inspectLegacyProviders } from "./ingest-legacy-providers.mjs";

const root = new URL("../docs/research/phase4e-ems-closure/identity/", import.meta.url);
const manifestUrl = new URL("batch.json", root);
const baselines = new Map(inspectLegacyProviders().rows.map((row) => [row.legacyId, row.provider]));
const reviewUrl = (slug) => new URL(`${slug}.review.json`, root);
const canonicalUrl = (slug) => new URL(`canonical/${slug}.json`, root);

export function loadPhase4eIdentityManifest() {
  return JSON.parse(readFileSync(manifestUrl, "utf8"));
}

export function expectedPhase4eIdentityPacket(slug) {
  if (!PHASE4E_IDENTITY_CORRECTION_SLUGS.includes(slug)) throw new Error(`Unknown Phase 4E identity: ${slug}`);
  return normalizeResearchPacket(JSON.parse(readFileSync(reviewUrl(slug), "utf8")), baselines.get(slug));
}

export function checkedPhase4eIdentityPacket(slug) {
  const expected = expectedPhase4eIdentityPacket(slug);
  const packet = JSON.parse(readFileSync(canonicalUrl(slug), "utf8"));
  const compared = structuredClone(packet);
  compared.approval.localApply = false;
  if (JSON.stringify(compared) !== JSON.stringify(expected)) throw new Error(`Stale identity packet: ${slug}`);
  validateReviewPacket(packet, baselines.get(slug));
  return packet;
}

export function validatePhase4eIdentityBatch() {
  const manifest = loadPhase4eIdentityManifest();
  if (manifest.schemaVersion !== 1 || manifest.batchId !== "phase4e-identity-corrections"
    || JSON.stringify(manifest.providers) !== JSON.stringify(PHASE4E_IDENTITY_CORRECTION_SLUGS)
    || manifest.protectedProviders?.laurellesResidence !== "leave_untouched_pending_senior_residence_workflow"
    || !Array.isArray(manifest.corrections) || manifest.corrections.length !== 4) {
    throw new Error("Invalid Phase 4E identity manifest");
  }
  const packets = PHASE4E_IDENTITY_CORRECTION_SLUGS.map((slug) => {
    const entry = manifest.corrections.find((item) => item.slug === slug);
    if (!entry || entry.slugChange !== false || entry.publish !== false || entry.verify !== false
      || entry.localApply !== true || !Array.isArray(entry.workbookEvidence)
      || !entry.workbookEvidence.length || entry.workbookEvidence.some((cell) => !/^[^!]+![A-Z]+\d+(?::[A-Z]+\d+)?$/.test(cell))) {
      throw new Error(`Invalid Phase 4E identity manifest entry: ${slug}`);
    }
    const packet = checkedPhase4eIdentityPacket(slug);
    const postIdentityBaseline = buildPostIdentityBaseline(packet, baselines.get(slug));
    if (postIdentityBaseline.name !== entry.expected.name
      || postIdentityBaseline.locality !== entry.expected.locality
      || postIdentityBaseline.postal_code !== entry.expected.postalCode
      || `${postIdentityBaseline.locality} · ${postIdentityBaseline.postal_code}` !== entry.expected.displayAddress) {
      throw new Error(`Identity correction does not match approved result: ${slug}`);
    }
    buildReviewApplySql(packet, baselines.get(slug));
    return { slug, entry, packet, baseline: baselines.get(slug), postIdentityBaseline };
  });
  if (packets.some(({ packet }) => packet.identity.slug !== packet.identity.legacyId)) {
    throw new Error("Phase 4E identity correction attempted a slug change");
  }
  return { manifest, packets };
}

function describePlan({ slug, entry, packet, baseline, postIdentityBaseline }) {
  const writableClaims = packet.claims.filter((claim) => claim.target);
  return {
    slug, databaseWrites: 0,
    target: { legacyId: packet.identity.legacyId, slug: packet.identity.slug },
    expectedCurrent: { name: baseline.name, locality: baseline.locality, postalCode: baseline.postal_code,
      originalLocationText: baseline.original_location_text },
    update: { name: postIdentityBaseline.name, locality: postIdentityBaseline.locality,
      postalCode: postIdentityBaseline.postal_code,
      displayAddress: `${postIdentityBaseline.locality} · ${postIdentityBaseline.postal_code}` },
    writableFields: writableClaims.map((claim) => claim.target),
    slugChange: false, originalLocationTextAction: "preserve_unchanged",
    aliasAction: entry.aliasAction, duplicateAction: entry.duplicateAction,
    sourcesToCreate: [...new Map(writableClaims.map((claim) => [claim.evidence.url, claim.evidence])).values()],
    guards: ["exact legacy_id and stable slug", "exact current provider snapshot",
      "unpublished and unverified provider", "all unrelated providers unchanged",
      "all existing sources and service areas unchanged"],
    publish: false, verify: false,
  };
}

function readIdentityState(slug) {
  const sql = `BEGIN READ ONLY;
SELECT jsonb_build_object(
  'provider',(SELECT to_jsonb(p)-ARRAY['id','created_at','updated_at'] FROM public.providers p
    WHERE p.legacy_id=${jsonSql(slug)} #>> '{}' AND p.slug=${jsonSql(slug)} #>> '{}'),
  'sources',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['id','provider_id','created_at'] ORDER BY s.id),'[]')
    FROM public.provider_sources s JOIN public.providers p ON p.id=s.provider_id WHERE p.legacy_id=${jsonSql(slug)} #>> '{}'),
  'serviceAreas',(SELECT count(*) FROM public.provider_service_areas a JOIN public.providers p ON p.id=a.provider_id
    WHERE p.legacy_id=${jsonSql(slug)} #>> '{}'));
ROLLBACK;`;
  return JSON.parse(runLocalSql(sql).trim());
}

function verifyIdentityState(item, state, expected, expectedReviewedSources) {
  const sameProvider = state.provider && Object.keys(state.provider).length === Object.keys(expected).length
    && Object.keys(expected).every((key) => JSON.stringify(state.provider[key]) === JSON.stringify(expected[key]));
  if (!sameProvider) {
    throw new Error(`Provider row does not match the approved identity state: ${item.slug}`);
  }
  if (state.provider.slug !== item.slug || state.provider.original_location_text !== item.baseline.original_location_text
    || state.provider.is_published !== false || state.provider.verification_status !== "unverified"
    || state.provider.last_reviewed_at !== null || state.serviceAreas !== 0) {
    throw new Error(`Provider identity safety state is invalid: ${item.slug}`);
  }
  const legacy = state.sources.filter((source) => source.source_type === "legacy"
    && source.external_record_id === item.slug);
  if (legacy.length !== 1) throw new Error(`Legacy provenance mismatch: ${item.slug}`);
  for (const evidence of expectedReviewedSources) {
    const matches = state.sources.filter((source) => source.source_type === evidence.kind
      && source.source_name === evidence.name && source.source_url === evidence.url
      && source.external_record_id === evidence.url);
    if (matches.length !== 1) throw new Error(`Reviewed identity provenance mismatch: ${item.slug}`);
  }
  return { provider: state.provider, providerSources: state.sources.length,
    reviewedSources: expectedReviewedSources.length, serviceAreas: state.serviceAreas,
    slugUnchanged: true, originalLocationTextUnchanged: true, published: false, verified: false };
}

function reviewedWritableSources(packet) {
  return [...new Map(packet.claims.filter((claim) => claim.target)
    .map((claim) => [JSON.stringify(claim.evidence), claim.evidence])).values()];
}

export function main(args) {
  if (args.length === 1 && ["--check", "--write-canonical"].includes(args[0])) {
    if (args[0] === "--write-canonical") {
      for (const slug of PHASE4E_IDENTITY_CORRECTION_SLUGS) {
        const packet = expectedPhase4eIdentityPacket(slug);
        packet.approval.localApply = true;
        mkdirSync(dirname(fileURLToPath(canonicalUrl(slug))), { recursive: true });
        writeFileSync(canonicalUrl(slug), `${JSON.stringify(packet, null, 2)}\n`);
      }
    }
    const checked = validatePhase4eIdentityBatch();
    console.log(JSON.stringify({ mode: args[0].slice(2), databaseWrites: 0,
      providers: checked.packets.map(({ slug, packet }) => ({ slug,
        localApply: packet.approval.localApply, publish: false, verify: false })) }, null, 2));
    return;
  }
  if (args[0] === "--plan-apply") {
    const selected = args.slice(1);
    if (!selected.length || new Set(selected).size !== selected.length
      || selected.some((slug) => !PHASE4E_IDENTITY_CORRECTION_SLUGS.includes(slug))) {
      throw new Error("Select one or more unique Phase 4E identity slugs");
    }
    const checked = validatePhase4eIdentityBatch();
    console.log(JSON.stringify({ mode: "plan-apply", databaseWrites: 0,
      providers: selected.map((slug) => describePlan(checked.packets.find((item) => item.slug === slug))) }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === "--preflight-local") {
    const checked = validatePhase4eIdentityBatch();
    const providers = checked.packets.map((item) => {
      const state = readIdentityState(item.slug);
      const verification = verifyIdentityState(item, state, item.baseline, []);
      if (state.sources.length !== 1) throw new Error(`Identity correction already has reviewed sources: ${item.slug}`);
      return { slug: item.slug, ...verification };
    });
    console.log(JSON.stringify({ mode: "preflight-local", databaseWrites: 0,
      target: "verified-local-container", providers }, null, 2));
    return;
  }
  if (args.length === 4 && args[0] === "--write-local"
    && PHASE4E_IDENTITY_CORRECTION_SLUGS.includes(args[1])
    && args[2] === "--confirm" && args[3] === LOCAL_CONFIRMATION) {
    const checked = validatePhase4eIdentityBatch();
    const item = checked.packets.find(({ slug }) => slug === args[1]);
    const before = readIdentityState(item.slug);
    const preflight = verifyIdentityState(item, before, item.baseline, []);
    if (before.sources.length !== 1) throw new Error(`Identity correction already has reviewed sources: ${item.slug}`);
    const writeResult = JSON.parse(runLocalSql(buildReviewApplySql(item.packet, item.baseline)).trim());
    const after = readIdentityState(item.slug);
    const verification = verifyIdentityState(item, after, item.postIdentityBaseline,
      reviewedWritableSources(item.packet));
    console.log(JSON.stringify({ mode: "write-local", target: "verified-local-container",
      slug: item.slug, preflight, writeResult, verification, unrelatedMutationGuard: true }, null, 2));
    return;
  }
  throw new Error(`Use --write-canonical, --check, --plan-apply <slugs>, --preflight-local, or --write-local <slug> --confirm ${LOCAL_CONFIRMATION}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
