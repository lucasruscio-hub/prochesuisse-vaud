# Phase 4C.2 Vaud care enrichment batch #2 review

## Workbook scope

Source workbook: `source-material/Lia_Vaud_provider_master_audit_2026-09-21.xlsx`

SHA-256: `2f3e5ed512e7df196356d6f0f7d66df5f08fd7168b8c90f19c0f213ff27b4450`

The review used `Master Audit` rows 15, 22, 26, 29, 33, 35, 39 and 44 and `Deep Enrichment` rows 8, 17, 20, 23, 25, 26, 31 and 33 for the eight selected providers. `Summary!A1` supplies the audit date. `Research Rules!A2:B11` supplies the publication, evidence, unknown-value, listing-unit, operator, historical-identity, EPSM, availability and Google rules. `Structural Resolution` and `New Listing Candidates` supplied no selected-provider care fact.

The workbook is source material, not publication approval. Its source URLs and row-level summaries are preserved in one evidence file per provider. No web research, Google care evidence or legacy-tag inference was used.

## Approved for local apply planning

Human review approved all eight reconciled identities for local apply planning. Every packet has `localApply: true`, `publish: false` and `verify: false`.

| Provider | Identity status and exact workbook rows | Operator | Offering and capacity | Stay modes | Care profiles | Services | Facilities | Admissions | Financing / RIP / pricing | Taxonomy decision | Importable | Deferred | Conflicts / unresolved | Readiness |
|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|---|
| `ems-marronnier` | Reconciled; `Master Audit!A15:J15`, `Deep Enrichment!A8:K8` | Fondation Le Marronnier | EMS; 56 beds | Long yes; short no; respite unknown | Unknown | Social activities | Unknown | Age 65+, Vaud residence, Lutry/nearby priority, voluntary long-stay placement | All unknown | Explicit sourced negative `short_stay: false` approved | 7 | 6 | None | Approved for local apply planning |
| `ems-petit-flon` | Reconciled; `Master Audit!A26:J26`, `Deep Enrichment!A17:K17` | Fondation Bois-Gentil | EMS; 77 beds | All unknown | Geriatric; compatible psychogeriatric | Social activities | Restaurant on site | Relevant BRIO; direct pre-visits possible | All unknown | `facility.restaurant` approved | 8 | 8 | None | Approved for local apply planning |
| `ems-pre-fleuri` | Reconciled; `Master Audit!A29:J29`, `Deep Enrichment!A20:K20` | NECC SA | EMS; 53 beds | All unknown | Advanced-age psychiatric | Social activities | Garden / terrace | Unknown; workbook only says documentation exists | All unknown | None | 6 | 9 | None | Approved for local apply planning |
| `ems-praz-joret` | Reconciled; `Master Audit!A33:J33`, `Deep Enrichment!A23:K23` | Fondation EMS du Jorat | EMS; 26 beds | Long yes; short yes; respite unknown | Geriatric; compatible psychogeriatric | Palliative care; social activities | Large park | Unknown | All unknown | Generic restoration remains deferred | 10 | 7 | None | Approved for local apply planning |
| `ems-sauvabelin` | Reconciled; `Master Audit!A35:J35`, `Deep Enrichment!A25:K25` | Fondation Bois-Gentil | EMS; 56 beds | All unknown | Geriatric; compatible psychogeriatric | Social activities | Public restaurant / terrace | Relevant BRIO; direct pre-visits possible | All unknown | `facility.restaurant` approved | 8 | 7 | None | Approved for local apply planning |
| `ems-mauri` | Reconciled; `Master Audit!A39:J39`, shared official-list URL at `Master Audit!I44`, `Deep Enrichment!A26:K26` | Fondation Donatella Mauri | EMS; 58 beds | Long yes; short/respite unknown | Advanced-age psychiatric | None imported | Garden / terraces, qualified to residents retaining independence | Unknown | All unknown | CAT remains separate | 6 | 8 | None; La Naz stays historical only | Approved for local apply planning |
| `ems-pins` | Reconciled; `Master Audit!A22:J22`, `Deep Enrichment!A31:K31` | EMS Le Home - Les Pins SA | EMS; 60 beds | Long yes; short/respite unknown | Advanced-age psychiatric | Social activities | Unknown | Mission-dependent; BRIO when needed | Financing/pricing unknown; RIP recognized for this EMS offering only | Offering-scoped RIP approved | 8 | 7 | None | Approved for local apply planning |
| `ems-jardins-leman` | Reconciled; `Master Audit!A44:J44`, `Deep Enrichment!A33:K33` | GHOL | EMS; 51 beds | All unknown | Unknown | Social activities, physiotherapy, occupational therapy, podology | Accessible gardens; restaurant | Registration only through BRIO Réseau Santé La Côte | All unknown | `facility.restaurant` approved; dentistry rejected and deferred | 10 | 9 | None | Approved for local apply planning |

### Exact deferrals

- **Marronnier:** site contact fields stay in the provider-field workflow; bundled medical, nursing and socio-hotel wording has no precise V1 mapping; CAT remains separate; legacy tags remain unverified.
- **Petit-Flon:** reviewed establishment naming and contact fields stay in the provider-field workflow; room mix and individualized accompaniment have no V1 fields; dietetic support lacks an accepted code; legacy tags remain unverified.
- **Pré-Fleuri:** reviewed establishment naming and contact fields stay in the provider-field workflow; room configuration, Wi-Fi and shared spaces have no V1 fields; medical psychogeriatric follow-up lacks a precise controlled service; admission documents are mentioned without their terms; legacy tags remain unverified.
- **Praz Joret:** reviewed establishment naming and contact fields stay in the provider-field workflow; individualized accompaniment and restoration wording lack precise V1 mappings; legacy tags remain unverified.
- **Sauvabelin:** reviewed establishment naming and contact fields stay in the provider-field workflow; room mix and individualized accompaniment have no V1 fields; legacy tags remain unverified.
- **Donatella Mauri:** contact fields stay in the provider-field workflow; broad 24/7 medico-social accompaniment and the secure/closed structure lack precise V1 mappings; CAT remains separate; La Naz remains an archival identity; legacy tags remain unverified.
- **Les Pins:** contact fields stay in the provider-field workflow; broad nursing and socio-hotel wording has no precise V1 mapping; mobility-adapted transport lacks an accepted code; legacy tags remain unverified. RIP is imported only because `Deep Enrichment!J31` explicitly calls this an acknowledged public-interest EMS.
- **Jardins du Léman:** reviewed establishment naming and contact fields stay in the provider-field workflow; bundled medical-social, hotel and nursing wording is too broad; room amenities have no V1 fields; dentistry remains deferred because its delivery model is not established; a psychogeriatric consultant does not establish an offering-wide care profile; legacy tags remain unverified.

## Held / insufficient evidence

These inspected workbook candidates are not included in batch #2 and have no new evidence file or packet.

| Repository slug | Exact workbook rows inspected | Status | Reason |
|---|---|---|---|
| `ems-tremieres` | `Master Audit!A32:J32`, `Deep Enrichment!A22:K22` | Insufficient enrichment | Identity, operator, EMS type, 28 beds and geriatric mission are supportable, but the workbook explicitly says current service details still need a fresh primary source. |
| `ems-paix-soir` | `Master Audit!A11:J11`, `Deep Enrichment!A28:K28` | Held for a later batch | Evidence is strong, but the site has EMS, SPAH, CAT and protected-housing offerings that require a dedicated scope review; the eight-provider cap is already reached. |
| `ems-vernie` | `Master Audit!A12:J12`, `Deep Enrichment!A29:K29` | Held for a later batch | EMS and EPSM must remain separate. The EMS evidence is promising, but EPSM exclusion deserves a dedicated review. |
| `ems-rozavere` | `Master Audit!A34:J34`, `Deep Enrichment!A24:K24` | Held | The repository identity says Rozavère while the researched establishment says Rovéréaz, and the workbook distinguishes the 161-bed EMS total from a 50-resident unit and a separate 30-bed SPAH. Resolve identity and capacity scope first. |
| `ems-bethanie` | `Master Audit!A42:J42`, `Deep Enrichment!A32:K32` | Held | Provider evidence conflicts between 120 beds and 119 detailed beds; protected apartments are a separate housing offering. |
| `ems-laurelles-vevey` | `Master Audit!A45:J45`, `Deep Enrichment!A34:K34`, `Structural Resolution!A8:J8` | Held | The current site is Territet-Montreux while the repository identity is still Vevey; complete the provider identity/locality correction first. |
| `ems-palmiers` | `Master Audit!A47:J47`, `Deep Enrichment!A35:K35` | Held | The current site is Montreux while the repository identity is still Aigle; complete the provider identity/locality correction first. Room count also must not be substituted for bed capacity. |

Le Signal remains held in batch #1. Nova Vita, Pré Pariset / Pré-de-la-Tour, Meillerie, Boissonnet, historical/closed/reclassified providers, EPSM records and network-level identities were excluded as instructed.

## Human taxonomy decisions

Human review accepted one recurring facility code and rejected the dentistry proposal.

| Decision | Code | Consumer concept | Providers and exact workbook facts |
|---|---|---|---|
| Approved | `facility.restaurant` | Actual restaurant/dining facility at the establishment; French label `Restaurant sur place` | Petit-Flon `Deep Enrichment!F17`; Sauvabelin `Deep Enrichment!F25`; Jardins du Léman `Deep Enrichment!F33` |
| Rejected | `service.dentistry` | Delivery scope is unclear | Jardins du Léman `Deep Enrichment!F33`; held La Vernie `Deep Enrichment!F29` |

Generic restoration, catering, dining-room and socio-hotel wording does not map to `facility.restaurant`. Dentistry remains deferred everywhere and no replacement code is introduced.

## Approval and apply state

The eight evidence records have review status `approved_for_local_apply`. The eight canonical packets and all manifest entries have `localApply: true`; publication and verification remain false. Batch #1 files and approval states are unchanged: Boveresses remains protected, Château de la Rive, Clair-Soleil, Le Home and La Girarde retain their existing state, and Signal remains held. The batch #2 manifest additionally protects all six of those slugs. No database write, production access, migration, publication, verification or Google change is part of this phase.

Validate the durable evidence, deterministic packets and batch with:

```text
node scripts/phase4c-care-evidence.mjs --check
node scripts/phase4c-care-batch.mjs --batch phase4c-care-batch-02 --check-batch
node scripts/phase4c-care-batch.mjs --batch phase4c-care-batch-02 --dry-run
```

## Next controlled step

Review the generated non-writing apply plans. A later explicit task may apply one approved packet at a time to the verified local container. This batch stops before any database write.
