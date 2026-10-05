# Phase 5F Batch B5 — ABSMAD CMS

Date: 2026-10-05. Status: applied and verified in local Supabase only.

B5 created exactly 24 rows: 3 providers, 3 provider sources, 6 provider-organization relationships, 3 offerings, 3 offering sources, 3 identity links, and 3 regulatory designations. The canonical identities are CMS Avenches, CMS Moudon, and CMS Payerne.

Each unpublished/unverified CMS has ABSMAD as primary `operator`, AVASAD as non-primary `network`, one minimum unpublished/unverified `home_care` offering, one evidence row for the provider and offering, one unpublished `cms` classification, and one `split_into` link from archived `avasad-cms`. No enrichment or inferred facts were added.

The rollback dry-run and committed apply/verify/rollback/reapply cycle both restored the exact 96-provider pre-B5 state before final reapplication. Providers changed 96 → 99; CMS 30 → 33; provider organizations 93 → 99; offerings 62 → 65; offering sources 83 → 86; identity links and designations 30 → 33. Features, availability, service areas, organizations, earlier CMS, Senevita, EMS, and unrelated data remained unchanged.

Fingerprints: EMS `9e1fd6db294788f35e84d8f44faa0317`; non-target home `21202f8e21440773e50abd6f3e2517e7`; organization structure `a2e6731055172dd9191051a77050c24b`; unrelated data `5fefd2ce93b99c99bf317be628b9aa64`.

Production Supabase was not accessed.

Focused B5 tests (4), the 153-test full runnable suite, targeted ESLint, local successor-state verification, and `git diff --check` all passed.
