import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { runLocalSql } from "../lib/local-provider-writer.mjs";
import { localCutoverSql } from "./generate-vaud-v1-marketplace-cutover.mjs";

const inputPath = resolve(process.argv[2] ?? "");
if (!process.argv[2] || !basename(inputPath).startsWith("vaud-v1-marketplace-review.")
  || !inputPath.endsWith(".local.json")) {
  throw new Error("Usage: node scripts/google-place-review-pack.mjs reports/google-place-batches/vaud-v1-marketplace-review.<timestamp>.local.json");
}

const report = JSON.parse(readFileSync(inputPath, "utf8"));
if (report?.schemaVersion !== 1 || report?.entries?.length !== 111 || report?.automaticApprovals !== 0) {
  throw new Error("Expected the non-approving 111-provider marketplace review report");
}
const stamp = report.generatedAt.replaceAll(/[:.]/g, "-");
const outputRoot = resolve(process.cwd(), "reports/google-place-batches");
const packPath = resolve(outputRoot, `vaud-v1-google-place-approval-pack.${stamp}.local.md`);
const imageryPath = resolve(outputRoot, `vaud-v1-provider-imagery-audit.${stamp}.local.md`);
const state = JSON.parse(runLocalSql(localCutoverSql).trim());
const providersById = new Map(state.providers.map((provider) => [provider.id, provider]));
const providerSources = Map.groupBy(state.providerSources ?? [], (source) => source.provider_id);

const decisions = {
  "dovida": {
    explanation: "The official dovida.ch domain and Crissier locality agree; Google’s shorter name is the same current brand.",
    blocker: "Lia has no reviewed street/postcode in the public projection. Confirm that Route de Prilly 23 is the intended Dovida Lausanne office before approval.",
  },
  "grptp": {
    explanation: "The uncommon GRPTP identity, postcode, locality and grptp.ch domain all agree.",
    blocker: "Confirm the minor street spelling difference: Lia ‘Impasse des Arbero 9’ versus Google ‘Imp. des Arbéroz 9’.",
  },
  "home-assistance": {
    explanation: "The full street address, postcode, locality and homeassistance.ch domain agree.",
    blocker: "Confirm that Google’s expanded name ‘Home Assistance Medical & Services’ is the same operating identity as Lia ‘Home Assistance’.",
  },
  "boite-o": {
    explanation: "Name, exact site address and laboiteoservices.ch domain agree; Google only adds the legal suffix Sàrl.",
    blocker: "None apparent; confirm the legal-suffix variation is acceptable.",
  },
  "la-source-a-domicile": {
    explanation: "Provider name, street address, postcode, locality and lasource.ch domain all agree.",
    blocker: "None apparent.",
  },
  "la-solution-ch": {
    explanation: "Postcode, locality, street and la-solution.ch domain agree; the names share the same distinctive brand.",
    blocker: "Confirm Lia’s public brand ‘La-solution.ch’ and Google’s ‘La-solution SA’ are the same provider identity.",
  },
  "les-soins-volants": {
    explanation: "Provider name, postcode, locality and soinsvolants.ch domain agree at the same street address.",
    blocker: "None apparent; Google abbreviates Avenue to Av.",
  },
  "ligue-pulmonaire-vaudoise": {
    explanation: "The exact organization name, postcode, locality and liguepulmonaire.ch domain agree at the same street address.",
    blocker: "None apparent.",
  },
  "msg-soins": {
    explanation: "The distinctive name, postcode and msgsoins.ch domain agree at Route de Brent 13F.",
    blocker: "Confirm the locality wording: Lia uses Chailly-Montreux while Google uses Montreux.",
  },
  "nomad": {
    explanation: "The distinctive name and complete street/postcode/locality are exact matches.",
    blocker: "Google returned no official website; approve only after visually confirming the Maps listing represents the same office.",
  },
  "proxi-soins": {
    explanation: "Name, postcode, locality and proxi-soins.ch domain agree at the same street address.",
    blocker: "None apparent; capitalization differs only.",
  },
  "swiss-agi-san": {
    explanation: "Distinctive name, complete address and swissagisan.ch domain agree; Google only adds the legal suffix Sàrl.",
    blocker: "None apparent; confirm the legal-suffix variation is acceptable.",
  },
  "swisscaring": {
    explanation: "Name, complete address and swisscaring.ch domain agree; Google only adds the legal suffix SARL.",
    blocker: "None apparent; confirm the legal-suffix variation is acceptable.",
  },
};

function cell(value) { return String(value ?? "—").replaceAll("|", "\\|").replaceAll(/\r?\n/g, " "); }
function location(entry) { return [entry.address, entry.postalCode, entry.locality].filter(Boolean).join(", ") || "Canton de Vaud"; }
function host(value) {
  if (!value) return null;
  try { return new URL(value.includes("://") ? value : `https://${value}`).hostname.replace(/^www\./, ""); }
  catch { return null; }
}
function jsonEntry(entry, decision) {
  return JSON.stringify({ status: "approved", placeId: entry.selected.placeId,
    reviewedBy: "<HUMAN_REVIEWER>", reviewedOn: "<YYYY-MM-DD>",
    identityNote: `${decision.explanation} Human reviewer cleared: ${decision.blocker}` }, null, 2);
}

const high = report.entries.filter((entry) => entry.classification === "HIGH CONFIDENCE");
if (high.length !== 13 || high.some((entry) => !decisions[entry.slug])) throw new Error("Review decisions do not match the 13-row batch");
const pack = `# Vaud V1 Google Place approval pack\n\nGenerated from \`${basename(inputPath)}\`. Production was not accessed. **These 13 identities are candidates, not approvals. No registry was changed.** Ratings, review counts and photo availability are transient Google evidence from ${report.generatedAt}.\n\n## Fast review table\n\n| Lia provider | Lia address/locality | Google Place | Google address | Place ID | Official website | Rating / reviews | Photo | Why it appears to match | Approval blocker |\n|---|---|---|---|---|---|---:|:---:|---|---|\n${high.map((entry) => {
  const decision = decisions[entry.slug];
  const site = entry.selected.officialWebsite;
  return `| ${cell(entry.name)} (\`${entry.slug}\`) | ${cell(location(entry))} | ${cell(entry.selected.googleName)} | ${cell(entry.selected.googleAddress)} | \`${entry.selected.placeId}\` | ${site ? `[${cell(host(site))}](${site})` : "—"} | ${entry.selected.rating ?? "—"} / ${entry.selected.reviewCount ?? "—"} | ${entry.selected.hasUsablePhoto ? "yes" : "no"} | ${cell(decision.explanation)} | ${cell(decision.blocker)} |`;
}).join("\n")}\n\n## Exact human approval actions\n\nFor each approved row, add the shown property to the top-level object in the ignored \`config/google-place-approvals.local.json\`, replacing both placeholders with the actual human reviewer and review date. Do not add a row whose blocker was not cleared.\n\n${high.map((entry, index) => {
  const decision = decisions[entry.slug];
  return `### ${index + 1}. ${entry.name} — \`${entry.slug}\`\n\nReview: [Google Maps](${entry.selected.googleMapsUrl})${entry.selected.officialWebsite ? ` · [official website](${entry.selected.officialWebsite})` : ""}\n\nAction after approval:\n\n\`\`\`json\n"${entry.slug}": ${jsonEntry(entry, decision)}\n\`\`\`\n`;
}).join("\n")}\nAfter inserting only the human-approved entries, run the existing local-only registry generator:\n\n\`\`\`powershell\nnode scripts/generate-vaud-v1-marketplace-cutover.mjs --write-local --confirm Lia-vaud:local:54322\n\`\`\`\n\nThen review the resulting diff before any commit. This command was **not** run during preparation of this pack.\n`;
writeFileSync(packPath, pack);

function normalizeUrl(value) {
  if (!value || /\.pdf(?:$|[?#])/i.test(value)) return null;
  try { return new URL(value.includes("://") ? value : `https://${value}`).href; }
  catch { return null; }
}
function imageSignals(html) {
  const tags = [...html.matchAll(/<(?:meta|img)\b[^>]*>/gi)].map((match) => match[0]);
  const candidates = tags.filter((tag) => /(?:property|name)=["'](?:og:image|twitter:image)["']/i.test(tag)
    || /<img\b/i.test(tag));
  const logo = candidates.some((tag) => /logo|logotype|brandmark|favicon|site-icon/i.test(tag));
  const editorial = candidates.some((tag) => !/logo|logotype|brandmark|favicon|site-icon|avatar|sprite|pixel/i.test(tag)
    && !/(?:width|height)=["']?(?:[0-9]|1[0-5])(?:["'\s>])/i.test(tag));
  return { logo, editorial, candidateTagCount: candidates.length };
}
const fetchCache = new Map();
async function inspectPage(url) {
  if (fetchCache.has(url)) return fetchCache.get(url);
  const promise = (async () => {
    try {
      const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(12000),
        headers: { "User-Agent": "Lia-Vaud-imagery-audit/1.0 (+human-review; no image download)" } });
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !type.includes("text/html")) return { ok: false, logo: false, editorial: false };
      const html = await response.text();
      return { ok: true, finalUrl: response.url, ...imageSignals(html.slice(0, 2_000_000)) };
    } catch { return { ok: false, logo: false, editorial: false }; }
  })();
  fetchCache.set(url, promise);
  return promise;
}

const imagery = [];
for (const entry of report.entries) {
  if (entry.classification === "ALREADY APPROVED" && entry.selected?.hasUsablePhoto) {
    imagery.push({ slug: entry.slug, name: entry.name, category: entry.category,
      classification: "approved Google photo available", sourcePage: entry.selected.googleMapsUrl,
      rationale: "The durable approved Place ID currently returns at least one Google photo.",
      rights: "Google request-time rendering and attribution rules apply; no photo URL was persisted." });
    continue;
  }
  const row = providersById.get(entry.id);
  const urls = [row?.website, ...(providerSources.get(entry.id) ?? [])
    .filter((source) => source.source_type === "provider").map((source) => source.source_url)]
    .map(normalizeUrl).filter(Boolean);
  const uniqueUrls = [...new Set(urls)];
  let best = null;
  for (const url of uniqueUrls.slice(0, 3)) {
    const result = await inspectPage(url);
    if (!best || Number(result.editorial) > Number(best.result.editorial)
      || (result.editorial === best.result.editorial && Number(result.logo) > Number(best.result.logo))) {
      best = { url, result };
    }
    if (result.editorial) break;
  }
  const classification = best?.result.editorial ? "official provider image potentially usable"
    : best?.result.logo ? "logo only" : "no legitimate image found";
  const rationale = best?.result.editorial
    ? "A provider-owned page exposes non-logo image metadata/markup; suitability and exact asset identity still require visual and rights review."
    : best?.result.logo ? "The returned provider-owned page exposed branding imagery but no confidently non-logo image signal."
      : uniqueUrls.length ? "No confidently usable image signal was found in the returned HTML from the reviewed provider-owned page(s)."
        : "No provider-owned website or provider-source page is established in the canonical repository.";
  imagery.push({ slug: entry.slug, name: entry.name, category: entry.category, classification,
    sourcePage: best?.url ?? uniqueUrls[0] ?? null, rationale,
    rights: "Reuse rights are not established; obtain permission or a documented license before durable use." });
}

const classes = ["approved Google photo available", "official provider image potentially usable", "logo only", "no legitimate image found"];
const categories = ["ems", "domicile"];
const counts = Object.fromEntries(categories.map((category) => [category, Object.fromEntries(classes.map((classification) =>
  [classification, imagery.filter((item) => item.category === category && item.classification === classification).length]))]));
const audit = `# Vaud V1 provider-owned imagery availability audit\n\nGenerated ${new Date().toISOString()} from the canonical local repository, the existing approved Google identities and provider-owned page HTML. Production was not accessed. **No website image was downloaded or persisted.** A publicly visible image is not evidence of unrestricted reuse rights.\n\n## Counts\n\n| Category | Approved Google photo available | Official provider image potentially usable | Logo only | No legitimate image found | Total |\n|---|---:|---:|---:|---:|---:|\n${categories.map((category) => `| ${category === "ems" ? "EMS" : "Home care/support"} | ${counts[category][classes[0]]} | ${counts[category][classes[1]]} | ${counts[category][classes[2]]} | ${counts[category][classes[3]]} | ${imagery.filter((item) => item.category === category).length} |`).join("\n")}\n\n## Provider audit\n\n| Category | Provider | Classification | Evidence page | Basis and rights caution |\n|---|---|---|---|---|\n${imagery.map((item) => `| ${item.category === "ems" ? "EMS" : "Home care/support"} | ${cell(item.name)} (\`${item.slug}\`) | ${item.classification} | ${item.sourcePage ? `[source](${item.sourcePage})` : "—"} | ${cell(`${item.rationale} ${item.rights}`)} |`).join("\n")}\n\n## Method limits\n\n- Google photo availability is counted only for a currently approved Place ID. Candidate Google photos are not treated as approved.\n- Provider-page inspection fetched HTML only and did not request image assets. It looked for non-logo image metadata/markup, so JavaScript-only galleries or CSS backgrounds may be missed.\n- Provider or operator control of a page does not establish copyright ownership, model releases, sublicensing rights or Lia reuse permission. “Potentially usable” means a later rights and visual review is possible, not that publication is authorized.\n- Network directories and public-authority listings were not treated as provider-owned image sources.\n`;
writeFileSync(imageryPath, audit);
console.log(JSON.stringify({ candidates: high.length, approvalsWritten: 0, providerFactsWritten: 0,
  imagesDownloaded: 0, packPath, imageryPath, counts }, null, 2));
