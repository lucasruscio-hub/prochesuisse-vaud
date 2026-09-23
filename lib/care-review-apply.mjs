import { beginLocalSql, jsonSql, snapshotSql } from "./local-provider-writer.mjs";
import { validateCarePacket } from "./care-review-packet.mjs";

const snapshot = (table, where = "true") => `(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]') FROM public.${table} t WHERE ${where})`;
const evidenceKey = (evidence) => JSON.stringify([evidence.kind, evidence.name, evidence.url]);

function compilePacket(packet) {
  const sources = new Map();
  const register = (evidence) => {
    const key = evidenceKey(evidence);
    if (!sources.has(key)) sources.set(key, { key, source_type: evidence.kind, source_name: evidence.name,
      source_url: evidence.url, external_record_id: evidence.url, accessed_on: evidence.accessedOn });
    return key;
  };
  const organizations = packet.organizations.map((organization) => ({
    ...organization, source_key: register(organization.evidence), evidence: undefined,
  }));
  const offerings = [];
  const offeringSources = [];
  const features = [];
  for (const item of packet.offerings) {
    const offering = {
      packet_slug: item.slug, slug: item.slug, name: item.name, offering_type: item.offeringType,
      capacity_value: item.capacity?.value ?? null, capacity_unit: item.capacity?.unit ?? null,
      long_stay: item.stayModes.longStay?.value ?? null,
      short_stay: item.stayModes.shortStay?.value ?? null,
      respite_stay: item.stayModes.respiteStay?.value ?? null,
      admissions_notes: item.admissions?.value ?? null,
      financing_notes: item.financing?.value ?? null,
      public_interest_status: item.publicInterestStatus?.value ?? null,
      pricing_notes: item.pricing?.value ?? null,
    };
    offerings.push(offering);
    const fieldsBySource = new Map();
    const field = (evidence, ...names) => {
      const key = register(evidence);
      if (!fieldsBySource.has(key)) fieldsBySource.set(key, []);
      fieldsBySource.get(key).push(...names);
    };
    field(item.typeEvidence, "offering_type");
    if (item.capacity) field(item.capacity.evidence, "capacity_value", "capacity_unit");
    for (const [packetName, column] of [["longStay", "long_stay"], ["shortStay", "short_stay"], ["respiteStay", "respite_stay"]]) {
      if (item.stayModes[packetName]) field(item.stayModes[packetName].evidence, column);
    }
    for (const [packetName, column] of [["admissions", "admissions_notes"], ["financing", "financing_notes"],
      ["publicInterestStatus", "public_interest_status"], ["pricing", "pricing_notes"]]) {
      if (item[packetName]) field(item[packetName].evidence, column);
    }
    for (const [source_key, fields_supported] of fieldsBySource) {
      offeringSources.push({ offering_slug: item.slug, source_key, fields_supported });
    }
    for (const feature of item.features) features.push({ offering_slug: item.slug,
      feature_kind: feature.kind, feature_code: feature.code, display_name: feature.displayName,
      details: feature.details, source_key: register(feature.evidence) });
  }
  return { sources: [...sources.values()], organizations, offerings, offeringSources, features };
}

export function buildCareApplySql(packet, expectedProvider, { rollback = false } = {}) {
  const checked = validateCarePacket(packet);
  if (!checked.localApplyReady) throw new Error("Care packet requires explicit local approval and no unresolved issues");
  const compiled = compilePacket(packet);
  const slug = packet.identity.slug;
  const target = `(SELECT provider_id FROM lia_care_target)`;
  return beginLocalSql + `
DO $phase4_guard$
BEGIN
  IF (SELECT count(*) FROM pg_class WHERE oid IN
    ('public.organizations'::regclass, 'public.provider_organizations'::regclass,
     'public.care_offerings'::regclass, 'public.care_offering_features'::regclass,
     'public.care_offering_sources'::regclass, 'public.care_offering_availability'::regclass)
    AND relkind='r' AND relrowsecurity) <> 6 THEN RAISE EXCEPTION 'Expected Phase 4A tables and RLS required'; END IF;
END $phase4_guard$;
LOCK TABLE public.providers, public.provider_sources, public.provider_service_areas,
  public.municipalities, public.organizations, public.provider_organizations,
  public.care_offerings, public.care_offering_features, public.care_offering_sources,
  public.care_offering_availability IN SHARE ROW EXCLUSIVE MODE;
${snapshotSql}
CREATE TEMP TABLE lia_care_target AS SELECT id AS provider_id FROM public.providers
  WHERE legacy_id=${jsonSql(packet.identity.legacyId)} #>> '{}' AND slug=${jsonSql(slug)} #>> '{}';
CREATE TEMP TABLE lia_care_guard (name text PRIMARY KEY, snapshot jsonb);
INSERT INTO lia_care_guard VALUES
  ('providers',${snapshot("providers")}),('service_areas',${snapshot("provider_service_areas")}),
  ('municipalities',${snapshot("municipalities")}),('availability',${snapshot("care_offering_availability")}),
  ('other_relationships',${snapshot("provider_organizations", `provider_id <> ${target}`)}),
  ('other_offerings',${snapshot("care_offerings", `provider_id <> ${target}`)}),
  ('other_features',${snapshot("care_offering_features", `provider_id <> ${target}`)}),
  ('other_offering_sources',${snapshot("care_offering_sources", `provider_id <> ${target}`)});
CREATE TEMP TABLE lia_care_existing_sources AS SELECT id,to_jsonb(s) snapshot FROM public.provider_sources s;
CREATE TEMP TABLE lia_care_existing_organizations AS SELECT id,to_jsonb(o) snapshot FROM public.organizations o;
CREATE TEMP TABLE lia_care_sources (source_key text PRIMARY KEY, source_id uuid NOT NULL);
CREATE TEMP TABLE lia_care_offerings (packet_slug text PRIMARY KEY, offering_id uuid NOT NULL);

DO $apply$
DECLARE provider_uuid uuid; organization_uuid uuid; offering_uuid uuid; source_uuid uuid;
  current_row jsonb; expected jsonb := ${jsonSql(expectedProvider)}; item jsonb; matches integer;
BEGIN
  IF (SELECT count(*) FROM lia_care_target) <> 1 THEN RAISE EXCEPTION 'Provider identity conflict; no changes applied'; END IF;
  SELECT id,to_jsonb(p)-ARRAY['id','created_at','updated_at'] INTO provider_uuid,current_row
    FROM public.providers p WHERE p.id=${target};
  IF current_row IS DISTINCT FROM expected
    OR current_row->>'name' <> ${jsonSql(packet.identity.expectedName)} #>> '{}'
    OR current_row->>'primary_type' <> ${jsonSql(packet.identity.expectedType)} #>> '{}'
    OR current_row->>'verification_status' <> 'unverified' OR current_row->>'is_published' <> 'false'
    OR current_row->>'last_reviewed_at' IS NOT NULL THEN
    RAISE EXCEPTION 'Provider identity or reviewed-state conflict; no changes applied';
  END IF;
  IF (SELECT count(*) FROM public.provider_sources WHERE provider_id=provider_uuid
      AND source_type='legacy' AND external_record_id=${jsonSql(packet.identity.legacyId)} #>> '{}') <> 1
    OR EXISTS (SELECT FROM public.provider_organizations WHERE provider_id=provider_uuid)
    OR EXISTS (SELECT FROM public.care_offerings WHERE provider_id=provider_uuid) THEN
    RAISE EXCEPTION 'Existing reviewed care state requires reconciliation; no changes applied';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(${jsonSql(compiled.sources)}) LOOP
    SELECT count(*),(array_agg(id))[1] INTO matches,source_uuid FROM public.provider_sources
      WHERE provider_id=provider_uuid AND source_type=item->>'source_type'
        AND (source_url=item->>'source_url' OR external_record_id=item->>'external_record_id');
    IF matches=0 THEN
      INSERT INTO public.provider_sources(provider_id,source_type,source_name,source_url,external_record_id,
        fields_supported,notes)
      VALUES(provider_uuid,item->>'source_type',item->>'source_name',item->>'source_url',item->>'external_record_id',
        '{}',format('Reviewed care evidence accessed on %s; pending publication and final verification.',item->>'accessed_on'))
      RETURNING id INTO source_uuid;
    ELSIF matches<>1 OR NOT EXISTS (SELECT FROM public.provider_sources WHERE id=source_uuid
      AND source_name=item->>'source_name' AND source_url=item->>'source_url'
      AND external_record_id=item->>'external_record_id') THEN
      RAISE EXCEPTION 'Care evidence source conflict; reconciliation required';
    END IF;
    INSERT INTO lia_care_sources VALUES(item->>'key',source_uuid);
  END LOOP;

  FOR item IN SELECT value FROM jsonb_array_elements(${jsonSql(compiled.organizations)}) LOOP
    SELECT count(*),(array_agg(id))[1] INTO matches,organization_uuid FROM public.organizations WHERE slug=item->>'slug';
    IF matches=0 THEN
      INSERT INTO public.organizations(slug,name) VALUES(item->>'slug',item->>'name') RETURNING id INTO organization_uuid;
    ELSIF matches<>1 OR NOT EXISTS (SELECT FROM public.organizations WHERE id=organization_uuid
      AND name=item->>'name' AND legal_name IS NULL AND website IS NULL AND status='active'
      AND verification_status='unverified' AND NOT is_published AND last_reviewed_at IS NULL) THEN
      RAISE EXCEPTION 'Organization conflict; reconciliation required';
    END IF;
    INSERT INTO public.provider_organizations(provider_id,organization_id,relationship_type,is_primary,source_id)
    SELECT provider_uuid,organization_uuid,item->>'relationshipType',(item->>'isPrimary')::boolean,s.source_id
      FROM lia_care_sources s WHERE s.source_key=item->>'source_key';
  END LOOP;

  FOR item IN SELECT value FROM jsonb_array_elements(${jsonSql(compiled.offerings)}) LOOP
    INSERT INTO public.care_offerings(provider_id,slug,name,offering_type,capacity_value,capacity_unit,
      long_stay,short_stay,respite_stay,admissions_notes,financing_notes,public_interest_status,pricing_notes)
    SELECT provider_uuid,r.slug,r.name,r.offering_type,r.capacity_value,r.capacity_unit,r.long_stay,
      r.short_stay,r.respite_stay,r.admissions_notes,r.financing_notes,r.public_interest_status,r.pricing_notes
      FROM jsonb_populate_record(NULL::public.care_offerings,item) r RETURNING id INTO offering_uuid;
    INSERT INTO lia_care_offerings VALUES(item->>'packet_slug',offering_uuid);
  END LOOP;
  INSERT INTO public.care_offering_sources(provider_id,offering_id,source_id,fields_supported,
    notes)
  SELECT provider_uuid,o.offering_id,s.source_id,r.fields_supported,
    'Reviewed care packet evidence; pending publication and final verification.'
  FROM jsonb_to_recordset(${jsonSql(compiled.offeringSources)})
    r(offering_slug text,source_key text,fields_supported text[])
  JOIN lia_care_offerings o ON o.packet_slug=r.offering_slug
  JOIN lia_care_sources s ON s.source_key=r.source_key;
  INSERT INTO public.care_offering_features(provider_id,offering_id,feature_kind,feature_code,display_name,details,source_id)
  SELECT provider_uuid,o.offering_id,r.feature_kind,r.feature_code,r.display_name,r.details,s.source_id
  FROM jsonb_to_recordset(${jsonSql(compiled.features)})
    r(offering_slug text,feature_kind text,feature_code text,display_name text,details text,source_key text)
  JOIN lia_care_offerings o ON o.packet_slug=r.offering_slug
  JOIN lia_care_sources s ON s.source_key=r.source_key;

  IF (SELECT count(*) FROM public.care_offerings WHERE provider_id=provider_uuid) <> ${compiled.offerings.length}
    OR (SELECT count(*) FROM public.care_offering_features WHERE provider_id=provider_uuid) <> ${compiled.features.length}
    OR (SELECT count(*) FROM public.care_offering_sources WHERE provider_id=provider_uuid) <> ${compiled.offeringSources.length}
    OR EXISTS (SELECT FROM public.care_offerings WHERE provider_id=provider_uuid
      AND (is_published OR verification_status<>'unverified' OR status<>'active'))
    OR EXISTS (SELECT FROM public.provider_organizations po JOIN public.organizations o ON o.id=po.organization_id
      WHERE po.provider_id=provider_uuid AND (o.is_published OR o.verification_status<>'unverified' OR o.status<>'active')) THEN
    RAISE EXCEPTION 'Post-apply care state is unsafe';
  END IF;
END $apply$;

DO $unchanged$
DECLARE state jsonb;
BEGIN
  IF ${snapshot("providers")} IS DISTINCT FROM (SELECT snapshot FROM lia_care_guard WHERE name='providers')
    OR ${snapshot("provider_service_areas")} IS DISTINCT FROM (SELECT snapshot FROM lia_care_guard WHERE name='service_areas')
    OR ${snapshot("municipalities")} IS DISTINCT FROM (SELECT snapshot FROM lia_care_guard WHERE name='municipalities')
    OR ${snapshot("care_offering_availability")} IS DISTINCT FROM (SELECT snapshot FROM lia_care_guard WHERE name='availability')
    OR ${snapshot("provider_organizations", `provider_id <> ${target}`)} IS DISTINCT FROM (SELECT snapshot FROM lia_care_guard WHERE name='other_relationships')
    OR ${snapshot("care_offerings", `provider_id <> ${target}`)} IS DISTINCT FROM (SELECT snapshot FROM lia_care_guard WHERE name='other_offerings')
    OR ${snapshot("care_offering_features", `provider_id <> ${target}`)} IS DISTINCT FROM (SELECT snapshot FROM lia_care_guard WHERE name='other_features')
    OR ${snapshot("care_offering_sources", `provider_id <> ${target}`)} IS DISTINCT FROM (SELECT snapshot FROM lia_care_guard WHERE name='other_offering_sources')
    OR EXISTS (SELECT FROM lia_care_existing_sources old LEFT JOIN public.provider_sources s ON s.id=old.id
      WHERE to_jsonb(s) IS DISTINCT FROM old.snapshot)
    OR EXISTS (SELECT FROM lia_care_existing_organizations old LEFT JOIN public.organizations o ON o.id=old.id
      WHERE to_jsonb(o) IS DISTINCT FROM old.snapshot) THEN RAISE EXCEPTION 'Unrelated or existing data changed'; END IF;
  IF to_regclass('public.leads') IS NULL THEN state:='{"exists":false}'::jsonb;
  ELSE EXECUTE 'SELECT jsonb_build_object(''exists'',true,''count'',count(*),''hash'',md5(coalesce(string_agg(to_jsonb(t)::text,E''\\n'' ORDER BY to_jsonb(t)::text),''''))) FROM public.leads t' INTO state; END IF;
  IF state IS DISTINCT FROM (SELECT snapshot FROM lia_untouched WHERE name='leads') THEN RAISE EXCEPTION 'Leads changed'; END IF;
END $unchanged$;
SET LOCAL ROLE anon;
DO $visibility$ BEGIN
  IF EXISTS (SELECT FROM public.providers p WHERE p.slug=${jsonSql(slug)} #>> '{}')
    OR EXISTS (SELECT FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.slug=${jsonSql(slug)} #>> '{}')
    OR EXISTS (SELECT FROM public.care_offering_features f JOIN public.providers p ON p.id=f.provider_id WHERE p.slug=${jsonSql(slug)} #>> '{}')
    OR has_table_privilege(current_user,'public.provider_sources','SELECT')
    OR has_table_privilege(current_user,'public.care_offering_sources','SELECT') THEN
    RAISE EXCEPTION 'Unpublished care data is publicly visible'; END IF;
END $visibility$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $visibility$ BEGIN
  IF EXISTS (SELECT FROM public.providers p WHERE p.slug=${jsonSql(slug)} #>> '{}')
    OR EXISTS (SELECT FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id WHERE p.slug=${jsonSql(slug)} #>> '{}')
    OR EXISTS (SELECT FROM public.care_offering_features f JOIN public.providers p ON p.id=f.provider_id WHERE p.slug=${jsonSql(slug)} #>> '{}')
    OR has_table_privilege(current_user,'public.provider_sources','SELECT')
    OR has_table_privilege(current_user,'public.care_offering_sources','SELECT') THEN
    RAISE EXCEPTION 'Unpublished care data is publicly visible'; END IF;
END $visibility$;
RESET ROLE;
SELECT jsonb_build_object('provider',${jsonSql(slug)},'organizations',${compiled.organizations.length},
  'offerings',${compiled.offerings.length},'features',${compiled.features.length},
  'offeringSources',${compiled.offeringSources.length},
  'providerSourcesAdded',(SELECT count(*) FROM public.provider_sources)-(SELECT count(*) FROM lia_care_existing_sources),
  'deferredClaims',${checked.deferredCount},'published',false,'verified',false);
${rollback ? "ROLLBACK" : "COMMIT"};
`;
}

export const buildBoveressesCareApplySql = buildCareApplySql;
