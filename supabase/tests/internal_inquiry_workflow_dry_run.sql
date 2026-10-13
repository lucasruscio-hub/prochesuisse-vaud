BEGIN;

DO $permissions$
BEGIN
  IF has_function_privilege('anon', 'public.transition_internal_inquiry_status(uuid,text,text,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.transition_internal_inquiry_status(uuid,text,text,text)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.add_internal_inquiry_note(uuid,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.add_internal_inquiry_note(uuid,text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.transition_internal_inquiry_status(uuid,text,text,text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.add_internal_inquiry_note(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Internal workflow RPC privileges are unsafe';
  END IF;
END $permissions$;

CREATE TEMP TABLE workflow_fixture (inquiry_id uuid PRIMARY KEY);
GRANT SELECT, INSERT ON workflow_fixture TO service_role;

SET LOCAL ROLE service_role;
INSERT INTO workflow_fixture
SELECT inquiry_id FROM public.create_inquiry_from_public_intake(
  '20000000-0000-4000-8000-000000000001',
  'Test', 'Interne', 'internal-workflow@example.test', NULL, 'email',
  'home_care', 'parent', 'within_1_month', ARRAY['meals'],
  'Lausanne', 'Valeur familiale originale.', 'homepage', 'landing', '/',
  'homepage-intake-v1-2026-10-13'
);
RESET ROLE;

DO $invalid_and_stale$
DECLARE v_id uuid := (SELECT inquiry_id FROM workflow_fixture);
BEGIN
  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM * FROM public.transition_internal_inquiry_status(v_id, 'new', 'qualified', NULL);
    RESET ROLE;
    RAISE EXCEPTION 'Invalid transition succeeded';
  EXCEPTION WHEN SQLSTATE '22023' THEN RESET ROLE; END;
  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM * FROM public.transition_internal_inquiry_status(v_id, 'reviewing', 'closed', 'other');
    RESET ROLE;
    RAISE EXCEPTION 'Stale transition succeeded';
  EXCEPTION WHEN SQLSTATE '40001' THEN RESET ROLE; END;
  IF (SELECT workflow_status FROM public.inquiries WHERE id = v_id) <> 'new'
    OR (SELECT count(*) FROM public.inquiry_activities WHERE inquiry_id = v_id) <> 1 THEN
    RAISE EXCEPTION 'Rejected transition changed inquiry state';
  END IF;
END $invalid_and_stale$;

SET LOCAL ROLE service_role;
SELECT * FROM public.transition_internal_inquiry_status(
  (SELECT inquiry_id FROM workflow_fixture), 'new', 'reviewing', NULL
);
RESET ROLE;

DO $transition$
DECLARE v_id uuid := (SELECT inquiry_id FROM workflow_fixture);
BEGIN
  IF (SELECT workflow_status FROM public.inquiries WHERE id = v_id) <> 'reviewing'
    OR (SELECT count(*) FROM public.inquiry_activities
        WHERE inquiry_id = v_id AND activity_type = 'inquiry_status_changed'
          AND from_status = 'new' AND to_status = 'reviewing'
          AND actor_type = 'lia_staff' AND actor_label = 'lia_internal') <> 1
    OR (SELECT count(*) FROM public.inquiry_referrals WHERE inquiry_id = v_id) <> 0 THEN
    RAISE EXCEPTION 'Valid transition did not make the exact atomic change';
  END IF;
END $transition$;

SET LOCAL ROLE service_role;
SELECT * FROM public.add_internal_inquiry_note(
  (SELECT inquiry_id FROM workflow_fixture), '  Note interne bornée.  '
);
RESET ROLE;

DO $note$
DECLARE v_id uuid := (SELECT inquiry_id FROM workflow_fixture);
BEGIN
  IF (SELECT count(*) FROM public.inquiry_activities
      WHERE inquiry_id = v_id AND activity_type = 'note_added'
        AND note_text = 'Note interne bornée.' AND visibility_scope = 'lia_internal') <> 1
    OR (SELECT context_summary FROM public.inquiries WHERE id = v_id) <> 'Valeur familiale originale.'
    OR (SELECT count(*) FROM public.inquiry_referrals WHERE inquiry_id = v_id) <> 0 THEN
    RAISE EXCEPTION 'Internal note changed the wrong state';
  END IF;
END $note$;

DO $bounded_note$
DECLARE v_id uuid := (SELECT inquiry_id FROM workflow_fixture);
BEGIN
  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM * FROM public.add_internal_inquiry_note(v_id, repeat('x', 1001));
    RESET ROLE;
    RAISE EXCEPTION 'Oversized note succeeded';
  EXCEPTION WHEN SQLSTATE '22023' THEN RESET ROLE; END;
  IF (SELECT count(*) FROM public.inquiry_activities
      WHERE inquiry_id = v_id AND activity_type = 'note_added') <> 1 THEN
    RAISE EXCEPTION 'Rejected note created an activity';
  END IF;
END $bounded_note$;

INSERT INTO public.inquiry_referrals (inquiry_id, recipient_organization_id)
SELECT (SELECT inquiry_id FROM workflow_fixture), id
FROM public.organizations ORDER BY id LIMIT 1;

DO $closure_guard$
DECLARE v_id uuid := (SELECT inquiry_id FROM workflow_fixture);
BEGIN
  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM * FROM public.transition_internal_inquiry_status(v_id, 'reviewing', 'closed', 'other');
    RESET ROLE;
    RAISE EXCEPTION 'Closure with active referral succeeded';
  EXCEPTION WHEN SQLSTATE '23514' THEN RESET ROLE; END;
  IF (SELECT workflow_status FROM public.inquiries WHERE id = v_id) <> 'reviewing'
    OR (SELECT count(*) FROM public.inquiry_activities
        WHERE inquiry_id = v_id AND activity_type = 'inquiry_status_changed') <> 1 THEN
    RAISE EXCEPTION 'Blocked closure changed inquiry state';
  END IF;
END $closure_guard$;

DELETE FROM public.inquiry_referrals WHERE inquiry_id = (SELECT inquiry_id FROM workflow_fixture);

SET LOCAL ROLE service_role;
SELECT * FROM public.transition_internal_inquiry_status(
  (SELECT inquiry_id FROM workflow_fixture), 'reviewing', 'closed', 'other'
);
RESET ROLE;

DO $closed$
DECLARE v_id uuid := (SELECT inquiry_id FROM workflow_fixture);
BEGIN
  IF NOT EXISTS (
    SELECT FROM public.inquiries WHERE id = v_id AND workflow_status = 'closed'
      AND closure_outcome_code = 'other' AND closed_at IS NOT NULL
  ) OR (SELECT count(*) FROM public.inquiry_activities
        WHERE inquiry_id = v_id AND activity_type = 'inquiry_status_changed') <> 2
    OR EXISTS (SELECT FROM public.inquiry_referrals WHERE inquiry_id = v_id) THEN
    RAISE EXCEPTION 'Valid closure did not create the exact expected state';
  END IF;
END $closed$;

ROLLBACK;
