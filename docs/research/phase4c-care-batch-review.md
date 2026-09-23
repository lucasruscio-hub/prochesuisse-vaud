# Phase 4C.1 care packet review

## Workbook scope

Source workbook: `source-material/Lia_Vaud_provider_master_audit_2026-09-21.xlsx`

SHA-256: `2f3e5ed512e7df196356d6f0f7d66df5f08fd7168b8c90f19c0f213ff27b4450`

The review used `Master Audit` rows 2, 3, 14, 16 and 31 and `Deep Enrichment` rows 2, 3, 7, 9 and 21. `Summary!A1` supplies the audit date. `Research Rules!A2:B8` supplies the publication, evidence, unknown-value, listing-unit, home-care, operator and legacy-identity rules. `Structural Resolution` and `New Listing Candidates` were inspected but contain no target row for these five existing providers, so they supplied no provider fact.

The workbook is source material, not publication approval. Its source URLs and row-level summaries were preserved in one evidence file per provider. No web research was performed.

## Approved for local apply planning

| Provider | Identity | Operator | Offering | Capacity | Stay modes | Care profiles | Services | Facilities | Admissions / financing / RIP / pricing | Importable | Deferred | Readiness |
|---|---|---|---|---:|---|---|---|---|---|---:|---:|---|
| `ems-chateau-rive` | Reconciled | Château de la Rive SA | EMS | 103 beds | Long, short | Geriatric | Physiotherapy, podology, hairdressing | None | All unknown | 9 | 8 | Approved for local apply planning |
| `ems-clair-soleil` | Reconciled | Asile des Aveugles | EMS | 94 beds | Long | None | Social and sociocultural activities | Garden or park | All unknown | 6 | 7 | Approved for local apply planning |
| `ems-le-home` | Reconciled | EMS Le Home - Les Pins SA | EMS | 31 beds | Unknown | None | Hairdressing; social activities | None | Admissions and financing remain unknown | 5 | 8 | Approved for local apply planning |
| `ems-girarde` | Reconciled | Fondation du Relais | EMS | 62 beds | Long | Advanced-age psychiatric care | Podology, hairdressing, social activities | None | Admissions managed by BRIO; financing, offering-scoped RIP and pricing unknown | 9 | 9 | Approved for local apply planning |

### Exact deferrals

- **Château de la Rive:** reviewed name/address/phone/email require the provider-field workflow; the psychiatric/cognitive environment is scoped to La Résidence and is not generalized to the whole EMS; aesthetics and bundled hotel/laundry services lack V1 mappings; legacy tags remain unverified.
- **Clair-Soleil:** reviewed name/address/phone/email require the provider-field workflow; Humanitude has no V1 care-approach field; broad hotel/care wording is not converted to controlled services; legacy tags remain unverified.
- **Le Home:** reviewed address/phone/email require the provider-field workflow; shared spaces and visiting access lack V1 fields; room configuration is not flattened into capacity; the workbook says admission and financing information exists but does not preserve its terms; legacy tags remain unverified. No stay mode is inferred from legacy tags.
- **La Girarde:** reviewed name/address/phone require the provider-field workflow; nursing/medical support, psychiatrist, massage and mobility support lack precise V1 mappings; CAT remains separate from the EMS offering; the RIP wording is not explicitly offering-scoped and therefore remains unknown; the legacy tag remains unverified.

## Held

| Provider | Identity | Operator | Offering | Capacity | Stay modes | Care profiles | Services | Facilities | Admissions / financing / RIP / pricing | Importable | Deferred | Unresolved issue |
|---|---|---|---|---|---|---|---|---|---|---:|---:|---|
| `ems-signal` | Reconciled | Fondation EMS du Jorat | EMS | Unknown | Long, short | Geriatric, advanced-age psychiatric | Palliative care, hairdressing | None | All unknown | 8 | 9 | Official-list 24 beds conflicts with the provider summary of approximately 30 residents |

Signal also defers reviewed name/address/phone/email to the provider-field workflow, animation and gardens while the provider is held, bundled beauty/catering wording, and all legacy tags. The accepted taxonomy codes do not bypass its unresolved capacity review. Its packet stays held even though the other eight proposed facts are individually sourced.

## Accepted taxonomy additions

Human review accepted these V1 controlled codes. They are imported only where the existing evidence file ties the concept to the provider:

| Code | Consumer concept | Workbook claims used in approved packets |
|---|---|---|
| `service.social_activities` | Social / sociocultural activities and animation; no clinical-care implication | `Deep Enrichment!F3`, `F7`, `F21` |
| `facility.garden_or_park` | Garden or park available at the establishment | `Deep Enrichment!G3` |

Other unmatched concepts occur once or are bundled too broadly, so they remain deferred without proposed codes.

## Approval and apply state

The canonical packets and manifest entries for `ems-chateau-rive`, `ems-clair-soleil`, `ems-le-home`, and `ems-girarde` have `localApply: true`. Their status records human approval for local apply planning only. `ems-signal` remains held with `localApply: false`. Publication and verification are false for all five. `ems-boveresses` remains protected. No database write is part of this phase.

Validate the durable evidence, generated packets and batch with:

```text
node scripts/phase4c-care-evidence.mjs --check
node scripts/phase4c-care-batch.mjs --check-batch
node scripts/phase4c-care-batch.mjs --dry-run
node scripts/phase4c-care-batch.mjs --plan-apply ems-chateau-rive
node scripts/phase4c-care-batch.mjs --plan-apply ems-clair-soleil
node scripts/phase4c-care-batch.mjs --plan-apply ems-le-home
node scripts/phase4c-care-batch.mjs --plan-apply ems-girarde
```

The next step is a guarded local apply of the four approved packets, one provider at a time, followed by post-apply verification. Signal requires a separate human resolution of its capacity conflict before any care fact is applied.
