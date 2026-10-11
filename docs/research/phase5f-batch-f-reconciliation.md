# Phase 5F Batch F reconciliation

Date: 2026-10-08. Status: reconciled against the completed Batch E local checkpoint before implementation. Production was not accessed.

The approved Batch F plan remains exactly 8 net-new rows. The local database contains no Altoan provider, no Altoan organization, and no `home_support` offering.

| Identity | Intended action | Rows | Hold treatment |
| --- | --- | ---: | --- |
| Altoan SA | Organization only | 1 organization + 1 organization source | No blocking hold. `legal_name` remains null because the packet does not independently reproduce a current commercial-register extract. |
| Altoan | Create non-medical home-support provider | Provider, source, primary operator link, `home_support` offering, offering source, evidenced CH-VD canton service area = 6 | No blocking hold |

Totals by table: one organization, one organization source, one provider, one provider source, one provider-organization link, one care offering, one care-offering source, one provider service-area row, and zero regulatory designations. Total: 8.

The CH-VD row is not inferred: the approved packet explicitly states service in Vaud, Valais, and Geneva, and limits this Vaud implementation to the evidenced in-scope canton. The offering remains strictly non-medical. No `home_care` offering, nursing or OSAD semantics, regulatory designation, municipality, capacity, availability, language, pricing, financing, or reimbursement fact is planned.
