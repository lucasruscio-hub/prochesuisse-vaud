# Phase 5B — Home-care data foundation

## Scope

This phase changes only the reusable data foundation. It creates no provider,
organization, offering, feature, municipality, or service-area data. Phase 4 EMS
evidence, publication, verification, and closure state remain out of scope.

## Evidence contract

Every home-care fact is positive and explicitly sourced. Calling an operation
“Spitex”, “home care”, “OSAD”, or “services à domicile” can support the offering
type when the identity is clear, but never establishes a specific service.
Unknown services are represented by absent feature rows, not `false` values.

The V1 service contract uses the existing controlled features for nursing care,
personal/basic care, assistance with daily living, household help, dementia
support, palliative care, and night care. Phase 5B adds these service codes:

| Code | French consumer label | Internal meaning and evidence boundary |
|---|---|---|
| `service.on_call_24h` | Permanence 24h/24 | Provider support explicitly available on call 24 hours a day. This does not mean continuous caregiver presence. |
| `service.companionship` | Présence et compagnie | Relational presence and companionship delivered at home. Generic home-care wording is insufficient. |
| `service.meal_delivery` | Livraison de repas | Delivery or bringing of meals to the home under the offering. Meal preparation, nutrition advice, or a third-party referral is insufficient. |
| `service.respite_at_home` | Relève à domicile | Temporary in-home relief that concretely replaces the family caregiver. Advice or generic caregiver support is insufficient. |
| `service.emergency_call_service` | Service de téléalarme | A home telealarm/emergency-call service supplied, organized, or monitored by the provider. This is distinct from caregiver or on-call availability 24 hours a day. |

Admissions/contact pathways use `care_offerings.admissions_notes`;
reimbursement and explicit public/private context use `financing_notes`; prices
and minimum visits use `pricing_notes`; explicit operating-unit languages use
`providers.language_codes`. These fields remain nullable and narrative where the
current model is narrative.

## Source access date

`provider_sources.accessed_on date` is nullable and records only an exact known
source-access date. Existing sources remain valid with `NULL`. Historical dates
must not be inferred or backfilled. `retrieved_at` remains available for a real
process timestamp, and `reviewed_at` remains the human-review timestamp.

## Coverage contract

Structured coverage remains `coverage_type = municipality` or `canton`. It is
potentially filterable and requires an explicit source and exact target.

Narrative coverage uses `coverage_type = region` plus a non-empty
`coverage_label`, for example “Lausanne et environs”, “Région de La Côte”, or
“Canton de Vaud” when that is only the wording preserved from the source. Region
rows are display/context only. They never create municipality coverage, never
imply every municipality inside a vague region, and are excluded from structured
municipality/canton matching. Both structured and narrative rows retain optional
`care_offering_id` scope; home-care coverage should normally be offering-scoped.
Every new coverage row must own an explicit provider source.

## Phase 5C provider-resolution plan

1. Research the four held identities independently: `pro-senectute`,
   `avasad-cms`, Home Instead/Dovida, and `senevita-vaud`.
2. Resolve legal organization, brand, current operating unit or office, and
   current contact identity before considering any care facts.
3. Keep `pro-senectute` and `avasad-cms` unresolved until an explicit strategy
   distinguishes their network identity from real local operations.
4. Resolve Home Instead versus Dovida from authoritative current and historical
   evidence; do not merge, rename, or alias records automatically.
5. Reconcile `senevita-vaud` as the first pilot, re-reviewing its service and
   regional wording under this contract instead of promoting deferred Phase 3
   claims.
6. Produce non-writing evidence and canonical review packets with exact source
   URLs and access dates, `localApply: false`, `publish: false`, and
   `verify: false`.
7. Separate office location from coverage; preserve narrative regions exactly
   and add structured municipality/canton rows only from explicit evidence.
8. Stop for human identity and evidence review before any local provider,
   organization, offering, feature, language, or service-area write.
