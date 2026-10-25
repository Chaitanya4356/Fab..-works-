# SteelFlow

SteelFlow runs one small steel fabrication workshop in India: customers and projects, quotations, materials and stock, workers, fabrication progress, dispatch, invoices, manual payment records, and project profit. It is a Next.js app on a Supabase database, built to be used on a phone.

## Run it locally

You need Node 24 and Docker Desktop running.

```bash
npm install
npx supabase start          # starts the local database; prints the URL and keys
cp .env.example .env.local  # then paste the Publishable and Secret keys into it
npm run dev                 # http://localhost:3000
```

## Tests

| Command | Runs |
|---|---|
| `npm test` | Calculation tests (Vitest) |
| `npm run test:db` | Resets the local database, then runs the database tests (pgTAP) |
| `npm run test:e2e` | Resets the local database, then runs the phone-screen tests (Playwright) |
| `npm run lint` / `npm run typecheck` | Code checks |

After changing a migration, run `npm run db:types` to refresh the database types.

## Deploying (free plans)

SteelFlow runs on two free Supabase projects (Test and Live, Mumbai region) and one Vercel project. These steps are done once, by the owner:

1. Make the GitHub repository private.
2. In Supabase, create `steelflow-test` and `steelflow-live` (Free plan, region `ap-south-1`). Keep each database password in a password manager. If Settings → Infrastructure shows a Postgres version other than `[db] major_version` in `supabase/config.toml`, change the config and rerun `npm run test:db`.
3. In both projects: Authentication → Sign In / Providers → turn **Allow new users to sign up** off. Leave Email **Confirm email** on: SteelFlow creates its logins already confirmed, and confirmation stops a stray sign-up from ever getting in. (SteelFlow also keeps any login it did not create switched off.)
4. Push the database to Test: `npx supabase link --project-ref <test-ref>`, then `npx supabase db push`.
5. Create the first login on Test with `scripts/create-first-user.mjs` (see the comment at its top), using Test's URL and secret key.
6. In Vercel, import the repository (framework Next.js, production branch `main`). Give **Production** the Live URL, publishable key and secret key, and **Preview** the Test ones. Push `dev` and set its preview URL as Test's Site URL (Authentication → URL Configuration).
7. Check on a phone, using the `dev` preview URL: log in, add a second user, fill in Settings.
8. Release: merge `dev` into `main`, push the database to Live the same way, create the first Live login, and set Live's Site URL to the production URL.
9. Switch on nightly backups: add the `SUPABASE_DB_URL` and `BACKUP_PASSPHRASE` repository secrets and run the backup once. See [docs/operations/backup-restore.md](docs/operations/backup-restore.md).

## Design and plans

- Design: [docs/superpowers/specs/2026-10-24-steelflow-design.md](docs/superpowers/specs/2026-10-24-steelflow-design.md)
- Stage plans: [docs/superpowers/plans/](docs/superpowers/plans/)
