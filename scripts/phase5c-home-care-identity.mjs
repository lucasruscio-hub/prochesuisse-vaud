import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeIdentityResearch, validateCanonicalIdentityPacket }
  from "../lib/home-care-identity-review.mjs";
import { inspectLegacyProviders } from "./ingest-legacy-providers.mjs";

const root = new URL("../docs/research/phase5c-home-care-identities/", import.meta.url);
const manifestUrl = new URL("batch.json", root);
const reviewUrl = (slug) => new URL(`${slug}.review.json`, root);
const canonicalUrl = (slug) => new URL(`canonical/${slug}.json`, root);
const baselines = new Map(inspectLegacyProviders().rows.map((row) => [row.legacyId, row.provider]));

export function loadPhase5cManifest() {
  return JSON.parse(readFileSync(manifestUrl, "utf8"));
}

export function expectedPhase5cPacket(slug) {
  return normalizeIdentityResearch(JSON.parse(readFileSync(reviewUrl(slug), "utf8")), baselines.get(slug));
}

export function validatePhase5cIdentityBatch() {
  const manifest = loadPhase5cManifest();
  if (manifest.schemaVersion !== 1 || manifest.batchId !== "phase5c-home-care-identity-resolution"
    || manifest.accessedOn !== "2026-09-27" || !Array.isArray(manifest.providers)
    || JSON.stringify(manifest.providers) !== JSON.stringify(["senevita-vaud", "pro-senectute", "avasad-cms", "dovida"])
    || Object.values(manifest.safety).some((value) => value !== false && value !== 0)) {
    throw new Error("Invalid Phase 5C identity manifest");
  }
  const packets = manifest.providers.map((slug) => {
    const expected = expectedPhase5cPacket(slug);
    const canonical = JSON.parse(readFileSync(canonicalUrl(slug), "utf8"));
    if (JSON.stringify(canonical) !== JSON.stringify(expected)) throw new Error(`Stale Phase 5C packet: ${slug}`);
    const result = validateCanonicalIdentityPacket(canonical, baselines.get(slug));
    return { slug, result, packet: canonical };
  });
  return { manifest, packets };
}

export function main(args) {
  if (args.length !== 1 || !["--write-canonical", "--check"].includes(args[0])) {
    throw new Error("Use --write-canonical or --check");
  }
  if (args[0] === "--write-canonical") {
    for (const slug of loadPhase5cManifest().providers) {
      const destination = canonicalUrl(slug);
      mkdirSync(dirname(fileURLToPath(destination)), { recursive: true });
      writeFileSync(destination, `${JSON.stringify(expectedPhase5cPacket(slug), null, 2)}\n`);
    }
  }
  const checked = validatePhase5cIdentityBatch();
  console.log(JSON.stringify({ mode: args[0].slice(2), databaseWrites: 0,
    providers: checked.packets.map(({ slug, result, packet }) => ({
      slug, sources: result.sourceCount, conclusions: result.conclusionCount,
      localApply: packet.approval.localApply, publish: packet.approval.publish,
      verify: packet.approval.verify, recommendedActions: packet.recommendation.actions,
    })) }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
