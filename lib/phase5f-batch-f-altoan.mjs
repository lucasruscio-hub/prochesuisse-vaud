import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beginLocalSql, jsonSql } from "./local-provider-writer.mjs";

const packet = JSON.parse(readFileSync(new URL("../docs/research/phase5f-home-care-identity-packets/canonical/altoan.json", import.meta.url), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("../docs/research/phase5f-home-care-identity-packets/implementation-manifest.json", import.meta.url), "utf8"));
const uuid = (key) => {
  const hash = createHash("sha256").update(`lia:phase5f:f:${key}`).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
};
const records = (value) => `jsonb_to_recordset(${jsonSql(value)})`;

export function compileBatchF() {
  const batch = manifest.safeBatches.find((item) => item.batchId === "F");
  const identity = packet.identities.find((item) => item.identityId === "altoan");
  assert.equal(batch?.expectedNetNewRows, 8);
  assert.equal(identity?.offeringType, "home_support");
  assert.deepEqual(identity?.serviceAreaEvidence?.implementationScope, ["CH-VD"]);

  const organization = {
    id: uuid("organization:altoan-sa"), slug: "altoan-sa", name: "Altoan SA", legal_name: null,
    website: null, status: "active", verification_status: "unverified", is_published: false, last_reviewed_at: null,
  };
  const organizationSource = {
    id: uuid("organization-source:altoan-sa"), organization_id: organization.id, source_type: "lia",
    source_name: `Lia Phase 5F canonical ${packet.packetId} identity packet`, source_url: null,
    external_record_id: `${packet.packetId}:altoan-sa`, accessed_on: packet.observedThrough,
    retrieved_at: null, reviewed_at: null, fields_supported: ["name"],
    notes: "Approved public organization identity. legal_name remains unasserted pending independently reproduced current commercial-register evidence; no ownership, authorization, publication, or verification fact is asserted.",
  };
  const provider = {
    id: uuid("provider:altoan"), legacy_id: null, slug: "altoan", name: "Altoan", primary_type: "domicile",
    subtypes: [], country_code: "CH", canton_code: null, municipality_id: null, postal_code: "1092",
    locality: "Belmont-sur-Lausanne", street: "Ch. des Travers-Bancs", house_number: "4b",
    latitude: null, longitude: null, phone: null, email: null, website: "https://altoan.com/contact",
    description: null, service_codes: [], language_codes: [], attributes: {}, original_tags: [], original_location_text: null,
    status: "active", verification_status: "unverified", is_published: false, last_reviewed_at: null,
  };
  const providerSource = {
    id: uuid("provider-source:altoan"), provider_id: provider.id, source_type: "lia",
    source_name: `Lia Phase 5F canonical ${packet.packetId} identity packet`, source_url: null,
    external_record_id: `${packet.packetId}:altoan`, accessed_on: packet.observedThrough,
    retrieved_at: null, reviewed_at: null,
    fields_supported: ["name", "primary_type", "postal_code", "locality", "street", "house_number", "website"],
    notes: "Approved private accompaniment identity. The provider explicitly states it is strictly non-medical. The contact address is not coverage; no nursing, OSAD, LAMal, availability, capacity, pricing, financing, language, or publication fact is asserted.",
  };
  const providerOrganization = {
    provider_id: provider.id, organization_id: organization.id, relationship_type: "operator", is_primary: true,
    source_id: providerSource.id,
  };
  const offering = {
    id: uuid("offering:altoan:home-support"), provider_id: provider.id, slug: "home-support",
    name: "Accompagnement à domicile non médical", offering_type: "home_support",
    summary: "Accompagnement privé à domicile strictement non médical; aucune prestation de soins infirmiers, classification OSAD ou autorisation LAMal n’est affirmée.",
    capacity_value: null, capacity_unit: null, long_stay: null, short_stay: null, respite_stay: null,
    admissions_notes: null, financing_notes: null, public_interest_status: null, pricing_notes: null,
    status: "active", verification_status: "unverified", is_published: false, last_reviewed_at: null,
  };
  const offeringSource = {
    provider_id: provider.id, offering_id: offering.id, source_id: providerSource.id,
    fields_supported: ["name", "offering_type", "summary"],
    notes: "Strictly non-medical home support only; no home_care, service-feature, regulatory, availability, capacity, pricing, financing, or language rows.",
    reviewed_at: null,
  };
  const serviceArea = {
    id: uuid("service-area:altoan:ch-vd"), provider_id: provider.id, care_offering_id: offering.id,
    municipality_id: null, canton_code: "VD", country_code: "CH", coverage_type: "canton",
    coverage_label: null, source_id: providerSource.id,
  };
  return {
    batch, organization, organizationSource, provider, providerSource, providerOrganization, offering, offeringSource, serviceArea,
    expectedRows: { organizations: 1, organizationSources: 1, providers: 1, providerSources: 1, providerOrganizations: 1, careOfferings: 1, careOfferingSources: 1, serviceAreas: 1, designations: 0, netNewRows: 8 },
  };
}

export function buildBatchFApplySql({ rollback = false } = {}) {
  const d = compileBatchF();
  return beginLocalSql + `
LOCK TABLE public.providers, public.provider_sources, public.organizations, public.organization_sources,
  public.provider_organizations, public.care_offerings, public.care_offering_sources,
  public.care_offering_features, public.care_offering_availability, public.provider_service_areas,
  public.provider_names, public.provider_identity_links, public.care_offering_regulatory_designations IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE lia_f_before AS SELECT
  (SELECT count(*) FROM public.providers) providers,
  (SELECT count(*) FROM public.provider_sources) provider_sources,
  (SELECT count(*) FROM public.organizations) organizations,
  (SELECT count(*) FROM public.organization_sources) organization_sources,
  (SELECT count(*) FROM public.provider_organizations) provider_organizations,
  (SELECT count(*) FROM public.care_offerings) offerings,
  (SELECT count(*) FROM public.care_offering_sources) offering_sources,
  (SELECT count(*) FROM public.provider_service_areas) service_areas,
  (SELECT count(*) FROM public.care_offering_regulatory_designations) designations;
DO $guard$ BEGIN
  IF (SELECT count(*) FROM public.providers) <> 122
    OR (SELECT count(*) FROM public.provider_sources) <> 194
    OR (SELECT count(*) FROM public.organizations) <> 42
    OR (SELECT count(*) FROM public.organization_sources) <> 20
    OR (SELECT count(*) FROM public.organization_names) <> 4
    OR (SELECT count(*) FROM public.organization_relationships) <> 7
    OR (SELECT count(*) FROM public.provider_organizations) <> 140
    OR (SELECT count(*) FROM public.care_offerings) <> 89
    OR (SELECT count(*) FROM public.care_offering_sources) <> 110
    OR (SELECT count(*) FROM public.care_offering_features) <> 84
    OR (SELECT count(*) FROM public.care_offering_availability) <> 0
    OR (SELECT count(*) FROM public.provider_service_areas) <> 3
    OR (SELECT count(*) FROM public.provider_names) <> 3
    OR (SELECT count(*) FROM public.provider_identity_links) <> 51
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations) <> 56
    OR (SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%') <> 50
    OR (SELECT count(*) FROM public.care_offerings WHERE offering_type = 'home_support') <> 0
  THEN RAISE EXCEPTION 'Batch F predecessor mismatch'; END IF;
  IF EXISTS (SELECT FROM public.providers WHERE id = '${d.provider.id}' OR slug = 'altoan' OR lower(btrim(name)) = lower('Altoan'))
    OR EXISTS (SELECT FROM public.organizations WHERE id = '${d.organization.id}' OR slug = 'altoan-sa' OR lower(btrim(name)) = lower('Altoan SA'))
  THEN RAISE EXCEPTION 'Batch F identity collision'; END IF;
  IF EXISTS (SELECT FROM public.providers WHERE slug IN ('amad-homecare-yverdon','sciensus-home-therapy','cp-alexandra','nurse-home-care','soinvaud-provider'))
  THEN RAISE EXCEPTION 'Held provider exists before Batch F'; END IF;
END $guard$;
INSERT INTO public.organizations(id,slug,name,legal_name,website,status,verification_status,is_published,last_reviewed_at)
SELECT id,slug,name,legal_name,website,status,verification_status,is_published,last_reviewed_at FROM ${records([d.organization])}
  x(id uuid,slug text,name text,legal_name text,website text,status text,verification_status text,is_published boolean,last_reviewed_at timestamptz);
INSERT INTO public.organization_sources(id,organization_id,source_type,source_name,source_url,external_record_id,accessed_on,retrieved_at,reviewed_at,fields_supported,notes)
SELECT id,organization_id,source_type,source_name,source_url,external_record_id,accessed_on,retrieved_at,reviewed_at,fields_supported,notes FROM ${records([d.organizationSource])}
  x(id uuid,organization_id uuid,source_type text,source_name text,source_url text,external_record_id text,accessed_on date,retrieved_at timestamptz,reviewed_at timestamptz,fields_supported text[],notes text);
INSERT INTO public.providers(id,legacy_id,slug,name,primary_type,subtypes,country_code,canton_code,municipality_id,postal_code,locality,street,house_number,latitude,longitude,phone,email,website,description,service_codes,language_codes,attributes,original_tags,original_location_text,status,verification_status,is_published,last_reviewed_at)
SELECT id,legacy_id,slug,name,primary_type,subtypes,country_code,canton_code,municipality_id,postal_code,locality,street,house_number,latitude,longitude,phone,email,website,description,service_codes,language_codes,attributes,original_tags,original_location_text,status,verification_status,is_published,last_reviewed_at FROM ${records([d.provider])}
  x(id uuid,legacy_id text,slug text,name text,primary_type text,subtypes text[],country_code text,canton_code text,municipality_id uuid,postal_code text,locality text,street text,house_number text,latitude numeric,longitude numeric,phone text,email text,website text,description text,service_codes text[],language_codes text[],attributes jsonb,original_tags text[],original_location_text text,status text,verification_status text,is_published boolean,last_reviewed_at timestamptz);
INSERT INTO public.provider_sources(id,provider_id,source_type,source_name,source_url,external_record_id,accessed_on,retrieved_at,reviewed_at,fields_supported,notes)
SELECT id,provider_id,source_type,source_name,source_url,external_record_id,accessed_on,retrieved_at,reviewed_at,fields_supported,notes FROM ${records([d.providerSource])}
  x(id uuid,provider_id uuid,source_type text,source_name text,source_url text,external_record_id text,accessed_on date,retrieved_at timestamptz,reviewed_at timestamptz,fields_supported text[],notes text);
INSERT INTO public.provider_organizations(provider_id,organization_id,relationship_type,is_primary,source_id)
SELECT provider_id,organization_id,relationship_type,is_primary,source_id FROM ${records([d.providerOrganization])}
  x(provider_id uuid,organization_id uuid,relationship_type text,is_primary boolean,source_id uuid);
INSERT INTO public.care_offerings(id,provider_id,slug,name,offering_type,summary,capacity_value,capacity_unit,long_stay,short_stay,respite_stay,admissions_notes,financing_notes,public_interest_status,pricing_notes,status,verification_status,is_published,last_reviewed_at)
SELECT id,provider_id,slug,name,offering_type,summary,capacity_value,capacity_unit,long_stay,short_stay,respite_stay,admissions_notes,financing_notes,public_interest_status,pricing_notes,status,verification_status,is_published,last_reviewed_at FROM ${records([d.offering])}
  x(id uuid,provider_id uuid,slug text,name text,offering_type text,summary text,capacity_value integer,capacity_unit text,long_stay boolean,short_stay boolean,respite_stay boolean,admissions_notes text,financing_notes text,public_interest_status text,pricing_notes text,status text,verification_status text,is_published boolean,last_reviewed_at timestamptz);
INSERT INTO public.care_offering_sources(provider_id,offering_id,source_id,fields_supported,notes,reviewed_at)
SELECT provider_id,offering_id,source_id,fields_supported,notes,reviewed_at FROM ${records([d.offeringSource])}
  x(provider_id uuid,offering_id uuid,source_id uuid,fields_supported text[],notes text,reviewed_at timestamptz);
INSERT INTO public.provider_service_areas(id,provider_id,care_offering_id,municipality_id,canton_code,country_code,coverage_type,coverage_label,source_id)
SELECT id,provider_id,care_offering_id,municipality_id,canton_code,country_code,coverage_type,coverage_label,source_id FROM ${records([d.serviceArea])}
  x(id uuid,provider_id uuid,care_offering_id uuid,municipality_id uuid,canton_code text,country_code text,coverage_type text,coverage_label text,source_id uuid);
DO $verify$ BEGIN
  IF (SELECT count(*) FROM public.organizations WHERE id = '${d.organization.id}' AND legal_name IS NULL AND NOT is_published AND verification_status = 'unverified') <> 1
    OR (SELECT count(*) FROM public.providers WHERE id = '${d.provider.id}' AND canton_code IS NULL AND NOT is_published AND verification_status = 'unverified' AND cardinality(service_codes) = 0 AND cardinality(language_codes) = 0) <> 1
    OR (SELECT count(*) FROM public.care_offerings WHERE provider_id = '${d.provider.id}' AND offering_type = 'home_support' AND NOT is_published AND verification_status = 'unverified') <> 1
    OR EXISTS (SELECT FROM public.care_offerings WHERE provider_id = '${d.provider.id}' AND offering_type = 'home_care')
    OR (SELECT count(*) FROM public.provider_service_areas WHERE provider_id = '${d.provider.id}' AND care_offering_id = '${d.offering.id}' AND coverage_type = 'canton' AND country_code = 'CH' AND canton_code = 'VD' AND municipality_id IS NULL AND coverage_label IS NULL) <> 1
    OR EXISTS (SELECT FROM public.care_offering_regulatory_designations WHERE provider_id = '${d.provider.id}')
    OR EXISTS (SELECT FROM public.care_offering_features WHERE provider_id = '${d.provider.id}')
    OR EXISTS (SELECT FROM public.care_offering_availability WHERE provider_id = '${d.provider.id}')
    OR (SELECT count(*) FROM public.organizations) <> (SELECT organizations + 1 FROM lia_f_before)
    OR (SELECT count(*) FROM public.organization_sources) <> (SELECT organization_sources + 1 FROM lia_f_before)
    OR (SELECT count(*) FROM public.providers) <> (SELECT providers + 1 FROM lia_f_before)
    OR (SELECT count(*) FROM public.provider_sources) <> (SELECT provider_sources + 1 FROM lia_f_before)
    OR (SELECT count(*) FROM public.provider_organizations) <> (SELECT provider_organizations + 1 FROM lia_f_before)
    OR (SELECT count(*) FROM public.care_offerings) <> (SELECT offerings + 1 FROM lia_f_before)
    OR (SELECT count(*) FROM public.care_offering_sources) <> (SELECT offering_sources + 1 FROM lia_f_before)
    OR (SELECT count(*) FROM public.provider_service_areas) <> (SELECT service_areas + 1 FROM lia_f_before)
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations) <> (SELECT designations FROM lia_f_before)
  THEN RAISE EXCEPTION 'Batch F exact-row or semantic verification failed'; END IF;
END $verify$;
SET LOCAL ROLE anon;
DO $rls$ BEGIN
  IF EXISTS (SELECT FROM public.providers WHERE id = '${d.provider.id}')
    OR EXISTS (SELECT FROM public.organizations WHERE id = '${d.organization.id}')
    OR has_table_privilege(current_user, 'public.provider_sources', 'SELECT')
  THEN RAISE EXCEPTION 'Batch F data became public'; END IF;
END $rls$;
RESET ROLE;
SELECT jsonb_build_object('organizationsCreated',1,'organizationSourcesCreated',1,'providersCreated',1,'providerSourcesCreated',1,'providerOrganizationsCreated',1,'careOfferingsCreated',1,'careOfferingSourcesCreated',1,'serviceAreasCreated',1,'designationsCreated',0,'netNewRows',8);
${rollback ? "ROLLBACK" : "COMMIT"};`;
}

export function buildBatchFRollbackSql() {
  const d = compileBatchF();
  return beginLocalSql + `
DELETE FROM public.provider_service_areas WHERE id = '${d.serviceArea.id}';
DELETE FROM public.care_offering_sources WHERE offering_id = '${d.offering.id}';
DELETE FROM public.care_offerings WHERE id = '${d.offering.id}';
DELETE FROM public.provider_organizations WHERE provider_id = '${d.provider.id}' AND organization_id = '${d.organization.id}';
DELETE FROM public.provider_sources WHERE id = '${d.providerSource.id}';
DELETE FROM public.providers WHERE id = '${d.provider.id}';
DELETE FROM public.organization_sources WHERE id = '${d.organizationSource.id}';
DELETE FROM public.organizations WHERE id = '${d.organization.id}';
COMMIT;`;
}
