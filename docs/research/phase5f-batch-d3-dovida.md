# Phase 5F Batch D3 — Dovida / Home Instead

Date: 2026-10-07. Status: applied and verified locally; production was not accessed.

D3 created nine rows and updated two existing providers:

- Seniorendienste Schweiz AG and one private organization source;
- one new private canonical-packet source on each existing provider;
- one unpublished historical name, Home Instead Lausanne, on the current Dovida provider, ending 2025-03-04;
- one explicit `successor` link from the legacy `homeinstead` provider to `dovida`;
- one primary operator link from Dovida to Seniorendienste Schweiz AG;
- one minimal unpublished `home_care` offering and one private offering-source row.

The existing `dovida` provider is now the single current listing, named Dovida Lausanne and located only to the evidenced office locality of Crissier. Street, house number, postal code, registered-branch status, and coverage remain unknown. The existing `homeinstead` provider is normalized to Home Instead Lausanne and archived while remaining unpublished and unverified. Its legacy locality/postal fields remain on the archived row, and the historical link prevents it from competing as a current listing.

No unnamed partner organization, ownership/brand/network relation, municipality/canton/narrative coverage, regulatory designation, service, language, availability, capacity, pricing, publication, or verification fact was created.

The rollback-only dry run restored the exact D2 predecessor. The apply → verify → rollback → exact comparison → reapply cycle restored both serialized provider before-images, including their original timestamps, before final reapply. All non-target provider data, all 50 CMS, EMS, Senevita, Nurse Home Care Sàrl, SoinVaud Sàrl, Pôle Santé, AMAD, and Vivradom remained unchanged. The unnamed partner identity remained absent.

Final D3/Batch D counts are 120 providers, 50 CMS, 38 organizations, 16 organization sources, 3 organization names, 1 provider name, 138 provider-organization links, 87 offerings, 108 offering sources, 51 identity links, 54 designations, and 2 service-area rows.

D4 has no remaining action. Its Pôle Santé organization, source, and trading name were created earlier as the B4 prerequisite and are now depended upon by CMS Pays-d’Enhaut; Batch D did not duplicate or roll them back.
