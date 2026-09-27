# Phase 5C — Home-care provider identity resolution

## Scope and safety result

This review resolves identity before care facts. It makes no provider,
organization, offering, feature, language, service-area, pricing,
reimbursement, availability, publication, or verification write. It does not
promote any legacy tag to an evidenced service. All sources below were accessed
on **2026-09-27**.

The accompanying review and canonical packets are deliberately non-writing:
`localApply`, `publish`, and `verify` are all `false`, and `dataWrites` is empty.

## Senevita Vaud — reconciliation pilot

### Resolved identity

- **Current public name:** Senevita Casa Vaud.
- **Brand and legal organization:** Senevita Casa is the home-care brand;
  Senevita AG is the legal/headquarters identity presented by the official
  site.
- **What the Lia record represents:** an actual Vaud home-care operating site
  with its office at Avenue des Baumettes 3, 1020 Renens, not merely the
  national organization. The official directory lists it as one Senevita site.
- **Operating-unit relationship:** the official team page assigns personnel to
  Riviera, La Côte, Lausanne, and the western region within the Vaud team. That
  supports internal regional field responsibilities, not separate provider
  identities.
- **History:** “Spitex pour la Ville et la Campagne” became “Senevita Casa” on
  1 July 2021. Senevita says the former operation had been wholly owned by the
  Senevita group since 2016.

### Evidence

| Context | Source | Temporal status | Confidence / ambiguity |
|---|---|---|---|
| Current site identity, office and contact | [Senevita Casa Vaud](https://www.senevita.ch/fr/sites/spitex-vaud/) | Current | High |
| Site versus group organization | [Senevita site directory](https://www.senevita.ch/fr/sites/) | Current | High |
| Vaud team structure | [Notre équipe](https://www.senevita.ch/fr/sites/spitex-vaud/equipe/) | Current | Medium: licensing or legal boundaries below the Vaud site are not stated |
| Legal/headquarters identity | [Mentions légales](https://www.senevita.ch/fr/impressum/) | Current | High; no separately registered Vaud entity is identified |
| Former brand succession | [Spitex pour la Ville et la Campagne devient Senevita Casa](https://www.senevita.ch/fr/actualites/medienmitteilungen/2021/spitex-pour-la-ville-et-la-campagne-devient-senevita-casa.php) | Historical | High |

### Recommended Lia action

**Keep; link as organization.** Keep one `senevita-vaud` provider identity for
Senevita Casa Vaud and later link it to Senevita AG. Do not split the regional
team structure without evidence of separately accountable operating units.

Unresolved: a separate Vaud authorization or registration beneath Senevita AG
was not established, and the regional teams' operational boundaries remain
unstated.

## AVASAD / CMS

### Resolved identity

- **Current public identities:** AVASAD is the cantonal organization; CMS Vaud
  is the public network identity for the local centers.
- **Legal organization:** the AVASAD charter describes the Association vaudoise
  d'aide et de soins à domicile as an autonomous public-law association with
  legal personality.
- **What the Lia record represents:** the legacy label “AVASAD – CMS Vaud” is a
  network-level umbrella that conflates several organizational levels. It is
  not one CMS office or operating unit.
- **Operating-unit relationship:** AVASAD's system comprises seven regional
  associations or foundations and approximately fifty local CMS. Official
  material says the regional bodies are employers and services are delivered
  through their CMS.
- **Current central contact:** AVASAD's transversal services are at Avenue de
  Rhodanie 60, 1014 Lausanne. This is a cantonal administrative identity, not a
  patient-facing local CMS and not corroboration of the legacy Lausanne 1004
  provider location.

### Evidence

| Context | Source | Temporal status | Confidence / ambiguity |
|---|---|---|---|
| Current CMS network identity and count | [CMS Vaud](https://www.cms-vaud.ch/) | Current | High; says 50 CMS |
| AVASAD identity and central contact | [AVASAD](https://www.cms-vaud.ch/avasad/) | Current | High |
| Cantonal, regional and local levels | [Organisation du dispositif](https://www.cms-vaud.ch/organisation-du-dispositif/) | Current | High |
| Employers and delivery structure | [Direction générale et services](https://www.cms-vaud.ch/avasad/direction-generale-et-services/) | Current | High |
| Public-authority description | [État de Vaud — aide et soins à domicile](https://www.vd.ch/sante-soins-et-handicap/vivre-a-domicile/aide-a-domicile) | Current | High, but says 49 CMS |
| Legal form | [Charte des CMS](https://www.cms-vaud.ch/app/uploads/Charte-des-CMS.pdf) | Current organizational document | High |

### Recommended Lia action

**Hold; link as organization; split later.** Preserve AVASAD as an organization
identity. Do not retain the compound legacy record as one patient-facing
provider. A later phase may create explicitly resolved local CMS provider
records and link them through the correct regional organizations.

Unresolved: official sources disagree between 49 and 50 CMS, the catalog's
desired local-unit granularity is not yet approved, and no current operating
unit supports the legacy Lausanne 1004 location.

## Pro Senectute

### Resolved identity

- **Current public and registered name:** Pro Senectute Vaud, UID
  CHE-106.079.897.
- **Brand versus legal entity:** Pro Senectute is the shared brand. Pro Senectute
  Vaud is a legally independent cantonal organization; Pro Senectute Suisse is
  the national umbrella.
- **What the Lia record represents:** the cantonal elderly-support organization,
  not a specific Spitex unit, nursing provider, local office, or franchise.
- **Current contact:** Rue du Maupas 51, 1004 Lausanne, 021 646 17 21. This does
  not match the legacy Lausanne 1012 location.
- **Home-support boundary:** Pro Senectute Vaud directly presents home visits
  and practical/social accompaniment. Official Pro Senectute material also
  distinguishes accompaniment from medical and nursing care, and national
  service descriptions do not prove that every service is directly operated in
  Vaud.

### Evidence

| Context | Source | Temporal status | Confidence / ambiguity |
|---|---|---|---|
| Cantonal organization and contact | [Pro Senectute Vaud — structure](https://vd.prosenectute.ch/fr/l-association/notre-association/structure) | Current | High |
| Registered name and UID | [Pro Senectute Vaud — impressum](https://vd.prosenectute.ch/fr/impressum.html) | Current | High |
| National/cantonal organization | [L'ensemble de l'organisation](https://fr.prosenectute.ch/pro-senectute/fr/qui-sommes-nous/l-ensemble-de-l-organisation.html) | Current | High |
| Legal independence | [Stratégie](https://www.prosenectute.ch/fr/qui-sommes-nous/l-ensemble-de-l-organisation/strategie) | Current | High |
| Vaud home visits and accompaniment | [Pro Senectute Vaud — accompagnement](https://vd.prosenectute.ch/fr/services/accompagnement.html) | Current | High |
| Accompaniment versus care boundary | [Accompagnement et aide à domicile](https://vd.prosenectute.ch/pro-senectute/fr/services/aides/aide-a-domicile.html) | Current | High; national catalog availability must not be assumed in Vaud |

### Recommended Lia action

**Hold; link as organization.** Model Pro Senectute Vaud as the cantonal
organization first. Hold the legacy domicile-provider row until an
offering-level review proves a concrete, in-scope Vaud operation. Do not infer
home-care-provider status from its mission for older adults or from a generic
national service catalog.

Unresolved: which services are directly operated in Vaud rather than referred
or partner-delivered, whether any such offering belongs in Lia's provider
catalog, and the origin of the legacy 1012 location.

## Home Instead / Dovida

### Resolved identity

- **Current public brand:** Dovida.
- **Legal organization:** Seniorendienste Schweiz AG, headquartered at Erlenweg
  3, 4310 Rheinfelden.
- **Rename and continuity:** in March 2025 the Swiss operation announced that
  Home Instead Schweiz had become Dovida after ending its partnership with Home
  Instead. It described continuity of the Swiss team and service operation.
  Home Instead is therefore a historical Swiss brand relationship, not the
  current name.
- **What the Lia record most likely represents:** a placeholder for the current
  Vaud/Valais regional operation. Current official material identifies a
  “Bureau de Crissier” using 021 614 00 50 and `info.romandie@dovida.ch`; it does
  not corroborate the legacy Lausanne 1006 location.
- **Network/branch relationship:** the Lausanne page says a local independent
  partner agency provides access together with a local Dovida branch, and that
  the Dovida branch supplies the services. The partner agency's legal name and
  contractual boundary are not disclosed there.

### Evidence

| Context | Source | Temporal status | Confidence / ambiguity |
|---|---|---|---|
| French rebrand announcement | [Nous sommes désormais Dovida](https://dovida.ch/fr/neuigkeiten/nous-sommes-desormais-dovida-un-nouveau-nom-la-meme-qualite-daccompagnement-a-domicile/) | Historical, published 2025-03-04 | High |
| Swiss rebrand and continuity | [Home Instead Schweiz heisst neu Dovida](https://dovida.ch/neuigkeiten/home-instead-schweiz-heisst-neu-dovida-neuer-name-gleiche-betreuung/) | Historical, published 2025-03-04 | High |
| Current legal controller | [Déclaration de protection des données](https://dovida.ch/fr/declaration-de-protection-des-donnees/) | Current | High |
| Lausanne regional presentation | [Dovida Lausanne](https://dovida.ch/fr/local-office/lausanne/) | Current | Medium for legacy-record mapping; partner entity unnamed |
| Current Vaud/Valais office label | [Location de personnel — contacts régionaux](https://dovida.ch/fr/pro/location-de-personnel-pour-les-institutions/) | Current | High for “Bureau de Crissier”; no street address shown |
| Legal organization and management | [Direction générale](https://dovida.ch/fr/a-propos-de-nous/direction-generale/) | Current | High |

### Recommended Lia action

**Hold; link as organization; supersede historically.** Keep the current record
unwritten while the Crissier branch and independent partner agency are resolved.
Later link the operating identity to Seniorendienste Schweiz AG and preserve
Home Instead Schweiz as the historical brand. Do not merge hypothetical records
or create Lausanne/Nyon/Riviera records merely from geographic landing pages.

Unresolved: the Crissier street address and registered branch identity, the
partner agency's legal identity, whether public geographic pages represent
distinct accountable units, and the provenance of the legacy Lausanne 1006
record.

## Phase 5C disposition matrix

| Legacy record | Resolved level | Recommended action | Split now? |
|---|---|---|---|
| `senevita-vaud` | Vaud operating site under Senevita AG | Keep; link as organization | No |
| `avasad-cms` | Cantonal umbrella/network, not one CMS | Hold; link as organization; split later into explicitly resolved CMS | No |
| `pro-senectute` | Legally independent cantonal elderly-support organization | Hold; link as organization | No |
| `dovida` | Current brand plus probable Vaud/Valais regional operation under Seniorendienste Schweiz AG | Hold; link as organization; preserve Home Instead historically | No |

## Human-review boundary

Approval of this report would approve only the identity conclusions and future
record strategy. It would not authorize provider or organization mutation,
service enrichment, coverage population, publication, verification, or any
local or production database write.
