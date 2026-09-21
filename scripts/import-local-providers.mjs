import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectLegacyProviders } from "./ingest-legacy-providers.mjs";
import { LOCAL_TARGET, parseLocalArgs, runLocalSql, buildLocalImportSql } from "../lib/local-provider-writer.mjs";

export function main(args = process.argv.slice(2)) {
  const { mode } = parseLocalArgs(args);
  const result = inspectLegacyProviders();
  if (result.summary.rejectedRecords) throw new Error("Candidate validation failed; no database connection made");
  if (mode === "--dry-run") {
    console.log(JSON.stringify({ mode: "dry-run", target: LOCAL_TARGET, databaseWrites: 0, ...result.summary }, null, 2));
    return;
  }
  const output = runLocalSql(buildLocalImportSql(result.rows, { verifyOnly: mode === "--verify-local" }));
  // Only report success after psql exits successfully (including COMMIT).
  console.log(JSON.stringify({ mode: mode.slice(2), target: LOCAL_TARGET, ...JSON.parse(output.trim()) }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
