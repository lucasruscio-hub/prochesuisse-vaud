import { readFileSync } from "node:fs";
import { LOCAL_CONFIRMATION, parseLocalArgs, runLocalSql } from "../lib/local-provider-writer.mjs";

const args = parseLocalArgs(process.argv.slice(2));
if (args.mode === "--write-local") {
  const preflight = JSON.parse(runLocalSql(`SELECT jsonb_build_object(
    'providers',(SELECT count(*) FROM public.providers),
    'published',(SELECT count(*) FROM public.providers WHERE is_published),
    'verified',(SELECT count(*) FROM public.providers WHERE verification_status <> 'unverified'),
    'phase4Tables',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('organizations','provider_organizations','care_offerings',
        'care_offering_features','care_offering_sources','care_offering_availability')),
    'offeringScopeColumn',(SELECT count(*) FROM information_schema.columns
      WHERE table_schema='public' AND table_name='provider_service_areas' AND column_name='care_offering_id'));`).trim());
  if (preflight.providers !== 66 || preflight.published !== 0 || preflight.verified !== 0
    || !((preflight.phase4Tables === 0 && preflight.offeringScopeColumn === 0)
      || (preflight.phase4Tables === 6 && preflight.offeringScopeColumn === 0))) {
    throw new Error("Unexpected local provider or Phase 4A baseline");
  }
  const applied = [];
  if (preflight.phase4Tables === 0) {
    const foundation = readFileSync(new URL("../supabase/migrations/20260923000100_care_information_foundation.sql", import.meta.url), "utf8");
    runLocalSql(foundation);
    applied.push("20260923000100_care_information_foundation");
  }
  const scopedCoverage = readFileSync(new URL("../supabase/migrations/20260923000200_offering_scoped_service_areas.sql", import.meta.url), "utf8");
  runLocalSql(scopedCoverage);
  applied.push("20260923000200_offering_scoped_service_areas");
  console.log(JSON.stringify({ target: "verified-local-container", confirmation: LOCAL_CONFIRMATION,
    schemaApplied: applied, providerRowsChanged: 0, serviceAreaRowsChanged: 0 }, null, 2));
} else if (args.mode === "--verify-local") {
  const sql = readFileSync(new URL("../supabase/tests/care_information_dry_run.sql", import.meta.url), "utf8");
  runLocalSql(sql);
  const state = JSON.parse(runLocalSql(`SELECT jsonb_build_object(
    'providers',(SELECT count(*) FROM public.providers),
    'sources',(SELECT count(*) FROM public.provider_sources),
    'serviceAreas',(SELECT count(*) FROM public.provider_service_areas),
    'municipalities',(SELECT count(*) FROM public.municipalities),
    'publishedProviders',(SELECT count(*) FROM public.providers WHERE is_published),
    'verifiedProviders',(SELECT count(*) FROM public.providers WHERE verification_status <> 'unverified'),
    'organizations',(SELECT count(*) FROM public.organizations),
    'siteOrganizationLinks',(SELECT count(*) FROM public.provider_organizations),
    'offerings',(SELECT count(*) FROM public.care_offerings),
    'features',(SELECT count(*) FROM public.care_offering_features),
    'offeringSources',(SELECT count(*) FROM public.care_offering_sources),
    'availability',(SELECT count(*) FROM public.care_offering_availability),
    'offeringScopeColumn',(SELECT count(*) FROM information_schema.columns
      WHERE table_schema='public' AND table_name='provider_service_areas' AND column_name='care_offering_id'),
    'rlsTables',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('organizations','provider_organizations','care_offerings',
        'care_offering_features','care_offering_sources','care_offering_availability') AND c.relrowsecurity));`).trim());
  console.log(JSON.stringify({ target: "verified-local-container", fixturesPersisted: 0,
    phase4aChecks: "passed", state }, null, 2));
} else {
  throw new Error("Use --write-local with exact confirmation, or --verify-local");
}
