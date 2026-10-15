import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runLocalSql } from "../lib/local-provider-writer.mjs";
import { providers as legacyProviders } from "../lib/providers.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const architecturePath = resolve(root, "docs/architecture/vaud-v1-marketplace-data-cutover.md");
const manifestPath = resolve(root, "config/vaud-v1-publication-manifest.json");
const googleLocalPath = resolve(root, "config/google-place-approvals.local.json");
const googlePath = resolve(root, "config/google-place-approvals.json");
const reportPath = resolve(root, "docs/reports/vaud-v1-marketplace-reconciliation.md");

function slugsBetween(source, start, end) {
  const section = source.slice(source.indexOf(start), source.indexOf(end));
  assert.ok(section.startsWith(start), `Missing architecture section: ${start}`);
  return [...section.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)*)`/g)].map((match) => match[1]);
}

export function reviewedSlugs(source = readFileSync(architecturePath, "utf8")) {
  const ems = slugsBetween(source, "**EMS — 31 candidates:**", "**Home care/support — 80 candidates:**");
  const homeSection = source.slice(source.indexOf("**Home care/support — 80 candidates:**"), source.indexOf("The exclusions are exhaustive:"));
  const domicile = [...homeSection.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)*)`/g)].map((match) => match[1]);
  assert.equal(ems.length, 31);
  assert.equal(domicile.length, 80);
  assert.equal(new Set([...ems, ...domicile]).size, 111);
  return { ems, domicile };
}

export const localCutoverSql = `BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SELECT jsonb_build_object(
  'providers', (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.slug) FROM public.providers p),
  'providerSources', (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.provider_sources s),
  'offerings', (SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM public.care_offerings o),
  'offeringSources', (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.offering_id,s.source_id) FROM public.care_offering_sources s),
  'features', (SELECT jsonb_agg(to_jsonb(f) ORDER BY f.offering_id,f.feature_kind,f.feature_code) FROM public.care_offering_features f),
  'serviceAreas', (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.provider_service_areas a),
  'organizationLinks', (SELECT jsonb_agg(to_jsonb(l) ORDER BY l.provider_id,l.organization_id,l.relationship_type) FROM public.provider_organizations l),
  'organizations', (SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM public.organizations o),
  'identityLinks', (SELECT jsonb_agg(to_jsonb(l) ORDER BY l.predecessor_provider_id,l.successor_provider_id) FROM public.provider_identity_links l)
);
ROLLBACK;`;

export function buildManifest(state, architectureCommit = "272745e") {
  const groups = reviewedSlugs();
  const wanted = new Map([
    ...groups.ems.map((slug) => [slug, "ems"]),
    ...groups.domicile.map((slug) => [slug, "domicile"]),
  ]);
  const bySlug = new Map(state.providers.map((provider) => [provider.slug, provider]));
  const offeringSources = new Set((state.offeringSources ?? []).map((source) => source.offering_id));
  const activeSourcedProviders = new Set((state.offerings ?? [])
    .filter((offering) => offering.status === "active" && offeringSources.has(offering.id))
    .map((offering) => offering.provider_id));
  const entries = [...wanted].map(([slug, category]) => {
    const provider = bySlug.get(slug);
    assert.ok(provider, `Missing canonical provider: ${slug}`);
    assert.equal(provider.primary_type, category, `Category mismatch: ${slug}`);
    assert.equal(provider.status, "active", `Inactive manifest provider: ${slug}`);
    assert.equal(provider.is_published, false, `Manifest foundation expects an unpublished row: ${slug}`);
    assert.equal(provider.verification_status, "unverified", `Manifest foundation expects an unverified row: ${slug}`);
    assert.equal(provider.last_reviewed_at, null, `Manifest foundation expects no database publication review: ${slug}`);
    assert.ok(activeSourcedProviders.has(provider.id), `Provider lacks an active sourced offering: ${slug}`);
    return { id: provider.id, slug, category };
  }).sort((a, b) => a.slug.localeCompare(b.slug));
  return {
    schemaVersion: 1,
    cohort: "vaud-v1-marketplace",
    reviewedOn: "2026-10-13",
    approvalBasis: {
      document: "docs/architecture/vaud-v1-marketplace-data-cutover.md",
      commit: architectureCommit,
    },
    transitionalDatabaseState: {
      isPublished: false,
      verificationStatus: "unverified",
      lastReviewedAt: null,
    },
    providers: entries,
  };
}

export function buildGoogleRegistry(localRegistry, manifest) {
  const visible = new Set(manifest.providers.map(({ slug }) => slug));
  return Object.fromEntries(Object.entries(localRegistry)
    .filter(([slug, entry]) => visible.has(slug) && entry?.status === "approved")
    .sort(([a], [b]) => a.localeCompare(b)));
}

export function buildReconciliation(manifest) {
  const legacy = new Set(legacyProviders.map(({ id }) => id));
  const canonical = new Set(manifest.providers.map(({ slug }) => slug));
  const preserved = [...legacy].filter((slug) => canonical.has(slug)).sort();
  const removed = [...legacy].filter((slug) => !canonical.has(slug) && slug !== "homeinstead").sort();
  const added = [...canonical].filter((slug) => !legacy.has(slug)).sort();
  const counts = manifest.providers.reduce((result, provider) => {
    result[provider.category] = (result[provider.category] ?? 0) + 1;
    return result;
  }, {});
  const lines = (items) => items.length ? items.map((item) => `\`${item}\``).join(", ") : "None";
  return `# Vaud V1 marketplace reconciliation\n\nGenerated from the architecture-approved manifest and the canonical local provider repository. Production was not accessed.\n\n## Cohort summary\n\n| Cohort | EMS | Home care/support | Senior residences | Total |\n|---|---:|---:|---:|---:|\n| Legacy static visible | 46 | 12 | 8 | 66 |\n| Canonical V1 visible | ${counts.ems ?? 0} | ${counts.domicile ?? 0} | ${counts.residence ?? 0} | ${manifest.providers.length} |\n\n- Exact legacy slugs preserved: **${preserved.length}**.\n- Certain permanent redirect: **1** (\`homeinstead\` → \`dovida\`).\n- Legacy identities removed or held without redirect: **${removed.length}**.\n- Canonical-only identities added: **${added.length}**.\n\n## Preserved exact slugs\n\n${lines(preserved)}\n\n## Removed or held legacy identities\n\n${lines(removed)}\n\nNo speculative redirect is defined for these identities. They return the non-indexed unavailable response.\n\n## Added canonical identities\n\n${lines(added)}\n\n## Field losses and degradations\n\n- Legacy \`original_tags\` no longer appear as public facts or search filters. Canonical badges come only from sourced offering fields and controlled features.\n- The unsupported \`Vue lac\` filter is removed. \`Alzheimer\`, \`Court séjour\`, and \`Public\` appear only when canonical evidence supports the corresponding badge.\n- A home-care office location remains a display location and is not presented as service coverage.\n- Providers without reviewed street details show locality/postcode only; missing locality is shown as \`Canton de Vaud\` rather than inferred.\n- All eight legacy residence identities remain held, so the residence tab is preserved with a zero-result state.\n- Missing hero media retains the decorative fallback. Missing approved Google identity or request-time data renders no external rating.\n- Google ratings, review counts, review text, and photo URLs remain request-time external data and are not durable Lia provider facts.\n`;
}

export function main(args) {
  assert.deepEqual(args, ["--write-local", "--confirm", "Lia-vaud:local:54322"]);
  const state = JSON.parse(runLocalSql(localCutoverSql).trim());
  const manifest = buildManifest(state);
  const google = buildGoogleRegistry(JSON.parse(readFileSync(googleLocalPath, "utf8")), manifest);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(googlePath, `${JSON.stringify(google, null, 2)}\n`);
  writeFileSync(reportPath, buildReconciliation(manifest));
  console.log(JSON.stringify({ providers: manifest.providers.length,
    ems: manifest.providers.filter(({ category }) => category === "ems").length,
    domicile: manifest.providers.filter(({ category }) => category === "domicile").length,
    googleApprovals: Object.keys(google).length }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
