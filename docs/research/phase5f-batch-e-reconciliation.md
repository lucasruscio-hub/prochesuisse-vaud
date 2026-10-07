# Phase 5F Batch E reconciliation

Date: 2026-10-07. Status: reconciled against the completed Batch D local checkpoint; implementation pending. Production was not accessed.

The approved Batch E plan remains exactly 24 net-new rows. None of its target provider or organization identities exists in the current local database.

| Identity | Intended action | Rows | Hold treatment |
| --- | --- | ---: | --- |
| Fondation Beau-Séjour | Organization only | 1 organization + 1 organization source | None |
| OSAD — Soins à domicile de proximité | Create distinct institution-linked provider | Provider, source, operator link, offering, offering source, designation = 6 | Vevey structured service-area row excluded until the municipality/BFS identity exists |
| Fondation du Levant | Organization only | 1 organization + 1 organization source | None |
| SAMSA Levant | Create narrow specialist provider | Provider, source, operator link, offering, offering source, designation, narrative region = 7 | Exact municipalities remain unknown; only the approved narrative region is stored |
| OSAD Levant | Trading alias on SAMSA Levant | 1 provider name | None |
| Levant (Fondation du Levant) | Historical/official-list alias on SAMSA Levant | 1 provider name | None |
| Sciensus AG | Organization only | 1 organization + 1 organization source | None |
| HTHC High Tech Home Care AG | Historical organization alias | 1 organization name | None |
| Sciensus provider | Hold | 0 | Excluded: current Vaud authorization basis and absence from the dated Canton file remain unresolved |
| CPSE Alexandra | Organization only | 1 organization + 1 organization source | Legal name remains null because current register evidence is absent |
| CP Alexandra provider | Hold | 0 | Excluded: authorization basis and exact authorized operating-unit name remain unresolved |

Totals by table: four organizations, four organization sources, one organization name, two providers, two provider sources, two provider names, two provider-organization links, two offerings, two offering sources, two regulatory designations, and one narrative service-area row. Total: 24.

The two provider offerings stay narrow. SAMSA Levant is represented only as specialist psychiatric and addiction nursing at home. Beau-Séjour remains a distinct institution-linked OSAD team. No generic service feature set, municipality expansion, capacity, availability, language, pricing, publication, verification, or unsupported authorization fact is planned.
