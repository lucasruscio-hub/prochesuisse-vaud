# LIA_PROJECT_STATE

> Permanent development handoff for the Lia repository.
> **Provenance:** earlier foundation details below are grounded in the project master handoff. The current-state sections were audited on 2026-10-12 against the repository and the running local Supabase database. Historical claims remain labeled as reported where primary evidence was not re-created during this audit. No secrets, credentials, API keys, or customer data belong in this file.

## 0. State classification and 2026-10-12 audit snapshot

### Verified current repository facts

- Working copy: `C:\Users\lucas\Lia-vaud`; branch: `marketplace-mvp`.
- The clean predecessor for the final Vaud V1 home-care closure cohort was `86a197a16b2551ed5dcee03a157cde63753daa93`, with local HEAD equal to `origin/marketplace-mvp`.
- The clean starting checkpoint for the migration-ledger reconciliation was `53613253735aff7c4c3536e84e907bd12a0f3ede` (`Add permanent Lia project state handoff`), with local HEAD equal to `origin/marketplace-mvp`.
- Batch F and the permanent handoff are committed. The migration-ledger reconciliation changed only local database bookkeeping; this handoff update is the only repository-file change made by that workflow.
- The repository contains eight migration files through `20261013000100_create_inquiry_intake_rpc.sql`; see section 4.
- The approved architecture checkpoint is `14de241f3538d22bf4a70769e717dc099a2c2901` (`Document Lia Inquiry Foundation architecture`), equal to `origin/marketplace-mvp` before the schema-foundation changes.
- All explicit repository paths referenced by this document were found. The `docs/research/phase5f-batch-*.md` reference is a glob and matches the committed batch records, including Batch F.
- The Inquiry Foundation intake work and the public V1 family-intake update now have 21 targeted tests across two intake test files. The runnable repository set is now 42 `tests/*.test.mjs` files and passes **233/233**. Targeted ESLint passes with only the two pre-existing `app/page.js` image warnings, and the production build passes.

### Verified current local-database facts

- The guarded local target is the running `Lia-vaud` Supabase container on host port `54322`; no production database was accessed.
- Batch F is applied locally: Altoan/Altoan SA exist, exactly one offering has type `home_support`, and the verified table counts are recorded in section 5.
- The local schema contains the 16 provider-domain public tables plus the four private Inquiry Foundation tables. On 2026-10-11, a clean isolated replay of the six predecessor migrations was proven materially schema-equivalent to the enriched provider schema, after reproducing the standard Supabase public-schema privilege baseline.
- The local Supabase migration ledger is reconciled and all eight repository migration versions are recorded as applied. Public application data and provider-domain fingerprints remained unchanged throughout the Inquiry Foundation and intake-RPC proofs.
- The Vaud V1 private-home-care completeness cohort is applied locally: 14 new private generalist providers were created and the existing `swisscaring` and `boite-o` providers were reconciled without duplication. All 16 cohort providers have one minimum `home_care` offering and one dated 2026-03-02 official-file designation. No cohort service-area, feature, or availability rows were added.
- The final Vaud V1 home-care closure cohort is applied locally: GRPTP, Ligue pulmonaire vaudoise, NOMàD, and SBV Medical were created; existing `sitex` was reconciled in place. Each remains unpublished/unverified and has one narrow specialist `home_care` offering plus one dated 2026-03-02 official-file designation. The other six reviewed candidates remain held; no service-area, feature, availability, or provider-name rows were added.

### Historical facts

- Phase and milestone summaries in sections 4–6 describe earlier completed work. Batch F remains in history at `a27faf1`; the private-generalist cohort is checkpointed at `86a197a`, which is the predecessor for this final closure cohort.
- Backup #27 is present on the SSD at checkpoint `86a197a`; Backup #26 and the separate pre-reconciliation database dump remain historical safety artifacts.

### Current Inquiry Foundation boundary

- The Lia Inquiry Foundation architecture is approved and documented in `docs/architecture/lia-inquiry-foundation.md`. It defines four private core tables, separate inquiry/referral lifecycles, multiple organization-owned referrals, explicit provider-sharing authorization/disclosure, append-only activities plus current-state snapshots, retention/anonymization capability, and a future-compatible but unimplemented Partner Portal boundary.
- The Inquiry Foundation and service-role-only atomic intake RPC are implemented and verified against `Lia-vaud:local:54322`. `/api/leads` remains the compatibility facade for the unchanged RPC and accepts both the legacy payload and the new controlled V1 payload. The public form now collects broad care type, beneficiary relationship, timing, coarse location/NPA, optional controlled need codes, optional context (maximum 1,000 characters), contact details, preferred contact method, a separate privacy acknowledgement, and separate permission for Lia to contact the family. It no longer asks for visible age, funding, or free-form situation fields and does not collect DOB, diagnosis, medication details, insurance/AVS, files, or detailed medical history. Submission does not authorize provider sharing. The four tables remain empty, private, RLS-enabled, and inaccessible to browser roles after transactional tests. The internal UI, referrals, provider sharing, assignments, Partner Portal, and full CRM remain unauthorized and unchanged. No production schema/data was accessed.
- Continue with the supply-completeness and product priorities in section 9 without starting Phase 5G, Partner Portal, or full CRM automatically.

### Unresolved or deliberately unverified

- No separate Phase 5F completion-review artifact is present. The targeted Vaud V1 private-home-care completeness record now documents the largest identified private-generalist coverage gap and its closure; it is not Phase 5G.
- Phase 5G has not started: no Phase 5G path exists and both the Phase 5F manifest and the cohort manifest keep `phase5gAuthorized: false`.
- The final home-care closure manifest also keeps `phase5gAuthorized: false`; this cohort is not enrichment.
- Current Vercel project, public URL, and deployment status could not be verified from repository metadata or public evidence.
- Production Supabase schema/data state was not checked because production data access was prohibited for this audit.
- Production migration history remains separately unknown and must be audited before any production schema deployment. The local repair is not evidence of production state.

## 1. Project overview and goals

Lia is a Swiss elderly-care discovery/marketplace product, strategically inspired by Lottie/Booking-style discovery but with its own brand, UX, data model, and evidence rules.

**Launch strategy:** finish Vaud to a trustworthy, substantially complete V1; launch to real families and industry users; then build Suisse romande while Vaud is live. Do not wait for all Switzerland before launch.

Core provider categories:

- EMS / nursing homes
- Home care / Spitex / OSAD / CMS
- Senior residences / assisted/protected living

Positioning: warm, human, premium, trustworthy; Lia should not feel like a government directory.

Long-term journey:

`discovery -> education -> search -> comparison -> matching -> enquiry -> provider/official pathway`

Product/business principles:

- All legitimate providers should be discoverable regardless of whether they pay Lia.
- Commercial relationships must not secretly determine organic ranking.
- Public/community supply makes Lia comprehensive; private/commercial providers are the initial monetization priority.
- V1 should capture family demand and track enquiries internally; a secure multi-organization Partner Portal/CRM should be architecturally possible later, but is **not** to be implemented yet.
- Current priority remains Vaud data completeness, followed by family lead capture + internal inquiry tracking.

## 2. Technology stack and repository structure

**Primary Windows working copy (verified):**

`C:\Users\lucas\Lia-vaud`

**Git branch:** `marketplace-mvp`

**Remote repository:** GitHub repository still uses the older ProcheSuisse naming. Renaming is not urgent.

Current manifest versions, verified against `package.json` on 2026-10-11:

- Next.js 16.2.6
- React 19.2.4
- JavaScript / JSX
- Tailwind CSS `^4` (`4.3.0` installed) and `@tailwindcss/postcss` `^4` (`4.3.0` installed)
- `@supabase/supabase-js` `^2.106.0` (`2.106.0` installed)
- Supabase CLI `^2.117.0` (`2.117.0` installed)
- Lucide React `^1.28.0` (`1.28.0` installed)
- Resend `^6.12.3` (`6.12.3` installed)
- ESLint `^9` (`9.39.4` installed) with `eslint-config-next` 16.2.6

Other tooling/state:

- Docker Desktop is running the verified local Supabase stack.
- Vercel was reported historically, but its current project/deployment state is unresolved; see section 11.

Important repository areas:

- `app/` — Next.js routes/UI
- `lib/` — repository/data/business logic and guarded batch writers
- `supabase/migrations/` — schema migrations
- `supabase/tests/` — SQL/local schema tests
- `scripts/` — guarded local write/verification scripts
- `tests/` — Node/test-suite coverage
- `docs/research/` — audits, identity packets, implementation records
- `docs/research/source-material/` — research workbooks/source artifacts

Known routes from the earlier handoff:

- `/`
- `/recherche`
- `/prestataires/[slug]`
- `/guides`
- `/guides/[slug]`
- `/notre-mission`
- `/notre-independance`
- `/contact`
- legal/privacy pages
- `/api/leads`

Brand references: navy `#10213D`, coral/pink `#FF5F72`, soft blush backgrounds, serif Lia logo.

## 3. Current architecture and important files

Conceptual provider architecture:

`organization -> establishment/site/provider -> care offering -> features/services -> service area -> evidence/source`

Important distinctions:

- organization != provider/site
- provider != offering
- network membership != ownership
- historical name != current provider
- office address != service coverage
- publication/lifecycle != factual verification

Provider/care architecture supports EMS, home care, and residences without separate category-specific databases.

Important research/implementation files reported during Phase 5F:

- `docs/research/phase5f-home-care-identity-resolution.md`
- `docs/research/phase5f-schema-foundation.md`
- `docs/research/phase5f-home-care-identity-packets/README.md`
- `docs/research/phase5f-home-care-identity-packets/implementation-manifest.json`
- `docs/research/phase5f-home-care-identity-packets/research-holds.json`
- `docs/research/source-material/Lia_Phase5E_FINAL_reconciled_Vaud_homecare_2026-09-28.xlsx`
- `docs/research/source-material/Lia_Vaud_provider_master_audit_2026-09-21.xlsx`
- Batch implementation records under `docs/research/phase5f-batch-*.md`

Earlier important source workbook:

`docs/research/source-material/Lia_Vaud_provider_master_audit_2026-09-21.xlsx`

Earlier recorded SHA-256:

`2F3E5ED512E7DF196356D6F0F7D66DF5F08FD7168B8C90F19C0F213FF27B4450`

Google Places/Maps exists as an optional enrichment layer. Google data must not overwrite Lia-reviewed facts. Secrets belong only in ignored environment files and must never be committed.

## 4. Supabase database structure and migration history

### Core provider/care foundation

Reported core entities include:

- `providers`
- `provider_sources`
- `municipalities`
- `provider_service_areas`
- `organizations`
- `provider_organizations`
- `care_offerings`
- `care_offering_features`
- `care_offering_sources`
- availability tables
- offering-scoped service areas

### Phase 5B — home-care data foundation

Completed before Phase 5F. Important changes:

- `provider_sources.accessed_on date` (nullable; no fake historical backfill)
- narrative service regions via `provider_service_areas.coverage_label`
- `coverage_type = 'region'`
- service-area rows require source evidence
- narrative regions remain distinct from municipality/canton coverage
- added controlled home-care features including:
  - `service.on_call_24h`
  - `service.companionship`
  - `service.meal_delivery`
  - `service.respite_at_home`
  - `service.emergency_call_service`

### Phase 5F schema foundation

Migration files currently present, in order:

- `supabase/migrations/20260920000100_provider_foundation.sql`
- `supabase/migrations/20260921000100_import_legacy_providers.sql`
- `supabase/migrations/20260923000100_care_information_foundation.sql`
- `supabase/migrations/20260923000200_offering_scoped_service_areas.sql`
- `supabase/migrations/20260926000100_home_care_foundation.sql`
- `supabase/migrations/20260928000100_phase5f_home_care_identity_foundation.sql`
- `supabase/migrations/20261012000100_inquiry_foundation.sql`
- `supabase/migrations/20261013000100_create_inquiry_intake_rpc.sql`

Phase 5F migration:

`supabase/migrations/20260928000100_phase5f_home_care_identity_foundation.sql`

Added/extended support for:

- `organization_sources` — organization-owned evidence
- `provider_names` — current/legal/trading/historical provider names
- `organization_names` — current/legal/trading/historical organization names
- `provider_identity_links` — `successor`, `duplicate_of`, `split_into`
- `organization_relationships` — sourced organization-to-organization network relationships
- `provider_organizations.relationship_type` extended with `network`
- `care_offerings.offering_type` extended with `home_support`
- `care_offering_regulatory_designations` — sourced, time-sensitive authorization/classification evidence

All Phase 5F foundation tables were reported with RLS. Organization sources/provider identity links are private; public-facing records require explicit publication rules.

The provider domain contains: `providers`, `provider_sources`, `municipalities`, `provider_service_areas`, `organizations`, `organization_sources`, `organization_names`, `organization_relationships`, `provider_names`, `provider_identity_links`, `provider_organizations`, `care_offerings`, `care_offering_sources`, `care_offering_features`, `care_offering_availability`, and `care_offering_regulatory_designations`.

### Inquiry Foundation schema — 2026-10-12

`20261012000100_inquiry_foundation.sql` adds only `inquiry_contacts`, `inquiries`, `inquiry_referrals`, and `inquiry_activities`, plus their helper/trigger functions, constraints, indexes, and private grants. All four tables have RLS enabled and no client policies. Contacts/inquiries/referrals allow only required CRUD to `service_role`; activities allow only `SELECT`/`INSERT`. The final schema has 74 columns, 65 constraints, 21 indexes, seven triggers, and zero rows. Exact implementation and verification details are in `docs/architecture/lia-inquiry-foundation-schema-implementation.md`.

`20261013000100_create_inquiry_intake_rpc.sql` adds no tables or columns. It adds one
`SECURITY INVOKER` function, `public.create_inquiry_from_public_intake`, executable only by
`service_role`. The function serializes on the UUID intake idempotency key, compares canonical
persisted values on retry, atomically creates the contact/inquiry/creation-activity triplet,
and rejects a changed payload reusing the same key. Local rollback-only and applied-state tests
prove exact retry behavior, conflict behavior, full rollback after a synthetic activity failure,
same-email separate submissions, zero referrals/disclosures, private browser-role posture, and
zero retained inquiry rows.

### Local migration-ledger reconciliation — 2026-10-11

The earlier ledger discrepancy is resolved locally. It happened because the initial provider-foundation migration was applied through Supabase migration tooling, while the legacy import and later schema migrations were historically executed directly through the repository's guarded, pinned-container SQL runners. Those direct executions created the intended schema/data but did not add rows to `supabase_migrations.schema_migrations`.

Before repair, a restorable database dump was created at:

`D:\Lia-backups\Lia-db-backup_2026-10-11_pre-migration-ledger-reconciliation\lia-local-postgres-pre-migration-ledger-reconciliation.dump`

An isolated disposable database replayed the six checked-in migrations in chronological order, without any Batch A-F enrichment scripts. Its material public schema matched the current enriched local database exactly across tables/RLS, 184 columns and defaults, 120 constraints, 56 indexes, 12 policies, two functions, three triggers, grants/default privileges, and five deliberate comments. The disposable database also contained the expected 66-provider legacy footprint: 46 EMS, 12 domicile, 8 residence, 66 distinct legacy IDs, and 66 legacy source rows.

Only after that equivalence proof, the supported Supabase CLI marked these versions applied locally without rerunning SQL: `20260921000100`, `20260923000100`, `20260923000200`, `20260926000100`, and `20260928000100`. The existing `20260920000100` entry was not modified. The Inquiry Foundation and intake-RPC migrations were applied normally; `supabase migration list --local` now shows all eight local and database-history versions aligned, with none pending.

Production migration history remains unknown. Audit it separately and read-only before any production migration or deployment; never infer production state from this local reconciliation.

**Local database target used throughout Phase 4/5:** `Lia-vaud:local:54322` / local Supabase container. Production access has repeatedly been prohibited during these phases.

## 5. Provider-data coverage and latest verified counts

### Verified local counts after the final Vaud V1 home-care closure cohort

Read-only verification against the guarded local container on 2026-10-12 returned:

- Providers: **141**
- CMS providers: **50**
- Organizations: **64**
- Provider sources: **216**
- Organization sources: **42**
- Organization names: **4**
- Organization relationships: **7**
- Provider names: **5**
- Provider-organization links: **162**
- Care offerings: **111**
- Offering sources: **132**
- Provider identity links: **51**
- Regulatory designations: **77**
- Features: **84**
- Availability rows: **0**
- Service-area rows: **4**
- `home_support` offerings: **1**
- Held provider slugs checked by the closure verifier: **0 present**

### EMS

Phase 4 completed deep structured enrichment for **31 EMS**.

Reported EMS research holds:

- `ems-signal`
- `ems-bethanie`
- `ems-novalles`
- `ems-oriel`
- `ems-gottrause`

Reported V1 exclusions/deferred:

- `ems-orme`
- `ems-naz`
- `ems-mont-calme`
- `ems-aubepines`
- `ems-praz-sechaud`
- `epsm-borde`
- `epsm-collonges`
- `epsm-rouvraie`
- `ems-penates`
- `ems-ligniere`

Potential later EMS candidates identified earlier include Bossons, Mélodie/Plaines-du-Loup, Tilleul, Haute Combe, and Blécherette. A final Vaud EMS completeness audit is still required before launch.

### Home care

- 50/50 public CMS are implemented as patient-facing providers.
- AVASAD and seven regional bodies are organizations/networks, not duplicate patient-facing providers.
- Senevita Casa Vaud remains the proven end-to-end enrichment pilot.
- Phase 5F Batch D added/updated key private structures including AMAD, Vivradom, and Dovida/Home Instead.
- Phase 5F Batch E added specialist/institution-linked identities including Beau-Séjour OSAD and SAMSA Levant, plus organization-level Sciensus/CPSE Alexandra records where provider evidence remains held.
- Batch F added the unpublished, unverified Altoan provider and Altoan SA organization locally, with one strictly non-medical `home_support` offering and one sourced `CH-VD` canton service-area row. The implementation is committed and pushed at `a27faf1`.
- The Vaud V1 private-home-care completeness cohort added 14 private generalist providers and reconciled the existing Swisscaring Vaud and La Boîte O rows. All 16 are unpublished/unverified, have one minimum `home_care` offering and a dated official-file designation, and have no cohort service-area, feature, or availability rows. The exact implementation is documented in `docs/research/vaud-v1-private-home-care-completeness-cohort.md`.
- The final Vaud V1 home-care closure cohort added GRPTP, Ligue pulmonaire vaudoise, NOMàD, and SBV Medical, and reconciled the existing Sitex row. The five specialist identities are unpublished/unverified, preserve narrow specialist scope, and have no cohort service-area, feature, or availability rows. Reconciliation and exact row changes are documented in `docs/research/vaud-v1-home-care-closure-reconciliation.md`.

### Senior residences

The legacy dataset contained 8 senior-residence records. A complete Vaud senior-residence universe has **not yet been established** and is a launch-critical remaining supply task.

## 6. Completed development phases and important decisions

### Phase 4 — EMS enrichment

- 31 EMS received reviewed structured enrichment.
- Evidence-first/unknown-is-better-than-false discipline established.

### Phase 5A — home-care audit

- Determined original 12 `domicile` records were not representative of the real Vaud market.
- Identified AVASAD/CMS, Pro Senectute, Dovida/Home Instead identity issues.

### Phase 5B — home-care schema foundation

- Added accessed dates, narrative service regions, source requirements, and controlled home-care features.

### Phase 5C — difficult identity resolution

Important decisions:

- `senevita-vaud` = Senevita Casa Vaud; parent organization Senevita AG.
- `avasad-cms` is an umbrella/network identity, not a patient-facing provider.
- Pro Senectute Vaud is not automatically a medical Spitex provider.
- Dovida is current; Home Instead is historical/legacy branding.

### Phase 5D — Senevita end-to-end pilot

Proved pipeline:

`official research -> reviewed facts -> canonical packet -> rollback dry run -> guarded local write -> database -> repository projection -> Lia provider page`

### Phase 5E — Vaud home-care universe discovery

- Built/reconciled the real CMS/private-home-care universe.
- Official Canton OSAD list was reconciled with regional/current identities.
- Produced the Phase 5E reconciled workbook.

### Phase 5F — identity/schema implementation

Implemented locally and committed/pushed through Batch F:

- identity-resolution audit
- schema foundation
- canonical identity packets + implementation manifest
- Batch A: AVASAD + 7 regional organizations
- Batch B: all 50 CMS (including Pôle Santé Pays-d'Enhaut exception)
- Batch C: Nurse Home Care Sàrl and SoinVaud Sàrl organization prerequisites
- Batch D: AMAD, Vivradom, Dovida/Home Instead structures
- Batch E: specialist/institution-linked identities
- Batch F: Altoan non-medical home support (locally applied, verified, committed, and pushed)

Key modeling decisions:

- 50 CMS are patient-facing providers; AVASAD/regional bodies are organizations/networks.
- CMS Pays-d'Enhaut has Pôle Santé as operator; ASANTE SANA/AVASAD are networks, not owners.
- AMAD is not one brand-wide provider; separate legal entities/sites are modeled separately.
- Vivradom Renens and Jura Nord Vaudois/Orbe remain separate legal/operator structures.
- Dovida is current; Home Instead is historical/successor identity, not a second current listing.
- SAMSA Levant is narrowly modeled for psychiatric/addiction home nursing.
- `home_support` exists for non-medical providers such as Altoan; it must remain distinct from `home_care`.

## 7. Current development phase and exact stopping point

**Verified stopping point (2026-10-13):** the public family-intake form has been updated to the approved V1 controlled field set and continues to use the existing `/api/leads` compatibility facade and unchanged atomic create-inquiry RPC. The endpoint validates both the new V1 payload and the prior legacy payload, creates the contact/inquiry/creation-activity triplet, and treats persistence as authoritative before notification. The form retains one UUID idempotency key across ambiguous retries, prevents duplicate submits, and resets the key after edits or confirmed success. Privacy acknowledgement and permission for Lia to contact the family are distinct; neither authorizes provider sharing. Transactional tests leave all four inquiry tables empty. No schema/RPC migration, production access, referral/provider disclosure, internal inquiry UI, Partner Portal, or full CRM implementation was added.

Latest committed and pushed Batch F commit:

`a27faf198915710b4bb40bb5c1104a7494668bd2`

Commit message:

`Implement Phase 5F Batch F Altoan home support`

Historical final Batch E checkpoint:

- full runnable suite: **183/183 passed**
- working tree clean
- local HEAD = tracking HEAD = live remote HEAD
- production Supabase not accessed

Current verified closure state:

- local database: rollback-only dry run passed, then apply → verify → rollback → exact predecessor comparison → reapply passed with the exact 39-row closure plan and one Sitex update;
- Inquiry Foundation: rollback-only dry run, apply, verify, scoped rollback, exact provider-fingerprint comparison, corrected least-privilege reapply, and final verification all passed; four tables and zero inquiry rows remain;
- repository implementation: canonical manifest, reconciliation record, guarded library/runner, and targeted tests are included in this cohort checkpoint;
- runnable suite: **233/233 passed** across 42 test files;
- targeted intake ESLint: passed with only the two pre-existing `app/page.js` image warnings;
- production build: passed;
- public intake compatibility: 21/21 targeted tests passed, including controlled-code mapping, separate consent evidence, stable response, idempotent notification behavior, and prohibited-field assertions;
- production Supabase: not accessed;
- local migration history: all eight repository versions aligned, with no migration pending;
- clean repository predecessor for the public V1 intake update: `f7e4f4bd97d4e4584a7fcfedcbbf9cfd185a8902`, equal to its tracking ref before this work.

**Next intended action:** stop at the locally verified public V1 family-intake checkpoint. Production migration/deployment, internal inquiry UI, referral workflow, provider sharing, Phase 5G, Partner Portal, assignments/tasks, memberships, and full CRM all require separate authorization.

Do **not** start Phase 5G automatically after this cohort.

## 8. Outstanding issues, held records, and blockers

### Home-care / private-provider holds remaining after the closure cohort

No identity in the 16-provider completeness cohort is held. The pre-existing holds below remain outside that cohort and were unchanged. The La Boîte O/La Réponse relationship is also still unresolved; no relationship row was created.

- AMAD Yverdon — legal operator and authorization identity unresolved
- Vivradom — shared-brand entity/corporate relationship/coverage allocation unresolved
- Dovida — unnamed partner agency unresolved
- Dovida — Crissier street-address/registered-branch status unresolved
- Dovida — municipality coverage unresolved
- Nurse Home Care provider — current authorization basis and provider-owned current contact evidence still held
- SoinVaud/Soinsvaud provider — current authorization, durable public name, and provider-owned contact evidence still held
- Soinsvaud trading alias — held pending provider identity resolution
- Sciensus provider — unresolved Vaud authorization basis; existing organization and HTHC historical name remain unchanged
- Alterum — held because no preserved provider-owned/current evidence proves the present non-medical operation, contact identity, or operator
- Service d’aide familiale de Morges — held because no preserved provider-owned/current evidence proves the present non-medical operation or association operator
- CP Alexandra provider — unresolved authorization + operating-unit public name
- CPSE Alexandra `legal_name` — current register evidence not yet attached
- Vevey structured service area — missing reconciled municipality/BFS identity

### Product/data completeness blockers before Vaud launch

- final Vaud EMS universe completeness audit, especially private/commercial EMS
- complete Vaud senior-residence universe discovery + implementation
- first-time-family UX review of homepage/search/provider pages
- internal inquiry tracking / Lia-side CRM-lite
- launch QA and feedback loop

### Known code-quality items reported earlier

Verified on 2026-10-11: repository-wide lint still fails with two `react-hooks/set-state-in-effect` errors in `app/recherche/RechercheClient.js` (lines 102 and 152) and reports two `@next/next/no-img-element` warnings in `app/page.js` (lines 173 and 844). These remain pre-existing, out-of-scope code-quality items and were not changed during this audit.

## 9. Next three development tasks in priority order

### 1. Finish remaining Vaud supply completeness

- Final EMS universe/completeness pass, with private/commercial EMS prioritized commercially but all legitimate supply represented.
- Build the real Vaud senior-residence/protected-living universe, resolve identities, and implement trustworthy V1 listings.
- Treat the 16-provider private-home-care completeness cohort as complete; do not repeat it or start specialist follow-up without a separate authorization.

### 2. Run first-time-family UX and launch-readiness review

- Review homepage, search, and provider detail flows with the now broader Vaud supply.
- Keep Phase 5G enrichment unauthorized unless a later review identifies a specific launch-critical fact gap.

### 3. Build internal inquiry tracking only when separately authorized

V1 goal:

`family request -> private Lia inquiry -> internal review/matching -> provider contact -> outcome tracking`

Architect now so a secure Partner Portal/CRM can be added later, but **do not implement the Partner Portal/CRM product yet**.

The architecture, schema foundation, atomic public-intake path, and public V1 family form are complete locally. Internal workflow application work remains unstarted and separately gated. The implemented core is `inquiry_contacts -> inquiries -> inquiry_referrals`, with append-only `inquiry_activities`; required referral recipient organization; optional provider/site and offering; explicit per-referral sharing authorization and `shared_at`; no V1 assignee model; and server-only access.

Future-ready concepts should include:

- Inquiry
- family/contact details separated cleanly from provider data
- inquiry-to-provider/organization matches
- statuses/lifecycle
- activity/event history
- future user -> organization membership -> permitted provider/site access

Because enquiries may contain health-related information, collect only necessary data, keep records private by default, and design future sharing/audit controls conservatively.

## 10. Important architectural rules and constraints

1. **Unknown is better than false.** Never invent price, availability, provider status, languages, coverage, services, authorization, capacity, partnerships, public/private status, etc.
2. Office address != service coverage.
3. Narrative coverage (e.g. “Lausanne et environs”) must not become municipality/canton coverage automatically.
4. “Spitex” or “CMS” does not prove every possible home-care service.
5. Evidence should remain attached to facts where practical.
6. Organization != patient-facing provider/site.
7. Network membership != ownership/operator relationship.
8. Historical/trading names must not create duplicate current provider listings.
9. Commercial relationship/ranking is separate from provider facts. Paid status must not secretly determine organic ranking.
10. Provider publication/lifecycle is separate from factual verification; `active + unverified + unpublished` is valid.
11. Availability requires source + timestamp when implemented.
12. Regulatory designations are source-backed and time-sensitive; do not treat a dated list as timeless truth.
13. `home_support` is distinct from medical `home_care`.
14. Production writes are prohibited unless explicitly planned and approved. Phase 4/5 work has been local-only.
15. Guarded local writes must target the verified Lia local Supabase instance and use rollback/dry-run patterns.
16. Do not delete/reset Docker volumes, databases, system directories, or unrelated folders without explicit review.
17. Keep GitHub/committed code as the cross-machine source of truth; commit + push before switching machines, pull before working elsewhere.

## 11. Verification commands, tests, and deployment considerations

### Git state checks

Use these before/after checkpoints:

```powershell
git status --short
git rev-parse HEAD
git rev-parse '@{u}'
git ls-remote origin refs/heads/marketplace-mvp
git diff --check
```

Expected practice: local HEAD = remote-tracking HEAD = live remote HEAD, then clean working tree.

### Local Supabase

Known guarded target used during Phase 5F:

`Lia-vaud:local:54322`

Phase 5F scripts use explicit local confirmation flags, for example:

```powershell
node scripts/test-phase5f-schema-local.mjs --write-local --confirm Lia-vaud:local:54322
```

Individual batch scripts follow the same pattern with rollback-only dry runs and/or:

`apply -> verify -> rollback -> exact predecessor comparison -> reapply`

Do not substitute production URLs/credentials. Production was not accessed in the reported Phase 5F work.

### Tests

Current verified runnable suite after the public V1 family-intake implementation:

**233 passed, 0 failed** across 42 `tests/*.test.mjs` files.

`package.json` has no test script; enumerate the files in `tests/` and pass them to `node --test`. Running bare `node --test` also discovers guarded scripts named `test-*.mjs` under `scripts/`, which require explicit modes and is not the runnable-suite command. `npm run lint` runs repository-wide ESLint and currently exits nonzero with the two errors and two warnings recorded in section 8.

### Backups

Established backup location:

`D:\Lia-backups`

Exclude:

- `node_modules`
- `.next`
- `supabase\.temp`

Verification procedure used:

- compare source/backup file sets
- compare byte lengths
- compare SHA-256 hashes
- confirm backup Git HEAD
- confirm backup working tree clean
- run `git fsck --full --strict`

Latest repository-checkout backup created and fully verified on 2026-10-12:

`D:\Lia-backups\Lia-backup-28_2026-10-12_pre-inquiry-foundation`

Backup #28 contains 487 included files after excluding `node_modules`, `.next`, and `supabase\.temp`. Source and backup had zero missing files, extra files, length mismatches, or SHA-256 mismatches. Its clean `marketplace-mvp` checkout is at `14de241f3538d22bf4a70769e717dc099a2c2901`; `git fsck --full --strict` exited 0 and reported dangling historical trees only.

Previous verified repository-checkout backup:

`D:\Lia-backups\Lia-backup-27_2026-10-12_vaud-private-home-care-generalists`

Backup #27 contains 454 included files after excluding `node_modules`, `.next`, and `supabase\.temp`. Source and backup had zero missing files, extra files, length mismatches, or SHA-256 mismatches. Its clean `marketplace-mvp` checkout is at `86a197a16b2551ed5dcee03a157cde63753daa93`; `git fsck --full --strict` exited 0 and reported dangling historical trees only.

Separate database safety snapshot created and verified before the 2026-10-11 local migration-ledger repair:

`D:\Lia-backups\Lia-db-backup_2026-10-11_pre-migration-ledger-reconciliation\lia-local-postgres-pre-migration-ledger-reconciliation.dump`

The custom-format PostgreSQL dump is 474,263 bytes, has SHA-256 `CE78EFB6DB749014E1D442CA439A9E82E499771EC8ACF60C28BC2D8139CC7418`, and passed `pg_restore --list`. It was not restored and must not be committed.

Separate pre-Inquiry-Foundation local database snapshot:

`D:\Lia-backups\Lia-db-backup_2026-10-12_pre-inquiry-foundation\lia-local-postgres-pre-inquiry-foundation.dump`

The custom-format dump is 502,828 bytes, has SHA-256 `92B158A39DB77B5DFFFE8CF5C340878C3E59D7E4231BFEA2D7A86FB9A163B641`, and passed `pg_restore --list` with 809 TOC entries. It was not restored and must not be committed.

### Deployment

Historical handoff information says Vercel exists, but this audit found no `.vercel` project metadata, deployment configuration, confirmed public URL, or public deployment evidence. The current Vercel project/status therefore remains unresolved. The live Git branch was verified at the Batch E commit. Production Supabase was not accessed, so its schema/data state relative to local is also unresolved. Before any deployment/promotion:

- verify current Vercel/project state
- verify production schema/migration gap
- define an explicit production migration/data-promotion plan
- never copy local Phase 5F data blindly to production
- re-run launch QA on homepage, search, provider detail pages, lead capture, legal/privacy pages

## 12. Last verified Git branch, commit, and working-tree state

**Verified on 2026-10-13:**

- Branch: `marketplace-mvp`
- Architecture checkpoint before the schema commit: `14de241f3538d22bf4a70769e717dc099a2c2901`
- Clean predecessor before the final home-care closure cohort: `86a197a16b2551ed5dcee03a157cde63753daa93`
- The final home-care closure cohort is committed and present on `origin/marketplace-mvp`.
- The local database is at the verified 141-provider/64-organization/111-offering closure state.
- Production Supabase: not accessed; current production state unresolved
- Batch F: applied and verified locally, committed, and present on the live remote
- Vaud V1 private-home-care completeness cohort: applied and verified locally; 16 identities implemented, none held, 128 net-new rows
- Final Vaud V1 home-care closure cohort: 11 candidates reviewed; five implemented (four creates and one update), six held, 39 net-new rows
- Inquiry Foundation: architecture and schema implemented; atomic intake RPC and `/api/leads` compatibility facade verified locally; all four tables empty after tests
- Phase 5G: not started

## 13. Last updated date and handoff notes

**Last updated:** 2026-10-13

### Handoff procedure for a new coding conversation

1. Read this file first.
2. Immediately verify the local repository before trusting the latest-status section:
   - branch
   - HEAD/tracking/live remote
   - working-tree cleanliness
   - latest migrations
   - local DB counts
   - latest backup
3. Read the current Phase 5F packet/manifest, the Vaud V1 private-home-care completeness manifest, the final home-care closure manifest, and the latest implementation documentation before writing data.
4. Never infer missing provider facts to satisfy expected row counts; stop and report a discrepancy instead.
5. Keep each data batch independently reversible and checkpointed.
6. Do not start a new major development phase merely because the previous batch passed; follow the explicit priority list above.
7. Current product strategy after Vaud data completeness: prioritize family lead capture and internal inquiry tracking, architected for a future secure multi-organization Partner Portal/CRM but without building that portal yet.
8. The Inquiry Foundation architecture, local schema foundation, `/api/leads` atomic intake compatibility path, and public V1 family form are complete. Read `docs/architecture/lia-inquiry-foundation.md` and `docs/architecture/lia-inquiry-foundation-schema-implementation.md` before proposing production deployment or internal workflow work.

### Facts that remain unresolved before the next development phase

- A separate Phase 5F completion-review artifact is still absent; the private-generalist gap itself is now reconciled and implemented in the dedicated completeness-cohort record.
- Verify the current Vercel project, public deployment URL, and deployment status using authorized project access.
- Verify production Supabase schema/migration state only under a separately authorized, read-only production audit; do not access production data merely to satisfy the handoff.
