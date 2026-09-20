# Local provider migration test — prepared, not executed

No suitable disposable local environment was found during this hardening pass:

- `supabase`, `psql`, `postgres`, `pg_ctl`, `initdb`, `docker` and `podman` were not found on PATH.
- No project-local Supabase CLI, Supabase config.toml, or Docker/Compose configuration was found.
- Standard PostgreSQL/Docker installation locations and common Supabase CLI shim locations were absent.
- No PostgreSQL/Supabase/Docker process or service was identified, and no listener was found on ports 5432 or 54322.

Nothing was installed and no SQL was executed. A working local PostgreSQL server plus psql, or a local Supabase stack with a container runtime and SQL client, is needed. Merely installing the Supabase CLI would not provide a running disposable database. Existing remote credentials/environment variables were not used for discovery.

## Scope and safety

`supabase/tests/provider_foundation_dry_run.sql` is an **unexecuted psql test script**, not an SQL Editor snippet. It contains synthetic fixtures, role switching and assertions. It is not a provider import and does not read or alter leads. Run only after reviewing the script and confirming the target is a disposable database.

The script requires explicit `local_disposable_confirmed=yes`, database name `lia_provider_phase1_test`, loopback/socket server address, empty provider tables, no leads table, non-bypass anon/authenticated roles, and a service_role with BYPASSRLS. It fails closed on assertion errors. The test uses invoker-rights temporary helpers, so role assertions exercise actual table grants and RLS rather than an admin/definer bypass.

All fixtures/helper objects are inside BEGIN/ROLLBACK. If psql exits on an error, closing the connection rolls back the uncommitted test transaction. The previously applied migration has its own COMMIT and **its schema is not rolled back by this test**. Use a dedicated disposable database. There are no automatic cleanup/drop commands.

The loopback guard is defense in depth, not proof that a connection is local: never use a tunnel, remote proxy or production connection. The operator must inspect the endpoint and database first. Container networking may report a non-loopback address; the guard intentionally refuses that setup. Run psql inside the local database container using its local socket/loopback rather than weakening the guard.

## Later execution procedure (not run here)

1. Prepare an empty disposable local database named `lia_provider_phase1_test`. Use a local administrative account authorized to create objects and SET ROLE. For plain PostgreSQL, arrange test roles matching Supabase: anon and authenticated are NOLOGIN/NOSUPERUSER/NOBYPASSRLS, service_role is NOLOGIN/NOSUPERUSER/BYPASSRLS. Do not change roles on a shared server. Ensure these roles have USAGE on public, as expected by the production migration. The test does not silently create/repair roles or grants.
2. Confirm the connection is genuinely local and the new database contains no application data. Review the migration and test file. No command below should use hosted Supabase credentials or an inherited remote connection URL.
3. From the repository root, apply the migration to **that disposable target only**, using explicit connection parameters (replace LOCAL_TEST_ADMIN with the local admin role):

```text
psql -X -h 127.0.0.1 -p 5432 -U LOCAL_TEST_ADMIN -d lia_provider_phase1_test -v ON_ERROR_STOP=1 -f supabase/migrations/20260920000100_provider_foundation.sql
psql -X -h 127.0.0.1 -p 5432 -U LOCAL_TEST_ADMIN -d lia_provider_phase1_test -v ON_ERROR_STOP=1 -v local_disposable_confirmed=yes -f supabase/tests/provider_foundation_dry_run.sql
```

4. Require exit code 0 and the final PASS message. Keep the output for review. The test is re-runnable against the now-migrated empty test tables because its fixtures roll back. Do not reapply the schema migration to the same migrated database.

## Assertions covered

- All four tables have RLS enabled and real client roles cannot bypass it.
- service_role inserts/readbacks, updates and deletes in all four tables, plus updated_at trigger.
- Unpublished default, active/verification independence, unknown fields/arrays, original-tag preservation, no automatic service mapping.
- Actual SELECT behavior for anon and authenticated: only published+active providers, matching child visibility, public geography, private sources.
- INSERT/UPDATE/DELETE denied on all four tables for both client roles.
- Invalid provider type/status/verification, country format, coordinate ranges/pairs, coverage type/target rejected.
- Duplicate slug/legacy ID and municipality/canton coverage rejected.
- Cross-provider source references and nonexistent municipality rejected.
- Municipality/canton reverse lookups return only visible home-care providers.
- Target-first index definitions exist and original provider-first uniqueness indexes remain.
- Unpublishing/inactivating existing parents hides their coverage immediately for both client roles.

This is not a performance benchmark or a substitute for reviewing the real project's grants/defaults and schema conflicts. It deliberately avoids leads rather than pretending to certify that table's existing security. Publication and geographic validation obligations from provider-phase-1.md remain unchanged. Do not execute in the real project until the local migration and security assertions pass and target roles/schema assumptions are confirmed.
