# Nutronics Website Review and Roadmap

**Reviewed:** 2026-11-20
**Scope:** Current repository and deployed product configuration discussed in this workspace.
**Status:** Login flow is working. Priority 0 access/SOS/clinical-label fixes and core privacy/session/admin changes below have been implemented locally; items marked follow-up remain open.

## Priority 0 — Fix before using real patient data

### 1. Restrict doctor access to assigned patients

Implemented: explicit assignments are required for doctor dashboards, dossiers, queue listings, and review actions. Admins can assign patients in User management. New local seed accounts receive sample assignments; existing deployed users require an administrator to assign them after the server deploys.

- Add automated API-level authorization tests against a disposable database for assigned and unassigned access (unit authorization coverage is being added).
- Existing patient record routes remain patient-owner scoped; there is no doctor record-file download route.
- Keep the service-role key server-only. The current Supabase setup has RLS enabled without browser-facing policies, so the API must enforce every access boundary correctly.

### 2. Make the SOS behavior truthful and safe

Implemented: the SOS UI says it records an event, only assigned doctors receive an in-app notice, and the response returns `dispatched: false`. It does not call emergency services or contact saved contacts.

- Add an end-to-end delivery test if real alert dispatch is introduced.
- If building a real alert flow, get the user's consent, target only the assigned care team and chosen contacts, show delivery status, provide a fallback, and test the process end to end.

### 3. Separate rule matches from clinician review

Implemented: helper matches now use `RULE_MATCHED`; only the doctor review action sets `VERIFIED`. The landing page and README describe demo/synthetic nutrition data rather than clinical validation.

- Call the current feature a rule-based nutrition helper unless an actual model is added.
- Use separate states such as **Rule matched**, **Needs clinician review**, and **Reviewed by clinician**. Only a recorded clinician action should produce the last state.
- Reconcile dataset claims, verify every active food value and condition rule, and show source, version, units, and review date in the product.
- Keep medication advice conservative; do not provide dosing or treatment changes. Add urgent-symptom guidance and a clearly visible medical disclaimer.

### 4. Add privacy and patient data controls

The app accepts health profiles, vitals, emergency contacts, and uploaded records. Add a plain-language privacy notice and consent before collecting this information, plus a way to export and request deletion of an account and its records. Define retention and support/contact procedures.

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
- Patient JSON export and deletion requests with admin visibility are implemented; add CSV/PDF export, an actual deletion completion workflow, and patient-facing activity history.
- Add end-to-end coverage for patient, doctor, admin, file access, and auth flows. Add uptime/error monitoring and a tested database backup/restore drill.

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
