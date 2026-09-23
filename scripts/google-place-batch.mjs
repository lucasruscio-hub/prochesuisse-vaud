import nextEnv from "@next/env";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { buildGooglePlaceBatchReport } from "../lib/google-place-batch.js";
import { searchGooglePlaceCandidates } from "../lib/google-places-core.js";

nextEnv.loadEnvConfig(process.cwd(), true);

const inputPath = resolve(process.argv[2] ?? "");
const allowedInputRoot = resolve(process.cwd(), "config", "google-place-batches");
const outputRoot = resolve(process.cwd(), "reports", "google-place-batches");
const inside = (root, file) => relative(root, file) && !relative(root, file).startsWith("..") && !resolve(file).startsWith(`\\`);

if (!process.argv[2] || !inside(allowedInputRoot, inputPath) || !inputPath.endsWith(".json")) {
  console.error("Usage: node scripts/google-place-batch.mjs config/google-place-batches/<batch>.json");
  process.exitCode = 1;
} else if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.error("Set GOOGLE_PLACES_API_KEY in .env.local before searching.");
  process.exitCode = 1;
} else {
  try {
    const input = JSON.parse(readFileSync(inputPath, "utf8"));
    const report = await buildGooglePlaceBatchReport(input, { search: (query) => searchGooglePlaceCandidates(query) });
    mkdirSync(outputRoot, { recursive: true });
    const stamp = report.generatedAt.replaceAll(/[:.]/g, "-");
    const outputPath = resolve(outputRoot, `${input.batchId}.${stamp}.local.json`);
    if (existsSync(outputPath)) throw new Error("Output already exists");
    const temporaryPath = `${outputPath}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    renameSync(temporaryPath, outputPath);
    console.log(JSON.stringify({ batchId: report.batchId, providers: report.entries.length,
      output: relative(process.cwd(), outputPath), approvalsWritten: 0,
      multiplicity: Object.fromEntries(["zero", "one", "multiple", "unknown"].map((value) => [value,
        report.entries.filter((entry) => entry.candidateMultiplicity === value).length])) }, null, 2));
  } catch {
    console.error(`Batch candidate search failed for ${basename(inputPath)}. No approval mapping was changed.`);
    process.exitCode = 1;
  }
}
