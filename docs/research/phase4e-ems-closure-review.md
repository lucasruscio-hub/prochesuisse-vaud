# Phase 4E — existing-provider EMS closure review

Date: 2026-09-25
Source workbook: `docs/research/source-material/Lia_Vaud_provider_master_audit_2026-09-21.xlsx`
Workbook SHA-256: `2f3e5ed512e7df196356d6f0f7d66df5f08fd7168b8c90f19c0f213ff27b4450`
Checkpoint: `08f9faadc3964810a376ebb96c5e6adf0bdf3601`

Human review approved the four identity corrections and all seven care packets for guarded local apply planning. No provider identity or care data has been written. Publication and verification remain false.

## Closure state

The 46 existing repository records typed as EMS are partitioned exactly once:

| State | Count |
|---|---:|
| Already care-enriched | 24 |
| Workbook-resolvable in this closure pass | 7 |
| Fresh-research holds | 5 |
| Defer or exclude from EMS V1 | 10 |

If the seven resolvable records are approved and later applied through their appropriate identity/care workflows, the existing-provider EMS track can close at 31 enriched records, five research holds and ten V1 exclusions.

## Group A — approved identity corrections, apply first

Each provider now has a reviewed identity packet and a deterministic care packet. The care apply remains sequenced after its identity correction; neither workflow has been executed against a database.

### `ems-chantemerle`

- Current repository: `EMS de Chantemerle`; `Lutry`; `1093`; display address `Lutry · 1093`.
- Reviewed establishment: `EMS Chantemerle`; Chemin de Chantemerle 3, 1010 Lausanne.
- Operator: Résidences Odysse SA.
- Proposed repository correction: name `EMS Chantemerle`; commune `Lausanne`; NPA `1010`; display address `Lausanne · 1010`.
- Stable identity: keep slug `ems-chantemerle`. No redirect is needed. The old name may remain in provenance/search text but does not require a routing alias.
- Duplicate/merge impact: none.
- Isolation: an exact slug-targeted correction can be applied without changing another provider.
- Evidence: `Master Audit!A4:J4`; `Deep Enrichment!A4:K4`; source `Réseau Santé Région Lausanne — membres EMS`, `https://www.reseau-sante-region-lausanne.ch/membres-ems/`.
- Future narrow care plan: Résidences Odysse SA operator; EMS offering; capacity unknown; `care_profile.geriatric_care`; no other imported care facts.

### `ems-rozavere`

- Current repository: `EMS Rozavère`; `Lausanne`; `1010`; display address `Lausanne · 1010`.
- Reviewed establishment: `EMS Rovéréaz`; Chemin de Rovéréaz 23, 1012 Lausanne.
- Operator: Fondation La Rozavère. The foundation spelling is distinct from the establishment spelling.
- Proposed repository correction: name `EMS Rovéréaz`; commune `Lausanne`; NPA `1012`; display address `Lausanne · 1012`.
- Stable identity: keep slug `ems-rozavere`. No URL redirect is required. Do not create an alias system; `EMS Rozavère` remains only in existing legacy provenance unless a later workflow explicitly supports aliases.
- Duplicate/merge impact: none.
- Isolation: an exact slug-targeted correction can be applied without changing the Foundation La Rozavère operator or any other establishment.
- Evidence: `Master Audit!A34:J34`; `Deep Enrichment!A24:K24`; official-list URL at `Master Audit!I34`; provider URL `https://rozavere.ch/resider/ems-rovereaz/` at `Deep Enrichment!H24`.
- Future narrow care plan: Fondation La Rozavère operator; EMS; 161 beds. The 50-resident R1 Ouest-Est unit is not total capacity. The 30-bed SPAH remains separate. Site-wide mission, accompaniment and activity wording remains deferred.

### `ems-laurelles-vevey`

- Current repository: `EMS Les Laurelles`; `Vevey`; `1800`; display address `Vevey · 1800`.
- Reviewed establishment: `EMS Les Laurelles`; Avenue de Collonge 9, 1820 Territet-Montreux.
- Operator: Fondation Balcons du Lac.
- Proposed repository correction: keep name; canonical locality `Montreux`; NPA `1820`; derived display address `Montreux · 1820`. Preserve `Avenue de Collonge 9, 1820 Territet-Montreux` only in evidence/provenance.
- Stable identity: keep slug `ems-laurelles-vevey` despite its stale locality suffix. No current URL redirect is needed.
- Duplicate/merge impact: `laurelles-residence` is a pending senior-residence duplicate-resolution item. Leave it completely untouched: no merge, deletion or redirect.
- Isolation: the EMS correction can be applied by exact slug without touching the duplicate. The duplicate remains unchanged.
- Evidence: `Master Audit!A45:J45`; `Deep Enrichment!A34:K34`; `Structural Resolution!A8:J8`; provider URL `https://www.balconsdulac.ch/nos-etablissements/ems-les-laurelles-residence-et-prestations-hotelieres-pour-personnes-agees-activites-et-soins`.
- Future narrow care plan: Fondation Balcons du Lac operator; EMS; 33 beds; geriatric profile; garden/park; regional BRIO admissions.
- Deferred: external physiotherapy, podology and hairdressing; broad interdisciplinary activities; hotel-style and spiritual wording; 33-room configuration.

### `ems-palmiers`

- Current repository: `EMS Les Palmiers`; `Aigle`; `1860`; display address `Aigle · 1860`.
- Reviewed establishment: `EMS Les Palmiers`; Avenue du Casino 25, 1820 Montreux.
- Operator: Fondation Balcons du Lac.
- Proposed repository correction: keep name; commune `Montreux`; NPA `1820`; display address `Montreux · 1820`.
- Stable identity: keep slug `ems-palmiers`. No redirect or alias is required.
- Duplicate/merge impact: none.
- Isolation: an exact slug-targeted correction can be applied without changing another provider.
- Evidence: `Master Audit!A47:J47`; `Deep Enrichment!A35:K35`; provider URL `https://www.balconsdulac.ch/nos-etablissements/ems-les-palmiers-residence-pour-personnes-agees-service-hotelier-activites-et-soins`.
- Future narrow care plan: Fondation Balcons du Lac operator; EMS; 43 beds; geriatric profile; regional BRIO admissions.
- Deferred: 38-room configuration; generic activities and hotel services; terraces and cafeteria; nearby medical and wellbeing practitioners. Rooms never replace bed capacity, and nearby practitioners are not establishment services.

## Group B — approved narrow care packets

All three evidence records and canonical packets have `localApply: true`, `publish: false`, and `verify: false`.

| Provider | Operator | EMS capacity | Imported stay/profile/service/facility/admission facts | Importable facts | Deferred facts | Evidence |
|---|---|---:|---|---:|---:|---|
| `ems-joli-automne` | Tertianum Vaud SA | 17 beds | None | 3 | 7 | `Master Audit!A7:J7`; `Deep Enrichment!A6:K6` |
| `ems-grand-pre` | Fondation Primeroche | 34 beds | None | 3 | 9 | `Master Audit!A13:J13`; `Deep Enrichment!A30:K30` |
| `ems-lys` | Fondation Primeroche | 36 beds | None | 3 | 9 | `Master Audit!A20:J20`; `Deep Enrichment!A12:K12` |

### `ems-joli-automne`

- Identity: existing `EMS Joli Automne` reconciled to current `Tertianum Joli Automne` in Ecublens.
- Exact proposal: create/reuse `tertianum-vaud-sa`; create primary operator relationship; create one 17-bed EMS offering.
- Stay modes: all unknown.
- Profiles, services, facilities, admissions, financing, RIP and pricing: all unknown.
- Deferred: incomplete street address; medicalized-room wording; long/short care that depends on current service configuration; communal spaces and terrace; live availability; legacy `Gériatrie` and `Alzheimer` tags.
- Source URLs: official list `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`; provider `https://www.tertianum.ch/fr/etablissement-medico-sociaux/tertianum-joli-automne`.

### `ems-grand-pre`

- Identity: existing Grand Pré establishment under Fondation Primeroche.
- Exact proposal: create/reuse `fondation-primeroche`; create primary operator relationship; create one 34-bed EMS offering.
- Stay modes, profiles, services, facilities, admissions, financing, RIP and pricing: all unknown.
- Separate offering: 14-place EPSM, not imported.
- Deferred: 48-resident whole-site total; restaurant, animation, hairdresser, aesthetic care, pedicure, aromatherapy, art therapy, music therapy and wellbeing/balneotherapy because they are not scoped specifically to the EMS; legacy tags.
- Source URLs: official list `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`; provider `https://www.primeroche.ch/etablissement-le-grand-pre-2`; brochure `https://www.primeroche.ch/wp-content/uploads/2024/08/EMS-GP22.pdf`.

### `ems-lys`

- Identity: existing Les Lys establishment under Fondation Primeroche.
- Exact proposal: create/reuse the same `fondation-primeroche` organization; create primary operator relationship; create one 36-bed EMS offering.
- Stay modes, profiles, services, facilities, admissions, financing, RIP and pricing: all unknown.
- Separate offering: 30-place EPSM, not imported.
- Deferred: mixed-unit psychogeriatric profile; hairdresser, aesthetic care, pedicure, aromatherapy, art therapy, music therapy and animation; site/foundation admissions priority; legacy tags.
- Source URLs: official list `https://www.vd.ch/fileadmin/user_upload/themes/social/EMS/Documentation/Liste_officielle_2026.pdf`; provider `https://www.primeroche.ch/etablissement-les-lys`.

## Fresh-research holds

No provider, evidence or database state is changed for these records.

| Slug | Reason | Workbook evidence |
|---|---|---|
| `ems-signal` | 24 official beds conflict with approximately 30 provider-described residents. | `Master Audit!G16`; `Deep Enrichment!G9` |
| `ems-bethanie` | 120-bed official/provider heading conflicts with detailed units totaling 119. | `Master Audit!G42`; `Deep Enrichment!G32` |
| `ems-novalles` | JBC versus Château identity, exact Renens address and operator form remain unresolved. | `Master Audit!E21:G21`; `Deep Enrichment!C13:G13` |
| `ems-oriel` | EMS versus EPSM transition status and operator remain unresolved. | `Master Audit!D8:J8` |
| `ems-gottrause` | No current establishment or operator match is established. | `Master Audit!D46:J46` |

## Defer or exclude from EMS V1

| Slug | Closure decision | Workbook evidence |
|---|---|---|
| `ems-orme` | Exclude generic identity; split into site-level Bossons and Mélodie records in a separate new-listing workflow. | `Master Audit!D6:J6`; `New Listing Candidates!A2:L3` |
| `ems-naz` | Historical/closed; archive or redirect to Donatella Mauri. | `Master Audit!D10:J10` |
| `ems-mont-calme` | Historical independent identity; current target is BUGNON. | `Master Audit!D40:J40` |
| `ems-aubepines` | EPSM, not EMS. | `Master Audit!D18:J18` |
| `ems-praz-sechaud` | EPSM; no current EMS entry established. | `Master Audit!D30:J30` |
| `epsm-borde` | EPSM outside EMS V1. | `Master Audit!D36:J36` |
| `epsm-collonges` | EPSM outside EMS V1. | `Master Audit!D37:J37` |
| `epsm-rouvraie` | EPSM outside EMS V1. | `Master Audit!D38:J38` |
| `ems-penates` | Home non médicalisé/home-care operation, not EMS. | `Master Audit!D41:J41` |
| `ems-ligniere` | Clinic, therapy and home-care operation; no current EMS listing. | `Master Audit!D43:J43` |

## Guarded implementation sequence

1. Apply each approved identity correction independently with the existing reviewed-provider writer.
2. Verify its exact name/locality/postal result, stable slug, unchanged legacy provenance, and unpublished/unverified state.
3. Only then apply that provider's approved care packet. Joli Automne, Grand Pré and Les Lys have no identity prerequisite.
4. Keep `laurelles-residence`, all EPSM/SPAH data, the five research holds and ten V1 exclusions untouched.

Stop before any identity or care database write.
