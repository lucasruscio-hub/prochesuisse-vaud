# Provider ingestion — Phase 2

This phase preserves the pure ingestion transform and adds a separate, explicitly local-only PostgreSQL writer. The 66 legacy records can be inserted and verified in the existing local Supabase stack; remote targets are not supported. The public UI/repository still uses the static dataset. Phase 1 schema, RLS, grants and public.leads are unchanged.

## Flow and commands

1. The legacy adapter in `scripts/ingest-legacy-providers.mjs` reads all 66 static records and attaches the existing Phase 1 review concerns and explicit legacy source metadata.
2. `lib/provider-ingestion.mjs` validates the entire batch, detects all duplicate legacy IDs/slugs, and creates deterministic provider/source candidates. The inspection API returns row-indexed errors; the strict transform throws if any row fails, so it never returns a partial batch. Unknown types fail validation without fallback mapping.
3. Review the summary and each record in [the generated report](./legacy-provider-ingestion-review.md). All 66 are mechanically transformable and require verification before publication. Only records with additional structured provider-specific concerns require special/manual investigation. Mechanical import eligibility is not publication approval. Keep the unresolved records separate and on hold.

```sh
node scripts/ingest-legacy-providers.mjs --dry-run
node scripts/ingest-legacy-providers.mjs --dry-run --json
node scripts/ingest-legacy-providers.mjs --write-report
node scripts/ingest-legacy-providers.mjs --check-report
node --test tests/*.test.mjs
```

For the inspection script, no arguments means dry-run. `--json` includes candidates, private source notes and row errors: it is an internal review artifact, never a public API response. `--write-report` writes only the checked-in Markdown report at its fixed local path. Unknown flags (including `--import`) fail. Rejected rows produce a nonzero CLI exit status. No environment variables, Supabase client, network or credentials are used.

## Exact preservation and unknown facts

| Input | Candidate field |
| --- | --- |
| id | legacy_id and default slug, unchanged |
| name / type | name / primary_type, unchanged |
| commune / npa | locality / postal_code, unchanged strings |
| address | original_location_text, unchanged; never split into a street |
| tags | original_tags, copied in original order including duplicates |

Missing/blank optional strings become null; absent tags become an empty array. Nonblank strings retain their original whitespace and accents. Invalid field types are rejected instead of coerced. No identity is merged or slug silently repaired. Database UUIDs and timestamps are intentionally absent from candidates; the local writer lets PostgreSQL generate them on insertion.

Country CH is the explicit pipeline scope. The legacy adapter assigns no canton: the dataset-level canton provenance decision is deferred, so VD is not inferred from the dataset title, place name or tags. Municipality/BFS identity stays unresolved. Explicit canton codes from future adapters must be members of the 26-canton set; membership validation does not establish source accuracy or municipality consistency.

Services, languages, subtypes, attributes and service areas remain empty. Contacts, street, house number, coordinates, description and review date remain null. No prices, availability, ownership, funding or operational status are inferred. Phase 1 lexical service proposals are not used. Home-care office locations never become service coverage. `status: active` is the schema's directory lifecycle default only; it makes no claim of current operation. Every candidate is explicitly unpublished and unverified, even if unsupported input fields claim otherwise.

Each candidate has a `provider_sources` payload with legacy source type, Lia dataset name, original ID, actually supplied supported fields, null URL/retrieval/review dates and private concerns. The local writer binds `provider_id` to the UUID returned by the provider insert. No invented external official URL is supplied. Existing source RLS remains private.

## Future canton and national adapters

Use the same `inspectProviderDataset(records, { source, reviewNotes })` and strict `transformProviderDataset` APIs. An adapter explicitly maps its documented source category into ems/domicile/residence and supplies stable id, name, optional slug, commune, npa, address, tags and optional evidenced canton_code. Unsupported categories must be reviewed, not silently guessed. Source name/type are required, URL optional; original source claims are not verification.

Legacy IDs are globally unique in Phase 1. Preserve these 66 exactly. New adapters must define a documented, stable source namespace for new IDs and keep the external raw identity in their source mapping; do not prefix or rewrite existing Lia identities. Inspect the combined candidate batch to detect cross-dataset collisions. The local writer additionally checks collisions against the database. Same-name records with different identities remain separate.

Additional factual fields and municipality/coverage enrichment require a separately reviewed adapter extension with evidence and geographic consistency validation. This minimal preservation contract intentionally does not accept inferred enrichment. Future datasets must supply their own review notes; legacy-specific identity questions belong to the legacy adapter. All source claims require verification before publication. Each reviewNotes[id] contains separate verificationNotes and specialReviewConcerns arrays. The legacy mapping preserves its combined concerns for the Phase 1 report, while the adapter passes the separate arrays to inspection. verificationRequired is true for every row; needsSpecialReview is derived only from a nonempty specialReviewConcerns array. needsManualReview is an alias for needsSpecialReview. The summary counts verification and special review separately; recordsNeedingManualReview aliases recordsNeedingSpecialReview. Missing canton/municipality notes do not trigger special review. No English note text is parsed to classify review requirements.

## Local import and verification

Use the existing Docker Desktop Linux engine and local Supabase stack for this workspace. The database is `supabase_db_Lia-vaud`, exposed locally at `127.0.0.1:54322`; the API is `127.0.0.1:54321`. The writer executes `psql` through the container's Unix socket, not through an HTTP API or service-role key. It does not start/reset Supabase or apply migrations automatically.

```sh
# Pure dry-run: does not contact Docker or any database. No arguments also means dry-run.
node scripts/import-local-providers.mjs --dry-run

# Actual local-only write; both flags are mandatory.
node scripts/import-local-providers.mjs --write-local --confirm Lia-vaud:local:54322

# Read and verify the legacy batch; no persistent writes.
node scripts/import-local-providers.mjs --verify-local

# Identical rerun: 0 inserted, 66 skipped, unchanged UUIDs/timestamps/facts.
node scripts/import-local-providers.mjs --write-local --confirm Lia-vaud:local:54322
```

`--target` is optional and accepts only the exact value `postgresql://127.0.0.1:54322/postgres`. Other hosts, ports, database names, credentials, query parameters and URLs are rejected before connection. Unknown, duplicate or contradictory flags fail. No target value is used to establish a network connection.

### Safety model

The writer pins the local Docker transport (`npipe:////./pipe/dockerDesktopLinuxEngine` on Windows; `/var/run/docker.sock` on Linux), ignoring inherited Docker contexts/hosts and PostgreSQL/Supabase connection variables. It reads no application `.env` files. Before executing SQL, it validates the repository config's project ID/API/database ports and the running container's name, Supabase project/workspace labels, PostgreSQL image and port mapping. It then uses that inspected immutable container ID. Wildcard host bindings in the existing Supabase stack are accepted because execution happens inside that local container over its Unix socket; no TCP connection, proxy or tunnel is followed.

Inside PostgreSQL, it requires the `postgres` database/user, a Unix-socket connection, internal port 5432, PostgreSQL 17, the four Phase 1 tables with RLS enabled, and non-bypass anon/authenticated roles. It uses explicit psql connection arguments, an empty container environment except PATH/encoding, `-X`, no password prompt, and `ON_ERROR_STOP`. No service-role secrets or production credentials are needed. This trusts the user's local Docker daemon and repository; it is not a defense against a compromised local administrator fabricating containers/labels.

### Transaction and idempotency

One transaction locks providers, sources, coverage and municipalities in a consistent order before checking identities. `SHARE ROW EXCLUSIVE` locks serialize imports and block competing writes for the duration of matching/insertion, including ordinary writers that do not use this script. See [PostgreSQL's lock conflict rules](https://www.postgresql.org/docs/17/explicit-locking.html). Lock and statement timeouts prevent indefinite waits.

For each candidate, no matching legacy ID or slug means insert provider, obtain its database-generated UUID, then insert its private source. One matching row must match **every transformed provider field**, including lifecycle, publication, verification and review fields. It must have exactly one matching legacy source identified by provider UUID + source type + source name + external ID, with every provenance field equal to the expected payload. Other source identities are allowed and remain untouched. Matching records are skipped without UPDATE; mismatched identity, changed facts, reviewed/published records, missing matching legacy evidence or duplicate matching legacy sources fail with a reconciliation error. No broad upsert, deletion or automatic merge is implemented. Generated IDs and creation/update timestamps are excluded from comparison and remain unchanged on rerun.

No migration is required. The existing source schema lacks the deterministic-source uniqueness constraint; the transaction's table lock plus exact matching prevents duplicates for this writer. This does not add a global uniqueness guarantee for arbitrary future writers, which must adopt compatible locking or introduce a separately reviewed migration.

Before COMMIT, the writer re-reads all provider and source fields, checks the legacy-batch totals (66 expected providers and 66 matching legacy sources; 46 EMS, 12 domicile, 8 residences), unique identities, null canton/municipality, empty services/languages, no coverage, and unpublished/unverified state. It exercises SELECT under anon and authenticated roles and requires zero visible legacy-batch providers and private sources. Counts, category/state checks, uniqueness, coverage checks and RLS visibility are scoped to the expected legacy IDs; provenance counts additionally match the full source identity. Unrelated providers (including published ones), their coverage, and unrelated sources do not fail verification. The JSON report labels its scope as legacy-batch; providers/sources are batch counts, not database totals.

If `public.leads` exists, the transaction takes a read lock and compares its row count and a deterministic full-row digest before/after; no lead contents are printed. If absent, it must remain absent and the report says so. Municipality rows are also compared before/after. No leads schema/data mutation or municipality/coverage insertion is performed. The standalone verification command uses the same checks and ends with ROLLBACK. It reports preservation within that operation, not an audit of changes by other tools between runs.

Any SQL error aborts psql and rolls back the entire uncommitted transaction on disconnect. Success is printed only after psql exits successfully, including COMMIT. An interrupted client whose commit outcome is unknown can safely rerun: existing exact matches are skipped.

### Tests and execution evidence

```sh
node --test tests/*.test.mjs

# Explicit rollback-only integration tests; safe to rerun after the local import.
node scripts/test-local-provider-writer.mjs --write-local --confirm Lia-vaud:local:54322
```

The integration script recreates the existing Phase 1 schema and RLS in a separate transaction-only test schema, checks the same local guards, and never clears or mutates the imported public tables. It requires that test namespace to be absent and proves its removal on rollback; no new migration is added. It uses real PostgreSQL transactions to prove 66 inserts, an identical rerun, unchanged complete rows/UUIDs/timestamps, name/legacy-ID/slug conflicts, preservation of reviewed/publication/lifecycle changes, provenance conflicts and duplicate-source rejection. It proves rollback after a late collision and an error after all inserts. Its fixtures and simulated manual edits all roll back; leads are never created or modified. It also verifies a 66-record batch alongside an unrelated published provider with coverage and four unrelated sources, and proves that zero matching, duplicate matching and mismatched legacy evidence still fail. All fixture provider/source/coverage rows remain unchanged on rerun, and the complete test schema rolls back.

See [local import execution results](./provider-local-import-results.md) for observed results and the local leads-table limitation. The older Phase 1 local-testing document describes a separate disposable-database test harness; this writer does not invoke it or create that database.

### National Swiss workflow

The architecture remains source adapter → pure ingestion transform → controlled writer → verification. The transform stays Switzerland-neutral, with legacy canton provenance deferred and canton_code null. A future national adapter supplies documented source identities and evidence through the same contract; dataset-specific counts and verification scope can then be extended explicitly. This local writer supplies reusable transaction/matching semantics, but cannot be redirected to production. Production execution, database-level source uniqueness if needed, operational reconciliation and publication require separately reviewed work. Import eligibility never grants publication approval; all 66 require verification, including 42 with additional concerns and 24 with baseline verification only.
