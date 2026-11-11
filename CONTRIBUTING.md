# Contributing to ARK

Thanks for considering a contribution.

ARK is an actively developed project. The hosted application is not a public beta, and some production-readiness checks remain open. Please read the README and `docs/build-status.md` before choosing work.

## Before you start

1. Search existing issues and pull requests to avoid duplicate work.
2. For substantial changes, open an issue first to discuss the problem and proposed approach.
3. Keep pull requests focused. Explain the user-facing problem, the implementation, and any trade-offs.
4. Do not include real user data, credentials, API keys, OAuth tokens, production database dumps, or private screenshots.

## Local setup

Use Node.js 22.13 or newer and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Configure a dedicated development Supabase project as described in the README. Never point local tests or experimental migrations at the production project.

## Checks

Run the relevant checks before opening a pull request:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:publishing
```

Database tests require a disposable PostgreSQL 17+ database. Follow the isolated test setup in the README. The Auth stub is for that isolated test database only; never run it against Supabase.

## Database and security changes

- Preserve least-privilege grants and row-level security. Test anonymous, owner, and other-user access.
- Add new schema changes as ordered migrations. Do not edit an already-applied migration to change deployed behavior.
- Keep secrets server-side. Never expose service-role keys or provider secrets through `NEXT_PUBLIC_*` variables.
- Treat every server mutation as an authorization boundary. Client-side checks are not authorization.
- Include tests for retries, concurrency, and failure paths when changing transactional behavior.

## Pull request expectations

A useful pull request includes:

- A clear problem statement and concise summary.
- Tests or a specific explanation of why tests are not applicable.
- Screenshots for meaningful UI changes, using synthetic data only.
- Documentation updates when setup, behavior, configuration, or security assumptions change.

By submitting a contribution, you agree that your contribution is provided under the repository's MIT License. You retain copyright in your contribution.
