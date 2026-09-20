# Provider foundation — Phase 1, prepared only

The user confirms public.leads is the only existing application table. This phase does not inspect, alter, query, grant access to, or migrate it. No SQL has been executed. The migration has no data inserts, municipality seed, imports, network calls, or changes to existing tables. Do not run it remotely as part of this work.

## Proposed tables and semantics

- **public.providers**: one physical facility or locally identifiable service operation. UUID identity; unique nullable legacy_id; unique stable slug. Keep the three existing primary_type codes. Subtypes and category-specific attributes remain empty until documented. Never use attributes for leads, private notes, contracts, pricing guesses, reviews, or ranking boosts.
- **public.municipalities**: geographic identity, independent of spelling. Nullable positive BFS number, unique within country when known. Names are not unique: aliases, homonyms, and mergers need deliberate reference-data handling. normalized_name is importer-generated lookup text, not identity. No municipality records are seeded.
- **public.provider_sources**: source type/name, optional URL/external ID, retrieval and review dates, supported fields, private review notes. A legacy source records the origin of a claim, not independent verification.
- **public.provider_service_areas**: explicit municipality or canton coverage, never inferred from a provider's office. Missing rows mean unknown. The extra country_code defaults to CH to qualify canton targets. A municipality target carries municipality_id and no canton_code; a canton target carries country/canton and no municipality_id. A composite FK ensures that a cited source belongs to the same provider.

All arrays and JSON objects default empty. Empty means not recorded/unknown, not confirmed absence. Nullable factual fields remain null. Coordinate checks require a valid pair; do not geocode a municipality centroid and publish it as an exact facility location.

`status` is directory lifecycle: active, inactive, archived. The required active default is NOT proof a provider is currently operating. `verification_status` is unverified, partially_verified, verified, stale. Publication is a separate boolean, false by default. No commercial fields exist. updated_at changes on every provider update through a narrowly scoped, SECURITY INVOKER trigger; last_reviewed_at is never updated automatically.

Country/canton format checks accept uppercase two-letter identifiers, not a hardcoded Vaud or canton allowlist. Before importing, validate canton membership in its country, municipality/country/canton consistency, and standard language/service/subtype vocabularies in the trusted importer. The simple municipality FK alone does not enforce those geographic relationships. No ingestion endpoint exists in this phase.

## RLS and grants

RLS is enabled on all four tables. Explicit revocation removes any inherited default PUBLIC/anon/authenticated table grants; SELECT is restored only as described below. No client INSERT, UPDATE, DELETE or other write grants/policies are created. No schema-wide grants/default privileges are changed.

| Table | anon / authenticated read | Reason |
| --- | --- | --- |
| providers | Only is_published AND status = active | Imports remain invisible until deliberately published |
| municipalities | Canonical reference rows | Non-personal geography is public reference data |
| provider_service_areas | Only when parent provider is published and active | An unpublished provider cannot leak coverage |
| provider_sources | No access | Notes, internal URLs and external identifiers are not automatically safe for publication |

Every column of a published provider or service-area record is readable under these policies. A publisher must therefore review the complete row, including attributes, original_tags, original_location_text and business contact fields. Never put private information into these records. Sources stay private even when their provider is published; source IDs in coverage are opaque references, not permission to read evidence. If public provenance is needed later, add a curated public representation rather than granting access to internal notes.

Only trusted service_role receives explicit CRUD grants on the new tables. It bypasses RLS and must remain server-only. The future public reader should use a dedicated publishable/anon client subject to RLS, not the existing privileged lead client. No Supabase provider client is created now. Do not turn repository reads into service-role reads and assume RLS will still filter them.

References: [Supabase RLS/grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [PostgreSQL grants](https://www.postgresql.org/docs/current/sql-grant.html).

## Index budget

Primary/unique constraints cover IDs, provider slug/legacy_id and municipality country/BFS number. A partial (primary_type, name, id) index covers published active category browsing; do not add duplicate standalone boolean/status/slug indexes. Country/canton and municipality indexes support provider location queries. provider_sources(provider_id, id) both supports the ownership FK and indexes provider lookups. Service-area partial unique indexes prevent repeated targets; a provider_id index supports unqualified parent lookups/cascades. No GIN, full-text, trigram, geospatial or speculative price/availability indexes are added. Target-first partial indexes now support the core reverse lookup: (municipality_id, provider_id) for municipality coverage and (country_code, canton_code, provider_id) for canton coverage. Existing provider-first uniqueness indexes remain unchanged. DB name ordering is not yet promised equivalent to JavaScript French collation.

## Legacy mapping and preservation

See [all 66 mapping rows](./legacy-provider-mapping.md). Existing lib/providers.js is unchanged. No provider is inserted, removed, merged, reclassified, or marked verified. **REVIEW CANDIDATES ONLY:** mappings in legacy-provider-mapping.md must NOT automatically populate service_codes during the future initial import. Preserve every original_tag, and leave service_codes empty unless each assignment has been individually verified/approved. Ambiguous provider identities must remain unpublished. The live adapter does not apply proposals either.

Direct lexical candidates are defined in lib/provider-config.js. Broad tags are retained without extrapolation. Even direct candidates require review because the dataset has no per-record evidence. Do not infer language codes from Bilingue, service areas from Tout Vaud, nursing from Spitex/Soins, or public/private/legal/funding status from Public/LAMal. Preserve original_tags after any approved mapping.

Future import defaults: retain the legacy ID as legacy_id and slug; issue a UUID; preserve name/type/raw locality/NPA/address/tags; leave unknown factual fields null or empty; keep is_published=false, verification_status=unverified, last_reviewed_at=null. Do not treat migration time as historical retrieval/review time. Record the actual import observation separately through the legacy source metadata. Confirm country/canton per record before publishing; never derive street from the current display address.

The report generator has no database dependency. `node scripts/generate-legacy-provider-report.mjs --check` checks freshness; `--write` only regenerates the local Markdown report.

## Repository and frontend contract

lib/provider-repository.js is server-only, with async `listProviders()` and `getProviderBySlug(slug)` methods. It currently projects the original static array into explicit ProviderSummary objects:

`{ id, slug, name, type, commune, npa, address, tags }`

The seven original fields retain their values; slug equals the legacy ID. IDs are opaque strings; after import, UUID strings may replace the underlying identity while slugs remain stable. No caller should derive a slug from a display name. Arrays are copied so callers cannot mutate legacy tags through DTOs.

app/recherche/page.js is now a server wrapper. It passes summaries to RechercheClient, which retains the previous markup, state, URL parsing, counts, filters, order, nine-item display and load-more behavior. provider-search.js is a pure client-safe compatibility implementation, tested against the old search function. SPECIAL_FILTERS retains its four current values; the existing unsupported Spitex footer filter is deliberately not changed in this phase. Neither app component imports the static data file directly.

The future Supabase adapter must return this same minimal shape and select only published/active rows. Proposed column mapping: id -> id; slug -> slug; name -> name; primary_type -> type; locality -> commune (official municipality name as explicit fallback); postal_code -> npa; original_location_text -> address for imported legacy rows; original_tags -> tags for compatibility. Missing display strings become empty strings and missing display arrays become empty arrays, never invented facts. For new records, format address only from documented fields. Do not expose internal provider_sources through the DTO.

The future switch needs a deliberate cache/revalidation decision: today's static data can be prerendered at build time. Swapping to a database import alone would not ensure newly published rows appear promptly. Server-side pagination remains a later transport change at national scale; this phase prevents a second visual/card rewrite, not every possible future data-loading change.

Homepage examples remain the existing editorial subset; no copy or example selection changes. Shared Header/Footer, homepage, lead API/client and legal pages are untouched.

## /prestataires/[slug] design only

No new route is built. A future server page awaits params, calls getProviderBySlug, returns notFound for an unknown/unpublished slug, and renders existing Header/Footer. It uses only the summary fields available, clearly distinguishing locality from a street address. Prices, availability, reviews, coordinates and languages are absent until real evidence supports them. Existing ID-based slugs can resolve from the current repository immediately when the route is built; the DB adapter must preserve those slugs.

Generate metadata from actual provider name/locality; keep domain configuration centralized when implementing it. Do not advertise provider structured-data properties absent from sources. Keep /recherche and its current query URLs unchanged; provider detail links can be added in a separate approved phase.

## Before execution / remaining decisions

1. Review status and verification vocabulary, all-public provider row contents, and private-only source records. Publication is editorial approval, not payment.
2. Confirm the target has the expected Supabase roles, gen_random_uuid(), and no conflicting new table/function names. The migration intentionally fails on conflicts rather than silently accepting an unknown schema. Existing project-level schema USAGE for API roles is assumed.
3. Run the migration and an RLS/constraint test matrix in an isolated disposable database BEFORE any production execution. This has NOT been done here: no disposable local database/toolchain was found. A local-only, rollback-based test script and execution instructions are prepared in supabase/tests/provider_foundation_dry_run.sql and docs/provider-local-testing.md. Test anon and authenticated: published/active readable; unpublished/inactive/archived hidden; child coverage hidden with its parent; sources unreadable; all writes denied. Test service-role import, invalid categories/targets/coordinates, duplicate IDs/slugs/coverage, cross-provider source rejection and timestamp updates. Verify existing table grants/policies remain unchanged.
4. Set a geographic validation/reference-data process before seeding: authoritative municipality/BFS/canton mapping, alias resolution and country consistency. No national municipality import is needed for initial review.
5. Resolve network/operator/facility ambiguities before importing/publishing those records; retain unresolved rows in the report, not fabricated physical facilities. The legacy site stays online independently while this is reviewed.
6. Before switching sources, define an explicit row projection, cache/revalidation strategy, comparison/rollback plan and importer authorization. No authenticated user is granted editing rights by this migration.

## Explicitly out of scope

No remote SQL, seed import, leads changes, prices, live availability, reviews/ratings, accounts/claiming, sponsored placement, booking, AI matching, national imports, multilingual UI, provider dashboard or domain/copy migration.

## Validation performed for this preparation

- `node --test tests/provider-foundation.test.mjs`: five tests pass, including all 66 summaries/slugs, legacy search parity across names/tags/places/postcodes, conservative mapping, source-boundary checks and static migration scope guards.
- `node scripts/generate-legacy-provider-report.mjs --check`: all mapping rows match the dataset and proposal config.
- `npm.cmd run build`: passes. The initial sandbox attempt could not download the existing Google Fonts; the network-enabled retry succeeded.
- Search JSX matches the original page exactly. lib/providers.js, homepage, lead API and Supabase lead client are unchanged.
- Targeted ESLint: the extracted search component retains the same two existing `react-hooks/set-state-in-effect` errors as the original page. Baseline and current source were linted to confirm this; other checked new modules have no findings. These existing effects are preserved to keep behavior unchanged.
- No browser UI test or SQL execution was performed. Static SQL guards do not validate actual PostgreSQL execution, role grants or RLS behavior; those remain pre-execution checks above.
