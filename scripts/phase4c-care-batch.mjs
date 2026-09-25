import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { providers } from "../lib/providers.js";
import { validateCarePacket } from "../lib/care-review-packet.mjs";
import { buildCareApplySql } from "../lib/care-review-apply.mjs";
import { inspectLegacyProviders } from "./ingest-legacy-providers.mjs";
import { LOCAL_CONFIRMATION, runLocalSql } from "../lib/local-provider-writer.mjs";

const root = new URL("../", import.meta.url);
const DEFAULT_BATCH_ID = "phase4c-care-pilot-01";
const BATCH_2_ID = "phase4c-care-batch-02";
const batchDefinitions = Object.freeze({
  [DEFAULT_BATCH_ID]: {
    manifestUrl: new URL("../docs/research/phase4c-care-batch/batch.json", import.meta.url),
    expectedCandidates: ["ems-chateau-rive", "ems-clair-soleil", "ems-le-home", "ems-signal", "ems-girarde"],
    protectedExisting: ["ems-boveresses"],
  },
  [BATCH_2_ID]: {
    manifestUrl: new URL("../docs/research/phase4c-care-batch-02/batch.json", import.meta.url),
    expectedCandidates: ["ems-marronnier", "ems-petit-flon", "ems-pre-fleuri", "ems-praz-joret",
      "ems-sauvabelin", "ems-mauri", "ems-pins", "ems-jardins-leman"],
    protectedExisting: ["ems-boveresses", "ems-chateau-rive", "ems-clair-soleil", "ems-le-home",
      "ems-girarde", "ems-signal"],
  },
});
const providerIds = new Set(providers.map((provider) => provider.id));
const baselines = new Map(inspectLegacyProviders().rows.map((row) => [row.legacyId, row.provider]));

export function loadCareBatch(batchId = DEFAULT_BATCH_ID) {
  const definition = batchDefinitions[batchId];
  if (!definition) throw new Error(`Unknown Phase 4C batch: ${batchId}`);
  return JSON.parse(readFileSync(definition.manifestUrl, "utf8"));
}

export function validateCareBatch(manifest, readPacket = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"))) {
  const definition = batchDefinitions[manifest?.batchId];
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.candidates)
    || !Array.isArray(manifest.packetPaths) || !Array.isArray(manifest.protectedExisting)
    || !definition
    || JSON.stringify(manifest.candidates.map((item) => item.slug)) !== JSON.stringify(definition.expectedCandidates)
    || definition.protectedExisting.some((slug) => !manifest.protectedExisting.includes(slug))) {
    throw new Error("Invalid Phase 4C batch manifest");
  }
  const candidates = new Map();
  for (const candidate of manifest.candidates) {
    if (!providerIds.has(candidate.slug) || candidates.has(candidate.slug)
      || !["evidence_missing_from_repo", "packet_ready_for_review", "packet_approved_for_local_apply", "packet_held"].includes(candidate.status)
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
    if (candidate.localApply !== (candidate.status === "packet_approved_for_local_apply")) {
      throw new Error(`Candidate local-apply gate does not match review status: ${candidate.slug}`);
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
    heldPackets: [...packets.values()].filter((item) => item.validation.unresolvedCount > 0),
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

export function describeCareApplyPlan({ slug, packet }) {
  const sourceUses = new Map();
  const recordSourceUse = (evidence, use) => {
    const key = `${evidence.kind}\u0000${evidence.name}\u0000${evidence.url}\u0000${evidence.accessedOn}`;
    if (!sourceUses.has(key)) sourceUses.set(key, { action: "create_or_reuse_exact_provider_source",
      kind: evidence.kind, name: evidence.name, url: evidence.url, accessedOn: evidence.accessedOn, uses: [] });
    sourceUses.get(key).uses.push({ ...use, researchField: evidence.researchField });
  };
  for (const organization of packet.organizations) {
    recordSourceUse(organization.evidence, { scope: "organization", field: "operator", slug: organization.slug });
  }
  for (const offering of packet.offerings) {
    recordSourceUse(offering.typeEvidence, { scope: "offering", offering: offering.slug, field: "offering_type" });
    if (offering.capacity) recordSourceUse(offering.capacity.evidence,
      { scope: "offering", offering: offering.slug, field: "capacity" });
    for (const [field, fact] of Object.entries(offering.stayModes)) {
      if (fact) recordSourceUse(fact.evidence, { scope: "offering", offering: offering.slug, field });
    }
    for (const feature of offering.features) recordSourceUse(feature.evidence,
      { scope: "offering_feature", offering: offering.slug, field: `${feature.kind}.${feature.code}` });
    for (const field of ["admissions", "financing", "publicInterestStatus", "pricing"]) {
      if (offering[field]) recordSourceUse(offering[field].evidence,
        { scope: "offering", offering: offering.slug, field });
    }
  }
  return {
    slug,
    approval: packet.approval,
    organizations: packet.organizations.map(({ evidence: _evidence, ...organization }) => ({
      action: "create_or_reuse_exact", ...organization,
    })),
    providerOrganizationRelationships: packet.organizations.map((organization) => ({
      action: "create", organizationSlug: organization.slug,
      relationshipType: organization.relationshipType, isPrimary: organization.isPrimary,
    })),
    offerings: packet.offerings.map((offering) => ({
      action: "create", slug: offering.slug, name: offering.name, offeringType: offering.offeringType,
      capacity: offering.capacity ? { value: offering.capacity.value, unit: offering.capacity.unit } : null,
      stayModes: Object.fromEntries(Object.entries(offering.stayModes)
        .map(([field, fact]) => [field, fact?.value ?? null])),
      features: offering.features.map(({ evidence: _evidence, ...feature }) => feature),
      admissions: offering.admissions?.value ?? null,
      financing: offering.financing?.value ?? null,
      publicInterestStatus: offering.publicInterestStatus?.value ?? null,
      pricing: offering.pricing?.value ?? null,
    })),
    provenance: [...sourceUses.values()],
    deferred: packet.deferred,
  };
}

export function main(args) {
  let batchId = DEFAULT_BATCH_ID;
  if (args[0] === "--batch") {
    batchId = args[1];
    args = args.slice(2);
  }
  const manifest = loadCareBatch(batchId);
  if (args.length === 1 && ["--check-batch", "--dry-run"].includes(args[0])) {
    const checked = validateCareBatch(manifest);
    console.log(JSON.stringify({ mode: args[0].slice(2), databaseWrites: 0, batchId: manifest.batchId,
      candidates: checked.candidates.size, packetCount: checked.packets.size,
      readyForHumanReview: checked.readyForHumanReview.map((item) => item.packet.identity.slug),
      heldPackets: checked.heldPackets.map((item) => item.packet.identity.slug),
      approvedForLocalApply: checked.approvedForLocalApply.map((item) => item.packet.identity.slug),
      evidenceMissingFromRepo: checked.evidenceMissing.map((item) => item.slug),
      protectedExisting: manifest.protectedExisting }, null, 2));
    return;
  }
  if (args[0] === "--plan-apply") {
    const selected = selectApprovedPackets(manifest, args.slice(1));
    console.log(JSON.stringify({ mode: "plan-apply", databaseWrites: 0,
      providers: selected.map(describeCareApplyPlan) }, null, 2));
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
  throw new Error("Use [--batch <batch-id>] --check-batch, --dry-run, --plan-apply <slugs>, or --write-local <slugs> --confirm Lia-vaud:local:54322");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
