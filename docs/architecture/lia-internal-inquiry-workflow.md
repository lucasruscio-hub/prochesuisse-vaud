# Lia internal inquiry workflow

Status: implemented and verified locally on 2026-10-13

This is a Lia-staff-only operational interface. It is not the Partner Portal and creates no
provider account, customer account, organization membership, assignment, task, referral, or
provider disclosure.

## Authentication and authorization

The application uses Supabase Auth passwordless email links with server-side cookie handling via
`@supabase/ssr`. The public login route is `/lia/login`; successful links return only to the fixed
`/lia/auth/callback` route.

V1 authorization is deliberately small:

1. the submitted email is normalized and checked against the server-only comma-separated
   `LIA_STAFF_EMAILS` allowlist before Supabase is asked to send a link;
2. `signInWithOtp` uses `shouldCreateUser: false`, so an arbitrary login attempt cannot register a
   Supabase Auth user;
3. login responses are generic and do not reveal whether an address or Auth account exists;
4. every internal page and Server Action calls `requireLiaStaff()`;
5. that helper calls Supabase `auth.getUser()` on the server, normalizes the verified user's email,
   and rechecks the server allowlist;
6. unauthorized requests are redirected to `/lia/login` before private reads or mutations.

No application-level rate limiter existed to reuse. Supabase Auth's configured OTP rate limits
remain the abuse boundary for this V1. A durable distributed limiter can be added later if login
traffic warrants it; an in-memory serverless counter would not provide reliable protection.

Required environment names are documented in `.env.example` without values:

- `SUPABASE_URL`;
- `SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `LIA_STAFF_EMAILS`;
- `LIA_APP_ORIGIN`.

The Auth anon key is used only by the server-side Auth client in this implementation. The
service-role key remains in the `server-only` database module and is never imported by a Client
Component.

## Staff account provisioning

The sign-in form never creates users. A local operator must first create the staff Auth user in
the local Supabase Studio Authentication/Users interface, using the exact email that will be added
to the local `LIA_STAFF_EMAILS` value. The account should be marked email-confirmed as appropriate
for the local Auth setup. `SUPABASE_ANON_KEY` must be the local project's anon key and
`LIA_APP_ORIGIN` should be the exact local application origin. No real staff email belongs in Git.

Production provisioning is a separate operational step: after an authorized production Auth and
deployment review, an authorized operator will explicitly create the staff user in the production
Supabase project and separately configure the exact deployment allowlist/origin secrets. This
checkpoint did not inspect or change production.

Removing an email from `LIA_STAFF_EMAILS` immediately fails the authoritative authorization check
on the next request even if a Supabase session still exists. Deleting or disabling the Auth user is
the complementary account-revocation step.

## Private data access

The internal list and detail pages use a server-only data layer after `requireLiaStaff()` succeeds.
The list projects only submitted time, contact name, broad care type, location, timing, workflow
status, and last activity. The detail fetches only the approved contact, inquiry, consent, source,
and activity fields needed by that page.

The Inquiry Foundation database posture is unchanged:

- RLS remains enabled on all four inquiry tables;
- `PUBLIC`, `anon`, and generic `authenticated` have no direct table privileges or policies;
- the browser never receives the service-role key;
- future provider access must use a separate membership-aware Partner Portal design.

## Internal routes

- `/lia/login` — public, generic passwordless login request;
- `/lia/auth/callback` — fixed Auth code exchange and allowlist recheck;
- `/lia/inquiries` — protected minimal operational inbox with status filtering;
- `/lia/inquiries/[id]` — protected detail, consent evidence, workflow actions, and chronological
  activity history.

The detail page states explicitly when provider-sharing permission is `not_recorded`. Its internal
matching area now searches active providers, but only exposes targets with an active recipient
organization connected by an `operator`, `owner`, or `brand` relationship. Creating a shortlist
never authorizes or transmits family data.

## Atomic workflow operations

Migration `20261013000200_create_internal_inquiry_workflow_rpcs.sql` adds no table, column, policy,
or grant to a browser role. It adds two `SECURITY INVOKER` functions because `service_role` already
has the narrowly required table privileges:

### `transition_internal_inquiry_status`

- executable only by `service_role`;
- locks the inquiry row;
- requires the caller's expected current status for optimistic concurrency;
- accepts only the approved forward transitions;
- requires an approved closure outcome when closing;
- refuses closure while a referral is active, preserving the existing trigger rule;
- updates status, closure fields, and `last_activity_at`;
- appends exactly one `inquiry_status_changed` activity in the same transaction.

### `add_internal_inquiry_note`

- executable only by `service_role`;
- locks and validates the inquiry;
- trims and bounds the note to 1–1,000 characters;
- appends exactly one Lia-internal `note_added` activity;
- updates `last_activity_at` in the same transaction;
- does not modify any original family-submitted value.

The functions use the honest generic activity attribution `actor_type = 'lia_staff'` and
`actor_label = 'lia_internal'`. There is intentionally no invented actor ID or `auth.users` foreign
key. Per-person immutable attribution requires a later approved staff identity model.

## Atomic referral operations

Migration `20261013000300_create_internal_referral_workflow_rpcs.sql` builds on the existing
`inquiry_referrals` constraints without adding a table, column, policy, provider account, or
browser-role grant. Its six `SECURITY INVOKER`, service-role-only functions provide:

- atomic shortlisted-referral creation after validating the inquiry, active recipient organization,
  responsible provider relationship, optional active offering, and active-referral uniqueness;
- separate referral authorization using either a currently valid inquiry-level general permission
  or an explicitly attested referral-specific permission;
- immutable authorization withdrawal evidence, including after disclosure;
- controlled `shortlisted -> ready_to_share` progression that never transmits data;
- an idempotent, staff-attested manual-disclosure operation as the only path into `shared`;
- provider-response recording as the only path from `shared` to `engaged`;
- approved converted/closed outcomes with their milestone timestamps.

Every operation locks the referral and inquiry, uses the expected referral status for optimistic
concurrency where state changes, updates `inquiries.last_activity_at`, and appends the corresponding
referral activity in the same database transaction. The disclosure RPC stores only occurrence
evidence and an idempotency key; it has no email, webhook, provider session, or outbound transport.
The browser converts the staff-entered local disclosure time to an ISO timestamp before submission.

The Lia detail page displays the recipient organization, optional provider and offering, current
authorization/disclosure evidence, provider response, and final outcome. Each active referral can
be closed independently, and an inquiry still cannot close while any referral remains active.

## Verified local boundary

The migration received a rollback-only dry run before application. Post-application transactional
tests cover valid, invalid, stale, and closure-blocked transitions; exact activity counts; bounded
notes; original-submission immutability; zero referral creation by the RPCs; browser-role privilege
denial; and rollback safety.

Verified local result:

- migration versions aligned: 10;
- inquiry contacts: 0;
- inquiries: 0;
- referrals: 0;
- activities: 0;
- provider-domain fingerprint: `7442622ca5475ba03ceae56facbea673` (unchanged);
- production: not accessed.

The referral lifecycle verifier additionally covers duplicate-active-referral rollback, invalid
general authorization, no auto-share on authorization/readiness, idempotent manual disclosure,
response and terminal outcome activities, authorization withdrawal blocking later disclosure, and
pre-share closure. It returns all inquiry tables to zero rows and leaves provider data unchanged.

## Explicit stopping point

Do not add automated email/data sharing, provider login, Partner Portal access, memberships,
assignments, tasks, analytics, or broader CRM behavior from this checkpoint without separate
authorization.
