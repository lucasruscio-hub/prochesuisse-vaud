-- Phase 5F: minimum identity and regulatory foundation for home-care resolution.
-- Schema only: no provider, organization, offering, relationship, or evidence rows are created.
BEGIN;

-- Organization facts need their own private provenance. They must not borrow an
-- arbitrary provider's source simply because a provider relationship may exist.
CREATE TABLE public.organization_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('public', 'provider', 'lia', 'legacy')),
  source_name text NOT NULL CHECK (btrim(source_name) <> ''),
  source_url text,
  external_record_id text,
  accessed_on date,
  retrieved_at timestamptz,
  reviewed_at timestamptz,
  fields_supported text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_sources_organization_id_id_key UNIQUE (organization_id, id)
);

-- Canonical current names stay on providers/organizations. These sourced rows
-- preserve the evidence for public, legal, trading, and historical identities.
CREATE TABLE public.provider_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (btrim(name) <> ''),
  name_type text NOT NULL CHECK (name_type IN (
    'current_public', 'legal', 'trading', 'historical'
  )),
  valid_from date,
  valid_to date,
  source_id uuid NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_names_validity CHECK (
    valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from
  ),
  CONSTRAINT provider_names_own_source FOREIGN KEY (provider_id, source_id)
    REFERENCES public.provider_sources(provider_id, id) ON DELETE NO ACTION
);

CREATE TABLE public.organization_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (btrim(name) <> ''),
  name_type text NOT NULL CHECK (name_type IN (
    'current_public', 'legal', 'trading', 'historical'
  )),
  valid_from date,
  valid_to date,
  source_id uuid NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_names_validity CHECK (
    valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from
  ),
  CONSTRAINT organization_names_own_source FOREIGN KEY (organization_id, source_id)
    REFERENCES public.organization_sources(organization_id, id) ON DELETE NO ACTION
);

-- A name change does not imply a new provider. Use a link only when evidence
-- establishes succession, duplication, or a split between provider identities.
CREATE TABLE public.provider_identity_links (
  predecessor_provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  successor_provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN (
    'successor', 'duplicate_of', 'split_into'
  )),
  evidence_provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  source_id uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (predecessor_provider_id, successor_provider_id, relationship_type),
  CONSTRAINT provider_identity_links_distinct CHECK (
    predecessor_provider_id <> successor_provider_id
  ),
  CONSTRAINT provider_identity_links_evidence_party CHECK (
    evidence_provider_id IN (predecessor_provider_id, successor_provider_id)
  ),
  CONSTRAINT provider_identity_links_own_source FOREIGN KEY (evidence_provider_id, source_id)
    REFERENCES public.provider_sources(provider_id, id) ON DELETE NO ACTION
);

-- Networks are not owners. This represents organization hierarchy separately
-- from a provider's sourced operator/owner/brand/network relationship.
CREATE TABLE public.organization_relationships (
  parent_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('network_member')),
  evidence_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_organization_id, member_organization_id, relationship_type),
  CONSTRAINT organization_relationships_distinct CHECK (
    parent_organization_id <> member_organization_id
  ),
  CONSTRAINT organization_relationships_evidence_party CHECK (
    evidence_organization_id IN (parent_organization_id, member_organization_id)
  ),
  CONSTRAINT organization_relationships_own_source
    FOREIGN KEY (evidence_organization_id, source_id)
    REFERENCES public.organization_sources(organization_id, id) ON DELETE NO ACTION
);

ALTER TABLE public.provider_organizations
  DROP CONSTRAINT provider_organizations_relationship_type_check;
ALTER TABLE public.provider_organizations
  ADD CONSTRAINT provider_organizations_relationship_type_check
  CHECK (relationship_type IN ('operator', 'owner', 'brand', 'network'));

ALTER TABLE public.care_offerings
  DROP CONSTRAINT care_offerings_offering_type_check;
ALTER TABLE public.care_offerings
  ADD CONSTRAINT care_offerings_offering_type_check CHECK (offering_type IN (
    'ems', 'home_care', 'home_support', 'senior_residence', 'medicalized_care_unit'
  ));

-- Regulatory designations are positive, sourced observations. Nullable dates,
-- status, issuer, and jurisdiction preserve unknowns and prevent timeless claims.
CREATE TABLE public.care_offering_regulatory_designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  offering_id uuid NOT NULL,
  designation_type text NOT NULL CHECK (designation_type IN ('authorization', 'classification')),
  scheme text NOT NULL CHECK (scheme ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  designation_code text CHECK (
    designation_code IS NULL OR designation_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
  ),
  designation_label text NOT NULL CHECK (btrim(designation_label) <> ''),
  jurisdiction_country_code text CHECK (jurisdiction_country_code ~ '^[A-Z]{2}$'),
  jurisdiction_code text CHECK (jurisdiction_code IS NULL OR btrim(jurisdiction_code) <> ''),
  issuing_organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT,
  designation_status text CHECK (designation_status IN (
    'current', 'historical', 'superseded', 'revoked'
  )),
  effective_on date,
  expires_on date,
  observed_on date,
  source_id uuid NOT NULL,
  notes text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_offering_regulatory_designations_validity CHECK (
    effective_on IS NULL OR expires_on IS NULL OR expires_on >= effective_on
  ),
  CONSTRAINT care_offering_regulatory_designations_own_offering
    FOREIGN KEY (provider_id, offering_id)
    REFERENCES public.care_offerings(provider_id, id) ON DELETE CASCADE,
  CONSTRAINT care_offering_regulatory_designations_own_source
    FOREIGN KEY (provider_id, source_id)
    REFERENCES public.provider_sources(provider_id, id) ON DELETE NO ACTION
);

CREATE INDEX organization_sources_organization_idx
  ON public.organization_sources (organization_id, source_type);
CREATE UNIQUE INDEX provider_names_normalized_key
  ON public.provider_names (provider_id, lower(btrim(name)), name_type);
CREATE UNIQUE INDEX provider_names_current_public_key
  ON public.provider_names (provider_id) WHERE name_type = 'current_public';
CREATE INDEX provider_names_provider_idx ON public.provider_names (provider_id, name_type);
CREATE UNIQUE INDEX organization_names_normalized_key
  ON public.organization_names (organization_id, lower(btrim(name)), name_type);
CREATE UNIQUE INDEX organization_names_current_public_key
  ON public.organization_names (organization_id) WHERE name_type = 'current_public';
CREATE INDEX organization_names_organization_idx
  ON public.organization_names (organization_id, name_type);
CREATE INDEX provider_identity_links_successor_idx
  ON public.provider_identity_links (successor_provider_id, predecessor_provider_id);
CREATE INDEX organization_relationships_member_idx
  ON public.organization_relationships (member_organization_id, parent_organization_id);
CREATE INDEX care_offering_regulatory_designations_offering_idx
  ON public.care_offering_regulatory_designations (provider_id, offering_id);
CREATE INDEX care_offering_regulatory_designations_scheme_idx
  ON public.care_offering_regulatory_designations (scheme, designation_code, observed_on DESC);

ALTER TABLE public.organization_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_offering_regulatory_designations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organization_sources, public.provider_names,
  public.organization_names, public.provider_identity_links,
  public.organization_relationships, public.care_offering_regulatory_designations
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.provider_names, public.organization_names,
  public.organization_relationships, public.care_offering_regulatory_designations
  TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_sources,
  public.provider_names, public.organization_names, public.provider_identity_links,
  public.organization_relationships, public.care_offering_regulatory_designations
  TO service_role;

CREATE POLICY provider_names_public_read ON public.provider_names
  FOR SELECT TO anon, authenticated USING (is_published AND EXISTS (
    SELECT 1 FROM public.providers p WHERE p.id = provider_names.provider_id
      AND p.is_published AND p.status = 'active'
  ));
CREATE POLICY organization_names_public_read ON public.organization_names
  FOR SELECT TO anon, authenticated USING (is_published AND EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = organization_names.organization_id
      AND o.is_published AND o.status = 'active'
  ));
CREATE POLICY organization_relationships_public_read ON public.organization_relationships
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations o
      WHERE o.id = organization_relationships.parent_organization_id
        AND o.is_published AND o.status = 'active')
    AND EXISTS (SELECT 1 FROM public.organizations o
      WHERE o.id = organization_relationships.member_organization_id
        AND o.is_published AND o.status = 'active')
  );
CREATE POLICY care_offering_regulatory_designations_public_read
  ON public.care_offering_regulatory_designations
  FOR SELECT TO anon, authenticated USING (is_published AND EXISTS (
    SELECT 1 FROM public.care_offerings o JOIN public.providers p ON p.id = o.provider_id
    WHERE o.id = care_offering_regulatory_designations.offering_id
      AND o.provider_id = care_offering_regulatory_designations.provider_id
      AND o.is_published AND o.status = 'active'
      AND p.is_published AND p.status = 'active'
  ));
-- organization_sources and provider_identity_links are deliberately private.

COMMENT ON TABLE public.organization_sources IS
  'Private evidence for organization facts, independent of any provider.';
COMMENT ON TABLE public.provider_identity_links IS
  'Evidence-backed provider succession/deduplication/split links; never automatic fact inheritance.';
COMMENT ON COLUMN public.care_offering_regulatory_designations.observed_on IS
  'Date on which the source supports this designation; NULL means unknown.';

COMMIT;
