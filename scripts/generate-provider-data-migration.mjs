import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { DATA_MIGRATION, VERIFICATION_FILE, renderProviderDataSql } from "../lib/provider-data-migration.mjs";

export function generate(args) {
  if (args.length !== 1 || !["--write", "--check"].includes(args[0])) {
    throw new Error("Use --write or --check; this generator never accesses a database");
  }
  for (const [url, sql] of [
    [new URL(`../supabase/migrations/${DATA_MIGRATION}`, import.meta.url), renderProviderDataSql()],
    [new URL(`../supabase/verification/${VERIFICATION_FILE}`, import.meta.url), renderProviderDataSql({ verifyOnly: true })],
  ]) {
    if (args[0] === "--write") writeFileSync(url, sql);
    else if (readFileSync(url, "utf8") !== sql) throw new Error(`Generated artifact is stale: ${fileURLToPath(url)}`);
  }
  console.log(`${args[0] === "--write" ? "Generated" : "Checked"} data migration and verification SQL: 66 providers + 66 legacy sources; no database access.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { generate(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
