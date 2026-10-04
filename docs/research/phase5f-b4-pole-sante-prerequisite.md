# Phase 5F B4 prerequisite — Pôle Santé organization

Date: 2026-10-04. Status: applied and verified in local Supabase only. Production was not accessed.

The canonical Pôle Santé packet isolates cleanly from Batch D. It authorizes an organization-only identity needed by CMS Pays-d’Enhaut and explicitly rejects a separate generic patient-facing Pôle Santé provider.

## Exact write set

| Table | Expected | Actual |
| --- | ---: | ---: |
| `organizations` | 1 | 1 |
| `organization_sources` | 1 | 1 |
| `organization_names` | 1 | 1 |
| `providers` | 0 | 0 |
| **Net-new rows** | **3** | **3** |

The organization is `Pôle Santé du Pays-d'Enhaut` (`pole-sante-pays-denhaut`), unpublished and unverified. `legal_name`, website, review date, and all organization relationships remain unknown or absent. The packet-backed trading name is `Pôle Santé du Pays d'Enhaut`, unpublished, with unknown validity dates.

One entity-owned composite source records the two approved evidence roles while respecting the manifest's one-source-per-new-entity count: the official Pôle Santé page supports the canonical identity and the dated Vaud OSAD evidence supports the trading name.

## Rollback and compatibility

The rollback dry-run inserted all three rows and restored the exact pre-prerequisite state. The committed cycle applied the prerequisite, verified it, removed only the trading name, source, and organization in dependency order, proved exact restoration, and reapplied it. Rollback refuses to proceed once a B4 provider relationship references the organization.

| Check | Result |
| --- | --- |
| Providers | unchanged at 86 |
| CMS providers | unchanged at 20 |
| Organizations | 30 → 31 |
| Organization sources | 8 → 9 |
| Organization names | 0 → 1 |
| Pôle Santé provider links | 0 |
| Provider-data fingerprint | `225b6f93de29212f138f50dfc5b888ba` unchanged |
| EMS fingerprint | `b8756e81599062f1091dc7ee64359653` unchanged |
| Non-target domicile fingerprint | `fbe23663909f2ef20e4cfdbfcfea26f8` unchanged |
| Unrelated organization fingerprint | `d3948647bba41215a544b467dbf1ef13` unchanged |
| Senevita projection | unchanged |

## Validation

- deterministic prerequisite tests: 4 passed;
- guarded local dry-run: passed with exact rollback;
- committed apply/rollback/reapply cycle: passed;
- prerequisite and Phase 5F local successor-state verification: passed;
- Phase 5F tests: 33 passed;
- full runnable test suite: 143 passed;
- targeted ESLint and `git diff --check`: passed;
- production Supabase was not accessed.
