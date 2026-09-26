-- Phase 5B local verification. Read-only apart from transaction-local checks.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = pg_catalog, public;

DO $phase5b_schema$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'provider_sources'
      AND column_name = 'accessed_on' AND data_type = 'date'
      AND is_nullable = 'YES' AND column_default IS NULL
  ) THEN RAISE EXCEPTION 'Missing nullable provider_sources.accessed_on date'; END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'provider_service_areas'
      AND column_name = 'coverage_label' AND data_type = 'text' AND is_nullable = 'YES'
  ) THEN RAISE EXCEPTION 'Missing nullable provider_service_areas.coverage_label'; END IF;

  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'provider_service_areas'
      AND column_name = 'source_id' AND is_nullable = 'YES'
  ) THEN RAISE EXCEPTION 'Coverage source must be required'; END IF;

  IF NOT EXISTS (
    SELECT FROM pg_constraint
    WHERE conrelid = 'public.provider_service_areas'::regclass
      AND conname = 'provider_service_areas_target' AND convalidated
      AND pg_get_constraintdef(oid) LIKE '%coverage_type = ''region''%'
      AND pg_get_constraintdef(oid) LIKE '%coverage_label IS NOT NULL%'
  ) THEN RAISE EXCEPTION 'Narrative region target constraint missing'; END IF;

  IF to_regclass('public.provider_service_areas_provider_region_key') IS NULL
    OR to_regclass('public.provider_service_areas_offering_region_key') IS NULL THEN
    RAISE EXCEPTION 'Narrative region uniqueness missing';
  END IF;
END $phase5b_schema$;

DO $phase5b_data$
BEGIN
  IF (SELECT count(*) FROM public.provider_service_areas) <> 0 THEN
    RAISE EXCEPTION 'Real service-area rows must remain zero';
  END IF;
  IF EXISTS (SELECT FROM public.provider_sources WHERE accessed_on IS NOT NULL) THEN
    RAISE EXCEPTION 'Historical source access dates were backfilled';
  END IF;
  IF (SELECT count(DISTINCT p.id) FROM public.providers p
      JOIN public.care_offerings o ON o.provider_id = p.id
      WHERE p.primary_type = 'ems') <> 31 THEN
    RAISE EXCEPTION 'Expected exactly 31 enriched EMS';
  END IF;
  IF EXISTS (SELECT FROM public.care_offerings WHERE offering_type = 'home_care')
    OR EXISTS (SELECT FROM public.care_offering_features f
      JOIN public.providers p ON p.id = f.provider_id WHERE p.primary_type = 'domicile')
    OR EXISTS (SELECT FROM public.provider_organizations po
      JOIN public.providers p ON p.id = po.provider_id WHERE p.primary_type = 'domicile') THEN
    RAISE EXCEPTION 'Home-care provider data must not be enriched in Phase 5B';
  END IF;
END $phase5b_data$;

CREATE TEMP TABLE lia_phase5b_target AS
SELECT p.id provider_id, o.id offering_id, s.id source_id
FROM public.providers p
JOIN LATERAL (SELECT id FROM public.care_offerings WHERE provider_id = p.id ORDER BY id LIMIT 1) o ON true
JOIN LATERAL (SELECT id FROM public.provider_sources WHERE provider_id = p.id ORDER BY id LIMIT 1) s ON true
WHERE p.primary_type = 'ems'
ORDER BY p.id
LIMIT 1;

INSERT INTO public.provider_service_areas
  (provider_id, care_offering_id, coverage_type, coverage_label, source_id)
SELECT provider_id, NULL, 'region', 'Région de test', source_id FROM lia_phase5b_target
UNION ALL
SELECT provider_id, offering_id, 'region', 'Région de test', source_id FROM lia_phase5b_target;

DO $phase5b_constraints$
BEGIN
  IF (SELECT count(*) FROM public.provider_service_areas
      WHERE coverage_type = 'region' AND coverage_label = 'Région de test') <> 2 THEN
    RAISE EXCEPTION 'Provider- and offering-scoped narrative coverage failed';
  END IF;

  BEGIN
    INSERT INTO public.provider_service_areas
      (provider_id, coverage_type, coverage_label, canton_code, source_id)
    SELECT provider_id, 'region', 'Invalid targeted region', 'VD', source_id FROM lia_phase5b_target;
    RAISE EXCEPTION 'Narrative coverage accepted a structured target';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.provider_service_areas
      (provider_id, coverage_type, canton_code, coverage_label, source_id)
    SELECT provider_id, 'canton', 'VD', 'Invalid canton label', source_id FROM lia_phase5b_target;
    RAISE EXCEPTION 'Structured coverage accepted a narrative label';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.provider_service_areas
      (provider_id, coverage_type, coverage_label, source_id)
    SELECT provider_id, 'region', 'Missing source', NULL FROM lia_phase5b_target;
    RAISE EXCEPTION 'Coverage accepted a missing source';
  EXCEPTION WHEN not_null_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.provider_service_areas
      (provider_id, coverage_type, coverage_label, source_id)
    SELECT provider_id, 'region', '  région de test  ', source_id FROM lia_phase5b_target;
    RAISE EXCEPTION 'Narrative coverage accepted a normalized duplicate';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $phase5b_constraints$;

ROLLBACK;
