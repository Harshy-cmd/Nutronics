# Supabase database migration

The API uses Supabase Postgres and a private `patient-records` Storage bucket. `SUPABASE_DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are server-only secrets; never use a `VITE_` prefix or commit either value. `SUPABASE_URL` is the public project URL.

## Move the existing SQLite data

1. In the Nutronics Supabase project, select **Connect** and choose **Session pooler**. The Render service is a persistent backend and the shared session pooler is the IPv4-compatible connection option on the free project.
2. Put that connection string in the root `.env` as `SUPABASE_DATABASE_URL=...`. Keep the password private and do not paste it into chat.
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the root `.env`. Get the legacy `service_role` key from **Settings > API Keys > Legacy API Keys**. The Storage API requires this server JWT in both the `apikey` and `Authorization` headers.
4. From the repository root, run `npm run db:migrate:supabase --workspace=server`. The script creates the schema and private bucket, copies existing SQLite rows and local record files, preserves row IDs, and leaves rows already present in Supabase unchanged. It can be rerun after an interrupted transfer.
5. In Render, set `SUPABASE_DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as secret environment variables and `SUPABASE_URL` to the project URL, then deploy the backend.

The schema enables Row Level Security on every table without adding public access policies. The API connects as the database owner from the server, so browser clients cannot query these tables through the Supabase Data API. Keep all credentials on the backend. The repository includes Supabase's published root CA certificate and uses it for verified TLS connections.

## Source database

The migration reads `DATABASE_PATH` when set; otherwise it reads `server/data/nutronics.sqlite`. The source is opened read-only and is not modified or deleted.
