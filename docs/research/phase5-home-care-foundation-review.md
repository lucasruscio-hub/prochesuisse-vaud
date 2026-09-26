# Phase 5A — Home-care / Spitex foundation audit

Date: 2026-09-26

Checkpoint: `18e87cdf51159f0666952b2225912e7389ec0952`

Scope: repository-only audit. No web research, provider mutation, database write, migration, publication, verification, or Phase 4 EMS change was performed.

## Executive decision

Lia can reuse the Phase 4 organization → provider/site → care offering → feature → service-area → evidence architecture for home care. A home-care provider row must represent a real office or locally identifiable service operation, not a whole network disguised as a site. Its address is only the office location. Coverage is a separate, sourced fact and must never be inferred from the office locality, postal code, provider name, legacy tags, or proximity.

The existing model already supports organizations, operator relationships, `home_care` offerings, sourced services, nullable admissions/financing/pricing, and offering-scoped exact municipality or canton coverage. Phase 5B should not redesign those structures.

Two small schema refinements merit human approval before any home-care coverage write:

1. add a typed date-only `accessed_on` field to `provider_sources`, because the evidence contract supplies a date and inventing a timestamp is unsafe;
2. extend `provider_service_areas` with an explicitly narrative region target for sourced labels such as “Riviera” or “La Côte”. Such a row must be display-only and must never participate in exact municipality/canton matching.

If those refinements are not approved, Phase 5B can still enrich identity, organization, offering, services, admissions, financing, and pricing. Narrative/regional coverage must then remain only in durable evidence, and structured service-area rows must be limited to explicitly enumerated municipalities or an explicit whole-canton claim.

## 1. Existing `domicile` inventory

There are 12 existing records. All are unpublished legacy records whose tags are unverified. Every record has the original legacy source. Only `senevita-vaud` also has durable reviewed research and an applied private provider source; its care services and regional coverage have not been imported into the care model. Inclusion in a Google candidate batch is not care evidence.

The classifications below are repository audit classifications, not current-world verification.

| Slug | Current name | Current location display | Legacy tags — not verified | Apparent identity in repository | Current classification | Existing evidence |
|---|---|---|---|---|---|---|
| `senevita-vaud` | Senevita Casa Vaud | Renens · 1020 | Spitex; LAMal; 24h/24; Tout Vaud | Local Vaud service operation linked in research to the Senevita brand/operator | Physical office for a regional service operation | Legacy source plus Phase 3B reviewed packet/canonical packet and private Senevita provider source. Office at Avenue des Baumettes 3, phone and website were reviewed. Services and named-region coverage remain deferred from structured care data. |
| `swisscaring` | Swisscaring SA | Le Mont-sur-Lausanne · 1052 | Spitex; Aide domicile; Infirmières | Corporate/service name appears to combine operator and local operation | Ambiguous legacy record; likely office or regional service organization, requiring identity research | Legacy source only. The legacy mapping flags special review; proposed legacy service mappings are not evidence. |
| `homeinstead` | HomeInstead Lausanne | Lausanne · 1003 | Aide domicile; Compagnie; Alzheimer | Lausanne-labelled branch under an apparent wider brand | Ambiguous branch/office record | Legacy source only. Existing review note requires independent operator/site resolution and forbids assuming a relationship or merge with `dovida`. |
| `boite-o` | La Boîte O Services | Perroy · 1166 | OSAD; Soins; LAMal; La Côte | Named local service business | Ambiguous legacy record; likely physical office for a regional service operation | Legacy source only. “La Côte” is not structured coverage evidence. |
| `dovida` | Dovida | Lausanne · 1006 | Aide domicile; Alzheimer; Nuit | Brand-only identity | Ambiguous legacy record; possibly network/brand rather than a resolved office | Legacy source only. Existing review note explicitly forbids merging with `homeinstead` by assumption. |
| `sitex` | SITEX SA | Lausanne · 1003 | HAD; Soins urgents; 24h/24; LAMal | Corporate home-care identity | Ambiguous legacy record; likely office or regional service organization | Legacy source only. No tag is verified care evidence. |
| `alterum` | Alterum | Lausanne · 1003 | Senior +50; Aide domicile; Accompagnement | Unresolved service/brand identity | Ambiguous legacy record | Legacy source only. |
| `pro-senectute` | Pro Senectute Vaud | Lausanne · 1012 | Public; Tarif social; Aide ménagère | Canton-level organization/network identity | Network/foundation-level record, not a safely established local service site | Legacy source only. Existing review requires identification of actual service operation(s); do not create one fictional facility. |
| `avasad-cms` | AVASAD – CMS Vaud | Lausanne · 1004 | Public; CMS; LAMal; Soins | Explicit canton-wide CMS network identity | Network-level record, not a single office/site | Legacy source only. Existing review requires resolution to individual operations or continued unpublished hold. |
| `vitadomo` | Vitadomo | Lausanne · 1006 | Aide domicile; Nuit; Week-end | Unresolved service/brand identity | Ambiguous legacy record; possibly office or regional service operation | Legacy source only. |
| `senior-plus` | Senior+ | Nyon · 1260 | Aide domicile; La Côte; Compagnie | Named regional service identity | Ambiguous legacy record; likely physical office or regional service organization | Legacy source only. “La Côte” is not structured coverage evidence. |
| `aide-familiale-morges` | Aide Familiale Morges | Morges · 1110 | Spitex; La Côte; Aide ménagère | Morges-labelled regional service identity | Ambiguous legacy record; likely physical office or regional service organization | Legacy source only. “La Côte” and “Morges” must not be promoted to coverage without explicit evidence. |

### Existing Senevita evidence boundary

The 2026-09-21 Phase 3B research supports the name `Senevita Casa Vaud`, provider type `domicile`, Senevita operator/brand, Renens office address, phone, website, a set of source-described services, and narrative coverage labels “Riviera”, “La Côte”, and “Lausanne and western region”. The local identity subset was applied without publication or verification.

The existing canonical packet deliberately leaves the operator, services, street address, and regional coverage without database targets. No care offering or service-area row exists. The legacy `Tout Vaud` tag is not evidence of canton-wide coverage. The reviewed `24_hour_assistance` phrase also remains outside the current controlled taxonomy and must be semantically re-reviewed before any mapping.

## 2. Existing schema fit

### Structures that can be reused

| Structure | Home-care use | Audit conclusion |
|---|---|---|
| `organizations` | Reusable legal operator, foundation, association, network, or brand | Reuse unchanged. It prevents a network identity from being flattened into every office. |
| `provider_organizations` | Sourced operator/owner/brand link from a local operation to an organization | Reuse unchanged. Resolve operator and brand separately when evidence distinguishes them. A maximum of one primary operator per provider remains appropriate. |
| `providers` | One real office or locally identifiable service operation, including its office contact/location | Reuse. Do not use a network-only identity as a fictional site. Provider locality is never coverage. |
| `care_offerings` | One coherent `home_care` proposition at the provider | Reuse. Capacity and EMS stay modes normally remain null. Admissions, financing and pricing narratives already fit. RIP/public-interest must not be used as a proxy for public/private or LAMal reimbursement. |
| `care_offering_features` | Positive, sourced home-care profiles and services | Reuse. Absence remains unknown. The application taxonomy needs a small home-care review, not a database enum migration. |
| `care_offering_sources` | Private source-to-offering-field linkage | Reuse unchanged for offering type, admissions, financing and pricing. |
| `provider_service_areas` | Exact municipality/canton coverage, optionally scoped to a `home_care` offering | Reuse for exact coverage. The same-provider composite foreign key and scoped uniqueness are correct. Narrative regions require the small extension described below or must remain deferred. |
| `municipalities` | Canonical Swiss municipality identities for exact coverage and exact provider municipality references | Reuse. Populate only from authoritative municipality identity data in a later reviewed workflow. A locality string is not automatically an official municipality. |
| `provider_sources` | Private evidence identity shared by provider, operator, offering, features, and coverage | Reuse, but add a typed `accessed_on date` if exact date preservation is required in the database rather than only in durable evidence. |

### Important scope rules

- Organization: legal/network/brand identity.
- Provider: an office or locally identifiable operating unit, with physical/contact location.
- Offering: the home-care proposition and its services, admissions, financing, and pricing.
- Service area: where that offering actually operates.
- Feature: a positive, source-backed profile or service delivered by the provider under that offering.
- Evidence: source name, URL, access date, exact claim scope, and review decision.

An office in Lausanne does not establish Lausanne coverage. A provider named “Vaud” does not establish canton-wide coverage. A network's coverage does not automatically apply to every office or offering. A service-area claim does not prove that every listed service is available everywhere in that area.

## 3. Proposed V1 home-care information contract

Every optional fact is nullable/absent. Generic “Spitex”, “home care”, “OSAD”, or “services à domicile” wording establishes at most the offering type when the source clearly identifies the operation; it does not establish any specific service.

### Identity and organization

- stable repository slug;
- current operating-unit/office name;
- office location and contact fields, explicitly labelled as office information;
- primary operator and, where independently supported, owner or brand relationship;
- one `home_care` offering per coherent service proposition;
- no network-to-site conversion without evidence.

### Offering facts

- `offering_type = home_care` from explicit source evidence;
- capacity null unless a future home-care-specific capacity model is justified;
- `long_stay`, `short_stay`, and `respite_stay` null: these EMS stay fields do not describe ordinary home care;
- admissions/contact pathway in `admissions_notes` when explicitly sourced;
- reimbursement/financing context in `financing_notes`, including LAMal wording only at the exact supported scope;
- pricing or minimum-visit wording in `pricing_notes` only when explicit and current;
- `public_interest_status` null unless evidence explicitly establishes the defined offering-scoped status. “Public”, CMS, LAMal, subsidy, nonprofit form, or operator identity does not establish RIP.

### Positive service/profile facts

- nursing care;
- basic/personal care and assistance with activities of daily living, kept distinct where the source does so;
- household help;
- dementia support;
- palliative care;
- night care;
- continuous presence versus 24-hour telephone/on-call availability, never conflated;
- meal support/delivery;
- respite at home and support for relatives, kept distinct;
- physiotherapy and occupational therapy only when the provider itself delivers them under the home-care offering;
- languages only when explicitly sourced, using existing provider `language_codes` for V1 if they apply to the operating unit as a whole;
- service-area geography as a separate sourced relation.

External referrals, nearby practitioners, coordination with partners, or access organized outside the provider must not become generic provider-delivered features. Feature `details` may preserve a meaningful qualifier, but must not be used to rescue a misleading generic code.

## 4. Service-area design

### Exact coverage supported now

For an explicitly named municipality:

- resolve one canonical `municipalities` row using official identity data;
- add `provider_service_areas.coverage_type = municipality`;
- set `provider_id`, the `home_care` offering's `care_offering_id`, `municipality_id`, and an owned `source_id`;
- leave canton target null.

For an explicit whole-canton statement:

- add `coverage_type = canton` with `country_code = CH`, `canton_code = VD`, the offering ID, and owned source;
- do this only when the source clearly means the whole canton, not a brand name, office label, “Vaud team”, selected regions, or a legacy `Tout Vaud` tag.

Offering scope should be the default for home care because different propositions from the same office can have different coverage. Provider-level null offering scope should be reserved for evidence explicitly covering every service proposition of that provider.

### Narrative/regional coverage gap

Names such as “Riviera”, “La Côte”, “Lausanne and western region”, districts, catchment areas, or custom provider zones are not official municipality identities and are not necessarily coterminous with a canton. They must not be expanded into guessed municipalities.

Recommended minimal extension:

- add `coverage_type = region`;
- add nullable `coverage_label text`;
- require a non-empty label and require municipality/canton targets to be null for region rows;
- require municipality and canton rows to keep `coverage_label` null;
- add provider-level and offering-level uniqueness for a normalized region label;
- keep `source_id` mandatory for every newly created coverage row;
- expose region rows as narrative/display coverage only;
- exclude region rows from exact municipality/canton matching unless a later authoritative mapping explicitly enumerates members.

No polygon, radius, geocoding, inferred district membership, or parallel service-area table is needed for V1.

### Evidence and access date

Each coverage row must link through `source_id` to a source owned by the same provider. Durable evidence must retain the exact claim text/meaning, source name, source URL, access date, and scope. The current writer stores access dates inside source notes because `provider_sources.retrieved_at` is a timestamp. A date-only claim must not be converted to an invented time.

Recommended minimal fix: add nullable `provider_sources.accessed_on date`, populate it for new reviewed evidence, and leave historical rows null unless a durable artifact supports an exact date. `retrieved_at` can remain for processes that truly know a timestamp; `reviewed_at` remains the human review timestamp. Existing evidence JSON remains the deterministic source for exact workbook or research references.

### Unknown coverage

Create no service-area row when evidence is absent, merely regional marketing language is unclear, only an office address is known, or municipality membership would have to be inferred. Empty service areas mean unknown—not “office municipality only” and not “no coverage”.

## 5. Taxonomy audit

### Existing codes that can be reused when explicitly supported

| Code | Home-care interpretation |
|---|---|
| `service.home_nursing` | Nursing delivered at home. |
| `service.basic_care` | Source-described basic/personal care; do not assume it from nursing. |
| `service.daily_life_assistance` | Assistance with activities of daily living. |
| `service.household_help` | Household/domestic help. |
| `care_profile.dementia_support` | Explicit cognitive-impairment/dementia specialization or support. |
| `service.palliative_care` | Palliative home care delivered by the provider. |
| `service.night_watch` | Explicit night presence/watch; not merely telephone availability. |
| `service.continuous_assistance` | Actual continuous assistance/presence. Do not map generic “24h/24” or on-call wording without resolved semantics. |
| `service.family_caregiver_support` | Support, advice, or training for relatives/caregivers. |
| `service.physiotherapy` | Only provider-delivered home physiotherapy. |
| `service.occupational_therapy` | Only provider-delivered home occupational therapy. |
| `service.complex_care` | Explicit complex/specialized home nursing; retain source qualifier in details where useful. |

`care_profile.geriatric_care` and `care_profile.psychiatric_care` are reusable only for explicit specializations, never because clients are older or need support.

### Codes that should not be reused for ordinary home care

- `facility.garden_or_park` and `facility.restaurant` describe establishment facilities.
- `facility.emergency_call_system` should not represent a home alarm/teleassistance service; the delivery model differs.
- `service.hairdressing`, `service.podology`, and `service.social_activities` must not be carried over from EMS assumptions. They could be used only if future evidence clearly establishes direct delivery under the home-care offering, not a referral or nearby provider.
- EMS stay fields and capacity concepts must remain null rather than be converted into services.

### Proposed additions — review only, do not add yet

| Proposed code | Proposed French label | Why it may be necessary | Guardrail |
|---|---|---|---|
| `service.on_call_24h` | Permanence téléphonique 24h/24 | The reviewed Senevita source contains a 24-hour assistance concept, while `continuous_assistance` would overstate telephone/on-call access. | Add only after research distinguishes on-call availability from continuous in-person care. Never map the legacy `24h/24` tag. |
| `service.companionship` | Présence et compagnie | Companionship is a recurring comparison concept in multiple legacy records and is not equivalent to ADL assistance or social activities. | Require direct provider delivery and explicit evidence. Legacy “Compagnie” tags are leads only. |
| `service.meal_delivery` | Livraison de repas | Meal delivery/support is materially useful in home-care comparison and has no current code. | Distinguish delivery from meal preparation, nutrition advice, and third-party referral. Approve only if Phase 5B finds recurring sourced claims. |
| `service.respite_at_home` | Relève à domicile | Direct respite/replacement care is different from advice or support represented by `family_caregiver_support`. | Require actual in-home relief delivered by the provider. |
| `service.emergency_call_service` | Service d’appel d’urgence à domicile | A supplied/monitored home alarm is a service, not an establishment facility. | Add only if recurring direct provision is found; do not reuse `facility.emergency_call_system`. |

No dentistry code should be revived. No availability-window code, language feature, public/private feature, LAMal feature, or generic “Spitex” feature is proposed. Weekend hours can remain a sourced operational detail until recurring evidence justifies a deliberate model.

## 6. Provider-page implications

An eventual home-care page should reuse the provider detail shell and transparency model but present home-care-specific blocks:

1. **Office and contact** — clearly labelled office location; map and distance must not imply service coverage.
2. **Area served** — exact municipalities/canton separately from narrative regions; show “coverage not yet confirmed” when absent.
3. **Home-care services** — group clinical care, personal/daily-life assistance, household support, specialist support, night/continuous/on-call support, and caregiver support. Show only sourced positive facts.
4. **Who the service supports** — explicit care profiles such as dementia support; no inference from age-focused branding.
5. **How to start** — admissions/referral/contact pathway, assessment requirements, hours, and emergency limitations when sourced.
6. **Costs and reimbursement** — sourced LAMal/reimbursement context, private-pay elements, minimum visit, and pricing notes without claiming comparability that the evidence does not support.
7. **Languages** — only explicit languages, separate from generic multilingual marketing.
8. **Organization** — operator/brand/network relationship without replacing the local operating-unit identity.
9. **Sources and freshness** — source names, access/review dates, and clear unknown/deferred states.

EMS-specific capacity, stay-mode, accommodation, room, garden, restaurant, and bed-availability blocks should be hidden for a normal `home_care` offering. Search and comparison by the user's residence must use service-area data, never office proximity alone.

## 7. Required and unnecessary structural changes

### Recommended before service-area writes

- Add nullable `provider_sources.accessed_on date`; do not backfill guessed dates.
- Extend `provider_service_areas` with a constrained narrative `region` target and display label, or formally decide that all narrative regions remain deferred for V1.
- Update deterministic packet validation and guarded writers so coverage rows are offering-scoped, source-owned, date-preserving, additive, unpublished, and independently verified after write.
- Review and approve only the taxonomy additions supported by recurring Phase 5B evidence.

### Not required

- no new organization, provider, offering, feature, municipality, or evidence table;
- no separate Spitex provider type: keep repository type `domicile` and offering type `home_care`;
- no new address/display-locality system;
- no polygon/radius coverage system for V1;
- no generic claims engine or arbitrary service JSON;
- no structured tariff engine yet;
- no automatic conversion of legacy tags to facts;
- no automatic split, merge, rename, redirect, or alias system;
- no change to Phase 4 EMS packets, taxonomy decisions, applied rows, or closure state.

## 8. Recommended Phase 5B sequence

1. Approve the information contract, exact taxonomy definitions, and the narrative-region/access-date schema decision.
2. Create a durable home-care evidence schema and canonical packet projection parallel to Phase 4, with explicit organization/site/offering/service-area scopes and all gates false.
3. Add non-writing validators and fixtures for office-versus-coverage separation, exact/narrative coverage, provider-delivered versus external services, and null unknowns.
4. Resolve all 12 identities using fresh external research: current local operation, operator/brand, office/contact, and whether network-level records need specific operating units. Do not enrich unresolved network identities.
5. Use `senevita-vaud` as the first reconciliation pilot because identity fields already have reviewed evidence, but re-review service semantics and coverage under the new contract rather than promoting the old deferred claims automatically.
6. Select a small first batch of clean, current operating units with explicit offering, services, and coverage evidence. Prefer quality over count.
7. Produce evidence files, canonical packets, a manifest, and a human-review report with `localApply: false`, `publish: false`, and `verify: false`.
8. After human approval, plan identity corrections before care/service-area application; then apply locally one provider at a time with read-back checks and no production access.
9. Keep `pro-senectute` and `avasad-cms` held until a site/operating-unit strategy is explicitly approved. Keep HomeInstead/Dovida separate unless authoritative evidence resolves their identities and relationship.

## Human-review decisions needed

1. Approve or reject the proposed typed `provider_sources.accessed_on` field.
2. Approve narrative `region` rows in `provider_service_areas`, or choose to defer all non-enumerated regional coverage from V1.
3. Approve the definition boundaries for `on_call_24h`, `companionship`, `meal_delivery`, `respite_at_home`, and `emergency_call_service` before any taxonomy edit.
4. Confirm that network-only records must resolve to locally identifiable operations before enrichment and cannot be published as fictional offices.
5. Confirm that public/private and reimbursement context remains sourced narrative for V1 rather than a new structured classification.
