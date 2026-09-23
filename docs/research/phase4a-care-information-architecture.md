# Phase 4A minimum care-information architecture

## Model

The existing `providers` row remains an establishment or operating site. Its address is the site's physical or office location. Existing `provider_service_areas` remain the single, separate coverage relation and are never derived from the address. A nullable `care_offering_id` can scope a coverage fact to one offering at that provider; `NULL` retains provider/site-level coverage. A composite foreign key prevents an offering from being attached to another provider's coverage row. No service-area row still means unknown.

An `organization` is a reusable operator, owner, or brand identity. `provider_organizations` links it to one or more sites and requires a `provider_sources` row belonging to that site. A primary operator is unique per site, while one organization can operate many sites.

A `care_offering` is one coherent care or housing proposition at a site. One site can have one or several offerings. The offering holds only facts whose scope is naturally the offering: type, capacity and unit, stay modes, admissions, financing/public-interest status, and pricing notes. Every optional fact defaults to `NULL`; no value means unknown.

`care_offering_features` stores positive, typed facts in three families: care profile, service, and facility. The database constrains the family while `lib/care-feature-taxonomy.js` controls the recognized V1 codes used by imports and projections. This keeps the code list reviewable and evolvable without a migration for every recognized feature. Unknown codes are rejected by that boundary. The absence of a row or a `NULL` input remains unknown. Stay modes remain nullable columns on `care_offerings` and are not duplicated as feature codes. Each stored feature has a canonical code, a display label, and a same-provider source. `care_offering_sources` privately links one or more existing provider sources to offering fields. `care_offering_availability` stores timestamped, sourced observations and requires an explicit publication flag.

RIP/public-interest status is nullable and care-offering scoped. An importer may set it only from explicit evidence for that offering. A LAMal listing, legal form, operator, or another offering at the same site does not establish the value.

Google Places stays outside this model. It supplies external imagery, location presentation, and Google reviews, and never becomes evidence for care facts.

## Why this is the minimum

The six new tables separate the identities and scopes that the current cases require:

1. reusable organizations;
2. sourced site/operator relationships;
3. multiple typed offerings per site;
4. repeatable sourced services, care profiles, and facilities;
5. private field-level offering provenance;
6. timestamped availability observations.

The design reuses provider identity, address, sources, and the existing service-area table. Its only coverage refinement is a nullable offering foreign key plus scoped uniqueness and visibility rules. It does not add a generic claims engine, arbitrary offering JSON, a new address system, a parallel coverage model, pricing line items, or historical operator timelines. Pricing remains a nullable, sourced summary in `pricing_notes`; tariff tables, billing periods, and comparison calculations wait for comparable evidence.

## Pilot fit

- **Tertianum Les Boveresses:** the existing provider is the establishment. It can link to the Tertianum operator and one `ems` offering. Its 42-bed claim, stay modes, services, and admissions can be scoped to that offering with source links.
- **Senevita Casa Vaud:** the provider is the Renens office/site and can link to Senevita plus a `home_care` offering. The office address remains on the provider. Coverage stays exclusively in `provider_service_areas`; no coverage row is created by adding the offering. If the office later has separately evidenced offerings with different coverage, each coverage row can point to its own offering.
- **Nova Vita Montreux:** one held physical provider/site can link to its operator and contain a `senior_residence` offering plus a separate `medicalized_care_unit` offering. Current official evidence about the medicalized activity, including capacity and non-RIP status, is deliberately not imported by these architecture migrations. Both offering rows can remain unverified and unpublished with the provider.
- **Fondation Le Marronnier:** one organization row can be linked as operator to several independent provider/site rows. Each site keeps its own address, publication state, sources, offerings, and coverage.

## Publication and privacy

All new identity and offering rows default to unpublished and unverified. Public RLS requires both the provider and the relevant organization/offering to be active and explicitly published. Availability additionally requires its own publication flag. `care_offering_sources` has no client grant or public policy. Client roles receive no write policies.

## Approved import decisions

1. Controlled imports and projections use the small V1 taxonomy in `lib/care-feature-taxonomy.js`. Database feature families remain typed, while individual feature codes are application controlled and extensible. Unsupported codes, synonyms, and stay-mode duplicates are rejected.
2. RIP/public-interest stays nullable and offering scoped and is never inferred from related facts or identities.
3. `provider_service_areas` is the only coverage model. It supports provider-level and optional same-provider offering-level scope. An office address or offering insert never creates coverage.
4. Pricing stays a nullable sourced narrative until Lia has enough comparable evidence for a structured tariff model.
5. Nova Vita is modeled as one physical site capable of two distinct offerings. This architecture does not import those offerings or their facts, and the provider remains held and unpublished.

## Import boundary and local validation

This migration creates no organizations, relationships, offerings, features, availability, or coverage. Pilot inserts in the SQL test are transactional and roll back.

The enriched local database predates migration-ledger tracking for the legacy import, so Phase 4A was applied through the existing verified-container runner rather than `supabase migration up`, which would try to replay that import. Local commands are:

```powershell
node scripts/test-phase4a-local.mjs --write-local --confirm Lia-vaud:local:54322
node scripts/test-phase4a-local.mjs --verify-local
```

The write command accepts only the fixed verified local container and requires exactly 66 unpublished, unverified providers. It can apply both Phase 4A migrations to a pristine Phase 4A schema or only the coverage refinement when the foundation is already present; it rejects an already completed or unexpected state. The verification fixtures always roll back. A fresh database or future reset will apply the checked-in migrations in timestamp order normally.

No architectural decision currently blocks the first controlled pilot import. Each proposed fact still requires field-level evidence, taxonomy validation, correct site/offering scope, and a separate human approval before it can be written. Later evidence may trigger product decisions about:

1. expanding the V1 controlled vocabulary after reviewing actual sourced concepts;
2. introducing structured tariffs when genuinely comparable price evidence exists;
3. modeling historical identity or operator timelines if current imports require them.
