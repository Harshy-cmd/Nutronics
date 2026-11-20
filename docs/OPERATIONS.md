# Operations and recovery notes

Nutronics production data lives in Supabase Postgres and the private `patient-records` Storage bucket. Render's local filesystem is temporary. Do not store production database URLs, service-role keys, or exported patient records in the repository.

## Health check

Render uses `/api/health` as its process health check. This verifies that the API process responds; it does not prove that Postgres, Storage, email sign-in, or file downloads are healthy. Monitor those flows separately after a deployment.

## Manual database backup and restore drill

1. Use a trusted machine with the PostgreSQL client installed. Retrieve the database connection string from the secret manager or hosting dashboard; do not paste it into chat or commit it.
2. Create a custom-format dump with `pg_dump --format=custom --no-owner --file=nutronics-backup.dump "$env:SUPABASE_DATABASE_URL"` in PowerShell. Store the dump in an encrypted, access-controlled location and set a retention schedule appropriate to the data owner.
3. Restore only into a separate, empty staging database: `pg_restore --no-owner --clean --if-exists --dbname="$env:RESTORE_DATABASE_URL" nutronics-backup.dump`. Do not point a restore command at production.
4. Verify core tables, row counts, API startup, patient login, assigned doctor access, and a private record download in staging. Record the date, operator, dump location, and result without copying patient data into the record.
5. The database dump does not include objects in Supabase Storage. Back up and restore those objects separately using an approved private-storage export process, then verify their metadata paths and downloads in staging before relying on the drill.

This is a procedure, not evidence that a backup or restore has been run. Confirm the Supabase project's actual backup and retention capabilities in its dashboard, and schedule the drill with an authorized operator.
