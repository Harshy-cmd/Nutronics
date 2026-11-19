# Supabase database migration

The API now uses Supabase Postgres. `SUPABASE_DATABASE_URL` is a server-only secret; never use a `VITE_` prefix or commit the connection string.

## Move the existing SQLite data

1. In the Nutronics Supabase project, select **Connect** and choose **Session pooler**. The Render service is a persistent backend and the shared session pooler is the IPv4-compatible connection option on the free project.
2. Put that connection string in the root `.env` as `SUPABASE_DATABASE_URL=...`. Keep the password private and do not paste it into chat.
3. From the repository root, run `npm run db:migrate:supabase --workspace=server`. The script creates the schema, copies the existing rows from `server/data/nutronics.sqlite` in foreign-key order, preserves IDs, and leaves rows already present in Supabase unchanged. It can be rerun after an interrupted transfer.
4. In Render, add `SUPABASE_DATABASE_URL` with the same value as a secret environment variable, then deploy the backend.

The schema enables Row Level Security on every table without adding public access policies. The API connects as the database owner from the server, so browser clients cannot query these tables through the Supabase Data API. Keep all credentials on the backend. The repository includes Supabase's published root CA certificate and uses it for verified TLS connections.

## Source database

The migration reads `DATABASE_PATH` when set; otherwise it reads `server/data/nutronics.sqlite`. The source is opened read-only and is not modified or deleted.
