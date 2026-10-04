# Phase 5F Batch B3 — APREMADOL CMS

Date: 2026-10-03. Status: applied and verified in local Supabase only. Production was not accessed. B4–B7, private OSAD, and Phase 5G data remain untouched.

## Exact write set

The canonical `B-APREMADOL` manifest subset requires and received exactly:

| Table | Expected | Actual |
| --- | ---: | ---: |
| `providers` | 4 | 4 |
| `provider_sources` | 4 | 4 |
| `provider_organizations` | 8 | 8 |
| `care_offerings` | 4 | 4 |
| `care_offering_sources` | 4 | 4 |
| `provider_identity_links` | 4 | 4 |
| `care_offering_regulatory_designations` | 4 | 4 |
| **Net-new rows** | **32** | **32** |

No organization, service-area, feature, availability, name, or existing row changed.

## Canonical identities

| Provider | Slug | Stable ID |
| --- | --- | --- |
| CMS de Bussigny et Villars-Ste-Croix | `cms-bussigny-villars-ste-croix` | `0d3040da-edc3-5bad-a2f9-487e2bc9c69a` |
| CMS d’Ecublens, Saint-Sulpice et Chavannes-près-Renens | `cms-ecublens-saint-sulpice-chavannes` | `011f05fe-c107-5294-a803-a4c8cd6ee6ae` |
| CMS de Renens Nord-Crissier | `cms-renens-nord-crissier` | `c4017e72-de09-5a06-a971-0e2ce32d5d0a` |
| CMS Renens Sud | `cms-renens-sud` | `f435ec72-e347-58bd-a811-ac0114d94990` |

Each site is an unpublished/unverified `domicile` provider with APREMADOL as primary `operator`, AVASAD as non-primary `network`, one minimum unpublished/unverified `home_care` offering, one provider evidence row, one offering-evidence row, one unpublished `cms` classification, and one `split_into` link from archived `avasad-cms`.

All unsupported location, coverage, services, availability, capacity, language, pricing, public-interest, and regulatory fields remain empty or null.

## Rollback and compatibility

The rollback-only dry run inserted all 32 planned rows and restored the exact pre-B3 state. The committed cycle applied B3, verified it, rolled back only deterministic B3 rows in reverse dependency order, proved exact restoration of the 82-provider B2 state, and reapplied B3.

| Check | Result |
| --- | --- |
| Providers | 82 → 86 |
| Earlier CMS | unchanged at 16 |
| B3 CMS | 0 → 4 |
| Later CMS | unchanged at 0 |
| Provider sources | 152 → 156 |
| Provider-organization rows | 64 → 72 |
| Offerings / offering sources | 48 → 52 / 69 → 73 |
| Identity links / designations | 16 → 20 / 16 → 20 |
| Features / availability / service areas | unchanged at 84 / 0 / 1 |
| EMS fingerprint | `b8756e81599062f1091dc7ee64359653` |
| Non-target domicile fingerprint | `153f50c79913cd0b3f47646cbf82ecb2` |
| Batch A structure fingerprint | `30c2128ca365168525c9f682821f6530` |
| Earlier CMS fingerprint | `8d2fba5ad9c643f73d7a90d0440203e7` |
| Unrelated-data fingerprint | `8d75dae120470cc0c766462f2b46fd6b` |
| Senevita projection | unchanged: Senevita AG; 1 offering; 10 services; 1 care profile; `dans la région de Vaud` |

## Validation

- deterministic B3 tests: 5 passed;
- guarded local dry run: passed with exact rollback;
- committed apply/rollback/reapply cycle: passed;
- final local verification: passed;
- Phase 5F tests: 29 passed;
- full runnable test suite: 139 passed;
- targeted ESLint: passed;
- `git diff --check`: passed;
- production Supabase was not accessed.
