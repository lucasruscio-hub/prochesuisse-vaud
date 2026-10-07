# Phase 5F Batch D reconciliation

Date: 2026-10-07. Status: reconciled against the verified local Batch C checkpoint; implementation pending. Production was not accessed.

The original Batch D expected 47 net-new rows plus two provider updates. Its row plan included six organizations, six organization sources, three organization names, four providers, six provider sources, one provider name, one identity link, five provider-organization links, five offerings, five offering sources, four regulatory designations, and one narrative service-area row.

The earlier B4 prerequisite already created the Pôle Santé du Pays-d'Enhaut organization, its private organization source, and its trading-name row (`Pôle Santé du Pays d'Enhaut`): three net-new rows. Those rows are now referenced by CMS Pays-d’Enhaut and must not be recreated or rolled back during Batch D.

The remaining Batch D plan is therefore 44 net-new rows plus two provider updates:

- D1 — AMAD, 19 rows: two legal organizations and sources; two historical organization names; Lutry and Nyon providers and sources; two operator links; two home-care offerings and sources; two dated authorization observations; one Nyon narrative service-area row. AMAD Yverdon remains held.
- D2 — Vivradom, 16 rows: two separate legal/operator organizations and sources; Renens and Orbe providers and sources; two operator links; two home-care offerings and sources; two dated authorization observations. No shared brand organization, inter-organization relationship, or coverage row.
- D3 — Dovida / Home Instead, 9 rows plus two updates: Seniorendienste Schweiz AG and source; one new source on each existing provider; one historical name on Dovida; one Home Instead → Dovida successor link; one Dovida operator link; one Dovida home-care offering and source. Update `dovida` as the current Dovida Lausanne identity and archive `homeinstead` as the unpublished legacy identity. No partner organization or municipality rows.
- D4 — Pôle Santé remainder, 0 rows and no action. The organization/source/name prerequisite is complete and the CMS provider work is already in Batch B.

The reconciled manifest retains the original row plan for auditability and records the three prerequisite rows separately from the 44 remaining rows.
