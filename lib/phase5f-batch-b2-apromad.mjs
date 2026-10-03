import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beginLocalSql, jsonSql } from "./local-provider-writer.mjs";
import { compileBatchB1Fsl } from "./phase5f-batch-b1-fsl.mjs";

const packet = JSON.parse(readFileSync(new URL(
  "../docs/research/phase5f-home-care-identity-packets/canonical/avasad-cms.json",
  import.meta.url,
), "utf8"));
const manifest = JSON.parse(readFileSync(new URL(
  "../docs/research/phase5f-home-care-identity-packets/implementation-manifest.json",
  import.meta.url,
), "utf8"));

const expectedNames = [
  "CMS de Cully", "CMS d’Echallens", "CMS d’Epalinges", "CMS du Mont",
  "CMS d’Oron", "CMS de Prilly Nord", "CMS de Prilly Sud", "CMS de Pully",
];

function stableUuid(key) {
  const hex = createHash("sha256").update(`lia:phase5f:batch-b2-apromad:${key}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function compileBatchB2Apromad() {
  const batchB = manifest.safeBatches.find((item) => item.batchId === "B");
  const subBatch = batchB?.subBatches.find((item) => item.id === "B-APROMAD");
  assert.deepEqual(subBatch, {
    id: "B-APROMAD", providers: 8, provider_sources: 8, care_offerings: 8,
    care_offering_sources: 8, provider_organizations: 16, provider_identity_links: 8,
    regulatory_designations: 8, netNewRows: 64,
  });
  assert.deepEqual({ ...subBatch, id: "B-FSL" }, compileBatchB1Fsl().subBatch,
    "B2 legitimately differs from B1 structure; revise the manifest before implementation");

  const sourceById = new Map(packet.sources.map((source) => [source.id, source]));
  const cmsSource = sourceById.get("cms-apromad");
  const authoritySource = sourceById.get("vd-home-care");
  const workbookSource = sourceById.get("phase5e-workbook");
  assert.ok(cmsSource?.url && authoritySource?.url && workbookSource?.path);
  const identities = packet.identities.filter((identity) => identity.operator === "apromad");
  assert.deepEqual(identities.map((identity) => identity.canonicalPublicName), expectedNames);
  assert.ok(identities.every((identity) => identity.sourceIds.length === 1
    && identity.sourceIds[0] === "cms-apromad"));

  const providers = identities.map((identity) => ({
    identity_id: identity.identityId,
    id: stableUuid(`provider:${identity.identityId}`),
    legacy_id: null,
    slug: identity.identityId,
    name: identity.canonicalPublicName,
    primary_type: "domicile",
    subtypes: [], country_code: "CH", canton_code: null, municipality_id: null,
    postal_code: null, locality: null, street: null, house_number: null,
    latitude: null, longitude: null, phone: null, email: null, website: null,
    description: null, service_codes: [], language_codes: [], attributes: {},
    original_tags: [], original_location_text: null, status: "active",
    verification_status: "unverified", is_published: false, last_reviewed_at: null,
  }));
  const providerSources = providers.map((provider) => ({
    id: stableUuid(`provider-source:${provider.identity_id}`),
    provider_id: provider.id,
    source_type: "lia",
    source_name: "Lia Phase 5F canonical AVASAD/CMS identity packet",
    source_url: null,
    external_record_id: `${packet.packetId}:${provider.identity_id}`,
    accessed_on: packet.observedThrough,
    retrieved_at: null,
    reviewed_at: null,
    fields_supported: ["name", "primary_type"],
    notes: `Composite approved identity evidence: ${cmsSource.title} (${cmsSource.url}, accessed ${cmsSource.accessedOn}) supports the patient-facing CMS identity; ${authoritySource.title} (${authoritySource.url}, accessed ${authoritySource.accessedOn}) and ${workbookSource.title} (${workbookSource.path}, observed ${workbookSource.observationDate}) support the CMS classification. No address, coverage, services, availability, capacity, languages, public-interest status, prices, publication, or verification are asserted.`,
  }));
  const offerings = providers.map((provider) => ({
    id: stableUuid(`offering:${provider.identity_id}:home-care`),
    provider_id: provider.id, slug: "home-care", name: "Aide et soins à domicile",
    offering_type: "home_care", summary: null, capacity_value: null, capacity_unit: null,
    long_stay: null, short_stay: null, respite_stay: null, admissions_notes: null,
    financing_notes: null, public_interest_status: null, pricing_notes: null,
    status: "active", verification_status: "unverified", is_published: false,
    last_reviewed_at: null,
  }));
  const sourceFor = (providerId) => providerSources.find((item) => item.provider_id === providerId);
  const providerOrganizations = providers.flatMap((provider) => {
    const source = sourceFor(provider.id);
    return [
      { provider_id: provider.id, organization_slug: "apromad",
        relationship_type: "operator", is_primary: true, source_id: source.id },
      { provider_id: provider.id, organization_slug: "avasad",
        relationship_type: "network", is_primary: false, source_id: source.id },
    ];
  });
  const offeringSources = offerings.map((offering) => ({
    provider_id: offering.provider_id, offering_id: offering.id,
    source_id: sourceFor(offering.provider_id).id,
    fields_supported: ["name", "offering_type"],
    notes: "Approved Phase 5F minimum home_care offering only; no service features or other enrichment.",
    reviewed_at: null,
  }));
  const identityLinks = providers.map((provider) => ({
    successor_provider_id: provider.id, relationship_type: "split_into",
    evidence_provider_id: provider.id, source_id: sourceFor(provider.id).id,
    notes: "The retired legacy AVASAD/CMS umbrella identity split into individually represented patient-facing CMS providers; no facts are inherited automatically.",
  }));
  const designations = offerings.map((offering) => ({
    id: stableUuid(`designation:${offering.provider_id}:cms`),
    provider_id: offering.provider_id, offering_id: offering.id,
    designation_type: "classification", scheme: "vd_home_care_provider_class",
    designation_code: "cms", designation_label: "centres médico-sociaux",
    jurisdiction_country_code: "CH", jurisdiction_code: "VD",
    issuing_organization_id: null, designation_status: null, effective_on: null,
    expires_on: null, observed_on: packet.sharedProviderFacts.regulatoryDesignation.observedOn,
    source_id: sourceFor(offering.provider_id).id,
    notes: "Positive CMS classification only; status, effective dates, issuer, and broader regulatory class remain unknown.",
    is_published: false,
  }));
  return { batchB, subBatch, providers, providerSources, offerings, offeringSources,
    providerOrganizations, identityLinks, designations, priorProviders: compileBatchB1Fsl().providers };
}

const rows = (value) => `jsonb_to_recordset(${jsonSql(value)})`;
const strip = (items, key) => items.map(({ [key]: _ignored, ...item }) => item);

export function buildBatchB2ApromadApplySql({ rollback = false } = {}) {
  const data = compileBatchB2Apromad();
  const providers = strip(data.providers, "identity_id");
  const priorProviders = strip(data.priorProviders, "identity_id");
  return beginLocalSql + `
LOCK TABLE public.providers, public.provider_sources, public.organizations,
  public.organization_sources, public.organization_relationships, public.provider_organizations,
  public.care_offerings, public.care_offering_sources, public.care_offering_features,
  public.care_offering_availability, public.provider_service_areas, public.provider_identity_links,
  public.care_offering_regulatory_designations IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE lia_batch_b2_before AS SELECT
  (SELECT count(*) FROM public.providers) providers,
  (SELECT count(*) FROM public.provider_sources) provider_sources,
  (SELECT count(*) FROM public.provider_organizations) provider_organizations,
  (SELECT count(*) FROM public.care_offerings) care_offerings,
  (SELECT count(*) FROM public.care_offering_sources) care_offering_sources,
  (SELECT count(*) FROM public.provider_identity_links) provider_identity_links,
  (SELECT count(*) FROM public.care_offering_regulatory_designations) regulatory_designations;
DO $guard$
BEGIN
  IF (SELECT count(*) FROM public.providers) <> 74
    OR (SELECT count(*) FROM public.provider_sources) <> 144
    OR (SELECT count(*) FROM public.organizations) <> 30
    OR (SELECT count(*) FROM public.organization_sources) <> 8
    OR (SELECT count(*) FROM public.organization_relationships) <> 7
    OR (SELECT count(*) FROM public.provider_organizations) <> 48
    OR (SELECT count(*) FROM public.care_offerings) <> 40
    OR (SELECT count(*) FROM public.care_offering_features) <> 84
    OR (SELECT count(*) FROM public.care_offering_sources) <> 61
    OR (SELECT count(*) FROM public.care_offering_availability) <> 0
    OR (SELECT count(*) FROM public.provider_service_areas) <> 1
    OR (SELECT count(*) FROM public.provider_identity_links) <> 8
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations) <> 8
    OR (SELECT count(*) FROM public.providers p JOIN ${rows(priorProviders)} x(id uuid,slug text,name text)
      ON p.id=x.id AND p.slug=x.slug AND p.name=x.name WHERE p.status='active' AND NOT p.is_published
      AND p.verification_status='unverified') <> 8
    OR (SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%') <> 8 THEN
    RAISE EXCEPTION 'B2 requires the exact applied B1 baseline';
  END IF;
  IF (SELECT count(*) FROM public.organizations WHERE
      (slug='avasad' AND id='6fa98f5f-c318-571d-a9eb-4f436f89ec82'::uuid)
      OR (slug='apromad' AND id='1d350349-7e3b-5beb-a16e-29737c561cb7'::uuid)) <> 2
    OR (SELECT count(*) FROM public.providers WHERE slug='avasad-cms'
      AND id='14b8abc0-33da-4b2e-9ebb-7a2046024c0f'::uuid AND status='archived'
      AND NOT is_published AND verification_status='unverified') <> 1 THEN
    RAISE EXCEPTION 'B2 Batch A identity precondition mismatch';
  END IF;
  IF EXISTS (SELECT FROM public.providers p JOIN ${rows(providers)} x(id uuid,slug text,name text)
      ON p.id=x.id OR p.slug=x.slug OR lower(btrim(p.name))=lower(btrim(x.name)))
    OR EXISTS (SELECT FROM public.provider_sources s JOIN ${rows(data.providerSources)} x(id uuid) ON s.id=x.id)
    OR EXISTS (SELECT FROM public.care_offerings o JOIN ${rows(data.offerings)} x(id uuid) ON o.id=x.id)
    OR EXISTS (SELECT FROM public.care_offering_regulatory_designations d
      JOIN ${rows(data.designations)} x(id uuid) ON d.id=x.id) THEN
    RAISE EXCEPTION 'B2 identity or deterministic ID already exists/collides';
  END IF;
END $guard$;
INSERT INTO public.providers
  (id,legacy_id,slug,name,primary_type,subtypes,country_code,canton_code,municipality_id,
   postal_code,locality,street,house_number,latitude,longitude,phone,email,website,description,
   service_codes,language_codes,attributes,original_tags,original_location_text,status,
   verification_status,is_published,last_reviewed_at)
SELECT id,legacy_id,slug,name,primary_type,subtypes,country_code,canton_code,municipality_id,
  postal_code,locality,street,house_number,latitude,longitude,phone,email,website,description,
  service_codes,language_codes,attributes,original_tags,original_location_text,status,
  verification_status,is_published,last_reviewed_at
FROM ${rows(providers)} AS x(id uuid,legacy_id text,slug text,name text,primary_type text,
  subtypes text[],country_code text,canton_code text,municipality_id uuid,postal_code text,
  locality text,street text,house_number text,latitude numeric,longitude numeric,phone text,
  email text,website text,description text,service_codes text[],language_codes text[],attributes jsonb,
  original_tags text[],original_location_text text,status text,verification_status text,
  is_published boolean,last_reviewed_at timestamptz);
INSERT INTO public.provider_sources
  (id,provider_id,source_type,source_name,source_url,external_record_id,accessed_on,retrieved_at,
   reviewed_at,fields_supported,notes)
SELECT id,provider_id,source_type,source_name,source_url,external_record_id,accessed_on,retrieved_at,
  reviewed_at,fields_supported,notes FROM ${rows(data.providerSources)} AS x(id uuid,provider_id uuid,
  source_type text,source_name text,source_url text,external_record_id text,accessed_on date,
  retrieved_at timestamptz,reviewed_at timestamptz,fields_supported text[],notes text);
INSERT INTO public.provider_organizations
  (provider_id,organization_id,relationship_type,is_primary,source_id)
SELECT x.provider_id,o.id,x.relationship_type,x.is_primary,x.source_id
FROM ${rows(data.providerOrganizations)} AS x(provider_id uuid,organization_slug text,
  relationship_type text,is_primary boolean,source_id uuid)
JOIN public.organizations o ON o.slug=x.organization_slug;
INSERT INTO public.care_offerings
  (id,provider_id,slug,name,offering_type,summary,capacity_value,capacity_unit,long_stay,
   short_stay,respite_stay,admissions_notes,financing_notes,public_interest_status,pricing_notes,
   status,verification_status,is_published,last_reviewed_at)
SELECT id,provider_id,slug,name,offering_type,summary,capacity_value,capacity_unit,long_stay,
  short_stay,respite_stay,admissions_notes,financing_notes,public_interest_status,pricing_notes,
  status,verification_status,is_published,last_reviewed_at
FROM ${rows(data.offerings)} AS x(id uuid,provider_id uuid,slug text,name text,offering_type text,
  summary text,capacity_value integer,capacity_unit text,long_stay boolean,short_stay boolean,
  respite_stay boolean,admissions_notes text,financing_notes text,public_interest_status text,
  pricing_notes text,status text,verification_status text,is_published boolean,last_reviewed_at timestamptz);
INSERT INTO public.care_offering_sources
  (provider_id,offering_id,source_id,fields_supported,notes,reviewed_at)
SELECT provider_id,offering_id,source_id,fields_supported,notes,reviewed_at
FROM ${rows(data.offeringSources)} AS x(provider_id uuid,offering_id uuid,source_id uuid,
  fields_supported text[],notes text,reviewed_at timestamptz);
INSERT INTO public.provider_identity_links
  (predecessor_provider_id,successor_provider_id,relationship_type,evidence_provider_id,source_id,notes)
SELECT legacy.id,x.successor_provider_id,x.relationship_type,x.evidence_provider_id,x.source_id,x.notes
FROM ${rows(data.identityLinks)} AS x(successor_provider_id uuid,relationship_type text,
  evidence_provider_id uuid,source_id uuid,notes text)
CROSS JOIN public.providers legacy WHERE legacy.slug='avasad-cms';
INSERT INTO public.care_offering_regulatory_designations
  (id,provider_id,offering_id,designation_type,scheme,designation_code,designation_label,
   jurisdiction_country_code,jurisdiction_code,issuing_organization_id,designation_status,
   effective_on,expires_on,observed_on,source_id,notes,is_published)
SELECT id,provider_id,offering_id,designation_type,scheme,designation_code,designation_label,
  jurisdiction_country_code,jurisdiction_code,issuing_organization_id,designation_status,
  effective_on,expires_on,observed_on,source_id,notes,is_published
FROM ${rows(data.designations)} AS x(id uuid,provider_id uuid,offering_id uuid,
  designation_type text,scheme text,designation_code text,designation_label text,
  jurisdiction_country_code text,jurisdiction_code text,issuing_organization_id uuid,
  designation_status text,effective_on date,expires_on date,observed_on date,source_id uuid,
  notes text,is_published boolean);
DO $verify$
BEGIN
  IF (SELECT count(*) FROM public.providers p JOIN ${rows(providers)} x(id uuid) ON p.id=x.id) <> 8
    OR (SELECT count(*) FROM public.provider_sources s JOIN ${rows(data.providerSources)} x(id uuid) ON s.id=x.id) <> 8
    OR (SELECT count(*) FROM public.care_offerings o JOIN ${rows(data.offerings)} x(id uuid) ON o.id=x.id) <> 8
    OR (SELECT count(*) FROM public.care_offering_sources s JOIN ${rows(data.offeringSources)} x(offering_id uuid,source_id uuid)
      USING (offering_id,source_id)) <> 8
    OR (SELECT count(*) FROM public.provider_organizations po JOIN ${rows(data.providerOrganizations)} x(
      provider_id uuid,organization_slug text,relationship_type text) ON po.provider_id=x.provider_id
      AND po.relationship_type=x.relationship_type JOIN public.organizations o ON o.id=po.organization_id
      AND o.slug=x.organization_slug) <> 16
    OR (SELECT count(*) FROM public.provider_identity_links l JOIN ${rows(data.identityLinks)} x(
      successor_provider_id uuid,relationship_type text) USING (successor_provider_id,relationship_type)) <> 8
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations d
      JOIN ${rows(data.designations)} x(id uuid) ON d.id=x.id) <> 8 THEN
    RAISE EXCEPTION 'B2 exact-row verification failed';
  END IF;
  IF EXISTS (SELECT FROM public.providers p JOIN ${rows(providers)} x(id uuid) ON p.id=x.id WHERE
      p.primary_type<>'domicile' OR p.status<>'active' OR p.is_published OR p.verification_status<>'unverified'
      OR p.canton_code IS NOT NULL OR p.municipality_id IS NOT NULL OR p.postal_code IS NOT NULL
      OR p.locality IS NOT NULL OR p.street IS NOT NULL OR p.house_number IS NOT NULL
      OR p.latitude IS NOT NULL OR p.longitude IS NOT NULL OR p.phone IS NOT NULL OR p.email IS NOT NULL
      OR p.website IS NOT NULL OR p.description IS NOT NULL OR cardinality(p.service_codes)<>0
      OR cardinality(p.language_codes)<>0 OR p.attributes<>'{}'::jsonb)
    OR EXISTS (SELECT FROM public.care_offerings o JOIN ${rows(data.offerings)} x(id uuid) ON o.id=x.id WHERE
      o.offering_type<>'home_care' OR o.status<>'active' OR o.is_published
      OR o.verification_status<>'unverified' OR o.summary IS NOT NULL OR o.capacity_value IS NOT NULL
      OR o.long_stay IS NOT NULL OR o.short_stay IS NOT NULL OR o.respite_stay IS NOT NULL
      OR o.public_interest_status IS NOT NULL OR o.pricing_notes IS NOT NULL)
    OR EXISTS (SELECT FROM public.provider_service_areas a JOIN ${rows(providers)} x(id uuid) ON a.provider_id=x.id)
    OR EXISTS (SELECT FROM public.care_offering_features f JOIN ${rows(providers)} x(id uuid) ON f.provider_id=x.id)
    OR EXISTS (SELECT FROM public.care_offering_availability a JOIN ${rows(providers)} x(id uuid) ON a.provider_id=x.id)
    OR (SELECT count(*) FROM public.providers) <> (SELECT providers+8 FROM lia_batch_b2_before)
    OR (SELECT count(*) FROM public.provider_sources) <> (SELECT provider_sources+8 FROM lia_batch_b2_before)
    OR (SELECT count(*) FROM public.provider_organizations) <> (SELECT provider_organizations+16 FROM lia_batch_b2_before)
    OR (SELECT count(*) FROM public.care_offerings) <> (SELECT care_offerings+8 FROM lia_batch_b2_before)
    OR (SELECT count(*) FROM public.care_offering_sources) <> (SELECT care_offering_sources+8 FROM lia_batch_b2_before)
    OR (SELECT count(*) FROM public.provider_identity_links) <> (SELECT provider_identity_links+8 FROM lia_batch_b2_before)
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations) <> (SELECT regulatory_designations+8 FROM lia_batch_b2_before) THEN
    RAISE EXCEPTION 'B2 safety or delta verification failed';
  END IF;
END $verify$;
SET LOCAL ROLE anon;
DO $rls$ BEGIN
  IF EXISTS (SELECT FROM public.providers p JOIN ${rows(providers)} x(id uuid) ON p.id=x.id)
    OR EXISTS (SELECT FROM public.care_offerings o JOIN ${rows(data.offerings)} x(id uuid) ON o.id=x.id)
    OR EXISTS (SELECT FROM public.provider_organizations po JOIN ${rows(providers)} x(id uuid) ON po.provider_id=x.id)
    OR EXISTS (SELECT FROM public.care_offering_regulatory_designations d
      JOIN ${rows(data.designations)} x(id uuid) ON d.id=x.id)
    OR has_table_privilege(current_user,'public.provider_sources','SELECT')
    OR has_table_privilege(current_user,'public.care_offering_sources','SELECT')
    OR has_table_privilege(current_user,'public.provider_identity_links','SELECT') THEN
    RAISE EXCEPTION 'Unpublished B2 data became public';
  END IF;
END $rls$;
RESET ROLE;
SELECT jsonb_build_object('providersCreated',8,'providerSourcesCreated',8,
  'providerOrganizationsCreated',16,'careOfferingsCreated',8,'careOfferingSourcesCreated',8,
  'providerIdentityLinksCreated',8,'regulatoryDesignationsCreated',8,'netNewRows',64,
  'serviceAreasCreated',0,'featuresCreated',0);
${rollback ? "ROLLBACK" : "COMMIT"};
`;
}

export function buildBatchB2ApromadRollbackSql() {
  const data = compileBatchB2Apromad();
  const ids = data.providers.map((item) => ({ id: item.id }));
  return beginLocalSql + `
LOCK TABLE public.providers, public.provider_sources, public.provider_organizations,
  public.care_offerings, public.care_offering_sources, public.provider_identity_links,
  public.care_offering_regulatory_designations IN SHARE ROW EXCLUSIVE MODE;
DELETE FROM public.care_offering_regulatory_designations d USING ${rows(data.designations)} x(id uuid) WHERE d.id=x.id;
DELETE FROM public.provider_identity_links l USING ${rows(data.identityLinks)} x(successor_provider_id uuid,relationship_type text)
  WHERE l.successor_provider_id=x.successor_provider_id AND l.relationship_type=x.relationship_type;
DELETE FROM public.care_offering_sources s USING ${rows(data.offeringSources)} x(offering_id uuid,source_id uuid)
  WHERE s.offering_id=x.offering_id AND s.source_id=x.source_id;
DELETE FROM public.care_offerings o USING ${rows(data.offerings)} x(id uuid) WHERE o.id=x.id;
DELETE FROM public.provider_organizations po USING ${rows(ids)} x(id uuid) WHERE po.provider_id=x.id;
DELETE FROM public.provider_sources s USING ${rows(data.providerSources)} x(id uuid) WHERE s.id=x.id;
DELETE FROM public.providers p USING ${rows(ids)} x(id uuid) WHERE p.id=x.id;
COMMIT;
`;
}
