# Phase 5F Batch B4 — ASANTE SANA CMS

Date: 2026-10-04. Status: applied and verified in local Supabase only. Production was not accessed.

## Exact write set

| Table | Expected | Actual |
| --- | ---: | ---: |
| `providers` | 10 | 10 |
| `provider_sources` | 10 | 10 |
| `provider_organizations` | 21 | 21 |
| `care_offerings` | 10 | 10 |
| `care_offering_sources` | 10 | 10 |
| `provider_identity_links` | 10 | 10 |
| `care_offering_regulatory_designations` | 10 | 10 |
| **Net-new rows** | **81** | **81** |

The canonical identities are CMS Chaussy, CMS Clarens, CMS de la Grande-Eau, CMS de la Gryonne, CMS La Tour-de-Peilz, CMS Montreux, CMS Rennaz, CMS Vevey Est, CMS Vevey Ouest, and CMS Pays-d’Enhaut.

The first nine use ASANTE SANA as primary `operator` and AVASAD as non-primary `network`. CMS Pays-d’Enhaut uses Pôle Santé du Pays-d'Enhaut as primary `operator`, plus ASANTE SANA and AVASAD as non-primary `network` relationships. Network membership is never modeled as ownership.

Every CMS is unpublished/unverified and receives only one sourced minimum `home_care` offering, one unpublished `cms` classification, and one `split_into` link from archived `avasad-cms`. No service area, feature, availability, address, capacity, language, price, public-interest, or unsupported regulatory fact was added.

## Rollback and compatibility

The dry-run inserted all 81 rows and restored the exact pre-B4 state. The committed apply/verify/rollback/reapply cycle also restored the exact 86-provider state before reapplying B4.

| Check | Result |
| --- | --- |
| Providers | 86 → 96 |
| Earlier CMS | unchanged at 20 |
| B4 CMS | 0 → 10 |
| Later CMS | unchanged at 0 |
| Provider organizations | 72 → 93 |
| Offerings / offering sources | 52 → 62 / 73 → 83 |
| Identity links / designations | 20 → 30 / 20 → 30 |
| EMS fingerprint | `b8756e81599062f1091dc7ee64359653` |
| Non-target domicile fingerprint | `153f50c79913cd0b3f47646cbf82ecb2` |
| Organization structure fingerprint | `a560941fcdcdd1f6115dcfa9e9a6d605` |
| Earlier CMS fingerprint | `d4edb51da013b778c53ad3408e045737` |
| Unrelated-data fingerprint | `c3314dac6787b4022f078111a7e119ee` |
| Senevita projection | unchanged |

## Validation

- deterministic B4 tests: 6 passed;
- guarded local dry-run and exact rollback: passed;
- committed apply/rollback/reapply cycle: passed;
- final local and Phase 5F successor-state verification: passed;
- Phase 5F tests: 39 passed;
- full runnable test suite: 149 passed;
- targeted ESLint and `git diff --check`: passed;
- production Supabase was not accessed.
