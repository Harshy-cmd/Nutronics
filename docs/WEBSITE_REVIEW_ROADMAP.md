# Nutronics Website Review and Roadmap

**Reviewed:** 2026-11-20
**Scope:** Current repository and deployed product configuration discussed in this workspace.
**Status:** Login flow is working. Priority 0 access/SOS/clinical-label fixes and core privacy/session/admin changes below have been implemented locally; items marked follow-up remain open.

## Priority 0 — Fix before using real patient data

### 1. Restrict doctor access to assigned patients

Implemented: explicit assignments are required for doctor dashboards, dossiers, queue listings, and review actions. Admins can assign patients in User management. New local seed accounts receive sample assignments; existing deployed users require an administrator to assign them after the server deploys.

- Focused assignment-policy unit checks exist; add API-level authorization tests against a disposable database for assigned and unassigned access.
- Existing patient record routes remain patient-owner scoped; there is no doctor record-file download route.
- Keep the service-role key server-only. The current Supabase setup has RLS enabled without browser-facing policies, so the API must enforce every access boundary correctly.

### 2. Make the SOS behavior truthful and safe

Implemented: the SOS UI says it records an event, only assigned doctors receive an in-app notice, and the response returns `dispatched: false`. It does not call emergency services or contact saved contacts.

- Add an end-to-end delivery test if real alert dispatch is introduced.
- If building a real alert flow, get the user's consent, target only the assigned care team and chosen contacts, show delivery status, provide a fallback, and test the process end to end.

### 3. Separate rule matches from clinician review

Implemented: helper matches now use `RULE_MATCHED`; only the doctor review action sets `VERIFIED`. The landing page and README describe demo/synthetic nutrition data rather than clinical validation.

- The product now calls this a rule-based nutrition helper. Add a real model only after its safety and privacy requirements are addressed.
- The UI distinguishes **Rule matched**, **Needs review**, and **Clinician reviewed**; only a doctor queue action produces the last state.
- Reconcile dataset claims, verify every active food value and condition rule, and show source, version, units, and review date in the product.
- Keep medication advice conservative; do not provide dosing or treatment changes. Add urgent-symptom guidance and a clearly visible medical disclaimer.

### 4. Add privacy and patient data controls

Implemented: a plain-language demo/data notice is required for new patient registration, consent timestamps are stored, patient JSON export is available, and account deletion requests are visible to admins. Uploaded files can be downloaded separately. The request does not erase data yet; complete deletion manually and define retention/support procedures before accepting real patient data.

## Priority 1 — Complete core workflows

### 5. Make reminders work outside the open page

Implemented: reminder UI says schedules are in-app and no notifications are sent. Later, add opt-in browser push with timezone handling, quiet hours, and a reliable fallback.

### 6. Finish staff administration

Implemented: admins can provision staff records for Firebase email-link/Google sign-in, assign patients, activate/deactivate other accounts, and review audit events. Configuration keys/values are validated; staff provisioning does not send an invitation email, so the admin must notify the staff member through their normal channel.

- Extend audit coverage to all sensitive guideline changes and establish secure staff invitation delivery.
- Validate configuration descriptions in the admin UI and avoid unsupported configuration toggles.

### 7. Harden sessions and access logs

Implemented: access tokens are in memory, cookie-based auth rejects mismatched browser origins, Vercel sends a restrictive CSP and baseline security headers, and doctor dossier reads/account admin actions are audited. Extend audits to all guideline changes and broader reads.

### 8. Update project and data-source documentation

Implemented: README/API docs now describe Supabase Postgres/private storage, Render/Vercel responsibilities, demo-only data limitations, and production staff provisioning.

## Priority 2 — Improve usability and reliability

- Add a guided first-run setup for profile, conditions, units, timezone, emergency contacts, and notification preferences.
- Audit mobile layouts, keyboard navigation, screen-reader labels, color contrast, and form errors.
- Add clear loading, offline, retry, and empty states. Make failed uploads and assistant requests show an actionable message.
- Patient JSON/CSV export, recent account activity, and deletion requests with admin visibility are implemented; an actual deletion completion workflow remains.
- A manual backup/restore procedure is documented in `docs/OPERATIONS.md`, but it has not been run. Add end-to-end coverage for patient, doctor, admin, file access, and auth flows; uptime/error monitoring; and a tested database/storage backup/restore drill.

## Completed implementation notes

- New accounts must acknowledge a plain-language demo/data notice. Consent timestamps are stored for new patient registrations.
- Admin can review the latest audited dossier reads, guideline updates, account changes, patient assignment changes, staff provisioning, and settings changes.
- Staff provisioning creates a role-scoped account for Firebase email-link or Google sign-in, but does not send an invitation email.
- Access tokens are now held in memory; refresh still relies on the HTTP-only cookie and the app restores the session on load.

## Later — Only after safety and access controls

- Real wearable integrations with source, timestamp, units, and patient confirmation for imported readings.
- Push notifications and clinician escalation only after consent, delivery reporting, and a tested fallback are in place.
- A real AI feature only after privacy review, validated sources, narrow supported use cases, clinician review, and monitoring are designed.

## Suggested order

1. Fix doctor-to-patient authorization.
2. Correct SOS wording and decide whether the product is demo-only or will provide real escalation.
3. Correct clinical/data claims and verification states.
4. Add privacy, consent, export, deletion, and audit history.
5. Update the README and source-of-truth documentation.
6. Finish staff provisioning, reminders, accessibility, and automated coverage.
