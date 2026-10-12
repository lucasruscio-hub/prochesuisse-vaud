-- Runtime constraint/security proof. Every fixture is rolled back.
BEGIN;
SET LOCAL search_path = pg_catalog, public;

DO $test$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_contact uuid;
  v_inquiry_one uuid;
  v_inquiry_two uuid;
  v_org uuid;
  v_provider uuid;
  v_offering uuid;
  v_other_offering uuid;
  v_provider_source uuid;
  v_network_org uuid;
  v_legacy_residence uuid;
  v_org_referral uuid;
  v_provider_referral uuid;
  v_conversion_referral uuid;
  v_activity uuid;
BEGIN
  IF (SELECT count(*) FROM public.providers) <> 141
    OR (SELECT count(*) FROM public.organizations) <> 64
    OR (SELECT count(*) FROM public.care_offerings) <> 111
    OR (SELECT count(*) FROM public.care_offering_features) <> 84
    OR (SELECT count(*) FROM public.provider_service_areas) <> 4
    OR (SELECT count(*) FROM public.care_offering_availability) <> 0 THEN
    RAISE EXCEPTION 'Provider-domain baseline changed';
  END IF;

  IF (SELECT count(*) FROM public.providers
      WHERE slug LIKE 'cms-%' AND primary_type = 'domicile') <> 50 THEN
    RAISE EXCEPTION '50 CMS baseline changed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.inquiry_contacts
    UNION ALL SELECT 1 FROM public.inquiries
    UNION ALL SELECT 1 FROM public.inquiry_referrals
    UNION ALL SELECT 1 FROM public.inquiry_activities
  ) THEN
    RAISE EXCEPTION 'Inquiry Foundation must begin empty';
  END IF;

  IF (SELECT count(*) FROM pg_class
      WHERE oid IN ('public.inquiry_contacts'::regclass, 'public.inquiries'::regclass,
        'public.inquiry_referrals'::regclass, 'public.inquiry_activities'::regclass)
        AND relkind = 'r' AND relrowsecurity) <> 4 THEN
    RAISE EXCEPTION 'All four inquiry tables must have RLS enabled';
  END IF;

  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('anon'::name), ('authenticated'::name)
    ) AS roles(role_name)
    CROSS JOIN (VALUES
      ('public.inquiry_contacts'::text), ('public.inquiries'),
      ('public.inquiry_referrals'), ('public.inquiry_activities')
    ) AS tables(table_name)
    WHERE has_table_privilege(role_name, table_name, 'SELECT')
      OR has_table_privilege(role_name, table_name, 'INSERT')
      OR has_table_privilege(role_name, table_name, 'UPDATE')
      OR has_table_privilege(role_name, table_name, 'DELETE')
  ) THEN
    RAISE EXCEPTION 'anon/authenticated received ordinary inquiry-table privileges';
  END IF;

  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('public.inquiry_contacts'::text), ('public.inquiries'),
      ('public.inquiry_referrals')
    ) AS tables(table_name)
    WHERE NOT has_table_privilege('service_role', table_name, 'SELECT')
      OR NOT has_table_privilege('service_role', table_name, 'INSERT')
      OR NOT has_table_privilege('service_role', table_name, 'UPDATE')
      OR NOT has_table_privilege('service_role', table_name, 'DELETE')
      OR has_table_privilege('service_role', table_name, 'TRUNCATE')
      OR has_table_privilege('service_role', table_name, 'REFERENCES')
      OR has_table_privilege('service_role', table_name, 'TRIGGER')
  ) THEN
    RAISE EXCEPTION 'service_role inquiry CRUD grants are not least-privilege';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.inquiry_activities', 'SELECT')
    OR NOT has_table_privilege('service_role', 'public.inquiry_activities', 'INSERT')
    OR has_table_privilege('service_role', 'public.inquiry_activities', 'UPDATE')
    OR has_table_privilege('service_role', 'public.inquiry_activities', 'DELETE')
    OR has_table_privilege('service_role', 'public.inquiry_activities', 'TRUNCATE')
    OR has_table_privilege('service_role', 'public.inquiry_activities', 'REFERENCES')
    OR has_table_privilege('service_role', 'public.inquiry_activities', 'TRIGGER') THEN
    RAISE EXCEPTION 'service_role activity grants are not append-only/least-privilege';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('inquiry_contacts', 'inquiries', 'inquiry_referrals', 'inquiry_activities')
  ) THEN
    RAISE EXCEPTION 'V1 inquiry tables must not have client policies';
  END IF;

  SELECT p.id, po.organization_id, co.id
    INTO v_provider, v_org, v_offering
  FROM public.providers p
  JOIN public.provider_organizations po ON po.provider_id = p.id
    AND po.relationship_type IN ('operator', 'owner', 'brand')
  JOIN public.organizations o ON o.id = po.organization_id AND o.status = 'active'
  JOIN public.care_offerings co ON co.provider_id = p.id AND co.status = 'active'
  WHERE p.status = 'active'
  ORDER BY p.slug, co.slug
  LIMIT 1;

  SELECT co.id INTO v_other_offering
  FROM public.care_offerings co
  WHERE co.provider_id <> v_provider AND co.status = 'active'
  ORDER BY co.id
  LIMIT 1;

  SELECT ps.id INTO v_provider_source
  FROM public.provider_sources ps WHERE ps.provider_id = v_provider
  ORDER BY ps.id LIMIT 1;

  SELECT p.id INTO v_legacy_residence
  FROM public.providers p
  WHERE p.primary_type = 'residence'
    AND NOT EXISTS (SELECT 1 FROM public.provider_organizations po WHERE po.provider_id = p.id)
  ORDER BY p.slug LIMIT 1;

  IF v_provider IS NULL OR v_org IS NULL OR v_offering IS NULL
    OR v_other_offering IS NULL OR v_provider_source IS NULL OR v_legacy_residence IS NULL THEN
    RAISE EXCEPTION 'Required provider-domain fixtures are unavailable';
  END IF;

  INSERT INTO public.organizations (slug, name, status, verification_status, is_published)
  VALUES ('inquiry-foundation-network-fixture', 'Inquiry Foundation network fixture',
    'active', 'unverified', false)
  RETURNING id INTO v_network_org;

  INSERT INTO public.provider_organizations (
    provider_id, organization_id, relationship_type, is_primary, source_id
  ) VALUES (v_provider, v_network_org, 'network', false, v_provider_source);

  INSERT INTO public.inquiry_contacts (
    first_name, last_name, email, phone, preferred_contact_method
  ) VALUES ('Test', 'Family', 'test-family@example.test', '+41790000000', 'either')
  RETURNING id INTO v_contact;

  INSERT INTO public.inquiries (
    primary_contact_id, care_type_code, beneficiary_relation_code, timing_code,
    need_codes, location_text, postal_code, workflow_status, source_channel,
    contact_permission_at, privacy_notice_version, privacy_acknowledged_at,
    submitted_at, last_activity_at, created_at
  ) VALUES (
    v_contact, 'home_care', 'parent', 'within_1_month',
    ARRAY['personal_care', 'nursing_care'], 'Lausanne', '1000', 'new', 'manual',
    v_now, 'test-v1', v_now, v_now, v_now, v_now
  ) RETURNING id INTO v_inquiry_one;

  INSERT INTO public.inquiries (
    primary_contact_id, care_type_code, beneficiary_relation_code, timing_code,
    location_text, workflow_status, source_channel, contact_permission_at,
    privacy_notice_version, privacy_acknowledged_at, submitted_at, last_activity_at, created_at
  ) VALUES (
    v_contact, 'ems', 'parent', 'planning', 'Morges', 'new', 'manual',
    v_now, 'test-v1', v_now, v_now, v_now, v_now
  ) RETURNING id INTO v_inquiry_two;

  IF (SELECT count(*) FROM public.inquiries WHERE primary_contact_id = v_contact) <> 2 THEN
    RAISE EXCEPTION 'One contact could not own multiple inquiries';
  END IF;

  INSERT INTO public.inquiry_activities (
    inquiry_id, activity_type, actor_type, actor_label, occurred_at, created_at
  ) VALUES (v_inquiry_one, 'inquiry_created', 'system', 'foundation_test', v_now, v_now)
  RETURNING id INTO v_activity;

  INSERT INTO public.inquiry_referrals (inquiry_id, recipient_organization_id)
  VALUES (v_inquiry_one, v_org)
  RETURNING id INTO v_org_referral;

  INSERT INTO public.inquiry_referrals (
    inquiry_id, recipient_organization_id, provider_id, care_offering_id
  ) VALUES (v_inquiry_one, v_org, v_provider, v_offering)
  RETURNING id INTO v_provider_referral;

  IF (SELECT count(*) FROM public.inquiry_referrals WHERE inquiry_id = v_inquiry_one) <> 2 THEN
    RAISE EXCEPTION 'One inquiry could not own multiple independent referrals';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.inquiry_referrals
    WHERE id IN (v_org_referral, v_provider_referral)
      AND (referral_status <> 'shortlisted' OR shared_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Referral creation implicitly shared family data';
  END IF;

  BEGIN
    INSERT INTO public.inquiry_referrals (inquiry_id, recipient_organization_id, provider_id)
    VALUES (v_inquiry_two, v_network_org, v_provider);
    RAISE EXCEPTION 'Network-only provider relationship was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Network-only provider relationship was accepted' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.inquiry_referrals (
      inquiry_id, recipient_organization_id, provider_id, care_offering_id
    ) VALUES (v_inquiry_two, v_org, v_provider, v_other_offering);
    RAISE EXCEPTION 'Offering from another provider was accepted';
  EXCEPTION WHEN foreign_key_violation OR raise_exception THEN
    IF SQLERRM = 'Offering from another provider was accepted' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.inquiry_referrals (inquiry_id, recipient_organization_id, provider_id)
    VALUES (v_inquiry_two, v_org, v_legacy_residence);
    RAISE EXCEPTION 'Legacy residence without an organization relationship was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Legacy residence without an organization relationship was accepted' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.inquiry_referrals (
      inquiry_id, recipient_organization_id, referral_status, shared_at
    ) VALUES (v_inquiry_two, v_org, 'shared', clock_timestamp());
    RAISE EXCEPTION 'Shared referral without authorization was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.inquiries SET workflow_status = 'closed',
      closure_outcome_code = 'family_withdrew', closed_at = clock_timestamp()
    WHERE id = v_inquiry_one;
    RAISE EXCEPTION 'Inquiry closed with active referrals';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Inquiry closed with active referrals' THEN RAISE; END IF;
  END;

  UPDATE public.inquiry_referrals
  SET referral_status = 'closed', outcome_code = 'family_declined', closed_at = clock_timestamp()
  WHERE id IN (v_org_referral, v_provider_referral);

  UPDATE public.inquiries SET workflow_status = 'closed',
    closure_outcome_code = 'family_withdrew', closed_at = clock_timestamp()
  WHERE id = v_inquiry_one;

  IF (SELECT workflow_status FROM public.inquiries WHERE id = v_inquiry_one) <> 'closed' THEN
    RAISE EXCEPTION 'Inquiry did not close after referrals became terminal';
  END IF;

  INSERT INTO public.inquiry_referrals (
    inquiry_id, recipient_organization_id, provider_id, care_offering_id
  ) VALUES (v_inquiry_two, v_org, v_provider, v_offering)
  RETURNING id INTO v_conversion_referral;

  UPDATE public.inquiry_referrals
  SET referral_status = 'ready_to_share',
    sharing_authorization_basis = 'general_permission', sharing_authorized_at = clock_timestamp()
  WHERE id = v_conversion_referral;
  UPDATE public.inquiry_referrals
  SET referral_status = 'shared', shared_at = clock_timestamp()
  WHERE id = v_conversion_referral;
  UPDATE public.inquiry_referrals
  SET referral_status = 'engaged', responded_at = clock_timestamp()
  WHERE id = v_conversion_referral;

  BEGIN
    UPDATE public.inquiry_referrals SET referral_status = 'converted',
      outcome_code = 'provider_declined', converted_at = clock_timestamp()
    WHERE id = v_conversion_referral;
    RAISE EXCEPTION 'Converted referral accepted a non-success outcome';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  UPDATE public.inquiry_referrals SET referral_status = 'converted',
    outcome_code = 'care_started', converted_at = clock_timestamp()
  WHERE id = v_conversion_referral;

  BEGIN
    UPDATE public.inquiry_activities SET actor_label = 'mutated' WHERE id = v_activity;
    RAISE EXCEPTION 'Append-only activity accepted an update';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Append-only activity accepted an update' THEN RAISE; END IF;
  END;

  BEGIN
    DELETE FROM public.inquiry_activities WHERE id = v_activity;
    RAISE EXCEPTION 'Append-only activity accepted a delete';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Append-only activity accepted a delete' THEN RAISE; END IF;
  END;
END
$test$;

ROLLBACK;
