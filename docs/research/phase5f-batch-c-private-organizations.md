# Phase 5F Batch C — private organizations

Date: 2026-10-05. Status: applied and verified locally; production was not accessed.

Batch C created exactly four rows from the approved canonical packets and cleared official Swiss UID evidence:

- `organizations`: two — Nurse Home Care Sàrl (`nurse-home-care-sarl`) and SoinVaud Sàrl (`soinvaud-sarl`);
- `organization_sources`: two — one private organization-owned `public` source per organization, using CHE-270.603.185 and CHE-394.182.275 respectively;
- providers and all provider-dependent tables: zero new or changed rows.

Both organizations are active, unpublished, and unverified. The implementation stores the current legal name and links the organization to its official UID evidence. The evidence notes preserve the sourced legal form, registered seat, registered address, and active UID/commercial-register status without inventing schema fields.

The Nurse Home Care patient-facing provider, the SoinVaud/Soinsvaud patient-facing provider, and the candidate Soinsvaud trading alias remain held. Batch C created no provider names, provider links, organization relationships, offerings, classifications, service areas, features, availability, publication, or verification facts. No Batch D, E, or F identity was created.

The guarded target was `Lia-vaud:local:54322`. The rollback-only dry run restored the exact predecessor state. The apply → verify → rollback → exact-state comparison → reapply cycle also restored the exact 116-provider predecessor state before the final reapply.

Final counts are 116 providers, 50 CMS, 33 organizations, 11 organization sources, 1 organization name, 7 organization relationships, 133 provider-organization rows, 82 offerings, 103 offering sources, 50 identity links, 50 designations, 84 features, 0 availability rows, and 1 service-area row.

Compatibility fingerprints remained unchanged throughout the cycle:

- all provider data: `bb91474e18fc14e1159519aee5bdf7a2`;
- all 50 CMS: `3ca02f45579b1290c223cd8379615ddb`;
- EMS providers: `9e1fd6db294788f35e84d8f44faa0317`;
- non-CMS domicile providers: `21202f8e21440773e50abd6f3e2517e7`;
- unrelated organizations and organization evidence: `a2e6731055172dd9191051a77050c24b`.

Senevita remained unchanged: operator Senevita AG, one offering, ten services, one care profile, and coverage narrative `dans la région de Vaud`.

Validation passed: 56 Phase 5F tests, the complete 166-test runnable suite, targeted ESLint for the Batch C implementation/script/tests, and `git diff --check`.
