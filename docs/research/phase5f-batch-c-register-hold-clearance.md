# Phase 5F Batch C legal-register hold clearance

Date: 2026-10-05  
Scope: research-only review of the two Batch C organization identities  
Database writes: none

## Official current evidence

| Organization | UID | Legal form | Registered seat | Official status | Official source | Accessed |
|---|---|---|---|---|---|---|
| Nurse Home Care Sàrl | CHE-270.603.185 | 0107 — Limited liability company (LLC) | Morges; Rue des Charpentiers 26, 1110 Morges | UID active; commercial-register status active | [Swiss UID Register](https://www.uid.admin.ch/Detail.aspx?uid_id=CHE-270.603.185) | 2026-10-05 |
| SoinVaud Sàrl | CHE-394.182.275 | 0107 — Limited liability company (LLC) | Chavannes-près-Renens; Chemin des Berges 8, 1022 Chavannes-près-Renens | UID active; commercial-register status active | [Swiss UID Register](https://www.uid.admin.ch/Detail.aspx?uid_id=CHE-394.182.275) | 2026-10-05 |

The federal UID records are the current official sources for the future organization and organization-source rows. Existing third-party register republications remain corroborating research only and are not the Batch C implementation evidence.

## Manifest re-evaluation

The legal-register evidence precondition is cleared without changing or weakening it. The canonical organization identities and expected Batch C structure remain:

- two `organizations` rows;
- two `organization_sources` rows, one official UID source owned by each organization;
- zero providers, provider aliases, offerings, relationships, classifications, or service areas;
- four net-new rows in total.

The Nurse Home Care provider and the SoinVaud/Soinsvaud provider and candidate trading alias remain held outside Batch C. This review does not clear their authorization, public-name, or provider-owned contact-evidence holds.

No local or production database was accessed. Batch D, E, and F were not started.
