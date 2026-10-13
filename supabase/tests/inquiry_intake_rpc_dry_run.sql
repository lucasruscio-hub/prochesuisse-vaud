BEGIN;

DO $permissions$
BEGIN
  IF has_function_privilege('anon', 'public.create_inquiry_from_public_intake(uuid,text,text,text,text,text,text,text,text,text[],text,text,text,text,text,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.create_inquiry_from_public_intake(uuid,text,text,text,text,text,text,text,text,text[],text,text,text,text,text,text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.create_inquiry_from_public_intake(uuid,text,text,text,text,text,text,text,text,text[],text,text,text,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Intake RPC execute privileges are unsafe';
  END IF;
  IF EXISTS (
    SELECT FROM unnest(ARRAY[
      'public.inquiry_contacts', 'public.inquiries',
      'public.inquiry_referrals', 'public.inquiry_activities'
    ]) AS table_name
    CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS privilege
    WHERE has_table_privilege('anon', table_name, privilege)
      OR has_table_privilege('authenticated', table_name, privilege)
  ) THEN
    RAISE EXCEPTION 'Browser roles received direct inquiry-table access';
  END IF;
END $permissions$;

CREATE TEMP TABLE intake_results (inquiry_id uuid, created boolean);
GRANT INSERT, SELECT ON intake_results TO service_role;

SET LOCAL ROLE service_role;
INSERT INTO intake_results
SELECT * FROM public.create_inquiry_from_public_intake(
  '10000000-0000-4000-8000-000000000001',
  'Alice', 'Example', 'alice@example.test', '+41790000000', 'email',
  'home_care', 'unspecified', 'within_1_month',
  ARRAY['meals', 'mobility_support', 'meals'], 'Lausanne', 'Contexte synthétique.',
  'homepage', 'landing', '/', 'homepage-intake-2026-10-13'
);
RESET ROLE;

DO $first_create$
DECLARE v_id uuid;
BEGIN
  SELECT inquiry_id INTO v_id FROM intake_results WHERE created;
  IF v_id IS NULL
    OR (SELECT count(*) FROM public.inquiry_contacts) <> 1
    OR (SELECT count(*) FROM public.inquiries) <> 1
    OR (SELECT count(*) FROM public.inquiry_activities) <> 1
    OR (SELECT count(*) FROM public.inquiry_referrals) <> 0
    OR NOT EXISTS (
      SELECT FROM public.inquiries
      WHERE id = v_id AND workflow_status = 'new'
        AND need_codes = ARRAY['meals', 'mobility_support']
        AND provider_sharing_permission_status = 'not_recorded'
        AND provider_sharing_permission_at IS NULL
        AND provider_sharing_permission_withdrawn_at IS NULL
        AND municipality_id IS NULL
    )
    OR NOT EXISTS (
      SELECT FROM public.inquiry_activities
      WHERE inquiry_id = v_id AND activity_type = 'inquiry_created'
        AND actor_type = 'system' AND actor_label = 'public_intake'
        AND event_data = '{}'::jsonb
    ) THEN
    RAISE EXCEPTION 'First intake did not create the exact required triplet';
  END IF;
END $first_create$;

TRUNCATE intake_results;
SET LOCAL ROLE service_role;
INSERT INTO intake_results
SELECT * FROM public.create_inquiry_from_public_intake(
  '10000000-0000-4000-8000-000000000001',
  'Alice', 'Example', 'alice@example.test', '+41790000000', 'email',
  'home_care', 'unspecified', 'within_1_month',
  ARRAY['mobility_support', 'meals'], 'Lausanne', 'Contexte synthétique.',
  'homepage', 'landing', '/', 'homepage-intake-2026-10-13'
);
RESET ROLE;

DO $retry$
BEGIN
  IF (SELECT count(*) FROM intake_results WHERE NOT created) <> 1
    OR (SELECT count(*) FROM public.inquiry_contacts) <> 1
    OR (SELECT count(*) FROM public.inquiries) <> 1
    OR (SELECT count(*) FROM public.inquiry_activities) <> 1 THEN
    RAISE EXCEPTION 'Exact retry created duplicate rows';
  END IF;
END $retry$;

SET LOCAL ROLE service_role;
DO $conflict$
BEGIN
  BEGIN
    PERFORM * FROM public.create_inquiry_from_public_intake(
      '10000000-0000-4000-8000-000000000001',
      'Alice', 'Example', 'alice@example.test', '+41790000000', 'email',
      'home_care', 'unspecified', 'within_1_month', ARRAY['meals', 'mobility_support'],
      'Nyon', 'Contexte synthétique.', 'homepage', 'landing', '/',
      'homepage-intake-2026-10-13'
    );
    RAISE EXCEPTION 'Different payload reused an idempotency key';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    IF SQLERRM <> 'intake_idempotency_conflict' THEN RAISE; END IF;
  END;
END $conflict$;
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT * FROM public.create_inquiry_from_public_intake(
  '10000000-0000-4000-8000-000000000002',
  'Alice', 'Example', 'alice@example.test', NULL, 'email',
  'ems', 'unspecified', 'planning', ARRAY[]::text[],
  'Morges', NULL, 'homepage', 'landing', '/', 'homepage-intake-2026-10-13'
);
RESET ROLE;

DO $separate_submission$
BEGIN
  IF (SELECT count(*) FROM public.inquiry_contacts WHERE email = 'alice@example.test') <> 2
    OR (SELECT count(*) FROM public.inquiries) <> 2
    OR (SELECT count(*) FROM public.inquiry_activities) <> 2 THEN
    RAISE EXCEPTION 'Separate submission using the same email was deduplicated';
  END IF;
END $separate_submission$;

CREATE FUNCTION pg_temp.fail_intake_activity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'synthetic activity failure';
END;
$$;
CREATE TRIGGER synthetic_intake_activity_failure
  BEFORE INSERT ON public.inquiry_activities
  FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_intake_activity();

SET LOCAL ROLE service_role;
DO $partial_failure$
BEGIN
  BEGIN
    PERFORM * FROM public.create_inquiry_from_public_intake(
      '10000000-0000-4000-8000-000000000003',
      'Rollback', 'Example', 'rollback@example.test', NULL, 'email',
      'respite', 'unspecified', 'within_7_days', ARRAY['unsure'],
      'Vevey', NULL, 'homepage', 'landing', '/', 'homepage-intake-2026-10-13'
    );
    RAISE EXCEPTION 'Synthetic activity failure was not raised';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'synthetic activity failure' THEN RAISE; END IF;
  END;
END $partial_failure$;
RESET ROLE;

DROP TRIGGER synthetic_intake_activity_failure ON public.inquiry_activities;

DO $no_partial_rows$
BEGIN
  IF EXISTS (SELECT FROM public.inquiry_contacts WHERE email = 'rollback@example.test')
    OR EXISTS (SELECT FROM public.inquiries
      WHERE intake_idempotency_key = '10000000-0000-4000-8000-000000000003')
    OR (SELECT count(*) FROM public.inquiry_contacts) <> 2
    OR (SELECT count(*) FROM public.inquiries) <> 2
    OR (SELECT count(*) FROM public.inquiry_activities) <> 2
    OR (SELECT count(*) FROM public.inquiry_referrals) <> 0 THEN
    RAISE EXCEPTION 'Partial RPC failure left rows behind';
  END IF;
END $no_partial_rows$;

ROLLBACK;
