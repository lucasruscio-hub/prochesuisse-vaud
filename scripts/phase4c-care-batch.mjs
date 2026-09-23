import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { providers } from "../lib/providers.js";
import { validateCarePacket } from "../lib/care-review-packet.mjs";
import { buildCareApplySql } from "../lib/care-review-apply.mjs";
import { inspectLegacyProviders } from "./ingest-legacy-providers.mjs";
import { LOCAL_CONFIRMATION, runLocalSql } from "../lib/local-provider-writer.mjs";

const root = new URL("../", import.meta.url);
const manifestUrl = new URL("../docs/research/phase4c-care-batch/batch.json", import.meta.url);
const expectedCandidates = ["ems-chateau-rive", "ems-clair-soleil", "ems-le-home", "ems-marronnier",
  "ems-signal", "ems-petit-flon", "ems-girarde", "ems-pre-fleuri"];
const providerIds = new Set(providers.map((provider) => provider.id));
const baselines = new Map(inspectLegacyProviders().rows.map((row) => [row.legacyId, row.provider]));

export function loadCareBatch() {
  return JSON.parse(readFileSync(manifestUrl, "utf8"));
}

export function validateCareBatch(manifest, readPacket = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"))) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.candidates)
    || !Array.isArray(manifest.packetPaths) || !Array.isArray(manifest.protectedExisting)
    || JSON.stringify(manifest.candidates.map((item) => item.slug)) !== JSON.stringify(expectedCandidates)
    || !manifest.protectedExisting.includes("ems-boveresses")) throw new Error("Invalid Phase 4C batch manifest");
  const candidates = new Map();
  for (const candidate of manifest.candidates) {
    if (!providerIds.has(candidate.slug) || candidates.has(candidate.slug)
      || !["evidence_missing_from_repo", "packet_ready_for_review", "packet_held"].includes(candidate.status)
      || !Array.isArray(candidate.repositoryMaterial) || !Array.isArray(candidate.supportedCareFacts)
      || !Array.isArray(candidate.proposedFacts) || !Array.isArray(candidate.deferred)
      || !Array.isArray(candidate.taxonomyMappings) || !Array.isArray(candidate.sourceNames)
      || !Array.isArray(candidate.unresolved) || typeof candidate.localApply !== "boolean") {
      throw new Error(`Invalid Phase 4C candidate: ${candidate?.slug ?? "unknown"}`);
    }
    if (candidate.repositoryMaterial.some((path) => !existsSync(new URL(path, root)))) {
      throw new Error(`Missing repository material for ${candidate.slug}`);
    }
    if (candidate.status === "evidence_missing_from_repo"
      && (candidate.localApply || candidate.supportedCareFacts.length || candidate.proposedFacts.length
        || candidate.taxonomyMappings.length || candidate.sourceNames.length || !candidate.unresolved.length)) {
      throw new Error(`Evidence-missing candidate contains importable claims: ${candidate.slug}`);
    }
    if (candidate.status === "packet_held" && (candidate.localApply || !candidate.unresolved.length)) {
      throw new Error(`Held candidate cannot be locally approved: ${candidate.slug}`);
    }
    candidates.set(candidate.slug, candidate);
  }
  const packets = new Map();
  for (const entry of manifest.packetPaths) {
    if (!entry || !candidates.has(entry.slug) || typeof entry.path !== "string" || packets.has(entry.slug)) {
      throw new Error("Invalid or duplicate care packet path");
    }
    const packet = readPacket(entry.path);
    const validation = validateCarePacket(packet);
    if (packet.identity.slug !== entry.slug
      || packet.approval.localApply !== candidates.get(entry.slug).localApply
      || candidates.get(entry.slug).status === "evidence_missing_from_repo"
      || (candidates.get(entry.slug).status === "packet_held") !== (validation.unresolvedCount > 0)
      || (validation.unresolvedCount > 0) !== (candidates.get(entry.slug).unresolved.length > 0)) {
      throw new Error(`Phase 4C packet approval/status mismatch: ${entry.slug}`);
    }
    packets.set(entry.slug, { path: entry.path, packet, validation });
  }
  for (const candidate of candidates.values()) {
    if ((candidate.status !== "evidence_missing_from_repo") !== packets.has(candidate.slug)) {
      throw new Error(`Candidate/packet status mismatch: ${candidate.slug}`);
    }
  }
  return { valid: true, candidates, packets,
    evidenceMissing: [...candidates.values()].filter((item) => item.status === "evidence_missing_from_repo"),
    readyForHumanReview: [...packets.values()].filter((item) => !item.packet.approval.localApply
      && item.validation.unresolvedCount === 0),
    approvedForLocalApply: [...packets.values()].filter((item) => item.validation.localApplyReady) };
}

export function selectApprovedPackets(manifest, slugs, readPacket) {
  const checked = validateCareBatch(manifest, readPacket);
  if (!slugs.length || new Set(slugs).size !== slugs.length) throw new Error("Select one or more unique provider slugs");
  return slugs.map((slug) => {
    if (manifest.protectedExisting.includes(slug)) throw new Error(`Existing care pilot is protected: ${slug}`);
    const entry = manifest.packetPaths.find((item) => item.slug === slug);
    if (!entry) throw new Error(`No reviewed care packet in this batch: ${slug}`);
    const packet = readPacket ? readPacket(entry.path) : JSON.parse(readFileSync(new URL(entry.path, root), "utf8"));
    const validation = validateCarePacket(packet);
    if (!validation.localApplyReady) throw new Error(`Care packet lacks human local-apply approval: ${slug}`);
    return { slug, packet, baseline: baselines.get(slug), validation, checked };
  });
}

export function main(args) {
  const manifest = loadCareBatch();
  if (args.length === 1 && ["--check-batch", "--dry-run"].includes(args[0])) {
    const checked = validateCareBatch(manifest);
    console.log(JSON.stringify({ mode: args[0].slice(2), databaseWrites: 0, batchId: manifest.batchId,
      candidates: checked.candidates.size, packetCount: checked.packets.size,
      readyForHumanReview: checked.readyForHumanReview.map((item) => item.packet.identity.slug),
      approvedForLocalApply: checked.approvedForLocalApply.map((item) => item.packet.identity.slug),
      evidenceMissingFromRepo: checked.evidenceMissing.map((item) => item.slug),
      protectedExisting: manifest.protectedExisting }, null, 2));
    return;
  }
  if (args[0] === "--plan-apply") {
    const selected = selectApprovedPackets(manifest, args.slice(1));
    console.log(JSON.stringify({ mode: "plan-apply", databaseWrites: 0,
      providers: selected.map((item) => item.slug) }, null, 2));
    return;
  }
  if (args[0] === "--write-local") {
    const confirmIndex = args.indexOf("--confirm");
    if (confirmIndex < 2 || confirmIndex !== args.length - 2 || args.at(-1) !== LOCAL_CONFIRMATION) {
      throw new Error(`Local batch writes require provider slugs followed by --confirm ${LOCAL_CONFIRMATION}`);
    }
    const selected = selectApprovedPackets(manifest, args.slice(1, confirmIndex));
    if (selected.length !== 1) throw new Error("Apply exactly one approved care packet at a time");
    const results = selected.map(({ packet, baseline }) => JSON.parse(runLocalSql(buildCareApplySql(packet, baseline)).trim()));
    console.log(JSON.stringify({ mode: "write-local", target: "verified-local-container", results }, null, 2));
    return;
  }
  throw new Error("Use --check-batch, --dry-run, --plan-apply <slugs>, or --write-local <slugs> --confirm Lia-vaud:local:54322");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
