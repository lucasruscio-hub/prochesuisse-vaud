# Lia Phase 3B pilot review packets

These three packets are research inputs for the reviewed-enrichment pipeline.

Pilots:
- `ems-boveresses` — EMS / rich clean establishment
- `nova-via` — senior residence with a separate medicalized care offering
- `senevita-vaud` — home care, testing office location vs service coverage

Safety rules:
- These packets are NOT publication approval.
- `publication_allowed` must remain `false`.
- `verification_granted` must remain `false` until the application workflow explicitly supports and records final review.
- Unknown stays null/empty.
- Legacy tags are preserved but are never treated as verified facts.
- Every factual enrichment should retain source provenance.
- Dynamic availability is not imported as a permanent field.
- No Google photos/reviews are included yet. Those belong to Phase 3C after identity matching.

The JSON structure is a research-packet draft, not a database contract. Codex should inspect the existing Phase 1 provider/provider_sources schema and build the safest validator/import shape around it rather than blindly copying this JSON into tables.
