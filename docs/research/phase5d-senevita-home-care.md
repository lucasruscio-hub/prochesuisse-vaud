# Phase 5D — Senevita Casa Vaud home-care pilot

Date de revue: 2026-09-27. État: appliqué et vérifié uniquement dans le Supabase local; revue humaine requise avant tout commit. Aucun accès à la production.

## Périmètre et identité réutilisée

Le paquet d'identité Phase 5C reste la référence: le prestataire `senevita-vaud` est **Senevita Casa Vaud**, site opérationnel de soins à domicile basé à Renens, relié à l'organisation **Senevita AG**. Aucune nouvelle preuve ne contredit cette identité. L'adresse du bureau n'est jamais utilisée comme zone d'intervention.

## Faits acceptés

Les pages officielles Senevita consultées le 2026-09-27 soutiennent les faits suivants:

- une offre «Aide et soins à domicile»;
- soins infirmiers à domicile (notamment plaies, médicaments, perfusions et injections);
- soins de base et aide aux activités de la vie quotidienne;
- aide au ménage;
- soins complexes;
- accompagnement des troubles cognitifs et soins palliatifs dans l'offre nationale Senevita Casa à domicile en Suisse (confiance moyenne pour leur projection au site Vaud);
- veille de nuit;
- présence et compagnie, explicitement décrites et non déduites d'un libellé générique;
- relève à domicile et soutien aux proches aidants;
- parcours de contact, clarification des besoins, évaluation, offre et plan d'intervention; OPAN pour les prescripteurs;
- financement des soins reconnus avec assurance-maladie et pouvoirs publics, et facturation au client des prestations non-soignantes sous réserve d'une assurance complémentaire;
- durée minimale d'une heure et tarifs 2026 de la région tarifaire 1 pour aide au ménage/accompagnement: CHF 53.50 par heure en semaine, CHF 58.90 le week-end et les jours fériés.

Sources officielles: [site Vaud](https://www.senevita.ch/fr/sites/spitex-vaud/), [soins ambulatoires](https://www.senevita.ch/fr/sites/spitex-vaud/soins-ambulatoires/), [aide au ménage](https://www.senevita.ch/fr/sites/spitex-vaud/aide-au-menage/), [soulagement des proches](https://www.senevita.ch/fr/sites/spitex-vaud/soulagement-des-proches/), [offre nationale à domicile](https://www.senevita.ch/fr/soins-assistance-a-domicile/), [coûts et décompte](https://www.senevita.ch/fr/sites/spitex-vaud/couts-et-decompte/), [tarifs 2026](https://www.senevita.ch/wAssets/docs/01_aktuelles/Preisliste/ohne-ORPEA-logo/Preise_Spitex_2026_PR1_f.pdf) et [mentions légales](https://www.senevita.ch/fr/impressum/). Le paquet de revue conserve, pour chaque fait, le contexte probant, la confiance et le statut de revue.

## Inconnues maintenues

- `service.on_call_24h`: les mentions d'assistance/soutien 24h/24 ne prouvent pas clairement une permanence sur appel distincte d'une présence continue;
- `service.continuous_assistance`: le modèle opérationnel exact du 24h/24 n'est pas assez précis;
- `service.meal_delivery`: préparer un repas ne prouve pas sa livraison;
- `service.emergency_call_service`: aucune téléalarme ou prestation d'appel d'urgence explicite;
- langues de prestation: la langue de la page n'est pas une preuve;
- couverture structurée et communes: aucune liste explicite retenue;
- statut d'intérêt public, disponibilité et capacité: aucune valeur canonique appliquée.

## Couverture

Une seule couverture narrative, liée à l'offre, conserve le libellé source exact **«dans la région de Vaud»**. Elle sert uniquement à l'affichage et au contexte. Elle n'ajoute ni canton structuré ni commune et n'implique pas automatiquement une desserte de toutes les communes vaudoises. Après application: 1 zone narrative, 0 zone structurée, 0 commune en base.

## Application locale gardée

La cible a été prouvée par les contrôles durcis: projet `Lia-vaud`, espace de travail `C:\Users\lucas\Lia-vaud`, conteneur `supabase_db_Lia-vaud`, port hôte `54322`, PostgreSQL 17 joint exclusivement par le socket Unix interne du conteneur. Un premier essai rollback a détecté une différence de nom de source et n'a rien écrit; le paquet a ensuite réutilisé l'identité de source existante `Senevita`. Le rollback corrigé a réussi avant l'application.

Écritures exactes pour `senevita-vaud`:

- 1 organisation `Senevita AG` et 1 relation opérateur principale;
- 1 offre `home-care`, non publiée et non vérifiée;
- 11 caractéristiques contrôlées (1 profil, 10 services);
- 3 liens source-vers-champs d'offre;
- 1 couverture narrative liée à l'offre;
- 7 nouvelles sources officielles; la source Senevita existante a reçu la date d'accès revue `2026-09-27` sans altération de son identité ou de ses champs soutenus.

| Compteur | Avant | Après |
| --- | ---: | ---: |
| Prestataires | 66 | 66 |
| Sources prestataire | 128 | 135 |
| Organisations | 21 | 22 |
| Relations organisation | 31 | 32 |
| Offres | 31 | 32 |
| Caractéristiques | 73 | 84 |
| Liens de sources d'offre | 50 | 53 |
| Zones de service | 0 | 1 |
| Municipalités | 0 | 0 |
| Disponibilités | 0 | 0 |

Les 31 EMS enrichis conservent le même fingerprint `b8756e81599062f1091dc7ee64359653`. Les autres prestataires à domicile conservent le même fingerprint `367ce3bc3612c56d3da6386167739020` et zéro autre offre à domicile. Les compteurs publié/vérifié restent tous à zéro pour prestataires, organisations et offres.

## Projection consommateur

La projection générique expose l'opérateur, l'offre, les 10 services confirmés, le profil cognitif, le parcours d'admission, le prix/financement et la couverture narrative. Elle ajoute la mention «Les prestations et zones non affichées restent non confirmées.» L'interface distingue désormais «Soins et services confirmés» et «Zone d'intervention déclarée». L'adresse de Renens reste présentée comme localisation du bureau avec l'avertissement qu'elle ne définit pas la zone d'intervention.

## Validation

Le paquet de revue (8 sources, 24 faits: 18 acceptés et 6 différés) produit déterministement le paquet canonique (1 offre, 11 caractéristiques, 1 zone). Le dry-run SQL transactionnel a réussi avec rollback. L'application locale et la relecture de projection ont réussi. Les tests de paquet, projection, dépôt de données, taxonomie et régression, ESLint des fichiers modifiés et `git diff --check` doivent tous rester verts au point de remise pour revue humaine.
