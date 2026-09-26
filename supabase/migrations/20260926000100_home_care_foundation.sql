-- Phase 5B: typed source access dates and narrative home-care coverage.
-- Schema only: no providers, offerings, features, municipalities, or coverage rows are created.
BEGIN;

-- Date-only source access evidence must not be converted to an invented timestamp.
ALTER TABLE public.provider_sources
  ADD COLUMN accessed_on date;

-- Narrative regions preserve the source wording for display/context. They are not
-- structured municipality or canton coverage and must never be expanded implicitly.
ALTER TABLE public.provider_service_areas
  ADD COLUMN coverage_label text;

ALTER TABLE public.provider_service_areas
  DROP CONSTRAINT provider_service_areas_coverage_type_check;
ALTER TABLE public.provider_service_areas
  ADD CONSTRAINT provider_service_areas_coverage_type_check
  CHECK (coverage_type IN ('municipality', 'canton', 'region'));

ALTER TABLE public.provider_service_areas
  DROP CONSTRAINT provider_service_areas_target;
ALTER TABLE public.provider_service_areas
  ADD CONSTRAINT provider_service_areas_target CHECK (
    (coverage_type = 'municipality'
      AND municipality_id IS NOT NULL AND canton_code IS NULL AND coverage_label IS NULL)
    OR (coverage_type = 'canton'
      AND municipality_id IS NULL AND canton_code IS NOT NULL AND coverage_label IS NULL)
    OR (coverage_type = 'region'
      AND municipality_id IS NULL AND canton_code IS NULL
      AND coverage_label IS NOT NULL AND btrim(coverage_label) <> '')
  );

-- Coverage is always a positive, explicitly sourced fact. The table is empty at
-- this migration boundary, so this tightens future writes without inventing data.
ALTER TABLE public.provider_service_areas
  ALTER COLUMN source_id SET NOT NULL;

CREATE UNIQUE INDEX provider_service_areas_provider_region_key
  ON public.provider_service_areas (provider_id, lower(btrim(coverage_label)))
  WHERE coverage_type = 'region' AND care_offering_id IS NULL;
CREATE UNIQUE INDEX provider_service_areas_offering_region_key
  ON public.provider_service_areas (provider_id, care_offering_id, lower(btrim(coverage_label)))
  WHERE coverage_type = 'region' AND care_offering_id IS NOT NULL;

COMMENT ON COLUMN public.provider_sources.accessed_on IS
  'Exact date a source was accessed, when known; NULL means unknown and must not be fabricated.';
COMMENT ON COLUMN public.provider_service_areas.coverage_label IS
  'Source wording for narrative region coverage; display/context only, never structured municipality matching.';

COMMIT;
