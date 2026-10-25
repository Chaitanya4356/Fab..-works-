# Backups and restoring

Supabase's free plan has no restorable backups, so SteelFlow makes its own (spec 4.8).

## What is backed up, and where

- **What:** the Live database. That includes roles, schema and every row, including logins (`auth.users`). Uploaded files (photos, drawings, the logo) are **not** in this backup; a weekly files backup comes after the MVP.
- **When:** every night at 02:00 IST, by the GitHub Actions workflow `.github/workflows/backup.yml`. GitHub only runs scheduled workflows from the default branch, so nightly backups start once the workflow is on `main`.
- **Where:** as a workflow artifact named `steelflow-backup-YYYY-MM-DD`, containing one encrypted file `steelflow-backup-YYYY-MM-DD.tar.gz.gpg`. Each artifact is kept for **14 days**.
- **Keeping the project awake:** the nightly connection also counts as activity, so the free Supabase project should not pause after a week of no use.

## The two secrets

Set these in GitHub → the repository → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `SUPABASE_DB_URL` | Live project → **Connect** → **Session pooler** URI (port 5432), with the database password filled in. Don't use the direct connection: it is IPv6-only and GitHub's runners have no IPv6. |
| `BACKUP_PASSPHRASE` | A long random phrase. **Keep a copy in a password manager.** If it is lost, no backup can ever be opened. |

## Run a backup by hand

```bash
gh workflow run backup.yml --ref main
```

```bash
gh run list --workflow backup.yml --limit 1
```

The run should end `completed success`, with an artifact named `steelflow-backup-<date>`.

## Restore into the local database (also the Milestone A check)

You need Docker Desktop running and the local stack started (`npx supabase start`). The commands are for Git Bash, from the repo root.

1. Download the artifact (from the run's page on GitHub, or with `gh run download <run-id>`), then decrypt and unpack it:

   ```bash
   gpg --batch --pinentry-mode loopback --passphrase-fd 0 -d -o backup.tar.gz steelflow-backup-YYYY-MM-DD.tar.gz.gpg
   ```

   Type the passphrase and press Enter. Then unpack it:

   ```bash
   tar xzf backup.tar.gz
   ```

   That gives `roles.sql`, `schema.sql` and `data.sql`.

2. Reset the local database so it has the same tables as Live (from the migrations):

   ```bash
   npx supabase db reset
   ```

3. Load the data. The first two lines clear the rows the migrations themselves insert (the settings row, the default number formats, the `files` bucket, and the audit rows those inserts write), so the backup's copies don't clash with them:

   ```bash
   docker exec -i supabase_db_steelflow psql -U postgres -d postgres -v ON_ERROR_STOP=1 --single-transaction \
     -c "SET session_replication_role = replica" \
     -c "delete from storage.buckets; delete from public.settings; delete from public.doc_number_formats; delete from public.doc_counters; delete from public.audit_log;" \
     -f - < data.sql
   ```

4. Check the row counts against Live (in the Supabase dashboard's SQL editor, run the same query there):

   ```bash
   docker exec supabase_db_steelflow psql -U postgres -d postgres -tAc "select (select count(*) from public.profiles) as profiles, (select count(*) from public.settings) as settings"
   ```

   **Milestone A check:** restore last night's Live backup this way, and confirm the `profiles` and `settings` counts match Live.

The nightly dump already leaves out Storage's analytics, vector and iceberg tables, which SteelFlow doesn't use and the `postgres` role cannot restore. If a restore stops on another internal table (a duplicate key or "permission denied"), add it to the `-x schema.table` list in `backup.yml`.

This procedure was rehearsed locally on 25-10-2026: 5 logins, their profiles, the settings and the number formats came back, a restored user could log in, and new audit rows carried on numbering after the restored ones.

## Restore into a brand-new Supabase project (disaster recovery)

1. Create a new Free project in the Mumbai region and set up Auth as in the README's deploy steps.
2. Link it and push the migrations:

   ```bash
   npx supabase link --project-ref <new-project-ref>
   ```

   ```bash
   npx supabase db push
   ```

3. Decrypt and unpack the backup as above, then load `data.sql` into the new project using its Session pooler URI. The local container's `psql` reaches it:

   ```bash
   docker exec -i supabase_db_steelflow psql "<session pooler URI>" -v ON_ERROR_STOP=1 --single-transaction \
     -c "SET session_replication_role = replica" \
     -c "delete from storage.buckets; delete from public.settings; delete from public.doc_number_formats; delete from public.doc_counters; delete from public.audit_log;" \
     -f - < data.sql
   ```

4. Point Vercel's environment variables at the new project, and upload again any files you still have (logo, drawings, photos).
