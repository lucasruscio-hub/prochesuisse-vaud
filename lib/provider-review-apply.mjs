import { beginLocalSql, jsonSql, snapshotSql } from "./local-provider-writer.mjs";
import { validateReviewPacket } from "./provider-review-packet.mjs";

export function buildReviewApplySql(packet, baseline, { rollback = false } = {}) {
  const checked = validateReviewPacket(packet, baseline);
  if (!checked.localApplyReady) throw new Error("Packet needs explicit local-apply approval and no structural hold");
  if (!checked.writableFields.length) throw new Error("No representable facts to apply");
  const patch = Object.fromEntries(packet.claims.filter((claim) => claim.target).map((claim) => [claim.target, claim.value]));
  const sourceMap = new Map();
  for (const claim of packet.claims.filter((item) => item.target)) {
    const source = claim.evidence;
    const key = JSON.stringify([source.kind, source.name, source.url]);
    if (!sourceMap.has(key)) sourceMap.set(key, { source_type: source.kind, source_name: source.name,
      source_url: source.url, external_record_id: source.url, retrieved_at: null, reviewed_at: null,
      fields_supported: [], notes: `Research source accessed on ${source.accessedOn}; local reviewed-enrichment candidate only.`,
      accessDate: source.accessedOn });
    if (sourceMap.get(key).accessDate !== source.accessedOn) throw new Error("Conflicting dates for one source identity");
    sourceMap.get(key).fields_supported.push(claim.target);
  }
  const sources = [...sourceMap.values()].map(({ accessDate, ...source }) => source);
  const columns = ["name", "primary_type", "postal_code", "locality", "canton_code", "phone", "email", "website"];
  const patchSql = columns.map((column) => `${column} = CASE WHEN change ? '${column}' THEN change->>'${column}' ELSE p.${column} END`).join(",\n      ");
  return beginLocalSql + `LOCK TABLE public.providers, public.provider_sources, public.provider_service_areas, public.municipalities IN SHARE ROW EXCLUSIVE MODE;
${snapshotSql}
CREATE TEMP TABLE lia_review_guard (name text PRIMARY KEY, snapshot jsonb);
INSERT INTO lia_review_guard SELECT 'other_providers', coalesce(jsonb_agg(to_jsonb(p) ORDER BY id), '[]')
  FROM public.providers p WHERE legacy_id <> (${jsonSql(packet.identity.legacyId)} #>> '{}');
INSERT INTO lia_review_guard SELECT 'service_areas', coalesce(jsonb_agg(to_jsonb(a) ORDER BY id), '[]')
  FROM public.provider_service_areas a;
CREATE TEMP TABLE lia_existing_sources AS SELECT id, to_jsonb(s) AS snapshot FROM public.provider_sources s;
DO $apply$
DECLARE current_row jsonb; provider_uuid uuid; change jsonb := ${jsonSql(patch)};
  expected jsonb := ${jsonSql(baseline)}; item jsonb; matches integer;
BEGIN
  SELECT id, to_jsonb(p) - ARRAY['id','created_at','updated_at'] INTO provider_uuid, current_row
    FROM public.providers p WHERE legacy_id = (${jsonSql(packet.identity.legacyId)} #>> '{}');
  IF provider_uuid IS NULL OR current_row IS DISTINCT FROM expected
    OR current_row->>'slug' <> (${jsonSql(packet.identity.slug)} #>> '{}')
    OR current_row->>'name' <> (${jsonSql(packet.identity.expectedName)} #>> '{}')
    OR current_row->>'primary_type' <> (${jsonSql(packet.identity.expectedType)} #>> '{}')
    OR current_row->>'verification_status' <> 'unverified'
    OR current_row->>'is_published' <> 'false' OR current_row->>'last_reviewed_at' IS NOT NULL THEN
    RAISE EXCEPTION 'Provider identity or reviewed-state conflict; no changes applied';
  END IF;
  SELECT count(*) INTO matches FROM public.provider_sources
    WHERE provider_id = provider_uuid AND source_type = 'legacy' AND external_record_id = (${jsonSql(packet.identity.legacyId)} #>> '{}');
  IF matches <> 1 THEN RAISE EXCEPTION 'Expected one untouched legacy source'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(${jsonSql(sources)}) LOOP
    SELECT count(*) INTO matches FROM public.provider_sources
      WHERE provider_id = provider_uuid AND source_type = item->>'source_type'
        AND source_name = item->>'source_name' AND external_record_id = item->>'external_record_id';
    IF matches <> 0 THEN RAISE EXCEPTION 'Reviewed source identity already present; reconcile before retry'; END IF;
  END LOOP;
  UPDATE public.providers p SET ${patchSql} WHERE p.id = provider_uuid;
  INSERT INTO public.provider_sources (provider_id, source_type, source_name, source_url, external_record_id,
    retrieved_at, reviewed_at, fields_supported, notes)
  SELECT provider_uuid, s.source_type, s.source_name, s.source_url, s.external_record_id,
    s.retrieved_at, s.reviewed_at, s.fields_supported, s.notes
    FROM jsonb_populate_recordset(NULL::public.provider_sources, ${jsonSql(sources)}) s;
  SELECT to_jsonb(p) INTO current_row FROM public.providers p WHERE id = provider_uuid;
  IF current_row - ARRAY['id','created_at','updated_at'] IS DISTINCT FROM (expected || change)
    OR EXISTS (SELECT FROM public.provider_service_areas WHERE provider_id = provider_uuid) THEN
    RAISE EXCEPTION 'Post-apply safety check failed';
  END IF;
  IF (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY id),'[]') FROM public.providers p
      WHERE legacy_id <> (${jsonSql(packet.identity.legacyId)} #>> '{}'))
      IS DISTINCT FROM (SELECT snapshot FROM lia_review_guard WHERE name = 'other_providers')
    OR (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY id),'[]') FROM public.provider_service_areas a)
      IS DISTINCT FROM (SELECT snapshot FROM lia_review_guard WHERE name = 'service_areas')
    OR EXISTS (SELECT FROM lia_existing_sources old LEFT JOIN public.provider_sources s ON s.id = old.id
      WHERE to_jsonb(s) IS DISTINCT FROM old.snapshot)
    OR (SELECT count(*) FROM public.provider_sources) <> (SELECT count(*) FROM lia_existing_sources) + ${sourceMap.size} THEN
    RAISE EXCEPTION 'Unrelated provider, source or coverage changed';
  END IF;
END $apply$;
DO $unchanged$
DECLARE state jsonb;
BEGIN
  IF to_regclass('public.leads') IS NULL THEN state := '{"exists":false}'::jsonb;
  ELSE
    EXECUTE 'SELECT jsonb_build_object(''exists'',true,''count'',count(*),''hash'',md5(coalesce(string_agg(to_jsonb(t)::text,E''\\n'' ORDER BY to_jsonb(t)::text),''''))) FROM public.leads t' INTO state;
  END IF;
  IF state IS DISTINCT FROM (SELECT snapshot FROM lia_untouched WHERE name = 'leads') THEN RAISE EXCEPTION 'Leads changed'; END IF;
  IF (SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY id),'[]') FROM public.municipalities m)
    IS DISTINCT FROM (SELECT snapshot FROM lia_untouched WHERE name = 'municipalities') THEN RAISE EXCEPTION 'Municipalities changed'; END IF;
END $unchanged$;
SELECT jsonb_build_object('legacyId',${jsonSql(packet.identity.legacyId)},'providerUpdates',1,
  'sourcesAdded',${sourceMap.size},'deferredClaims',${checked.deferredClaims},'published',false,'verified',false);
${rollback ? "ROLLBACK" : "COMMIT"};
`;
}
