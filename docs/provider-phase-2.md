# Provider ingestion — Phase 2

This phase prepares and inspects candidates only. No database writer is implemented and no records have been imported. The public UI/repository still uses the static dataset. Phase 1 schema, RLS, grants and public.leads are unchanged.

## Flow and commands

1. The legacy adapter in `scripts/ingest-legacy-providers.mjs` reads all 66 static records and attaches the existing Phase 1 review concerns and explicit legacy source metadata.
2. `lib/provider-ingestion.mjs` validates the entire batch, detects all duplicate legacy IDs/slugs, and creates deterministic provider/source candidates. The inspection API returns row-indexed errors; the strict transform throws if any row fails, so it never returns a partial batch. Unknown types fail validation without fallback mapping.
3. Review the summary and each record in [the generated report](./legacy-provider-ingestion-review.md). All 66 are mechanically transformable and require verification before publication. Only records with additional structured provider-specific concerns require special/manual investigation. Mechanical import eligibility is not publication approval. Keep the unresolved records separate and on hold.

```sh
node scripts/ingest-legacy-providers.mjs --dry-run
node scripts/ingest-legacy-providers.mjs --dry-run --json
node scripts/ingest-legacy-providers.mjs --write-report
node scripts/ingest-legacy-providers.mjs --check-report
node --test tests/provider-foundation.test.mjs tests/provider-ingestion.test.mjs
```

No arguments means dry-run. `--json` includes candidates, private source notes and row errors: it is an internal review artifact, never a public API response. `--write-report` writes only the checked-in Markdown report at its fixed local path. Unknown flags (including `--import`) fail. Rejected rows produce a nonzero CLI exit status. No environment variables, Supabase client, network or credentials are used.

## Exact preservation and unknown facts

| Input | Candidate field |
| --- | --- |
| id | legacy_id and default slug, unchanged |
| name / type | name / primary_type, unchanged |
| commune / npa | locality / postal_code, unchanged strings |
| address | original_location_text, unchanged; never split into a street |
| tags | original_tags, copied in original order including duplicates |

Missing/blank optional strings become null; absent tags become an empty array. Nonblank strings retain their original whitespace and accents. Invalid field types are rejected instead of coerced. No identity is merged or slug silently repaired. Database UUIDs and timestamps are intentionally absent from candidates; defaults belong to a future database insert.

Country CH is the explicit pipeline scope. The legacy adapter assigns no canton: the dataset-level canton provenance decision is deferred, so VD is not inferred from the dataset title, place name or tags. Municipality/BFS identity stays unresolved. Explicit canton codes from future adapters must be members of the 26-canton set; membership validation does not establish source accuracy or municipality consistency.

Services, languages, subtypes, attributes and service areas remain empty. Contacts, street, house number, coordinates, description and review date remain null. No prices, availability, ownership, funding or operational status are inferred. Phase 1 lexical service proposals are not used. Home-care office locations never become service coverage. `status: active` is the schema's directory lifecycle default only; it makes no claim of current operation. Every candidate is explicitly unpublished and unverified, even if unsupported input fields claim otherwise.

Each candidate has a `provider_sources` payload with legacy source type, Lia dataset name, original ID, actually supplied supported fields, null URL/retrieval/review dates and private concerns. The future writer must bind `provider_id` to the inserted provider UUID. No invented external official URL is supplied. Existing source RLS remains private.

## Future canton and national adapters

Use the same `inspectProviderDataset(records, { source, reviewNotes })` and strict `transformProviderDataset` APIs. An adapter explicitly maps its documented source category into ems/domicile/residence and supplies stable id, name, optional slug, commune, npa, address, tags and optional evidenced canton_code. Unsupported categories must be reviewed, not silently guessed. Source name/type are required, URL optional; original source claims are not verification.

Legacy IDs are globally unique in Phase 1. Preserve these 66 exactly. New adapters must define a documented, stable source namespace for new IDs and keep the external raw identity in their source mapping; do not prefix or rewrite existing Lia identities. Inspect the combined candidate batch to detect cross-dataset collisions. A future writer must additionally check collisions against the database. Same-name records with different identities remain separate.

Additional factual fields and municipality/coverage enrichment require a separately reviewed adapter extension with evidence and geographic consistency validation. This minimal preservation contract intentionally does not accept inferred enrichment. Future datasets must supply their own review notes; legacy-specific identity questions belong to the legacy adapter. All source claims require verification before publication. Each reviewNotes[id] contains separate verificationNotes and specialReviewConcerns arrays. The legacy mapping preserves its combined concerns for the Phase 1 report, while the adapter passes the separate arrays to inspection. verificationRequired is true for every row; needsSpecialReview is derived only from a nonempty specialReviewConcerns array. needsManualReview is an alias for needsSpecialReview. The summary counts verification and special review separately; recordsNeedingManualReview aliases recordsNeedingSpecialReview. Missing canton/municipality notes do not trigger special review. No English note text is parsed to classify review requirements.

## Future local import and production safety

A real import is not yet runnable. After review, implement a separately authorized writer against an isolated local Supabase instance using the deployed Phase 1 schema and its existing security rules. Follow [local database testing](./provider-local-testing.md) first. Do not use a linked project, remote database or lead client.

The writer must require an explicit import flag and local target, reject non-loopback hosts and redirects, verify the expected local project/schema, and obtain secrets from a server-only environment without logging them. Dry-run must remain the default and require no credentials. Never relax RLS/grants for convenience.

Use a transaction and stable legacy_id identity; resolve the returned UUID for provenance. Check existing slug/identity conflicts and fail instead of merging. Repeated imports must not duplicate sources: Phase 1 has no unique source identity constraint, so the writer needs transactional locking plus an explicit matching rule for provider_id/source_type/source_name/external_record_id, or a separately reviewed migration. Do not blindly upsert and overwrite reviewed facts, lifecycle, verification or publication on existing records. Refuse conflicting/existing reviewed records pending a reconciliation decision. New rows must explicitly remain unpublished/unverified and get no service areas.

Prove rollback, repeat-run idempotence, conflict handling and source deduplication with local database tests before executing an import. Publication remains a separate editorial action. This task performs no import, production connection, migration, commit or push.
