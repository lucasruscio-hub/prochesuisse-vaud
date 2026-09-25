# Phase 4C.3 Vaud care enrichment batch #3 review

## Workbook scope

Source workbook: `source-material/Lia_Vaud_provider_master_audit_2026-09-21.xlsx`

SHA-256: `2f3e5ed512e7df196356d6f0f7d66df5f08fd7168b8c90f19c0f213ff27b4450`

The selected evidence uses `Master Audit` rows 9, 11, 12, 17, 23 and 25 and `Deep Enrichment` rows 10, 14, 16, 27, 28 and 29. Existing Phase 4C evidence records were used only to exclude providers already processed. No web, Google or legacy-tag evidence was used.

## Approved for local apply planning

Human review approved all six evidence records for local apply planning. Every canonical packet and manifest candidate has `localApply: true`, `publish: false` and `verify: false`.

| Repository slug | Establishment and identity | Operator | Offering / capacity | Stay modes | Care profiles | Services | Facilities | Admissions | Financing / RIP / pricing | Importable | Deferred | Conflicts | Readiness |
|---|---|---|---|---|---|---|---|---|---|---:|---:|---|---|
| `ems-arcades` | EMS Les Arcades; reconciled to the current Lutry establishment | Résidences Odysse SA | EMS; 29 beds | All unknown | Advanced-age psychiatric care | None imported | None imported | Unknown | All unknown | 4 | 5 | None | Approved for local apply planning |
| `ems-meillerie` | EMS Meillerie; reconciled to the current Fondation La Rozavère site | Fondation La Rozavère | EMS; 26 beds | All unknown | Geriatric care | None imported | None imported | Unknown | All unknown | 4 | 13 | None | Approved for local apply planning |
| `ems-valency` | EMS Parc de Valency; establishment reconciled, stale SISP operator corrected | Fondation de la Plaine | EMS; 20 beds | All unknown | Geriatric care | Physiotherapy | Garden | All admissions through BRIO | Conventioned Vaud financing context; RIP and pricing unknown | 8 | 8 | None | Approved for local apply planning |
| `ems-meridienne` | EMS La Méridienne; current Renens EMS kept distinct from CAT | Fondation La Primerose | EMS; 14 beds | Long yes; short/respite unknown | Advanced-age psychiatric care | Social activities, podology, hairdressing | Garden / terrace | Unknown | All unknown | 9 | 8 | None | Approved for local apply planning |
| `ems-paix-soir` | EMS La Paix du Soir; EMS identity separated from other campus offerings | Association La Paix du Soir | EMS; 84 beds | All unknown | None imported | Social activities | Restaurant on site | Unknown | All unknown | 5 | 10 | None | Approved for local apply planning |
| `ems-vernie` | EMS La Vernie; 30-bed EMS separated from the 45-bed EPSM | Fondation La Primerose | EMS; 30 beds | Long yes; short/respite unknown | Advanced-age psychiatric care | Podology, hairdressing | None imported | Unknown | All unknown | 7 | 11 | None | Approved for local apply planning |

### Exact evidence and proposed facts

#### `ems-arcades`

- Rows: `Master Audit!A17:J17`; `Deep Enrichment!A10:K10`.
- Official source: `Canton de Vaud — Liste officielle 2026 des établissements`, `Master Audit!I17`, `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`.
- Current-directory source: `Réseau Santé Région Lausanne — membres EMS`, `Deep Enrichment!H10`, `https://www.reseau-sante-region-lausanne.ch/membres-ems/`.
- Operator: `Résidences Odysse SA`, `Master Audit!F17`.
- EMS type: `Master Audit!E17`; capacity 29 beds: `Master Audit!G17`.
- `care_profile.psychiatric_care`: `Deep Enrichment!F10`.
- Deferred: `site.name` (`B10`), `site.address` (`C10`), `site.phone` (`D10`), limited additional care detail (`G10`), and unverified legacy tags `Gériatrie` / `Court séjour`.

#### `ems-meillerie`

- Rows: `Master Audit!A23:J23`; `Deep Enrichment!A14:K14`.
- Official source: `Canton de Vaud — Liste officielle 2026 des établissements`, `Master Audit!I23`, `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`.
- Provider source: `Fondation La Rozavère — EMS Meillerie`, `Deep Enrichment!H14`, `https://rozavere.ch/resider/ems-meillerie/`.
- Operator: `Fondation La Rozavère`, `Master Audit!F23`.
- EMS type: `Master Audit!E23`; capacity 26 beds: `Master Audit!G23`.
- `care_profile.geriatric_care`: `Deep Enrichment!F14`.
- Deferred: `site.name` (`B14`), address (`C14`), phone (`D14`), email (`E14`), room configuration, sensory wellbeing, externally supplied physiotherapy, occupational therapy and podology, dentistry, family support and zootherapy (`F14`), plus unverified legacy tags. Human review excluded all three collectively external services from the generic consumer taxonomy. Dentistry remains deferred because delivery scope is not established.

#### `ems-valency`

- Rows: `Master Audit!A25:J25`; `Deep Enrichment!A16:K16`.
- Official source: `Canton de Vaud — Liste officielle 2026 des établissements`, `Master Audit!I25`, `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`.
- Provider source: `altage — EMS Parc de Valency`, `Deep Enrichment!H16`, `https://altage.ch/etablissement-medico-sociaux/ems-parc-de-valency/`.
- Operator: `Fondation de la Plaine`, `Master Audit!F25`; this replaces the stale SISP association without changing the repository identity in this care workflow.
- EMS type: `Master Audit!E25`; capacity 20 beds: `Master Audit!G25`.
- `care_profile.geriatric_care`, `service.physiotherapy`, `facility.garden_or_park`: `Deep Enrichment!F16`.
- Admissions through BRIO and conventioned Vaud financing context: `Deep Enrichment!G16`.
- RIP/public-interest remains unknown. The legacy `Public` tag is not evidence.
- Deferred: site name/address/phone/email (`B16:E16`), room/balcony configuration, weekly EMS doctor and free visiting (`F16`), plus all legacy tags.

#### `ems-meridienne`

- Rows: `Master Audit!A9:J9`; `Deep Enrichment!A27:K27`.
- Official source: `Canton de Vaud — Liste officielle 2026 des établissements`, `Master Audit!I9`, `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`.
- EMS source: `Fondation La Primerose — EMS La Méridienne`, `Deep Enrichment!H27`, `https://www.fondationlaprimerose.ch/etablissement/la-meridienne/`.
- CAT source: `Fondation La Primerose — CAT La Méridienne`, `Deep Enrichment!K27`, `https://www.fondationlaprimerose.ch/etablissement/cat-la-meridienne/`.
- Operator: `Fondation La Primerose`, `Master Audit!F9`.
- EMS type: `Master Audit!E9`; capacity 14 beds: `Master Audit!G9`.
- Long stay, `care_profile.psychiatric_care`, `service.social_activities`, `service.podology`, `service.hairdressing`, and `facility.garden_or_park`: `Deep Enrichment!F27`.
- Short and respite stay remain unknown; the legacy short-stay tag is not used.
- Deferred: site name/address/phone/email (`B27:E27`), secured-floor structure and interdisciplinary-care wording (`F27`), separate CAT (`G27` with source at `K27`), and legacy tags.

#### `ems-paix-soir`

- Rows: `Master Audit!A11:J11`; `Deep Enrichment!A28:K28`.
- Official source: `Canton de Vaud — Liste officielle 2026 des établissements`, `Master Audit!I11`, `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`.
- EMS source: `Association La Paix du Soir — EMS`, `Deep Enrichment!H28`, `https://www.paixdusoir.ch/services/ems`.
- Campus source: `Association La Paix du Soir — présentation`, `Deep Enrichment!K28`, `https://www.paixdusoir.ch/a-propos-de-nous/presentation`.
- Operator: `Association La Paix du Soir`, `Master Audit!F11`.
- EMS type: `Master Audit!E11`; capacity 84 beds: `Master Audit!G11`.
- `service.social_activities` and `facility.restaurant`: `Deep Enrichment!F28`.
- Deferred: site name/address/phone/email (`B28:E28`), broad physical/psychological/cognitive loss-of-autonomy wording, generic nursing care (`F28`), separate 30-place SPAH (`Master Audit!G11`), CAT and protected housing (`Deep Enrichment!G28`), and legacy tags.

#### `ems-vernie`

- Rows: `Master Audit!A12:J12`; `Deep Enrichment!A29:K29`.
- Official source: `Canton de Vaud — Liste officielle 2026 des établissements`, `Master Audit!I12`, `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`.
- EMS source: `Fondation La Primerose — EMS La Vernie`, `Deep Enrichment!H29`, `https://www.fondationlaprimerose.ch/etablissement/la-vernie/`.
- Network source: `Fondation La Primerose — établissements`, `Deep Enrichment!K29`, `https://www.fondationlaprimerose.ch/nos-etablissements/`.
- Operator: `Fondation La Primerose`, `Master Audit!F12`.
- EMS type: `Master Audit!E12`; EMS capacity 30 beds, distinct from 45 EPSM beds: `Master Audit!G12`.
- Long stay, `care_profile.psychiatric_care`, `service.podology`, and `service.hairdressing`: `Deep Enrichment!F29`.
- Deferred: site name/address/phone/email (`B29:E29`), community-unit and room configuration, interdisciplinary care, patio/secure terrace, dentistry (`F29`), separate EPSM (`Master Audit!G12`), and legacy tags. Dentistry remains deferred under the prior human decision.

## Taxonomy review

All importable concepts use the existing taxonomy. No new taxonomy code is proposed. Meillerie's externally supplied physiotherapy, occupational therapy and podology are deferred without introducing an external-service taxonomy. `service.dentistry` is not revived. The Meillerie and La Vernie dentist claims remain deferred because neither workbook record resolves whether the service is on site, visiting or organized externally.

## Held / insufficient evidence

| Repository slug | Workbook rows inspected | Reason held |
|---|---|---|
| `ems-signal` | Existing Phase 4C.1 evidence; `Master Audit!A16:J16`, `Deep Enrichment!A9:K9` | Existing capacity conflict remains unresolved. |
| `ems-chantemerle` | `Master Audit!A4:J4`, `Deep Enrichment!A4:K4` | Repository locality is stale and provider-level care evidence remains partial. |
| `ems-boissonnet` | `Master Audit!A5:J5`, `Deep Enrichment!A5:K5` | Establishment/operator naming remains insufficiently separated for a clean new packet. |
| `ems-joli-automne` | `Master Audit!A7:J7`, `Deep Enrichment!A6:K6` | Current contact/address evidence is incomplete and stay wording depends on current configuration. |
| `ems-lys` | `Master Audit!A20:J20`, `Deep Enrichment!A12:K12` | EMS and EPSM units are mixed; preserved service wording is not clearly scoped to the EMS offering. |
| `ems-novalles` | `Master Audit!A21:J21`, `Deep Enrichment!A13:K13` | JBC versus Château identity and exact Renens site address still require resolution. |
| `ems-odysse` | `Master Audit!A24:J24`, `Deep Enrichment!A15:K15` | Establishment/corporate naming and service-level evidence remain too limited. |
| `ems-pre-pariset` | `Master Audit!A27:J27`, `Deep Enrichment!A18:K18` | Multi-site foundation scope and the previously held Pré Pariset / Pré-de-la-Tour identity workflow remain unresolved. |
| `ems-pre-tour` | `Master Audit!A28:J28`, `Deep Enrichment!A19:K19` | Foundation-wide stay/CAT claims are not safely site-scoped; prior identity review remains open. |
| `ems-tremieres` | `Master Audit!A32:J32`, `Deep Enrichment!A22:K22` | Current evidence supports identity, operator, EMS type, capacity and mission but explicitly lacks fresh service detail. |
| `ems-grand-pre` | `Master Audit!A13:J13`, `Deep Enrichment!A30:K30` | EMS/EPSM units and site-wide amenities require a dedicated offering-scope review. |
| `ems-rozavere` | `Master Audit!A34:J34`, `Deep Enrichment!A24:K24` | Repository/researched naming differs, and the 161-bed EMS total, 50-resident unit and separate SPAH must not be conflated. |
| `ems-bethanie` | `Master Audit!A42:J42`, `Deep Enrichment!A32:K32` | Provider evidence conflicts between 120 and 119 beds. |
| `ems-laurelles-vevey` | `Master Audit!A45:J45`, `Deep Enrichment!A34:K34`, `Structural Resolution!A8:J8` | Repository locality remains Vevey while the current site is Territet-Montreux. |
| `ems-palmiers` | `Master Audit!A47:J47`, `Deep Enrichment!A35:K35` | Repository locality remains Aigle while the current site is Montreux; room count is not bed capacity. |

Historical, closed, reclassified, EPSM-only, duplicate, unresolved and network-level records were excluded. Previously enriched providers were not reconsidered.

## Review gate

Human review approved all six packets for local apply planning. Every Batch #3 packet and manifest entry has `localApply: true`; `publish` and `verify` remain false. The batch stops before database write. No production access, migration, publication, verification or Google change is part of this approval step.
