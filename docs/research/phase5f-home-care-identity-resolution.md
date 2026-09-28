# Phase 5F — Vaud home-care identity and architecture resolution

Date: 2026-09-28

Checkpoint reviewed: `c2443a667a28acb36144a11cab8842e5073b6081` on `marketplace-mvp`

Status: research and architecture decision only. No provider, organization, offering, feature, service-area, publication, verification, or production write is authorized by this document.

## Executive decision

Phase 5E is sufficient to freeze the discovery universe, but it is not a bulk-import source. The reconciled evidence supports these listing units:

- the 50 named CMS are patient-facing provider candidates; AVASAD and the seven regional bodies are organizations, not substitute provider pages;
- the reconciled private universe contains 30 identities in the 02.03.2026 official file plus eight direct-support or regional/extra-cantonal identities; each still needs a canonical packet before a write;
- ordinary generalist OSADs normally map to one patient-facing provider and one `home_care` offering;
- a separately addressable current office or operating site maps to its own provider row, even when several sites share a brand;
- specialist OSADs remain patient-facing providers, but their offering must be presented as specialist and must not inherit a generalist service set;
- non-medical accompaniment is not an OSAD and must not use a medical `home_care` presentation;
- organization identities, operating sites, brands, historical names, and coverage remain separate facts.

The current schema handles providers, multiple sites, organizations linked as operator/owner/brand, multiple offerings, sourced positive features, and offering-scoped coverage. Five schema changes should be designed and approved before Phase 5F implementation: evidence for organization-only rows, historical/current aliases and provider succession, network/delegated organization relationships, a distinction between medical home care and non-medical home support, and sourced time-sensitive authorization/classification.

## Evidence reviewed

- `source-material/Lia_Phase5E_FINAL_reconciled_Vaud_homecare_2026-09-28.xlsx`:
  - `Summary!A1:G26`
  - `CMS Universe!A1:J54`
  - `Private OSAD Candidates!A1:I37`
  - `Identity & Status Issues!A1:F17`
  - `Other OSAD Classes!A1:F19`
  - `Official OSAD Raw!A1:O31`
  - `Reconciled Private Universe!A1:N39`
  - `Phase 5F Queue!A1:F11`
- `source-material/Lia_Vaud_provider_master_audit_2026-09-21.xlsx`, especially the 12 domicile rows in `Master Audit!A48:J59` and `Structural Resolution!A1:J13`.
- Phase 5A–5D reports, Phase 5C canonical packets, the Phase 5D Senevita review/canonical packets, and the Phase 4/5 migrations.
- Read-only local Supabase verification on 2026-09-28. All 12 domicile providers remain unpublished and unverified. Only `senevita-vaud` has an organization link, care offering, and service area. The other 11 have zero organization links, offerings, and service areas.

The official 02.03.2026 OSAD file is an authorization baseline, not a complete universe. Its own note allows omissions, including some extra-cantonal and housing-linked organizations. Regional network evidence is therefore useful for discovery and current patient-facing presence, but absence from the official file remains a research hold unless the omission is explained.

## Representation vocabulary

| Decision | Meaning in Lia |
|---|---|
| Organization only | Preserve a legal, network, foundation, or brand identity without pretending it is a patient-facing office. |
| One patient-facing provider | One current operating unit or office with a distinct contact identity. |
| Multiple provider/site records | More than one current, separately addressable operating site. Sites may share brand or operator organizations. |
| Existing Lia record | Reconcile the named legacy row instead of creating another provider. |
| Rename existing record | Keep the stable Lia identity but update its current public/legal name only after an approved source-backed packet. |
| Split legacy record | Retire the umbrella provider identity and create separately resolved patient-facing providers. |
| Historical alias | Search/provenance identity only. It must not appear as a current competing provider. |
| Specialist provider | Patient-facing medical provider with a deliberately narrow offering; no generalist service inference. |
| Non-medical support provider | Patient-facing accompaniment/support operation with no implied nursing/OSAD status. |
| Research hold | No write until the named identity, authorization, scope, or relationship is resolved. |

## Matrix A — existing 12 domicile records

| Legacy ID | Current resolution | Proposed Lia representation and action | Phase 5F status |
|---|---|---|---|
| `senevita-vaud` | Senevita Casa Vaud, operated by Senevita AG | Existing Lia record; one patient-facing provider; keep the Phase 5D organization, `home_care` offering, 11 features, and one narrative region. No split and no new record. | Resolved; no write in Phase 5F audit. |
| `swisscaring` | Swisscaring Vaud Sàrl at Le Mont-sur-Lausanne | Rename/reconcile existing record to the current legal/public identity; one patient-facing generalist provider. Link the operator organization if independently sourced. | Ready for a canonical identity packet. |
| `homeinstead` | Former Home Instead Swiss brand/legacy Lausanne identity | Historical alias and legacy predecessor only. Archive or redirect this row to the surviving `dovida` provider after the succession schema exists. Do not publish it as a second provider. | Representation resolved; exact historical operator/partner evidence remains a hold. |
| `boite-o` | La Boîte O Services Sàrl, Perroy | Rename/reconcile existing record; one patient-facing generalist provider. Keep La Réponse separate unless an operator relationship is proven. | Ready for identity packet; La Réponse relationship held. |
| `dovida` | Current Dovida Vaud/Lausanne operation at Crissier under Seniorendienste Schweiz AG | Existing Lia record; one patient-facing provider. Link current legal operator and Dovida brand; preserve Home Instead as historical alias. Update the office only from the approved current source. | Structure resolved; unnamed partner-agency role remains a research hold. |
| `sitex` | Sitex SA, current official Gland contact for Vaud | Reconcile existing record rather than create a new one; one specialist provider with a sourced narrow offering. Do not retain the legacy Lausanne address as current evidence. | Ready for specialist identity packet. |
| `alterum` | Current non-medical daily-life assistance service | Existing Lia record; reclassify as one non-medical support provider with a future `home_support` offering. Never present it as OSAD/nursing. | Blocked on `home_support` architecture. |
| `pro-senectute` | Pro Senectute Vaud cantonal organization; direct accompaniment scope is not yet a resolved local care operation | Replace the consumer-provider interpretation with organization only. Archive/retire the legacy provider row. A later patient-facing non-medical offering requires separate proof of the directly operated Vaud unit. | Research hold for any provider listing. |
| `avasad-cms` | AVASAD/CMS Vaud umbrella over seven regional organizations and 50 CMS | Split legacy record. Preserve AVASAD as organization only; add seven regional organizations; later create 50 patient-facing CMS providers. The umbrella row must not remain a competing provider. | Structure resolved; implementation depends on new organization/network evidence support. |
| `vitadomo` | No reliable current matching Vaud operation | Keep unpublished and unverified; research hold. Do not rename or merge by similarity. | Unresolved. |
| `senior-plus` | No reliable current matching Nyon/Vaud operation | Keep unpublished and unverified; research hold. Do not infer a match from the name or locality. | Unresolved. |
| `aide-familiale-morges` | Service d'aide familiale de Morges et environs | Rename/reconcile existing row; one non-medical support provider linked to its association organization. Coverage requires explicit sourced geography and must remain separate from the Morges office. | Blocked on `home_support`; identity otherwise high confidence. |

## Matrix B — public CMS and organizations

### Organization layer

| Identity | Lia representation | Relationship to patient-facing providers |
|---|---|---|
| AVASAD | Organization only | Cantonal network identity; not a provider page. |
| CMS Vaud | Brand/network identity, not a provider | Shared public network label. Preserve only if the brand/network relation is explicitly useful. |
| FSL — Fondation Soins Lausanne | Organization only | Regional organization for 8 CMS providers. |
| APROMAD — Couronne lausannoise | Organization only | Regional organization for 8 CMS providers. |
| APREMADOL — Ouest lausannois | Organization only | Regional organization for 4 CMS providers. |
| ASANTE SANA — Est vaudois | Organization only | Regional organization for 10 CMS providers; CMS Pays-d'Enhaut has a delegated operator. |
| ABSMAD — Broye | Organization only | Regional organization for 3 CMS providers. |
| FLC — Fondation de La Côte | Organization only | Regional organization for 9 CMS providers. |
| ASPMAD — Nord vaudois | Organization only | Regional organization for 8 CMS providers. |
| Pôle Santé du Pays-d'Enhaut | Organization only for this public-CMS structure | Delegated primary operator of the single CMS Pays-d'Enhaut provider; do not create a duplicate generic Pôle Santé home-care provider from the OSAD row. |

### Patient-facing CMS providers

Every row below is one future patient-facing provider with one public `home_care` offering. No office address or municipality coverage is implied by its name. All remain write-disabled pending canonical packets.

| Regional organization | Patient-facing provider identities | Count | Action |
|---|---|---:|---|
| FSL | CMS Ancien-Stand; CMS Centre-Ville; CMS Chailly-Sallaz; CMS Montelly; CMS Ouchy; CMS des Peupliers; CMS Riponne; CMS Valency | 8 | Eight provider/site records linked to FSL and the AVASAD/CMS network. Use 8 despite stale prose saying 7. |
| APROMAD | CMS de Cully; CMS d’Echallens; CMS d’Epalinges; CMS du Mont; CMS d’Oron; CMS de Prilly Nord; CMS de Prilly Sud; CMS de Pully | 8 | Eight provider/site records linked to APROMAD. |
| APREMADOL | CMS de Bussigny et Villars-Ste-Croix; CMS d’Ecublens, Saint-Sulpice et Chavannes-près-Renens; CMS de Renens Nord-Crissier; CMS Renens Sud | 4 | Four provider/site records linked to APREMADOL. |
| ASANTE SANA | CMS Chaussy; CMS Clarens; CMS de la Grande-Eau; CMS de la Gryonne; CMS La Tour-de-Peilz; CMS Montreux; CMS Rennaz; CMS Vevey Est; CMS Vevey Ouest | 9 | Nine ordinary provider/site records linked to ASANTE SANA. |
| ASANTE SANA / delegated operator | CMS Pays-d’Enhaut | 1 | One provider only. Link ASANTE SANA/AVASAD as network and Pôle Santé du Pays-d'Enhaut as primary operator. The official OSAD row and CMS directory refer to this same patient-facing operation. |
| ABSMAD | CMS Avenches; CMS Moudon; CMS Payerne | 3 | Three provider/site records linked to ABSMAD. |
| FLC | CMS d’Aubonne; CMS de Gland Région; CMS de Gland Ville; CMS de Morges-Est; CMS de Morges-Ouest; CMS de Nyon; CMS de Rolle; CMS de Saint-Prex; CMS de Terre-Sainte | 9 | Nine provider/site records linked to FLC. |
| ASPMAD | CMS Cossonay; CMS Grandson; CMS La Vallée; CMS Orbe; CMS Sainte-Croix; CMS Vallorbe; CMS Yverdon; CMS Yvonand | 8 | Eight provider/site records linked to ASPMAD. Treat CMS Yverdon as one current provider; preserve Yverdon Est/Ouest only as stale historical structure unless current evidence re-establishes separate units. |

Total: 50 patient-facing CMS providers. The legacy `avasad-cms` provider becomes a retired split source, not provider number 51.

## Matrix C — reconciled private/direct-support universe

| Canonical current identity | Proposed Lia representation/action | Classification | Decision state |
|---|---|---|---|
| 1 Monde PatientS, société coopérative | One new patient-facing provider; link a same-name cooperative organization if legal/operator separation is useful. | Generalist OSAD | New listing candidate; official-file evidence. |
| AMAD Homecare SA / AMAD public brand | Organization for the legal operator plus provider sites at Lutry and Yverdon. Link both sites to the same operator. Add a separate shared brand organization only if the public brand relation is independently evidenced. | Generalist commercial network | Structural packet required. Do not create one brand-wide provider. |
| AMAD Homecare La Côte SA | Separate legal organization and one Nyon provider/site. Preserve Qualis Vita La Côte SA as its historical name. It is not Qualis Vita Ouest SA. | Generalist commercial network | Structural packet required. |
| C-VITAL Sàrl | One new patient-facing provider. | Generalist OSAD | New listing candidate; official-file evidence. |
| Fondation Beau-Séjour | Organization only first. Create one home-care provider/offering only after the exact patient-facing unit and contact path are verified; do not reuse an EMS/institution page as the OSAD by assumption. | Institution-linked OSAD | Research hold. |
| Groupe Romand Prévention Traitement Plaies (GRPTP) | One new specialist provider with a wound-care-specific offering. | Specialist OSAD | New specialist candidate. |
| OSAD Helvetia Sàrl | One new patient-facing provider. | Generalist OSAD | New listing candidate. |
| Home Assistance Sàrl | One new patient-facing provider. | Generalist OSAD | New listing candidate. |
| Hygie-Soins Sàrl | One new patient-facing provider. | Generalist OSAD | New listing candidate. |
| La Boîte O Services Sàrl | Reconcile existing `boite-o`; one provider. Do not create a second row from the workbook. | Generalist OSAD | Existing record action. |
| La Réponse Sàrl | One separate extra-cantonal provider candidate; explicit Vaud service evidence is coverage, not proof of a Vaud office. Do not merge with La Boîte O. | Extra-cantonal Type-1 candidate | Hold relationship and current authorization scope. |
| La Source à domicile Sàrl | One new patient-facing provider. Preserve UniQue Care / Unique Soins à domicile as historical names, not providers. | Generalist OSAD | New listing candidate. |
| Les Soins Volants Sàrl | One new patient-facing provider. | Generalist OSAD | New listing candidate. |
| Le Levant / Fondation du Levant | Fondation du Levant as organization; one separate patient-facing `Le Levant OSAD` provider only after specialist offering scope is reviewed. | Institution-linked specialist OSAD | Research hold before provider creation. |
| Ligue pulmonaire vaudoise | One specialist patient-facing provider linked to the nonprofit organization; respiratory scope only. | Specialist OSAD | New specialist candidate. |
| Méditrine SA | One provider only if current authorization/operation is reconfirmed. The official 02.03 file supports it, but its absence from the later 20.04 regional list is unresolved. | Generalist OSAD | Research hold. |
| MSG Soins Sàrl | One new patient-facing provider. | Generalist OSAD | New listing candidate. |
| NOMàD / Fondation Espace | Fondation Espace as organization and one patient-facing NOMàD specialist provider. Deduplicate `OSAD Nomàd` from the separate-class list into this identity. | Specialist psychiatric OSAD | New specialist candidate; confirm public operating name typography. |
| Ô Santé Sàrl | One new patient-facing provider. | Generalist OSAD | New listing candidate. |
| Pôle Santé du Pays-d'Enhaut | Organization only; operate the single CMS Pays-d'Enhaut provider described above. Do not create an additional OSAD provider from the official row. | Delegated public CMS operator | Resolved as dedupe/organization relationship. |
| Proxi-Soins Sàrl | One new patient-facing provider. Address is office identity only; regional evidence remains coverage evidence. | Generalist OSAD | New listing candidate. |
| La-solution.ch / Saraï, La-solution.ch SA | One patient-facing provider under the current La-solution.ch public name, linked to Saraï, La-solution.ch SA as legal operator. Preserve the official listed form as an alias. | Generalist commercial network | New listing candidate. |
| SBV Medical Sàrl | One patient-facing provider with a reviewed specialist/generalist boundary. | Specialist/home-care OSAD | New specialist candidate. |
| Senevita Casa Vaud / Senevita AG | Existing `senevita-vaud` provider and existing operator relationship. | Generalist commercial network | Keep; no duplicate and no Phase 5F write. |
| Sitex SA | Reconcile existing `sitex`; one specialist provider using current Gland office evidence. | Specialist/national OSAD | Existing record action. |
| Soins Riviera Sàrl | One new patient-facing provider. | Generalist OSAD | New listing candidate. |
| Swiss Agi San Sàrl | One new patient-facing provider. | Generalist OSAD | New listing candidate. |
| Swisscaring Vaud Sàrl | Reconcile and rename existing `swisscaring`; one provider. | Generalist OSAD | Existing record action. |
| Val'Soins Sàrl | One new patient-facing provider. | Regional OSAD | New listing candidate. |
| Vivradom Sàrl | One legal organization and one Renens patient-facing provider/site. | Commercial network OSAD | Structural packet required. |
| Vivradom Jura Nord Vaudois Sàrl | Separate legal organization and one Orbe patient-facing provider/site. Link a shared Vivràdom brand only if supported; do not flatten both legal entities into one provider. | Commercial network OSAD | Structural packet required. |
| Altoan SA | One new non-medical support provider with `home_support`, not `home_care`; no OSAD or LAMal implication. | Non-medical accompaniment | Blocked on schema/product scope. |
| ASDR – Aide et Service à Domicile Romand Sàrl | One extra-cantonal provider at its actual Valais office, with separate sourced Chablais-vaudois coverage. | Extra-cantonal Type-1 OSAD | New candidate after authorization reconciliation. |
| CPSE Alexandra Sàrl | CPSE Alexandra organization plus one patient-facing psychiatric home-care unit/provider if the operating-unit name and current authorization basis are confirmed. | Institution-linked psychiatric OSAD | Research hold. |
| Dovida / Seniorendienste Schweiz AG | Reconcile existing `dovida`; one Crissier patient-facing provider linked to Seniorendienste Schweiz AG and Dovida brand. Retire/redirect `homeinstead`. | Commercial network/home support | Structural packet required; unnamed partner agency remains unresolved. |
| Sciensus AG | One extra-cantonal specialist provider at the current Rotkreuz operating identity with separate sourced Vaud coverage. Preserve HTHC High Tech Home Care AG as historical alias. | Specialist Type-1 OSAD | New specialist candidate. |
| Nurse Home Care Sàrl | One new Morges patient-facing provider if a current authorization date/source is confirmed. | Vaud Type-1 OSAD | Research hold. |
| SoinVaud Sàrl / Soinsvaud | One new patient-facing provider under the verified current public name; `Soinsvaud` is a trading/search alias unless stronger evidence makes it the public name. | Vaud Type-1 OSAD | Research hold for current authorization and public-name choice. |

## Matrix D — separate Type-2, SSJN, institutional, stale, and closed identities

These identities must not enter the ordinary Type-1 batch.

| Identity | Proposed Lia treatment | State |
|---|---|---|
| Adlibit'Home SA | One patient-facing provider only after Type-2 meaning, admission model, and consumer relevance are defined. | Institutional research hold. |
| Diabètevaud | Organization plus specialist provider/offering only if direct patient-facing home care is confirmed. | Specialist research hold. |
| Home Med Sàrl | Separate provider class; do not present as ordinary Type-1. | Type-2/SSJN hold. |
| Fondation Pro-Home | Organization only first; provider/offering requires a resolved patient-facing unit. | Type-2/SSJN hold. |
| Tertianum Résidence La Gottaz | Do not create as ordinary home-care provider. Reconcile with the establishment architecture if an in-house offering is later required. | Out of Phase 5F Type-1 scope. |
| Domaine de La Gracieuse – Le Parc SA | Same-site/institution offering review, not ordinary home-care creation. | Out of Phase 5F Type-1 scope. |
| Fondation Champ-Fleuri | Organization only pending authorization type and patient-facing unit. | Research hold. |
| Foyer Agapê / Le Home Combier Sàrl | Resolve organization, operating unit, and authorization type before any provider. | Research hold. |
| Nova Vita Residenz Montreux Sàrl | Reconcile with the held `nova-via` residence identity and multi-offering architecture; do not create a duplicate OSAD. | Existing-record structural hold. |
| OSAD Fondation Nos Pénates | Link to the institution only after the home-care operating unit and class are established. | Research hold. |
| OSAD La Primerose | Link to the institution only after the home-care operating unit and class are established. | Research hold. |
| OSAD Le Bourg | Link to the residence only after the home-care operating unit and class are established. | Research hold. |
| OSAD Le Bristol | Link to the residence only after the home-care operating unit and class are established. | Research hold. |
| OSAD Nomàd | Alias/duplicate of the canonical NOMàD provider candidate, not a second provider. | Dedupe resolved. |
| Vitaloria Sàrl | One provider only after authorization type and operating scope are established. | Research hold. |
| Domi.Syl SA | Potential psychiatric specialist provider; keep outside ordinary Type-1 until authorization type and consumer suitability are established. | Specialist research hold. |
| Permed Spitex AG — Agence Vaud | One Vaud agency provider candidate only if current authorization is reconciled against the 2026 sources. | Research hold. |
| Qualis Vita Ouest SA | Historical struck-off entity; not AMAD Homecare La Côte SA and not an active provider. | Historical/out of scope. |
| Asadom Sàrl | Bankrupt and deleted in 2025. | Historical/out of scope. |
| ASBE Accompagnement santé bien-être Sàrl | Bankrupt; no successor established. | Historical/out of scope. |
| OSADEX SA | Bankrupt in 2026 and no longer a current Vaud listing candidate. | Historical/out of scope. |

## Remaining research holds

1. Recover or close `vitadomo` and `senior-plus`; no current identity match is supported.
2. Resolve the legal role of the unnamed Dovida partner agency. This does not justify a second listing in the meantime.
3. Confirm the exact operator/site allocation for AMAD Lutry, Yverdon, and Nyon, including whether the public AMAD brand should be a separate organization identity.
4. Confirm whether Vivradom exposes exactly the Renens and Orbe operating units and whether a shared brand organization adds information beyond the two legal operators.
5. Confirm current authorization dates/bases for CPSE Alexandra, Nurse Home Care, SoinVaud, Permed Vaud, Méditrine, Domi.Syl, and the regional/extra-cantonal candidates absent from the official file.
6. Resolve the patient-facing unit and offering scope for Fondation Beau-Séjour and Fondation du Levant/Le Levant.
7. Resolve Type-2, SSJN, and institution-linked eligibility before any consumer presentation or filtering.
8. Treat regional labels as narrative coverage unless exact municipalities or an explicit canton claim are sourced. The workbook's region columns are discovery evidence, not municipality membership.
9. Independent nurses remain out of the V1 institutional-provider batch.

## Architecture and schema gaps

### 1. Organization-only evidence — required

`organizations` can exist without a provider, but the current evidence path is attached to `provider_sources`, and `provider_organizations.source_id` requires a source owned by a provider. AVASAD, the seven regional CMS organizations, Pro Senectute Vaud, foundations held before provider creation, and brand-only identities cannot be represented with first-class organization evidence without inventing a provider.

Propose an `organization_sources` table analogous to `provider_sources`, including source URL, exact `accessed_on`, reviewed fields, notes, and private access. Do not create organization rows until this evidence path is approved.

### 2. Historical names and succession — required

The schema has one current provider name and one current organization name/legal name. It cannot cleanly represent Home Instead → Dovida, HTHC → Sciensus, Qualis Vita La Côte → AMAD Homecare La Côte, UniQue Care → La Source à domicile, or a retired umbrella provider split into successors.

Propose:

- evidence-backed `provider_names` and `organization_names` with name type (`current_public`, `legal`, `trading`, `historical`), optional validity dates, and exactly one current public name per entity;
- `provider_identity_links` for `successor`, `duplicate_of`, and `split_into`, with evidence and no automatic fact inheritance.

Do not model historical names as active providers.

### 3. Network and delegated relationships — required

`provider_organizations.relationship_type` currently permits only `operator`, `owner`, and `brand`. CMS providers need a primary operator plus regional/cantonal network membership. CMS Pays-d'Enhaut specifically needs Pôle Santé as operator and ASANTE SANA/AVASAD as networks, without mislabelling them as owners or brands.

Add a sourced `network` relationship type. `operator` remains sufficient for the delegated operator itself; a separate `delegated_operator` type is unnecessary unless later evidence requires the delegation contract to be a distinct public fact.

### 4. Medical home care versus non-medical support — required

`care_offerings.offering_type = home_care` is too broad for Altoan, Alterum, Pro Senectute accompaniment, and Service d'aide familiale de Morges. Presenting them under the same medical OSAD offering would mislead users.

Add `home_support` as a distinct offering type with a consumer label that does not imply nursing, LAMal reimbursement, or OSAD authorization. Keep `providers.primary_type = domicile`; the distinction belongs to the offering.

### 5. Authorization/class evidence — required before Type-2/SSJN import

Type 1, Type 2, SSJN, extra-cantonal authorization, and dated authorization status are sourced, jurisdiction-specific, and time-sensitive. They are not service features or permanent provider types.

Propose a sourced offering authorization/designation table with provider/offering, jurisdiction, scheme, class code, status, effective/observed date, and source. Absence must remain unknown. Do not infer authorization from a regional directory, legal existence, LAMal wording, or a provider website.

### Fits without schema change

- one organization operating several provider sites;
- a provider linked to an operator and a separate brand;
- one provider with one or more offerings;
- specialist providers using `home_care` plus reviewed specialist features and summaries;
- offering-scoped exact or narrative coverage;
- unknown facts represented by absent rows or null values.

Specialist wound, respiratory, psychiatric, and infusion concepts may require controlled application-taxonomy additions during a later enrichment design, but not a database enum migration now.

## Recommended implementation batches

No batch below is authorized by this audit alone.

1. **Architecture migrations and tests.** Add organization evidence, sourced names/succession, `network` relationship, `home_support`, and sourced authorization/class. Validate locally with no provider creation.
2. **Existing-record reconciliation.** Prepare non-writing canonical packets for `swisscaring`, `boite-o`, `dovida`/`homeinstead`, `sitex`, `alterum`, `pro-senectute`, `avasad-cms`, `vitadomo`, `senior-plus`, and `aide-familiale-morges`. Leave Senevita unchanged. Apply only after separate human approval.
3. **Straightforward official-file generalists.** 1 Monde PatientS, C-VITAL, OSAD Helvetia, Home Assistance, Hygie-Soins, La Source à domicile, Les Soins Volants, MSG Soins, Ô Santé, Proxi-Soins, La-solution.ch, Soins Riviera, Swiss Agi San, and Val'Soins. Reconciled `boite-o` and `swisscaring` belong to batch 2 rather than being duplicated here.
4. **Complex brand/site structures.** AMAD's three sites/two legal entities, Vivradom's two sites/two legal entities, Dovida/Home Instead, and the La Boîte O/La Réponse relationship.
5. **Official specialist and institution-linked providers.** GRPTP, Ligue pulmonaire vaudoise, NOMàD, SBV Medical, Sitex, Fondation Beau-Séjour, and Le Levant. Hold the two foundations until their operating units and offerings are explicit.
6. **Public CMS by regional organization.** Create organization evidence first, then provider packets in seven sub-batches: FSL 8, APROMAD 8, APREMADOL 4, ASANTE SANA 10, ABSMAD 3, FLC 9, ASPMAD 8. Handle CMS Pays-d'Enhaut inside ASANTE SANA with the Pôle Santé operator link.
7. **Regional and extra-cantonal candidates.** ASDR, La Réponse, CPSE Alexandra, Sciensus, Nurse Home Care, SoinVaud, Permed Vaud, Méditrine, and Domi.Syl only after the listed authorization/status holds are cleared.
8. **Non-medical support.** Altoan, Alterum, Service d'aide familiale de Morges, and any proved direct Pro Senectute unit only after `home_support` is implemented and the product scope is approved.
9. **Type-2/SSJN/institutional remainder.** Process only after the authorization model and consumer inclusion policy exist. Do not mix this batch with ordinary Type-1 providers.

Phase 5G enrichment must wait until the identity/action packet for each batch is approved and any required schema migrations are reviewed and applied locally.

## Safety confirmation

- The Phase 5E and September 21 workbooks were opened read-only and were not modified or exported.
- Local Supabase was queried only through existing read-only verification paths.
- No provider, organization, offering, feature, service-area, publication, or verification write occurred.
- No production Supabase credentials, endpoint, database, or API were accessed.
- No Phase 5G enrichment was started.
