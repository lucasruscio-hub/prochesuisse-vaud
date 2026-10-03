# Phase 5F Batch B2 — APROMAD CMS

Date: 2026-10-03. Status: applied and verified in local Supabase only. Production was not accessed. No APREMADOL, ASANTE SANA, ABSMAD, Fondation de La Côte, ASPMAD, private OSAD, or Phase 5G data was written.

## Scope, structure, and target

The implementation uses only the `B-APROMAD` manifest subset and the canonical AVASAD/CMS packet. Its expected structure exactly matches the validated B1 pattern, so no manifest correction was required. The only changes are the canonical provider identities, APROMAD as primary operator, and APROMAD-specific packet evidence.

The guarded writer accepted only project `Lia-vaud`, workspace `C:\Users\lucas\Lia-vaud`, container `supabase_db_Lia-vaud`, host port `54322`, PostgreSQL 17, through the container Unix socket. It cannot accept a production target and does not load application environment variables, Supabase credentials, or a database URL.

| Table | Operation | Expected | Actual |
| --- | --- | ---: | ---: |
| `providers` | create | 8 | 8 |
| `provider_sources` | create | 8 | 8 |
| `provider_organizations` | create | 16 | 16 |
| `care_offerings` | create | 8 | 8 |
| `care_offering_sources` | create | 8 | 8 |
| `provider_identity_links` | create | 8 | 8 |
| `care_offering_regulatory_designations` | create | 8 | 8 |
| **Net-new rows** |  | **64** | **64** |

Zero organizations, organization sources/relationships, service areas, service features, availability rows, provider/organization names, or existing rows were created or changed.

## Canonical patient-facing identities

| Provider | Slug | Stable ID |
| --- | --- | --- |
| CMS de Cully | `cms-cully` | `610277b3-ca41-5e86-a5f5-ff2ad4d1ebb6` |
| CMS d’Echallens | `cms-echallens` | `da98e7b0-58b6-549d-a71c-caa3ee44085a` |
| CMS d’Epalinges | `cms-epalinges` | `a555d313-27d5-55a2-abb2-7fcf57fd7f91` |
| CMS du Mont | `cms-du-mont` | `387b79ea-ebc2-5bb7-a240-10976014694a` |
| CMS d’Oron | `cms-oron` | `ab643c6a-3e1a-52df-a789-eca405a31652` |
| CMS de Prilly Nord | `cms-prilly-nord` | `f667e0f3-2d5b-5ce8-a770-8451ecc89eaf` |
| CMS de Prilly Sud | `cms-prilly-sud` | `50f72ef7-b63a-55e5-a6ae-b20f6d889099` |
| CMS de Pully | `cms-pully` | `ae1f5d23-ee3a-54c4-a3ac-84b59f0fdf3e` |

Every provider is an active `domicile` site but remains unpublished and unverified. Address, municipality, canton, coordinates, contact details, website, description, service codes, languages, availability, capacity, prices, and public-interest status remain unknown/null.

## Relationships, offerings, and evidence

Each provider has exactly two sourced organization relationships:

- APROMAD: primary `operator`;
- AVASAD: non-primary `network`.

No ownership or brand relation was inferred. Batch A's `AVASAD → APROMAD` organization-network structure remains unchanged.

Each CMS has one minimum unpublished/unverified `home_care` offering named `Aide et soins à domicile`, one private provider evidence row, and one offering-evidence row. The evidence notes retain the official APROMAD CMS directory for site identity plus the Vaud authority page and Phase 5E workbook for the CMS classification.

Each offering has one unpublished `vd_home_care_provider_class` classification with code `cms`, exact label `centres médico-sociaux`, jurisdiction `CH-VD`, and observation date 2026-10-02. Issuer, designation status, effective date, and expiry date remain null.

Each CMS has one `split_into` link from the archived `avasad-cms` umbrella provider. The successor owns its evidence and inherits no legacy facts.

## Rollback and final state

The rollback-only dry run exercised all 64 inserts and restored the exact pre-B2 state. The committed write cycle then applied B2, verified it, removed only deterministic B2 rows in reverse dependency order, proved exact restoration of the 74-provider B1 state, and reapplied the validated B2 dataset.

Rollback result: exact pre-B2 restoration passed. Final state: B2 is reapplied locally.

## Compatibility fingerprints

| Check | Result |
| --- | --- |
| Providers | 74 → 82 |
| B1 FSL CMS | unchanged at 8 |
| B2 APROMAD CMS | 0 → 8 |
| B3–B7 CMS | unchanged at 0 |
| Provider sources | 144 → 152 |
| Provider-organization rows | 48 → 64 |
| Care offerings | 40 → 48 |
| Offering sources | 61 → 69 |
| Identity links | 8 → 16 |
| Regulatory designations | 8 → 16 |
| Organizations / sources / hierarchy | unchanged at 30 / 8 / 7 |
| Features / availability / service areas | unchanged at 84 / 0 / 1 |
| 31-EMS fingerprint | `b8756e81599062f1091dc7ee64359653` |
| Non-target domicile fingerprint | `153f50c79913cd0b3f47646cbf82ecb2` |
| Batch A structure fingerprint | `30c2128ca365168525c9f682821f6530` |
| Complete B1 fingerprint | `9d7be47cddd130bb995f0137c86a9eb5` |
| Unrelated provider hash | `2ce29dc760db9dbe1aaaa3bed562bcd3` |
| Unrelated provider-source hash | `304d5bfc55cb2f07a479a8da6c9625f8` |
| Unrelated provider-organization hash | `11d14e353a5096e92f10c451fe5dedae` |
| Unrelated offering hash | `1f0212929103b28e9ee0dd7c6a46904b` |
| Unrelated feature hash | `11265ecdc1e2ddb6dbe9959de7de8138` |
| Unrelated offering-source hash | `cacfd08497c6504cfdfe1f242ee0c9ba` |
| Unrelated service-area hash | `d84e558828159e0331c5ed4771406deb` |
| Senevita projection | unchanged: Senevita AG; 1 offering; 10 services; 1 care profile; `dans la région de Vaud` |

## Validation

- deterministic B2 tests: 6 passed;
- Phase 5F test files: 24 passed;
- Phase 5F local schema/data verifier: passed in the applied B2 state without mutation;
- full runnable `tests/*.test.mjs` suite: 134 passed, 0 failed;
- targeted ESLint: passed;
- `git diff --check`: passed;
- rollback-only and committed rollback checks: exact restoration passed;
- guarded final-state verification: passed;
- production Supabase was not accessed.
