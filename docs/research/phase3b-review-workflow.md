# Phase 3B review and local enrichment

The research JSON files are input evidence, not a database contract. `scripts/phase3b-review.mjs` normalizes them into three generated `canonical/*.json` packets. No website is scraped or Google API called. The generator never connects to a database.

## Canonical packet v1

Each packet has:

| Key | Meaning |
| --- | --- |
| `version` | Contract version, currently 1. |
| `identity` | Stable `legacyId`/`slug`, plus expected current name and type for conflict checks. |
| `approval` | Explicit independent `localApply`, `publish`, `verify` gates. Boveresses and Senevita have local apply approval; Nova Vita remains held. Publication and verification remain false for all three. |
| `locationKind` | `site` or `office`; an office is never service coverage. |
| `claims[]` | Sourced `{field, value, evidence, target}`. Evidence has source kind/name/HTTPS URL and original access date. A `target` is present only for a reviewed, representable provider column. `target: null` preserves a researched claim without importing it. |
| `offerings[]` | Named offerings retained for structural review. Two offerings force a hold. They are never flattened into `service_codes`, `subtypes` or generic attributes. |
| `unresolved[]`, `holdReasons[]` | Missing evidence and structural decisions that must not be silently resolved. |
| `legacyTags`, `legacyTagsVerified` | Exact original tags, always unverified and unchanged. |

The apply subset is limited to `name`, `primary_type`, `postal_code`, `locality`, individually sourced `canton_code`, and sourced `phone`, `email`, `website`. Original address text, service areas, services, capacity, operator and offering-specific facts are retained only in private packet claims. `provider_sources` rows group applied fields by the exact source kind/name/URL/access date and retain `fields_supported`. Their access date is kept in notes, not converted to an invented retrieval timestamp. The packet is not a public UI projection.

The [schema assessment](./phase3b-schema-gaps.md) records the multiple-offering gap and other deferred fields before any migration. This phase adds **no migration**.

## Commands

```powershell
node scripts/phase3b-review.mjs --write-packets
node scripts/phase3b-review.mjs --check-packets
node scripts/phase3b-review.mjs --dry-run
node scripts/phase3b-review.mjs --check-pilot ems-boveresses
node --test tests/provider-review-packet.test.mjs
node scripts/test-phase3b-local.mjs --write-local --confirm Lia-vaud:local:54322
```

`--check-packets` permits only an explicit `approval.localApply` difference from generated research; all claims and safety flags must still match. The local test creates approved **in-memory copies** of EMS Boveresses and Senevita. On a pristine local provider it tests the guarded apply with `ROLLBACK`; on an already enriched provider it confirms a repeat is rejected safely. It checks that the local database snapshot remains unchanged. It does not modify approval in the canonical files.

After an independent review of the research and identity match, an operator may set `approval.localApply` to `true` for a representable pilot, then run `--check-packets`, `--check-pilot <id>`, and only then:

```powershell
node scripts/phase3b-review.mjs --write-local ems-boveresses --confirm Lia-vaud:local:54322
```

This command is fixed to the guarded local Supabase container/Unix socket. It requires an exact untouched baseline provider identity and one legacy source, uses transaction locks, inserts only private source rows for applied fields, checks that other providers/sources/coverage, leads and municipalities remain unchanged, and asserts that publication, verification and legacy tags do not change. It rejects repeat or conflicting source identities rather than overwriting. It does not update the static public repository. **Boveresses and Senevita have already been applied to the local database; repeat writes are expected to fail the reviewed-state guard. Nova Vita has no local apply approval.**

## Pilot results

| Pilot | Review status | Locally applied fields | Deferred/held |
| --- | --- | --- | --- |
| `ems-boveresses` | Locally applied; publication and final verification not granted | Name, type, locality/NPA, sourced canton VD, phone, email, website | 10 claims, including address, operator, beds and researched service terms. |
| `nova-via` | Structurally valid; **held** | None while held | Two care offerings need a reviewed schema and identity decision. Plain canton VD lacks per-field source. Address, operator, attributes and unit facts stay in packet. |
| `senevita-vaud` | Locally applied; publication and final verification not granted | Name, type, office locality/NPA, phone, website | 11 claims, including office address, regional coverage and researched service terms. Canton VD has no per-field source; no service area is created. Email remains unknown. |

These are validation outcomes for supplied research packets, not fresh verification of the cited websites or publication approval. Phase 3B does not modify production, public UI, RLS or provider publication state.

The local post-apply check found 66 providers and 69 sources: the original 66 legacy sources plus two Boveresses sources and one Senevita source. All provider rows match the legacy baseline except the two explicitly mapped patches. Service areas and municipalities remain empty, and the local `leads` table is absent. All providers remain unpublished and unverified. `anon` and `authenticated` see zero providers, and neither role can select `provider_sources`. Nova Vita retains its legacy row and single legacy source. The local repeat-apply checks reject both enriched pilots without changing the database.
