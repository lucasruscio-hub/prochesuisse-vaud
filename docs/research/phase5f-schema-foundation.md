# Phase 5F schema foundation

Date: 2026-09-28  
Scope: schema, migration, and verification only

## Outcome

The Phase 5F identity audit exposed five representational gaps. Migration
`20260928000100_phase5f_home_care_identity_foundation.sql` adds the minimum generic
foundation for them without creating or changing provider, organization, offering,
coverage, relationship, or evidence rows.

No Phase 5F identity packet or Phase 5G enrichment is part of this change.

## Schema decisions

### Organization evidence

`organization_sources` mirrors the useful provenance fields on `provider_sources`,
including exact `accessed_on`, reviewed fields, and notes. Its rows are owned by an
organization and remain private to `service_role`. Organization-only facts therefore
do not need a placeholder provider.

### Names and succession

`provider_names` and `organization_names` store evidence-backed `current_public`,
`legal`, `trading`, or `historical` names with optional validity dates. Each entity can
have at most one `current_public` name row. Canonical current names remain on the
existing entity tables, so no existing row is backfilled.

`provider_identity_links` supports `successor`, `duplicate_of`, and `split_into`.
Its evidence must belong to one of the linked providers. A historical name alone does
not require a second provider or an identity link, and links do not inherit facts.
The link table is private.

### Networks

`organization_relationships` represents sourced organization-to-organization
`network_member` links, such as a regional organization belonging to a cantonal
network. `provider_organizations.relationship_type` additionally accepts `network`,
while `operator`, `owner`, and `brand` retain their existing meanings. This supports:

`cantonal network → regional organization → patient-facing provider`

A delegated operating unit still uses the existing `operator` relationship. Network
membership is never treated as ownership.

### Home support

`care_offerings.offering_type` now accepts `home_support` in addition to the existing
values. It is distinct from medical `home_care`. No existing offering is reclassified.

### Regulatory designation evidence

`care_offering_regulatory_designations` stores a sourced positive authorization or
classification fact against an offering. It supports scheme and an optional code, exact source
label, optional jurisdiction and issuing organization, optional current/historical/
superseded/revoked status, and optional effective, expiry, and observed dates.

The fields that may be unknown have no defaults. A row requires evidence owned by the
same provider and an offering owned by that provider. Publication is explicit and
defaults to false. Consequently, the Canton spreadsheet dated 2026-03-02 can later be
stored as a dated observation without becoming timeless truth.

## Access and publication

All six new tables have row-level security. Organization sources and provider identity
links are private. Names, organization relationships, and regulatory designations have
read policies that require explicit row publication and the existing entity publication
conditions. No client write policy was added.

## Compatibility and verification contract

The local verification checks:

- exactly 66 existing providers;
- the unchanged 31-EMS fingerprint;
- the unchanged non-Senevita domicile fingerprint;
- no `home_support` offering rows;
- zero rows in all six new foundation tables;
- an unchanged fingerprint of all pre-existing provider/care tables;
- the Senevita Casa Vaud projection: Senevita AG, one offering, ten services, one care
  profile, and the narrative coverage `dans la région de Vaud`;
- same-entity provenance constraints, self-link rejection, regulatory date ordering,
  private-table grants, and unpublished-row visibility in a transaction that rolls back.

The local runner accepts only the fixed `Lia-vaud` Supabase container and local port
54322. It does not load application environment variables or accept a production URL.

## Deferred work

No provider identities, CMS sites, private OSADs, alternate names, organization
relationships, or regulatory designations are populated here. That work remains blocked
until this schema foundation is reviewed and the relevant identity packets are approved.
