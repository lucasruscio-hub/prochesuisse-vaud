import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { inspectLegacyProviders } from "./ingest-legacy-providers.mjs";
import { buildSenevitaCarePacket, validateSenevitaCanonicalPacket, validateSenevitaReviewPacket }
  from "../lib/senevita-home-care-review.mjs";
import { buildCareApplySql } from "../lib/care-review-apply.mjs";
import { inspectLocalTarget, LOCAL_CONFIRMATION, runLocalSql } from "../lib/local-provider-writer.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { projectReviewedCareDetail } from "../lib/provider-care-projection.js";

const reviewUrl = new URL("../docs/research/phase5d-senevita-home-care/senevita-vaud-care.review.json", import.meta.url);
const canonicalUrl = new URL("../docs/research/phase5d-senevita-home-care/canonical/senevita-vaud-care.json", import.meta.url);
const phase3Url = new URL("../docs/research/phase3b-pilots/canonical/senevita-vaud.json", import.meta.url);
const raw = JSON.parse(readFileSync(reviewUrl, "utf8"));
const canonical = JSON.parse(readFileSync(canonicalUrl, "utf8"));
const phase3 = JSON.parse(readFileSync(phase3Url, "utf8"));
const legacy = inspectLegacyProviders().rows.find((row) => row.legacyId === "senevita-vaud")?.provider;
if (!legacy) throw new Error("Senevita legacy baseline is missing");
const phase3Patch = Object.fromEntries(phase3.claims.filter((claim) => claim.target)
  .map((claim) => [claim.target, claim.value]));
export const expectedProvider = { ...legacy, ...phase3Patch };

const stateSql = `SELECT jsonb_build_object(
  'providers',(SELECT count(*) FROM public.providers),
  'providerSources',(SELECT count(*) FROM public.provider_sources),
  'organizations',(SELECT count(*) FROM public.organizations),
  'relationships',(SELECT count(*) FROM public.provider_organizations),
  'offerings',(SELECT count(*) FROM public.care_offerings),
  'features',(SELECT count(*) FROM public.care_offering_features),
  'offeringSources',(SELECT count(*) FROM public.care_offering_sources),
  'serviceAreas',(SELECT count(*) FROM public.provider_service_areas),
  'narrativeServiceAreas',(SELECT count(*) FROM public.provider_service_areas WHERE coverage_type='region'),
  'structuredServiceAreas',(SELECT count(*) FROM public.provider_service_areas WHERE coverage_type IN ('canton','municipality')),
  'municipalities',(SELECT count(*) FROM public.municipalities),
  'availability',(SELECT count(*) FROM public.care_offering_availability),
  'enrichedEms',(SELECT count(DISTINCT p.id) FROM public.providers p JOIN public.care_offerings o ON o.provider_id=p.id WHERE p.primary_type='ems'),
  'otherHomeCareOfferings',(SELECT count(*) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.primary_type='domicile' AND p.slug<>'senevita-vaud'),
  'senevitaOrganizations',(SELECT count(*) FROM public.provider_organizations po JOIN public.providers p ON p.id=po.provider_id WHERE p.slug='senevita-vaud'),
  'senevitaOfferings',(SELECT count(*) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.slug='senevita-vaud'),
  'senevitaFeatures',(SELECT count(*) FROM public.care_offering_features f JOIN public.providers p ON p.id=f.provider_id WHERE p.slug='senevita-vaud'),
  'senevitaOfferingSources',(SELECT count(*) FROM public.care_offering_sources os JOIN public.providers p ON p.id=os.provider_id WHERE p.slug='senevita-vaud'),
  'senevitaServiceAreas',(SELECT count(*) FROM public.provider_service_areas a JOIN public.providers p ON p.id=a.provider_id WHERE p.slug='senevita-vaud'),
  'publishedProviders',(SELECT count(*) FROM public.providers WHERE is_published),
  'verifiedProviders',(SELECT count(*) FROM public.providers WHERE verification_status<>'unverified'),
  'publishedOrganizations',(SELECT count(*) FROM public.organizations WHERE is_published),
  'verifiedOrganizations',(SELECT count(*) FROM public.organizations WHERE verification_status<>'unverified'),
  'publishedOfferings',(SELECT count(*) FROM public.care_offerings WHERE is_published),
  'verifiedOfferings',(SELECT count(*) FROM public.care_offerings WHERE verification_status<>'unverified'),
  'emsFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers ep ON ep.id=o.provider_id WHERE ep.primary_type='ems'),
    'features',(SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.offering_id,f.feature_kind,f.feature_code),'[]'::jsonb) FROM public.care_offering_features f JOIN public.providers ep ON ep.id=f.provider_id WHERE ep.primary_type='ems'),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers ep ON ep.id=a.provider_id WHERE ep.primary_type='ems'))::text FROM public.providers p WHERE p.primary_type='ems')),
  'otherHomeFingerprint',md5((SELECT jsonb_build_object(
    'providers',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),
    'offerings',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM public.care_offerings o JOIN public.providers hp ON hp.id=o.provider_id WHERE hp.primary_type='domicile' AND hp.slug<>'senevita-vaud'),
    'areas',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]'::jsonb) FROM public.provider_service_areas a JOIN public.providers hp ON hp.id=a.provider_id WHERE hp.primary_type='domicile' AND hp.slug<>'senevita-vaud'))::text FROM public.providers p WHERE p.primary_type='domicile' AND p.slug<>'senevita-vaud')),
  'municipalityFingerprint',md5((SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.id),'[]'::jsonb)::text FROM public.municipalities m))
);`;

function checkedPacket() {
  validateSenevitaReviewPacket(raw);
  validateSenevitaCanonicalPacket(canonical, raw);
  return canonical;
}
const localState = () => JSON.parse(runLocalSql(stateSql).trim());
const unchangedKeys = ["enrichedEms", "otherHomeCareOfferings", "publishedProviders", "verifiedProviders",
  "publishedOrganizations", "verifiedOrganizations", "publishedOfferings", "verifiedOfferings",
  "emsFingerprint", "otherHomeFingerprint", "municipalities", "municipalityFingerprint", "availability"];

function assertRegression(before, after) {
  for (const key of unchangedKeys) {
    if (before[key] !== after[key]) throw new Error(`Regression guard changed: ${key}`);
  }
  if (after.enrichedEms !== 31 || after.otherHomeCareOfferings !== 0
    || after.structuredServiceAreas !== 0 || after.senevitaOrganizations !== 1
    || after.senevitaOfferings !== 1 || after.senevitaFeatures !== 11
    || after.senevitaServiceAreas !== 1) throw new Error("Unexpected Phase 5D post-apply counts");
}

function verifyProjection() {
  const snapshot = JSON.parse(runLocalSql(buildLocalProviderDetailSql("senevita-vaud")).trim());
  const detail = projectReviewedCareDetail(snapshot);
  if (!detail || detail.offerings.length !== 1 || detail.offerings[0].services.length !== 10
    || detail.offerings[0].careProfiles.length !== 1
    || JSON.stringify(detail.offerings[0].coverage) !== JSON.stringify(["dans la région de Vaud"])
    || !detail.admissions || !detail.pricing || detail.offerings[0].unknownNotice == null) {
    throw new Error("Senevita provider-page projection is missing or unsafe");
  }
  return { provider: snapshot.provider.slug, providerPublished: snapshot.provider.is_published,
    providerVerification: snapshot.provider.verification_status, organizations: snapshot.organizationLinks.length,
    offerings: snapshot.offerings.length, features: snapshot.offerings[0].features.length,
    serviceAreas: snapshot.serviceAreaCount, projectedDetail: detail };
}

export function main(args) {
  if (args.length === 1 && args[0] === "--check") {
    console.log(JSON.stringify({ mode: "check", review: validateSenevitaReviewPacket(raw),
      canonical: validateSenevitaCanonicalPacket(canonical, raw) }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === "--dry-run-local") {
    const target = inspectLocalTarget();
    const result = JSON.parse(runLocalSql(buildCareApplySql(checkedPacket(), expectedProvider, { rollback: true })).trim());
    console.log(JSON.stringify({ mode: "dry-run-local", databaseWrites: 0, target, result }, null, 2));
    return;
  }
  if (args.length === 3 && args[0] === "--write-local" && args[1] === "--confirm"
    && args[2] === LOCAL_CONFIRMATION) {
    const target = inspectLocalTarget();
    const before = localState();
    const applied = JSON.parse(runLocalSql(buildCareApplySql(checkedPacket(), expectedProvider)).trim());
    const after = localState();
    assertRegression(before, after);
    console.log(JSON.stringify({ mode: "write-local", target, applied, before, after,
      regression: { enrichedEmsUnchanged: true, otherHomeCareUnchanged: true,
        publicationAndVerificationUnchanged: true, municipalitiesUnchanged: true } }, null, 2));
    return;
  }
  if (args.length === 1 && args[0] === "--verify-local") {
    const target = inspectLocalTarget();
    const state = localState();
    if (state.enrichedEms !== 31 || state.otherHomeCareOfferings !== 0
      || state.structuredServiceAreas !== 0) throw new Error("Local regression verification failed");
    console.log(JSON.stringify({ mode: "verify-local", databaseWrites: 0, target,
      projection: verifyProjection(), database: state }, null, 2));
    return;
  }
  throw new Error("Use --check, --dry-run-local, --write-local --confirm Lia-vaud:local:54322, or --verify-local");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
