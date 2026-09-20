-- PREPARED, NOT EXECUTED. Read docs/provider-local-testing.md first.
-- psql script, not a Supabase SQL Editor script. Never run against production.
-- Apply the migration separately ONLY in an empty disposable local database.
-- Requires an admin test connection capable of SET ROLE and the three API roles.
-- All fixtures below are synthetic; no legacy provider/lead data is read/imported.
\set ON_ERROR_STOP on
\if :{?local_disposable_confirmed}
\else
  \set local_disposable_confirmed no
\endif

BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SELECT set_config('lia_test.local_disposable_confirmed', :'local_disposable_confirmed', true);
DO $$
BEGIN
  IF current_setting('lia_test.local_disposable_confirmed') <> 'yes'
     OR current_database() <> 'lia_provider_phase1_test'
     OR (inet_server_addr() IS NOT NULL AND inet_server_addr() NOT IN ('127.0.0.1'::inet, '::1'::inet)) THEN
    RAISE EXCEPTION 'Refusing test: requires confirmed disposable lia_provider_phase1_test on local loopback/socket';
  END IF;
  IF to_regclass('public.leads') IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing test: this must be an isolated database with no leads table';
  END IF;
  IF EXISTS (SELECT 1 FROM public.providers)
     OR EXISTS (SELECT 1 FROM public.municipalities)
     OR EXISTS (SELECT 1 FROM public.provider_sources)
     OR EXISTS (SELECT 1 FROM public.provider_service_areas) THEN
    RAISE EXCEPTION 'Refusing test: provider foundation tables must be empty';
  END IF;
  IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')) <> 3 THEN
    RAISE EXCEPTION 'Missing local Supabase-compatible API roles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('anon', 'authenticated') AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Client roles must not bypass RLS';
  END IF;
  IF NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'Local service_role must reproduce Supabase BYPASSRLS behavior';
  END IF;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN
        ('providers', 'municipalities', 'provider_sources', 'provider_service_areas')
      AND c.relrowsecurity) <> 4 THEN
    RAISE EXCEPTION 'RLS must be enabled on all four new tables';
  END IF;
END;
$$;

-- Test helpers are temporary, invoker-rights functions. They do not bypass RLS.
CREATE TEMP TABLE test_session_marker (value integer);
DO $$ BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role',
    pg_my_temp_schema()::regnamespace::text);
END $$;

CREATE FUNCTION pg_temp.assert_true(ok boolean, label text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'PASS: %', label;
END $$;

CREATE FUNCTION pg_temp.expect_error(statement text, expected_state text, label text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE observed_state text;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS observed_state = RETURNED_SQLSTATE;
  END;
  IF observed_state IS DISTINCT FROM expected_state THEN
    RAISE EXCEPTION 'FAIL: %; expected SQLSTATE %, got %', label, expected_state, coalesce(observed_state, 'success');
  END IF;
  RAISE NOTICE 'PASS: %', label;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.assert_true(boolean, text),
  pg_temp.expect_error(text, text, text) TO anon, authenticated, service_role;

SET LOCAL ROLE service_role;
INSERT INTO public.municipalities (id, canton_code, official_name, normalized_name)
VALUES ('00000000-0000-4000-8000-000000000001', 'VD', 'Synthetic test municipality', 'synthetic-test');
INSERT INTO public.providers (id, slug, legacy_id, name, primary_type, is_published, status, verification_status)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'test-public', 'test-legacy-1', 'Synthetic public', 'domicile', true, 'active', 'unverified'),
  ('10000000-0000-4000-8000-000000000002', 'test-unpublished', 'test-legacy-2', 'Synthetic unpublished', 'domicile', false, 'active', 'verified'),
  ('10000000-0000-4000-8000-000000000003', 'test-inactive', null, 'Synthetic inactive', 'domicile', true, 'inactive', 'verified'),
  ('10000000-0000-4000-8000-000000000004', 'test-archived', null, 'Synthetic archived', 'domicile', true, 'archived', 'verified'),
  ('10000000-0000-4000-8000-000000000005', 'test-verified', null, 'Synthetic verified', 'domicile', true, 'active', 'verified');
INSERT INTO public.providers (slug, name, primary_type, created_at, updated_at, original_tags)
VALUES ('test-defaults', 'Synthetic defaults', 'ems', '2000-01-01 00:00:00+00', '2000-01-01 00:00:00+00', ARRAY['Bilingue', 'Alzheimer']);
SELECT pg_temp.assert_true((SELECT NOT is_published AND status = 'active' AND verification_status = 'unverified'
  AND service_codes = '{}'::text[] AND language_codes = '{}'::text[] AND subtypes = '{}'::text[]
  AND attributes = '{}'::jsonb AND latitude IS NULL AND longitude IS NULL AND street IS NULL
  AND original_tags = ARRAY['Bilingue', 'Alzheimer'] AND last_reviewed_at IS NULL
  FROM public.providers WHERE slug = 'test-defaults'), 'defaults preserve unknown facts, tags, and no automatic service mapping');
UPDATE public.providers SET description = 'Synthetic update' WHERE slug = 'test-defaults';
SELECT pg_temp.assert_true((SELECT updated_at = transaction_timestamp() AND created_at = '2000-01-01 00:00:00+00'::timestamptz
  AND last_reviewed_at IS NULL FROM public.providers WHERE slug = 'test-defaults'), 'updated_at trigger changes timestamp, not review/creation dates');
INSERT INTO public.provider_sources (id, provider_id, source_type, source_name, notes)
VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'lia', 'Synthetic evidence', 'PRIVATE SYNTHETIC NOTE');
INSERT INTO public.provider_service_areas (provider_id, municipality_id, coverage_type)
SELECT id, '00000000-0000-4000-8000-000000000001', 'municipality'
FROM public.providers WHERE slug <> 'test-defaults';
INSERT INTO public.provider_service_areas (provider_id, country_code, canton_code, coverage_type, source_id)
VALUES ('10000000-0000-4000-8000-000000000001', 'CH', 'VD', 'canton', '20000000-0000-4000-8000-000000000001');
SELECT pg_temp.assert_true((SELECT count(*) = 6 FROM public.providers), 'service_role can write and read unpublished providers');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.provider_sources), 'service_role can write/read private sources');
SELECT pg_temp.assert_true((SELECT count(*) = 6 FROM public.provider_service_areas), 'service_role can write/read hidden-parent coverage');

-- Constraint failures are caught in subtransactions; no failed fixture persists.
SELECT pg_temp.expect_error($q$INSERT INTO public.providers(slug,name,primary_type) VALUES ('bad-type','Test','invalid')$q$, '23514', 'invalid provider type');
SELECT pg_temp.expect_error($q$UPDATE public.providers SET status='invalid' WHERE slug='test-public'$q$, '23514', 'invalid status');
SELECT pg_temp.expect_error($q$UPDATE public.providers SET verification_status='invalid' WHERE slug='test-public'$q$, '23514', 'invalid verification status');
SELECT pg_temp.expect_error($q$UPDATE public.providers SET country_code='CHE' WHERE slug='test-public'$q$, '23514', 'invalid country code');
SELECT pg_temp.expect_error($q$UPDATE public.providers SET latitude=91, longitude=0 WHERE slug='test-public'$q$, '23514', 'invalid latitude');
SELECT pg_temp.expect_error($q$UPDATE public.providers SET latitude=0, longitude=181 WHERE slug='test-public'$q$, '23514', 'invalid longitude');
SELECT pg_temp.expect_error($q$UPDATE public.providers SET latitude=0, longitude=NULL WHERE slug='test-public'$q$, '23514', 'partial coordinate pair');
SELECT pg_temp.expect_error($q$INSERT INTO public.providers(slug,name,primary_type) VALUES ('test-public','Test','ems')$q$, '23505', 'duplicate slug');
SELECT pg_temp.expect_error($q$INSERT INTO public.providers(slug,legacy_id,name,primary_type) VALUES ('test-duplicate','test-legacy-1','Test','ems')$q$, '23505', 'duplicate legacy ID');
SELECT pg_temp.expect_error($q$INSERT INTO public.provider_service_areas(provider_id,municipality_id,coverage_type) VALUES ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','municipality')$q$, '23505', 'duplicate municipality coverage');
SELECT pg_temp.expect_error($q$INSERT INTO public.provider_service_areas(provider_id,country_code,canton_code,coverage_type) VALUES ('10000000-0000-4000-8000-000000000001','CH','VD','canton')$q$, '23505', 'duplicate canton coverage');
SELECT pg_temp.expect_error($q$INSERT INTO public.provider_service_areas(provider_id,coverage_type) VALUES ('10000000-0000-4000-8000-000000000001','municipality')$q$, '23514', 'coverage requires target');
SELECT pg_temp.expect_error($q$INSERT INTO public.provider_service_areas(provider_id,municipality_id,canton_code,coverage_type) VALUES ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','VD','municipality')$q$, '23514', 'coverage rejects conflicting targets');
SELECT pg_temp.expect_error($q$INSERT INTO public.provider_service_areas(provider_id,canton_code,coverage_type) VALUES ('10000000-0000-4000-8000-000000000001','VD','nationwide')$q$, '23514', 'invalid coverage type');
SELECT pg_temp.expect_error($q$INSERT INTO public.provider_service_areas(provider_id,canton_code,coverage_type,source_id) VALUES ('10000000-0000-4000-8000-000000000002','GE','canton','20000000-0000-4000-8000-000000000001')$q$, '23503', 'cross-provider evidence rejected');
SELECT pg_temp.expect_error($q$INSERT INTO public.provider_service_areas(provider_id,municipality_id,coverage_type) VALUES ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000099','municipality')$q$, '23503', 'unknown municipality rejected');
RESET ROLE;

SELECT pg_temp.assert_true((SELECT count(*)=1 FROM pg_indexes WHERE schemaname='public'
  AND indexname='provider_service_areas_municipality_provider_idx'
  AND indexdef LIKE '%(municipality_id, provider_id)%'
  AND indexdef LIKE '%coverage_type = ''municipality''%'), 'municipality target-first partial index exists');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM pg_indexes WHERE schemaname='public'
  AND indexname='provider_service_areas_canton_provider_idx'
  AND indexdef LIKE '%(country_code, canton_code, provider_id)%'
  AND indexdef LIKE '%coverage_type = ''canton''%'), 'canton target-first partial index exists');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM pg_indexes WHERE schemaname='public'
  AND indexname IN ('provider_service_areas_municipality_key', 'provider_service_areas_canton_key')
  AND indexdef LIKE 'CREATE UNIQUE INDEX%'), 'provider-first uniqueness indexes retained');

CREATE FUNCTION pg_temp.check_public_role() RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE target text;
BEGIN
  PERFORM pg_temp.assert_true(current_user IN ('anon', 'authenticated'), 'actual client role in effect');
  PERFORM pg_temp.assert_true((SELECT array_agg(slug ORDER BY slug) = ARRAY['test-public', 'test-verified']
    FROM public.providers), current_user || ': only published active providers; verification independent');
  PERFORM pg_temp.assert_true((SELECT count(*) = 3 FROM public.provider_service_areas), current_user || ': unpublished/inactive/archived parent coverage hidden');
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.municipalities), current_user || ': reference municipality readable');
  PERFORM pg_temp.assert_true((SELECT count(*) = 2 FROM public.provider_service_areas a JOIN public.providers p ON p.id=a.provider_id
    WHERE a.coverage_type='municipality' AND a.municipality_id='00000000-0000-4000-8000-000000000001' AND p.primary_type='domicile'), 'reverse municipality lookup');
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.provider_service_areas a JOIN public.providers p ON p.id=a.provider_id
    WHERE a.coverage_type='canton' AND a.country_code='CH' AND a.canton_code='VD' AND p.primary_type='domicile'), 'reverse canton lookup');
  PERFORM pg_temp.expect_error('SELECT * FROM public.provider_sources', '42501', current_user || ': sources private');
  FOREACH target IN ARRAY ARRAY['providers','municipalities','provider_service_areas','provider_sources'] LOOP
    PERFORM pg_temp.expect_error(format('INSERT INTO public.%I DEFAULT VALUES', target), '42501', current_user || ': no insert ' || target);
    PERFORM pg_temp.expect_error(format('UPDATE public.%I SET created_at=now()', target), '42501', current_user || ': no update ' || target);
    PERFORM pg_temp.expect_error(format('DELETE FROM public.%I', target), '42501', current_user || ': no delete ' || target);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.check_public_role() TO anon, authenticated;
SET LOCAL ROLE anon;
SELECT pg_temp.check_public_role();
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.check_public_role();
RESET ROLE;

-- Changing publication/status immediately hides the existing child rows.
SET LOCAL ROLE service_role;
UPDATE public.providers SET is_published=false WHERE slug='test-public';
UPDATE public.providers SET status='inactive' WHERE slug='test-verified';
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.providers), 'anon: unpublication/inactivation takes effect');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.provider_service_areas), 'anon: child coverage disappears');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.providers), 'authenticated: unpublication/inactivation takes effect');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.provider_service_areas), 'authenticated: child coverage disappears');
RESET ROLE;

SET LOCAL ROLE service_role;
UPDATE public.municipalities SET aliases=ARRAY['Synthetic alias'];
UPDATE public.provider_sources SET notes='PRIVATE SYNTHETIC UPDATE';
UPDATE public.provider_service_areas SET source_id=NULL WHERE coverage_type='canton';
SELECT pg_temp.assert_true((SELECT notes='PRIVATE SYNTHETIC UPDATE' FROM public.provider_sources), 'service_role can update private sources');
DELETE FROM public.provider_service_areas;
DELETE FROM public.provider_sources;
DELETE FROM public.providers;
DELETE FROM public.municipalities;
SELECT pg_temp.assert_true(NOT EXISTS (SELECT 1 FROM public.providers)
  AND NOT EXISTS (SELECT 1 FROM public.provider_sources)
  AND NOT EXISTS (SELECT 1 FROM public.provider_service_areas)
  AND NOT EXISTS (SELECT 1 FROM public.municipalities), 'service_role can delete its synthetic fixtures');
RESET ROLE;

ROLLBACK;
\echo 'PASS: all assertions completed; synthetic fixtures/helpers rolled back. Migration schema remains in the disposable database.'
