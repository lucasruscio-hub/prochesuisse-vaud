-- Atomic public-intake creation for the server-side /api/leads compatibility route.
BEGIN;

CREATE FUNCTION public.create_inquiry_from_public_intake(
  p_intake_idempotency_key uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_preferred_contact_method text,
  p_care_type_code text,
  p_beneficiary_relation_code text,
  p_timing_code text,
  p_need_codes text[],
  p_location_text text,
  p_context_summary text,
  p_source_channel text,
  p_source_detail text,
  p_landing_page text,
  p_privacy_notice_version text
)
RETURNS TABLE (inquiry_id uuid, created boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_contact_id uuid;
  v_inquiry_id uuid;
  v_need_codes text[];
  v_now timestamptz := transaction_timestamp();
  v_existing record;
BEGIN
  IF p_intake_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'intake_idempotency_key_required' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(array_agg(value ORDER BY value), '{}'::text[])
    INTO v_need_codes
    FROM (SELECT DISTINCT unnest(coalesce(p_need_codes, '{}'::text[])) AS value) canonical_values;

  -- Serialize equal keys before checking the authoritative partial unique index.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_intake_idempotency_key::text, 0));

  SELECT i.id, c.first_name, c.last_name, c.email, c.phone,
      c.preferred_contact_method, i.care_type_code, i.beneficiary_relation_code,
      i.timing_code, i.need_codes, i.location_text, i.context_summary,
      i.source_channel, i.source_detail, i.landing_page, i.privacy_notice_version
    INTO v_existing
    FROM public.inquiries i
    JOIN public.inquiry_contacts c ON c.id = i.primary_contact_id
    WHERE i.intake_idempotency_key = p_intake_idempotency_key;

  IF FOUND THEN
    IF v_existing.first_name IS DISTINCT FROM p_first_name
      OR v_existing.last_name IS DISTINCT FROM p_last_name
      OR v_existing.email IS DISTINCT FROM p_email
      OR v_existing.phone IS DISTINCT FROM p_phone
      OR v_existing.preferred_contact_method IS DISTINCT FROM p_preferred_contact_method
      OR v_existing.care_type_code IS DISTINCT FROM p_care_type_code
      OR v_existing.beneficiary_relation_code IS DISTINCT FROM p_beneficiary_relation_code
      OR v_existing.timing_code IS DISTINCT FROM p_timing_code
      OR v_existing.need_codes IS DISTINCT FROM v_need_codes
      OR v_existing.location_text IS DISTINCT FROM p_location_text
      OR v_existing.context_summary IS DISTINCT FROM p_context_summary
      OR v_existing.source_channel IS DISTINCT FROM p_source_channel
      OR v_existing.source_detail IS DISTINCT FROM p_source_detail
      OR v_existing.landing_page IS DISTINCT FROM p_landing_page
      OR v_existing.privacy_notice_version IS DISTINCT FROM p_privacy_notice_version THEN
      RAISE EXCEPTION 'intake_idempotency_conflict' USING ERRCODE = '22023';
    END IF;

    RETURN QUERY SELECT v_existing.id, false;
    RETURN;
  END IF;

  INSERT INTO public.inquiry_contacts (
    first_name, last_name, email, phone, preferred_contact_method,
    created_at, updated_at
  ) VALUES (
    p_first_name, p_last_name, p_email, p_phone, p_preferred_contact_method,
    v_now, v_now
  ) RETURNING id INTO v_contact_id;

  INSERT INTO public.inquiries (
    primary_contact_id, care_type_code, beneficiary_relation_code, timing_code,
    need_codes, location_text, context_summary, workflow_status,
    source_channel, source_detail, landing_page,
    contact_permission_at, privacy_notice_version, privacy_acknowledged_at,
    provider_sharing_permission_status, intake_idempotency_key,
    submitted_at, last_activity_at, created_at, updated_at
  ) VALUES (
    v_contact_id, p_care_type_code, p_beneficiary_relation_code, p_timing_code,
    v_need_codes, p_location_text, p_context_summary, 'new',
    p_source_channel, p_source_detail, p_landing_page,
    v_now, p_privacy_notice_version, v_now,
    'not_recorded', p_intake_idempotency_key,
    v_now, v_now, v_now, v_now
  ) RETURNING id INTO v_inquiry_id;

  INSERT INTO public.inquiry_activities (
    inquiry_id, activity_type, actor_type, actor_label, visibility_scope,
    event_data, occurred_at, created_at
  ) VALUES (
    v_inquiry_id, 'inquiry_created', 'system', 'public_intake', 'lia_internal',
    '{}'::jsonb, v_now, v_now
  );

  RETURN QUERY SELECT v_inquiry_id, true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_inquiry_from_public_intake(
  uuid, text, text, text, text, text, text, text, text, text[], text, text,
  text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_inquiry_from_public_intake(
  uuid, text, text, text, text, text, text, text, text, text[], text, text,
  text, text, text, text
) TO service_role;

COMMENT ON FUNCTION public.create_inquiry_from_public_intake(
  uuid, text, text, text, text, text, text, text, text, text[], text, text,
  text, text, text, text
) IS 'Service-role-only atomic creation of one contact, inquiry, and inquiry_created activity; exact idempotent retries return the existing inquiry.';

COMMIT;
