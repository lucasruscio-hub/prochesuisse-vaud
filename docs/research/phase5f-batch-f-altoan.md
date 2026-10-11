# Phase 5F Batch F — Altoan non-medical home support

Date: 2026-10-08. Status: applied and verified locally; production was not accessed. Phase 5G was not started.

Batch F created exactly 8 rows from the approved Altoan packet:

- one unpublished, unverified `Altoan SA` organization and one private source;
- one unpublished, unverified `Altoan` provider and one private source;
- one primary operator link from Altoan to Altoan SA;
- one unpublished, unverified `home_support` offering and one private offering source;
- one offering-scoped canton service area for `CH-VD`, explicitly supported by the approved packet.

The offering is named “Accompagnement à domicile non médical” and preserves the provider’s explicit strictly non-medical positioning. No `home_care` offering, nursing service, OSAD or LAMal classification, regulatory designation, service feature, availability, capacity, pricing, financing, reimbursement, language, municipality, or broader structured coverage fact was created.

`Altoan SA` is retained as the supported public organization name. Its `legal_name` remains null because the packet does not independently reproduce current commercial-register evidence. This evidence constraint did not block the approved public identity or patient-facing provider action.

The rollback-only dry run restored the exact completed Batch E predecessor. The apply → verify → rollback → exact comparison → reapply cycle also restored that exact predecessor before the final reapply. All 50 CMS, all Batch D AMAD/Vivradom/Dovida structures, all Batch E specialist and institution-linked structures, EMS, Senevita, and every non-target row remained unchanged. Held provider identities remained absent.

Final local counts are 123 providers, 50 CMS, 43 organizations, 21 organization sources, 4 organization names, 3 provider names, 141 provider-organization links, 90 offerings, 111 offering sources, 51 identity links, 56 regulatory designations, 84 features, 0 availability rows, and 4 service-area rows. Exactly one offering has type `home_support`.
