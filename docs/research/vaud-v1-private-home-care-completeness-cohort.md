# Vaud V1 private-home-care completeness cohort

Date: 2026-10-12

Repository predecessor: `1bc680fb1af3cfd248a2844774eaa04cbee7ac4e` on `marketplace-mvp`

Status: implemented and verified only in the guarded `Lia-vaud:local:54322` Supabase database. Production was not accessed. This is a Vaud V1 supply-completeness cohort, not Phase 5G enrichment.

## Evidence and decision rule

The review used the final Phase 5E reconciled workbook, the Phase 5F identity-resolution report, the Phase 5F packets and implementation manifest, the Phase 5F A–F implementation records, and the verified local database. The primary authorization evidence is the uploaded Canton OSAD workbook dated 2 March 2026, represented in the Phase 5E workbook's `Official OSAD Raw` and `Reconciled Private Universe` sheets. The workbook was reconciled on 28 September 2026.

The dated official-file row supports a minimum medical `home_care` offering and a dated `vd_osad_official_list` designation. It does not establish current status after 2 March 2026, effective or expiry dates, an issuing organization identity, LAMal status, reimbursement, public-interest status, service coverage, services/features, languages, availability, capacity, or prices.

Every organization row uses the evidenced operator/organization name but leaves `legal_name` null. This cohort contains no independently reviewed current commercial-register extract for these identities. Patient-facing contact addresses remain office/contact facts and do not create service-area rows.

## Reconciliation

| Canonical public provider | Existing Lia match | Evidenced organization/operator | Patient-facing identity | Official-file evidence | Offering | Source evidence available | Safe now | Unresolved issue retained | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Monde PatientS | None | 1 Monde PatientS, société coopérative | 1 Monde PatientS at Epautheyres | Listed as `1 Monde PatientS`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | `legal_name` not independently register-verified; coverage and broader regulatory facts unknown | Create |
| C-VITAL | None | C-VITAL Sàrl | C-VITAL at Oron-la-Ville | Listed as `C-Vital Sàrl`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | Same evidence limits | Create |
| OSAD Helvetia | None | OSAD Helvetia Sàrl | OSAD Helvetia at Bex | Listed as `Helvetia Sàrl OSAD`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | Same evidence limits | Create |
| Home Assistance | None | Home Assistance Sàrl | Home Assistance at Lausanne | Listed as `Home Assistance Sàrl`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | Same evidence limits | Create |
| Hygie-Soins | None | Hygie-Soins Sàrl | Hygie-Soins at Lucens | Listed as `Hygie-Soins Sàrl`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | Same evidence limits | Create |
| La Source à domicile | None | La Source à domicile Sàrl | La Source à domicile at Lausanne | Listed as `La Source à domicile Sàrl`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | Same evidence limits; alias dates unknown | Create; preserve `UniQue Care` and `Unique Soins à domicile` as unpublished historical aliases |
| Les Soins Volants | None | Les Soins Volants Sàrl | Les Soins Volants at Clarens | Listed as `Les Soins Volants Sàrl`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | Same evidence limits | Create |
| MSG Soins | None | MSG Soins Sàrl | MSG Soins at Chailly-Montreux | Listed as `MSG Soins Sàrl`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | Same evidence limits | Create |
| Ô Santé | None | Ô Santé Sàrl | Ô Santé at Poliez-Pittet | Listed as `Ô Santé Sàrl`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | Same evidence limits | Create |
| Proxi-Soins | None | Proxi-Soins Sàrl | Proxi-Soins at Préverenges | Listed as `PROXI-SOINS Sàrl`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | Directory address differences remain irrelevant to the official-file contact row; coverage remains unknown | Create |
| La-solution.ch | None | Saraï, La-solution.ch SA | La-solution.ch at Montagny-près-Yverdon | Listed as `Saraï, La-solution.ch SA`, 2026-03-02 | `home_care` | Canton row + Phase 5E public-brand/operator resolution | Yes | `legal_name` not independently register-verified; network topology and coverage unknown | Create |
| Soins Riviera | None | Soins Riviera Sàrl | Soins Riviera at Clarens | Listed as `Soins Riviera Sàrl`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | Same evidence limits | Create |
| Swiss Agi San | None | Swiss Agi San Sàrl | Swiss Agi San at Aigle | Listed as `Swiss Agi San Sàrl`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | Same evidence limits | Create |
| Val'Soins | None | Val'Soins Sàrl | Val'Soins at Le Sentier | Listed as `Val'Soins Sàrl`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation | Yes | Same evidence limits; no website is asserted | Create |
| Swisscaring Vaud | Existing `swisscaring` provider | Swisscaring Vaud Sàrl | Swisscaring Vaud at Le Mont-sur-Lausanne | Listed as `Swisscaring Vaud SARL`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation + existing local row | Yes | Same evidence limits | Update the existing provider; create organization/evidence/offering structure |
| La Boîte O Services | Existing `boite-o` provider | La Boîte O Services Sàrl | La Boîte O Services at Perroy | Listed as `La Boîte O Services Sàrl`, 2026-03-02 | `home_care` | Canton row + Phase 5E canonical reconciliation + existing local row | Yes | Relationship to La Réponse Sàrl remains unresolved and is not asserted | Update the existing provider; create organization/evidence/offering structure |

All 16 scoped identities are safe for this minimum implementation. No scoped identity is held. La Réponse Sàrl remains an external relationship/authorization hold and was not created, linked, or otherwise changed.

## Canonical implementation result

The implementation preserves:

`organization → provider/site → care offering → evidence`

Each identity has one unpublished, unverified organization; one unpublished, unverified patient-facing provider; one primary operator link; one unpublished, unverified `home_care` offering; and one unpublished dated authorization observation. The two legacy providers retain their UUIDs, slugs, legacy IDs, original tags, and original location text. Fourteen provider rows are new.

Exact changes by table:

| Table | Creates | Updates | Deletes | Net rows |
| --- | ---: | ---: | ---: | ---: |
| `organizations` | 16 | 0 | 0 | +16 |
| `organization_sources` | 16 | 0 | 0 | +16 |
| `providers` | 14 | 2 | 0 | +14 |
| `provider_sources` | 16 | 0 | 0 | +16 |
| `provider_names` | 2 | 0 | 0 | +2 |
| `provider_organizations` | 16 | 0 | 0 | +16 |
| `care_offerings` | 16 | 0 | 0 | +16 |
| `care_offering_sources` | 16 | 0 | 0 | +16 |
| `care_offering_regulatory_designations` | 16 | 0 | 0 | +16 |
| `provider_service_areas` | 0 | 0 | 0 | 0 |
| `care_offering_features` | 0 | 0 | 0 | 0 |
| `care_offering_availability` | 0 | 0 | 0 | 0 |
| **Total** | **128** | **2** | **0** | **+128** |

No municipality, canton-wide service area, generic service feature, availability, capacity, language, price, financing, reimbursement, LAMal, public-interest, or partnership row was added.

## Guarded local execution and verification

The implementation ran only through the pinned local-container guard for `Lia-vaud:local:54322`:

1. Rollback-only dry run: passed; database state and full fingerprint returned exactly to the predecessor.
2. Apply: passed with the exact 128-row plan.
3. Verify: passed.
4. Rollback: passed.
5. Exact predecessor comparison: passed, including the two updated providers' complete before-images and timestamps.
6. Reapply: passed.
7. Final independent verification: passed.

Unchanged fingerprints were proven for all non-target rows and specifically for all 50 CMS, all EMS, Senevita, AMAD/Vivradom/Dovida/Home Instead, Batch E specialists and organizations, Altoan, and the monitored held identities.

Final local counts after reapply:

| Table/state | Count |
| --- | ---: |
| Providers | 137 |
| CMS providers | 50 |
| Organizations | 59 |
| Provider sources | 211 |
| Organization sources | 37 |
| Organization names | 4 |
| Organization relationships | 7 |
| Provider names | 5 |
| Provider-organization links | 157 |
| Care offerings | 106 |
| Offering sources | 127 |
| Provider identity links | 51 |
| Regulatory designations | 72 |
| Features | 84 |
| Availability rows | 0 |
| Service-area rows | 4 |
| `home_support` offerings | 1 |

The cohort itself has 16 providers, 16 organizations, 16 `home_care` offerings, 16 dated designations, two historical aliases, and zero service-area, feature, or availability rows. Every cohort provider and organization remains unpublished and unverified.

## Evidence limitations

- The official file is a dated positive observation, not a timeless authorization assertion.
- The organization names are evidenced, but `legal_name` remains null without separately reviewed current register evidence.
- Contact locations do not establish service coverage.
- Regional-network appearances were discovery/reconciliation support only; they were not converted into service areas or partnership/network facts.
- La Boîte O's relationship to La Réponse remains unresolved.
- La Source's historical aliases have no evidenced validity dates.
- No enrichment was started.
