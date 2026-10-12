-- Lia Inquiry Foundation V1. Schema only: no inquiry/customer rows and no provider-domain changes.
BEGIN;

CREATE FUNCTION public.inquiry_text_array_is_unique(input_values text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = pg_catalog
AS $$
  SELECT cardinality($1) = (SELECT count(DISTINCT value) FROM unnest($1) AS value)
$$;

CREATE TABLE public.inquiry_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  preferred_contact_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  anonymized_at timestamptz,
  CONSTRAINT inquiry_contacts_identity_state_check CHECK (
    (anonymized_at IS NULL
      AND first_name IS NOT NULL AND last_name IS NOT NULL
      AND email IS NOT NULL AND preferred_contact_method IS NOT NULL)
    OR
    (anonymized_at IS NOT NULL
      AND first_name IS NULL AND last_name IS NULL AND email IS NULL
      AND phone IS NULL AND preferred_contact_method IS NULL)
  ),
  CONSTRAINT inquiry_contacts_first_name_check CHECK (
    first_name IS NULL OR (first_name = btrim(first_name) AND char_length(first_name) BETWEEN 1 AND 100)
  ),
  CONSTRAINT inquiry_contacts_last_name_check CHECK (
    last_name IS NULL OR (last_name = btrim(last_name) AND char_length(last_name) BETWEEN 1 AND 100)
  ),
  CONSTRAINT inquiry_contacts_email_check CHECK (
    email IS NULL OR (
      email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 320
      AND email !~ '[[:space:]]' AND position('@' IN email) > 1
      AND position('@' IN email) < char_length(email)
    )
  ),
  CONSTRAINT inquiry_contacts_phone_check CHECK (
    phone IS NULL OR phone ~ '^\+[1-9][0-9]{6,14}$'
  ),
  CONSTRAINT inquiry_contacts_preferred_method_check CHECK (
    preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'phone', 'either')
  ),
  CONSTRAINT inquiry_contacts_phone_preference_check CHECK (
    preferred_contact_method IS NULL OR preferred_contact_method = 'email' OR phone IS NOT NULL
  ),
  CONSTRAINT inquiry_contacts_anonymized_time_check CHECK (
    anonymized_at IS NULL OR anonymized_at >= created_at
  )
);

CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_contact_id uuid NOT NULL REFERENCES public.inquiry_contacts(id) ON DELETE RESTRICT,
  care_type_code text NOT NULL,
  beneficiary_relation_code text NOT NULL,
  timing_code text NOT NULL,
  need_codes text[] NOT NULL DEFAULT '{}',
  location_text text NOT NULL,
  postal_code text,
  municipality_id uuid REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  context_summary text,
  workflow_status text NOT NULL DEFAULT 'new',
  closure_outcome_code text,
  source_channel text NOT NULL,
  source_detail text,
  landing_page text,
  contact_permission_at timestamptz NOT NULL,
  contact_permission_withdrawn_at timestamptz,
  privacy_notice_version text NOT NULL,
  privacy_acknowledged_at timestamptz NOT NULL,
  provider_sharing_permission_status text NOT NULL DEFAULT 'not_recorded',
  provider_sharing_permission_at timestamptz,
  provider_sharing_permission_withdrawn_at timestamptz,
  intake_idempotency_key uuid,
  legacy_lead_id text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  retention_due_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inquiries_care_type_check CHECK (care_type_code IN (
    'ems', 'home_care', 'home_support', 'senior_residence', 'respite', 'unsure'
  )),
  CONSTRAINT inquiries_beneficiary_relation_check CHECK (beneficiary_relation_code IN (
    'self', 'parent', 'partner', 'relative', 'friend', 'other', 'unspecified'
  )),
  CONSTRAINT inquiries_timing_check CHECK (timing_code IN (
    'within_7_days', 'within_1_month', 'within_3_months', 'planning', 'information_only'
  )),
  CONSTRAINT inquiries_need_codes_check CHECK (
    cardinality(need_codes) <= 12
    AND array_position(need_codes, NULL) IS NULL
    AND need_codes <@ ARRAY[
      'personal_care', 'meals', 'medication_support', 'household_support',
      'companionship', 'transport', 'mobility_support', 'regular_presence',
      'night_support', 'nursing_care', 'cognitive_support', 'unsure'
    ]::text[]
    AND public.inquiry_text_array_is_unique(need_codes)
  ),
  CONSTRAINT inquiries_location_check CHECK (
    location_text = btrim(location_text) AND char_length(location_text) BETWEEN 2 AND 160
  ),
  CONSTRAINT inquiries_postal_code_check CHECK (
    postal_code IS NULL OR postal_code ~ '^[0-9]{4}$'
  ),
  CONSTRAINT inquiries_context_summary_check CHECK (
    context_summary IS NULL OR (
      context_summary = btrim(context_summary) AND char_length(context_summary) BETWEEN 1 AND 1000
    )
  ),
  CONSTRAINT inquiries_workflow_status_check CHECK (
    workflow_status IN ('new', 'reviewing', 'qualified', 'matching', 'closed')
  ),
  CONSTRAINT inquiries_closure_outcome_check CHECK (
    closure_outcome_code IS NULL OR closure_outcome_code IN (
      'care_started', 'admission_or_placement', 'other_success', 'resolved_without_referral',
      'family_withdrew', 'unreachable', 'duplicate', 'out_of_scope',
      'no_solution_found', 'other'
    )
  ),
  CONSTRAINT inquiries_closure_state_check CHECK (
    (workflow_status = 'closed' AND closed_at IS NOT NULL AND closure_outcome_code IS NOT NULL)
    OR
    (workflow_status <> 'closed' AND closed_at IS NULL AND closure_outcome_code IS NULL)
  ),
  CONSTRAINT inquiries_source_channel_check CHECK (
    source_channel IN ('homepage', 'manual', 'partner', 'import', 'other')
  ),
  CONSTRAINT inquiries_source_detail_check CHECK (
    source_detail IS NULL OR (
      source_detail = btrim(source_detail) AND char_length(source_detail) BETWEEN 1 AND 200
    )
  ),
  CONSTRAINT inquiries_landing_page_check CHECK (
    landing_page IS NULL OR (
      char_length(landing_page) BETWEEN 1 AND 500 AND landing_page LIKE '/%'
      AND landing_page !~ '^[a-zA-Z][a-zA-Z0-9+.-]*://'
      AND position('?' IN landing_page) = 0
    )
  ),
  CONSTRAINT inquiries_contact_permission_check CHECK (
    contact_permission_withdrawn_at IS NULL
    OR contact_permission_withdrawn_at >= contact_permission_at
  ),
  CONSTRAINT inquiries_privacy_notice_check CHECK (
    privacy_notice_version = btrim(privacy_notice_version)
    AND char_length(privacy_notice_version) BETWEEN 1 AND 80
    AND privacy_acknowledged_at = submitted_at
  ),
  CONSTRAINT inquiries_provider_sharing_permission_check CHECK (
    (provider_sharing_permission_status = 'not_recorded'
      AND provider_sharing_permission_at IS NULL
      AND provider_sharing_permission_withdrawn_at IS NULL)
    OR
    (provider_sharing_permission_status = 'granted'
      AND provider_sharing_permission_at IS NOT NULL
      AND provider_sharing_permission_withdrawn_at IS NULL)
    OR
    (provider_sharing_permission_status = 'withdrawn'
      AND provider_sharing_permission_at IS NOT NULL
      AND provider_sharing_permission_withdrawn_at IS NOT NULL
      AND provider_sharing_permission_withdrawn_at >= provider_sharing_permission_at)
  ),
  CONSTRAINT inquiries_activity_time_check CHECK (last_activity_at >= created_at),
  CONSTRAINT inquiries_retention_time_check CHECK (
    retention_due_at IS NULL OR retention_due_at >= created_at
  ),
  CONSTRAINT inquiries_anonymization_check CHECK (
    anonymized_at IS NULL OR (context_summary IS NULL AND source_detail IS NULL)
  ),
  CONSTRAINT inquiries_anonymized_time_check CHECK (
    anonymized_at IS NULL OR anonymized_at >= created_at
  ),
  CONSTRAINT inquiries_legacy_lead_id_check CHECK (
    legacy_lead_id IS NULL OR (
      legacy_lead_id = btrim(legacy_lead_id) AND char_length(legacy_lead_id) BETWEEN 1 AND 200
    )
  )
);

CREATE UNIQUE INDEX inquiries_intake_idempotency_key
  ON public.inquiries (intake_idempotency_key) WHERE intake_idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX inquiries_legacy_lead_id_key
  ON public.inquiries (legacy_lead_id) WHERE legacy_lead_id IS NOT NULL;
CREATE INDEX inquiries_workflow_queue_idx
  ON public.inquiries (workflow_status, created_at, id);
CREATE INDEX inquiries_contact_history_idx
  ON public.inquiries (primary_contact_id, created_at DESC, id);
CREATE INDEX inquiries_municipality_workflow_idx
  ON public.inquiries (municipality_id, workflow_status) WHERE municipality_id IS NOT NULL;
CREATE INDEX inquiries_retention_due_idx
  ON public.inquiries (retention_due_at, id)
  WHERE retention_due_at IS NOT NULL AND anonymized_at IS NULL;

CREATE TABLE public.inquiry_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE RESTRICT,
  recipient_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  provider_id uuid REFERENCES public.providers(id) ON DELETE RESTRICT,
  care_offering_id uuid,
  referral_status text NOT NULL DEFAULT 'shortlisted',
  outcome_code text,
  sharing_authorization_basis text,
  sharing_authorized_at timestamptz,
  sharing_authorization_withdrawn_at timestamptz,
  shared_at timestamptz,
  responded_at timestamptz,
  converted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inquiry_referrals_inquiry_id_id_key UNIQUE (inquiry_id, id),
  CONSTRAINT inquiry_referrals_own_offering FOREIGN KEY (provider_id, care_offering_id)
    REFERENCES public.care_offerings(provider_id, id) ON DELETE RESTRICT,
  CONSTRAINT inquiry_referrals_status_check CHECK (referral_status IN (
    'shortlisted', 'ready_to_share', 'shared', 'engaged', 'converted', 'closed'
  )),
  CONSTRAINT inquiry_referrals_outcome_check CHECK (
    outcome_code IS NULL OR outcome_code IN (
      'care_started', 'admission_or_placement', 'other_success', 'provider_declined',
      'family_declined', 'no_response', 'unavailable', 'unsuitable',
      'withdrawn', 'duplicate', 'other'
    )
  ),
  CONSTRAINT inquiry_referrals_provider_offering_pair_check CHECK (
    care_offering_id IS NULL OR provider_id IS NOT NULL
  ),
  CONSTRAINT inquiry_referrals_sharing_authorization_pair_check CHECK (
    (sharing_authorization_basis IS NULL
      AND sharing_authorized_at IS NULL
      AND sharing_authorization_withdrawn_at IS NULL)
    OR
    (sharing_authorization_basis IN ('general_permission', 'referral_specific_permission')
      AND sharing_authorized_at IS NOT NULL
      AND (sharing_authorization_withdrawn_at IS NULL
        OR sharing_authorization_withdrawn_at >= sharing_authorized_at))
  ),
  CONSTRAINT inquiry_referrals_shared_state_check CHECK (
    (referral_status IN ('shared', 'engaged', 'converted')
      AND sharing_authorization_basis IS NOT NULL
      AND sharing_authorized_at IS NOT NULL
      AND shared_at IS NOT NULL)
    OR
    (referral_status IN ('shortlisted', 'ready_to_share') AND shared_at IS NULL)
    OR
    (referral_status = 'closed' AND (
      shared_at IS NULL OR (
        sharing_authorization_basis IS NOT NULL AND sharing_authorized_at IS NOT NULL
      )
    ))
  ),
  CONSTRAINT inquiry_referrals_sharing_withdrawal_check CHECK (
    shared_at IS NULL OR sharing_authorization_withdrawn_at IS NULL
    OR sharing_authorization_withdrawn_at >= shared_at
  ),
  CONSTRAINT inquiry_referrals_response_check CHECK (
    (responded_at IS NULL OR shared_at IS NOT NULL)
    AND (referral_status NOT IN ('engaged', 'converted') OR responded_at IS NOT NULL)
  ),
  CONSTRAINT inquiry_referrals_converted_state_check CHECK (
    (referral_status = 'converted'
      AND converted_at IS NOT NULL AND closed_at IS NULL
      AND outcome_code IN ('care_started', 'admission_or_placement', 'other_success'))
    OR
    (referral_status <> 'converted' AND converted_at IS NULL)
  ),
  CONSTRAINT inquiry_referrals_closed_state_check CHECK (
    (referral_status = 'closed'
      AND closed_at IS NOT NULL AND converted_at IS NULL
      AND outcome_code IN (
        'provider_declined', 'family_declined', 'no_response', 'unavailable',
        'unsuitable', 'withdrawn', 'duplicate', 'other'
      ))
    OR
    (referral_status <> 'closed' AND closed_at IS NULL)
  ),
  CONSTRAINT inquiry_referrals_active_outcome_check CHECK (
    referral_status IN ('converted', 'closed') OR outcome_code IS NULL
  ),
  CONSTRAINT inquiry_referrals_milestone_order_check CHECK (
    (sharing_authorized_at IS NULL OR sharing_authorized_at >= created_at)
    AND (shared_at IS NULL OR shared_at >= sharing_authorized_at)
    AND (responded_at IS NULL OR responded_at >= shared_at)
    AND (converted_at IS NULL OR converted_at >= created_at)
    AND (closed_at IS NULL OR closed_at >= created_at)
  )
);

CREATE UNIQUE INDEX inquiry_referrals_active_organization_key
  ON public.inquiry_referrals (inquiry_id, recipient_organization_id)
  WHERE provider_id IS NULL AND referral_status NOT IN ('converted', 'closed');
CREATE UNIQUE INDEX inquiry_referrals_active_provider_key
  ON public.inquiry_referrals (inquiry_id, recipient_organization_id, provider_id)
  WHERE provider_id IS NOT NULL AND referral_status NOT IN ('converted', 'closed');
CREATE INDEX inquiry_referrals_inquiry_status_idx
  ON public.inquiry_referrals (inquiry_id, referral_status, created_at, id);
CREATE INDEX inquiry_referrals_recipient_status_idx
  ON public.inquiry_referrals (recipient_organization_id, referral_status, created_at, id);
CREATE INDEX inquiry_referrals_provider_status_idx
  ON public.inquiry_referrals (provider_id, referral_status, created_at)
  WHERE provider_id IS NOT NULL;
CREATE INDEX inquiry_referrals_shared_idx
  ON public.inquiry_referrals (shared_at, id) WHERE shared_at IS NOT NULL;

CREATE TABLE public.inquiry_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE RESTRICT,
  referral_id uuid,
  activity_type text NOT NULL,
  actor_type text NOT NULL,
  actor_label text NOT NULL,
  visibility_scope text NOT NULL DEFAULT 'lia_internal',
  from_status text,
  to_status text,
  note_text text,
  event_data jsonb NOT NULL DEFAULT '{}',
  related_activity_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inquiry_activities_inquiry_id_id_key UNIQUE (inquiry_id, id),
  CONSTRAINT inquiry_activities_own_referral FOREIGN KEY (inquiry_id, referral_id)
    REFERENCES public.inquiry_referrals(inquiry_id, id) ON DELETE RESTRICT,
  CONSTRAINT inquiry_activities_own_related_activity FOREIGN KEY (inquiry_id, related_activity_id)
    REFERENCES public.inquiry_activities(inquiry_id, id) ON DELETE RESTRICT,
  CONSTRAINT inquiry_activities_type_check CHECK (activity_type IN (
    'inquiry_created', 'inquiry_status_changed', 'contact_permission_changed',
    'provider_sharing_permission_changed', 'contact_attempted', 'note_added',
    'referral_created', 'referral_status_changed', 'referral_sharing_authorized',
    'referral_sharing_authorization_withdrawn', 'referral_shared',
    'provider_response_recorded', 'family_contact_recorded', 'visit_scheduled',
    'outcome_recorded', 'correction_recorded', 'retention_action_recorded'
  )),
  CONSTRAINT inquiry_activities_actor_type_check CHECK (actor_type IN ('system', 'lia_staff')),
  CONSTRAINT inquiry_activities_actor_label_check CHECK (
    actor_label = btrim(actor_label) AND char_length(actor_label) BETWEEN 1 AND 120
  ),
  CONSTRAINT inquiry_activities_visibility_check CHECK (visibility_scope = 'lia_internal'),
  CONSTRAINT inquiry_activities_status_pair_check CHECK (
    (activity_type = 'inquiry_status_changed'
      AND referral_id IS NULL
      AND from_status IN ('new', 'reviewing', 'qualified', 'matching', 'closed')
      AND to_status IN ('new', 'reviewing', 'qualified', 'matching', 'closed'))
    OR
    (activity_type = 'referral_status_changed'
      AND referral_id IS NOT NULL
      AND from_status IN ('shortlisted', 'ready_to_share', 'shared', 'engaged', 'converted', 'closed')
      AND to_status IN ('shortlisted', 'ready_to_share', 'shared', 'engaged', 'converted', 'closed'))
    OR
    (activity_type NOT IN ('inquiry_status_changed', 'referral_status_changed')
      AND from_status IS NULL AND to_status IS NULL)
  ),
  CONSTRAINT inquiry_activities_referral_scope_check CHECK (
    (activity_type IN (
      'referral_created', 'referral_status_changed', 'referral_sharing_authorized',
      'referral_sharing_authorization_withdrawn', 'referral_shared',
      'provider_response_recorded', 'family_contact_recorded', 'visit_scheduled'
    ) AND referral_id IS NOT NULL)
    OR
    (activity_type IN (
      'inquiry_created', 'inquiry_status_changed', 'contact_permission_changed',
      'provider_sharing_permission_changed', 'contact_attempted'
    ) AND referral_id IS NULL)
    OR
    activity_type IN ('note_added', 'outcome_recorded', 'correction_recorded', 'retention_action_recorded')
  ),
  CONSTRAINT inquiry_activities_note_check CHECK (
    (note_text IS NULL OR (
      note_text = btrim(note_text) AND char_length(note_text) BETWEEN 1 AND 1000
    ))
    AND (
      note_text IS NULL OR activity_type IN (
        'note_added', 'correction_recorded', 'provider_response_recorded',
        'family_contact_recorded', 'visit_scheduled'
      )
    )
  ),
  CONSTRAINT inquiry_activities_event_data_check CHECK (
    jsonb_typeof(event_data) = 'object' AND octet_length(event_data::text) <= 8192
  ),
  CONSTRAINT inquiry_activities_related_distinct_check CHECK (
    related_activity_id IS NULL OR related_activity_id <> id
  ),
  CONSTRAINT inquiry_activities_time_check CHECK (occurred_at <= created_at)
);

CREATE INDEX inquiry_activities_inquiry_timeline_idx
  ON public.inquiry_activities (inquiry_id, occurred_at DESC, id DESC);
CREATE INDEX inquiry_activities_referral_timeline_idx
  ON public.inquiry_activities (referral_id, occurred_at DESC, id DESC)
  WHERE referral_id IS NOT NULL;
CREATE INDEX inquiry_activities_type_time_idx
  ON public.inquiry_activities (activity_type, occurred_at DESC);

CREATE FUNCTION public.set_inquiry_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.validate_inquiry_referral_target()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = NEW.recipient_organization_id AND o.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Referral recipient organization must be active';
  END IF;

  IF NEW.provider_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.providers p WHERE p.id = NEW.provider_id AND p.status = 'active'
    ) THEN
      RAISE EXCEPTION 'Referral provider must be active';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.provider_organizations po
      WHERE po.provider_id = NEW.provider_id
        AND po.organization_id = NEW.recipient_organization_id
        AND po.relationship_type IN ('operator', 'owner', 'brand')
    ) THEN
      RAISE EXCEPTION 'Referral provider requires an active operator, owner, or brand recipient relationship';
    END IF;
  END IF;

  IF NEW.care_offering_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.care_offerings co
    WHERE co.id = NEW.care_offering_id AND co.provider_id = NEW.provider_id
      AND co.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Referral offering must be active and belong to the selected provider';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.guard_inquiry_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.workflow_status IS DISTINCT FROM NEW.workflow_status AND NOT (
    (OLD.workflow_status = 'new' AND NEW.workflow_status IN ('reviewing', 'closed'))
    OR (OLD.workflow_status = 'reviewing' AND NEW.workflow_status IN ('qualified', 'closed'))
    OR (OLD.workflow_status = 'qualified' AND NEW.workflow_status IN ('matching', 'closed'))
    OR (OLD.workflow_status = 'matching' AND NEW.workflow_status = 'closed')
  ) THEN
    RAISE EXCEPTION 'Invalid inquiry status transition: % -> %',
      OLD.workflow_status, NEW.workflow_status;
  END IF;

  IF OLD.workflow_status <> 'closed' AND NEW.workflow_status = 'closed' AND EXISTS (
    SELECT 1 FROM public.inquiry_referrals r
    WHERE r.inquiry_id = NEW.id
      AND r.referral_status IN ('shortlisted', 'ready_to_share', 'shared', 'engaged')
  ) THEN
    RAISE EXCEPTION 'Inquiry cannot close while an active referral remains';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.guard_inquiry_referral_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.referral_status IS DISTINCT FROM NEW.referral_status AND NOT (
    (OLD.referral_status = 'shortlisted' AND NEW.referral_status IN ('ready_to_share', 'closed'))
    OR (OLD.referral_status = 'ready_to_share' AND NEW.referral_status IN ('shared', 'closed'))
    OR (OLD.referral_status = 'shared' AND NEW.referral_status IN ('engaged', 'closed'))
    OR (OLD.referral_status = 'engaged' AND NEW.referral_status IN ('converted', 'closed'))
  ) THEN
    RAISE EXCEPTION 'Invalid referral status transition: % -> %',
      OLD.referral_status, NEW.referral_status;
  END IF;

  IF OLD.shared_at IS NOT NULL AND OLD.shared_at IS DISTINCT FROM NEW.shared_at THEN
    RAISE EXCEPTION 'Referral shared_at is immutable once set';
  END IF;
  IF OLD.sharing_authorized_at IS NOT NULL AND (
    OLD.sharing_authorized_at IS DISTINCT FROM NEW.sharing_authorized_at
    OR OLD.sharing_authorization_basis IS DISTINCT FROM NEW.sharing_authorization_basis
  ) THEN
    RAISE EXCEPTION 'Referral sharing authorization evidence is immutable once set';
  END IF;
  IF OLD.sharing_authorization_withdrawn_at IS NOT NULL
    AND OLD.sharing_authorization_withdrawn_at IS DISTINCT FROM NEW.sharing_authorization_withdrawn_at THEN
    RAISE EXCEPTION 'Referral sharing-authorization withdrawal is immutable once set';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.reject_inquiry_activity_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Inquiry activities are append-only';
END;
$$;

CREATE TRIGGER inquiry_contacts_set_updated_at
  BEFORE UPDATE ON public.inquiry_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_inquiry_updated_at();
CREATE TRIGGER inquiries_set_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_inquiry_updated_at();
CREATE TRIGGER inquiry_referrals_set_updated_at
  BEFORE UPDATE ON public.inquiry_referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_inquiry_updated_at();
CREATE TRIGGER inquiry_referrals_validate_target
  BEFORE INSERT OR UPDATE OF recipient_organization_id, provider_id, care_offering_id
  ON public.inquiry_referrals
  FOR EACH ROW EXECUTE FUNCTION public.validate_inquiry_referral_target();
CREATE TRIGGER inquiries_guard_status_transition
  BEFORE UPDATE OF workflow_status ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.guard_inquiry_status_transition();
CREATE TRIGGER inquiry_referrals_guard_transition
  BEFORE UPDATE OF referral_status, sharing_authorization_basis, sharing_authorized_at,
    sharing_authorization_withdrawn_at, shared_at
  ON public.inquiry_referrals
  FOR EACH ROW EXECUTE FUNCTION public.guard_inquiry_referral_transition();
CREATE TRIGGER inquiry_activities_append_only
  BEFORE UPDATE OR DELETE ON public.inquiry_activities
  FOR EACH ROW EXECUTE FUNCTION public.reject_inquiry_activity_mutation();

ALTER TABLE public.inquiry_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_activities ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.inquiry_contacts, public.inquiries,
  public.inquiry_referrals, public.inquiry_activities
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inquiry_contacts,
  public.inquiries, public.inquiry_referrals TO service_role;
GRANT SELECT, INSERT ON TABLE public.inquiry_activities TO service_role;

REVOKE ALL ON FUNCTION public.inquiry_text_array_is_unique(text[])
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inquiry_text_array_is_unique(text[]) TO service_role;
REVOKE ALL ON FUNCTION public.set_inquiry_updated_at()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_inquiry_referral_target()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.guard_inquiry_status_transition()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.guard_inquiry_referral_transition()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.reject_inquiry_activity_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE public.inquiry_contacts IS
  'Private direct contact identifiers; never directly exposed to provider organizations.';
COMMENT ON TABLE public.inquiries IS
  'Private family request and current Lia qualification state; not a clinical record.';
COMMENT ON TABLE public.inquiry_referrals IS
  'Independent organization-owned referral state; creation does not imply disclosure.';
COMMENT ON COLUMN public.inquiry_referrals.shared_at IS
  'First actual authorized disclosure time; NULL means no disclosure is recorded.';
COMMENT ON TABLE public.inquiry_activities IS
  'Private append-only operational history; current state remains on inquiry/referral rows.';
COMMENT ON COLUMN public.inquiries.retention_due_at IS
  'Policy-calculated disposition date; this schema deliberately encodes no retention duration.';

COMMIT;
