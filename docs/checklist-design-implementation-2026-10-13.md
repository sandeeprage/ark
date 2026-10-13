# Checklist Design follow-up — 13 October 2026

This follow-up implements the application findings in the historical audit. The user explicitly deferred the demo-video field and rendering; those remain unchanged.

## Implemented

- Profile, project, collection, and notification-preference saves disable unchanged submissions, show pending activity, and acknowledge completion. Profile values reconcile with server normalization.
- Publishing errors have field associations and a focused summary. Editable errors clear as their fields change. Uploads identify filenames, show drop-target feedback, and offer a stop-after-current-step action that preserves selected work.
- Secondary text contrast in the light theme is corrected. Accessibility contribution guidance documents a WCAG 2.2 AA target and manual verification requirements.
- Google-only onboarding offers optional GitHub linking. Settings supports connecting/disconnecting identities and protects the final usable identity. Sensitive changes require a verified sign-in within ten minutes; linking callbacks check the initiating account.
- Avatars can be uploaded, removed, or explicitly imported from an allowlisted provider image host. The server strips metadata, bounds downloads, produces a square WebP, and stores it privately. Public delivery checks profile visibility and never exposes the storage object path.
- Account deletion requires typed confirmation and recent authentication, hides the portfolio immediately, and durably queues media removal followed by Auth deletion. Retries preserve object references outside cascading rows. Incomplete and suspended accounts can request deletion too.
- Reporting is private, rate-limited, and excludes self-reporting. Moderation requires an explicitly granted private administrator role, records decisions, and protects administrator accounts. Reporters see only their own sanitized statuses.
- Help, Privacy, Terms, Service information, maintenance, and deletion acknowledgement pages use `arkragesupport@gmail.com`. Footer and login policy links have working destinations. No legal operator name was invented.
- Project cards include launch dates; project detail back links preserve browse context. Empty states and loaded-page counts are explicit. Active filter chips can be removed individually. Notifications show relative recent times with exact timestamps available.

## Verification

- Production build passed with Node 22 in a fresh output directory. The old local `.next` Turbopack cache was damaged; it was not used as evidence of source failure.
- 103 unit assertions passed.
- All 209 database assertions passed against an isolated PostgreSQL cluster, including authorization, private role isolation, erasure retry ordering, storage prefixes, moderation, and report redaction.
- The publishing suite exercised 46 desktop/mobile scenarios. Two initial failures were corrected: avatar selection stayed dirty after upload, and a Following test matched both a sidebar link and a content link. All four targeted desktop/mobile reruns passed.
- Production-build navigation passed its account/profile/editing test.
- All ten new account scenarios passed desktop/mobile reruns. The two support-page scenarios passed keyboard, footer destination, contact-email, and overflow checks. Mobile policy-page rendering was visually inspected.
- All ten foundation browser scenarios passed against the disposable backend, including responsive browsing, filters, login layout, and dark-mode keyboard navigation.
- Runtime dependency audit reported zero vulnerabilities. Development tooling still has transitive advisory exposure; the available forced fix downgrades the Next ESLint configuration and was not applied. Critical test-tooling findings were fixed by upgrading Vitest.

## Production prerequisites and independent checks

Migration `202610130012_accounts_and_moderation.sql` was applied transactionally to managed Supabase after explicit user approval. The editor content was compared with the tested local file before execution, and the dashboard returned success. Managed authorization probes verified public profile reads, denied anonymous reports, service-only avatar/erasure writes, and denied self-grant of administrator roles.

The private `ark-avatars` bucket has been created with a 2 MiB limit and WebP-only uploads; the existing staging/media buckets were confirmed private. Manual identity linking was enabled with explicit approval and verified after reloading the provider settings. Do not run the local Auth stub or database fixture scripts against production. Existing SQL-editor migrations are not registered in CLI history; do not use `db push` to replay them.

The owner approved `sndp` as moderation administrator. A guarded transaction resolved that exact active username and granted its private administrator role; the result returned `sndp / admin`. Administrator provisioning was separate from the application migration.

The existing daily maintenance schedule processes a bounded erasure queue. Verify scheduled completion, backlog capacity, and failure alerting before opening public beta; immediate hiding is not proof that permanent erasure has completed. Provider authorization must also be revoked separately in GitHub/Google permissions if the user wants to revoke the external app grant.

Manual NVDA/VoiceOver testing, independent database restore rehearsal, production performance/load checks, real provider linking/unlinking, and production scheduled-erasure verification remain operational launch gates. Destructive workflows were exercised only against disposable fixtures. No real account was deleted and no synthetic projects/reports were inserted into production.

The demo-video item remains deferred by user instruction. The app is not certified flawless or fully WCAG-conformant by these automated checks.
