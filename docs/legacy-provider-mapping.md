# Legacy provider mapping review — Phase 1

Generated from all 66 records in lib/providers.js: 46 ems, 12 domicile, 8 residence. No records are imported or altered.

REVIEW CANDIDATES ONLY. Proposed codes below are exact lexical interpretations of UNVERIFIED legacy tags, not verified service facts. The future initial import MUST NOT automatically populate service_codes from these proposals. Preserve every original tag in original_tags and leave service_codes empty unless each assignment is individually verified/approved. Keep ambiguous provider identities unpublished. Empty arrays mean unknown/not recorded, not confirmed absence. No language, price, availability, public/private status, street, coordinates, or coverage is inferred.

Preserve legacy_id and use that same string as the proposed stable slug; let the database create a new UUID. Preserve original_location_text exactly as shown. Keep commune and NPA as raw reported locality/postal values until checked; municipality_id stays null until resolved against an authoritative reference. Country CH is the requested scope; any proposed VD assignment still needs record-level confirmation. Keep unverified/unpublished, last_reviewed_at null, and record a legacy source rather than inventing a public URL or review date.

All identity notes are review questions based only on the repository. They do not assert real-world duplication, ownership, or current operation. No ambiguous records should be dropped or merged automatically.

## Tags without a safe V1 service-code mapping

- 24h/24
- Accompagnement
- Activités
- Aide domicile
- Animaux acceptés
- Appartements
- Bilingue
- Campagne
- Centre
- Chablais
- CMS
- Concept unique
- Gériatrie
- HAD
- Haut de gamme
- La Côte
- Lac Léman
- LADA
- LAMal
- Lavaux
- Nord Vaud
- OSAD
- Parc
- Psychiatrie
- Public
- Riviera
- Senior +50
- Services
- Soins
- Soins urgents
- Spécialisé
- Spitex
- Tarif social
- Tout Vaud
- Vue lac

These may describe geography, organizational/funding claims, housing terminology, amenities, or overly broad services. In particular: Bilingue supplies no language codes; 24h/24 does not establish a specific night-care service; Spitex/CMS/OSAD/HAD/Soins do not prove nursing; LADA is not mapped to adapted_housing without checking the underlying offering; Public/LAMal/Tarif social are not verified status or price facts.

## Complete record-by-record report

| Legacy ID | Current name | Type | Commune | NPA | Original tags (preserve all) | Original location text | Proposed service codes (review required) | Tags not safely mapped | Identity / operation concerns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ems-chateau-rive | EMS Château de la Rive | ems | Lutry | 1095 | Gériatrie; Court séjour; Lavaux | Lutry · 1095 | short_stay | Gériatrie; Lavaux | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-clair-soleil | EMS Clair Soleil | ems | Ecublens | 1024 | Gériatrie; Long séjour | Ecublens · 1024 | long_stay | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-chantemerle | EMS de Chantemerle | ems | Lutry | 1093 | Gériatrie | Lutry · 1093 | None | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-boissonnet | EMS Fondation Louis Boissonnet | ems | Lausanne | 1010 | Gériatrie; Soins palliatifs | Lausanne · 1010 | palliative_care | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. |
| ems-orme | EMS Fondation de L'Orme | ems | Lausanne | 1018 | Gériatrie | Lausanne · 1018 | None | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. |
| ems-joli-automne | EMS Joli Automne | ems | Ecublens | 1024 | Gériatrie; Alzheimer | Ecublens · 1024 | dementia_support | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-oriel | EMS L'Oriel | ems | Renens | 1020 | Gériatrie | Renens · 1020 | None | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-meridienne | EMS La Méridienne – Fondation Primerose | ems | Renens | 1020 | Gériatrie; Court séjour; Alzheimer | Renens · 1020 | short_stay; dementia_support | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. |
| ems-naz | EMS La Naz | ems | Le Mont-sur-Lausanne | 1052 | Gériatrie | Le Mont-sur-Lausanne · 1052 | None | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-paix-soir | EMS La Paix du Soir | ems | Le Mont-sur-Lausanne | 1052 | Gériatrie; Soins palliatifs | Le Mont-sur-Lausanne · 1052 | palliative_care | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-vernie | EMS La Vernie | ems | Crissier | 1023 | Gériatrie | Crissier · 1023 | None | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-grand-pre | EMS Le Grand Pré – Fondation Primeroche | ems | Cheseaux-sur-Lausanne | 1033 | Gériatrie; Alzheimer | Cheseaux · 1033 | dementia_support | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. Display address abbreviates Cheseaux-sur-Lausanne to Cheseaux; resolve official municipality independently. |
| ems-le-home | EMS Le Home | ems | Pully | 1009 | Gériatrie; Vue lac | Pully · 1009 | None | Gériatrie; Vue lac | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-marronnier | EMS Le Marronnier | ems | Lutry | 1095 | Gériatrie; Lavaux | Lutry · 1095 | None | Gériatrie; Lavaux | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-signal | EMS Le Signal | ems | Les Cullayes | 1080 | Gériatrie; Campagne | Les Cullayes · 1080 | None | Gériatrie; Campagne | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Les Cullayes is a legacy place label; verify its current municipality identity rather than creating a municipality from this string. |
| ems-arcades | EMS Les Arcades – Groupe Odysse | ems | Lutry | 1095 | Gériatrie; Court séjour | Lutry · 1095 | short_stay | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. Group affiliation in name; compare with ems-odysse to distinguish operator and facility. |
| ems-aubepines | EMS Les Aubépines – SISP | ems | Lausanne | 1004 | Gériatrie; Public | Lausanne · 1004 | None | Gériatrie; Public | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. |
| ems-boveresses | EMS Les Boveresses | ems | Lausanne | 1010 | Gériatrie; Psychiatrie | Lausanne · 1010 | None | Gériatrie; Psychiatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-lys | EMS Les Lys – Fondation Primeroche | ems | Prilly | 1008 | Gériatrie | Prilly · 1008 | None | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. |
| ems-novalles | EMS Les Novalles | ems | Renens | 1020 | Gériatrie; Alzheimer | Renens · 1020 | dementia_support | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-pins | EMS Les Pins | ems | Lausanne | 1010 | Gériatrie | Lausanne · 1010 | None | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-meillerie | EMS Meillerie – Fondation La Rozavère | ems | Lausanne | 1006 | Gériatrie; Soins palliatifs | Lausanne · 1006 | palliative_care | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. |
| ems-odysse | EMS Odysse SA | ems | Lutry | 1093 | Gériatrie; Court séjour | Lutry · 1093 | short_stay | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Corporate name (SA) may describe an operator rather than a single site; compare with ems-arcades without merging automatically. |
| ems-valency | EMS Parc de Valency – SISP | ems | Lausanne | 1004 | Gériatrie; Public | Lausanne · 1004 | None | Gériatrie; Public | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. |
| ems-petit-flon | EMS Petit-Flon – Fondation Bois-Gentil | ems | Lausanne | 1018 | Psychiatrie; Gériatrie | Lausanne · 1018 | None | Psychiatrie; Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. |
| ems-pre-pariset | EMS Pré Pariset | ems | Pully | 1009 | Gériatrie; Vue lac | Pully · 1009 | None | Gériatrie; Vue lac | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-pre-tour | EMS Pré-de-la-Tour | ems | Pully | 1009 | Gériatrie; Vue lac | Pully · 1009 | None | Gériatrie; Vue lac | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-pre-fleuri | EMS Pré-Fleuri | ems | Lausanne | 1018 | Gériatrie; Alzheimer | Lausanne · 1018 | dementia_support | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-praz-sechaud | EMS Résidence de Praz-Séchaud | ems | Lausanne | 1010 | Gériatrie | Lausanne · 1010 | None | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-girarde | EMS Résidence la Girarde | ems | Epalinges | 1066 | Gériatrie | Epalinges · 1066 | None | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Epalinges lacks the accent used in Épalinges; resolve official identity, preserve original spelling. |
| ems-tremieres | EMS Résidence Les Trémières | ems | Lausanne | 1006 | Gériatrie; Centre | Lausanne · 1006 | None | Gériatrie; Centre | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-praz-joret | EMS Résidence Praz Joret | ems | Jorat-Mézières | 1083 | Gériatrie; Campagne | Jorat-Mézières · 1083 | None | Gériatrie; Campagne | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-rozavere | EMS Rozavère | ems | Lausanne | 1010 | Gériatrie; Soins palliatifs | Lausanne · 1010 | palliative_care | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-sauvabelin | EMS Sauvabelin – Fondation Bois-Gentil | ems | Lausanne | 1018 | Psychiatrie; Parc | Lausanne · 1018 | None | Psychiatrie; Parc | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. |
| epsm-borde | EPSM Foyer de la Borde | ems | Lausanne | 1010 | Psychiatrie; Public | Lausanne · 1010 | None | Psychiatrie; Public | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. EPSM labelled record currently typed ems; review subtype and elderly-care scope before classification/publication. |
| epsm-collonges | EPSM La Maison Collonges | ems | Lausanne | 1004 | Psychiatrie | Lausanne · 1004 | None | Psychiatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. EPSM labelled record currently typed ems; review subtype and elderly-care scope before classification/publication. |
| epsm-rouvraie | EPSM La Maison de Rouvraie | ems | Lausanne | 1018 | Psychiatrie; Alzheimer | Lausanne · 1018 | dementia_support | Psychiatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. EPSM labelled record currently typed ems; review subtype and elderly-care scope before classification/publication. |
| ems-mauri | Fondation Donatella Mauri | ems | Romanel-sur-Lausanne | 1032 | Gériatrie | Romanel · 1032 | None | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. Foundation may be an operator or facility; abbreviated Romanel address requires review. |
| ems-mont-calme | Fondation Mont-Calme | ems | Lausanne | 1005 | Gériatrie; Soins palliatifs | Lausanne · 1005 | palliative_care | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. Foundation name may refer to an organization or a site; confirm the listing unit. |
| ems-penates | Home Fondation Nos Pénates | ems | Pully | 1009 | Gériatrie; Vue lac | Pully · 1009 | None | Gériatrie; Vue lac | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. Foundation affiliation; confirm the physical home versus operator identity. |
| ems-bethanie | Institution de Béthanie | ems | Lausanne | 1004 | Gériatrie; Court séjour | Lausanne · 1004 | short_stay | Gériatrie | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Institution name alone does not identify a precise physical site. |
| ems-ligniere | EMS La Lignière | ems | Gland | 1196 | Alzheimer; Démence; Spécialisé | Gland · 1196 | dementia_support | Spécialisé | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| ems-jardins-leman | EMS Les Jardins du Léman – GHOL | ems | Nyon | 1260 | Gériatrie; Court séjour; La Côte | Nyon · 1260 | short_stay | Gériatrie; La Côte | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. |
| ems-laurelles-vevey | EMS Les Laurelles | ems | Vevey | 1800 | Gériatrie; Vue lac; Haut de gamme | Vevey · 1800 | None | Gériatrie; Vue lac; Haut de gamme | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Possible shared operator/site with laurelles-residence in Vevey; distinguish services/sites before any merge. |
| ems-gottrause | EMS La Gottrause | ems | Yverdon-les-Bains | 1400 | Gériatrie; Nord Vaud | Yverdon · 1400 | None | Gériatrie; Nord Vaud | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Display address abbreviates Yverdon-les-Bains to Yverdon. |
| ems-palmiers | EMS Les Palmiers | ems | Aigle | 1860 | Gériatrie; Chablais | Aigle · 1860 | None | Gériatrie; Chablais | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| senevita-vaud | Senevita Casa Vaud | domicile | Renens | 1020 | Spitex; LAMal; 24h/24; Tout Vaud | Renens · 1020 | None | Spitex; LAMal; 24h/24; Tout Vaud | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Confirm locally identifiable service operation; office locality does not establish service coverage. Canton-wide brand/branch ambiguity. Tout Vaud is an unverified coverage claim, not a coverage record. |
| swisscaring | Swisscaring SA | domicile | Le Mont-sur-Lausanne | 1052 | Spitex; Aide domicile; Infirmières | Le Mont-sur-Lausanne · 1052 | nursing | Spitex; Aide domicile | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Confirm locally identifiable service operation; office locality does not establish service coverage. |
| homeinstead | HomeInstead Lausanne | domicile | Lausanne | 1003 | Aide domicile; Compagnie; Alzheimer | Lausanne · 1003 | companionship; dementia_support | Aide domicile | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Confirm locally identifiable service operation; office locality does not establish service coverage. Lausanne branch label; verify current operator/site identity independently, including any potential relationship to other brands. |
| boite-o | La Boîte O Services | domicile | Perroy | 1166 | OSAD; Soins; LAMal; La Côte | Perroy · 1166 | None | OSAD; Soins; LAMal; La Côte | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Confirm locally identifiable service operation; office locality does not establish service coverage. |
| dovida | Dovida | domicile | Lausanne | 1006 | Aide domicile; Alzheimer; Nuit | Lausanne · 1006 | dementia_support; night_care | Aide domicile | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Confirm locally identifiable service operation; office locality does not establish service coverage. Brand-only listing; establish local operation identity and do not merge with homeinstead based on assumptions. |
| sitex | SITEX SA | domicile | Lausanne | 1003 | HAD; Soins urgents; 24h/24; LAMal | Lausanne · 1003 | None | HAD; Soins urgents; 24h/24; LAMal | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Confirm locally identifiable service operation; office locality does not establish service coverage. |
| alterum | Alterum | domicile | Lausanne | 1003 | Senior +50; Aide domicile; Accompagnement | Lausanne · 1003 | None | Senior +50; Aide domicile; Accompagnement | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Confirm locally identifiable service operation; office locality does not establish service coverage. |
| pro-senectute | Pro Senectute Vaud | domicile | Lausanne | 1012 | Public; Tarif social; Aide ménagère | Lausanne · 1012 | domestic_help | Public; Tarif social | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Confirm locally identifiable service operation; office locality does not establish service coverage. Canton-level organization; identify actual local service operation(s), not one fictional facility. |
| avasad-cms | AVASAD – CMS Vaud | domicile | Lausanne | 1004 | Public; CMS; LAMal; Soins | Lausanne · 1004 | None | Public; CMS; LAMal; Soins | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Confirm locally identifiable service operation; office locality does not establish service coverage. Explicit CMS network-level listing; must resolve individual operations or retain as an unpublished unresolved record. |
| vitadomo | Vitadomo | domicile | Lausanne | 1006 | Aide domicile; Nuit; Week-end | Lausanne · 1006 | night_care; weekend_service | Aide domicile | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Confirm locally identifiable service operation; office locality does not establish service coverage. |
| senior-plus | Senior+ | domicile | Nyon | 1260 | Aide domicile; La Côte; Compagnie | Nyon · 1260 | companionship | Aide domicile; La Côte | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Confirm locally identifiable service operation; office locality does not establish service coverage. |
| aide-familiale-morges | Aide Familiale Morges | domicile | Morges | 1110 | Spitex; La Côte; Aide ménagère | Morges · 1110 | domestic_help | Spitex; La Côte | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Confirm locally identifiable service operation; office locality does not establish service coverage. |
| nova-via | Nova Via Residenzen Montreux | residence | Montreux | 1820 | Haut de gamme; Bilingue; Vue lac; Activités | Montreux · 1820 | None | Haut de gamme; Bilingue; Vue lac; Activités | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Named Montreux operation; verify specific site. Bilingue identifies no languages. |
| gout-bonheur | Le Goût du Bonheur | residence | Goumoens-la-Ville | 1376 | Concept unique; Campagne; Animaux acceptés | Goumoens · 1376 | None | Concept unique; Campagne; Animaux acceptés | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Display address abbreviates Goumoens-la-Ville to Goumoens; verify locality versus municipality. |
| laurelles-residence | Les Laurelles – Résidence | residence | Vevey | 1800 | Vue lac; Haut de gamme; Riviera | Vevey · 1800 | None | Vue lac; Haut de gamme; Riviera | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Possible shared operator/site with ems-laurelles-vevey; category difference is not proof of separate identity. |
| alterimo | Alterimo – Logements seniors | residence | Lausanne | 1018 | LADA; Appartement adapté; Services | Lausanne · 1018 | adapted_housing | LADA; Services | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Operator/portfolio-style logements seniors label; resolve individual site(s). |
| netage | Fondation NetAge | residence | Lausanne | 1004 | LADA; Public; Tarif social | Lausanne · 1004 | None | LADA; Public; Tarif social | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Organization/group affiliation in name; distinguish provider site from operator and related listings. Foundation-level identity may encompass multiple properties; establish listing unit. |
| cerisiers-morges | Résidence Les Cerisiers | residence | Morges | 1110 | LADA; Lac Léman; Services | Morges · 1110 | None | LADA; Lac Léman; Services | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| village-senior-crissier | Village Senior Crissier | residence | Crissier | 1023 | LADA; Appartements; Activités | Crissier · 1023 | None | LADA; Appartements; Activités | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. |
| residence-lac-nyon | Résidence du Lac – Nyon | residence | Nyon | 1260 | LADA; Vue lac; La Côte | Nyon · 1260 | None | LADA; Vue lac; La Côte | Identity and physical address unverified; name/locality/NPA alone do not establish a unique site. Generic residence name; establish unique site using a source and precise address. |
