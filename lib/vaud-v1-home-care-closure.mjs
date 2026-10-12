import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beginLocalSql, jsonSql } from "./local-provider-writer.mjs";

const manifest = JSON.parse(readFileSync(new URL(
  "../docs/research/vaud-v1-home-care-closure-manifest.json",
  import.meta.url,
), "utf8"));

const uuid = (key) => {
  const hash = createHash("sha256").update(`lia:vaud-v1-home-care-closure:${key}`).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
};
const rows = (value) => `jsonb_to_recordset(${jsonSql(value)})`;

const predecessorSitex = {
  id: "97015bc2-f47d-492e-8bf9-d18f08d450d0",
  legacy_id: "sitex",
  slug: "sitex",
  name: "SITEX SA",
  primary_type: "domicile",
  subtypes: [],
  country_code: "CH",
  canton_code: null,
  municipality_id: null,
  postal_code: "1003",
  locality: "Lausanne",
  street: null,
  house_number: null,
  latitude: null,
  longitude: null,
  phone: null,
  email: null,
  website: null,
  description: null,
  service_codes: [],
  language_codes: [],
  attributes: {},
  original_tags: ["HAD", "Soins urgents", "24h/24", "LAMal"],
  original_location_text: "Lausanne · 1003",
  status: "active",
  verification_status: "unverified",
  is_published: false,
  last_reviewed_at: null,
  created_at: "2026-09-21T08:23:54.766516+00:00",
  updated_at: "2026-09-21T08:23:54.766516+00:00",
};

export function compileHomeCareClosure() {
  assert.equal(manifest.productionAccessAuthorized, false);
  assert.equal(manifest.phase5gAuthorized, false);
  assert.equal(manifest.identities.length, 5);
  assert.equal(manifest.holds.length, 6);
  assert.deepEqual(
    Object.fromEntries(["create", "update"].map((action) => [action, manifest.identities.filter((item) => item.action === action).length])),
    { create: 4, update: 1 },
  );
  assert.equal(manifest.expectedRows.netNewRows, 39);

  const organizations = manifest.identities.map((identity) => ({
    identity_id: identity.identityId,
    id: uuid(`organization:${identity.organization.slug}`),
    slug: identity.organization.slug,
    name: identity.organization.name,
    legal_name: null,
    website: null,
    status: "active",
    verification_status: "unverified",
    is_published: false,
    last_reviewed_at: null,
  }));
  const organizationSources = organizations.map((organization) => ({
    id: uuid(`organization-source:${organization.identity_id}`),
    organization_id: organization.id,
    source_type: "lia",
    source_name: `Lia ${manifest.cohort} reconciled manifest`,
    source_url: manifest.source.sourceUrl,
    external_record_id: `${organization.identity_id}:organization`,
    accessed_on: manifest.source.reconciledOn,
    retrieved_at: null,
    reviewed_at: null,
    fields_supported: ["name"],
    notes: "The reconciled official-file identity supports the organization/operator name. legal_name remains null because no independently reviewed current register evidence is included in this cohort.",
  }));

  const providers = manifest.identities.map((identity) => ({
    identity_id: identity.identityId,
    action: identity.action,
    organization_slug: identity.organization.slug,
    id: identity.action === "update" ? predecessorSitex.id : uuid(`provider:${identity.provider.slug}`),
    legacy_id: identity.action === "update" ? identity.existingProviderSlug : null,
    slug: identity.provider.slug,
    name: identity.provider.name,
    primary_type: "domicile",
    subtypes: [],
    country_code: "CH",
    canton_code: null,
    municipality_id: null,
    postal_code: identity.provider.postalCode,
    locality: identity.provider.locality,
    street: identity.provider.street,
    house_number: identity.provider.houseNumber,
    latitude: null,
    longitude: null,
    phone: identity.provider.phone,
    email: identity.provider.email,
    website: identity.provider.website,
    description: null,
    service_codes: [],
    language_codes: [],
    attributes: {},
    original_tags: identity.action === "update" ? predecessorSitex.original_tags : [],
    original_location_text: identity.action === "update" ? predecessorSitex.original_location_text : null,
    status: "active",
    verification_status: "unverified",
    is_published: false,
    last_reviewed_at: null,
  }));
  const providerSources = providers.map((provider) => ({
    id: uuid(`provider-source:${provider.identity_id}`),
    provider_id: provider.id,
    source_type: "lia",
    source_name: `Lia ${manifest.cohort} reconciled manifest`,
    source_url: manifest.source.sourceUrl,
    external_record_id: `${provider.identity_id}:official-osad-row`,
    accessed_on: manifest.source.reconciledOn,
    retrieved_at: null,
    reviewed_at: null,
    fields_supported: ["name", "primary_type", "postal_code", "locality", "street", "house_number", "phone", "email", "website"],
    notes: "Patient-facing identity and contact location from the reconciled dated Canton OSAD file. The office address is not service coverage. No generic feature, availability, capacity, language, price, reimbursement, public-interest, partnership, municipality, or canton-wide coverage fact is asserted.",
  }));
  const sourceFor = (providerId) => providerSources.find((source) => source.provider_id === providerId);
  const organizationFor = (slug) => organizations.find((organization) => organization.slug === slug);
  const providerOrganizations = providers.map((provider) => ({
    provider_id: provider.id,
    organization_id: organizationFor(provider.organization_slug).id,
    relationship_type: "operator",
    is_primary: true,
    source_id: sourceFor(provider.id).id,
  }));
  const offerings = providers.map((provider) => {
    const identity = manifest.identities.find((item) => item.identityId === provider.identity_id);
    return {
      id: uuid(`offering:${provider.identity_id}:home-care`),
      provider_id: provider.id,
      slug: "home-care",
      name: identity.offering.name,
      offering_type: "home_care",
      summary: identity.offering.summary,
      capacity_value: null,
      capacity_unit: null,
      long_stay: null,
      short_stay: null,
      respite_stay: null,
      admissions_notes: null,
      financing_notes: null,
      public_interest_status: null,
      pricing_notes: null,
      status: "active",
      verification_status: "unverified",
      is_published: false,
      last_reviewed_at: null,
    };
  });
  const offeringSources = offerings.map((offering) => ({
    provider_id: offering.provider_id,
    offering_id: offering.id,
    source_id: sourceFor(offering.provider_id).id,
    fields_supported: ["name", "offering_type", "summary"],
    notes: "Narrow specialist home_care identity supported by the reconciled dated official file. No generic service feature set is inferred.",
    reviewed_at: null,
  }));
  const designations = offerings.map((offering) => {
    const provider = providers.find((item) => item.id === offering.provider_id);
    const identity = manifest.identities.find((item) => item.identityId === provider.identity_id);
    return {
      id: uuid(`designation:${identity.identityId}:official-osad-list`),
      provider_id: provider.id,
      offering_id: offering.id,
      designation_type: "authorization",
      scheme: "vd_osad_official_list",
      designation_code: null,
      designation_label: identity.officialLabel,
      jurisdiction_country_code: "CH",
      jurisdiction_code: "VD",
      issuing_organization_id: null,
      designation_status: null,
      effective_on: null,
      expires_on: null,
      observed_on: manifest.source.observedOn,
      source_id: sourceFor(provider.id).id,
      notes: "Dated positive official-file observation only; current status beyond the observation date, effective date, expiry, issuer, LAMal status, reimbursement, and public-interest status remain unknown.",
      is_published: false,
    };
  });

  return {
    manifest,
    predecessorProviders: [predecessorSitex],
    organizations,
    organizationSources,
    providers,
    providerSources,
    providerOrganizations,
    offerings,
    offeringSources,
    designations,
    expectedRows: {
      organizations: 5,
      organizationSources: 5,
      providersCreated: 4,
      providersUpdated: 1,
      providerSources: 5,
      providerOrganizations: 5,
      careOfferings: 5,
      careOfferingSources: 5,
      designations: 5,
      providerNames: 0,
      serviceAreas: 0,
      features: 0,
      availability: 0,
      netNewRows: 39,
    },
  };
}

const providerColumns = "id,legacy_id,slug,name,primary_type,subtypes,country_code,canton_code,municipality_id,postal_code,locality,street,house_number,latitude,longitude,phone,email,website,description,service_codes,language_codes,attributes,original_tags,original_location_text,status,verification_status,is_published,last_reviewed_at";
const providerTypes = "id uuid,legacy_id text,slug text,name text,primary_type text,subtypes text[],country_code text,canton_code text,municipality_id uuid,postal_code text,locality text,street text,house_number text,latitude numeric,longitude numeric,phone text,email text,website text,description text,service_codes text[],language_codes text[],attributes jsonb,original_tags text[],original_location_text text,status text,verification_status text,is_published boolean,last_reviewed_at timestamptz";

export function buildHomeCareClosureApplySql({ rollback = false } = {}) {
  const data = compileHomeCareClosure();
  const organizationRows = data.organizations.map(({ identity_id: _identityId, ...organization }) => organization);
  const providerRows = data.providers.map(({ identity_id: _identityId, action: _action, organization_slug: _organizationSlug, ...provider }) => provider);
  const createdProviders = providerRows.filter((provider) => !provider.legacy_id);
  const updatedProviders = providerRows.filter((provider) => provider.legacy_id);
  const providerIds = data.providers.map(({ id }) => ({ id }));
  const organizationIds = data.organizations.map(({ id }) => ({ id }));

  return beginLocalSql + `
LOCK TABLE public.providers, public.provider_sources, public.organizations, public.organization_sources,
  public.organization_names, public.organization_relationships, public.provider_organizations,
  public.care_offerings, public.care_offering_sources, public.care_offering_features,
  public.care_offering_availability, public.provider_service_areas, public.provider_names,
  public.provider_identity_links, public.care_offering_regulatory_designations IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE lia_closure_before AS SELECT
  (SELECT count(*) FROM public.providers) providers,
  (SELECT count(*) FROM public.provider_sources) provider_sources,
  (SELECT count(*) FROM public.organizations) organizations,
  (SELECT count(*) FROM public.organization_sources) organization_sources,
  (SELECT count(*) FROM public.provider_names) provider_names,
  (SELECT count(*) FROM public.provider_organizations) provider_organizations,
  (SELECT count(*) FROM public.care_offerings) offerings,
  (SELECT count(*) FROM public.care_offering_sources) offering_sources,
  (SELECT count(*) FROM public.care_offering_regulatory_designations) designations,
  (SELECT count(*) FROM public.provider_service_areas) service_areas,
  (SELECT count(*) FROM public.care_offering_features) features,
  (SELECT count(*) FROM public.care_offering_availability) availability;
DO $guard$ BEGIN
  IF (SELECT count(*) FROM public.providers) <> 137
    OR (SELECT count(*) FROM public.provider_sources) <> 211
    OR (SELECT count(*) FROM public.organizations) <> 59
    OR (SELECT count(*) FROM public.organization_sources) <> 37
    OR (SELECT count(*) FROM public.organization_names) <> 4
    OR (SELECT count(*) FROM public.organization_relationships) <> 7
    OR (SELECT count(*) FROM public.provider_names) <> 5
    OR (SELECT count(*) FROM public.provider_organizations) <> 157
    OR (SELECT count(*) FROM public.care_offerings) <> 106
    OR (SELECT count(*) FROM public.care_offering_sources) <> 127
    OR (SELECT count(*) FROM public.provider_identity_links) <> 51
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations) <> 72
    OR (SELECT count(*) FROM public.care_offering_features) <> 84
    OR (SELECT count(*) FROM public.care_offering_availability) <> 0
    OR (SELECT count(*) FROM public.provider_service_areas) <> 4
    OR (SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%') <> 50
    OR (SELECT count(*) FROM public.care_offerings WHERE offering_type='home_support') <> 1
  THEN RAISE EXCEPTION 'Home-care closure predecessor mismatch'; END IF;
  IF EXISTS (
    SELECT FROM public.providers p
    JOIN ${rows(createdProviders.map(({ id, slug, name }) => ({ id, slug, name })))} x(id uuid,slug text,name text)
      ON p.id=x.id OR p.slug=x.slug OR lower(btrim(p.name))=lower(btrim(x.name))
  ) OR EXISTS (
    SELECT FROM public.organizations o
    JOIN ${rows(organizationRows.map(({ id, slug, name }) => ({ id, slug, name })))} x(id uuid,slug text,name text)
      ON o.id=x.id OR o.slug=x.slug OR lower(btrim(o.name))=lower(btrim(x.name))
  ) THEN RAISE EXCEPTION 'Home-care closure identity collision'; END IF;
  IF EXISTS (
    SELECT FROM ${rows(data.predecessorProviders.map(({ id, slug, name, postal_code, locality, street, house_number, phone, email, website }) => ({ id, slug, name, postal_code, locality, street, house_number, phone, email, website })))}
      x(id uuid,slug text,name text,postal_code text,locality text,street text,house_number text,phone text,email text,website text)
    LEFT JOIN public.providers p ON p.id=x.id AND p.slug=x.slug
    WHERE p.id IS NULL OR p.name IS DISTINCT FROM x.name OR p.postal_code IS DISTINCT FROM x.postal_code
      OR p.locality IS DISTINCT FROM x.locality OR p.street IS DISTINCT FROM x.street
      OR p.house_number IS DISTINCT FROM x.house_number OR p.phone IS DISTINCT FROM x.phone
      OR p.email IS DISTINCT FROM x.email OR p.website IS DISTINCT FROM x.website
  ) THEN RAISE EXCEPTION 'Sitex predecessor mismatch'; END IF;
  IF EXISTS (SELECT FROM public.providers WHERE slug IN ('amad-homecare-yverdon','nurse-home-care','soinvaud-provider','sciensus-home-therapy'))
  THEN RAISE EXCEPTION 'Held provider unexpectedly exists'; END IF;
END $guard$;
INSERT INTO public.organizations(id,slug,name,legal_name,website,status,verification_status,is_published,last_reviewed_at)
SELECT id,slug,name,legal_name,website,status,verification_status,is_published,last_reviewed_at FROM ${rows(organizationRows)}
  x(id uuid,slug text,name text,legal_name text,website text,status text,verification_status text,is_published boolean,last_reviewed_at timestamptz);
INSERT INTO public.organization_sources(id,organization_id,source_type,source_name,source_url,external_record_id,accessed_on,retrieved_at,reviewed_at,fields_supported,notes)
SELECT id,organization_id,source_type,source_name,source_url,external_record_id,accessed_on,retrieved_at,reviewed_at,fields_supported,notes FROM ${rows(data.organizationSources)}
  x(id uuid,organization_id uuid,source_type text,source_name text,source_url text,external_record_id text,accessed_on date,retrieved_at timestamptz,reviewed_at timestamptz,fields_supported text[],notes text);
INSERT INTO public.providers(${providerColumns}) SELECT ${providerColumns} FROM ${rows(createdProviders)} x(${providerTypes});
UPDATE public.providers p SET name=x.name,postal_code=x.postal_code,locality=x.locality,street=x.street,
  house_number=x.house_number,phone=x.phone,email=x.email,website=x.website
FROM ${rows(updatedProviders)} x(${providerTypes}) WHERE p.id=x.id AND p.slug=x.slug;
INSERT INTO public.provider_sources(id,provider_id,source_type,source_name,source_url,external_record_id,accessed_on,retrieved_at,reviewed_at,fields_supported,notes)
SELECT id,provider_id,source_type,source_name,source_url,external_record_id,accessed_on,retrieved_at,reviewed_at,fields_supported,notes FROM ${rows(data.providerSources)}
  x(id uuid,provider_id uuid,source_type text,source_name text,source_url text,external_record_id text,accessed_on date,retrieved_at timestamptz,reviewed_at timestamptz,fields_supported text[],notes text);
INSERT INTO public.provider_organizations(provider_id,organization_id,relationship_type,is_primary,source_id)
SELECT provider_id,organization_id,relationship_type,is_primary,source_id FROM ${rows(data.providerOrganizations)}
  x(provider_id uuid,organization_id uuid,relationship_type text,is_primary boolean,source_id uuid);
INSERT INTO public.care_offerings(id,provider_id,slug,name,offering_type,summary,capacity_value,capacity_unit,long_stay,short_stay,respite_stay,admissions_notes,financing_notes,public_interest_status,pricing_notes,status,verification_status,is_published,last_reviewed_at)
SELECT id,provider_id,slug,name,offering_type,summary,capacity_value,capacity_unit,long_stay,short_stay,respite_stay,admissions_notes,financing_notes,public_interest_status,pricing_notes,status,verification_status,is_published,last_reviewed_at FROM ${rows(data.offerings)}
  x(id uuid,provider_id uuid,slug text,name text,offering_type text,summary text,capacity_value integer,capacity_unit text,long_stay boolean,short_stay boolean,respite_stay boolean,admissions_notes text,financing_notes text,public_interest_status text,pricing_notes text,status text,verification_status text,is_published boolean,last_reviewed_at timestamptz);
INSERT INTO public.care_offering_sources(provider_id,offering_id,source_id,fields_supported,notes,reviewed_at)
SELECT provider_id,offering_id,source_id,fields_supported,notes,reviewed_at FROM ${rows(data.offeringSources)}
  x(provider_id uuid,offering_id uuid,source_id uuid,fields_supported text[],notes text,reviewed_at timestamptz);
INSERT INTO public.care_offering_regulatory_designations(id,provider_id,offering_id,designation_type,scheme,designation_code,designation_label,jurisdiction_country_code,jurisdiction_code,issuing_organization_id,designation_status,effective_on,expires_on,observed_on,source_id,notes,is_published)
SELECT id,provider_id,offering_id,designation_type,scheme,designation_code,designation_label,jurisdiction_country_code,jurisdiction_code,issuing_organization_id,designation_status,effective_on,expires_on,observed_on,source_id,notes,is_published FROM ${rows(data.designations)}
  x(id uuid,provider_id uuid,offering_id uuid,designation_type text,scheme text,designation_code text,designation_label text,jurisdiction_country_code text,jurisdiction_code text,issuing_organization_id uuid,designation_status text,effective_on date,expires_on date,observed_on date,source_id uuid,notes text,is_published boolean);
DO $verify$ BEGIN
  IF (SELECT count(*) FROM public.organizations o JOIN ${rows(organizationIds)} x(id uuid) ON o.id=x.id) <> 5
    OR EXISTS (SELECT FROM public.organizations o JOIN ${rows(organizationIds)} x(id uuid) ON o.id=x.id WHERE o.legal_name IS NOT NULL OR o.is_published OR o.verification_status<>'unverified')
    OR (SELECT count(*) FROM public.providers p JOIN ${rows(providerIds)} x(id uuid) ON p.id=x.id) <> 5
    OR EXISTS (SELECT FROM public.providers p JOIN ${rows(providerIds)} x(id uuid) ON p.id=x.id WHERE p.is_published OR p.verification_status<>'unverified' OR p.canton_code IS NOT NULL OR p.municipality_id IS NOT NULL OR cardinality(p.service_codes)<>0 OR cardinality(p.language_codes)<>0)
    OR (SELECT count(*) FROM public.care_offerings o JOIN ${rows(providerIds)} x(id uuid) ON o.provider_id=x.id WHERE o.offering_type='home_care' AND NOT o.is_published AND o.verification_status='unverified') <> 5
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations d JOIN ${rows(providerIds)} x(id uuid) ON d.provider_id=x.id WHERE d.scheme='vd_osad_official_list' AND d.observed_on=DATE '2026-03-02' AND NOT d.is_published) <> 5
    OR EXISTS (SELECT FROM public.provider_service_areas a JOIN ${rows(providerIds)} x(id uuid) ON a.provider_id=x.id)
    OR EXISTS (SELECT FROM public.care_offering_features f JOIN ${rows(providerIds)} x(id uuid) ON f.provider_id=x.id)
    OR EXISTS (SELECT FROM public.care_offering_availability a JOIN ${rows(providerIds)} x(id uuid) ON a.provider_id=x.id)
    OR (SELECT count(*) FROM public.organizations)<>(SELECT organizations+5 FROM lia_closure_before)
    OR (SELECT count(*) FROM public.organization_sources)<>(SELECT organization_sources+5 FROM lia_closure_before)
    OR (SELECT count(*) FROM public.providers)<>(SELECT providers+4 FROM lia_closure_before)
    OR (SELECT count(*) FROM public.provider_sources)<>(SELECT provider_sources+5 FROM lia_closure_before)
    OR (SELECT count(*) FROM public.provider_names)<>(SELECT provider_names FROM lia_closure_before)
    OR (SELECT count(*) FROM public.provider_organizations)<>(SELECT provider_organizations+5 FROM lia_closure_before)
    OR (SELECT count(*) FROM public.care_offerings)<>(SELECT offerings+5 FROM lia_closure_before)
    OR (SELECT count(*) FROM public.care_offering_sources)<>(SELECT offering_sources+5 FROM lia_closure_before)
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations)<>(SELECT designations+5 FROM lia_closure_before)
    OR (SELECT count(*) FROM public.provider_service_areas)<>(SELECT service_areas FROM lia_closure_before)
    OR (SELECT count(*) FROM public.care_offering_features)<>(SELECT features FROM lia_closure_before)
    OR (SELECT count(*) FROM public.care_offering_availability)<>(SELECT availability FROM lia_closure_before)
  THEN RAISE EXCEPTION 'Home-care closure exact-row or semantic verification failed'; END IF;
END $verify$;
SET LOCAL ROLE anon;
DO $rls$ BEGIN
  IF EXISTS (SELECT FROM public.providers p JOIN ${rows(providerIds)} x(id uuid) ON p.id=x.id)
    OR EXISTS (SELECT FROM public.organizations o JOIN ${rows(organizationIds)} x(id uuid) ON o.id=x.id)
    OR has_table_privilege(current_user,'public.provider_sources','SELECT')
  THEN RAISE EXCEPTION 'Home-care closure data became public'; END IF;
END $rls$;
RESET ROLE;
SELECT jsonb_build_object('organizationsCreated',5,'organizationSourcesCreated',5,'providersCreated',4,'providersUpdated',1,
  'providerSourcesCreated',5,'providerOrganizationsCreated',5,'careOfferingsCreated',5,'careOfferingSourcesCreated',5,
  'designationsCreated',5,'providerNamesCreated',0,'serviceAreasCreated',0,'featuresCreated',0,'availabilityCreated',0,'netNewRows',39);
${rollback ? "ROLLBACK" : "COMMIT"};`;
}

export function buildHomeCareClosureRollbackSql() {
  const data = compileHomeCareClosure();
  const providerIds = data.providers.map(({ id }) => ({ id }));
  const createdProviderIds = data.providers.filter(({ action }) => action === "create").map(({ id }) => ({ id }));
  const organizationIds = data.organizations.map(({ id }) => ({ id }));
  return beginLocalSql + `
DELETE FROM public.care_offering_regulatory_designations d USING ${rows(providerIds)} x(id uuid) WHERE d.provider_id=x.id;
DELETE FROM public.care_offering_sources s USING ${rows(providerIds)} x(id uuid) WHERE s.provider_id=x.id;
DELETE FROM public.care_offerings o USING ${rows(providerIds)} x(id uuid) WHERE o.provider_id=x.id;
DELETE FROM public.provider_organizations po USING ${rows(providerIds)} x(id uuid) WHERE po.provider_id=x.id;
DELETE FROM public.provider_sources s USING ${rows(data.providerSources.map(({ id }) => ({ id })))} x(id uuid) WHERE s.id=x.id;
DELETE FROM public.providers p USING ${rows(createdProviderIds)} x(id uuid) WHERE p.id=x.id;
ALTER TABLE public.providers DISABLE TRIGGER providers_set_updated_at;
UPDATE public.providers p SET legacy_id=x.legacy_id,slug=x.slug,name=x.name,primary_type=x.primary_type,subtypes=x.subtypes,
  country_code=x.country_code,canton_code=x.canton_code,municipality_id=x.municipality_id,postal_code=x.postal_code,
  locality=x.locality,street=x.street,house_number=x.house_number,latitude=x.latitude,longitude=x.longitude,
  phone=x.phone,email=x.email,website=x.website,description=x.description,service_codes=x.service_codes,
  language_codes=x.language_codes,attributes=x.attributes,original_tags=x.original_tags,
  original_location_text=x.original_location_text,status=x.status,verification_status=x.verification_status,
  is_published=x.is_published,last_reviewed_at=x.last_reviewed_at,created_at=x.created_at,updated_at=x.updated_at
FROM ${rows(data.predecessorProviders)} x(${providerTypes},created_at timestamptz,updated_at timestamptz) WHERE p.id=x.id;
ALTER TABLE public.providers ENABLE TRIGGER providers_set_updated_at;
DELETE FROM public.organization_sources s USING ${rows(data.organizationSources.map(({ id }) => ({ id })))} x(id uuid) WHERE s.id=x.id;
DELETE FROM public.organizations o USING ${rows(organizationIds)} x(id uuid) WHERE o.id=x.id;
COMMIT;`;
}
