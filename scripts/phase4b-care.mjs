import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { inspectLegacyProviders } from "./ingest-legacy-providers.mjs";
import { buildBoveressesCarePacket, validateBoveressesCarePacket } from "../lib/care-review-packet.mjs";
import { buildBoveressesCareApplySql } from "../lib/care-review-apply.mjs";
import { LOCAL_CONFIRMATION, runLocalSql } from "../lib/local-provider-writer.mjs";
import { buildLocalProviderDetailSql } from "./read-local-provider-detail.mjs";
import { projectBoveressesCareDetail } from "../lib/provider-care-projection.js";

const phase3Url = new URL("../docs/research/phase3b-pilots/canonical/ems-boveresses.json", import.meta.url);
const packetUrl = new URL("../docs/research/phase4b-pilots/canonical/ems-boveresses-care.json", import.meta.url);
const phase3 = JSON.parse(readFileSync(phase3Url, "utf8"));
const legacy = inspectLegacyProviders().rows.find((row) => row.legacyId === "ems-boveresses")?.provider;
if (!legacy) throw new Error("Boveresses legacy baseline is missing");
const phase3Patch = Object.fromEntries(phase3.claims.filter((claim) => claim.target)
  .map((claim) => [claim.target, claim.value]));
export const expectedProvider = { ...legacy, ...phase3Patch };

export function reviewedPacket() {
  const expected = buildBoveressesCarePacket(phase3);
  const actual = JSON.parse(readFileSync(packetUrl, "utf8"));
  const compared = structuredClone(actual);
  compared.approval.localApply = false;
  if (JSON.stringify(compared) !== JSON.stringify(expected)) throw new Error("Stale or altered Phase 4B care packet");
  validateBoveressesCarePacket(actual);
  return actual;
}

export function main(args) {
  if (args.length === 1 && args[0] === "--write-packet") {
    mkdirSync(new URL("../docs/research/phase4b-pilots/canonical/", import.meta.url), { recursive: true });
    const packet = buildBoveressesCarePacket(phase3);
    writeFileSync(packetUrl, `${JSON.stringify(packet, null, 2)}\n`);
    console.log(JSON.stringify({ mode: "write-packet", databaseWrites: 0, provider: "ems-boveresses" }, null, 2));
    return;
  }
  if (args.length === 1 && ["--check-packet", "--dry-run"].includes(args[0])) {
    const packet = reviewedPacket();
    console.log(JSON.stringify({ mode: args[0].slice(2), databaseWrites: 0, provider: packet.identity.slug,
      ...validateBoveressesCarePacket(packet), importedFacts: {
        organization: packet.organizations.length, offering: packet.offerings.length, capacity: 1, stayModes: 1,
        careProfiles: 0, services: packet.offerings[0].features.length, facilities: 0,
      }, deferred: packet.deferred }, null, 2));
    return;
  }
  if (args.length === 3 && args[0] === "--write-local"
    && args[1] === "--confirm" && args[2] === LOCAL_CONFIRMATION) {
    console.log(runLocalSql(buildBoveressesCareApplySql(reviewedPacket(), expectedProvider)).trim());
    return;
  }
  if (args.length === 1 && args[0] === "--verify-local") {
    const snapshot = JSON.parse(runLocalSql(buildLocalProviderDetailSql("ems-boveresses")).trim());
    const detail = projectBoveressesCareDetail(snapshot);
    if (!detail) throw new Error("Local Boveresses care state is missing or unsafe");
    const database = JSON.parse(runLocalSql(`SELECT jsonb_build_object(
      'providers',(SELECT count(*) FROM public.providers),
      'providerSources',(SELECT count(*) FROM public.provider_sources),
      'serviceAreas',(SELECT count(*) FROM public.provider_service_areas),
      'municipalities',(SELECT count(*) FROM public.municipalities),
      'organizations',(SELECT count(*) FROM public.organizations),
      'relationships',(SELECT count(*) FROM public.provider_organizations),
      'offerings',(SELECT count(*) FROM public.care_offerings),
      'features',(SELECT count(*) FROM public.care_offering_features),
      'offeringSources',(SELECT count(*) FROM public.care_offering_sources),
      'availability',(SELECT count(*) FROM public.care_offering_availability),
      'publishedProviders',(SELECT count(*) FROM public.providers WHERE is_published),
      'verifiedProviders',(SELECT count(*) FROM public.providers WHERE verification_status <> 'unverified'),
      'publishedOrganizations',(SELECT count(*) FROM public.organizations WHERE is_published),
      'publishedOfferings',(SELECT count(*) FROM public.care_offerings WHERE is_published),
      'novaCareRows',(SELECT count(*) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.slug='nova-via'),
      'senevitaCareRows',(SELECT count(*) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.slug='senevita-vaud'),
      'anonProviderSourcesPrivilege',has_table_privilege('anon','public.provider_sources','SELECT'),
      'anonOfferingSourcesPrivilege',has_table_privilege('anon','public.care_offering_sources','SELECT'));
    `).trim());
    console.log(JSON.stringify({ mode: "verify-local", databaseWrites: 0,
      provider: snapshot.provider.slug, providerPublished: snapshot.provider.is_published,
      providerVerification: snapshot.provider.verification_status,
      organizations: snapshot.organizationLinks.length, offerings: snapshot.offerings.length,
      features: snapshot.offerings[0].features.length,
      offeringSources: snapshot.offerings[0].sources.length,
      serviceAreas: snapshot.serviceAreaCount, projectedDetail: detail, database }, null, 2));
    return;
  }
  throw new Error("Use --write-packet, --check-packet, --dry-run, --write-local --confirm Lia-vaud:local:54322, or --verify-local");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
