# Phase 5F Batch A — AVASAD and regional organizations

Date: 2026-10-02. Status: applied and verified in local Supabase only. Production was not accessed. Batch B, CMS provider rows, held private identities, and Phase 5G enrichment remain out of scope.

## Authorized scope and target

The source of truth is Batch A in `phase5f-home-care-identity-packets/implementation-manifest.json` and the canonical `avasad-cms.json` packet. The guarded writer accepted only project `Lia-vaud`, workspace `C:\Users\lucas\Lia-vaud`, container `supabase_db_Lia-vaud`, host port `54322`, PostgreSQL 17, reached through the container's Unix socket. It does not load application environment variables, Supabase credentials, or a database URL.

The exact planned delta was confirmed before writing:

| Table | Operation | Rows |
| --- | --- | ---: |
| `organizations` | create | 8 |
| `organization_sources` | create | 8 |
| `organization_relationships` | create | 7 |
| `providers` | update legacy `avasad-cms` | 1 |
| `provider_sources` | create | 1 |
| **Net-new rows** |  | **24** |

## Organization identities

All organizations remain active, unpublished, and unverified. A website is not populated from a CMS network page. Legal names remain null when the packet preserves uncertainty.

| Name | Slug | Stable ID | `legal_name` |
| --- | --- | --- | --- |
| AVASAD | `avasad` | `6fa98f5f-c318-571d-a9eb-4f436f89ec82` | unknown (`null`) |
| Fondation Soins Lausanne | `fondation-soins-lausanne` | `dfb56e8c-6a65-5b0f-a973-a972dc87c620` | Fondation Soins Lausanne |
| APROMAD | `apromad` | `1d350349-7e3b-5beb-a16e-29737c561cb7` | unknown (`null`) |
| APREMADOL | `apremadol` | `ca1ad830-1be7-502f-ac1b-8192486b4fb2` | unknown (`null`) |
| ASANTE SANA | `asante-sana` | `2a4a7e9b-b2f7-543b-ae1a-48cac9a1f4ba` | unknown (`null`) |
| ABSMAD | `absmad` | `d66f516c-6094-5431-aa0b-5ff4f7acbee5` | unknown (`null`) |
| Fondation de La Côte | `fondation-de-la-cote` | `0273fee7-3c04-5746-a388-feb76cf5505f` | unknown (`null`) |
| ASPMAD | `aspmad` | `1d7bf236-866c-5658-ad30-be114708dceb` | unknown (`null`) |

## Relationships and evidence ownership

Seven relationships were created from AVASAD to the regional members: Fondation Soins Lausanne, APROMAD, APREMADOL, ASANTE SANA, ABSMAD, Fondation de La Côte, and ASPMAD. Every relationship is exactly `network_member`; none is an owner or operator relationship. Each relationship uses the regional member as `evidence_organization_id` and that member's own organization-source row.

Eight private `organization_sources` rows record the packet's official CMS-network page for AVASAD and each regional organization. Access dates are preserved exactly: 2026-09-28 for AVASAD, FSL, APROMAD, ABSMAD, Fondation de La Côte, and ASPMAD; 2026-10-02 for APREMADOL and ASANTE SANA. The source rows support `name`, plus `legal_name` only for Fondation Soins Lausanne.

One private Lia evidence row, ID `fe8aebd9-b125-5087-a197-194aa1f9d9e5`, was added to the existing `avasad-cms` provider. It records the packet-backed identity-resolution action and supports only `status` and `is_published`. The legacy provider was changed from active to archived and remains unpublished and unverified. No other provider field was intentionally changed.

## Rollback and reapplication

The transaction rollback dry-run completed before the first committed write and restored the exact pre-Batch-A state. The guarded write cycle then:

1. applied all 24 net-new rows and the one provider update;
2. verified the exact identities, evidence ownership, relationships, counts, RLS invisibility, and compatibility guards;
3. deleted only the deterministic Batch A rows and restored the serialized `avasad-cms` before-image, including its original `updated_at` value;
4. compared the complete guarded state with the pre-Batch-A snapshot and found it identical;
5. reapplied the same validated Batch A dataset locally.

Final rollback result: exact pre-Batch-A state restoration passed. The final database state is the reapplied Batch A state.

## Compatibility verification

| Check | Result |
| --- | --- |
| Provider count | 66 → 66 |
| CMS provider rows (`slug LIKE 'cms-%'`) | 0 → 0 |
| Organizations | 22 → 30 |
| Provider sources | 135 → 136 |
| Organization sources | 0 → 8 |
| Organization relationships | 0 → 7 |
| Provider-organization rows | unchanged at 32 |
| Care offerings | unchanged at 32 |
| Offering features | unchanged at 84 |
| Offering sources | unchanged at 53 |
| Service areas | unchanged at 1 |
| Municipalities | unchanged at 0 |
| `home_support` offerings | unchanged at 0 |
| 31-EMS fingerprint | unchanged: `b8756e81599062f1091dc7ee64359653` |
| Non-target domicile fingerprint | unchanged: `153f50c79913cd0b3f47646cbf82ecb2` |
| Senevita projection | unchanged: Senevita AG; 1 offering; 10 services; 1 care profile; `dans la région de Vaud` |

The former all-legacy-domicile fingerprint included the intentionally updated `avasad-cms.status` and its update timestamp, so it cannot remain equal to the pre-Batch-A value while also performing the manifest's required provider update. It changed from `367ce3bc3612c56d3da6386167739020` to `e7a0f1f3b6df23d0b4dcb3f717d537c4` after the final reapply. The rollback proof restored the original fingerprint exactly; the target-excluded domicile fingerprint above proves that no other domicile provider changed.

## Validation

- deterministic Batch A unit tests: 5 passed;
- Phase 5F schema-foundation tests: 7 passed;
- post-Batch-A Phase 5F local schema verifier: passed;
- full runnable `tests/*.test.mjs` suite: 122 passed, 0 failed;
- guarded final-state verification: passed;
- no CMS provider, offering, service-area, regulatory, alias, or provider-organization rows were created;
- publication and verification gates remain closed;
- production Supabase was not accessed.

The raw unscoped `node --test` command is not the runnable suite in this repository because it also discovers guarded maintenance scripts under `scripts/`; those scripts correctly refuse to run without their explicit write confirmations. The complete test-file suite under `tests/` is green.
