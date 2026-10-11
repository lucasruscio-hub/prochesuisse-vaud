# LIA_PROJECT_STATE

> Permanent development handoff for the Lia repository.
> **Provenance:** earlier foundation details below are grounded in the project master handoff. The current-state sections were audited on 2026-10-11 against the repository, the live Git remote, the running local Supabase database, and the attached SSD backup. Historical claims remain labeled as reported where primary evidence was not re-created during this audit. No secrets, credentials, API keys, or customer data belong in this file.

## 0. State classification and 2026-10-11 audit snapshot

### Verified current repository facts

- Working copy: `C:\Users\lucas\Lia-vaud`; branch: `marketplace-mvp`.
- Local HEAD, `origin/marketplace-mvp`, and live `refs/heads/marketplace-mvp` all resolve to `a27faf198915710b4bb40bb5c1104a7494668bd2` (`Implement Phase 5F Batch F Altoan home support`).
- The working tree contains only this untracked handoff file. Batch F is committed and present on the live remote branch.
- The repository contains six migration files through `20260928000100_phase5f_home_care_identity_foundation.sql`; see section 4.
- All explicit repository paths referenced by this document were found. The `docs/research/phase5f-batch-*.md` reference is a glob and matches the committed batch records, including Batch F.
- The runnable repository test set is 37 `tests/*.test.mjs` files and currently passes **188/188**. Repository-wide ESLint currently fails with two `react-hooks/set-state-in-effect` errors in `app/recherche/RechercheClient.js` and reports two `@next/next/no-img-element` warnings in `app/page.js`.

### Verified current local-database facts

- The guarded local target is the running `Lia-vaud` Supabase container on host port `54322`; no production database was accessed.
- Batch F is applied locally: Altoan/Altoan SA exist, exactly one offering has type `home_support`, and the verified table counts are recorded in section 5.
- The local schema contains all 16 expected public tables, including the Phase 5F foundation tables. The Supabase migration ledger records only `20260920000100 provider_foundation`; therefore later schema state is verified from the actual objects and guarded local verifiers, not from complete ledger history.

### Historical facts

- Phase and milestone summaries in sections 4–6 describe earlier completed work. Batch F at commit `a27faf1` is the latest committed and pushed implementation milestone; the earlier Batch E checkpoint remains in history at `7af12b5`.
- Backup #25 remains the newest backup present on the SSD and captures the earlier Batch D commit, not the current repository or local database state.

### Planned work

- Perform and document the Phase 5F completion review before authorizing any Phase 5G work.
- Assess whether Vaud V1 home-care coverage is sufficient and which remaining holds are launch-critical, without starting enrichment.
- Continue with the supply-completeness and product priorities in section 9 only after the current checkpoint is deliberately closed.

### Unresolved or deliberately unverified

- No Phase 5F completion-review artifact was found; the implementation batches are locally complete through F, but Phase 5F as a reviewed/checkpointed phase is not yet closed.
- Phase 5G has not started: no Phase 5G path exists, the manifest still has `phase5gAuthorized: false`, and the local counts remain the Batch F minimum state.
- Current Vercel project, public URL, and deployment status could not be verified from repository metadata or public evidence.
- Production Supabase schema/data state was not checked because production data access was prohibited for this audit.

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

The current local `public` schema was verified to contain: `providers`, `provider_sources`, `municipalities`, `provider_service_areas`, `organizations`, `organization_sources`, `organization_names`, `organization_relationships`, `provider_names`, `provider_identity_links`, `provider_organizations`, `care_offerings`, `care_offering_sources`, `care_offering_features`, `care_offering_availability`, and `care_offering_regulatory_designations`.

Important migration-ledger caveat: `supabase_migrations.schema_migrations` currently records only `20260920000100 provider_foundation`. Later migration files are present and their resulting schema is present locally, but their application was not recorded in that ledger. Future migration work must not assume the ledger alone describes the local schema.

**Local database target used throughout Phase 4/5:** `Lia-vaud:local:54322` / local Supabase container. Production access has repeatedly been prohibited during these phases.

## 5. Provider-data coverage and latest verified counts

### Verified local counts after Phase 5F Batch F

Read-only verification against the guarded local container on 2026-10-11 returned:

- Providers: **123**
- CMS providers: **50**
- Organizations: **43**
- Provider sources: **195**
- Organization sources: **21**
- Organization names: **4**
- Organization relationships: **7**
- Provider names: **3**
- Provider-organization links: **141**
- Care offerings: **90**
- Offering sources: **111**
- Provider identity links: **51**
- Regulatory designations: **56**
- Features: **84**
- Availability rows: **0**
- Service-area rows: **4**
- `home_support` offerings: **1**
- Held provider slugs checked by the Batch F verifier: **0 present**

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

**Verified stopping point (2026-10-11):** Phase 5F Batch F has been implemented, applied and verified in local Supabase, committed, and pushed. The Phase 5F completion review has not been documented, and Phase 5G has not started.

Latest committed and pushed Batch F commit:

`a27faf198915710b4bb40bb5c1104a7494668bd2`

Commit message:

`Implement Phase 5F Batch F Altoan home support`

Historical final Batch E checkpoint:

- full runnable suite: **183/183 passed**
- working tree clean
- local HEAD = tracking HEAD = live remote HEAD
- production Supabase not accessed

Current verified Batch F state:

- local database: applied and verified with the exact 8-row Altoan plan;
- repository implementation: committed and pushed (`implementation-manifest.json`, two Batch F records, Batch F library/script/test);
- runnable suite including Batch F: **188/188 passed**;
- repository-wide lint: **2 errors and 2 warnings**, all in the previously reported files;
- production Supabase: not accessed;
- Git checkpoint: Batch F at `a27faf1` locally, in the tracking ref, and on the live remote.

**Next intended Phase 5F action:** perform and document the Phase 5F completion review. Do not reimplement or reapply Batch F.

Do **not** start Phase 5G automatically after Batch F. First assess whether home-care coverage is already sufficient for Vaud V1 and which remaining research holds are launch-critical.

## 8. Outstanding issues, held records, and blockers

### Home-care / private-provider holds remaining after Batch F

- AMAD Yverdon — operator/authorization unresolved
- Vivradom — shared-brand entity/corporate relationship/coverage allocation unresolved
- Dovida — unnamed partner agency unresolved
- Dovida — Crissier street-address/registered-branch status unresolved
- Dovida — municipality coverage unresolved
- Nurse Home Care provider — provider-level authorization/public-name evidence still held
- SoinVaud/Soinsvaud provider — provider authorization/public-name evidence still held
- Soinsvaud trading alias — held pending provider identity resolution
- Sciensus provider — unresolved Vaud authorization basis
- CP Alexandra provider — unresolved authorization + operating-unit public name
- CPSE Alexandra `legal_name` — current register evidence not yet attached
- Vevey structured service area — missing reconciled municipality/BFS identity

### Product/data completeness blockers before Vaud launch

- final Vaud EMS universe completeness audit, especially private/commercial EMS
- complete Vaud senior-residence universe discovery + implementation
- first-time-family UX review of homepage/search/provider pages
- family lead-capture flow
- internal inquiry tracking / Lia-side CRM-lite
- launch QA and feedback loop

### Known code-quality items reported earlier

Verified on 2026-10-11: repository-wide lint still fails with two `react-hooks/set-state-in-effect` errors in `app/recherche/RechercheClient.js` (lines 102 and 152) and reports two `@next/next/no-img-element` warnings in `app/page.js` (lines 173 and 844). These remain pre-existing, out-of-scope code-quality items and were not changed during this audit.

## 9. Next three development tasks in priority order

### 1. Finish Phase 5F cleanly

- Perform and document the Phase 5F completion review.
- Assess whether current Vaud V1 home-care coverage is sufficient and identify only launch-critical holds.
- Preserve the verified `home_support` modeling and exact 8-row Altoan scope; do not repeat Batch F writes without a specific reason.
- Keep Phase 5G unauthorized until the completion review is accepted.

### 2. Finish Vaud supply completeness

- Final EMS universe/completeness pass, with private/commercial EMS prioritized commercially but all legitimate supply represented.
- Build the real Vaud senior-residence/protected-living universe, resolve identities, and implement trustworthy V1 listings.
- Confirm home-care supply is sufficiently complete for launch; do not over-enrich every record before user testing.

### 3. Build family lead capture + internal inquiry tracking

V1 goal:

`family request -> private Lia inquiry -> internal review/matching -> provider contact -> outcome tracking`

Architect now so a secure Partner Portal/CRM can be added later, but **do not implement the Partner Portal/CRM product yet**.

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

Current verified runnable suite after the committed Batch F implementation:

**188 passed, 0 failed** across 37 `tests/*.test.mjs` files.

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

Latest backup present on the SSD and rechecked read-only on 2026-10-11:

`D:\Lia-backups\Lia-backup-25_2026-10-07_phase5f-batch-d-private-structures`

Backup #25 is still the newest directory present. Its Git checkout is clean at `f66fbcdd7c6aeaedc7922e18d418021193c40e3a` (`feat: apply phase 5f batch d3 dovida`), and `git fsck --full --strict` completed without corrupt-object errors (it reported dangling trees only). It contains 385 files totaling 8,702,595 bytes. It is **not current** for Batch E, Batch F, this handoff, or the present local database; no newer verified backup was found.

### Deployment

Historical handoff information says Vercel exists, but this audit found no `.vercel` project metadata, deployment configuration, confirmed public URL, or public deployment evidence. The current Vercel project/status therefore remains unresolved. The live Git branch was verified at the Batch E commit. Production Supabase was not accessed, so its schema/data state relative to local is also unresolved. Before any deployment/promotion:

- verify current Vercel/project state
- verify production schema/migration gap
- define an explicit production migration/data-promotion plan
- never copy local Phase 5F data blindly to production
- re-run launch QA on homepage, search, provider detail pages, lead capture, legal/privacy pages

## 12. Last verified Git branch, commit, and working-tree state

**Verified on 2026-10-11:**

- Branch: `marketplace-mvp`
- HEAD: `a27faf198915710b4bb40bb5c1104a7494668bd2`
- Commit message: `Implement Phase 5F Batch F Altoan home support`
- Local HEAD = tracking HEAD = live remote HEAD
- Working tree: only untracked `LIA_PROJECT_STATE.md` before its dedicated handoff commit; Batch F is cleanly committed
- Production Supabase: not accessed; current production state unresolved
- Batch F: applied and verified locally, committed, and present on the live remote
- Phase 5G: not started

## 13. Last updated date and handoff notes

**Last updated:** 2026-10-11

### Handoff procedure for a new coding conversation

1. Read this file first.
2. Immediately verify the local repository before trusting the latest-status section:
   - branch
   - HEAD/tracking/live remote
   - working-tree cleanliness
   - latest migrations
   - local DB counts
   - latest backup
3. Read the current Phase 5F packet/manifest and latest batch documentation before writing data.
4. Never infer missing provider facts to satisfy expected row counts; stop and report a discrepancy instead.
5. Keep each data batch independently reversible and checkpointed.
6. Do not start a new major development phase merely because the previous batch passed; follow the explicit priority list above.
7. Current product strategy after Vaud data completeness: prioritize family lead capture and internal inquiry tracking, architected for a future secure multi-organization Partner Portal/CRM but without building that portal yet.

### Facts that remain unresolved before the next development phase

- Complete and document the Phase 5F completion review.
- Reconcile the incomplete local Supabase migration ledger before using ledger state to plan future migrations; do not reset or reapply migrations casually because the schema/data are already present.
- Create and verify backup #26 at the requested Batch F + handoff checkpoint; Backup #25 is currently the newest present but is behind both Batch E and Batch F.
- Verify the current Vercel project, public deployment URL, and deployment status using authorized project access.
- Verify production Supabase schema/migration state only under a separately authorized, read-only production audit; do not access production data merely to satisfy the handoff.
