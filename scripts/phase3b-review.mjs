import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { inspectLegacyProviders } from "./ingest-legacy-providers.mjs";
import { normalizeResearchPacket, validateReviewPacket } from "../lib/provider-review-packet.mjs";
import { buildReviewApplySql } from "../lib/provider-review-apply.mjs";
import { runLocalSql, LOCAL_CONFIRMATION } from "../lib/local-provider-writer.mjs";

const ids = ["ems-boveresses", "nova-via", "senevita-vaud"];
const root = new URL("../docs/research/phase3b-pilots/", import.meta.url);
const baselines = new Map(inspectLegacyProviders().rows.map((row) => [row.legacyId, row.provider]));
const packetUrl = (id) => new URL(`canonical/${id}.json`, root);
export function pilotPacket(id) {
  if (!ids.includes(id)) throw new Error("Unknown pilot");
  const raw = JSON.parse(readFileSync(new URL(`${id}.review.json`, root), "utf8"));
  return normalizeResearchPacket(raw, baselines.get(id));
}
function checkedCanonical(id) {
  const expected = pilotPacket(id);
  const packet = JSON.parse(readFileSync(packetUrl(id), "utf8"));
  const compared = structuredClone(packet);
  compared.approval.localApply = false; // Separate approval is the sole permitted divergence.
  if (JSON.stringify(compared) !== JSON.stringify(expected)) throw new Error(`Stale or altered canonical packet: ${id}`);
  return packet;
}

export function main(args) {
  if (args.length === 1 && ["--write-packets", "--check-packets", "--dry-run"].includes(args[0])) {
    if (args[0] === "--write-packets") mkdirSync(new URL("canonical/", root), { recursive: true });
    const results = ids.map((id) => {
      const expected = pilotPacket(id);
      if (args[0] === "--write-packets") writeFileSync(packetUrl(id), `${JSON.stringify(expected, null, 2)}\n`);
      const packet = args[0] === "--write-packets" ? expected : checkedCanonical(id);
      return { id, ...validateReviewPacket(packet, baselines.get(id)), structuralHolds: packet.holdReasons,
        localApplyApproved: packet.approval.localApply, unresolved: packet.unresolved };
    });
    console.log(JSON.stringify({ mode: args[0].slice(2), databaseWrites: 0, pilots: results }, null, 2));
    return;
  }
  if (args.length === 2 && args[0] === "--check-pilot" && ids.includes(args[1])) {
    const packet = checkedCanonical(args[1]);
    const baseline = baselines.get(args[1]);
    const preview = validateReviewPacket(packet, baseline);
    console.log(JSON.stringify({ mode: "check-pilot", databaseWrites: 0, id: args[1], ...preview,
      structuralHolds: packet.holdReasons }, null, 2));
    return;
  }
  if (args.length === 4 && args[0] === "--write-local" && ids.includes(args[1])
    && args[2] === "--confirm" && args[3] === LOCAL_CONFIRMATION) {
    const packet = checkedCanonical(args[1]);
    const sql = buildReviewApplySql(packet, baselines.get(args[1]));
    console.log(runLocalSql(sql).trim());
    return;
  }
  throw new Error("Use --write-packets, --check-packets, --dry-run, --check-pilot <pilot>, or --write-local <pilot> --confirm Lia-vaud:local:54322");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
