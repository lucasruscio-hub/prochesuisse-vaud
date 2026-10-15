# Vaud V1 marketplace data cutover

Date: 2026-10-13

Repository checkpoint: `d12a390691dd7c2e3c4d90107bb08e501c0c3853`

Scope: architecture and local reconciliation only. Production was not accessed and no database row was changed.

## Decision

Make the canonical provider repository the only marketplace source, but publish from an explicitly reviewed cohort rather than treating all database rows as listings. The local database contains 141 providers and zero published rows. Of those, 111 are evidence-backed, patient-facing **publication candidates**; 30 must remain excluded. A candidate is not yet publishable: every candidate is still `unverified` and `is_published = false` and requires a human publication decision.

| Category | Canonical rows | V1 candidates | Remain excluded | Candidate rate |
|---|---:|---:|---:|---:|
| EMS | 46 | 31 | 15 | 67.4% |
| Home care/support | 87 | 80 | 7 | 92.0% |
| Senior residences | 8 | 0 | 8 | 0% |
| **Total** | **141** | **111** | **30** | **78.7%** |

## Current runtime sources and gaps

| Surface | Source today | Consequence |
|---|---|---|
| `/recherche` | `app/recherche/page.js` calls `listProviders()`; `lib/provider-repository.js` maps the 66 checked-in rows from `lib/providers.js`. | The database is not read. New canonical providers cannot appear. |
| Search/filter/cards | `RechercheClient.js` receives the static DTO: legacy ID/slug, name, type, commune, NPA, display address and unverified legacy tags. | Category, locality and name work; special filters and chips are based on claims that cannot be carried into the canonical public projection unchanged. Cards have no image or rating fields. |
| `/prestataires/[slug]` and metadata | `getProviderDetailBySlug()` first requires a static-catalog match. It then optionally overlays local data and Google data only in development. | Canonical-only slugs 404. Production still renders static data. |
| Local detail preview | `read-local-provider-detail.mjs`, `provider-local-projection.js` and `provider-care-projection.js`. Identity/contact overlay is limited to two pilots; care overlay is limited to legacy static slugs and requires unpublished/unverified records. | This is a validation harness, not a production repository. It also rejects CMS `network` relationships and would reject records after publication. |
| Google detail preview | A gitignored, development-only approval file plus the Places API. | Separation and attribution are sound, but no deployable human-approved match registry exists. |

The canonical schema already holds stable UUID identity, slug, current name, category, locality/postal/address components, contact fields, lifecycle, publication and verification state, evidence, organizations, offerings, controlled features and service areas. The production projection does not exist.

Static fields that cannot simply be copied are:

- `tags`: `original_tags` are preserved legacy provenance, not reviewed public facts. Card chips and special filters must come only from published offering fields and controlled features. `Alzheimer`, `Court séjour` and `Public` have canonical equivalents when positively evidenced; `Vue lac` does not yet.
- `address`: build the display location from reviewed address/locality fields. For home care, an office address must never become a claimed service area.
- media and external ratings: neither belongs in the current provider projection. Provider-owned media also lacks source/rights metadata.
- freshness: source dates exist in private evidence, but the public DTO needs an explicit Lia review date and a separate external-fact retrieval time.

## Exact V1 cohort

The candidate rule is: active patient-facing provider/site, at least one active sourced canonical offering, reconciled identity, and no recorded category hold or V1 exclusion. This selects exactly the following local rows; it does not change their publication state.

**EMS — 31 candidates:** `ems-arcades`, `ems-boissonnet`, `ems-boveresses`, `ems-chantemerle`, `ems-chateau-rive`, `ems-clair-soleil`, `ems-girarde`, `ems-grand-pre`, `ems-jardins-leman`, `ems-joli-automne`, `ems-laurelles-vevey`, `ems-le-home`, `ems-lys`, `ems-marronnier`, `ems-mauri`, `ems-meillerie`, `ems-meridienne`, `ems-odysse`, `ems-paix-soir`, `ems-palmiers`, `ems-petit-flon`, `ems-pins`, `ems-praz-joret`, `ems-pre-fleuri`, `ems-pre-pariset`, `ems-pre-tour`, `ems-rozavere`, `ems-sauvabelin`, `ems-tremieres`, `ems-valency`, `ems-vernie`.

**Home care/support — 80 candidates:** all 50 site-level `cms-*` providers, plus `1-monde-patients`, `altoan`, `amad-homecare-lutry`, `amad-homecare-nyon`, `boite-o`, `c-vital`, `dovida`, `grptp`, `home-assistance`, `hygie-soins`, `la-solution-ch`, `la-source-a-domicile`, `les-soins-volants`, `ligue-pulmonaire-vaudoise`, `msg-soins`, `nomad`, `o-sante`, `osad-beau-sejour`, `osad-helvetia`, `proxi-soins`, `samsa-levant`, `sbv-medical`, `senevita-vaud`, `sitex`, `soins-riviera`, `swiss-agi-san`, `swisscaring`, `val-soins`, `vivradom-orbe`, and `vivradom-renens`. The 50 CMS are: `cms-ancien-stand`, `cms-aubonne`, `cms-avenches`, `cms-bussigny-villars-ste-croix`, `cms-centre-ville`, `cms-chailly-sallaz`, `cms-chaussy`, `cms-clarens`, `cms-cossonay`, `cms-cully`, `cms-des-peupliers`, `cms-du-mont`, `cms-echallens`, `cms-ecublens-saint-sulpice-chavannes`, `cms-epalinges`, `cms-gland-region`, `cms-gland-ville`, `cms-grande-eau`, `cms-grandson`, `cms-gryonne`, `cms-la-tour-de-peilz`, `cms-la-vallee`, `cms-montelly`, `cms-montreux`, `cms-morges-est`, `cms-morges-ouest`, `cms-moudon`, `cms-nyon`, `cms-orbe`, `cms-oron`, `cms-ouchy`, `cms-payerne`, `cms-pays-denhaut`, `cms-prilly-nord`, `cms-prilly-sud`, `cms-pully`, `cms-renens-nord-crissier`, `cms-renens-sud`, `cms-rennaz`, `cms-riponne`, `cms-rolle`, `cms-saint-prex`, `cms-sainte-croix`, `cms-terre-sainte`, `cms-valency`, `cms-vallorbe`, `cms-vevey-est`, `cms-vevey-ouest`, `cms-yverdon`, and `cms-yvonand`.

The exclusions are exhaustive:

- EMS research holds: `ems-signal`, `ems-bethanie`, `ems-novalles`, `ems-oriel`, `ems-gottrause`.
- EMS historical, wrong-class or structural exclusions: `ems-orme` (must split into sites), `ems-naz` and `ems-mont-calme` (historical), `ems-aubepines`, `ems-praz-sechaud`, `epsm-borde`, `epsm-collonges`, `epsm-rouvraie` (EPSM, not EMS V1), `ems-penates` (non-medical/home-care), and `ems-ligniere` (clinic/therapy/home-care, no current EMS listing).
- Home care historical/umbrella/unresolved: `avasad-cms` and `homeinstead` are archived; `pro-senectute` is organization-level rather than a resolved operating unit; `alterum`, `aide-familiale-morges`, `senior-plus`, and `vitadomo` lack sufficient current patient-facing evidence.
- Senior residences: `alterimo`, `cerisiers-morges`, `gout-bonheur`, `laurelles-residence`, `netage`, `nova-via`, `residence-lac-nyon`, and `village-senior-crissier` remain excluded. They have legacy evidence only and no canonical organization or `senior_residence` offering.

## Publication and routing contract

Use the existing fields according to their distinct meanings:

- `status` describes lifecycle/identity (`active`, `inactive`, `archived`); it is not a review score.
- `verification_status` describes reviewed quality/freshness. V1 public records must be at least `partially_verified`; `verified` is reserved for the stronger standard, and `unverified`/`stale` do not enter the marketplace.
- `is_published` is the explicit editorial switch. It never follows automatically from `active`, an offering, a source, a Google match, or a verification transition.
- `last_reviewed_at` records the human review that authorized the public projection.

Publication should be an atomic, auditable operation for one provider: assert the reviewed cohort/fingerprint, active provider, sourced patient-facing offering and absence of a hold; then publish the provider and only the offering, organization/name rows intended for display. Sources remain private. The read path must still explicitly require `status = active`, `is_published = true`, and an allowed verification status even though RLS already protects anonymous reads.

Keep `providers.slug` as the canonical URL key and UUID as the internal/keyed identity. All existing retained listings keep their current slug, including locality-stale slugs such as `ems-laurelles-vevey`; canonical-only providers immediately gain the same `/prestataires/[slug]` route once published.

Route resolution should be: published active exact slug; otherwise an approved one-to-one predecessor/successor link to a published target with a permanent redirect; otherwise a non-indexed unavailable response. `homeinstead` can redirect to `dovida` from the existing successor evidence. Do not redirect an umbrella (`avasad-cms`) or a split identity (`ems-orme`) to an arbitrary establishment. Historical names may aid internal/search matching but do not create duplicate public pages.

The page component is visually category-capable (EMS, home care and residence labels/icons, generic offerings/contact/fallback sections), but the data path is not. A new public repository adapter must replace the static-first requirement and the preview-only projectors. EMS and home care can use the generic page after projection fixes. Residence support is not data-complete until each eligible residence has a reconciled patient-facing identity, operator/evidence, and a sourced `senior_residence` offering. EMS still needs the five holds resolved and site/reclassification work for the ten exclusions; none should block publishing the reviewed 31.

## Target public projection

Use one server-side projection for cards and details, with detail-only fields added as needed:

```text
PublicProvider {
  id, slug, name, category,
  location { locality, postalCode, displayLabel },
  badges[],                 // only published offering/features
  lia { verificationStatus, reviewedAt },
  heroImage? { origin, url, alt, sourceUrl, credit, rightsBasis, reviewedAt },
  externalRating? { source: "google", value, reviewCount, sourceUrl, retrievedAt }
}
```

Provider-owned hero images need a small publishable media record with source URL, credit, rights basis/permission, alt text, human review metadata and primary-image selection. Google matching needs a private, deployable approval record keyed to provider UUID with Place ID, approval state, reviewer/date and identity note. A Google match never affects Lia verification or eligibility.

Only the approved Place ID is durable Lia identity data. Rating, review count, photo URLs and Google attribution are fetched as external facts at render/cache time, remain under an `externalRating`/Google media namespace, carry their retrieval time and source link, and are not copied into provider columns or presented as Lia-reviewed facts. Provider media takes precedence for the hero; otherwise an attributed Google photo may be used; otherwise the existing decorative/category fallback remains. Missing rating renders no rating block, never zero stars.

## Smallest safe implementation sequence

1. Add tested canonical list/detail projections and a server repository adapter behind a cutover flag. Preserve the current card/detail component contracts while replacing legacy tags with only supported canonical badges; hide unsupported special filters. Test all three categories, null fields, CMS network links and RLS/publication gates.
2. Add exact-slug and successor route resolution, including `homeinstead` → `dovida`, plus non-indexed behavior for excluded/no-successor slugs. Run static-versus-canonical route regression tests before switching reads.
3. Build a dry-run-first, atomic staff publication workflow. Human-review the 111 candidates in category batches, set at least partial verification/review time, and publish only their intended child rows. Start with a small mixed EMS/home-care canary, then the remaining 31 EMS and 80 home-care/support candidates. Leave all 30 exclusions unchanged. Switch `/recherche` and detail reads to canonical-only after count, route and filter parity checks; remove the static runtime fallback only after rollback observation.
4. Reconcile residences separately and resolve the remaining EMS holds/site splits. Add them only through the same review/publication gate; do not delay the 111-provider cutover for them.
5. After the canonical cohort is live, add provider-media records and card/detail hero rendering, then the human-approved Place-ID registry and runtime Google enrichment. Images and ratings remain optional, so rollout cannot suppress a provider or break a card.

This order fixes the source-of-truth problem before enrichment, preserves existing valid inbound URLs, and makes every additional public record an explicit human decision rather than a bulk consequence of migration.
