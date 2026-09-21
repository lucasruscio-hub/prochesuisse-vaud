import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { providers } from "../lib/providers.js";
import { inspectProviderDataset } from "../lib/provider-ingestion.mjs";
import { buildLegacyMappingRows } from "./generate-legacy-provider-report.mjs";

export function inspectLegacyProviders() {
  return inspectProviderDataset(providers, {
    source: { type: "legacy", name: "Lia legacy static provider dataset (lib/providers.js)" },
    reviewNotes: Object.fromEntries(buildLegacyMappingRows().map((row) => [row.legacyId, {
      verificationNotes: row.verificationNotes, specialReviewConcerns: row.specialReviewConcerns,
    }])),
  });
}

const cell = (value) => String(value ?? "").replaceAll("|", "\\|").replace(/[\r\n]/g, " ");
export function renderIngestionReport(result = inspectLegacyProviders()) {
  const s = result.summary;
  return `# Legacy ingestion review — Phase 2\n\n` +
    `Dry-run only. No database access or import. ${s.totalSourceRecords} source records; ` +
    `${s.countsByCategory.ems} EMS, ${s.countsByCategory.domicile} home care, ${s.countsByCategory.residence} residences.\n\n` +
    `${s.validRecords} mechanically transformable; ${s.rejectedRecords} rejected. ` +
    `${s.duplicateLegacyIds.length} duplicate legacy IDs; ${s.duplicateSlugs.length} duplicate slugs; ` +
    `${s.missingNames.length} missing/invalid names; ${s.missingOrInvalidTypes.length} missing/invalid types.\n\n` +
    `All ${s.recordsRequiringVerification} records are unverified and require verification before publication. Only ${s.recordsNeedingSpecialReview} records have additional provider-specific concerns requiring special/manual investigation. Mechanical import eligibility means schema-compatible preservation; it is not publication approval or verified identity. Ambiguous identities remain separate. All candidate rows are unpublished/unverified; canton and municipality remain null. Services, languages and service areas are empty. Source records are private and have no invented URL or dates.\n\n` +
    `Original names, categories, locality, NPA, display address and tags are preserved; see [Phase 1 raw mapping](./legacy-provider-mapping.md). Its service proposals are never applied. Status active is directory lifecycle only, not evidence of current operation.\n\n` +
    `| Legacy ID / stable slug | Original name | Category | Mechanical transform | Verification required before publication | Special/manual investigation | Baseline verification notes | Additional provider-specific concerns |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n` +
    result.rows.map((row) => "| " + [row.legacyId, row.name, row.type,
      row.errors.length ? `REJECTED: ${row.errors.join(", ")}` : "Eligible",
      row.verificationRequired ? "Yes; unverified" : "No",
      row.needsSpecialReview ? "Required" : "None flagged",
      row.verificationNotes.join(" "), row.specialReviewConcerns.join(" ") || "None"].map(cell).join(" | ") + " |").join("\n") + "\n";
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const allowed = new Set(["--dry-run", "--json", "--write-report", "--check-report"]);
  if (args.some((arg) => !allowed.has(arg))) throw new Error("Unsupported argument. Database import is not implemented; dry-run only.");
  if (args.includes("--write-report") && args.includes("--check-report")) throw new Error("Choose write or check report, not both");
  const result = inspectLegacyProviders();
  const report = renderIngestionReport(result);
  const reportUrl = new URL("../docs/legacy-provider-ingestion-review.md", import.meta.url);
  if (args.includes("--write-report")) writeFileSync(reportUrl, report);
  if (args.includes("--check-report") && readFileSync(reportUrl, "utf8") !== report) throw new Error("Ingestion review report is stale");
  console.log(JSON.stringify(args.includes("--json") ? result : { mode: "dry-run", databaseWrites: 0, ...result.summary }, null, 2));
  if (result.summary.rejectedRecords) process.exitCode = 1;
}
