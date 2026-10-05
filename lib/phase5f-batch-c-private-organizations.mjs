import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beginLocalSql, jsonSql } from "./local-provider-writer.mjs";

const packetFiles = ["nurse-home-care.json", "soinvaud-soinsvaud.json"];
const packets = packetFiles.map((file) => JSON.parse(readFileSync(new URL(
  `../docs/research/phase5f-home-care-identity-packets/canonical/${file}`,
  import.meta.url,
), "utf8")));
const manifest = JSON.parse(readFileSync(new URL(
  "../docs/research/phase5f-home-care-identity-packets/implementation-manifest.json",
  import.meta.url,
), "utf8"));

function stableUuid(key) {
  const hex = createHash("sha256").update(`lia:phase5f:batch-c:${key}`)
    .digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function compileBatchC() {
  const batch = manifest.safeBatches.find((item) => item.batchId === "C");
  assert.deepEqual(batch?.expectedRows,
    { "organizations.create": 2, "organization_sources.create": 2 });
  assert.equal(batch.expectedNetNewRows, 4);
  assert.deepEqual(batch.heldOutsideBatch,
    ["Nurse Home Care provider", "SoinVaud/Soinsvaud provider and trading alias"]);
  assert.deepEqual(batch.preconditions, [
    "Attach current legal-register evidence before implementation; if it cannot be attached, defer the corresponding organization too.",
  ]);
  assert.deepEqual(batch.preconditionStatus?.revalidatedExpectedRows,
    { "organizations.create": 2, "organization_sources.create": 2 });
  assert.equal(batch.preconditionStatus?.result, "cleared");
  assert.equal(batch.preconditionStatus?.revalidatedNetNewRows, 4);
  assert.equal(batch.preconditionStatus?.providerRows, 0);

  const specifications = [
    { packetId: "nurse-home-care", identityId: "nurse-home-care-sarl",
      sourceId: "uid-nurse-home-care", slug: "nurse-home-care-sarl",
      uid: "CHE-270.603.185", name: "Nurse Home Care Sàrl", seat: "Morges" },
    { packetId: "soinvaud-soinsvaud", identityId: "soinvaud-sarl",
      sourceId: "uid-soinvaud", slug: "soinvaud-sarl",
      uid: "CHE-394.182.275", name: "SoinVaud Sàrl", seat: "Chavannes-près-Renens" },
  ];
  const organizations = [];
  const organizationSources = [];
  for (const spec of specifications) {
    const packet = packets.find((item) => item.packetId === spec.packetId);
    const identity = packet?.identities.find((item) => item.identityId === spec.identityId);
    const source = packet?.sources.find((item) => item.id === spec.sourceId);
    assert.equal(identity?.identityKind, "organization");
    assert.equal(identity.intendedAction, "organization-only");
    assert.deepEqual(identity.unresolved, []);
    assert.deepEqual(identity.sourceIds, [spec.sourceId]);
    assert.equal(identity.canonicalPublicName, spec.name);
    assert.equal(identity.legalOrganization, spec.name);
    assert.equal(source?.kind, "official_commercial_register");
    assert.match(source.url, /^https:\/\/www\.uid\.admin\.ch\/Detail\.aspx\?uid_id=CHE-/);
    assert.equal(source.evidence?.currentLegalName, spec.name);
    assert.equal(source.evidence?.uid, spec.uid);
    assert.equal(source.evidence?.registeredSeat, spec.seat);
    assert.equal(source.evidence?.uidStatus, "Active");
    assert.equal(source.evidence?.commercialRegisterStatus, "Active");
    assert.match(source.evidence?.legalForm, /Limited liability company/);

    const organization = {
      identity_id: spec.identityId,
      id: stableUuid(`organization:${spec.identityId}`),
      slug: spec.slug,
      name: spec.name,
      legal_name: spec.name,
      website: null,
      status: "active",
      verification_status: "unverified",
      is_published: false,
      last_reviewed_at: null,
    };
    organizations.push(organization);
    organizationSources.push({
      source_key: spec.sourceId,
      id: stableUuid(`organization-source:${spec.identityId}:${spec.sourceId}`),
      organization_id: organization.id,
      source_type: "public",
      source_name: source.title,
      source_url: source.url,
      external_record_id: spec.uid,
      accessed_on: source.accessedOn,
      retrieved_at: null,
      reviewed_at: null,
      fields_supported: ["name", "legal_name", "status"],
      notes: `Official Swiss UID evidence current on ${source.observationDate}: ${spec.uid}; legal form ${source.evidence.legalForm}; registered seat ${source.evidence.registeredSeat}; registered address ${source.evidence.registeredAddress}; UID and commercial-register status Active. No provider identity, trading alias, authorization, classification, service area, offering, publication, or verification fact is asserted.`,
    });
  }

  const nurseProvider = packets[0].identities.find((item) => item.identityId === "nurse-home-care");
  const soinProvider = packets[1].identities.find((item) => item.identityId === "soinvaud-provider");
  const soinsvaudAlias = packets[1].identities.find((item) => item.identityId === "soinsvaud");
  assert.equal(nurseProvider?.intendedAction, "hold");
  assert.equal(soinProvider?.intendedAction, "hold");
  assert.equal(soinsvaudAlias?.intendedAction, "alias");
  assert.ok(nurseProvider.unresolved.length && soinProvider.unresolved.length
    && soinsvaudAlias.unresolved.length);

  return { batch, organizations, organizationSources,
    expectedRows: { organizations: 2, organizationSources: 2, providers: 0, netNewRows: 4 } };
}

const rows = (value) => `jsonb_to_recordset(${jsonSql(value)})`;

export function buildBatchCApplySql({ rollback = false } = {}) {
  const data = compileBatchC();
  const organizations = data.organizations.map(({ identity_id: _identityId, ...item }) => item);
  return beginLocalSql + `
LOCK TABLE public.providers, public.provider_sources, public.organizations,
  public.organization_sources, public.organization_names, public.organization_relationships,
  public.provider_organizations, public.care_offerings, public.care_offering_sources,
  public.care_offering_features, public.care_offering_availability,
  public.provider_service_areas, public.provider_identity_links,
  public.care_offering_regulatory_designations IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE lia_batch_c_before AS SELECT
  (SELECT count(*) FROM public.providers) providers,
  (SELECT count(*) FROM public.provider_sources) provider_sources,
  (SELECT count(*) FROM public.organizations) organizations,
  (SELECT count(*) FROM public.organization_sources) organization_sources,
  (SELECT count(*) FROM public.organization_names) organization_names,
  (SELECT count(*) FROM public.organization_relationships) organization_relationships,
  (SELECT count(*) FROM public.provider_organizations) provider_organizations,
  (SELECT count(*) FROM public.care_offerings) offerings,
  (SELECT count(*) FROM public.care_offering_sources) offering_sources,
  (SELECT count(*) FROM public.care_offering_features) features,
  (SELECT count(*) FROM public.care_offering_availability) availability,
  (SELECT count(*) FROM public.provider_service_areas) service_areas,
  (SELECT count(*) FROM public.provider_identity_links) identity_links,
  (SELECT count(*) FROM public.care_offering_regulatory_designations) designations;

DO $guard$ BEGIN
  IF (SELECT count(*) FROM public.providers)<>116
    OR (SELECT count(*) FROM public.provider_sources)<>186
    OR (SELECT count(*) FROM public.organizations)<>31
    OR (SELECT count(*) FROM public.organization_sources)<>9
    OR (SELECT count(*) FROM public.organization_names)<>1
    OR (SELECT count(*) FROM public.organization_relationships)<>7
    OR (SELECT count(*) FROM public.provider_organizations)<>133
    OR (SELECT count(*) FROM public.care_offerings)<>82
    OR (SELECT count(*) FROM public.care_offering_sources)<>103
    OR (SELECT count(*) FROM public.care_offering_features)<>84
    OR (SELECT count(*) FROM public.care_offering_availability)<>0
    OR (SELECT count(*) FROM public.provider_service_areas)<>1
    OR (SELECT count(*) FROM public.provider_identity_links)<>50
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations)<>50
    OR (SELECT count(*) FROM public.providers WHERE slug LIKE 'cms-%')<>50 THEN
    RAISE EXCEPTION 'Batch C requires exact completed public-CMS predecessor';
  END IF;
  IF EXISTS (SELECT FROM public.organizations o JOIN ${rows(organizations)}
      x(id uuid,slug text,name text,legal_name text)
      ON o.id=x.id OR o.slug=x.slug OR lower(btrim(o.name))=lower(btrim(x.name))
      OR lower(btrim(o.legal_name))=lower(btrim(x.legal_name)))
    OR EXISTS (SELECT FROM public.organization_sources s JOIN ${rows(data.organizationSources)}
      x(id uuid) ON s.id=x.id) THEN
    RAISE EXCEPTION 'Batch C identity or deterministic ID collision';
  END IF;
END $guard$;

INSERT INTO public.organizations
  (id,slug,name,legal_name,website,status,verification_status,is_published,last_reviewed_at)
SELECT id,slug,name,legal_name,website,status,verification_status,is_published,last_reviewed_at
FROM ${rows(organizations)} x(id uuid,slug text,name text,legal_name text,website text,
  status text,verification_status text,is_published boolean,last_reviewed_at timestamptz);

INSERT INTO public.organization_sources
  (id,organization_id,source_type,source_name,source_url,external_record_id,accessed_on,
   retrieved_at,reviewed_at,fields_supported,notes)
SELECT id,organization_id,source_type,source_name,source_url,external_record_id,accessed_on,
  retrieved_at,reviewed_at,fields_supported,notes
FROM ${rows(data.organizationSources)} x(source_key text,id uuid,organization_id uuid,
  source_type text,source_name text,source_url text,external_record_id text,accessed_on date,
  retrieved_at timestamptz,reviewed_at timestamptz,fields_supported text[],notes text);

DO $verify$ BEGIN
  IF (SELECT count(*) FROM public.organizations o JOIN ${rows(organizations)} x(id uuid)
      ON o.id=x.id)<>2
    OR (SELECT count(*) FROM public.organization_sources s JOIN ${rows(data.organizationSources)}
      x(id uuid) ON s.id=x.id)<>2
    OR EXISTS (SELECT FROM public.organizations o JOIN ${rows(organizations)} x(id uuid)
      ON o.id=x.id WHERE o.is_published OR o.verification_status<>'unverified'
      OR o.status<>'active' OR o.website IS NOT NULL OR o.last_reviewed_at IS NOT NULL)
    OR (SELECT count(*) FROM public.providers)<>(SELECT providers FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.provider_sources)<>(SELECT provider_sources FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.organizations)<>(SELECT organizations+2 FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.organization_sources)<>(SELECT organization_sources+2 FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.organization_names)<>(SELECT organization_names FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.organization_relationships)<>(SELECT organization_relationships FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.provider_organizations)<>(SELECT provider_organizations FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.care_offerings)<>(SELECT offerings FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.care_offering_sources)<>(SELECT offering_sources FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.care_offering_features)<>(SELECT features FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.care_offering_availability)<>(SELECT availability FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.provider_service_areas)<>(SELECT service_areas FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.provider_identity_links)<>(SELECT identity_links FROM lia_batch_c_before)
    OR (SELECT count(*) FROM public.care_offering_regulatory_designations)<>(SELECT designations FROM lia_batch_c_before) THEN
    RAISE EXCEPTION 'Batch C exact-row or safety verification failed';
  END IF;
END $verify$;

SET LOCAL ROLE anon;
DO $rls$ BEGIN
  IF EXISTS (SELECT FROM public.organizations o JOIN ${rows(organizations)} x(id uuid) ON o.id=x.id)
    OR has_table_privilege(current_user,'public.organization_sources','SELECT') THEN
    RAISE EXCEPTION 'Unpublished Batch C organization evidence became public';
  END IF;
END $rls$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $rls$ BEGIN
  IF EXISTS (SELECT FROM public.organizations o JOIN ${rows(organizations)} x(id uuid) ON o.id=x.id)
    OR has_table_privilege(current_user,'public.organization_sources','SELECT') THEN
    RAISE EXCEPTION 'Unpublished Batch C organization evidence became authenticated-visible';
  END IF;
END $rls$;
RESET ROLE;

SELECT jsonb_build_object('organizationsCreated',2,'organizationSourcesCreated',2,
  'providersCreated',0,'netNewRows',4);
${rollback ? "ROLLBACK" : "COMMIT"};
`;
}

export function buildBatchCRollbackSql() {
  const data = compileBatchC();
  return beginLocalSql + `
LOCK TABLE public.organizations, public.organization_sources, public.organization_names,
  public.organization_relationships, public.provider_organizations IN SHARE ROW EXCLUSIVE MODE;
DO $guard$ BEGIN
  IF EXISTS (SELECT FROM public.provider_organizations po JOIN ${rows(data.organizations)}
      x(identity_id text,id uuid) ON po.organization_id=x.id)
    OR EXISTS (SELECT FROM public.organization_relationships r JOIN ${rows(data.organizations)}
      x(identity_id text,id uuid) ON r.parent_organization_id=x.id OR r.member_organization_id=x.id)
    OR EXISTS (SELECT FROM public.organization_names n JOIN ${rows(data.organizations)}
      x(identity_id text,id uuid) ON n.organization_id=x.id) THEN
    RAISE EXCEPTION 'Batch C rollback refuses dependent rows';
  END IF;
END $guard$;
DELETE FROM public.organization_sources s USING ${rows(data.organizationSources)} x(id uuid)
WHERE s.id=x.id;
DELETE FROM public.organizations o USING ${rows(data.organizations)} x(identity_id text,id uuid)
WHERE o.id=x.id;
COMMIT;
`;
}
