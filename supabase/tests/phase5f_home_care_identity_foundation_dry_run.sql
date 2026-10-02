-- Transaction-only validation for the Phase 5F schema foundation.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = pg_catalog, public;

DO $baseline$
BEGIN
  IF (SELECT count(*) FROM public.providers) <> 66 THEN
    RAISE EXCEPTION 'Expected the unchanged 66-provider baseline';
  END IF;
  IF (SELECT count(DISTINCT p.id) FROM public.providers p
      JOIN public.care_offerings o ON o.provider_id = p.id
      WHERE p.primary_type = 'ems') <> 31 THEN
    RAISE EXCEPTION 'Expected all 31 enriched EMS';
  END IF;
  IF (SELECT count(*) FROM public.providers WHERE slug = 'senevita-vaud') <> 1
    OR (SELECT count(*) FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id
        WHERE p.slug='senevita-vaud') <> 1
    OR (SELECT count(*) FROM public.care_offering_features f JOIN public.providers p ON p.id=f.provider_id
        WHERE p.slug='senevita-vaud') <> 11
    OR (SELECT count(*) FROM public.provider_service_areas a JOIN public.providers p ON p.id=a.provider_id
        WHERE p.slug='senevita-vaud') <> 1 THEN
    RAISE EXCEPTION 'Expected the unchanged Senevita pilot baseline';
  END IF;
  IF EXISTS (SELECT 1 FROM public.organization_sources)
    OR EXISTS (SELECT 1 FROM public.provider_names)
    OR EXISTS (SELECT 1 FROM public.organization_names)
    OR EXISTS (SELECT 1 FROM public.provider_identity_links)
    OR EXISTS (SELECT 1 FROM public.organization_relationships)
    OR EXISTS (SELECT 1 FROM public.care_offering_regulatory_designations)
    OR EXISTS (SELECT 1 FROM public.care_offerings WHERE offering_type = 'home_support') THEN
    RAISE EXCEPTION 'Phase 5F foundation must not contain real identity or regulatory rows';
  END IF;
END $baseline$;

DO $fixtures$
DECLARE
  provider_a uuid;
  provider_b uuid;
  source_a uuid;
  organization_a uuid;
  organization_b uuid;
  organization_source_a uuid;
  offering_a uuid;
BEGIN
  SELECT p.id INTO STRICT provider_a FROM public.providers p WHERE p.slug='senevita-vaud';
  SELECT p.id INTO STRICT provider_b FROM public.providers p
    WHERE p.id <> provider_a ORDER BY p.id LIMIT 1;
  SELECT s.id INTO STRICT source_a FROM public.provider_sources s
    WHERE s.provider_id=provider_a ORDER BY s.id LIMIT 1;
  SELECT po.organization_id INTO STRICT organization_a FROM public.provider_organizations po
    WHERE po.provider_id=provider_a ORDER BY po.organization_id LIMIT 1;
  SELECT o.id INTO STRICT organization_b FROM public.organizations o
    WHERE o.id <> organization_a ORDER BY o.id LIMIT 1;
  SELECT o.id INTO STRICT offering_a FROM public.care_offerings o
    WHERE o.provider_id=provider_a ORDER BY o.id LIMIT 1;

  INSERT INTO public.organization_sources (
    organization_id, source_type, source_name, accessed_on, fields_supported
  ) VALUES (
    organization_a, 'public', 'Phase 5F rollback fixture', DATE '2026-09-28', ARRAY['name']
  ) RETURNING id INTO organization_source_a;

  INSERT INTO public.provider_names (
    provider_id, name, name_type, valid_to, source_id
  ) VALUES (provider_a, 'Phase 5F former provider name', 'historical', DATE '2025-12-31', source_a);
  INSERT INTO public.organization_names (
    organization_id, name, name_type, valid_to, source_id
  ) VALUES (organization_a, 'Phase 5F former organization name', 'historical',
    DATE '2025-12-31', organization_source_a);
  INSERT INTO public.provider_identity_links (
    predecessor_provider_id, successor_provider_id, relationship_type,
    evidence_provider_id, source_id
  ) VALUES (provider_a, provider_b, 'successor', provider_a, source_a);
  INSERT INTO public.organization_relationships (
    parent_organization_id, member_organization_id, relationship_type,
    evidence_organization_id, source_id
  ) VALUES (organization_a, organization_b, 'network_member', organization_a,
    organization_source_a);
  INSERT INTO public.provider_organizations (
    provider_id, organization_id, relationship_type, source_id
  ) VALUES (provider_a, organization_b, 'network', source_a);
  INSERT INTO public.care_offerings (provider_id, slug, name, offering_type)
    VALUES (provider_a, 'phase5f-home-support-fixture', 'Phase 5F home support fixture', 'home_support');
  INSERT INTO public.care_offering_regulatory_designations (
    provider_id, offering_id, designation_type, scheme, designation_code,
    designation_label, jurisdiction_country_code, jurisdiction_code,
    issuing_organization_id, designation_status, observed_on, source_id
  ) VALUES (
    provider_a, offering_a, 'authorization', 'vd_osad', 'type_1',
    'Type 1 rollback fixture', 'CH', 'VD', organization_a, 'current',
    DATE '2026-03-02', source_a
  );
  INSERT INTO public.care_offering_regulatory_designations (
    provider_id, offering_id, designation_type, scheme, designation_label,
    observed_on, source_id
  ) VALUES (
    provider_a, offering_a, 'authorization', 'vd_osad',
    'Authorization with no published class code', DATE '2026-03-02', source_a
  );

  BEGIN
    INSERT INTO public.provider_names (provider_id, name, name_type, source_id)
      SELECT provider_b, 'Wrong source fixture', 'historical', source_a;
    RAISE EXCEPTION 'Provider name accepted another provider source';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.organization_names (organization_id, name, name_type, source_id)
      VALUES (organization_b, 'Wrong source fixture', 'historical', organization_source_a);
    RAISE EXCEPTION 'Organization name accepted another organization source';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.provider_identity_links (
      predecessor_provider_id, successor_provider_id, relationship_type,
      evidence_provider_id, source_id
    ) VALUES (provider_a, provider_a, 'successor', provider_a, source_a);
    RAISE EXCEPTION 'Provider identity link accepted a self-link';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.organization_relationships (
      parent_organization_id, member_organization_id, relationship_type,
      evidence_organization_id, source_id
    ) VALUES (organization_a, organization_a, 'network_member', organization_a,
      organization_source_a);
    RAISE EXCEPTION 'Organization relationship accepted a self-link';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.care_offering_regulatory_designations (
      provider_id, offering_id, designation_type, scheme, designation_code,
      designation_label, effective_on, expires_on, source_id
    ) VALUES (provider_a, offering_a, 'classification', 'vd_osad', 'type_2',
      'Invalid dates fixture', DATE '2026-12-31', DATE '2026-01-01', source_a);
    RAISE EXCEPTION 'Regulatory designation accepted an invalid date range';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $fixtures$;

DO $rls$
BEGIN
  IF has_table_privilege('anon', 'public.organization_sources', 'SELECT')
    OR has_table_privilege('authenticated', 'public.organization_sources', 'SELECT')
    OR has_table_privilege('anon', 'public.provider_identity_links', 'SELECT')
    OR has_table_privilege('authenticated', 'public.provider_identity_links', 'SELECT') THEN
    RAISE EXCEPTION 'Private Phase 5F evidence tables leaked client SELECT access';
  END IF;
END $rls$;

SET LOCAL ROLE anon;
DO $public_visibility$
BEGIN
  IF EXISTS (SELECT 1 FROM public.provider_names)
    OR EXISTS (SELECT 1 FROM public.organization_names)
    OR EXISTS (SELECT 1 FROM public.organization_relationships)
    OR EXISTS (SELECT 1 FROM public.care_offering_regulatory_designations) THEN
    RAISE EXCEPTION 'Unpublished Phase 5F rollback fixtures became public';
  END IF;
END $public_visibility$;
RESET ROLE;

ROLLBACK;
