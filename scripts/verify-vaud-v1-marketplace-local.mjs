import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runLocalSql } from "../lib/local-provider-writer.mjs";
import { projectPublicProviders, resolvePublicProviderRoute, VAUD_V1_REDIRECTS } from "../lib/public-provider-projection.js";
import { providers as legacyProviders } from "../lib/providers.js";
import { localCutoverSql } from "./generate-vaud-v1-marketplace-cutover.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, "config/vaud-v1-publication-manifest.json"), "utf8"));
const googleRegistry = JSON.parse(readFileSync(resolve(root, "config/google-place-approvals.json"), "utf8"));
const providerTables = ["providers", "provider_sources", "municipalities", "provider_service_areas",
  "organizations", "organization_sources", "organization_names", "organization_relationships",
  "provider_names", "provider_identity_links", "provider_organizations", "care_offerings",
  "care_offering_sources", "care_offering_features", "care_offering_availability",
  "care_offering_regulatory_designations"];
const inquiryTables = ["inquiry_contacts", "inquiries", "inquiry_referrals", "inquiry_activities"];
const fingerprint = (tables) => `md5(concat_ws('|',${tables.map((table) =>
  `(SELECT coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'') FROM public.${table} t)`).join(",")}))`;
const integritySql = `BEGIN READ ONLY; SET LOCAL statement_timeout='30s'; SELECT jsonb_build_object(
  'providerDomainFingerprint',${fingerprint(providerTables)},
  'inquiryDomainFingerprint',${fingerprint(inquiryTables)},
  'providerCount',(SELECT count(*) FROM public.providers),
  'offeringCount',(SELECT count(*) FROM public.care_offerings),
  'publishedProviders',(SELECT count(*) FROM public.providers WHERE is_published),
  'inquiryRows',(SELECT sum(n) FROM (SELECT count(*) n FROM public.inquiry_contacts UNION ALL SELECT count(*) FROM public.inquiries UNION ALL SELECT count(*) FROM public.inquiry_referrals UNION ALL SELECT count(*) FROM public.inquiry_activities) q)
); ROLLBACK;`;

export function verifyState(state) {
  const projected = projectPublicProviders(state, manifest, { googleRegistry });
  const counts = Object.fromEntries(["ems", "domicile", "residence"].map((category) =>
    [category, projected.filter((provider) => provider.category === category).length]));
  assert.deepEqual(counts, { ems: 31, domicile: 80, residence: 0 });
  assert.equal(projected.length, 111);
  assert.equal(Object.keys(googleRegistry).length, 22);
  assert.equal(googleRegistry.nomad, undefined);
  assert.deepEqual(resolvePublicProviderRoute("homeinstead", projected, state, VAUD_V1_REDIRECTS),
    { kind: "redirect", slug: "dovida" });
  const legacy = new Set(legacyProviders.map(({ id }) => id));
  const canonical = new Set(projected.map(({ slug }) => slug));
  return { visible: projected.length, counts,
    exactLegacySlugs: [...legacy].filter((slug) => canonical.has(slug)).length,
    redirects: 1,
    removedOrHeldLegacy: [...legacy].filter((slug) => !canonical.has(slug) && slug !== "homeinstead").length,
    addedCanonical: [...canonical].filter((slug) => !legacy.has(slug)).length,
    googleApprovals: Object.keys(googleRegistry).length };
}

export function main(args) {
  assert.deepEqual(args, ["--verify-local"]);
  const state = JSON.parse(runLocalSql(localCutoverSql).trim());
  const integrity = JSON.parse(runLocalSql(integritySql).trim());
  assert.deepEqual({ providerCount: integrity.providerCount, offeringCount: integrity.offeringCount,
    publishedProviders: integrity.publishedProviders, inquiryRows: integrity.inquiryRows },
  { providerCount: 141, offeringCount: 111, publishedProviders: 0, inquiryRows: 0 });
  console.log(JSON.stringify({ ...verifyState(state), ...integrity, productionAccessed: false }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
