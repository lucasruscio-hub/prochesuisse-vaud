# Phase 3D Google Place candidate review

Phase 3D discovers Google Place candidates for a curated provider list. It does not match, approve, publish, verify, or update a provider. The workflow is:

`provider slug → current Lia identity → Places Text Search (New) → temporary review report → human decision → manual local approval mapping`

## Pilot input

The checked-in input is `config/google-place-batches/phase3d-pilot-01.json`. Every slug must already exist in the static provider repository. The batch validator rejects duplicate and unknown slugs, rejects Nova Vita explicitly, and caps a batch at 25 providers. The first pilot contains 15 identities:

- `ems-boveresses`
- `ems-chateau-rive`
- `ems-clair-soleil`
- `ems-boissonnet`
- `ems-joli-automne`
- `ems-le-home`
- `ems-marronnier`
- `ems-signal`
- `ems-petit-flon`
- `ems-pre-pariset`
- `ems-pre-tour`
- `ems-girarde`
- `ems-meillerie`
- `ems-pre-fleuri`
- `senevita-vaud`

Boveresses uses its Phase 3B reviewed name, `Tertianum Les Boveresses`. Senevita uses its reviewed office identity and is marked `identityScope: office`; its Renens location never represents a service area. The remaining queries use the current repository name, locality, and postal code. Search text is evidence for candidate discovery only and does not resolve site/operator relationships.

## Generate a temporary report

Set the existing server-only `GOOGLE_PLACES_API_KEY` in ignored `.env.local`, then run:

```powershell
node scripts/google-place-batch.mjs config/google-place-batches/phase3d-pilot-01.json
```

The script performs one limited Text Search (New) per slug and writes a timestamped file under `reports/google-place-batches/*.local.json`. It prints only the output path and counts; it never prints or writes the API key. It does not read or write Supabase or `config/google-place-approvals.local.json`.

Each report entry records the Lia identity and query, candidate Place ID, Google name, Google address, Google Maps URL, and whether Google returned zero, one, or multiple candidates. Every candidate starts with `plausibility: unreviewed`; every provider starts with `humanDecision.decision: pending` and a null selection. A single result is still not an approved match.

The live report contains Google Places content and is intentionally gitignored and temporary. Inspect it locally during review and do not commit it. Place IDs may be retained after review, but Google names, addresses, URLs, and other Places content remain subject to Google Maps Platform storage rules. The checked-in input and tooling contain no fetched Google content and are safe to review in version control.

## Human review

For each provider:

1. Open every returned Google Maps URL. Do not assume the first result is correct.
2. Compare site name, physical location, current operating identity, and whether the result is an establishment, operator, network, or office.
3. Mark each candidate `plausible` or `not_plausible` in the temporary report and add a reviewer note. Zero plausible candidates stays held. Multiple plausible candidates stays held until independently resolved.
4. Historical/closed, operator-level, network-level, and ambiguous identities stay held. Do not reuse one Place ID for multiple Lia establishments. The approval reader rejects duplicate approved Place IDs.
5. For home care, review only the office identity. Never turn its map location into service coverage.
6. Only after a human reaches an unequivocal site-level decision, manually add or update that slug in ignored `config/google-place-approvals.local.json`. Preserve the existing Boveresses entry. An approval requires `status: approved`, the exact `placeId`, `reviewedBy`, `reviewedOn`, and an `identityNote` explaining the match.

The batch script has no approval-writing code. Nova Vita remains blocked even if manually inserted into the local mapping. Adding approved Place IDs for providers beyond Boveresses does not itself publish, verify, or expose them; any broader rich-preview enablement is a separate reviewed change.
