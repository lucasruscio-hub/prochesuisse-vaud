import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CARE_FEATURE_TAXONOMY, controlledCareFeature } from "./care-feature-taxonomy.js";
import { validateCarePacket } from "./care-review-packet.mjs";

export const CARE_EVIDENCE_WORKBOOK = "docs/research/source-material/Lia_Vaud_provider_master_audit_2026-09-21.xlsx";
export const CARE_EVIDENCE_WORKBOOK_SHA256 = "2f3e5ed512e7df196356d6f0f7d66df5f08fd7168b8c90f19c0f213ff27b4450";
export const PHASE4C_EVIDENCE_SLUGS = Object.freeze([
  "ems-chateau-rive", "ems-clair-soleil", "ems-le-home", "ems-signal", "ems-girarde",
]);
export const PHASE4C_BATCH_2_EVIDENCE_SLUGS = Object.freeze([
  "ems-marronnier", "ems-petit-flon", "ems-pre-fleuri", "ems-praz-joret",
  "ems-sauvabelin", "ems-mauri", "ems-pins", "ems-jardins-leman",
]);
export const PHASE4C_BATCH_3_EVIDENCE_SLUGS = Object.freeze([
  "ems-arcades", "ems-meillerie", "ems-valency", "ems-meridienne",
  "ems-paix-soir", "ems-vernie",
]);
export const PHASE4C_BATCH_4_EVIDENCE_SLUGS = Object.freeze([
  "ems-boissonnet", "ems-odysse", "ems-pre-pariset", "ems-pre-tour", "ems-tremieres",
]);
export const ALL_PHASE4C_EVIDENCE_SLUGS = Object.freeze([
  ...PHASE4C_EVIDENCE_SLUGS, ...PHASE4C_BATCH_2_EVIDENCE_SLUGS,
  ...PHASE4C_BATCH_3_EVIDENCE_SLUGS, ...PHASE4C_BATCH_4_EVIDENCE_SLUGS,
]);

const nonempty = (value) => typeof value === "string" && Boolean(value.trim());
const workbookCell = (value) => nonempty(value) && /^[^!]+![A-Z]+\d+(?::[A-Z]+\d+)?$/.test(value);

function assertEvidenceRef(value, sources, label) {
  if (!value || !sources.has(value.sourceId) || !workbookCell(value.workbookCell)) {
    throw new Error(`${label} requires a source and exact workbook cell`);
  }
}

export function validateProviderCareEvidence(value, { workbookBytes } = {}) {
  if (!value || value.schemaVersion !== 1 || !ALL_PHASE4C_EVIDENCE_SLUGS.includes(value.provider?.slug)
    || value.provider.legacyId !== value.provider.slug || !nonempty(value.provider.repositoryName)
    || !nonempty(value.provider.researchedName) || value.provider.primaryType !== "ems"
    || value.identity?.status !== "reconciled" || !nonempty(value.identity.rationale)
    || value.workbook?.path !== CARE_EVIDENCE_WORKBOOK
    || value.workbook.sha256 !== CARE_EVIDENCE_WORKBOOK_SHA256
    || value.workbook.auditDate !== "2026-09-21" || !Array.isArray(value.workbook.rows)
    || !Array.isArray(value.sources) || !Array.isArray(value.identity.facts)
    || !Array.isArray(value.carePacketProposal?.organizations)
    || !Array.isArray(value.carePacketProposal?.offerings) || !value.carePacketProposal.offerings.length
    || !Array.isArray(value.deferredClaims) || !Array.isArray(value.unresolvedIssues)
    || !Array.isArray(value.taxonomyProposals) || typeof value.review?.localApply !== "boolean"
    || value.review.publish !== false || value.review.verify !== false
    || !["ready_for_human_review", "approved_for_local_apply", "held"].includes(value.review.status)) {
    throw new Error(`Invalid provider evidence structure: ${value?.provider?.slug ?? "unknown"}`);
  }
  if (workbookBytes) {
    const digest = createHash("sha256").update(workbookBytes).digest("hex");
    if (digest !== value.workbook.sha256) throw new Error("Provider evidence workbook digest mismatch");
  }
  if (!value.workbook.rows.length || value.workbook.rows.some((row) => !workbookCell(row))) {
    throw new Error("Provider evidence requires exact workbook row ranges");
  }
  const sources = new Map();
  for (const source of value.sources) {
    if (!nonempty(source?.id) || sources.has(source.id) || !["public", "provider", "lia"].includes(source.kind)
      || !nonempty(source.name) || !nonempty(source.url) || !/^https:\/\//.test(source.url)
      || /(^|\.)google(?:usercontent)?\./i.test(new URL(source.url).hostname)
      || /(^|\.)gstatic\.com$/i.test(new URL(source.url).hostname)
      || source.accessedOn !== value.workbook.auditDate || !workbookCell(source.workbookCell)) {
      throw new Error(`Invalid provider evidence source: ${source?.id ?? "unknown"}`);
    }
    sources.set(source.id, source);
  }
  for (const fact of value.identity.facts) {
    if (!nonempty(fact?.field) || !["organization", "site", "offering"].includes(fact.scope)
      || !["reviewed", "conflicting", "deferred"].includes(fact.status)) {
      throw new Error("Invalid identity/site evidence fact");
    }
    assertEvidenceRef(fact.evidence, sources, fact.field);
  }
  for (const organization of value.carePacketProposal.organizations) {
    if (!nonempty(organization?.slug) || !nonempty(organization.name)) throw new Error("Invalid proposed organization");
    assertEvidenceRef(organization.evidence, sources, `organization ${organization.slug}`);
  }
  for (const offering of value.carePacketProposal.offerings) {
    assertEvidenceRef(offering.typeEvidence, sources, `offering ${offering.slug}`);
    if (offering.capacity) assertEvidenceRef(offering.capacity.evidence, sources, "capacity");
    for (const fact of Object.values(offering.stayModes)) if (fact) assertEvidenceRef(fact.evidence, sources, "stay mode");
    for (const feature of offering.features) {
      controlledCareFeature(feature.kind, feature.code, feature.details ?? null);
      assertEvidenceRef(feature.evidence, sources, `${feature.kind}.${feature.code}`);
    }
    for (const key of ["admissions", "financing", "publicInterestStatus", "pricing"]) {
      if (offering[key]) assertEvidenceRef(offering[key].evidence, sources, key);
    }
  }
  for (const claim of value.deferredClaims) {
    if (!nonempty(claim?.field) || !nonempty(claim.reason)) throw new Error("Invalid deferred evidence claim");
    if (claim.evidence) assertEvidenceRef(claim.evidence, sources, `deferred ${claim.field}`);
  }
  for (const issue of value.unresolvedIssues) {
    if (!nonempty(issue?.code) || !nonempty(issue.description) || !Array.isArray(issue.workbookCells)
      || issue.workbookCells.some((cell) => !workbookCell(cell))) throw new Error("Invalid unresolved evidence issue");
  }
  const proposals = new Set();
  for (const proposal of value.taxonomyProposals) {
    const key = `${proposal?.kind}.${proposal?.code}`;
    if (!Object.hasOwn(CARE_FEATURE_TAXONOMY, proposal?.kind) || !nonempty(proposal.code)
      || Object.hasOwn(CARE_FEATURE_TAXONOMY[proposal.kind], proposal.code) || proposals.has(key)
      || !nonempty(proposal.label) || !Array.isArray(proposal.workbookClaims)
      || !proposal.workbookClaims.length || proposal.workbookClaims.some((cell) => !workbookCell(cell))) {
      throw new Error(`Invalid proposed taxonomy addition: ${key}`);
    }
    proposals.add(key);
  }
  if ((value.review.status === "held") !== (value.unresolvedIssues.length > 0)) {
    throw new Error("Evidence review status does not match unresolved issues");
  }
  if (value.review.localApply !== (value.review.status === "approved_for_local_apply")) {
    throw new Error("Evidence local-apply gate does not match human review status");
  }
  return { valid: true, sourceCount: sources.size, deferredCount: value.deferredClaims.length,
    unresolvedCount: value.unresolvedIssues.length };
}

function canonicalEvidence(reference, sources) {
  const source = sources.get(reference.sourceId);
  return { researchField: reference.workbookCell, kind: source.kind, name: source.name,
    url: source.url, accessedOn: source.accessedOn };
}

export function buildCarePacketFromEvidence(value, options = {}) {
  validateProviderCareEvidence(value, options);
  const sources = new Map(value.sources.map((source) => [source.id, source]));
  const evidence = (reference) => canonicalEvidence(reference, sources);
  const packet = {
    version: 1,
    identity: { legacyId: value.provider.legacyId, slug: value.provider.slug,
      expectedName: value.provider.repositoryName, expectedType: value.provider.primaryType },
    approval: { localApply: value.review.localApply, publish: false, verify: false },
    organizations: value.carePacketProposal.organizations.map((organization) => ({
      slug: organization.slug, name: organization.name,
      relationshipType: organization.relationshipType, isPrimary: organization.isPrimary,
      evidence: evidence(organization.evidence),
    })),
    offerings: value.carePacketProposal.offerings.map((offering) => ({
      slug: offering.slug, name: offering.name, offeringType: offering.offeringType,
      typeEvidence: evidence(offering.typeEvidence),
      capacity: offering.capacity ? { value: offering.capacity.value, unit: offering.capacity.unit,
        evidence: evidence(offering.capacity.evidence) } : null,
      stayModes: Object.fromEntries(Object.entries(offering.stayModes).map(([key, fact]) => [key,
        fact ? { value: fact.value, evidence: evidence(fact.evidence) } : null])),
      careProfiles: offering.features.filter((feature) => feature.kind === "care_profile")
        .map((feature) => feature.code),
      features: offering.features.map((feature) => ({
        ...controlledCareFeature(feature.kind, feature.code, feature.details ?? null),
        evidence: evidence(feature.evidence),
      })),
      ...Object.fromEntries(["admissions", "financing", "publicInterestStatus", "pricing"].map((key) => [key,
        offering[key] ? { value: offering[key].value, evidence: evidence(offering[key].evidence) } : null])),
    })),
    deferred: value.deferredClaims.map((claim) => ({ field: claim.field,
      ...(Object.hasOwn(claim, "value") ? { value: claim.value } : {}), reason: claim.reason,
      ...(claim.evidence ? { evidence: evidence(claim.evidence) } : {}) })),
    unresolved: value.unresolvedIssues.map(({ code, description }) => ({ code, description })),
  };
  validateCarePacket(packet);
  return packet;
}

export function readProviderCareEvidence(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
