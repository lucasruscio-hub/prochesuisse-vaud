import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { providers } from "../lib/providers.js";
import { buildCarePacketFromEvidence, CARE_EVIDENCE_WORKBOOK,
  ALL_PHASE4C_EVIDENCE_SLUGS, PHASE4C_BATCH_2_EVIDENCE_SLUGS,
  readProviderCareEvidence,
  validateProviderCareEvidence } from "../lib/provider-care-evidence.mjs";

const workbookUrl = new URL(`../${CARE_EVIDENCE_WORKBOOK}`, import.meta.url);
const evidenceUrl = (slug) => new URL(`../docs/research/provider-evidence/${slug}.json`, import.meta.url);
const canonicalUrl = (slug) => new URL(PHASE4C_BATCH_2_EVIDENCE_SLUGS.includes(slug)
  ? `../docs/research/phase4c-care-batch-02/canonical/${slug}-care.json`
  : `../docs/research/phase4c-care-batch/canonical/${slug}-care.json`, import.meta.url);
const providerBySlug = new Map(providers.map((provider) => [provider.id, provider]));

function importableFactCount(packet) {
  return packet.organizations.length + packet.offerings.reduce((count, offering) => count + 1
    + (offering.capacity ? 1 : 0)
    + Object.values(offering.stayModes).filter(Boolean).length
    + offering.features.length
    + [offering.admissions, offering.financing, offering.publicInterestStatus, offering.pricing].filter(Boolean).length, 0);
}

export function buildPhase4cEvidenceSet() {
  if (!existsSync(workbookUrl)) throw new Error("Phase 4C.1 source workbook is missing");
  const workbookBytes = readFileSync(workbookUrl);
  return ALL_PHASE4C_EVIDENCE_SLUGS.map((slug) => {
    const value = readProviderCareEvidence(evidenceUrl(slug));
    const checked = validateProviderCareEvidence(value, { workbookBytes });
    const repository = providerBySlug.get(slug);
    if (!repository || repository.name !== value.provider.repositoryName
      || repository.type !== value.provider.primaryType) throw new Error(`Repository identity mismatch: ${slug}`);
    const packet = buildCarePacketFromEvidence(value, { workbookBytes });
    return { slug, value, packet, checked, importableFactCount: importableFactCount(packet),
      evidencePath: fileURLToPath(evidenceUrl(slug)), canonicalPath: fileURLToPath(canonicalUrl(slug)) };
  });
}

export function main(args) {
  if (args.length !== 1 || !["--check", "--write-canonical"].includes(args[0])) {
    throw new Error("Use --check or --write-canonical; this command never accesses a database");
  }
  const entries = buildPhase4cEvidenceSet();
  if (args[0] === "--write-canonical") {
    for (const entry of entries) {
      mkdirSync(dirname(entry.canonicalPath), { recursive: true });
      writeFileSync(entry.canonicalPath, `${JSON.stringify(entry.packet, null, 2)}\n`);
    }
  } else {
    for (const entry of entries) {
      if (!existsSync(entry.canonicalPath)) throw new Error(`Missing canonical packet: ${entry.slug}`);
      const stored = JSON.parse(readFileSync(entry.canonicalPath, "utf8"));
      if (JSON.stringify(stored) !== JSON.stringify(entry.packet)) {
        throw new Error(`Canonical packet is stale: ${entry.slug}`);
      }
    }
  }
  console.log(JSON.stringify({ mode: args[0].slice(2), databaseWrites: 0,
    workbook: CARE_EVIDENCE_WORKBOOK,
    providers: entries.map((entry) => ({ slug: entry.slug, identity: entry.value.identity.status,
      reviewStatus: entry.value.review.status, localApply: entry.packet.approval.localApply,
      importableFacts: entry.importableFactCount, deferredFacts: entry.packet.deferred.length,
      unresolvedIssues: entry.packet.unresolved.length })) }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
