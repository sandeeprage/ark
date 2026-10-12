# ARK verification — 12 October 2026

Production: https://ark-rage.vercel.app

## Passed

- Type checking, ESLint, and all 45 unit tests.
- All 14 desktop/mobile browser workflows: discovery, filters, search, keyboard navigation, anonymous gates, publishing, screenshot processing, edit/delete/pins, upvote rollback, and pagination deduplication.
- GitHub Actions application and PostgreSQL jobs passed for commit `a4cbba4`. Database checks cover 92 assertions and parallel vote requests, using disposable fixtures.
- Vercel production deployment is ready on Node.js 22. The new domain serves Explore, login, maker profiles, project details, discovery API, and WebP screenshots.
- Project canonical URLs now use `ark-rage.vercel.app`; the previous default domain has been removed.
- Supabase's authentication fallback uses the new domain. GitHub authorization redirects to GitHub with an issued client ID and the correct Supabase provider callback.
- Anonymous publishing is gated by a streaming redirect to login. Anonymous access to raw votes, media paths, private account settings, and account state is denied.
- Public responses checked do not contain the server secret. The maintenance endpoint denies unauthenticated calls with 403.
- Vercel's GitHub connection points to private `sandeeprage/ark`, production branch `main`.
- Daily media maintenance is configured at 03:00 UTC (08:30 Asia/Calcutta).
- The production dependency audit reports zero known vulnerabilities.

## Still requires verification or implementation

- A fresh complete GitHub sign-in on the production domain requires the user's provider session. The automated check verifies the authorization handoff and fallback, not the full consent/callback round trip. Local real GitHub onboarding and publication were previously verified.
- Google sign-in is disabled. Identity linking/disconnection and account erasure are not implemented.
- Follows, Following, collections/Save, notification UI and preferences, repository verification, reports, and admin moderation remain incomplete.
- The first scheduled maintenance run has not yet been observed. Authenticated manual cleanup was not invoked: automatic approval review rejected it because it could permanently remove expired or retired media. Authorization behavior is covered by unit tests and an unauthenticated production check.
- Production upload/vote mutation smoke tests with a second real maker, broader accessibility/load checks, backup restoration, and migration-history registration remain rollout gates.

This is an internal development deployment. Passing the implemented checks does not complete the remaining product milestones.
