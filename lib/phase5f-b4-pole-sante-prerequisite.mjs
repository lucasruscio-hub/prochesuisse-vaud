import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beginLocalSql, jsonSql } from "./local-provider-writer.mjs";

const packet = JSON.parse(readFileSync(new URL(
  "../docs/research/phase5f-home-care-identity-packets/canonical/pole-sante-pays-denhaut.json",
  import.meta.url,
), "utf8"));
const manifest = JSON.parse(readFileSync(new URL(
  "../docs/research/phase5f-home-care-identity-packets/implementation-manifest.json",
  import.meta.url,
), "utf8"));

function stableUuid(key) {
  const hex = createHash("sha256").update(`lia:phase5f:b4-prerequisite:${key}`)
    .digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function compilePoleSantePrerequisite() {
  const batchD = manifest.safeBatches.find((item) => item.batchId === "D");
  const batchB = manifest.safeBatches.find((item) => item.batchId === "B");
  assert.equal(batchD?.implementedPrerequisiteNetNewRows, 3);
  assert.match(batchD?.reconciliationStatus ?? "", /Pôle Santé prerequisite completed/);
  assert.ok(batchB?.dependsOn.includes("Pôle Santé organization from Batch D before the ASANTE SANA sub-batch"));

  const identity = packet.identities.find((item) => item.identityId === "pole-sante-pays-denhaut");
  const alias = packet.identities.find((item) => item.identityId === "pole-sante-osad-row");
  assert.equal(identity?.intendedAction, "organization-only");
  assert.equal(identity.providerSiteIdentity, null);
  assert.equal(identity.legalOrganization, null);
  assert.deepEqual(identity.organizationRelationships, []);
  assert.deepEqual(identity.historicalTradingNames, ["Pôle Santé du Pays d'Enhaut"]);
  assert.equal(alias?.intendedAction, "alias");
  assert.equal(alias.aliasType, "trading");
  assert.deepEqual(alias.sourceIds, ["vd-osad-20260302"]);
  assert.match(packet.packetDecision, /One organization and one patient-facing CMS/);
  assert.match(packet.packetDecision, /referenced here rather than duplicated/);

  const sourceById = new Map(packet.sources.map((item) => [item.id, item]));
  const official = sourceById.get("pspe-home-care");
  const authority = sourceById.get("vd-osad-20260302");
  assert.ok(official?.url && authority);

  const organization = {
    id: stableUuid("organization:pole-sante-pays-denhaut"),
    slug: "pole-sante-pays-denhaut",
    name: identity.canonicalPublicName,
    legal_name: null,
    website: null,
    status: "active",
    verification_status: "unverified",
    is_published: false,
    last_reviewed_at: null,
  };
  const organizationSource = {
    id: stableUuid("organization-source:pole-sante-pays-denhaut"),
    organization_id: organization.id,
    source_type: "lia",
    source_name: "Lia Phase 5F canonical Pôle Santé Pays-d'Enhaut identity packet",
    source_url: null,
    external_record_id: `${packet.packetId}:organization`,
    accessed_on: packet.observedThrough,
    retrieved_at: null,
    reviewed_at: null,
    fields_supported: ["name", "trading_name"],
    notes: `Composite approved organization evidence: ${official.title} (${official.url}, accessed ${official.accessedOn}) supports the canonical public identity; ${authority.title} (observed ${authority.observationDate}) supports the trading name. Legal name/form, provider identity, ownership, network membership, dates, publication, and verification are not asserted.`,
  };
  const organizationName = {
    id: stableUuid("organization-name:pole-sante-pays-denhaut:trading"),
    organization_id: organization.id,
    name: alias.canonicalPublicName,
    name_type: "trading",
    valid_from: null,
    valid_to: null,
    source_id: organizationSource.id,
    is_published: false,
  };
  return { packet, batchD, organization, organizationSource, organizationName,
    expectedRows: { organizations: 1, organizationSources: 1, organizationNames: 1, netNewRows: 3 } };
}

const rows = (value) => `jsonb_to_recordset(${jsonSql(value)})`;

export function buildPoleSantePrerequisiteApplySql({ rollback = false } = {}) {
  const data = compilePoleSantePrerequisite();
  return beginLocalSql + `
LOCK TABLE public.providers, public.provider_sources, public.organizations,
  public.organization_sources, public.organization_names, public.organization_relationships,
  public.provider_organizations, public.care_offerings, public.provider_identity_links
  IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE lia_pole_sante_before AS SELECT
  (SELECT count(*) FROM public.providers) providers,
  (SELECT count(*) FROM public.provider_sources) provider_sources,
  (SELECT count(*) FROM public.organizations) organizations,
  (SELECT count(*) FROM public.organization_sources) organization_sources,
  (SELECT count(*) FROM public.organization_names) organization_names,
  (SELECT count(*) FROM public.organization_relationships) organization_relationships,
  (SELECT count(*) FROM public.provider_organizations) provider_organizations,
  (SELECT count(*) FROM public.care_offerings) offerings,
  (SELECT count(*) FROM public.provider_identity_links) identity_links;
DO $guard$ BEGIN
  IF (SELECT count(*) FROM public.providers)<>86
    OR (SELECT count(*) FROM public.provider_sources)<>156
    OR (SELECT count(*) FROM public.organizations)<>30
    OR (SELECT count(*) FROM public.organization_sources)<>8
    OR (SELECT count(*) FROM public.organization_names)<>0
    OR (SELECT count(*) FROM public.organization_relationships)<>7
    OR (SELECT count(*) FROM public.provider_organizations)<>72
    OR (SELECT count(*) FROM public.care_offerings)<>52
    OR (SELECT count(*) FROM public.provider_identity_links)<>20 THEN
    RAISE EXCEPTION 'Pôle Santé prerequisite requires exact applied B3 baseline';
  END IF;
  IF EXISTS (SELECT FROM public.organizations o JOIN ${rows([data.organization])}
      x(id uuid,slug text,name text) ON o.id=x.id OR o.slug=x.slug
      OR lower(btrim(o.name))=lower(btrim(x.name)))
    OR EXISTS (SELECT FROM public.organization_sources WHERE id='${data.organizationSource.id}'::uuid)
    OR EXISTS (SELECT FROM public.organization_names WHERE id='${data.organizationName.id}'::uuid)
    OR EXISTS (SELECT FROM public.providers WHERE lower(name) LIKE '%pôle santé%' OR lower(name) LIKE '%pole sante%') THEN
    RAISE EXCEPTION 'Pôle Santé prerequisite identity or deterministic ID collision';
  END IF;
END $guard$;
INSERT INTO public.organizations
  (id,slug,name,legal_name,website,status,verification_status,is_published,last_reviewed_at)
SELECT id,slug,name,legal_name,website,status,verification_status,is_published,last_reviewed_at
FROM ${rows([data.organization])} x(id uuid,slug text,name text,legal_name text,website text,
  status text,verification_status text,is_published boolean,last_reviewed_at timestamptz);
INSERT INTO public.organization_sources
  (id,organization_id,source_type,source_name,source_url,external_record_id,accessed_on,
   retrieved_at,reviewed_at,fields_supported,notes)
SELECT id,organization_id,source_type,source_name,source_url,external_record_id,accessed_on,
  retrieved_at,reviewed_at,fields_supported,notes
FROM ${rows([data.organizationSource])} x(id uuid,organization_id uuid,source_type text,
  source_name text,source_url text,external_record_id text,accessed_on date,
  retrieved_at timestamptz,reviewed_at timestamptz,fields_supported text[],notes text);
INSERT INTO public.organization_names
  (id,organization_id,name,name_type,valid_from,valid_to,source_id,is_published)
SELECT id,organization_id,name,name_type,valid_from,valid_to,source_id,is_published
FROM ${rows([data.organizationName])} x(id uuid,organization_id uuid,name text,name_type text,
  valid_from date,valid_to date,source_id uuid,is_published boolean);
DO $verify$ BEGIN
  IF (SELECT count(*) FROM public.organizations WHERE id='${data.organization.id}'::uuid
      AND slug='pole-sante-pays-denhaut' AND name='Pôle Santé du Pays-d''Enhaut'
      AND legal_name IS NULL AND website IS NULL AND status='active'
      AND verification_status='unverified' AND NOT is_published AND last_reviewed_at IS NULL)<>1
    OR (SELECT count(*) FROM public.organization_sources WHERE id='${data.organizationSource.id}'::uuid
      AND organization_id='${data.organization.id}'::uuid)<>1
    OR (SELECT count(*) FROM public.organization_names WHERE id='${data.organizationName.id}'::uuid
      AND organization_id='${data.organization.id}'::uuid AND name_type='trading'
      AND NOT is_published AND valid_from IS NULL AND valid_to IS NULL)<>1
    OR (SELECT count(*) FROM public.providers)<>(SELECT providers FROM lia_pole_sante_before)
    OR (SELECT count(*) FROM public.provider_sources)<>(SELECT provider_sources FROM lia_pole_sante_before)
    OR (SELECT count(*) FROM public.organizations)<>(SELECT organizations+1 FROM lia_pole_sante_before)
    OR (SELECT count(*) FROM public.organization_sources)<>(SELECT organization_sources+1 FROM lia_pole_sante_before)
    OR (SELECT count(*) FROM public.organization_names)<>(SELECT organization_names+1 FROM lia_pole_sante_before)
    OR (SELECT count(*) FROM public.organization_relationships)<>(SELECT organization_relationships FROM lia_pole_sante_before)
    OR (SELECT count(*) FROM public.provider_organizations)<>(SELECT provider_organizations FROM lia_pole_sante_before)
    OR (SELECT count(*) FROM public.care_offerings)<>(SELECT offerings FROM lia_pole_sante_before)
    OR (SELECT count(*) FROM public.provider_identity_links)<>(SELECT identity_links FROM lia_pole_sante_before) THEN
    RAISE EXCEPTION 'Pôle Santé prerequisite exact-row or safety verification failed';
  END IF;
END $verify$;
SET LOCAL ROLE anon;
DO $rls$ BEGIN
  IF EXISTS (SELECT FROM public.organizations WHERE id='${data.organization.id}'::uuid)
    OR EXISTS (SELECT FROM public.organization_names WHERE id='${data.organizationName.id}'::uuid)
    OR has_table_privilege(current_user,'public.organization_sources','SELECT') THEN
    RAISE EXCEPTION 'Unpublished Pôle Santé prerequisite became public';
  END IF;
END $rls$;
RESET ROLE;
SELECT jsonb_build_object('organizationsCreated',1,'organizationSourcesCreated',1,
  'organizationNamesCreated',1,'providersCreated',0,'netNewRows',3);
${rollback ? "ROLLBACK" : "COMMIT"};
`;
}

export function buildPoleSantePrerequisiteRollbackSql() {
  const data = compilePoleSantePrerequisite();
  return beginLocalSql + `
LOCK TABLE public.organizations, public.organization_sources, public.organization_names,
  public.provider_organizations IN SHARE ROW EXCLUSIVE MODE;
DO $guard$ BEGIN
  IF EXISTS (SELECT FROM public.provider_organizations
      WHERE organization_id='${data.organization.id}'::uuid) THEN
    RAISE EXCEPTION 'Pôle Santé prerequisite cannot roll back after B4';
  END IF;
END $guard$;
DELETE FROM public.organization_names WHERE id='${data.organizationName.id}'::uuid;
DELETE FROM public.organization_sources WHERE id='${data.organizationSource.id}'::uuid;
DELETE FROM public.organizations WHERE id='${data.organization.id}'::uuid;
COMMIT;
`;
}
