-- Phase 1 schema only. No seed/import, no existing-table changes.
-- Publication is explicit and independent of commercial relationships.
BEGIN;

CREATE TABLE public.municipalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL DEFAULT 'CH'
    CHECK (country_code ~ '^[A-Z]{2}$'),
  canton_code text NOT NULL CHECK (canton_code ~ '^[A-Z]{2}$'),
  official_name text NOT NULL CHECK (btrim(official_name) <> ''),
  normalized_name text NOT NULL CHECK (btrim(normalized_name) <> ''),
  aliases text[] NOT NULL DEFAULT '{}',
  bfs_number integer CHECK (bfs_number > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT municipalities_country_bfs_key UNIQUE (country_code, bfs_number)
);

CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text UNIQUE CHECK (legacy_id IS NULL OR btrim(legacy_id) <> ''),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (btrim(name) <> ''),
  primary_type text NOT NULL CHECK (primary_type IN ('ems', 'domicile', 'residence')),
  subtypes text[] NOT NULL DEFAULT '{}',
  country_code text NOT NULL DEFAULT 'CH' CHECK (country_code ~ '^[A-Z]{2}$'),
  canton_code text CHECK (canton_code ~ '^[A-Z]{2}$'),
  municipality_id uuid REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  postal_code text,
  locality text,
  street text,
  house_number text,
  latitude numeric CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric CHECK (longitude BETWEEN -180 AND 180),
  phone text,
  email text,
  website text,
  description text,
  service_codes text[] NOT NULL DEFAULT '{}',
  language_codes text[] NOT NULL DEFAULT '{}',
  attributes jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(attributes) = 'object'),
  original_tags text[] NOT NULL DEFAULT '{}',
  original_location_text text,
  -- Directory lifecycle, not evidence that an operation is currently open.
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'partially_verified', 'verified', 'stale')),
  is_published boolean NOT NULL DEFAULT false,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT providers_coordinate_pair CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE TABLE public.provider_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('public', 'provider', 'lia', 'legacy')),
  source_name text NOT NULL CHECK (btrim(source_name) <> ''),
  source_url text,
  external_record_id text,
  retrieved_at timestamptz,
  reviewed_at timestamptz,
  fields_supported text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Also indexes provider_id; allows coverage to reference only its own evidence.
  CONSTRAINT provider_sources_provider_id_id_key UNIQUE (provider_id, id)
);

CREATE TABLE public.provider_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  municipality_id uuid REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  canton_code text CHECK (canton_code ~ '^[A-Z]{2}$'),
  -- CH scope is explicit for canton targets; no assumption based on office location.
  country_code text NOT NULL DEFAULT 'CH' CHECK (country_code ~ '^[A-Z]{2}$'),
  coverage_type text NOT NULL CHECK (coverage_type IN ('municipality', 'canton')),
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_service_areas_target CHECK (
    (coverage_type = 'municipality' AND municipality_id IS NOT NULL AND canton_code IS NULL)
    OR (coverage_type = 'canton' AND municipality_id IS NULL AND canton_code IS NOT NULL)
  ),
  CONSTRAINT provider_service_areas_own_source FOREIGN KEY (provider_id, source_id)
    REFERENCES public.provider_sources(provider_id, id) ON DELETE NO ACTION
);

-- PK/UNIQUE constraints already index IDs, slug, legacy_id and BFS identity.
-- Partial discovery index covers publication/status and the default category browse.
CREATE INDEX providers_published_type_name_idx ON public.providers (primary_type, name, id)
  WHERE is_published AND status = 'active';
CREATE INDEX providers_canton_idx ON public.providers (country_code, canton_code);
CREATE INDEX providers_municipality_idx ON public.providers (municipality_id)
  WHERE municipality_id IS NOT NULL;
-- These unique indexes cover provider_id lookups and prevent duplicate coverage.
CREATE UNIQUE INDEX provider_service_areas_municipality_key
  ON public.provider_service_areas (provider_id, municipality_id)
  WHERE coverage_type = 'municipality';
CREATE UNIQUE INDEX provider_service_areas_canton_key
  ON public.provider_service_areas (provider_id, country_code, canton_code)
  WHERE coverage_type = 'canton';
CREATE INDEX provider_service_areas_provider_idx ON public.provider_service_areas (provider_id);
-- Reverse discovery: which providers cover the requested municipality/canton?
CREATE INDEX provider_service_areas_municipality_provider_idx
  ON public.provider_service_areas (municipality_id, provider_id)
  WHERE coverage_type = 'municipality';
CREATE INDEX provider_service_areas_canton_provider_idx
  ON public.provider_service_areas (country_code, canton_code, provider_id)
  WHERE coverage_type = 'canton';

CREATE FUNCTION public.set_provider_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER providers_set_updated_at BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.set_provider_updated_at();
REVOKE ALL ON FUNCTION public.set_provider_updated_at() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_sources ENABLE ROW LEVEL SECURITY;

-- Remove project-dependent default grants on these four NEW tables only.
REVOKE ALL ON TABLE public.providers, public.municipalities,
  public.provider_service_areas, public.provider_sources FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.providers, public.municipalities,
  public.provider_service_areas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.providers, public.municipalities,
  public.provider_service_areas, public.provider_sources TO service_role;

CREATE POLICY providers_public_read ON public.providers FOR SELECT TO anon, authenticated
  USING (is_published AND status = 'active');
-- Canonical geographic reference data only, never private address-book records.
CREATE POLICY municipalities_public_read ON public.municipalities FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY provider_service_areas_public_read ON public.provider_service_areas
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.providers p
      WHERE p.id = provider_service_areas.provider_id AND p.is_published AND p.status = 'active')
  );
-- provider_sources intentionally has NO public grant/policy: notes, internal URLs
-- and external identifiers need a separately curated public projection in a later phase.
-- No INSERT/UPDATE/DELETE policies are supplied for either client role.

COMMIT;
