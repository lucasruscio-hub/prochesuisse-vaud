import nextEnv from "@next/env";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runLocalSql } from "../lib/local-provider-writer.mjs";
import { localCutoverSql } from "./generate-vaud-v1-marketplace-cutover.mjs";
import { projectPublicProviders } from "../lib/public-provider-projection.js";
import { getGooglePlaceReviewEvidence, searchGooglePlaceReviewCandidates } from "../lib/google-places-core.js";
import { buildGoogleReviewQuery, classifyGoogleCandidates } from "../lib/google-place-marketplace-review.js";

nextEnv.loadEnvConfig(process.cwd(), true);
const root = process.cwd();
const manifest = JSON.parse(readFileSync(resolve(root, "config/vaud-v1-publication-manifest.json"), "utf8"));
const approvals = JSON.parse(readFileSync(resolve(root, "config/google-place-approvals.json"), "utf8"));
const outputRoot = resolve(root, "reports/google-place-batches");
const checkpointPath = resolve(outputRoot, "vaud-v1-marketplace-review.checkpoint.local.json");

function safeStamp(date) { return date.toISOString().replaceAll(/[:.]/g, "-"); }
function writeExclusive(path, value) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, value, { encoding: "utf8", flag: "wx" });
  renameSync(temporary, path);
}
function tableCell(value) { return String(value ?? "—").replaceAll("|", "\\|").replaceAll(/\r?\n/g, " "); }

if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.error("Set GOOGLE_PLACES_API_KEY in .env.local before searching.");
  process.exitCode = 1;
} else {
  const beforeApprovals = JSON.stringify(approvals);
  const state = JSON.parse(runLocalSql(localCutoverSql).trim());
  const providers = projectPublicProviders(state, manifest, { googleRegistry: approvals });
  if (providers.length !== 111) throw new Error(`Expected 111 canonical public providers, found ${providers.length}`);
  const approvedPlaceIds = new Map(Object.entries(approvals).map(([slug, entry]) => [entry.placeId, slug]));
  const selectedPlaceIds = new Map();
  mkdirSync(outputRoot, { recursive: true });
  const checkpoint = existsSync(checkpointPath)
    ? JSON.parse(readFileSync(checkpointPath, "utf8")) : { schemaVersion: 1, entries: [] };
  const entries = Array.isArray(checkpoint.entries) ? checkpoint.entries : [];
  for (const entry of entries.filter((item) => item.classification === "HIGH CONFIDENCE" && item.selected?.placeId)) {
    selectedPlaceIds.set(entry.selected.placeId, entry.slug);
  }
  const completedSlugs = new Set(entries.map((entry) => entry.slug));
  for (const provider of providers) {
    if (completedSlugs.has(provider.slug)) continue;
    const canonical = {
      id: provider.id, slug: provider.slug, category: provider.category, name: provider.name,
      address: provider.location.address, postalCode: provider.location.postalCode,
      locality: provider.location.locality, officialWebsite: provider.detail.contact.website,
    };
    const approved = approvals[provider.slug];
    if (approved?.status === "approved") {
      const current = await getGooglePlaceReviewEvidence(approved.placeId);
      entries.push({ ...canonical, query: null, classification: "ALREADY APPROVED",
        selected: current, reason: approved.identityNote, candidates: current ? [current] : [],
        approvedIdentity: { placeId: approved.placeId, reviewedBy: approved.reviewedBy,
          reviewedOn: approved.reviewedOn } });
    } else {
      const query = buildGoogleReviewQuery(canonical);
      try {
        const candidates = await searchGooglePlaceReviewCandidates(query) ?? [];
        const result = classifyGoogleCandidates(canonical, candidates, { approvedPlaceIds, selectedPlaceIds });
        if (result.classification === "HIGH CONFIDENCE") selectedPlaceIds.set(result.selected.placeId, provider.slug);
        entries.push({ ...canonical, query, ...result,
          humanDecision: { decision: "pending", selectedPlaceId: null, reviewedBy: null,
            reviewedOn: null, identityNote: null } });
      } catch (error) {
        entries.push({ ...canonical, query, classification: "NEEDS HUMAN REVIEW", selected: null,
          reason: `Candidate lookup failed: ${error instanceof Error ? error.message : "unknown error"}.`,
          candidates: [], searchError: true,
          humanDecision: { decision: "pending", selectedPlaceId: null, reviewedBy: null,
            reviewedOn: null, identityNote: null } });
      }
    }
    writeFileSync(checkpointPath, `${JSON.stringify({ schemaVersion: 1, entries }, null, 2)}\n`);
    if (entries.length % 10 === 0 || entries.length === providers.length) {
      console.error(`Reviewed ${entries.length}/${providers.length} provider identities.`);
    }
  }
  for (const entry of entries.filter((item) => item.classification === "HIGH CONFIDENCE")) {
    const owners = entries.filter((item) => item.selected?.placeId === entry.selected.placeId);
    if (owners.length > 1) {
      entry.classification = "NEEDS HUMAN REVIEW";
      entry.reason = `Place ID is shared by multiple Lia providers (${owners.map((item) => item.slug).join(", ")}).`;
    }
  }
  const counts = Object.fromEntries(["ALREADY APPROVED", "HIGH CONFIDENCE", "NEEDS HUMAN REVIEW", "NO RELIABLE MATCH"]
    .map((classification) => [classification, entries.filter((entry) => entry.classification === classification).length]));
  const potential = entries.filter((entry) => ["ALREADY APPROVED", "HIGH CONFIDENCE"].includes(entry.classification));
  const summary = { total: entries.length, approvedCoverage: counts["ALREADY APPROVED"],
    highConfidenceNewMatches: counts["HIGH CONFIDENCE"], needsHumanReview: counts["NEEDS HUMAN REVIEW"],
    noReliableMatch: counts["NO RELIABLE MATCH"],
    potentialPhotoCoverage: potential.filter((entry) => entry.selected?.hasUsablePhoto).length,
    potentialRatingCoverage: potential.filter((entry) => entry.selected?.rating != null).length };
  const generatedAt = new Date();
  const report = { schemaVersion: 1, cohort: manifest.cohort, generatedAt: generatedAt.toISOString(),
    storage: "temporary-local-human-review-only", productionAccessed: false, automaticApprovals: 0,
    durableExternalFactsWritten: 0,
    instructions: "Review every HIGH CONFIDENCE row before adding an approval. Ratings, review counts and photo availability are transient Google evidence, not Lia provider facts.",
    summary, entries };
  const high = entries.filter((entry) => entry.classification === "HIGH CONFIDENCE");
  const markdown = `# Vaud V1 Google Place high-confidence review batch\n\nGenerated ${generatedAt.toISOString()}. Production was not accessed. **No approval was written.** Rating, review-count and photo signals are transient review evidence only.\n\n## Summary\n\n- Current approved coverage: **${summary.approvedCoverage}/${summary.total}**.\n- High-confidence new candidates awaiting human approval: **${summary.highConfidenceNewMatches}**.\n- Needs human review: **${summary.needsHumanReview}**.\n- No reliable match: **${summary.noReliableMatch}**.\n- Potential photo coverage after approving every high-confidence row: **${summary.potentialPhotoCoverage}/${summary.total}**.\n- Potential rating coverage after approving every high-confidence row: **${summary.potentialRatingCoverage}/${summary.total}**.\n\n## Review batch\n\n| Lia provider | Lia address/locality | Google Place | Google address | Place ID | Rating | Reviews | Photo | Match reason | Decision |\n|---|---|---|---|---|---:|---:|:---:|---|---|\n${high.map((entry) => `| ${[entry.name, `\`${entry.slug}\``].join(" ")} | ${tableCell([entry.address, entry.postalCode, entry.locality].filter(Boolean).join(", "))} | ${tableCell(entry.selected.googleName)} | ${tableCell(entry.selected.googleAddress)} | \`${entry.selected.placeId}\` | ${tableCell(entry.selected.rating)} | ${tableCell(entry.selected.reviewCount)} | ${entry.selected.hasUsablePhoto ? "yes" : "no"} | ${tableCell(entry.reason)} | pending |`).join("\n") || "| — | — | — | — | — | — | — | — | No high-confidence candidate | — |"}\n\nThe companion local JSON contains all 111 outcomes and returned candidates for deeper review.\n`;
  const stamp = safeStamp(generatedAt);
  const jsonPath = resolve(outputRoot, `vaud-v1-marketplace-review.${stamp}.local.json`);
  const markdownPath = resolve(outputRoot, `vaud-v1-marketplace-high-confidence.${stamp}.local.md`);
  writeExclusive(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeExclusive(markdownPath, markdown);
  if (JSON.stringify(JSON.parse(readFileSync(resolve(root, "config/google-place-approvals.json"), "utf8"))) !== beforeApprovals) {
    throw new Error("Approval registry changed during discovery");
  }
  console.log(JSON.stringify({ ...summary, approvalsWritten: 0, providerFactsWritten: 0,
    jsonPath, markdownPath }, null, 2));
}
