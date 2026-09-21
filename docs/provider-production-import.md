# Phase 2B: prepared production legacy import

Prepared and tested locally only. **No remote Supabase database was accessed and no migration push was run.** The existing local 66-provider database was preserved.

This is a controlled, one-time bootstrap of the reviewed legacy batch, not a production ingestion service. The new data migration is `supabase/migrations/20260921000100_import_legacy_providers.sql`, after the deployed Phase 1 schema migration. Future national ingestion must use a reviewed/admin ingestion pipeline with provenance and reconciliation, rather than thousands of data migrations.

## Generation and local tests

```powershell
node scripts/generate-provider-data-migration.mjs --write
node scripts/generate-provider-data-migration.mjs --check
node --test tests/*.test.mjs
node scripts/test-provider-data-migration.mjs --write-local --confirm Lia-vaud:local:54322
```

The generator reads the existing Phase 2 transformation and emits both the migration and `supabase/verification/verify-legacy-provider-data.sql`. Source payloads are hex-encoded UTF-8 JSON for safe SQL transport; they are not a separately maintained provider list. `--check` compares both artifacts byte-for-byte with regenerated output and never connects to a database. Review human-readable identity concerns in [the ingestion report](./legacy-provider-ingestion-review.md). Freeze the approved artifact before deployment; do not regenerate an already-applied migration to import future changes.

The local test runner uses the existing Docker/project/socket guards. It creates fresh, uniquely named disposable PostgreSQL databases inside the local Supabase container, applies the exact Phase 1 migration and the exact generated artifact, and removes only its marked test databases. It does not apply this data migration to the current local application database.

## Guarantees and limits

- One `BEGIN`/`COMMIT` transaction. Locks protect schema checks and batch collision checks from competing writes; bounded lock/statement timeouts fail rather than wait indefinitely. A SQL error rolls back uncommitted data.
- Requires all four Phase 1 tables with RLS, compatible candidate column types, generated UUID primary keys, unique legacy IDs/slugs, validated provider type/status/verification constraints, and non-bypass client roles. Missing or incompatible prerequisites fail closed.
- Refuses any existing batch legacy ID, slug, or expected legacy source identity, even when that source is attached to another provider. Other provider/source records are allowed. A second execution deliberately fails; Supabase migration history handles normal one-time application.
- Inserts exactly the generated 66 providers and 66 private legacy sources, joined by stable legacy ID to the database-generated UUID. No row-order assumptions, merges, UPDATE/DELETE, municipalities, coverage, grants or policy changes.
- Checks exact provider/provenance payloads and the 46 EMS / 12 domicile / 8 residence split before committing. All remain active only as directory lifecycle, unverified, unpublished, null-canton/null-municipality/unreviewed, with empty services/languages/attributes and null inferred contact/address/coordinate fields. Import is not publication approval.
- Exercises anon/authenticated visibility: zero batch providers visible and no table/column SELECT privilege or successful SELECT on private sources. Existing unrelated published providers are outside this batch.
- If leads exists, holds a read lock and compares row count, schema/column definitions and count, policy count, and RLS/forced-RLS state before/after. It neither reads specific lead contents nor modifies leads. Municipality rows must also remain identical.

The companion verification SQL uses the same exact payload and visibility assertions, creates only temporary working tables, and ends with `ROLLBACK`. Its leads snapshot compares before/after that verification operation; the import transaction itself checks preservation across insertion. Existing remote schema/state is intentionally uninspected. Deployment requires an account able to insert, inspect/lock these tables, create temporary tables, and SET ROLE to anon/authenticated; missing permissions abort.

## Future production procedure — do not run during preparation

After separate deployment authorization, confirm the CLI is linked to the intended Lia production project. The following commands are documented for that future step only:

```powershell
node scripts/generate-provider-data-migration.mjs --check
npx --no-install supabase migration list --linked
npx --no-install supabase db push --linked --dry-run
# Inspect the pending list: only 20260921000100_import_legacy_providers should be pending.
npx --no-install supabase db push --linked
npx --no-install supabase migration list --linked
```

The dry-run lists pending changes; it does not prove SQL execution or rollback. These commands follow the [Supabase CLI workflow](https://supabase.com/docs/guides/local-development/cli-workflows). Never use reset, include-all, or migration repair to bypass an unexpected state.

For post-production verification, set `LIA_PRODUCTION_DB_URL` securely to the separately reviewed production PostgreSQL connection (no credential is stored here), then run:

```powershell
psql -X -v ON_ERROR_STOP=1 --dbname="$env:LIA_PRODUCTION_DB_URL" --file=supabase/verification/verify-legacy-provider-data.sql
```

Require exit code 0 and the batch result: 66 providers/sources, categories 46/12/8, 66 unverified/null-canton, zero published/services/languages/coverage/client-visible providers, leads and municipalities unchanged. If an import assertion fails, reconcile the cause; do not remove its guard or rerun a modified migration blindly.

## Local execution results

20 unit tests and targeted ESLint passed; generation/check mode matched both artifacts. All 13 disposable-database scenarios passed:

- Clean import: 66 providers + 66 sources; companion verification passed; replay failed without changes.
- Import alongside unrelated published provider/source/coverage and existing municipality: batch passed, unrelated rows unchanged. A populated leads fixture retained its two rows, two columns, one policy and enabled RLS; full fixture contents/schema were also compared independently by the test harness.
- Legacy ID, slug, and provenance collisions rejected with complete rollback.
- Missing table, disabled RLS, missing type constraint, incompatible status constraint and verification column rejected.
- Public source SELECT access, unsafe provider visibility and a trigger-induced post-insert mismatch rejected with complete rollback.

All 13 test databases were removed and a full before/after comparison confirmed the existing local application database unchanged. The prior local writer integration suite also passed. No unexpected schema mismatch was found against the repository's Phase 1 schema. Remote compatibility and production execution remain untested by design. No commit or push was made.
