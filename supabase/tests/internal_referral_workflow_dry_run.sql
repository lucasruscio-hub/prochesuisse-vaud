BEGIN;

DO $permissions$
DECLARE signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.create_internal_inquiry_referral(uuid,uuid,uuid,uuid)',
    'public.authorize_internal_referral_sharing(uuid,text,text)',
    'public.withdraw_internal_referral_sharing_authorization(uuid,text)',
    'public.mark_internal_referral_shared(uuid,text,timestamp with time zone,uuid)',
    'public.record_internal_referral_response(uuid,text,text)',
    'public.transition_internal_referral_status(uuid,text,text,text)'
  ] LOOP
    IF has_function_privilege('anon', signature, 'EXECUTE')
      OR has_function_privilege('authenticated', signature, 'EXECUTE')
      OR NOT has_function_privilege('service_role', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Internal referral RPC privileges are unsafe: %', signature;
    END IF;
  END LOOP;
END $permissions$;

CREATE TEMP TABLE referral_fixture (
  inquiry_id uuid, referral_id uuid, provider_id uuid,
  organization_id uuid, offering_id uuid
);
GRANT SELECT, INSERT, UPDATE ON referral_fixture TO service_role;

SET LOCAL ROLE service_role;
WITH target AS (
  SELECT p.id AS provider_id, po.organization_id,
    (SELECT co.id FROM public.care_offerings co WHERE co.provider_id = p.id AND co.status = 'active' ORDER BY co.id LIMIT 1) AS offering_id
  FROM public.providers p
  JOIN public.provider_organizations po ON po.provider_id = p.id
  JOIN public.organizations o ON o.id = po.organization_id
  WHERE p.status = 'active' AND o.status = 'active'
    AND po.relationship_type IN ('operator', 'owner', 'brand')
  ORDER BY po.is_primary DESC, p.id LIMIT 1
), created AS (
  SELECT inquiry_id FROM public.create_inquiry_from_public_intake(
    '30000000-0000-4000-8000-000000000001', 'Test', 'Referral',
    'internal-referral@example.test', NULL, 'email', 'home_care', 'parent',
    'within_1_month', ARRAY['meals'], 'Lausanne', 'Contexte inchangé.',
    'homepage', 'landing', '/', 'homepage-intake-v1-2026-10-13'
  )
)
INSERT INTO referral_fixture (inquiry_id, provider_id, organization_id, offering_id)
SELECT created.inquiry_id, target.provider_id, target.organization_id, target.offering_id
FROM created CROSS JOIN target;

RESET ROLE;

DO $create_referral$
DECLARE f referral_fixture%ROWTYPE;
DECLARE v_referral_id uuid;
BEGIN
  SELECT * INTO f FROM referral_fixture;
  SET LOCAL ROLE service_role;
  SELECT created.referral_id INTO v_referral_id FROM public.create_internal_inquiry_referral(
    f.inquiry_id, f.organization_id, f.provider_id, f.offering_id
  ) created;
  RESET ROLE;
  UPDATE referral_fixture SET referral_id = v_referral_id;
END $create_referral$;

DO $created$
DECLARE f referral_fixture%ROWTYPE;
BEGIN
  SELECT * INTO f FROM referral_fixture;
  IF f.referral_id IS NULL
    OR NOT EXISTS (SELECT FROM public.inquiry_referrals r WHERE r.id = f.referral_id
      AND r.referral_status = 'shortlisted' AND r.shared_at IS NULL AND r.sharing_authorized_at IS NULL)
    OR (SELECT count(*) FROM public.inquiry_activities a WHERE a.referral_id = f.referral_id) <> 1 THEN
    RAISE EXCEPTION 'Shortlist creation was not atomic and non-sharing';
  END IF;
  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM * FROM public.create_internal_inquiry_referral(f.inquiry_id, f.organization_id, f.provider_id, f.offering_id);
    RESET ROLE;
    RAISE EXCEPTION 'Duplicate active referral succeeded';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLERRM NOT LIKE '%active_referral_already_exists%' THEN RAISE; END IF;
  END;
  IF (SELECT count(*) FROM public.inquiry_referrals WHERE inquiry_id = f.inquiry_id) <> 1 THEN
    RAISE EXCEPTION 'Rejected duplicate changed referral state';
  END IF;
END $created$;

DO $authorization_and_share$
DECLARE f referral_fixture%ROWTYPE;
DECLARE v_key uuid := '30000000-0000-4000-8000-000000000002';
DECLARE v_activity_count bigint;
BEGIN
  SELECT * INTO f FROM referral_fixture;
  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM * FROM public.authorize_internal_referral_sharing(f.referral_id, 'shortlisted', 'general_permission');
    RESET ROLE;
    RAISE EXCEPTION 'General authorization without inquiry permission succeeded';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLERRM NOT LIKE '%general_provider_sharing_permission_not_granted%' THEN RAISE; END IF;
  END;

  SET LOCAL ROLE service_role;
  PERFORM * FROM public.authorize_internal_referral_sharing(f.referral_id, 'shortlisted', 'referral_specific_permission');
  PERFORM * FROM public.transition_internal_referral_status(f.referral_id, 'shortlisted', 'ready_to_share', NULL);
  RESET ROLE;
  IF EXISTS (SELECT FROM public.inquiry_referrals WHERE id = f.referral_id AND shared_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Authorization or readiness auto-shared data';
  END IF;

  SET LOCAL ROLE service_role;
  PERFORM * FROM public.mark_internal_referral_shared(f.referral_id, 'ready_to_share', transaction_timestamp(), v_key);
  RESET ROLE;
  SELECT count(*) INTO v_activity_count FROM public.inquiry_activities WHERE referral_id = f.referral_id;
  SET LOCAL ROLE service_role;
  PERFORM * FROM public.mark_internal_referral_shared(f.referral_id, 'ready_to_share', transaction_timestamp(), v_key);
  RESET ROLE;
  IF (SELECT count(*) FROM public.inquiry_activities WHERE referral_id = f.referral_id) <> v_activity_count
    OR NOT EXISTS (SELECT FROM public.inquiry_referrals WHERE id = f.referral_id AND referral_status = 'shared' AND shared_at IS NOT NULL)
    OR (SELECT count(*) FROM public.inquiry_activities WHERE referral_id = f.referral_id AND activity_type = 'referral_shared') <> 1 THEN
    RAISE EXCEPTION 'Manual share recording was not idempotent and atomic';
  END IF;
END $authorization_and_share$;

DO $response_and_outcome$
DECLARE f referral_fixture%ROWTYPE;
BEGIN
  SELECT * INTO f FROM referral_fixture;
  SET LOCAL ROLE service_role;
  PERFORM * FROM public.record_internal_referral_response(f.referral_id, 'shared', 'Le prestataire confirme une place disponible.');
  PERFORM * FROM public.transition_internal_referral_status(f.referral_id, 'engaged', 'converted', 'care_started');
  RESET ROLE;
  IF NOT EXISTS (SELECT FROM public.inquiry_referrals WHERE id = f.referral_id
      AND referral_status = 'converted' AND responded_at IS NOT NULL
      AND converted_at IS NOT NULL AND outcome_code = 'care_started')
    OR (SELECT count(*) FROM public.inquiry_activities WHERE referral_id = f.referral_id AND activity_type = 'provider_response_recorded') <> 1
    OR (SELECT count(*) FROM public.inquiry_activities WHERE referral_id = f.referral_id AND activity_type = 'outcome_recorded') <> 1
    OR (SELECT context_summary FROM public.inquiries WHERE id = f.inquiry_id) <> 'Contexte inchangé.' THEN
    RAISE EXCEPTION 'Response or outcome was not recorded atomically';
  END IF;
END $response_and_outcome$;

DO $withdrawal_blocks_sharing$
DECLARE f referral_fixture%ROWTYPE;
DECLARE v_referral_id uuid;
BEGIN
  SELECT * INTO f FROM referral_fixture;
  SET LOCAL ROLE service_role;
  SELECT created.referral_id INTO v_referral_id FROM public.create_internal_inquiry_referral(
    f.inquiry_id, f.organization_id, f.provider_id, f.offering_id
  ) created;
  PERFORM * FROM public.authorize_internal_referral_sharing(v_referral_id, 'shortlisted', 'referral_specific_permission');
  PERFORM * FROM public.withdraw_internal_referral_sharing_authorization(v_referral_id, 'shortlisted');
  PERFORM * FROM public.transition_internal_referral_status(v_referral_id, 'shortlisted', 'ready_to_share', NULL);
  RESET ROLE;
  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM * FROM public.mark_internal_referral_shared(
      v_referral_id, 'ready_to_share', transaction_timestamp(), '30000000-0000-4000-8000-000000000003'
    );
    RESET ROLE;
    RAISE EXCEPTION 'Sharing after authorization withdrawal succeeded';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLERRM NOT LIKE '%referral_sharing_not_authorized%' THEN RAISE; END IF;
  END;
  SET LOCAL ROLE service_role;
  PERFORM * FROM public.transition_internal_referral_status(v_referral_id, 'ready_to_share', 'closed', 'withdrawn');
  RESET ROLE;
  IF NOT EXISTS (SELECT FROM public.inquiry_referrals WHERE id = v_referral_id
      AND referral_status = 'closed' AND shared_at IS NULL
      AND sharing_authorization_withdrawn_at IS NOT NULL AND outcome_code = 'withdrawn')
    OR (SELECT count(*) FROM public.inquiry_activities WHERE referral_id = v_referral_id
      AND activity_type = 'referral_sharing_authorization_withdrawn') <> 1 THEN
    RAISE EXCEPTION 'Withdrawal or pre-share closure was not preserved atomically';
  END IF;
END $withdrawal_blocks_sharing$;

ROLLBACK;
