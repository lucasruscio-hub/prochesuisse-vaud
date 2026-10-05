# Phase 5F Batch B7 — Fondation de La Côte CMS

Date: 2026-10-05. Status: applied and verified locally; production was not accessed.

B7 created exactly 72 rows: nine providers, provider sources, offerings, offering sources, identity links, and designations, plus 18 provider-organization rows. Identities: CMS d’Aubonne, CMS de Gland Région, CMS de Gland Ville, CMS de Morges-Est, CMS de Morges-Ouest, CMS de Nyon, CMS de Rolle, CMS de Saint-Prex, and CMS de Terre-Sainte.

Each unpublished/unverified CMS uses Fondation de La Côte as primary `operator` and AVASAD as non-primary `network`, with the same minimum sourced baseline and no enrichment. The rollback dry-run and apply/verify/rollback/reapply cycle restored the exact 107-provider predecessor state.

Final counts: 116 providers, 50 CMS, 186 provider sources, 133 provider organizations, 82 offerings, 103 offering sources, and 50 identity links/designations. Features remain 84, availability 0, service areas 1, organizations 31. Fingerprints remained unchanged during B7: EMS `9e1fd6db294788f35e84d8f44faa0317`, non-target home `21202f8e21440773e50abd6f3e2517e7`, organization structure `a2e6731055172dd9191051a77050c24b`, unrelated `f302ea81d05f2977bcc873461fdd7781`.

Final audit confirmed all 50 CMS unpublished/unverified, distribution 8/8/4/10/3/8/9, archived unpublished `avasad-cms`, and no private-OSAD batch implementation. The full runnable suite passed 161 tests; targeted ESLint and `git diff --check` passed.
