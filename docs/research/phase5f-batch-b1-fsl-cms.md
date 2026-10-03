# Phase 5F Batch B1 — Fondation Soins Lausanne CMS

Date: 2026-10-03. Status: applied and verified in local Supabase only. Production was not accessed. No APROMAD, APREMADOL, ASANTE SANA, ABSMAD, Fondation de La Côte, ASPMAD, private OSAD, or Phase 5G data was written.

## Authorized scope and target

The implementation uses only the `B-FSL` manifest subset and the canonical AVASAD/CMS packet. The guarded writer accepted project `Lia-vaud`, workspace `C:\Users\lucas\Lia-vaud`, container `supabase_db_Lia-vaud`, host port `54322`, PostgreSQL 17, through the container Unix socket. It does not load application environment variables, Supabase credentials, a database URL, or a production endpoint.

The manifest and actual write counts matched exactly:

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

Zero service areas, service features, availability rows, provider/organization names, organizations, organization sources, or organization relationships were created or updated.

## Canonical patient-facing identities

| Provider | Slug | Stable ID |
| --- | --- | --- |
| CMS Ancien-Stand | `cms-ancien-stand` | `7bfb9b9f-cc05-5ccf-ac50-2cdb74b27a83` |
| CMS Centre-Ville | `cms-centre-ville` | `336c0d59-60fa-5793-a445-d7255817961c` |
| CMS Chailly-Sallaz | `cms-chailly-sallaz` | `281c2c3e-2e9c-58d2-a382-9e5b1fcdd8a6` |
| CMS Montelly | `cms-montelly` | `e8e25e81-1436-5f15-a41f-8dd5ba0d48fb` |
| CMS Ouchy | `cms-ouchy` | `9919bfba-7e1a-50ab-a7d1-18e2d3013323` |
| CMS des Peupliers | `cms-des-peupliers` | `4d970550-7fb7-573c-a6c9-8091c7f88be9` |
| CMS Riponne | `cms-riponne` | `db6e3c4b-d7f4-5e54-abb0-c831ef7844d0` |
| CMS Valency | `cms-valency` | `0a4e66eb-289c-58e6-ae9c-3cfb955f0beb` |

Every provider has `primary_type = domicile`, remains active but unpublished and unverified, and has unknown/null address, municipality, canton, coordinates, contact details, website, description, availability, capacity, languages, and service codes.

## Relationships, offerings, and evidence

Each CMS has exactly two sourced organization links:

- Fondation Soins Lausanne: `operator`, primary;
- AVASAD: `network`, non-primary.

No owner or brand relationship was inferred. Fondation Soins Lausanne and AVASAD remain organization-only identities. Batch A's organization hierarchy was not changed.

Each CMS has one minimum `home_care` offering named `Aide et soins à domicile`, unpublished and unverified. No feature rows were added. Each offering has one `care_offering_sources` row.

Each CMS owns one private `provider_sources` row representing the approved canonical packet. Its notes retain all upstream provenance: the official FSL CMS directory for the patient-facing identity, plus the Vaud authority page and Phase 5E workbook for the CMS classification. This gives 8 provider evidence rows and 8 offering-evidence links.

Each offering has one unpublished classification row with scheme `vd_home_care_provider_class`, code `cms`, exact label `centres médico-sociaux`, jurisdiction `CH-VD`, and observation date 2026-10-02. Issuer, designation status, effective date, and expiry date remain null.

The archived legacy `avasad-cms` umbrella provider has one `split_into` identity link to each CMS. The successor CMS owns the evidence for its link; no facts are inherited from the legacy provider.

## Rollback and final state

The required transaction rollback dry run inserted all 64 planned rows and returned the exact pre-B1 snapshot. The committed write cycle then:

1. applied all 64 rows;
2. checked counts, identities, relationships, evidence ownership, RLS invisibility, unknown fields, and compatibility fingerprints;
3. deleted only the deterministic B1 rows in reverse dependency order;
4. restored the exact pre-B1 state;
5. reapplied the validated B1 data locally.

Rollback result: exact pre-B1 restoration passed. Final state: B1 is reapplied locally.

## Compatibility verification

| Check | Result |
| --- | --- |
| Providers | 66 → 74 |
| Target FSL CMS providers | 0 → 8 |
| Other `cms-*` providers | unchanged at 0 |
| Provider sources | 136 → 144 |
| Provider-organization rows | 32 → 48 |
| Care offerings | 32 → 40 |
| Offering sources | 53 → 61 |
| Provider identity links | 0 → 8 |
| Regulatory designations | 0 → 8 |
| Organizations / sources / hierarchy | unchanged at 30 / 8 / 7 |
| Offering features | unchanged at 84 |
| Availability rows | unchanged at 0 |
| Service areas | unchanged at 1 |
| Municipalities | unchanged at 0 |
| `home_support` offerings | unchanged at 0 |
| 31-EMS fingerprint | unchanged: `b8756e81599062f1091dc7ee64359653` |
| Non-target domicile fingerprint | unchanged: `153f50c79913cd0b3f47646cbf82ecb2` |
| Batch A structure fingerprint | unchanged: `30c2128ca365168525c9f682821f6530` |
| Unrelated provider hash | unchanged: `483aef15fc51bac807d86fd7639ae007` |
| Unrelated provider-source hash | unchanged: `9b632b3bef1a642e49d071de6dbc3477` |
| Unrelated provider-organization hash | unchanged: `184d4f8c1b36e67eeb015c99f6fecfca` |
| Unrelated offering hash | unchanged: `140fc07892f4e3946db5fadacb601f9f` |
| Unrelated feature hash | unchanged: `11265ecdc1e2ddb6dbe9959de7de8138` |
| Unrelated offering-source hash | unchanged: `023e78b468552f7e244d423878a57cd2` |
| Unrelated service-area hash | unchanged: `d84e558828159e0331c5ed4771406deb` |
| Senevita projection | unchanged: Senevita AG; 1 offering; 10 services; 1 care profile; `dans la région de Vaud` |

## Validation

- deterministic B1 tests: 6 passed;
- Phase 5F test files: 18 passed;
- Phase 5F local schema/data verifier: passed in the applied B1 state without mutation;
- full runnable `tests/*.test.mjs` suite: 128 passed, 0 failed;
- targeted ESLint: passed;
- `git diff --check`: passed;
- rollback dry run and committed rollback: exact restoration passed;
- guarded final-state verification: passed;
- production Supabase was not accessed.
