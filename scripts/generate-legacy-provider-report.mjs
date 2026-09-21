import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { providers } from "../lib/providers.js";
import { proposeLegacyServices } from "../lib/provider-config.js";

const specificConcerns = {
  "ems-grand-pre": "Display address abbreviates Cheseaux-sur-Lausanne to Cheseaux; resolve official municipality independently.",
  "ems-signal": "Les Cullayes is a legacy place label; verify its current municipality identity rather than creating a municipality from this string.",
  "ems-odysse": "Corporate name (SA) may describe an operator rather than a single site; compare with ems-arcades without merging automatically.",
  "ems-arcades": "Group affiliation in name; compare with ems-odysse to distinguish operator and facility.",
  "ems-girarde": "Epalinges lacks the accent used in Épalinges; resolve official identity, preserve original spelling.",
  "ems-mauri": "Foundation may be an operator or facility; abbreviated Romanel address requires review.",
  "ems-mont-calme": "Foundation name may refer to an organization or a site; confirm the listing unit.",
  "ems-penates": "Foundation affiliation; confirm the physical home versus operator identity.",
  "ems-bethanie": "Institution name alone does not identify a precise physical site.",
  "ems-laurelles-vevey": "Possible shared operator/site with laurelles-residence in Vevey; distinguish services/sites before any merge.",
  "laurelles-residence": "Possible shared operator/site with ems-laurelles-vevey; category difference is not proof of separate identity.",
  "ems-gottrause": "Display address abbreviates Yverdon-les-Bains to Yverdon.",
  "senevita-vaud": "Canton-wide brand/branch ambiguity. Tout Vaud is an unverified coverage claim, not a coverage record.",
  "homeinstead": "Lausanne branch label; verify current operator/site identity independently, including any potential relationship to other brands.",
  "dovida": "Brand-only listing; establish local operation identity and do not merge with homeinstead based on assumptions.",
  "pro-senectute": "Canton-level organization; identify actual local service operation(s), not one fictional facility.",
  "avasad-cms": "Explicit CMS network-level listing; must resolve individual operations or retain as an unpublished unresolved record.",
  "nova-via": "Named Montreux operation; verify specific site. Bilingue identifies no languages.",
  "gout-bonheur": "Display address abbreviates Goumoens-la-Ville to Goumoens; verify locality versus municipality.",
  "alterimo": "Operator/portfolio-style logements seniors label; resolve individual site(s).",
  "netage": "Foundation-level identity may encompass multiple properties; establish listing unit.",
  "residence-lac-nyon": "Generic residence name; establish unique site using a source and precise address.",
};

export function buildLegacyMappingRows() {
  return providers.map((provider) => {
    const verificationNotes = ["Identity and physical address unverified; name/locality/NPA alone do not establish a unique site."];
    const specialReviewConcerns = [];
    if (provider.type === "domicile") {
      specialReviewConcerns.push("Confirm locally identifiable service operation; office locality does not establish service coverage.");
    }
    if (provider.id.startsWith("epsm-")) {
      specialReviewConcerns.push("EPSM labelled record currently typed ems; review subtype and elderly-care scope before classification/publication.");
    }
    if (/Fondation|Groupe|SISP|GHOL/.test(provider.name)) {
      specialReviewConcerns.push("Organization/group affiliation in name; distinguish provider site from operator and related listings.");
    }
    if (specificConcerns[provider.id]) specialReviewConcerns.push(specificConcerns[provider.id]);
    return {
      legacyId: provider.id,
      name: provider.name,
      type: provider.type,
      commune: provider.commune,
      npa: provider.npa,
      originalTags: [...provider.tags],
      originalLocationText: provider.address,
      ...proposeLegacyServices(provider.tags),
      verificationNotes,
      specialReviewConcerns,
      concerns: [...verificationNotes, ...specialReviewConcerns],
    };
  });
}

const cell = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
export function renderLegacyMappingReport() {
  const rows = buildLegacyMappingRows();
  const unmapped = [...new Set(rows.flatMap((row) => row.unmappedTags))].sort((a, b) => a.localeCompare(b, "fr"));
  const counts = Object.fromEntries(["ems", "domicile", "residence"].map((type) => [type, rows.filter((row) => row.type === type).length]));
  return `# Legacy provider mapping review — Phase 1\n\n` +
    `Generated from all ${rows.length} records in lib/providers.js: ${counts.ems} ems, ${counts.domicile} domicile, ${counts.residence} residence. No records are imported or altered.\n\n` +
    `REVIEW CANDIDATES ONLY. Proposed codes below are exact lexical interpretations of UNVERIFIED legacy tags, not verified service facts. The future initial import MUST NOT automatically populate service_codes from these proposals. Preserve every original tag in original_tags and leave service_codes empty unless each assignment is individually verified/approved. Keep ambiguous provider identities unpublished. Empty arrays mean unknown/not recorded, not confirmed absence. No language, price, availability, public/private status, street, coordinates, or coverage is inferred.\n\n` +
    `Preserve legacy_id and use that same string as the proposed stable slug; let the database create a new UUID. Preserve original_location_text exactly as shown. Keep commune and NPA as raw reported locality/postal values until checked; municipality_id stays null until resolved against an authoritative reference. Country CH is the requested scope; any proposed VD assignment still needs record-level confirmation. Keep unverified/unpublished, last_reviewed_at null, and record a legacy source rather than inventing a public URL or review date.\n\n` +
    `All identity notes are review questions based only on the repository. They do not assert real-world duplication, ownership, or current operation. No ambiguous records should be dropped or merged automatically.\n\n` +
    `## Tags without a safe V1 service-code mapping\n\n${unmapped.map((tag) => `- ${tag}`).join("\n")}\n\n` +
    `These may describe geography, organizational/funding claims, housing terminology, amenities, or overly broad services. In particular: Bilingue supplies no language codes; 24h/24 does not establish a specific night-care service; Spitex/CMS/OSAD/HAD/Soins do not prove nursing; LADA is not mapped to adapted_housing without checking the underlying offering; Public/LAMal/Tarif social are not verified status or price facts.\n\n` +
    `## Complete record-by-record report\n\n` +
    `| Legacy ID | Current name | Type | Commune | NPA | Original tags (preserve all) | Original location text | Proposed service codes (review required) | Tags not safely mapped | Identity / operation concerns |\n` +
    `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n` +
    rows.map((row) => "| " + [row.legacyId, row.name, row.type, row.commune, row.npa,
      row.originalTags.join("; "), row.originalLocationText,
      row.proposedServiceCodes.join("; ") || "None", row.unmappedTags.join("; ") || "None",
      row.concerns.join(" ")].map(cell).join(" | ") + " |").join("\n") + "\n";
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const reportUrl = new URL("../docs/legacy-provider-mapping.md", import.meta.url);
  const report = renderLegacyMappingReport();
  if (process.argv.includes("--write")) {
    writeFileSync(reportUrl, report);
    console.log("Wrote local mapping report only; no database access.");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(reportUrl, "utf8") !== report) throw new Error("Mapping report differs from source/config.");
    console.log("All 66 mapping rows match the current legacy dataset/config.");
  } else {
    console.log(report);
  }
}
