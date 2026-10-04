import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beginLocalSql, jsonSql } from "./local-provider-writer.mjs";

const packet = JSON.parse(readFileSync(new URL(
  "../docs/research/phase5f-home-care-identity-packets/canonical/avasad-cms.json",
  import.meta.url,
), "utf8"));
const manifest = JSON.parse(readFileSync(new URL(
  "../docs/research/phase5f-home-care-identity-packets/implementation-manifest.json",
  import.meta.url,
), "utf8"));
const names = [
  "CMS de Bussigny et Villars-Ste-Croix",
  "CMS d’Ecublens, Saint-Sulpice et Chavannes-près-Renens",
  "CMS de Renens Nord-Crissier", "CMS Renens Sud",
];

function stableUuid(key) {
  const hex = createHash("sha256").update(`lia:phase5f:batch-b3-apremadol:${key}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function compileBatchB3Apremadol() {
  const batch = manifest.safeBatches.find((item) => item.batchId === "B")
    ?.subBatches.find((item) => item.id === "B-APREMADOL");
  assert.deepEqual(batch, { id: "B-APREMADOL", providers: 4, provider_sources: 4,
    care_offerings: 4, care_offering_sources: 4, provider_organizations: 8,
    provider_identity_links: 4, regulatory_designations: 4, netNewRows: 32 });
  const sourceById = new Map(packet.sources.map((source) => [source.id, source]));
  const cmsSource = sourceById.get("cms-apremadol");
  const authority = sourceById.get("vd-home-care");
  const workbook = sourceById.get("phase5e-workbook");
  assert.ok(cmsSource?.url && authority?.url && workbook?.path);
  const identities = packet.identities.filter((identity) => identity.operator === "apremadol");
  assert.deepEqual(identities.map((identity) => identity.canonicalPublicName), names);
  assert.ok(identities.every((identity) => identity.sourceIds.length === 1
    && identity.sourceIds[0] === "cms-apremadol"));
  const providers = identities.map((identity) => ({
    identity_id: identity.identityId, id: stableUuid(`provider:${identity.identityId}`),
    legacy_id: null, slug: identity.identityId, name: identity.canonicalPublicName,
    primary_type: "domicile", subtypes: [], country_code: "CH", canton_code: null,
    municipality_id: null, postal_code: null, locality: null, street: null,
    house_number: null, latitude: null, longitude: null, phone: null, email: null,
    website: null, description: null, service_codes: [], language_codes: [], attributes: {},
    original_tags: [], original_location_text: null, status: "active",
    verification_status: "unverified", is_published: false, last_reviewed_at: null,
  }));
  const providerSources = providers.map((provider) => ({
    id: stableUuid(`provider-source:${provider.identity_id}`), provider_id: provider.id,
    source_type: "lia", source_name: "Lia Phase 5F canonical AVASAD/CMS identity packet",
    source_url: null, external_record_id: `${packet.packetId}:${provider.identity_id}`,
    accessed_on: packet.observedThrough, retrieved_at: null, reviewed_at: null,
    fields_supported: ["name", "primary_type"],
    notes: `Composite approved identity evidence: ${cmsSource.title} (${cmsSource.url}, accessed ${cmsSource.accessedOn}) supports the patient-facing CMS identity; ${authority.title} (${authority.url}, accessed ${authority.accessedOn}) and ${workbook.title} (${workbook.path}, observed ${workbook.observationDate}) support the CMS classification. No address, coverage, services, availability, capacity, languages, public-interest status, prices, publication, or verification are asserted.`,
  }));
  const sourceFor = (id) => providerSources.find((source) => source.provider_id === id);
  const offerings = providers.map((provider) => ({
    id: stableUuid(`offering:${provider.identity_id}:home-care`), provider_id: provider.id,
    slug: "home-care", name: "Aide et soins à domicile", offering_type: "home_care",
    summary: null, capacity_value: null, capacity_unit: null, long_stay: null,
    short_stay: null, respite_stay: null, admissions_notes: null, financing_notes: null,
    public_interest_status: null, pricing_notes: null, status: "active",
    verification_status: "unverified", is_published: false, last_reviewed_at: null,
  }));
  const providerOrganizations = providers.flatMap((provider) => [
    { provider_id: provider.id, organization_slug: "apremadol", relationship_type: "operator",
      is_primary: true, source_id: sourceFor(provider.id).id },
    { provider_id: provider.id, organization_slug: "avasad", relationship_type: "network",
      is_primary: false, source_id: sourceFor(provider.id).id },
  ]);
  const offeringSources = offerings.map((offering) => ({ provider_id: offering.provider_id,
    offering_id: offering.id, source_id: sourceFor(offering.provider_id).id,
    fields_supported: ["name", "offering_type"],
    notes: "Approved Phase 5F minimum home_care offering only; no service features or other enrichment.",
    reviewed_at: null }));
  const identityLinks = providers.map((provider) => ({ successor_provider_id: provider.id,
    relationship_type: "split_into", evidence_provider_id: provider.id,
    source_id: sourceFor(provider.id).id,
    notes: "The retired legacy AVASAD/CMS umbrella identity split into individually represented patient-facing CMS providers; no facts are inherited automatically." }));
  const designations = offerings.map((offering) => ({
    id: stableUuid(`designation:${offering.provider_id}:cms`), provider_id: offering.provider_id,
    offering_id: offering.id, designation_type: "classification",
    scheme: "vd_home_care_provider_class", designation_code: "cms",
    designation_label: "centres médico-sociaux", jurisdiction_country_code: "CH",
    jurisdiction_code: "VD", issuing_organization_id: null, designation_status: null,
    effective_on: null, expires_on: null,
    observed_on: packet.sharedProviderFacts.regulatoryDesignation.observedOn,
    source_id: sourceFor(offering.provider_id).id,
    notes: "Positive CMS classification only; status, effective dates, issuer, and broader regulatory class remain unknown.",
    is_published: false,
  }));
  return { batch, providers, providerSources, offerings, providerOrganizations,
    offeringSources, identityLinks, designations };
}

const rows = (value) => `jsonb_to_recordset(${jsonSql(value)})`;
const strippedProviders = (data) => data.providers.map(({ identity_id: _ignored, ...row }) => row);

export function buildBatchB3ApremadolApplySql({ rollback = false } = {}) {
  const data = compileBatchB3Apremadol();
  const providers = strippedProviders(data);
  return beginLocalSql + `
LOCK TABLE public.providers, public.provider_sources, public.organizations,
  public.organization_sources, public.organization_relationships, public.provider_organizations,
  public.care_offerings, public.care_offering_sources, public.care_offering_features,
  public.care_offering_availability, public.provider_service_areas, public.provider_identity_links,
  public.care_offering_regulatory_designations IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE lia_b3_before AS SELECT (SELECT count(*) FROM public.providers) providers,
  (SELECT count(*) FROM public.provider_sources) sources,
  (SELECT count(*) FROM public.provider_organizations) organizations,
  (SELECT count(*) FROM public.care_offerings) offerings,
  (SELECT count(*) FROM public.care_offering_sources) offering_sources,
  (SELECT count(*) FROM public.provider_identity_links) identity_links,
  (SELECT count(*) FROM public.care_offering_regulatory_designations) designations;
DO $guard$ BEGIN
  IF (SELECT count(*) FROM public.providers)<>82
    OR (SELECT count(*) FROM public.provider_sources)<>152
    OR (SELECT count(*) FROM public.organizations)<>30
    OR (SELECT count(*) FROM public.organization_sources)<>8
    OR (SELECT count(*) FROM public.organization_relationships)<>7
    OR (SELECT count(*) FROM public.provider_organizations)<>64
    OR (SELECT count(*) FROM public.care_offerings)<>48
    OR (SELECT count(*) FROM public.care_offering_sources)<>69
    OR (SELECT count(*) FROM public.care_offering_features)<>84
    OR (SELECT count(*) FROM public.care_offering_availability)<>0
    OR (SELECT count(*) FROM public.provider_service_areas)<>1
    OR (SELECT count(*) FROM public.provider_identity_links)<>16
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations)<>16
    OR (SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%')<>16 THEN
    RAISE EXCEPTION 'B3 requires exact applied B2 baseline';
  END IF;
  IF (SELECT count(*) FROM public.organizations WHERE
      (slug='avasad' AND id='6fa98f5f-c318-571d-a9eb-4f436f89ec82'::uuid)
      OR (slug='apremadol' AND id='ca1ad830-1be7-502f-ac1b-8192486b4fb2'::uuid))<>2 THEN
    RAISE EXCEPTION 'B3 organization precondition mismatch';
  END IF;
  IF EXISTS (SELECT FROM public.providers p JOIN ${rows(providers)} x(id uuid,slug text,name text)
      ON p.id=x.id OR p.slug=x.slug OR lower(btrim(p.name))=lower(btrim(x.name)))
    OR EXISTS (SELECT FROM public.provider_sources s JOIN ${rows(data.providerSources)} x(id uuid) ON s.id=x.id)
    OR EXISTS (SELECT FROM public.care_offerings o JOIN ${rows(data.offerings)} x(id uuid) ON o.id=x.id)
    OR EXISTS (SELECT FROM public.care_offering_regulatory_designations d
      JOIN ${rows(data.designations)} x(id uuid) ON d.id=x.id) THEN
    RAISE EXCEPTION 'B3 identity or deterministic ID collision';
  END IF;
END $guard$;
INSERT INTO public.providers (id,legacy_id,slug,name,primary_type,subtypes,country_code,canton_code,
  municipality_id,postal_code,locality,street,house_number,latitude,longitude,phone,email,website,
  description,service_codes,language_codes,attributes,original_tags,original_location_text,status,
  verification_status,is_published,last_reviewed_at)
SELECT id,legacy_id,slug,name,primary_type,subtypes,country_code,canton_code,municipality_id,
  postal_code,locality,street,house_number,latitude,longitude,phone,email,website,description,
  service_codes,language_codes,attributes,original_tags,original_location_text,status,
  verification_status,is_published,last_reviewed_at FROM ${rows(providers)} AS x(id uuid,
  legacy_id text,slug text,name text,primary_type text,subtypes text[],country_code text,
  canton_code text,municipality_id uuid,postal_code text,locality text,street text,house_number text,
  latitude numeric,longitude numeric,phone text,email text,website text,description text,
  service_codes text[],language_codes text[],attributes jsonb,original_tags text[],
  original_location_text text,status text,verification_status text,is_published boolean,
  last_reviewed_at timestamptz);
INSERT INTO public.provider_sources (id,provider_id,source_type,source_name,source_url,
  external_record_id,accessed_on,retrieved_at,reviewed_at,fields_supported,notes)
SELECT id,provider_id,source_type,source_name,source_url,external_record_id,accessed_on,retrieved_at,
  reviewed_at,fields_supported,notes FROM ${rows(data.providerSources)} AS x(id uuid,provider_id uuid,
  source_type text,source_name text,source_url text,external_record_id text,accessed_on date,
  retrieved_at timestamptz,reviewed_at timestamptz,fields_supported text[],notes text);
INSERT INTO public.provider_organizations (provider_id,organization_id,relationship_type,is_primary,source_id)
SELECT x.provider_id,o.id,x.relationship_type,x.is_primary,x.source_id
FROM ${rows(data.providerOrganizations)} x(provider_id uuid,organization_slug text,
  relationship_type text,is_primary boolean,source_id uuid) JOIN public.organizations o ON o.slug=x.organization_slug;
INSERT INTO public.care_offerings (id,provider_id,slug,name,offering_type,summary,capacity_value,
  capacity_unit,long_stay,short_stay,respite_stay,admissions_notes,financing_notes,
  public_interest_status,pricing_notes,status,verification_status,is_published,last_reviewed_at)
SELECT id,provider_id,slug,name,offering_type,summary,capacity_value,capacity_unit,long_stay,
  short_stay,respite_stay,admissions_notes,financing_notes,public_interest_status,pricing_notes,
  status,verification_status,is_published,last_reviewed_at FROM ${rows(data.offerings)} x(id uuid,
  provider_id uuid,slug text,name text,offering_type text,summary text,capacity_value integer,
  capacity_unit text,long_stay boolean,short_stay boolean,respite_stay boolean,admissions_notes text,
  financing_notes text,public_interest_status text,pricing_notes text,status text,
  verification_status text,is_published boolean,last_reviewed_at timestamptz);
INSERT INTO public.care_offering_sources (provider_id,offering_id,source_id,fields_supported,notes,reviewed_at)
SELECT provider_id,offering_id,source_id,fields_supported,notes,reviewed_at
FROM ${rows(data.offeringSources)} x(provider_id uuid,offering_id uuid,source_id uuid,
  fields_supported text[],notes text,reviewed_at timestamptz);
INSERT INTO public.provider_identity_links (predecessor_provider_id,successor_provider_id,
  relationship_type,evidence_provider_id,source_id,notes)
SELECT legacy.id,x.successor_provider_id,x.relationship_type,x.evidence_provider_id,x.source_id,x.notes
FROM ${rows(data.identityLinks)} x(successor_provider_id uuid,relationship_type text,
  evidence_provider_id uuid,source_id uuid,notes text) CROSS JOIN public.providers legacy
WHERE legacy.slug='avasad-cms';
INSERT INTO public.care_offering_regulatory_designations (id,provider_id,offering_id,
  designation_type,scheme,designation_code,designation_label,jurisdiction_country_code,
  jurisdiction_code,issuing_organization_id,designation_status,effective_on,expires_on,observed_on,
  source_id,notes,is_published)
SELECT id,provider_id,offering_id,designation_type,scheme,designation_code,designation_label,
  jurisdiction_country_code,jurisdiction_code,issuing_organization_id,designation_status,
  effective_on,expires_on,observed_on,source_id,notes,is_published FROM ${rows(data.designations)} x(
  id uuid,provider_id uuid,offering_id uuid,designation_type text,scheme text,designation_code text,
  designation_label text,jurisdiction_country_code text,jurisdiction_code text,
  issuing_organization_id uuid,designation_status text,effective_on date,expires_on date,
  observed_on date,source_id uuid,notes text,is_published boolean);
DO $verify$ BEGIN
  IF (SELECT count(*) FROM public.providers p JOIN ${rows(providers)} x(id uuid) ON p.id=x.id)<>4
    OR (SELECT count(*) FROM public.provider_sources s JOIN ${rows(data.providerSources)} x(id uuid) ON s.id=x.id)<>4
    OR (SELECT count(*) FROM public.provider_organizations po JOIN ${rows(providers)} x(id uuid) ON po.provider_id=x.id)<>8
    OR (SELECT count(*) FROM public.care_offerings o JOIN ${rows(data.offerings)} x(id uuid) ON o.id=x.id)<>4
    OR (SELECT count(*) FROM public.care_offering_sources s JOIN ${rows(data.offerings)} x(id uuid) ON s.offering_id=x.id)<>4
    OR (SELECT count(*) FROM public.provider_identity_links l JOIN ${rows(providers)} x(id uuid) ON l.successor_provider_id=x.id)<>4
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations d JOIN ${rows(data.designations)} x(id uuid) ON d.id=x.id)<>4
    OR EXISTS (SELECT FROM public.providers p JOIN ${rows(providers)} x(id uuid) ON p.id=x.id
      WHERE p.is_published OR p.verification_status<>'unverified' OR p.primary_type<>'domicile'
      OR p.canton_code IS NOT NULL OR p.municipality_id IS NOT NULL OR p.locality IS NOT NULL
      OR cardinality(p.service_codes)<>0 OR cardinality(p.language_codes)<>0)
    OR EXISTS (SELECT FROM public.provider_service_areas a JOIN ${rows(providers)} x(id uuid) ON a.provider_id=x.id)
    OR EXISTS (SELECT FROM public.care_offering_features f JOIN ${rows(providers)} x(id uuid) ON f.provider_id=x.id)
    OR EXISTS (SELECT FROM public.care_offering_availability a JOIN ${rows(providers)} x(id uuid) ON a.provider_id=x.id)
    OR (SELECT count(*) FROM public.providers)<>(SELECT providers+4 FROM lia_b3_before)
    OR (SELECT count(*) FROM public.provider_sources)<>(SELECT sources+4 FROM lia_b3_before)
    OR (SELECT count(*) FROM public.provider_organizations)<>(SELECT organizations+8 FROM lia_b3_before)
    OR (SELECT count(*) FROM public.care_offerings)<>(SELECT offerings+4 FROM lia_b3_before)
    OR (SELECT count(*) FROM public.care_offering_sources)<>(SELECT offering_sources+4 FROM lia_b3_before)
    OR (SELECT count(*) FROM public.provider_identity_links)<>(SELECT identity_links+4 FROM lia_b3_before)
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations)<>(SELECT designations+4 FROM lia_b3_before) THEN
    RAISE EXCEPTION 'B3 exact-row or safety verification failed';
  END IF;
END $verify$;
SET LOCAL ROLE anon;
DO $rls$ BEGIN
  IF EXISTS (SELECT FROM public.providers p JOIN ${rows(providers)} x(id uuid) ON p.id=x.id)
    OR EXISTS (SELECT FROM public.care_offerings o JOIN ${rows(data.offerings)} x(id uuid) ON o.id=x.id)
    OR has_table_privilege(current_user,'public.provider_sources','SELECT')
    OR has_table_privilege(current_user,'public.care_offering_sources','SELECT')
    OR has_table_privilege(current_user,'public.provider_identity_links','SELECT') THEN
    RAISE EXCEPTION 'Unpublished B3 data became public'; END IF;
END $rls$;
RESET ROLE;
SELECT jsonb_build_object('providersCreated',4,'providerSourcesCreated',4,
  'providerOrganizationsCreated',8,'careOfferingsCreated',4,'careOfferingSourcesCreated',4,
  'providerIdentityLinksCreated',4,'regulatoryDesignationsCreated',4,'netNewRows',32,
  'serviceAreasCreated',0,'featuresCreated',0);
${rollback ? "ROLLBACK" : "COMMIT"};
`;
}

export function buildBatchB3ApremadolRollbackSql() {
  const data = compileBatchB3Apremadol();
  const ids = data.providers.map(({ id }) => ({ id }));
  return beginLocalSql + `
LOCK TABLE public.providers, public.provider_sources, public.provider_organizations,
  public.care_offerings, public.care_offering_sources, public.provider_identity_links,
  public.care_offering_regulatory_designations IN SHARE ROW EXCLUSIVE MODE;
DELETE FROM public.care_offering_regulatory_designations d USING ${rows(data.designations)} x(id uuid) WHERE d.id=x.id;
DELETE FROM public.provider_identity_links l USING ${rows(ids)} x(id uuid) WHERE l.successor_provider_id=x.id;
DELETE FROM public.care_offering_sources s USING ${rows(data.offerings)} x(id uuid) WHERE s.offering_id=x.id;
DELETE FROM public.care_offerings o USING ${rows(data.offerings)} x(id uuid) WHERE o.id=x.id;
DELETE FROM public.provider_organizations po USING ${rows(ids)} x(id uuid) WHERE po.provider_id=x.id;
DELETE FROM public.provider_sources s USING ${rows(data.providerSources)} x(id uuid) WHERE s.id=x.id;
DELETE FROM public.providers p USING ${rows(ids)} x(id uuid) WHERE p.id=x.id;
COMMIT;
`;
}
