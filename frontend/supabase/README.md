# Supabase CLI workflow

Run every command in this document from `frontend/`.

## Source of truth

`migrations/` is the only executable database-migration history. The first
migration, `20260715220945_initial_remote_schema.sql`, is the reviewed baseline
captured from the existing hosted project with Migra. It is already marked as
applied on that project, so Supabase will not execute it there again.

The older files under `../db/migrations/` are an audit archive of SQL that was
previously run by hand. Never copy or rerun them against the linked project.

## Local database

Docker Desktop must be running.

```powershell
pnpm supabase:local:start
pnpm supabase:local:reset
pnpm supabase:db:lint
```

`supabase:local:reset` rebuilds only the local Docker database, applies every
CLI migration in order, and then runs `seed.sql`. It does not reset the linked
hosted database.

To stop the local stack without deleting its data:

```powershell
pnpm supabase:local:stop
```

## Create a migration

Create a timestamped file instead of writing a filename by hand:

```powershell
pnpm exec supabase migration new descriptive_name
```

Edit the generated SQL, reset the local database, lint it, and review the diff
before touching the hosted project.

## Hosted project safety gate

The repository is linked locally, but login tokens, database passwords, and
generated `.temp/` link files are not committed.

First confirm that local and remote histories align and inspect a dry run:

```powershell
pnpm supabase:migrations:list
pnpm supabase:remote:dry-run
```

Only after reviewing the exact pending files should an intentional deployment
use:

```powershell
pnpm exec supabase db push --linked
```

Never use `supabase db reset --linked`; it is destructive to hosted data.

## Application verification

With the appropriate environment variables in `.env.local`, run:

```powershell
pnpm supabase:verify
```

The verifier checks connectivity and selected anonymous/private RLS boundaries
without printing credentials or row contents.
