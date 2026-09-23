-- Phase 4A: minimum relational care-information model.
-- Schema only: no provider data, publication, verification, or Google identifiers.
BEGIN;

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (btrim(name) <> ''),
  legal_name text CHECK (legal_name IS NULL OR btrim(legal_name) <> ''),
  website text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'partially_verified', 'verified', 'stale')),
  is_published boolean NOT NULL DEFAULT false,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.provider_organizations (
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('operator', 'owner', 'brand')),
  is_primary boolean NOT NULL DEFAULT false,
  source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, organization_id, relationship_type),
  CONSTRAINT provider_organizations_own_source FOREIGN KEY (provider_id, source_id)
    REFERENCES public.provider_sources(provider_id, id) ON DELETE NO ACTION
);

CREATE TABLE public.care_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (btrim(name) <> ''),
  offering_type text NOT NULL CHECK (offering_type IN (
    'ems', 'home_care', 'senior_residence', 'medicalized_care_unit'
  )),
  summary text,
  capacity_value integer CHECK (capacity_value > 0),
  capacity_unit text CHECK (capacity_unit IN ('beds', 'places', 'apartments', 'units')),
  long_stay boolean,
  short_stay boolean,
  respite_stay boolean,
  admissions_notes text,
  financing_notes text,
  public_interest_status text CHECK (public_interest_status IN ('recognized', 'not_recognized')),
  pricing_notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'partially_verified', 'verified', 'stale')),
  is_published boolean NOT NULL DEFAULT false,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_offerings_capacity_pair CHECK ((capacity_value IS NULL) = (capacity_unit IS NULL)),
  CONSTRAINT care_offerings_provider_slug_key UNIQUE (provider_id, slug),
  CONSTRAINT care_offerings_provider_id_id_key UNIQUE (provider_id, id)
);

-- Positive, sourced facts only. Missing rows remain unknown rather than false.
CREATE TABLE public.care_offering_features (
  provider_id uuid NOT NULL,
  offering_id uuid NOT NULL,
  feature_kind text NOT NULL CHECK (feature_kind IN ('care_profile', 'service', 'facility')),
  feature_code text NOT NULL CHECK (feature_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (btrim(display_name) <> ''),
  details text,
  source_id uuid NOT NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (offering_id, feature_kind, feature_code),
  CONSTRAINT care_offering_features_own_offering FOREIGN KEY (provider_id, offering_id)
    REFERENCES public.care_offerings(provider_id, id) ON DELETE CASCADE,
  CONSTRAINT care_offering_features_own_source FOREIGN KEY (provider_id, source_id)
    REFERENCES public.provider_sources(provider_id, id) ON DELETE NO ACTION
);

-- Private source-to-field linkage for offering columns and reviewed summaries.
CREATE TABLE public.care_offering_sources (
  provider_id uuid NOT NULL,
  offering_id uuid NOT NULL,
  source_id uuid NOT NULL,
  fields_supported text[] NOT NULL DEFAULT '{}',
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (offering_id, source_id),
  CONSTRAINT care_offering_sources_own_offering FOREIGN KEY (provider_id, offering_id)
    REFERENCES public.care_offerings(provider_id, id) ON DELETE CASCADE,
  CONSTRAINT care_offering_sources_own_source FOREIGN KEY (provider_id, source_id)
    REFERENCES public.provider_sources(provider_id, id) ON DELETE NO ACTION
);

CREATE TABLE public.care_offering_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  offering_id uuid NOT NULL,
  availability_status text NOT NULL CHECK (availability_status IN (
    'available', 'limited', 'waitlist', 'unavailable'
  )),
  observed_at timestamptz NOT NULL,
  source_id uuid NOT NULL,
  notes text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_offering_availability_own_offering FOREIGN KEY (provider_id, offering_id)
    REFERENCES public.care_offerings(provider_id, id) ON DELETE CASCADE,
  CONSTRAINT care_offering_availability_own_source FOREIGN KEY (provider_id, source_id)
    REFERENCES public.provider_sources(provider_id, id) ON DELETE NO ACTION
);

CREATE UNIQUE INDEX provider_organizations_primary_operator_key
  ON public.provider_organizations (provider_id)
  WHERE relationship_type = 'operator' AND is_primary;
CREATE INDEX provider_organizations_organization_idx
  ON public.provider_organizations (organization_id, provider_id);
CREATE INDEX care_offerings_provider_idx ON public.care_offerings (provider_id, offering_type);
CREATE INDEX care_offerings_public_idx ON public.care_offerings (offering_type, name, id)
  WHERE is_published AND status = 'active';
CREATE INDEX care_offering_features_provider_idx
  ON public.care_offering_features (provider_id, offering_id);
CREATE INDEX care_offering_features_discovery_idx
  ON public.care_offering_features (feature_kind, feature_code, offering_id);
CREATE INDEX care_offering_sources_provider_idx
  ON public.care_offering_sources (provider_id, offering_id);
CREATE INDEX care_offering_availability_latest_idx
  ON public.care_offering_availability (offering_id, observed_at DESC);

CREATE FUNCTION public.set_care_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER organizations_set_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_care_updated_at();
CREATE TRIGGER care_offerings_set_updated_at BEFORE UPDATE ON public.care_offerings
  FOR EACH ROW EXECUTE FUNCTION public.set_care_updated_at();
REVOKE ALL ON FUNCTION public.set_care_updated_at() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_offering_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_offering_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_offering_availability ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organizations, public.provider_organizations,
  public.care_offerings, public.care_offering_features, public.care_offering_sources,
  public.care_offering_availability FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.organizations, public.provider_organizations,
  public.care_offerings, public.care_offering_features,
  public.care_offering_availability TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organizations,
  public.provider_organizations, public.care_offerings, public.care_offering_features,
  public.care_offering_sources, public.care_offering_availability TO service_role;

CREATE POLICY organizations_public_read ON public.organizations FOR SELECT TO anon, authenticated
  USING (is_published AND status = 'active');
CREATE POLICY provider_organizations_public_read ON public.provider_organizations
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.providers p
      WHERE p.id = provider_organizations.provider_id AND p.is_published AND p.status = 'active')
    AND EXISTS (SELECT 1 FROM public.organizations o
      WHERE o.id = provider_organizations.organization_id AND o.is_published AND o.status = 'active')
  );
CREATE POLICY care_offerings_public_read ON public.care_offerings FOR SELECT TO anon, authenticated
  USING (is_published AND status = 'active' AND EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = care_offerings.provider_id AND p.is_published AND p.status = 'active'
  ));
CREATE POLICY care_offering_features_public_read ON public.care_offering_features
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.care_offerings o JOIN public.providers p ON p.id = o.provider_id
    WHERE o.id = care_offering_features.offering_id
      AND o.provider_id = care_offering_features.provider_id
      AND o.is_published AND o.status = 'active' AND p.is_published AND p.status = 'active'
  ));
CREATE POLICY care_offering_availability_public_read ON public.care_offering_availability
  FOR SELECT TO anon, authenticated USING (is_published AND EXISTS (
    SELECT 1 FROM public.care_offerings o JOIN public.providers p ON p.id = o.provider_id
    WHERE o.id = care_offering_availability.offering_id
      AND o.provider_id = care_offering_availability.provider_id
      AND o.is_published AND o.status = 'active' AND p.is_published AND p.status = 'active'
  ));
-- care_offering_sources intentionally has no anon/authenticated grant or policy.

COMMIT;
