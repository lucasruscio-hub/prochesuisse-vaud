# Lia Inquiry Foundation schema implementation

Status: implemented and verified on the guarded local Supabase database only

Date: 2026-10-12

Migration: `supabase/migrations/20261012000100_inquiry_foundation.sql`

This checkpoint implements only the approved private four-table schema foundation. It does not change `/api/leads`, the public form, application code, production, assignments, tasks, organization memberships, Partner Portal behavior, or full CRM behavior. It creates no inquiry/customer rows.

## Implemented objects

### `inquiry_contacts` — 9 columns

`id`, `first_name`, `last_name`, `email`, `phone`, `preferred_contact_method`, `created_at`, `updated_at`, `anonymized_at`.

The table keeps contact identity separate from inquiries, permits one contact to own many inquiries, has no email/phone deduplication, and permits destructive anonymization of identifiers without deleting inquiry/referral funnel history.

### `inquiries` — 31 columns

`id`, `primary_contact_id`, `care_type_code`, `beneficiary_relation_code`, `timing_code`, `need_codes`, `location_text`, `postal_code`, `municipality_id`, `context_summary`, `workflow_status`, `closure_outcome_code`, `source_channel`, `source_detail`, `landing_page`, `contact_permission_at`, `contact_permission_withdrawn_at`, `privacy_notice_version`, `privacy_acknowledged_at`, `provider_sharing_permission_status`, `provider_sharing_permission_at`, `provider_sharing_permission_withdrawn_at`, `intake_idempotency_key`, `legacy_lead_id`, `submitted_at`, `closed_at`, `last_activity_at`, `retention_due_at`, `anonymized_at`, `created_at`, `updated_at`.

The table stores current inquiry state directly. General provider-sharing permission is nullable in effect through the `not_recorded` state and remains separate from Lia contact permission and privacy acknowledgement. No fixed retention interval is encoded.

### `inquiry_referrals` — 16 columns

`id`, `inquiry_id`, `recipient_organization_id`, `provider_id`, `care_offering_id`, `referral_status`, `outcome_code`, `sharing_authorization_basis`, `sharing_authorized_at`, `sharing_authorization_withdrawn_at`, `shared_at`, `responded_at`, `converted_at`, `closed_at`, `created_at`, `updated_at`.

Every referral requires a recipient organization. Provider/site and offering are optional, but an offering requires its provider. A provider target is accepted only when the recipient organization has an active `operator`, `owner`, or `brand` relationship to that active provider; a `network` relationship alone is insufficient. Offering-backed current providers all satisfy this rule. Legacy residence rows without organization/offering structure remain ineligible instead of weakening the model.

Creating a referral never records disclosure. Authorization basis/time and actual `shared_at` remain separate. One inquiry can have multiple independent organization referrals; partial unique indexes prevent duplicate concurrent targets while allowing later terminal history.

### `inquiry_activities` — 14 columns

`id`, `inquiry_id`, `referral_id`, `activity_type`, `actor_type`, `actor_label`, `visibility_scope`, `from_status`, `to_status`, `note_text`, `event_data`, `related_activity_id`, `occurred_at`, `created_at`.

Activities are append-only and Lia-internal in V1. They supplement, rather than replace, current state on inquiry/referral rows. Update/delete attempts are rejected by trigger; `service_role` has only `SELECT` and `INSERT` table privileges.

## Controlled lifecycle values

- Inquiry: `new`, `reviewing`, `qualified`, `matching`, `closed`.
- Referral: `shortlisted`, `ready_to_share`, `shared`, `engaged`, `converted`, `closed`.
- Inquiry closure outcomes: `care_started`, `admission_or_placement`, `other_success`, `resolved_without_referral`, `family_withdrew`, `unreachable`, `duplicate`, `out_of_scope`, `no_solution_found`, `other`.
- Referral outcomes: `care_started`, `admission_or_placement`, `other_success`, `provider_declined`, `family_declined`, `no_response`, `unavailable`, `unsuitable`, `withdrawn`, `duplicate`, `other`.
- Sharing basis: `general_permission`, `referral_specific_permission`.
- General sharing-permission state: `not_recorded`, `granted`, `withdrawn`.

An inquiry cannot enter `closed` while any referral is non-terminal. `converted` is a terminal successful referral state and requires one of the three successful outcome codes. `closed` is terminal unsuccessful/other and requires a corresponding non-success outcome.

## Activity types

`inquiry_created`, `inquiry_status_changed`, `contact_permission_changed`, `provider_sharing_permission_changed`, `contact_attempted`, `note_added`, `referral_created`, `referral_status_changed`, `referral_sharing_authorized`, `referral_sharing_authorization_withdrawn`, `referral_shared`, `provider_response_recorded`, `family_contact_recorded`, `visit_scheduled`, `outcome_recorded`, `correction_recorded`, `retention_action_recorded`.

## Security posture

- RLS is enabled on all four tables.
- No client policy exists.
- `PUBLIC`, `anon`, and `authenticated` have no table privileges.
- `service_role` has `SELECT`, `INSERT`, `UPDATE`, `DELETE` on contacts, inquiries, and referrals—no `TRUNCATE`, `REFERENCES`, or `TRIGGER` privilege.
- `service_role` has `SELECT`, `INSERT` only on activities.
- Trigger functions are not directly executable by client roles or `service_role`; the immutable array helper is executable only where required.
- V1 access remains through future validated server-side operations. No portal/member access is present.

## Schema inventory

The four tables contain 74 columns, 65 constraints, and 21 indexes in total. Seven triggers enforce updated timestamps, target validity, inquiry/referral transitions, and append-only activities. The migration is one database transaction.

## Guarded local verification

Target identity was pinned to `Lia-vaud:local:54322`, database `postgres`, container `supabase_db_Lia-vaud`, container ID `9745f2c318d61eeb69dae3eb8b8eca6658498b400406ec19c21d876f77ca49fb`.

The verified sequence was:

1. rollback-only migration plus constraint/security fixtures;
2. apply through Supabase migration tooling;
3. exact schema/row/security verification;
4. scoped removal of Inquiry Foundation objects only;
5. migration-ledger repair to the predecessor state;
6. exact provider-domain predecessor comparison;
7. corrected reapply and final verification.

Final local state:

- inquiry contacts: 0;
- inquiries: 0;
- referrals: 0;
- activities: 0;
- RLS-enabled inquiry tables: 4;
- client policies: 0;
- repository/local migration versions aligned: 7;
- provider fingerprint unchanged: `7442622ca5475ba03ceae56facbea673`;
- providers 141, organizations 64, offerings 111, CMS 50, features 84, service areas 4, availability rows 0.

## Safety artifacts

Repository backup:

`D:\Lia-backups\Lia-backup-28_2026-10-12_pre-inquiry-foundation`

It contains 487 included files after the standard exclusions. Missing files, extra files, length mismatches, and SHA-256 mismatches were all zero. Git HEAD was `14de241f3538d22bf4a70769e717dc099a2c2901`, the backup working tree was clean, and `git fsck --full --strict` passed (dangling historical trees only).

Local database dump:

`D:\Lia-backups\Lia-db-backup_2026-10-12_pre-inquiry-foundation\lia-local-postgres-pre-inquiry-foundation.dump`

The custom-format dump is 502,828 bytes with SHA-256 `92B158A39DB77B5DFFFE8CF5C340878C3E59D7E4231BFEA2D7A86FB9A163B641`; `pg_restore --list` passed with 809 TOC entries.

## Rollback boundary

Before any inquiry data exists, `supabase/tests/inquiry_foundation_rollback.sql` removes only the four tables and six Inquiry Foundation functions in dependency-safe order. Once real inquiry data exists, routine destructive rollback is prohibited: stop the write path, retain records read-only, and fix forward unless a separately reviewed privacy/legal export-and-reversal procedure is approved.

## Explicit stopping point

Schema foundation only. The next application step requires separate authorization and must preserve `/api/leads` as a compatibility façade. Production schema audit, retention duration, privacy/legal operational decisions, application transaction functions, form changes, internal UI, assignments/tasks, memberships, sharing snapshots, and Partner Portal access all remain unimplemented.
