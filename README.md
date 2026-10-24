# SteelFlow

SteelFlow runs one small steel fabrication workshop in India: customers and projects, quotations, materials and stock, workers, fabrication progress, dispatch, invoices, manual payment records, and project profit. It is a Next.js app on a Supabase database, built to be used on a phone.

## Run it locally

You need Node 24 and Docker Desktop running.

```bash
npm install
npx supabase start          # starts the local database; prints the URL and keys
cp .env.example .env.local  # then paste the Publishable and Secret keys into it
npm run dev                 # http://127.0.0.1:3000
```

## Tests

| Command | Runs |
|---|---|
| `npm test` | Calculation tests (Vitest) |
| `npm run test:db` | Resets the local database, then runs the database tests (pgTAP) |
| `npm run test:e2e` | Resets the local database, then runs the phone-screen tests (Playwright) |
| `npm run lint` / `npm run typecheck` | Code checks |

After changing a migration, run `npm run db:types` to refresh the database types.

## Design and plans

- Design: [docs/superpowers/specs/2026-10-24-steelflow-design.md](docs/superpowers/specs/2026-10-24-steelflow-design.md)
- Stage plans: [docs/superpowers/plans/](docs/superpowers/plans/)
