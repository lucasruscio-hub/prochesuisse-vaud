# Phase 5F canonical home-care identity packets

Date: 2026-10-02
Checkpoint: `8bb9721f3ed1e1b730cc2a1f042644206185cbe4`

These packets convert the Phase 5E reconciliation and the Phase 5F architecture
decision into implementation-ready identity decisions. They are research artifacts,
not data migrations.

## Safety boundary

- `approval.localApply`, `approval.productionApply`, `approval.publish`, and
  `approval.verify` are false in every packet.
- `dataWrites` is empty in every packet.
- No packet authorizes a provider, organization, offering, alias, relationship,
  designation, coverage, publication, or verification write.
- Phase 5G service enrichment is outside this packet set.
- Unknown legal, regulatory, coverage, and relationship facts remain unknown.

## Packet contract

Each item in `identities` has exactly one future action from this vocabulary:

- `create`: create a patient-facing provider/site after the packet's dependencies and
  holds are cleared;
- `update`: reconcile an existing Lia provider without creating a duplicate;
- `alias`: store a historical or trading name against its canonical entity, never as a
  competing current provider;
- `organization-only`: create or reconcile an organization without a patient-facing
  provider row;
- `hold`: perform no identity write until the listed unresolved facts are resolved.

`regulatoryDesignation` records only a positive sourced observation. A missing code,
effective date, issuer, or current status is `null`, not inferred. `serviceAreaEvidence`
distinguishes explicit narrative geography from implementation-ready municipality or
canton coverage. An office address is never coverage.

## Files

- `canonical/`: twelve packets covering the structurally important Phase 5F cases;
- `implementation-manifest.json`: exact actions, dependencies, safe batches, expected
  future row counts, and rollback expectations;
- `research-holds.json`: all unresolved facts that block or qualify a future batch.

## Manifest controls

The twelve packets contain 95 unique identity/action records: 21
`organization-only`, 57 `create`, eight `alias`, two `update`, and seven `hold`
actions. The 57 creates include exactly 50 CMS providers.

| Future batch | Scope in this packet set | Expected net-new rows |
|---|---|---:|
| A | AVASAD and seven regional organizations | 24 |
| B | 50 CMS providers by regional organization | 401 |
| C | Ready legal organizations for held private OSADs | 4 |
| D | Complex networks and multi-site providers | 47 |
| E | Specialist and institution-linked providers | 24 |
| F | Non-medical `home_support` | 8 |

Updates are excluded from net-new counts. Batch A's 24 rows are eight
organizations, eight organization sources, seven `network_member` relationships,
and one new source for the existing `avasad-cms` provider; its provider update is
not a new row.

## Evidence dates

The two source workbooks were read without modification. Workbook observations retain
their stated 2026-09-28 research date. Official/provider pages rechecked during this
packet pass use 2026-10-02 as `accessedOn`. A web recheck does not silently replace a
dated 2026-03-02 Canton observation.
