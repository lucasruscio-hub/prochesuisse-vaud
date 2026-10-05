# Phase 5F Batch B6 — ASPMAD CMS

Date: 2026-10-05. Status: applied and verified locally; production was not accessed.

B6 created the manifest's exact 64 rows: eight each in `providers`, `provider_sources`, `care_offerings`, `care_offering_sources`, `provider_identity_links`, and regulatory designations, plus 16 provider-organization rows. Canonical identities: CMS Cossonay, CMS Grandson, CMS La Vallée, CMS Orbe, CMS Sainte-Croix, CMS Vallorbe, CMS Yverdon, and CMS Yvonand.

Each unpublished/unverified CMS has ASPMAD as primary `operator`, AVASAD as non-primary `network`, one minimal sourced `home_care` offering, one unpublished `cms` classification, and one `split_into` link. No inferred or deep-enrichment facts were added.

The dry-run and committed apply/verify/rollback/reapply cycle restored the exact 99-provider predecessor state. Final counts: providers 107, CMS 41, provider sources 177, provider organizations 115, offerings 73, offering sources 94, identity links/designations 41. Features 84, availability 0, service areas 1, organizations 31, Senevita, EMS, earlier CMS, and unrelated rows remained unchanged.

Compatibility fingerprints: EMS `9e1fd6db294788f35e84d8f44faa0317`, non-target home `21202f8e21440773e50abd6f3e2517e7`, organization structure `a2e6731055172dd9191051a77050c24b`, unrelated `295dea5b43fb11c1e7fe91e8b942a248`.
