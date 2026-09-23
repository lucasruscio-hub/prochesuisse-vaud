# Phase 4B — Boveresses care-information pilot

## Reviewed input and scope

The canonical packet at `phase4b-pilots/canonical/ems-boveresses-care.json` is generated only from the reviewed Phase 3B Boveresses packet. Its explicit `approval.localApply` gate is the only permitted difference from regenerated output. Publication and verification remain false.

The approved local import contains:

- operator: `Tertianum Vaud SA`;
- one `ems` offering named `Établissement médico-social`;
- capacity: 42 beds;
- long stay: true;
- services: palliative care, physiotherapy, occupational therapy, podology, and hairdressing.

The source claim `hairdresser` maps to the single canonical V1 code `hairdressing`. This is a vocabulary normalization, not a new fact.

## Deferred and unknown information

- `short_respite_stay` remains deferred because the source claim combines two independently nullable schema fields.
- The legacy `Gériatrie` and `Psychiatrie` tags remain unverified and do not become care profiles.
- Availability has no timestamped observation and remains absent.
- Short stay, respite, admissions, financing, public-interest/RIP, pricing, facilities, accommodation, and all other absent facts remain `NULL` or have no feature row.
- Google data stays in its external presentation namespace and is never care evidence.

## Guarded local workflow

```powershell
node scripts/phase4b-care.mjs --check-packet
node scripts/test-phase4b-local.mjs --write-local --confirm Lia-vaud:local:54322
node scripts/phase4b-care.mjs --write-local --confirm Lia-vaud:local:54322
node scripts/phase4b-care.mjs --verify-local
```

The apply requires the exact enriched Phase 3B provider row and its three existing source rows. It creates no new `provider_sources` row. It locks and snapshots provider, source, coverage, municipality, organization, offering, feature, provenance, availability, and lead state. Any prior Boveresses care state, source mismatch, identity mismatch, publication/verification state, service area, or unrelated mutation aborts the transaction. A repeated apply is rejected for reconciliation and creates no duplicates.

The local detail reader returns raw care rows only to the server-side projection. The projection accepts the exact unpublished pilot state and returns consumer-safe labels without source URLs or internal provenance identifiers.

## Development preview

Use the existing Google environment configuration if Google media should appear alongside the Lia facts:

```powershell
$env:LIA_PROVIDER_DETAIL_SOURCE='local'
npm.cmd run dev
```

Open `http://localhost:3000/prestataires/ems-boveresses`.
