# Vaud V1 marketplace reconciliation

Generated from the architecture-approved manifest and the canonical local provider repository. Production was not accessed.

## Cohort summary

| Cohort | EMS | Home care/support | Senior residences | Total |
|---|---:|---:|---:|---:|
| Legacy static visible | 46 | 12 | 8 | 66 |
| Canonical V1 visible | 31 | 80 | 0 | 111 |

- Exact legacy slugs preserved: **36**.
- Certain permanent redirect: **1** (`homeinstead` → `dovida`).
- Legacy identities removed or held without redirect: **29**.
- Canonical-only identities added: **75**.

## Preserved exact slugs

`boite-o`, `dovida`, `ems-arcades`, `ems-boissonnet`, `ems-boveresses`, `ems-chantemerle`, `ems-chateau-rive`, `ems-clair-soleil`, `ems-girarde`, `ems-grand-pre`, `ems-jardins-leman`, `ems-joli-automne`, `ems-laurelles-vevey`, `ems-le-home`, `ems-lys`, `ems-marronnier`, `ems-mauri`, `ems-meillerie`, `ems-meridienne`, `ems-odysse`, `ems-paix-soir`, `ems-palmiers`, `ems-petit-flon`, `ems-pins`, `ems-praz-joret`, `ems-pre-fleuri`, `ems-pre-pariset`, `ems-pre-tour`, `ems-rozavere`, `ems-sauvabelin`, `ems-tremieres`, `ems-valency`, `ems-vernie`, `senevita-vaud`, `sitex`, `swisscaring`

## Removed or held legacy identities

`aide-familiale-morges`, `alterimo`, `alterum`, `avasad-cms`, `cerisiers-morges`, `ems-aubepines`, `ems-bethanie`, `ems-gottrause`, `ems-ligniere`, `ems-mont-calme`, `ems-naz`, `ems-novalles`, `ems-oriel`, `ems-orme`, `ems-penates`, `ems-praz-sechaud`, `ems-signal`, `epsm-borde`, `epsm-collonges`, `epsm-rouvraie`, `gout-bonheur`, `laurelles-residence`, `netage`, `nova-via`, `pro-senectute`, `residence-lac-nyon`, `senior-plus`, `village-senior-crissier`, `vitadomo`

No speculative redirect is defined for these identities. They return the non-indexed unavailable response.

## Added canonical identities

`1-monde-patients`, `altoan`, `amad-homecare-lutry`, `amad-homecare-nyon`, `c-vital`, `cms-ancien-stand`, `cms-aubonne`, `cms-avenches`, `cms-bussigny-villars-ste-croix`, `cms-centre-ville`, `cms-chailly-sallaz`, `cms-chaussy`, `cms-clarens`, `cms-cossonay`, `cms-cully`, `cms-des-peupliers`, `cms-du-mont`, `cms-echallens`, `cms-ecublens-saint-sulpice-chavannes`, `cms-epalinges`, `cms-gland-region`, `cms-gland-ville`, `cms-grande-eau`, `cms-grandson`, `cms-gryonne`, `cms-la-tour-de-peilz`, `cms-la-vallee`, `cms-montelly`, `cms-montreux`, `cms-morges-est`, `cms-morges-ouest`, `cms-moudon`, `cms-nyon`, `cms-orbe`, `cms-oron`, `cms-ouchy`, `cms-payerne`, `cms-pays-denhaut`, `cms-prilly-nord`, `cms-prilly-sud`, `cms-pully`, `cms-renens-nord-crissier`, `cms-renens-sud`, `cms-rennaz`, `cms-riponne`, `cms-rolle`, `cms-saint-prex`, `cms-sainte-croix`, `cms-terre-sainte`, `cms-valency`, `cms-vallorbe`, `cms-vevey-est`, `cms-vevey-ouest`, `cms-yverdon`, `cms-yvonand`, `grptp`, `home-assistance`, `hygie-soins`, `la-solution-ch`, `la-source-a-domicile`, `les-soins-volants`, `ligue-pulmonaire-vaudoise`, `msg-soins`, `nomad`, `o-sante`, `osad-beau-sejour`, `osad-helvetia`, `proxi-soins`, `samsa-levant`, `sbv-medical`, `soins-riviera`, `swiss-agi-san`, `val-soins`, `vivradom-orbe`, `vivradom-renens`

## Field losses and degradations

- Legacy `original_tags` no longer appear as public facts or search filters. Canonical badges come only from sourced offering fields and controlled features.
- The unsupported `Vue lac` filter is removed. `Alzheimer`, `Court séjour`, and `Public` appear only when canonical evidence supports the corresponding badge.
- A home-care office location remains a display location and is not presented as service coverage.
- Providers without reviewed street details show locality/postcode only; missing locality is shown as `Canton de Vaud` rather than inferred.
- All eight legacy residence identities remain held, so the residence tab is preserved with a zero-result state.
- Missing hero media retains the decorative fallback. Missing approved Google identity or request-time data renders no external rating.
- Google ratings, review counts, review text, and photo URLs remain request-time external data and are not durable Lia provider facts.
