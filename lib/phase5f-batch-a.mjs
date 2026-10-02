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

const orgSlugs = {
  avasad: "avasad",
  fsl: "fondation-soins-lausanne",
  apromad: "apromad",
  apremadol: "apremadol",
  "asante-sana": "asante-sana",
  absmad: "absmad",
  flc: "fondation-de-la-cote",
  aspmad: "aspmad",
};

function stableUuid(key) {
  const hex = createHash("sha256").update(`lia:phase5f:batch-a:${key}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function compileBatchA() {
  const batch = manifest.safeBatches.find((item) => item.batchId === "A");
  assert.ok(batch, "Batch A is absent from the implementation manifest");
  assert.deepEqual(batch.expectedRows, {
    "organizations.create": 8,
    "organization_sources.create": 8,
    "organization_relationships.create": 7,
    "providers.update": 1,
    "provider_sources.create": 1,
  });
  assert.equal(batch.expectedNetNewRows, 24);

  const sourceById = new Map(packet.sources.map((source) => [source.id, source]));
  const identities = packet.identities.filter((identity) => identity.identityKind === "organization");
  assert.deepEqual(identities.map((identity) => identity.identityId), Object.keys(orgSlugs));

  const organizations = identities.map((identity) => {
    const unresolvedLegalName = identity.unresolved.some((item) => /legal.name/i.test(item));
    const legalName = identity.legalOrganization && !unresolvedLegalName
      ? identity.legalOrganization : null;
    return {
      identity_id: identity.identityId,
      id: stableUuid(`organization:${identity.identityId}`),
      slug: orgSlugs[identity.identityId],
      name: identity.canonicalPublicName,
      legal_name: legalName,
      website: null,
      status: "active",
      verification_status: "unverified",
      is_published: false,
      last_reviewed_at: null,
    };
  });

  const organizationSources = identities.map((identity) => {
    const sourceId = identity.identityId === "avasad" ? "cms-device" : identity.sourceIds[0];
    const source = sourceById.get(sourceId);
    assert.ok(source?.url, `Missing official organization source: ${sourceId}`);
    const organization = organizations.find((item) => item.identity_id === identity.identityId);
    const fields = organization.legal_name ? ["name", "legal_name"] : ["name"];
    return {
      source_key: sourceId,
      id: stableUuid(`organization-source:${identity.identityId}:${sourceId}`),
      organization_id: organization.id,
      source_type: "provider",
      source_name: source.title,
      source_url: source.url,
      external_record_id: source.url,
      accessed_on: source.accessedOn,
      retrieved_at: null,
      reviewed_at: null,
      fields_supported: fields,
      notes: `Official network evidence observed ${source.observationDate}; supports only the named organization identity and the sourced network membership.`,
    };
  });

  const avasad = organizations.find((item) => item.identity_id === "avasad");
  const relationships = organizations.filter((item) => item.identity_id !== "avasad").map((member) => {
    const source = organizationSources.find((item) => item.organization_id === member.id);
    return {
      parent_organization_id: avasad.id,
      member_organization_id: member.id,
      relationship_type: "network_member",
      evidence_organization_id: member.id,
      source_id: source.id,
    };
  });

  const providerSource = {
    id: stableUuid("provider-source:avasad-cms-retirement"),
    source_type: "lia",
    source_name: "Lia Phase 5F identity resolution — AVASAD/CMS",
    source_url: null,
    external_record_id: `${packet.packetId}:legacy-retirement`,
    accessed_on: packet.observedThrough,
    retrieved_at: null,
    reviewed_at: null,
    fields_supported: ["status", "is_published"],
    notes: "Packet-backed identity resolution: the legacy AVASAD umbrella entry is not a current patient-facing provider. Archived locally and kept unpublished; no CMS provider is created in Batch A.",
  };

  return { batch, organizations, organizationSources, relationships, providerSource };
}

const rows = (value) => `jsonb_to_recordset(${jsonSql(value)})`;

export function buildBatchAApplySql({ rollback = false } = {}) {
  const data = compileBatchA();
  const organizations = data.organizations.map(({ identity_id: _identityId, ...item }) => item);
  return beginLocalSql + `
LOCK TABLE public.providers, public.provider_sources, public.organizations,
  public.organization_sources, public.organization_relationships IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE lia_batch_a_before AS SELECT
  (SELECT count(*) FROM public.providers) AS providers,
  (SELECT count(*) FROM public.provider_sources) AS provider_sources,
  (SELECT count(*) FROM public.organizations) AS organizations,
  (SELECT count(*) FROM public.organization_sources) AS organization_sources,
  (SELECT count(*) FROM public.organization_relationships) AS organization_relationships;

DO $guard$
BEGIN
  IF (SELECT count(*) FROM public.providers) <> 66
    OR (SELECT count(*) FROM public.providers WHERE slug='avasad-cms' AND legacy_id='avasad-cms'
      AND name='AVASAD – CMS Vaud' AND primary_type='domicile' AND status='active'
      AND NOT is_published AND verification_status='unverified') <> 1
    OR EXISTS (SELECT FROM public.provider_organizations po JOIN public.providers p ON p.id=po.provider_id
      WHERE p.slug='avasad-cms')
    OR EXISTS (SELECT FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id
      WHERE p.slug='avasad-cms')
    OR EXISTS (SELECT FROM public.provider_service_areas a JOIN public.providers p ON p.id=a.provider_id
      WHERE p.slug='avasad-cms') THEN
    RAISE EXCEPTION 'Batch A legacy-provider precondition mismatch';
  END IF;
  IF EXISTS (SELECT FROM public.organizations o JOIN ${rows(organizations)} x(id uuid, slug text, name text)
      ON o.id=x.id OR o.slug=x.slug OR lower(btrim(o.name))=lower(btrim(x.name)))
    OR EXISTS (SELECT FROM public.organization_sources s JOIN ${rows(data.organizationSources)} x(id uuid)
      ON s.id=x.id)
    OR EXISTS (SELECT FROM public.provider_sources s WHERE s.id='${data.providerSource.id}'::uuid) THEN
    RAISE EXCEPTION 'Batch A identity already exists or collides';
  END IF;
END $guard$;

INSERT INTO public.organizations
  (id,slug,name,legal_name,website,status,verification_status,is_published,last_reviewed_at)
SELECT id,slug,name,legal_name,website,status,verification_status,is_published,last_reviewed_at
FROM ${rows(organizations)} AS x(id uuid,slug text,name text,legal_name text,website text,status text,
  verification_status text,is_published boolean,last_reviewed_at timestamptz);

INSERT INTO public.organization_sources
  (id,organization_id,source_type,source_name,source_url,external_record_id,accessed_on,
   retrieved_at,reviewed_at,fields_supported,notes)
SELECT id,organization_id,source_type,source_name,source_url,external_record_id,accessed_on,
  retrieved_at,reviewed_at,fields_supported,notes
FROM ${rows(data.organizationSources)} AS x(source_key text,id uuid,organization_id uuid,
  source_type text,source_name text,source_url text,external_record_id text,accessed_on date,
  retrieved_at timestamptz,reviewed_at timestamptz,fields_supported text[],notes text);

INSERT INTO public.organization_relationships
  (parent_organization_id,member_organization_id,relationship_type,evidence_organization_id,source_id)
SELECT parent_organization_id,member_organization_id,relationship_type,evidence_organization_id,source_id
FROM ${rows(data.relationships)} AS x(parent_organization_id uuid,member_organization_id uuid,
  relationship_type text,evidence_organization_id uuid,source_id uuid);

INSERT INTO public.provider_sources
  (id,provider_id,source_type,source_name,source_url,external_record_id,accessed_on,
   retrieved_at,reviewed_at,fields_supported,notes)
SELECT x.id,p.id,x.source_type,x.source_name,x.source_url,x.external_record_id,x.accessed_on,
  x.retrieved_at,x.reviewed_at,x.fields_supported,x.notes
FROM ${rows([data.providerSource])} AS x(id uuid,source_type text,source_name text,source_url text,
  external_record_id text,accessed_on date,retrieved_at timestamptz,reviewed_at timestamptz,
  fields_supported text[],notes text)
CROSS JOIN public.providers p WHERE p.slug='avasad-cms';

UPDATE public.providers SET status='archived', is_published=false WHERE slug='avasad-cms';

DO $verify$
BEGIN
  IF (SELECT count(*) FROM public.organizations o JOIN ${rows(organizations)} x(id uuid) ON o.id=x.id) <> 8
    OR (SELECT count(*) FROM public.organization_sources s JOIN ${rows(data.organizationSources)} x(id uuid) ON s.id=x.id) <> 8
    OR (SELECT count(*) FROM public.organization_relationships r JOIN ${rows(data.relationships)} x(
      parent_organization_id uuid,member_organization_id uuid,relationship_type text)
      USING (parent_organization_id,member_organization_id,relationship_type)) <> 7
    OR (SELECT count(*) FROM public.provider_sources WHERE id='${data.providerSource.id}'::uuid) <> 1
    OR (SELECT count(*) FROM public.providers WHERE slug='avasad-cms' AND status='archived'
      AND NOT is_published AND verification_status='unverified') <> 1 THEN
    RAISE EXCEPTION 'Batch A exact-row verification failed';
  END IF;
  IF EXISTS (SELECT FROM public.organizations o JOIN ${rows(organizations)} x(id uuid) ON o.id=x.id
      WHERE o.is_published OR o.verification_status<>'unverified' OR o.last_reviewed_at IS NOT NULL)
    OR EXISTS (SELECT FROM public.organization_relationships r JOIN ${rows(data.relationships)} x(
      parent_organization_id uuid,member_organization_id uuid,relationship_type text)
      USING (parent_organization_id,member_organization_id,relationship_type)
      WHERE r.relationship_type<>'network_member' OR r.evidence_organization_id<>r.member_organization_id)
    OR (SELECT count(*) FROM public.providers) <> (SELECT providers FROM lia_batch_a_before)
    OR (SELECT count(*) FROM public.provider_sources) <> (SELECT provider_sources+1 FROM lia_batch_a_before)
    OR (SELECT count(*) FROM public.organizations) <> (SELECT organizations+8 FROM lia_batch_a_before)
    OR (SELECT count(*) FROM public.organization_sources) <> (SELECT organization_sources+8 FROM lia_batch_a_before)
    OR (SELECT count(*) FROM public.organization_relationships) <> (SELECT organization_relationships+7 FROM lia_batch_a_before) THEN
    RAISE EXCEPTION 'Batch A safety or delta verification failed';
  END IF;
END $verify$;

SET LOCAL ROLE anon;
DO $rls$ BEGIN
  IF EXISTS (SELECT FROM public.organizations o JOIN ${rows(organizations)} x(id uuid) ON o.id=x.id)
    OR EXISTS (SELECT FROM public.organization_relationships r JOIN ${rows(data.relationships)} x(
      parent_organization_id uuid,member_organization_id uuid,relationship_type text)
      USING (parent_organization_id,member_organization_id,relationship_type)) THEN
    RAISE EXCEPTION 'Unpublished Batch A identities became public';
  END IF;
  IF has_table_privilege(current_user,'public.organization_sources','SELECT')
    OR has_table_privilege(current_user,'public.provider_sources','SELECT') THEN
    RAISE EXCEPTION 'Private Batch A evidence became public';
  END IF;
END $rls$;
RESET ROLE;

SELECT jsonb_build_object('organizationsCreated',8,'organizationSourcesCreated',8,
  'organizationRelationshipsCreated',7,'providersUpdated',1,'providerSourcesCreated',1,
  'netNewRows',24,'legacyProvider','avasad-cms','legacyProviderStatus','archived');
${rollback ? "ROLLBACK" : "COMMIT"};
`;
}

export function buildBatchARollbackSql(providerBefore) {
  const data = compileBatchA();
  assert.equal(providerBefore.slug, "avasad-cms");
  return beginLocalSql + `
LOCK TABLE public.providers, public.provider_sources, public.organizations,
  public.organization_sources, public.organization_relationships IN SHARE ROW EXCLUSIVE MODE;
DELETE FROM public.organization_relationships r USING ${rows(data.relationships)} x(
  parent_organization_id uuid,member_organization_id uuid,relationship_type text)
WHERE r.parent_organization_id=x.parent_organization_id
  AND r.member_organization_id=x.member_organization_id AND r.relationship_type=x.relationship_type;
DELETE FROM public.organization_sources s USING ${rows(data.organizationSources)} x(id uuid)
WHERE s.id=x.id;
DELETE FROM public.organizations o USING ${rows(data.organizations)} x(identity_id text,id uuid)
WHERE o.id=x.id;
DELETE FROM public.provider_sources WHERE id='${data.providerSource.id}'::uuid;
SET LOCAL session_replication_role = replica;
UPDATE public.providers SET status=${jsonSql(providerBefore.status)} #>> '{}',
  is_published=(${jsonSql(providerBefore.is_published)} #>> '{}')::boolean,
  updated_at=(${jsonSql(providerBefore.updated_at)} #>> '{}')::timestamptz
WHERE id=(${jsonSql(providerBefore.id)} #>> '{}')::uuid AND slug='avasad-cms';
SET LOCAL session_replication_role = origin;
COMMIT;
`;
}
