<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## SteelFlow

- The design is `docs/superpowers/specs/2026-10-24-steelflow-design.md`; stage plans are in `docs/superpowers/plans/`. The spec is the authority.
- Next.js 16 uses `src/proxy.ts` (exporting `proxy`). Never create `middleware.ts`.
- Check logins with `supabase.auth.getClaims()`, never `getSession()`, and re-check for an active user inside every server action.
- After any change in `supabase/migrations/`, run `npm run db:types`.
- Database tests live in `supabase/tests/` and run with `npm run test:db`. Phone-screen tests live in `tests/e2e/`.
