# ARK

A home for completed, publicly available developer projects. Next.js App Router, TypeScript, Tailwind CSS, Radix accessible primitives, and Supabase. Deployment target: Vercel. ARK is source-available under the MIT License; the hosted application is an internal development deployment, not an open public beta.

## License and contributions

ARK is licensed under the [MIT License](LICENSE). Contributions are welcome; read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request. Third-party dependencies and services remain subject to their own licenses and terms.

## Run locally

Use Node.js 22.13 or newer and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000. Without Supabase configuration, the application runs in an explicit setup state. It has no fake accounts, launches, votes, or authentication. The development server binds to localhost.

## Connect Supabase

1. Use a dedicated development/staging project, not production.
2. Apply the seven SQL files in `supabase/migrations/`, in filename order, once through the Supabase SQL editor or linked Supabase CLI. They are transactional. Do not run migrations inside application requests. On an existing project, inspect schema conflicts before applying.
3. Put the project URL and **publishable** key in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
```

4. Enable GitHub and Google in Supabase Auth and configure the providers. Their OAuth callback points to the Supabase callback shown in the dashboard. Supabase's permitted application redirect is `http://127.0.0.1:3000/auth/callback`; set the Auth site URL to `http://127.0.0.1:3000`. The Supabase callback URL differs from ARK's application callback.
5. Keep private tables outside exposed API schemas. Expose `public`, not `private`. Disable password/email-only signup for this OAuth-only application.
6. Restart the development server after editing environment variables. Smoke-test real provider redirects, denied consent, username conflicts, and subsequent logins before considering identity complete.

Only public-profile/email scopes are requested for GitHub (`read:user user:email`). No repository or write scopes. The callback re-saves the ARK session without OAuth provider tokens before returning cookies. Real-provider consent and cookie audits remain a staging gate.

The URL and publishable key cannot apply migrations or enable OAuth providers. Add `SUPABASE_SECRET_KEY` to `.env.local` for server-side screenshot processing, then run `node scripts/setup-storage.mjs` to create the two private buckets. Never put provider secrets, database credentials, or a service-role key in `NEXT_PUBLIC_` configuration.

Complete OAuth in the same browser, using `127.0.0.1` consistently. Switching browsers or using `localhost` can lose the PKCE verification cookie.

For Vercel, configure a random server-only `CRON_SECRET`. The committed `vercel.json` schedules authenticated media maintenance daily at 03:00 UTC (08:30 Asia/Calcutta). Each invocation processes up to ten leased jobs; repeat manually when a backlog remains. Local authenticated POST calls can use `MAINTENANCE_SECRET` when `CRON_SECRET` is unset. Durable retries clean expired drafts, abandoned uploads, and removed media.

## Implemented slice

- Responsive monochrome shell, system light/dark themes, keyboard navigation and mobile drawer.
- GitHub/Google OAuth handoff, PKCE callback, verified server identity, private uncached responses, sign-out, suspension gate.
- Imported name/bio review, username validation/reservation, owner-only profile RPC, public maker profile and private profile settings.
- PostgreSQL schema, least-privilege grants, RLS, private account controls/settings/roles and normalized category/technology catalogs.
- Database-driven Popular/Latest reads, literal project/maker name matching, category AND stack-OR filters, shared URLs and scoped keyset cursor support.

- Reversible upvotes with authoritative active-account totals, maker totals, idempotent transactions, deduped notification events, and optimistic rollback.
- Explore/search append pages in place, deduplicate changing ranks, and offer Refresh without reshuffling a loaded feed.
- Project publishing with private staged uploads, decoded image validation, metadata removal, signed screenshots, versioned editing, named deletion confirmation, and profile pins.

The implementation also includes following, public collections, notifications, identity linking/disconnection, moderation, and account-erasure workflows. See [the build status](docs/build-status.md) for the current verification record and remaining launch gates. The hosted application remains an internal development build; it is not the public-beta release.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:publishing
```

Browser tests cover anonymous navigation, filters, search, sign-in gates, keyboard behavior and dark mode, with either an unconfigured or connected database. Publishing browser tests use a disposable localhost protocol fixture, exercise real server image processing, and never write synthetic projects to Supabase. Broader real-provider scenarios still require staging smoke tests. On computers with an existing Chromium installation, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can point to its executable. Preview screenshots: `node scripts/capture-preview.mjs` with the local server running. Connection readiness: `node scripts/check-backend.mjs` (prints status codes only, never keys).

Database tests need a disposable PostgreSQL 17+ database. `tests/database/auth-stub.sql` simulates the minimal Supabase Auth contract **only in an isolated test database**; never run it in Supabase. On a fresh test cluster:

```sh
psql -v ON_ERROR_STOP=1 -f tests/database/auth-stub.sql -f supabase/migrations/202610120001_foundation.sql -f supabase/migrations/202610120002_public_details.sql -f supabase/migrations/202610120003_projects_and_media.sql -f supabase/migrations/202610120004_media_maintenance.sql -f supabase/migrations/202610120005_pinned_reads.sql -f supabase/migrations/202610120006_upvotes.sql -f supabase/migrations/202610120007_maker_totals.sql -f tests/database/foundation.sql -f tests/database/projects.sql -f tests/database/upvotes.sql
```

The authorization tests use anonymous and authenticated roles and roll back test fixtures. They cover private-data boundaries, profile isolation, privilege escalation, trusted provider identity, suspension, literal search, ranking and filter semantics. They do not substitute for managed Supabase Auth/API integration tests.

CI runs application and isolated database checks. The source specification is in `docs/product-specification.md`; implementation status and remaining gates are in `docs/build-status.md`.
