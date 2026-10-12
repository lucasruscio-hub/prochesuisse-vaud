# Vaud V1 home-care closure reconciliation

Prepared 2026-10-12 from the final Phase 5E reconciled workbook, the Phase 5F identity-resolution document and research holds, canonical packets, the local database, and repository-preserved evidence. This is a closure cohort, not Phase 5G enrichment.

| Candidate | Canonical provider name | Existing Lia match | Legal/operator identity evidenced | Offering | Authorization/designation evidence | Current repository evidence | Safe now | Unresolved issue | Action |
|---|---|---|---|---|---|---|---|---|---|
| Sitex | Sitex SA | `sitex` | Sitex SA name in the official row; legal status is not independently asserted | Specialist `home_care` | Dated Canton OSAD row, observed 2026-03-02 | Official/reconciled row with current Gland contact | Yes | None for the minimum specialist representation | Update existing provider; create organization, source, operator link, offering, evidence, designation |
| GRPTP | Groupe Romand Prévention Traitement Plaies (GRPTP) | None | Same-name operator identity in the reconciled official evidence; legal form unknown | Wound-care specialist `home_care` | Dated Canton OSAD row, observed 2026-03-02 | Official/reconciled row | Yes | None for the minimum specialist representation | Create |
| Ligue pulmonaire vaudoise | Ligue pulmonaire vaudoise | None | Same-name nonprofit operator identity; legal form unknown | Respiratory specialist `home_care` | Dated Canton OSAD row, observed 2026-03-02 | Official/reconciled row | Yes | None for the minimum specialist representation | Create |
| NOMàD | NOMàD | None | Fondation Espace | Psychiatric specialist `home_care` | Dated Canton OSAD row `NOMAD (Fondation Espace)`, observed 2026-03-02 | Official/reconciled row and Phase 5F dedupe decision | Yes | Exact official spelling is retained in the designation; no extra alias is asserted | Create |
| SBV Medical | SBV Medical | None | SBV Medical Sàrl name in official evidence; legal status is not independently asserted | Specialist `home_care` | Dated Canton OSAD row, observed 2026-03-02 | Official/reconciled row | Yes | Exact narrower specialty is not evidenced, so no service feature is created | Create |
| AMAD Yverdon | AMAD Homecare Yverdon | None; the two AMAD operator organizations and Lutry/Nyon sites already exist | Unknown between the two AMAD legal entities | Intended `home_care` | None for this site | Canonical AMAD packet and Phase 5F hold | No | Operator and authorization identity remain unresolved | Hold |
| Nurse Home Care | Nurse Home Care | Organization `nurse-home-care-sarl` only | Nurse Home Care Sàrl | Intended `home_care` | Regional Type-1 observation only; no reconciled current authorization basis | Canonical packet and Phase 5E workbook | No | Authorization basis and provider-owned current contact path absent | Hold; preserve organization-only record |
| SoinVaud / Soinsvaud | Unknown pending public-name resolution | Organization `soinvaud-sarl` only | SoinVaud Sàrl | Intended `home_care` | Regional Type-1 observation only; no reconciled current authorization basis | Canonical packet and Phase 5E workbook | No | Authorization, public name, and provider-owned contact evidence unresolved | Hold; preserve organization-only record |
| Sciensus | Sciensus | Organization `sciensus-ag` with historical HTHC name only | Sciensus AG | Intended specialist `home_care` | Regional Type-1 observation only; absent from dated Canton file | Canonical packet and Phase 5E workbook | No | Current Vaud authorization basis unresolved | Hold; preserve organization-only record |
| Alterum | Alterum | `alterum` | Not evidenced | Intended non-medical `home_support` | Not applicable; no OSAD designation asserted | Legacy row plus Phase 5F reconciliation conclusion | No | No preserved provider-owned/current evidence for present operation, contact identity, or operator | Hold; leave legacy row unchanged |
| Service d’aide familiale de Morges | Service d’aide familiale de Morges et environs | `aide-familiale-morges` | Association operator asserted in Phase 5F, but no underlying current source is preserved | Intended non-medical `home_support` | Not applicable; no OSAD designation asserted | Legacy row plus Phase 5F reconciliation conclusion | No | No preserved provider-owned/current evidence for present operation or association operator | Hold; leave legacy row unchanged |

## Canonical implementation manifest

Safe actions: four provider creates (GRPTP, Ligue pulmonaire vaudoise, NOMàD, SBV Medical) and one provider update (Sitex). Each implemented identity receives one organization, organization source, provider source, primary operator relationship, specialist `home_care` offering, offering source, and dated official-file designation. No provider aliases, service areas, features, or availability rows are created.

Expected database changes before writing:

| Table | Creates | Updates |
|---|---:|---:|
| `organizations` | 5 | 0 |
| `organization_sources` | 5 | 0 |
| `providers` | 4 | 1 |
| `provider_sources` | 5 | 0 |
| `provider_organizations` | 5 | 0 |
| `care_offerings` | 5 | 0 |
| `care_offering_sources` | 5 | 0 |
| `care_offering_regulatory_designations` | 5 | 0 |
| `provider_names` | 0 | 0 |
| `provider_service_areas` | 0 | 0 |
| `care_offering_features` | 0 | 0 |
| `care_offering_availability` | 0 | 0 |
| **Net new rows** | **39** | **1 provider row** |

All new and reconciled records remain unpublished and unverified. Office addresses are contact locations only. Municipality/canton-wide coverage, generic services, languages, prices, capacity, availability, reimbursement, LAMal status, public-interest status, and ownership/partnership relationships remain unknown.
