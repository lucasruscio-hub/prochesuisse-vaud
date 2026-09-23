-- LOCAL ONLY. Run after the Phase 4A migration against this workspace's local Supabase container.
-- All structural fixtures roll back; no provider or care facts persist.
\set ON_ERROR_STOP on

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '5s';
SET LOCAL search_path = pg_catalog, public;

DO $$
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'postgres'
    OR inet_server_addr() IS NOT NULL OR current_setting('port') <> '5432' THEN
    RAISE EXCEPTION 'Refusing Phase 4A test: verified local container socket required';
  END IF;
  IF (SELECT count(*) FROM public.providers) <> 66 THEN
    RAISE EXCEPTION 'Expected the preserved 66-provider local baseline';
  END IF;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('organizations', 'provider_organizations',
        'care_offerings', 'care_offering_features', 'care_offering_sources', 'care_offering_availability')
        AND c.relkind = 'r' AND c.relrowsecurity) <> 6 THEN
    RAISE EXCEPTION 'Phase 4A tables and RLS required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'provider_service_areas'
        AND column_name = 'care_offering_id' AND is_nullable = 'YES') THEN
    RAISE EXCEPTION 'Nullable offering scope on provider_service_areas required';
  END IF;
END $$;

CREATE TEMP TABLE phase4_baseline AS SELECT
  (SELECT count(*) FROM public.providers) provider_count,
  (SELECT count(*) FROM public.provider_sources) source_count,
  (SELECT count(*) FROM public.provider_service_areas) area_count,
  (SELECT count(*) FROM public.municipalities) municipality_count,
  (SELECT count(*) FROM public.organizations) organization_count,
  (SELECT count(*) FROM public.provider_organizations) relationship_count,
  (SELECT count(*) FROM public.care_offerings) offering_count,
  (SELECT count(*) FROM public.care_offering_features) feature_count,
  (SELECT count(*) FROM public.care_offering_sources) offering_source_count,
  (SELECT count(*) FROM public.care_offering_availability) availability_count;

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
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS observed_state = RETURNED_SQLSTATE;
  END;
  IF observed_state IS DISTINCT FROM expected_state THEN
    RAISE EXCEPTION 'FAIL: %; expected %, got %', label, expected_state, coalesce(observed_state, 'success');
  END IF;
  RAISE NOTICE 'PASS: %', label;
END $$;
DO $$ BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role', pg_my_temp_schema()::regnamespace::text);
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.assert_true(boolean, text),
  pg_temp.expect_error(text, text, text) TO anon, authenticated, service_role;
GRANT SELECT ON phase4_baseline TO service_role;

SET LOCAL ROLE service_role;

-- Synthetic sources tied to the correct provider establish evidence ownership.
INSERT INTO public.provider_sources (id, provider_id, source_type, source_name, fields_supported)
SELECT source_id, p.id, 'lia', source_name, fields
FROM (VALUES
  ('41000000-0000-4000-8000-000000000001'::uuid, 'ems-boissonnet', 'Phase 4A EMS fixture', ARRAY['offering.type','offering.capacity','offering.service']),
  ('41000000-0000-4000-8000-000000000002'::uuid, 'senevita-vaud', 'Phase 4A Senevita fixture', ARRAY['offering.type']),
  ('41000000-0000-4000-8000-000000000003'::uuid, 'nova-via', 'Phase 4A Nova fixture', ARRAY['offering.type','offering.capacity'])
) source(source_id, slug, source_name, fields)
JOIN public.providers p ON p.slug = source.slug;

INSERT INTO public.organizations (id, slug, name)
VALUES
  ('42000000-0000-4000-8000-000000000001', 'phase4-tertianum', 'Tertianum test organization'),
  ('42000000-0000-4000-8000-000000000002', 'phase4-senevita', 'Senevita test organization'),
  ('42000000-0000-4000-8000-000000000003', 'phase4-nova', 'Nova Vita test organization'),
  ('42000000-0000-4000-8000-000000000004', 'phase4-multi-site', 'Synthetic multi-site operator');

INSERT INTO public.provider_organizations (provider_id, organization_id, relationship_type, is_primary, source_id)
SELECT p.id, relation.organization_id, 'operator', true, relation.source_id
FROM (VALUES
  ('ems-boissonnet', '42000000-0000-4000-8000-000000000001'::uuid, '41000000-0000-4000-8000-000000000001'::uuid),
  ('senevita-vaud', '42000000-0000-4000-8000-000000000002'::uuid, '41000000-0000-4000-8000-000000000002'::uuid),
  ('nova-via', '42000000-0000-4000-8000-000000000003'::uuid, '41000000-0000-4000-8000-000000000003'::uuid)
) relation(slug, organization_id, source_id)
JOIN public.providers p ON p.slug = relation.slug;

INSERT INTO public.care_offerings (id, provider_id, slug, name, offering_type,
  capacity_value, capacity_unit, long_stay, short_stay, respite_stay)
SELECT offering.id, p.id, offering.slug, offering.name, offering.offering_type,
  offering.capacity_value, offering.capacity_unit, offering.long_stay, offering.short_stay, offering.respite_stay
FROM (VALUES
  ('43000000-0000-4000-8000-000000000001'::uuid, 'ems-boissonnet', 'ems', 'EMS', 'ems', 42, 'beds', true, true, true),
  ('43000000-0000-4000-8000-000000000002'::uuid, 'senevita-vaud', 'home-care', 'Soins à domicile', 'home_care', NULL, NULL, NULL, NULL, NULL),
  ('43000000-0000-4000-8000-000000000003'::uuid, 'nova-via', 'senior-residence', 'Résidence seniors', 'senior_residence', NULL, NULL, NULL, NULL, NULL),
  ('43000000-0000-4000-8000-000000000004'::uuid, 'nova-via', 'medicalized-care', 'Unité médicalisée', 'medicalized_care_unit', NULL, NULL, NULL, NULL, NULL),
  ('43000000-0000-4000-8000-000000000005'::uuid, 'senevita-vaud', 'home-support', 'Aide à domicile', 'home_care', NULL, NULL, NULL, NULL, NULL)
) offering(id, provider_slug, slug, name, offering_type, capacity_value, capacity_unit, long_stay, short_stay, respite_stay)
JOIN public.providers p ON p.slug = offering.provider_slug;

INSERT INTO public.care_offering_sources (provider_id, offering_id, source_id, fields_supported)
SELECT o.provider_id, o.id, evidence.source_id, evidence.fields
FROM (VALUES
  ('43000000-0000-4000-8000-000000000001'::uuid, '41000000-0000-4000-8000-000000000001'::uuid, ARRAY['offering_type','capacity','stay_types']),
  ('43000000-0000-4000-8000-000000000002'::uuid, '41000000-0000-4000-8000-000000000002'::uuid, ARRAY['offering_type']),
  ('43000000-0000-4000-8000-000000000003'::uuid, '41000000-0000-4000-8000-000000000003'::uuid, ARRAY['offering_type']),
  ('43000000-0000-4000-8000-000000000004'::uuid, '41000000-0000-4000-8000-000000000003'::uuid, ARRAY['offering_type']),
  ('43000000-0000-4000-8000-000000000005'::uuid, '41000000-0000-4000-8000-000000000002'::uuid, ARRAY['offering_type'])
) evidence(offering_id, source_id, fields)
JOIN public.care_offerings o ON o.id = evidence.offering_id;

INSERT INTO public.care_offering_features
  (provider_id, offering_id, feature_kind, feature_code, display_name, source_id)
SELECT o.provider_id, o.id, 'service', 'palliative_care', 'Soins palliatifs',
  '41000000-0000-4000-8000-000000000001'
FROM public.care_offerings o WHERE o.id = '43000000-0000-4000-8000-000000000001';

INSERT INTO public.care_offering_availability
  (provider_id, offering_id, availability_status, observed_at, source_id)
SELECT o.provider_id, o.id, 'waitlist', '2026-09-23 12:00:00+00',
  '41000000-0000-4000-8000-000000000001'
FROM public.care_offerings o WHERE o.id = '43000000-0000-4000-8000-000000000001';

SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.care_offerings o
  JOIN public.providers p ON p.id=o.provider_id WHERE p.slug='ems-boissonnet'),
  'one site can have one EMS offering');
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.care_offerings o
  JOIN public.providers p ON p.id=o.provider_id WHERE p.slug='nova-via'),
  'Nova Vita can have distinct residence and medicalized offerings');
SELECT pg_temp.assert_true((SELECT NOT p.is_published AND bool_and(NOT o.is_published)
  FROM public.providers p JOIN public.care_offerings o ON o.provider_id=p.id WHERE p.slug='nova-via' GROUP BY p.id),
  'Nova Vita structure remains unpublished');
SELECT pg_temp.assert_true((SELECT capacity_value IS NULL AND capacity_unit IS NULL
  AND long_stay IS NULL AND short_stay IS NULL AND respite_stay IS NULL
  AND admissions_notes IS NULL AND financing_notes IS NULL AND public_interest_status IS NULL
  AND pricing_notes IS NULL FROM public.care_offerings WHERE id='43000000-0000-4000-8000-000000000003'),
  'unknown offering facts remain null');
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.provider_service_areas a
  JOIN public.providers p ON p.id=a.provider_id WHERE p.slug='senevita-vaud'),
  'office address and home-care offerings create no service coverage');
SELECT pg_temp.assert_true((SELECT offering_source_count + 5 = (SELECT count(*) FROM public.care_offering_sources)
  AND feature_count + 1 = (SELECT count(*) FROM public.care_offering_features)
  AND availability_count + 1 = (SELECT count(*) FROM public.care_offering_availability)
  FROM phase4_baseline),
  'offering facts retain private source linkage and timestamped availability');

-- Coverage is added only through explicit, sourced service-area rows. NULL keeps site scope;
-- a non-NULL offering scope can differ between two offerings at the same office.
INSERT INTO public.provider_service_areas
  (provider_id, care_offering_id, coverage_type, country_code, canton_code, source_id)
SELECT p.id, scope.offering_id, 'canton', 'CH', scope.canton_code,
  '41000000-0000-4000-8000-000000000002'
FROM (VALUES
  (NULL::uuid, 'FR'),
  ('43000000-0000-4000-8000-000000000002'::uuid, 'VD'),
  ('43000000-0000-4000-8000-000000000005'::uuid, 'GE')
) scope(offering_id, canton_code)
JOIN public.providers p ON p.slug = 'senevita-vaud';

SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.provider_service_areas a
  JOIN public.providers p ON p.id=a.provider_id
  WHERE p.slug='senevita-vaud' AND a.care_offering_id IS NULL AND a.canton_code='FR'),
  'provider-level coverage remains supported');
SELECT pg_temp.assert_true((SELECT count(DISTINCT a.canton_code) = 2
  AND count(DISTINCT a.care_offering_id) = 2 FROM public.provider_service_areas a
  JOIN public.providers p ON p.id=a.provider_id
  WHERE p.slug='senevita-vaud' AND a.care_offering_id IS NOT NULL),
  'one office with two offerings can have distinct sourced coverage');

-- An operator can relate to multiple sites without merging the sites or offerings.
INSERT INTO public.providers (id, slug, name, primary_type)
VALUES
  ('44000000-0000-4000-8000-000000000001', 'phase4-test-site-a', 'Synthetic site A', 'ems'),
  ('44000000-0000-4000-8000-000000000002', 'phase4-test-site-b', 'Synthetic site B', 'ems');
INSERT INTO public.provider_sources (id, provider_id, source_type, source_name)
VALUES
  ('45000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000001', 'lia', 'Synthetic A evidence'),
  ('45000000-0000-4000-8000-000000000002', '44000000-0000-4000-8000-000000000002', 'lia', 'Synthetic B evidence');
INSERT INTO public.provider_organizations (provider_id, organization_id, relationship_type, is_primary, source_id)
VALUES
  ('44000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000004', 'operator', true, '45000000-0000-4000-8000-000000000001'),
  ('44000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000004', 'operator', true, '45000000-0000-4000-8000-000000000002');
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.provider_organizations
  WHERE organization_id='42000000-0000-4000-8000-000000000004'),
  'one operator can relate to multiple independent sites');

SELECT pg_temp.expect_error($q$INSERT INTO public.care_offerings(provider_id,slug,name,offering_type)
  SELECT id,'bad','Bad','unknown' FROM public.providers WHERE slug='ems-boissonnet'$q$, '23514', 'invalid offering type');
SELECT pg_temp.expect_error($q$INSERT INTO public.care_offerings(provider_id,slug,name,offering_type,capacity_value)
  SELECT id,'bad-capacity','Bad capacity','ems',10 FROM public.providers WHERE slug='ems-boissonnet'$q$, '23514', 'capacity requires unit');
SELECT pg_temp.expect_error($q$INSERT INTO public.care_offering_features
  (provider_id,offering_id,feature_kind,feature_code,display_name,source_id)
  SELECT o.provider_id,o.id,'service','wrong_source','Wrong source','41000000-0000-4000-8000-000000000002'
  FROM public.care_offerings o WHERE o.id='43000000-0000-4000-8000-000000000001'$q$, '23503', 'cross-site evidence rejected');
SELECT pg_temp.expect_error($q$INSERT INTO public.provider_service_areas
  (provider_id,care_offering_id,coverage_type,country_code,canton_code,source_id)
  SELECT p.id,'43000000-0000-4000-8000-000000000002','canton','CH','VS',
    '41000000-0000-4000-8000-000000000001'
  FROM public.providers p WHERE p.slug='ems-boissonnet'$q$, '23503',
  'cross-provider offering coverage rejected');
RESET ROLE;

CREATE FUNCTION pg_temp.check_hidden() RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  PERFORM pg_temp.assert_true((SELECT count(*)=0 FROM public.organizations), current_user || ': unpublished organizations hidden');
  PERFORM pg_temp.assert_true((SELECT count(*)=0 FROM public.provider_organizations), current_user || ': unpublished relationships hidden');
  PERFORM pg_temp.assert_true((SELECT count(*)=0 FROM public.care_offerings), current_user || ': unpublished offerings hidden');
  PERFORM pg_temp.assert_true((SELECT count(*)=0 FROM public.care_offering_features), current_user || ': unpublished features hidden');
  PERFORM pg_temp.assert_true((SELECT count(*)=0 FROM public.care_offering_availability), current_user || ': unpublished availability hidden');
  PERFORM pg_temp.assert_true((SELECT count(*)=0 FROM public.provider_service_areas), current_user || ': unpublished coverage hidden');
  PERFORM pg_temp.expect_error('SELECT * FROM public.care_offering_sources', '42501', current_user || ': offering provenance private');
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.check_hidden() TO anon, authenticated;
SET LOCAL ROLE anon;
SELECT pg_temp.check_hidden();
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.check_hidden();
RESET ROLE;

-- Existing provider-family data remains untouched inside the test transaction.
SELECT pg_temp.assert_true((SELECT provider_count + 2 = (SELECT count(*) FROM public.providers)
  AND source_count + 5 = (SELECT count(*) FROM public.provider_sources)
  AND area_count + 3 = (SELECT count(*) FROM public.provider_service_areas)
  AND municipality_count = (SELECT count(*) FROM public.municipalities)
  AND organization_count + 4 = (SELECT count(*) FROM public.organizations)
  AND relationship_count + 5 = (SELECT count(*) FROM public.provider_organizations)
  AND offering_count + 5 = (SELECT count(*) FROM public.care_offerings)
  AND feature_count + 1 = (SELECT count(*) FROM public.care_offering_features)
  AND offering_source_count + 5 = (SELECT count(*) FROM public.care_offering_sources)
  AND availability_count + 1 = (SELECT count(*) FROM public.care_offering_availability)
  FROM phase4_baseline),
  'only explicit synthetic fixtures changed; municipalities untouched');

ROLLBACK;
\echo 'PASS: Phase 4A structural, provenance, nullability, coverage, and RLS assertions rolled back.'
