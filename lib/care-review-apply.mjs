import { beginLocalSql, jsonSql, snapshotSql } from "./local-provider-writer.mjs";
import { validateBoveressesCarePacket } from "./care-review-packet.mjs";

const snapshot = (table, where = "true") => `(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]') FROM public.${table} t WHERE ${where})`;

export function buildBoveressesCareApplySql(packet, expectedProvider, { rollback = false } = {}) {
  const checked = validateBoveressesCarePacket(packet);
  if (!checked.localApplyReady) throw new Error("Care packet needs explicit local-apply approval");
  const offering = {
    slug: packet.offering.slug,
    name: packet.offering.name,
    offering_type: packet.offering.offeringType,
    capacity_value: packet.offering.capacity.value,
    capacity_unit: packet.offering.capacity.unit,
    long_stay: packet.offering.stayModes.longStay.value,
    short_stay: null,
    respite_stay: null,
    admissions_notes: null,
    financing_notes: null,
    public_interest_status: null,
    pricing_notes: null,
  };
  const features = packet.offering.features.map((feature) => ({
    feature_kind: feature.kind, feature_code: feature.code, display_name: feature.displayName,
    details: feature.details, source_type: feature.evidence.kind, source_name: feature.evidence.name,
    source_url: feature.evidence.url,
  }));
  const organization = packet.organization;
  const publicEvidence = packet.offering.typeEvidence;
  const providerEvidence = packet.offering.stayModes.longStay.evidence;
  if (features.some((feature) => feature.source_type !== providerEvidence.kind
    || feature.source_name !== providerEvidence.name || feature.source_url !== providerEvidence.url)) {
    throw new Error("Boveresses features must use the reviewed official provider source");
  }

  return beginLocalSql + `
DO $phase4_guard$
BEGIN
  IF (SELECT count(*) FROM pg_class WHERE oid IN
    ('public.organizations'::regclass, 'public.provider_organizations'::regclass,
     'public.care_offerings'::regclass, 'public.care_offering_features'::regclass,
     'public.care_offering_sources'::regclass, 'public.care_offering_availability'::regclass)
    AND relkind = 'r' AND relrowsecurity) <> 6 THEN
    RAISE EXCEPTION 'Expected Phase 4A tables and RLS required';
  END IF;
END $phase4_guard$;
LOCK TABLE public.providers, public.provider_sources, public.provider_service_areas,
  public.municipalities, public.organizations, public.provider_organizations,
  public.care_offerings, public.care_offering_features, public.care_offering_sources,
  public.care_offering_availability IN SHARE ROW EXCLUSIVE MODE;
${snapshotSql}
CREATE TEMP TABLE lia_phase4b_target AS
  SELECT id AS provider_id FROM public.providers
  WHERE legacy_id = 'ems-boveresses' AND slug = 'ems-boveresses';
CREATE TEMP TABLE lia_phase4b_guard (name text PRIMARY KEY, snapshot jsonb);
INSERT INTO lia_phase4b_guard VALUES
  ('providers', ${snapshot("providers")}),
  ('provider_sources', ${snapshot("provider_sources")}),
  ('service_areas', ${snapshot("provider_service_areas")}),
  ('municipalities', ${snapshot("municipalities")}),
  ('other_organizations', ${snapshot("organizations")}),
  ('other_relationships', ${snapshot("provider_organizations", "provider_id <> (SELECT provider_id FROM lia_phase4b_target)")}),
  ('other_offerings', ${snapshot("care_offerings", "provider_id <> (SELECT provider_id FROM lia_phase4b_target)")}),
  ('other_features', ${snapshot("care_offering_features", "provider_id <> (SELECT provider_id FROM lia_phase4b_target)")}),
  ('other_offering_sources', ${snapshot("care_offering_sources", "provider_id <> (SELECT provider_id FROM lia_phase4b_target)")}),
  ('availability', ${snapshot("care_offering_availability")});

DO $apply$
DECLARE
  provider_uuid uuid; organization_uuid uuid; offering_uuid uuid;
  public_source_uuid uuid; provider_source_uuid uuid; current_row jsonb;
  expected jsonb := ${jsonSql(expectedProvider)}; item jsonb; matches integer;
BEGIN
  IF (SELECT count(*) FROM lia_phase4b_target) <> 1 THEN
    RAISE EXCEPTION 'Boveresses provider identity conflict; no changes applied';
  END IF;
  SELECT id, to_jsonb(p) - ARRAY['id','created_at','updated_at'] INTO provider_uuid, current_row
    FROM public.providers p WHERE legacy_id = 'ems-boveresses' AND slug = 'ems-boveresses';
  IF current_row IS DISTINCT FROM expected
    OR current_row->>'name' <> 'Tertianum Les Boveresses'
    OR current_row->>'primary_type' <> 'ems'
    OR current_row->>'verification_status' <> 'unverified'
    OR current_row->>'is_published' <> 'false' OR current_row->>'last_reviewed_at' IS NOT NULL THEN
    RAISE EXCEPTION 'Boveresses provider identity or reviewed-state conflict; no changes applied';
  END IF;
  IF (SELECT count(*) FROM public.provider_sources WHERE provider_id = provider_uuid) <> 3
    OR (SELECT count(*) FROM public.provider_sources WHERE provider_id = provider_uuid
      AND source_type = 'legacy' AND external_record_id = 'ems-boveresses') <> 1 THEN
    RAISE EXCEPTION 'Boveresses provider provenance conflict; no changes applied';
  END IF;
  SELECT id INTO public_source_uuid FROM public.provider_sources
    WHERE provider_id = provider_uuid AND source_type = ${jsonSql(publicEvidence.kind)} #>> '{}'
      AND source_name = ${jsonSql(publicEvidence.name)} #>> '{}'
      AND source_url = ${jsonSql(publicEvidence.url)} #>> '{}'
      AND external_record_id = ${jsonSql(publicEvidence.url)} #>> '{}';
  GET DIAGNOSTICS matches = ROW_COUNT;
  IF matches <> 1 THEN RAISE EXCEPTION 'Required official public source is missing or ambiguous'; END IF;
  SELECT id INTO provider_source_uuid FROM public.provider_sources
    WHERE provider_id = provider_uuid AND source_type = ${jsonSql(providerEvidence.kind)} #>> '{}'
      AND source_name = ${jsonSql(providerEvidence.name)} #>> '{}'
      AND source_url = ${jsonSql(providerEvidence.url)} #>> '{}'
      AND external_record_id = ${jsonSql(providerEvidence.url)} #>> '{}';
  GET DIAGNOSTICS matches = ROW_COUNT;
  IF matches <> 1 THEN RAISE EXCEPTION 'Required official provider source is missing or ambiguous'; END IF;
  IF EXISTS (SELECT FROM public.organizations WHERE slug = ${jsonSql(organization.slug)} #>> '{}')
    OR EXISTS (SELECT FROM public.provider_organizations WHERE provider_id = provider_uuid)
    OR EXISTS (SELECT FROM public.care_offerings WHERE provider_id = provider_uuid)
    OR EXISTS (SELECT FROM public.provider_service_areas WHERE provider_id = provider_uuid) THEN
    RAISE EXCEPTION 'Existing Boveresses care state requires reconciliation; no changes applied';
  END IF;

  INSERT INTO public.organizations (slug, name)
    VALUES (${jsonSql(organization.slug)} #>> '{}', ${jsonSql(organization.name)} #>> '{}')
    RETURNING id INTO organization_uuid;
  INSERT INTO public.provider_organizations
    (provider_id, organization_id, relationship_type, is_primary, source_id)
    VALUES (provider_uuid, organization_uuid, ${jsonSql(organization.relationshipType)} #>> '{}', true, public_source_uuid);
  INSERT INTO public.care_offerings
    (provider_id, slug, name, offering_type, capacity_value, capacity_unit,
     long_stay, short_stay, respite_stay, admissions_notes, financing_notes,
     public_interest_status, pricing_notes)
    SELECT provider_uuid, row.slug, row.name, row.offering_type, row.capacity_value,
      row.capacity_unit, row.long_stay, row.short_stay, row.respite_stay,
      row.admissions_notes, row.financing_notes, row.public_interest_status, row.pricing_notes
    FROM jsonb_populate_record(NULL::public.care_offerings, ${jsonSql(offering)}) row
    RETURNING id INTO offering_uuid;
  INSERT INTO public.care_offering_sources
    (provider_id, offering_id, source_id, fields_supported, notes)
  VALUES
    (provider_uuid, offering_uuid, public_source_uuid,
      ARRAY['offering_type','capacity_value','capacity_unit'],
      'Reviewed Phase 3B evidence; official public source.'),
    (provider_uuid, offering_uuid, provider_source_uuid,
      ARRAY['long_stay'], 'Reviewed Phase 3B evidence; official provider source.');

  FOR item IN SELECT value FROM jsonb_array_elements(${jsonSql(features)}) LOOP
    INSERT INTO public.care_offering_features
      (provider_id, offering_id, feature_kind, feature_code, display_name, details, source_id)
    VALUES (provider_uuid, offering_uuid, item->>'feature_kind', item->>'feature_code',
      item->>'display_name', item->>'details',
      provider_source_uuid);
  END LOOP;

  IF (SELECT count(*) FROM public.care_offering_features WHERE provider_id = provider_uuid) <> ${features.length}
    OR (SELECT count(*) FROM public.care_offering_sources WHERE provider_id = provider_uuid) <> 2
    OR EXISTS (SELECT FROM public.care_offerings WHERE id = offering_uuid AND
      (is_published OR verification_status <> 'unverified' OR status <> 'active'
       OR short_stay IS NOT NULL OR respite_stay IS NOT NULL OR admissions_notes IS NOT NULL
       OR financing_notes IS NOT NULL OR public_interest_status IS NOT NULL OR pricing_notes IS NOT NULL))
    OR EXISTS (SELECT FROM public.organizations WHERE id = organization_uuid AND
      (is_published OR verification_status <> 'unverified' OR status <> 'active')) THEN
    RAISE EXCEPTION 'Phase 4B post-apply state is unsafe';
  END IF;
END $apply$;

DO $unchanged$
DECLARE state jsonb;
BEGIN
  IF ${snapshot("providers")} IS DISTINCT FROM (SELECT snapshot FROM lia_phase4b_guard WHERE name='providers')
    OR ${snapshot("provider_sources")} IS DISTINCT FROM (SELECT snapshot FROM lia_phase4b_guard WHERE name='provider_sources')
    OR ${snapshot("provider_service_areas")} IS DISTINCT FROM (SELECT snapshot FROM lia_phase4b_guard WHERE name='service_areas')
    OR ${snapshot("municipalities")} IS DISTINCT FROM (SELECT snapshot FROM lia_phase4b_guard WHERE name='municipalities')
    OR ${snapshot("organizations", "slug <> 'tertianum-vaud-sa'")} IS DISTINCT FROM (SELECT snapshot FROM lia_phase4b_guard WHERE name='other_organizations')
    OR ${snapshot("provider_organizations", "provider_id <> (SELECT provider_id FROM lia_phase4b_target)")} IS DISTINCT FROM (SELECT snapshot FROM lia_phase4b_guard WHERE name='other_relationships')
    OR ${snapshot("care_offerings", "provider_id <> (SELECT provider_id FROM lia_phase4b_target)")} IS DISTINCT FROM (SELECT snapshot FROM lia_phase4b_guard WHERE name='other_offerings')
    OR ${snapshot("care_offering_features", "provider_id <> (SELECT provider_id FROM lia_phase4b_target)")} IS DISTINCT FROM (SELECT snapshot FROM lia_phase4b_guard WHERE name='other_features')
    OR ${snapshot("care_offering_sources", "provider_id <> (SELECT provider_id FROM lia_phase4b_target)")} IS DISTINCT FROM (SELECT snapshot FROM lia_phase4b_guard WHERE name='other_offering_sources')
    OR ${snapshot("care_offering_availability")} IS DISTINCT FROM (SELECT snapshot FROM lia_phase4b_guard WHERE name='availability') THEN
    RAISE EXCEPTION 'Unrelated provider or care data changed';
  END IF;
  IF (SELECT count(*) FROM public.organizations) <> jsonb_array_length((SELECT snapshot FROM lia_phase4b_guard WHERE name='other_organizations')) + 1 THEN
    RAISE EXCEPTION 'Unexpected organization change';
  END IF;
  IF to_regclass('public.leads') IS NULL THEN state := '{"exists":false}'::jsonb;
  ELSE EXECUTE 'SELECT jsonb_build_object(''exists'',true,''count'',count(*),''hash'',md5(coalesce(string_agg(to_jsonb(t)::text,E''\\n'' ORDER BY to_jsonb(t)::text),''''))) FROM public.leads t' INTO state;
  END IF;
  IF state IS DISTINCT FROM (SELECT snapshot FROM lia_untouched WHERE name='leads') THEN RAISE EXCEPTION 'Leads changed'; END IF;
END $unchanged$;

SET LOCAL ROLE anon;
DO $anon$ BEGIN
  IF EXISTS (SELECT FROM public.organizations WHERE slug='tertianum-vaud-sa')
    OR EXISTS (SELECT FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.slug='ems-boveresses')
    OR EXISTS (SELECT FROM public.care_offering_features f JOIN public.providers p ON p.id=f.provider_id WHERE p.slug='ems-boveresses')
    OR has_table_privilege(current_user, 'public.provider_sources', 'SELECT')
    OR has_table_privilege(current_user, 'public.care_offering_sources', 'SELECT') THEN
    RAISE EXCEPTION 'Unpublished Phase 4B data is visible to anon';
  END IF;
END $anon$;
RESET ROLE;

SELECT jsonb_build_object(
  'provider','ems-boveresses',
  'organization',(SELECT jsonb_build_object('id',o.id,'slug',o.slug,'name',o.name,'published',o.is_published,'verified',o.verification_status <> 'unverified') FROM public.organizations o WHERE o.slug='tertianum-vaud-sa'),
  'offering',(SELECT jsonb_build_object('id',o.id,'slug',o.slug,'type',o.offering_type,'capacity',o.capacity_value,'capacityUnit',o.capacity_unit,'longStay',o.long_stay,'shortStay',o.short_stay,'respiteStay',o.respite_stay,'published',o.is_published,'verified',o.verification_status <> 'unverified') FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.slug='ems-boveresses'),
  'features',(SELECT jsonb_agg(f.feature_code ORDER BY f.feature_code) FROM public.care_offering_features f JOIN public.providers p ON p.id=f.provider_id WHERE p.slug='ems-boveresses'),
  'offeringSources',(SELECT count(*) FROM public.care_offering_sources s JOIN public.providers p ON p.id=s.provider_id WHERE p.slug='ems-boveresses'),
  'providerSourcesAdded',0,'deferredClaims',${checked.deferredCount},'published',false,'verified',false);
${rollback ? "ROLLBACK" : "COMMIT"};
`;
}
