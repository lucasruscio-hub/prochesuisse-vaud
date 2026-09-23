# Phase 4C care batch — human-review summary

## Evidence inventory result

All files under `docs/research/` were inspected, followed by a repository-wide search for the eight requested slugs and names. The only matching materials are the Phase 3D Google identity workflow and the legacy ingestion/mapping reports. Google material is not Lia care evidence. The legacy reports explicitly label their tags and mappings as unverified.

No preferred candidate has source-level care research stored in the repository. Consequently, this phase creates no new canonical care packet and proposes no database fact. Every candidate remains `localApply: false` with status `evidence_missing_from_repo`.

| Provider | Supported care facts | Proposed import | Deferred / taxonomy | Sources | Unresolved | Local apply |
|---|---|---|---|---|---|---|
| `ems-chateau-rive` | None | None | Gériatrie, Court séjour and Lavaux remain unverified; no taxonomy mapping | None | Source-level care evidence missing | `false` |
| `ems-clair-soleil` | None | None | Gériatrie and Long séjour remain unverified; no taxonomy mapping | None | Source-level care evidence missing | `false` |
| `ems-le-home` | None | None | Gériatrie and Vue lac remain unverified; no taxonomy mapping | None | Source-level care evidence missing | `false` |
| `ems-marronnier` | None | None | Gériatrie and Lavaux remain unverified; no taxonomy mapping | None | Care and operator evidence missing | `false` |
| `ems-signal` | None | None | Gériatrie and Campagne remain unverified; no taxonomy mapping | None | Care evidence and current locality identity missing | `false` |
| `ems-petit-flon` | None | None | Psychiatrie and Gériatrie remain unverified; no taxonomy mapping | None | Care evidence and site/operator relationship missing | `false` |
| `ems-girarde` | None | None | Gériatrie remains unverified; no taxonomy mapping | None | Care evidence and current locality spelling review missing | `false` |
| `ems-pre-fleuri` | None | None | Gériatrie, Alzheimer and the legacy `dementia_support` mapping remain unverified | None | Source-level care evidence missing | `false` |

## Workflow state

`docs/research/phase4c-care-batch/batch.json` is the checked-in review manifest. It records candidate status and packet paths. `scripts/phase4c-care-batch.mjs --check-batch` validates every candidate, every referenced packet, approval gates, taxonomy values, and protected existing state. New packets must be added to the manifest only after their source evidence exists in the repository.

The generalized apply builder accepts multiple offerings and sources, reuses an exact existing organization when safe, inserts missing provider evidence rows, rejects duplicate or existing care state, keeps all created records unpublished/unverified, and snapshots unrelated data. The local runner is fixed to the verified local Supabase container.

Run the review stages with:

```text
node scripts/phase4c-care-batch.mjs --check-batch
node scripts/phase4c-care-batch.mjs --dry-run
```

After a human has reviewed a canonical packet, resolved every issue, and changed both its packet gate and manifest gate to `localApply: true`, inspect the selected plan with:

```text
node scripts/phase4c-care-batch.mjs --plan-apply <provider-slug>
```

The write command deliberately accepts exactly one approved provider at a time so a later provider conflict cannot leave an unnoticed partial batch:

```text
node scripts/phase4c-care-batch.mjs --write-local <provider-slug> --confirm Lia-vaud:local:54322
```

Each write is transaction guarded, fixed to the local container, and followed by the packet's database invariants. `ems-boveresses` is protected from Phase 4C selection because its reviewed care state already exists and requires reconciliation rather than reinsertion. `packet_held` records unresolved canonical packets; `evidence_missing_from_repo` records candidates for which no packet may be created.

## Human next step

Add reviewed, source-linked research packets for up to five preferred providers. Then generate canonical care packets with `localApply: false`, run batch validation, and review the proposed facts and deferrals. Only after that review should a human change selected gates to `true` and invoke the guarded local apply.
