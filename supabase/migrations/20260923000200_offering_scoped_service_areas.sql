-- Phase 4A refinement: optionally scope the existing coverage model to one care offering.
-- No coverage rows are created; NULL care_offering_id preserves provider/site-level semantics.
BEGIN;

ALTER TABLE public.provider_service_areas
  ADD COLUMN care_offering_id uuid;

ALTER TABLE public.provider_service_areas
  ADD CONSTRAINT provider_service_areas_own_offering
  FOREIGN KEY (provider_id, care_offering_id)
  REFERENCES public.care_offerings(provider_id, id) ON DELETE CASCADE;

-- Preserve provider-level uniqueness while allowing independently sourced offering coverage.
DROP INDEX public.provider_service_areas_municipality_key;
DROP INDEX public.provider_service_areas_canton_key;
CREATE UNIQUE INDEX provider_service_areas_provider_municipality_key
  ON public.provider_service_areas (provider_id, municipality_id)
  WHERE coverage_type = 'municipality' AND care_offering_id IS NULL;
CREATE UNIQUE INDEX provider_service_areas_provider_canton_key
  ON public.provider_service_areas (provider_id, country_code, canton_code)
  WHERE coverage_type = 'canton' AND care_offering_id IS NULL;
CREATE UNIQUE INDEX provider_service_areas_offering_municipality_key
  ON public.provider_service_areas (provider_id, care_offering_id, municipality_id)
  WHERE coverage_type = 'municipality' AND care_offering_id IS NOT NULL;
CREATE UNIQUE INDEX provider_service_areas_offering_canton_key
  ON public.provider_service_areas (provider_id, care_offering_id, country_code, canton_code)
  WHERE coverage_type = 'canton' AND care_offering_id IS NOT NULL;
CREATE INDEX provider_service_areas_offering_idx
  ON public.provider_service_areas (care_offering_id, provider_id)
  WHERE care_offering_id IS NOT NULL;

DROP POLICY provider_service_areas_public_read ON public.provider_service_areas;
CREATE POLICY provider_service_areas_public_read ON public.provider_service_areas
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.providers p
      WHERE p.id = provider_service_areas.provider_id AND p.is_published AND p.status = 'active')
    AND (
      care_offering_id IS NULL
      OR EXISTS (SELECT 1 FROM public.care_offerings o
        WHERE o.id = provider_service_areas.care_offering_id
          AND o.provider_id = provider_service_areas.provider_id
          AND o.is_published AND o.status = 'active')
    )
  );

COMMIT;
