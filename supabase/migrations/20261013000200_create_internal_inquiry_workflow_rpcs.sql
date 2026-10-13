BEGIN;

CREATE FUNCTION public.transition_internal_inquiry_status(
  p_inquiry_id uuid,
  p_expected_status text,
  p_new_status text,
  p_closure_outcome_code text DEFAULT NULL
)
RETURNS TABLE (
  inquiry_id uuid,
  workflow_status text,
  last_activity_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  v_current_status text;
  v_now timestamptz := transaction_timestamp();
BEGIN
  IF p_inquiry_id IS NULL
    OR p_expected_status NOT IN ('new', 'reviewing', 'qualified', 'matching', 'closed')
    OR p_new_status NOT IN ('new', 'reviewing', 'qualified', 'matching', 'closed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_inquiry_status_request';
  END IF;

  SELECT i.workflow_status
  INTO v_current_status
  FROM public.inquiries AS i
  WHERE i.id = p_inquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'inquiry_not_found';
  END IF;
  IF v_current_status IS DISTINCT FROM p_expected_status THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'stale_inquiry_status';
  END IF;
  IF NOT (
    (v_current_status = 'new' AND p_new_status IN ('reviewing', 'closed'))
    OR (v_current_status = 'reviewing' AND p_new_status IN ('qualified', 'closed'))
    OR (v_current_status = 'qualified' AND p_new_status IN ('matching', 'closed'))
    OR (v_current_status = 'matching' AND p_new_status = 'closed')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_inquiry_status_transition';
  END IF;

  IF p_new_status = 'closed' THEN
    IF p_closure_outcome_code NOT IN (
      'care_started', 'admission_or_placement', 'other_success',
      'resolved_without_referral', 'family_withdrew', 'unreachable',
      'duplicate', 'out_of_scope', 'no_solution_found', 'other'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'closure_outcome_required';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.inquiry_referrals AS r
      WHERE r.inquiry_id = p_inquiry_id
        AND r.referral_status IN ('shortlisted', 'ready_to_share', 'shared', 'engaged')
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'active_referral_blocks_closure';
    END IF;
  ELSIF p_closure_outcome_code IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'closure_outcome_only_for_closed';
  END IF;

  UPDATE public.inquiries AS i
  SET workflow_status = p_new_status,
      closure_outcome_code = CASE WHEN p_new_status = 'closed' THEN p_closure_outcome_code END,
      closed_at = CASE WHEN p_new_status = 'closed' THEN v_now END,
      last_activity_at = v_now
  WHERE i.id = p_inquiry_id;

  INSERT INTO public.inquiry_activities (
    inquiry_id, activity_type, actor_type, actor_label, visibility_scope,
    from_status, to_status, event_data, occurred_at
  ) VALUES (
    p_inquiry_id, 'inquiry_status_changed', 'lia_staff', 'lia_internal', 'lia_internal',
    v_current_status, p_new_status, '{}'::jsonb, v_now
  );

  RETURN QUERY
  SELECT i.id, i.workflow_status, i.last_activity_at
  FROM public.inquiries AS i
  WHERE i.id = p_inquiry_id;
END;
$$;

CREATE FUNCTION public.add_internal_inquiry_note(
  p_inquiry_id uuid,
  p_note_text text
)
RETURNS TABLE (
  activity_id uuid,
  inquiry_id uuid,
  last_activity_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  v_note text := btrim(p_note_text);
  v_activity_id uuid;
  v_now timestamptz := transaction_timestamp();
BEGIN
  IF p_inquiry_id IS NULL OR v_note IS NULL OR char_length(v_note) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_internal_note';
  END IF;

  PERFORM 1
  FROM public.inquiries AS i
  WHERE i.id = p_inquiry_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'inquiry_not_found';
  END IF;

  UPDATE public.inquiries AS i
  SET last_activity_at = v_now
  WHERE i.id = p_inquiry_id;

  INSERT INTO public.inquiry_activities (
    inquiry_id, activity_type, actor_type, actor_label, visibility_scope,
    note_text, event_data, occurred_at
  ) VALUES (
    p_inquiry_id, 'note_added', 'lia_staff', 'lia_internal', 'lia_internal',
    v_note, '{}'::jsonb, v_now
  )
  RETURNING id INTO v_activity_id;

  RETURN QUERY SELECT v_activity_id, p_inquiry_id, v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_internal_inquiry_status(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transition_internal_inquiry_status(uuid, text, text, text)
  TO service_role;
REVOKE ALL ON FUNCTION public.add_internal_inquiry_note(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_internal_inquiry_note(uuid, text)
  TO service_role;

COMMENT ON FUNCTION public.transition_internal_inquiry_status(uuid, text, text, text) IS
  'Service-role-only atomic internal inquiry status transition with optimistic concurrency and one audit activity.';
COMMENT ON FUNCTION public.add_internal_inquiry_note(uuid, text) IS
  'Service-role-only bounded Lia-internal note operation; original intake values remain unchanged.';

COMMIT;
