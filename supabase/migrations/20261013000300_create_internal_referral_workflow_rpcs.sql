BEGIN;

CREATE FUNCTION public.create_internal_inquiry_referral(
  p_inquiry_id uuid,
  p_recipient_organization_id uuid,
  p_provider_id uuid DEFAULT NULL,
  p_care_offering_id uuid DEFAULT NULL
)
RETURNS TABLE (referral_id uuid, referral_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_inquiry public.inquiries%ROWTYPE;
  v_referral public.inquiry_referrals%ROWTYPE;
  v_now timestamptz := transaction_timestamp();
BEGIN
  SELECT * INTO v_inquiry FROM public.inquiries WHERE id = p_inquiry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'inquiry_not_found'; END IF;
  IF v_inquiry.workflow_status = 'closed' THEN RAISE EXCEPTION 'inquiry_closed'; END IF;
  IF v_inquiry.anonymized_at IS NOT NULL THEN RAISE EXCEPTION 'inquiry_anonymized'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = p_recipient_organization_id AND o.status = 'active') THEN
    RAISE EXCEPTION 'recipient_organization_not_eligible';
  END IF;
  IF p_provider_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.providers p
    JOIN public.provider_organizations po ON po.provider_id = p.id
    WHERE p.id = p_provider_id AND p.status = 'active'
      AND po.organization_id = p_recipient_organization_id
      AND po.relationship_type IN ('operator', 'owner', 'brand')
  ) THEN RAISE EXCEPTION 'provider_not_eligible_for_recipient'; END IF;
  IF p_care_offering_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.care_offerings co
    WHERE co.id = p_care_offering_id AND co.provider_id = p_provider_id AND co.status = 'active'
  ) THEN RAISE EXCEPTION 'care_offering_not_eligible'; END IF;

  BEGIN
    INSERT INTO public.inquiry_referrals (
      inquiry_id, recipient_organization_id, provider_id, care_offering_id
    ) VALUES (
      p_inquiry_id, p_recipient_organization_id, p_provider_id, p_care_offering_id
    ) RETURNING * INTO v_referral;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'active_referral_already_exists';
  END;

  INSERT INTO public.inquiry_activities (
    inquiry_id, referral_id, activity_type, actor_type, actor_label, event_data, occurred_at
  ) VALUES (
    p_inquiry_id, v_referral.id, 'referral_created', 'lia_staff', 'Lia internal',
    jsonb_build_object('recipient_organization_id', p_recipient_organization_id,
      'provider_id', p_provider_id, 'care_offering_id', p_care_offering_id), v_now
  );
  UPDATE public.inquiries SET last_activity_at = v_now WHERE id = p_inquiry_id;
  RETURN QUERY SELECT v_referral.id, v_referral.referral_status;
END;
$$;

CREATE FUNCTION public.authorize_internal_referral_sharing(
  p_referral_id uuid,
  p_expected_status text,
  p_authorization_basis text
)
RETURNS TABLE (referral_id uuid, referral_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_referral public.inquiry_referrals%ROWTYPE;
  v_inquiry public.inquiries%ROWTYPE;
  v_now timestamptz := transaction_timestamp();
BEGIN
  SELECT * INTO v_referral FROM public.inquiry_referrals WHERE id = p_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'referral_not_found'; END IF;
  SELECT * INTO v_inquiry FROM public.inquiries WHERE id = v_referral.inquiry_id FOR UPDATE;
  IF v_referral.referral_status IS DISTINCT FROM p_expected_status THEN RAISE EXCEPTION 'stale_referral_status'; END IF;
  IF v_referral.referral_status NOT IN ('shortlisted', 'ready_to_share') THEN RAISE EXCEPTION 'referral_cannot_be_authorized'; END IF;
  IF v_referral.sharing_authorized_at IS NOT NULL THEN RAISE EXCEPTION 'referral_authorization_already_recorded'; END IF;
  IF p_authorization_basis NOT IN ('general_permission', 'referral_specific_permission') THEN RAISE EXCEPTION 'invalid_referral_authorization_basis'; END IF;
  IF p_authorization_basis = 'general_permission' AND NOT (
    v_inquiry.provider_sharing_permission_status = 'granted'
    AND v_inquiry.provider_sharing_permission_at IS NOT NULL
    AND v_inquiry.provider_sharing_permission_withdrawn_at IS NULL
  ) THEN RAISE EXCEPTION 'general_provider_sharing_permission_not_granted'; END IF;

  UPDATE public.inquiry_referrals SET
    sharing_authorization_basis = p_authorization_basis,
    sharing_authorized_at = v_now
  WHERE id = p_referral_id;
  INSERT INTO public.inquiry_activities (
    inquiry_id, referral_id, activity_type, actor_type, actor_label, event_data, occurred_at
  ) VALUES (
    v_referral.inquiry_id, p_referral_id, 'referral_sharing_authorized', 'lia_staff', 'Lia internal',
    jsonb_build_object('authorization_basis', p_authorization_basis), v_now
  );
  UPDATE public.inquiries SET last_activity_at = v_now WHERE id = v_referral.inquiry_id;
  RETURN QUERY SELECT p_referral_id, v_referral.referral_status;
END;
$$;

CREATE FUNCTION public.withdraw_internal_referral_sharing_authorization(
  p_referral_id uuid,
  p_expected_status text
)
RETURNS TABLE (referral_id uuid, referral_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_referral public.inquiry_referrals%ROWTYPE;
  v_now timestamptz := transaction_timestamp();
BEGIN
  SELECT * INTO v_referral FROM public.inquiry_referrals WHERE id = p_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'referral_not_found'; END IF;
  PERFORM 1 FROM public.inquiries WHERE id = v_referral.inquiry_id FOR UPDATE;
  IF v_referral.referral_status IS DISTINCT FROM p_expected_status THEN RAISE EXCEPTION 'stale_referral_status'; END IF;
  IF v_referral.sharing_authorized_at IS NULL THEN RAISE EXCEPTION 'referral_authorization_not_recorded'; END IF;
  IF v_referral.sharing_authorization_withdrawn_at IS NOT NULL THEN RAISE EXCEPTION 'referral_authorization_already_withdrawn'; END IF;

  UPDATE public.inquiry_referrals SET sharing_authorization_withdrawn_at = v_now WHERE id = p_referral_id;
  INSERT INTO public.inquiry_activities (
    inquiry_id, referral_id, activity_type, actor_type, actor_label, occurred_at
  ) VALUES (
    v_referral.inquiry_id, p_referral_id, 'referral_sharing_authorization_withdrawn',
    'lia_staff', 'Lia internal', v_now
  );
  UPDATE public.inquiries SET last_activity_at = v_now WHERE id = v_referral.inquiry_id;
  RETURN QUERY SELECT p_referral_id, v_referral.referral_status;
END;
$$;

CREATE FUNCTION public.mark_internal_referral_shared(
  p_referral_id uuid,
  p_expected_status text,
  p_shared_at timestamptz,
  p_idempotency_key uuid
)
RETURNS TABLE (referral_id uuid, referral_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_referral public.inquiry_referrals%ROWTYPE;
  v_now timestamptz := transaction_timestamp();
BEGIN
  SELECT * INTO v_referral FROM public.inquiry_referrals WHERE id = p_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'referral_not_found'; END IF;
  PERFORM 1 FROM public.inquiries WHERE id = v_referral.inquiry_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.inquiry_activities a
    WHERE a.referral_id = p_referral_id AND a.activity_type = 'referral_shared'
      AND a.event_data ->> 'idempotency_key' = p_idempotency_key::text
  ) THEN
    RETURN QUERY SELECT p_referral_id, v_referral.referral_status;
    RETURN;
  END IF;
  IF v_referral.referral_status IS DISTINCT FROM p_expected_status THEN RAISE EXCEPTION 'stale_referral_status'; END IF;
  IF v_referral.referral_status <> 'ready_to_share' THEN RAISE EXCEPTION 'referral_not_ready_to_share'; END IF;
  IF v_referral.sharing_authorized_at IS NULL OR v_referral.sharing_authorization_withdrawn_at IS NOT NULL THEN
    RAISE EXCEPTION 'referral_sharing_not_authorized';
  END IF;
  IF p_shared_at IS NULL OR p_shared_at > v_now OR p_shared_at < v_referral.sharing_authorized_at THEN
    RAISE EXCEPTION 'invalid_actual_shared_at';
  END IF;

  UPDATE public.inquiry_referrals SET referral_status = 'shared', shared_at = p_shared_at WHERE id = p_referral_id;
  INSERT INTO public.inquiry_activities (
    inquiry_id, referral_id, activity_type, actor_type, actor_label,
    from_status, to_status, occurred_at
  ) VALUES (
    v_referral.inquiry_id, p_referral_id, 'referral_status_changed', 'lia_staff', 'Lia internal',
    'ready_to_share', 'shared', v_now
  );
  INSERT INTO public.inquiry_activities (
    inquiry_id, referral_id, activity_type, actor_type, actor_label, event_data, occurred_at
  ) VALUES (
    v_referral.inquiry_id, p_referral_id, 'referral_shared', 'lia_staff', 'Lia internal',
    jsonb_build_object('idempotency_key', p_idempotency_key, 'manual_disclosure_attested', true), p_shared_at
  );
  UPDATE public.inquiries SET last_activity_at = v_now WHERE id = v_referral.inquiry_id;
  RETURN QUERY SELECT p_referral_id, 'shared'::text;
END;
$$;

CREATE FUNCTION public.record_internal_referral_response(
  p_referral_id uuid,
  p_expected_status text,
  p_response_note text
)
RETURNS TABLE (referral_id uuid, referral_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_referral public.inquiry_referrals%ROWTYPE;
  v_note text := btrim(p_response_note);
  v_now timestamptz := transaction_timestamp();
BEGIN
  SELECT * INTO v_referral FROM public.inquiry_referrals WHERE id = p_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'referral_not_found'; END IF;
  PERFORM 1 FROM public.inquiries WHERE id = v_referral.inquiry_id FOR UPDATE;
  IF v_referral.referral_status IS DISTINCT FROM p_expected_status THEN RAISE EXCEPTION 'stale_referral_status'; END IF;
  IF v_referral.referral_status <> 'shared' THEN RAISE EXCEPTION 'referral_response_requires_shared'; END IF;
  IF v_note IS NULL OR char_length(v_note) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'invalid_provider_response_note'; END IF;

  UPDATE public.inquiry_referrals SET referral_status = 'engaged', responded_at = v_now WHERE id = p_referral_id;
  INSERT INTO public.inquiry_activities (
    inquiry_id, referral_id, activity_type, actor_type, actor_label, from_status, to_status, occurred_at
  ) VALUES (
    v_referral.inquiry_id, p_referral_id, 'referral_status_changed', 'lia_staff', 'Lia internal',
    'shared', 'engaged', v_now
  );
  INSERT INTO public.inquiry_activities (
    inquiry_id, referral_id, activity_type, actor_type, actor_label, note_text, occurred_at
  ) VALUES (
    v_referral.inquiry_id, p_referral_id, 'provider_response_recorded', 'lia_staff', 'Lia internal',
    v_note, v_now
  );
  UPDATE public.inquiries SET last_activity_at = v_now WHERE id = v_referral.inquiry_id;
  RETURN QUERY SELECT p_referral_id, 'engaged'::text;
END;
$$;

CREATE FUNCTION public.transition_internal_referral_status(
  p_referral_id uuid,
  p_expected_status text,
  p_new_status text,
  p_outcome_code text DEFAULT NULL
)
RETURNS TABLE (referral_id uuid, referral_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_referral public.inquiry_referrals%ROWTYPE;
  v_now timestamptz := transaction_timestamp();
BEGIN
  SELECT * INTO v_referral FROM public.inquiry_referrals WHERE id = p_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'referral_not_found'; END IF;
  PERFORM 1 FROM public.inquiries WHERE id = v_referral.inquiry_id FOR UPDATE;
  IF v_referral.referral_status IS DISTINCT FROM p_expected_status THEN RAISE EXCEPTION 'stale_referral_status'; END IF;
  IF NOT (
    (v_referral.referral_status = 'shortlisted' AND p_new_status = 'ready_to_share' AND p_outcome_code IS NULL)
    OR (v_referral.referral_status IN ('shortlisted', 'ready_to_share', 'shared', 'engaged')
      AND p_new_status = 'closed'
      AND p_outcome_code IN ('provider_declined', 'family_declined', 'no_response', 'unavailable', 'unsuitable', 'withdrawn', 'duplicate', 'other'))
    OR (v_referral.referral_status = 'engaged' AND p_new_status = 'converted'
      AND p_outcome_code IN ('care_started', 'admission_or_placement', 'other_success'))
  ) THEN RAISE EXCEPTION 'invalid_referral_status_transition'; END IF;

  UPDATE public.inquiry_referrals SET
    referral_status = p_new_status,
    outcome_code = p_outcome_code,
    converted_at = CASE WHEN p_new_status = 'converted' THEN v_now ELSE converted_at END,
    closed_at = CASE WHEN p_new_status = 'closed' THEN v_now ELSE closed_at END
  WHERE id = p_referral_id;
  INSERT INTO public.inquiry_activities (
    inquiry_id, referral_id, activity_type, actor_type, actor_label, from_status, to_status, occurred_at
  ) VALUES (
    v_referral.inquiry_id, p_referral_id, 'referral_status_changed', 'lia_staff', 'Lia internal',
    v_referral.referral_status, p_new_status, v_now
  );
  IF p_new_status IN ('converted', 'closed') THEN
    INSERT INTO public.inquiry_activities (
      inquiry_id, referral_id, activity_type, actor_type, actor_label, event_data, occurred_at
    ) VALUES (
      v_referral.inquiry_id, p_referral_id, 'outcome_recorded', 'lia_staff', 'Lia internal',
      jsonb_build_object('outcome_code', p_outcome_code), v_now
    );
  END IF;
  UPDATE public.inquiries SET last_activity_at = v_now WHERE id = v_referral.inquiry_id;
  RETURN QUERY SELECT p_referral_id, p_new_status;
END;
$$;

REVOKE ALL ON FUNCTION public.create_internal_inquiry_referral(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.authorize_internal_referral_sharing(uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.withdraw_internal_referral_sharing_authorization(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.mark_internal_referral_shared(uuid, text, timestamptz, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_internal_referral_response(uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.transition_internal_referral_status(uuid, text, text, text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_internal_inquiry_referral(uuid, uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.authorize_internal_referral_sharing(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_internal_referral_sharing_authorization(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_internal_referral_shared(uuid, text, timestamptz, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_internal_referral_response(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_internal_referral_status(uuid, text, text, text) TO service_role;

COMMENT ON FUNCTION public.mark_internal_referral_shared(uuid, text, timestamptz, uuid) IS
  'Records a Lia staff-attested manual disclosure. This function never transmits data or contacts a recipient.';

COMMIT;
