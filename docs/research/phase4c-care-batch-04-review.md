# Phase 4C.4 Vaud care enrichment batch #4 review

## Workbook scope

Source workbook: `source-material/Lia_Vaud_provider_master_audit_2026-09-21.xlsx`

SHA-256: `2f3e5ed512e7df196356d6f0f7d66df5f08fd7168b8c90f19c0f213ff27b4450`

The selected evidence uses `Master Audit` rows 5, 24, 27, 28 and 32 and `Deep Enrichment` rows 5, 15, 18, 19 and 22. Existing Phase 4B and Phase 4C evidence/canonical records were used only to exclude already processed providers and preserve their state. No web, Google or legacy-tag evidence was used.

The five previously held records below are now represented only as narrow care packets. The workbook itself separates establishment from operator for Boissonnet and Odysse, provides dedicated site pages for Pré Pariset and Pré de la Tour, and explicitly limits Les Trémières to the small set of currently supported facts. Provider/contact corrections, foundation-wide claims and unsupported service detail remain deferred.

## Approved for local apply planning

Human review approved all five packets exactly as proposed. Every packet has `localApply: true`, `publish: false` and `verify: false`.

| Repository slug | Establishment / identity | Operator | Offering / capacity | Stay modes | Care profiles | Services | Facilities | Admissions | Financing / RIP / pricing | Importable | Deferred | Conflicts | Readiness |
|---|---|---|---|---|---|---|---|---|---|---:|---:|---|---|
| `ems-boissonnet` | Boissonnet; official row separates establishment from foundation operator | Fondation Louis Boissonnet | EMS; 106 beds | All unknown | Unknown | Social activities; hairdressing | None imported | Unknown | Financing unknown; RIP unknown; pricing unknown | 5 | 9 | None | Approved for local apply planning |
| `ems-odysse` | Résidence Odysse; current establishment separated from corporate operator | Résidences Odysse SA | EMS; 53 beds | All unknown | Geriatric care | None imported | None imported | Unknown | Financing unknown; RIP unknown; pricing unknown | 4 | 5 | None | Approved for local apply planning |
| `ems-pre-pariset` | EMS Pré Pariset; dedicated current site identity | Fondation Pré Pariset | EMS; 82 beds | Long yes; short/respite unknown | Unknown | Podology; hairdressing; social activities | Terrace and park → `garden_or_park` | Unknown | Financing unknown; offering-scoped RIP recognized; pricing unknown | 9 | 10 | None | Approved for local apply planning |
| `ems-pre-tour` | EMS Pré de la Tour; dedicated current site identity | Fondation Pré Pariset | EMS; 50 beds | Long yes; short/respite unknown | Unknown | Social activities | Public restaurant Le Delta → `restaurant` | Unknown | Financing unknown; offering-scoped RIP recognized; pricing unknown | 7 | 10 | None | Approved for local apply planning |
| `ems-tremieres` | Résidence Les Trémières; current network directory matches repository establishment | Résidence Les Trémières SA | EMS; 28 beds | All unknown | Geriatric care | None imported | None imported | Unknown | Financing unknown; RIP unknown; pricing unknown | 4 | 6 | None | Approved for local apply planning |

### `ems-boissonnet`

- Workbook rows: `Master Audit!A5:J5`; `Deep Enrichment!A5:K5`.
- Establishment: `Boissonnet`, `Master Audit!E5`. The separate public provider name `Fondation Louis Boissonnet` at `Deep Enrichment!B5` remains an identity-workflow fact rather than changing the repository provider.
- Operator: `Fondation Louis Boissonnet`, `Master Audit!F5`.
- Offering and capacity: EMS at `Master Audit!E5`; 106 beds at `Master Audit!G5`.
- Stay modes: long, short and respite unknown.
- Care profiles: none imported. The legacy `Gériatrie` tag is not evidence.
- Services: `service.social_activities` and `service.hairdressing`, both from `Deep Enrichment!F5`.
- Facilities, admissions, financing, RIP/public-interest and pricing: unknown.
- Taxonomy mappings: `service.social_activities`; `service.hairdressing`.
- Sources: `Canton de Vaud — Liste officielle 2026 des établissements`, `Master Audit!I5`, `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`; `Fondation Louis Boissonnet`, `Deep Enrichment!H5`, `https://boissonnet.ch/`.
- Importable facts: 5.
- Deferred claims: public provider name `Fondation Louis Boissonnet` (`Deep Enrichment!B5`); address (`C5`); phone (`D5`); email (`E5`); 24/7 medico-social accompaniment (`F5`); generic nursing and medical services (`F5`); generic hotel services (`F5`); spiritual support (`F5`); legacy `Gériatrie` and `Soins palliatifs` tags.
- Conflicts: none. The establishment/operator distinction is preserved rather than flattened.
- Readiness: approved for local apply planning.

### `ems-odysse`

- Workbook rows: `Master Audit!A24:J24`; `Deep Enrichment!A15:K15`.
- Establishment: `Résidence Odysse`, `Deep Enrichment!B15`.
- Operator: `Résidences Odysse SA`, `Master Audit!F24`.
- Offering and capacity: EMS at `Master Audit!E24`; 53 beds at `Master Audit!G24`.
- Stay modes: long, short and respite unknown. The legacy `Court séjour` tag is not evidence.
- Care profile: `care_profile.geriatric_care`, `Deep Enrichment!F15`, supported by the regional directory referenced at `Master Audit!I24`.
- Services, facilities, admissions, financing, RIP/public-interest and pricing: unknown.
- Taxonomy mapping: `care_profile.geriatric_care`.
- Sources: `Canton de Vaud — Liste officielle 2026 des établissements`, shared workbook URL at `Master Audit!I44`, `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`; `Réseau Santé Région Lausanne — membres EMS`, `Master Audit!I24`, `https://www.reseau-sante-region-lausanne.ch/membres-ems/`; `Résidences Odysse — Résidence Odysse`, `Deep Enrichment!H15`, `https://www.odysse.ch/`.
- Importable facts: 4.
- Deferred claims: reviewed establishment name (`Deep Enrichment!B15`); address (`C15`); phone (`D15`); explicit limitation that the provider website is under construction and preserves no additional precise current service facts (`G15`); legacy `Gériatrie` and `Court séjour` tags.
- Conflicts: none. The establishment and operator identities remain distinct.
- Readiness: approved for local apply planning.

### `ems-pre-pariset`

- Workbook rows: `Master Audit!A27:J27`; `Deep Enrichment!A18:K18`.
- Establishment: `EMS Pré Pariset`, `Deep Enrichment!B18`.
- Operator: `Fondation Pré Pariset`, `Master Audit!F27`.
- Offering and capacity: EMS at `Master Audit!E27`; 82 beds at `Master Audit!G27`.
- Stay modes: long stay true from `Deep Enrichment!F18`; short and respite unknown.
- Care profiles: none imported. The legacy `Gériatrie` tag is not evidence.
- Services: `service.podology`, `service.hairdressing` and `service.social_activities`, all from `Deep Enrichment!F18`.
- Facilities: `facility.garden_or_park`, limited to the explicit terrace-and-park claim at `Deep Enrichment!F18`.
- Admissions: unknown.
- Financing: unknown.
- RIP/public-interest: offering-scoped `recognized`, `Deep Enrichment!J18`.
- Pricing: unknown.
- Taxonomy mappings: `service.podology`; `service.hairdressing`; `service.social_activities`; `facility.garden_or_park`.
- Sources: `Canton de Vaud — Liste officielle 2026 des établissements`, `Master Audit!I27`, `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`; `Fondation Pré Pariset — EMS Pré Pariset`, `Deep Enrichment!H18`, `https://www.pre-pariset.ch/etablissements/pre_pariset`.
- Importable facts: 9.
- Deferred claims: establishment name (`Deep Enrichment!B18`); address (`C18`); phone (`D18`); email (`E18`); individual/double room configuration (`F18`); floor lounges and dining rooms (`F18`), which do not establish a restaurant; aesthetics (`F18`); wellbeing salon (`F18`); library (`F18`); legacy `Gériatrie` and `Vue lac` tags.
- Conflicts: none. No fact from another Fondation Pré Pariset site is imported.
- Readiness: approved for local apply planning.

### `ems-pre-tour`

- Workbook rows: `Master Audit!A28:J28`; `Deep Enrichment!A19:K19`.
- Establishment: `EMS Pré de la Tour`, `Deep Enrichment!B19`.
- Operator: `Fondation Pré Pariset`, `Master Audit!F28`.
- Offering and capacity: EMS at `Master Audit!E28`; 50 beds at `Master Audit!G28`.
- Stay modes: long stay true from the site-specific wording at `Deep Enrichment!F19`; short and respite unknown. Foundation-wide short-stay wording is deferred from `Deep Enrichment!G19`.
- Care profiles: none imported. The legacy `Gériatrie` tag is not evidence.
- Services: `service.social_activities`, `Deep Enrichment!F19`.
- Facilities: `facility.restaurant`, based only on the explicit public restaurant Le Delta at `Deep Enrichment!F19`. Generic dining-room and terrace wording is not mapped.
- Admissions: unknown.
- Financing: unknown.
- RIP/public-interest: offering-scoped `recognized`, `Deep Enrichment!J19`.
- Pricing: unknown.
- Taxonomy mappings: `service.social_activities`; `facility.restaurant`.
- Sources: `Canton de Vaud — Liste officielle 2026 des établissements`, `Master Audit!I28`, `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`; `Fondation Pré Pariset — EMS Pré de la Tour`, `Deep Enrichment!H19`, `https://www.pre-pariset.ch/etablissements/pre_de_la_tour`.
- Importable facts: 7.
- Deferred claims: establishment name (`Deep Enrichment!B19`); address (`C19`); phone (`D19`); email (`E19`); individual/double room configuration (`F19`); wellbeing salon (`F19`); generic dining room and terrace (`F19`); CAT in the same building (`F19`) as a separate offering; foundation-wide short stay (`G19`); legacy `Gériatrie` and `Vue lac` tags.
- Conflicts: none. CAT and foundation-wide stay claims are excluded from this EMS offering.
- Readiness: approved for local apply planning.

### `ems-tremieres`

- Workbook rows: `Master Audit!A32:J32`; `Deep Enrichment!A22:K22`.
- Establishment: `Résidence Les Trémières`, `Deep Enrichment!B22`.
- Operator: `Résidence Les Trémières SA`, `Master Audit!F32`.
- Offering and capacity: EMS at `Master Audit!E32`; 28 beds at `Master Audit!G32`.
- Stay modes: long, short and respite unknown.
- Care profile: `care_profile.geriatric_care`, `Deep Enrichment!F22`.
- Services, facilities, admissions, financing, RIP/public-interest and pricing: unknown.
- Taxonomy mapping: `care_profile.geriatric_care`.
- Sources: `Canton de Vaud — Liste officielle 2026 des établissements`, `Master Audit!I32`, `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`; `Réseau Santé Région Lausanne — membres EMS`, `Deep Enrichment!H22`, `https://www.reseau-sante-region-lausanne.ch/membres-ems/`.
- Importable facts: 4.
- Deferred claims: establishment name (`Deep Enrichment!B22`); address (`C22`); phone (`D22`); email (`E22`); explicit need for a fresh primary source before adding current service detail (`G22`); legacy `Gériatrie` and `Centre` tags.
- Conflicts: none. The packet intentionally remains sparse.
- Readiness: approved for local apply planning.

## Proposed taxonomy additions

None. Spiritual support, aesthetics, wellbeing salons and libraries remain deferred because the workbook does not establish a sufficiently consistent recurring consumer concept and delivery scope for this batch.

## Held / insufficient evidence

| Repository slug | Workbook rows inspected | Reason held |
|---|---|---|
| `ems-signal` | Existing Phase 4C.1 evidence; `Master Audit!A16:J16`, `Deep Enrichment!A9:K9` | The 24-bed official-list value still conflicts with the provider description of around 30 residents. |
| `ems-chantemerle` | `Master Audit!A4:J4`, `Deep Enrichment!A4:K4` | Repository locality remains stale and the workbook preserves only partial provider-level care evidence. |
| `ems-joli-automne` | `Master Audit!A7:J7`, `Deep Enrichment!A6:K6` | Address/contact capture remains incomplete and long/short care depends on current service configuration rather than a stable site-scoped fact. |
| `ems-novalles` | `Master Audit!A21:J21`, `Deep Enrichment!A13:K13` | JBC versus Château identity, exact Renens address and operator form remain unresolved. |
| `ems-lys` | `Master Audit!A20:J20`, `Deep Enrichment!A12:K12` | EMS and EPSM units are mixed and the preserved service wording is not safely scoped to the EMS offering. |
| `ems-grand-pre` | `Master Audit!A13:J13`, `Deep Enrichment!A30:K30` | EMS/EPSM units and site-wide amenities require a dedicated offering-scope review. |
| `ems-rozavere` | `Master Audit!A34:J34`, `Deep Enrichment!A24:K24` | Repository/researched naming differs; 161 total EMS beds, a 50-resident unit and a separate SPAH must not be conflated. |
| `ems-bethanie` | `Master Audit!A42:J42`, `Deep Enrichment!A32:K32` | Provider evidence still conflicts between 120 and 119 EMS beds. |
| `ems-laurelles-vevey` | `Master Audit!A45:J45`, `Deep Enrichment!A34:K34`, `Structural Resolution!A8:J8` | Repository locality is Vevey while the current establishment is in Territet-Montreux; services are also explicitly external. |
| `ems-palmiers` | `Master Audit!A47:J47`, `Deep Enrichment!A35:K35` | Repository locality is Aigle while the current establishment is in Montreux; 38 rooms must not be substituted for 43-bed capacity. |

Also excluded: split `ems-orme`; transition-state `ems-oriel`; historical `ems-naz` and `ems-mont-calme`; reclassified/EPSM records `ems-aubepines`, `ems-praz-sechaud`, `epsm-borde`, `epsm-collonges` and `epsm-rouvraie`; non-EMS `ems-penates` and `ems-ligniere`; unresolved `ems-gottrause`; and all previously enriched providers.

## Review gate

All five Batch #4 packets and manifest entries have human approval for local apply planning: `localApply: true`, `publish: false` and `verify: false`. The batch stops before any database access or write.
