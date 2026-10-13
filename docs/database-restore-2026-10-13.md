# Database restore rehearsal — 13 October 2026

The local synthetic rehearsal passed with PostgreSQL 18. It restored all 12 application migrations into a second, empty database, matched data and schema fingerprints across 24 tables, and passed 30 post-restore authorization assertions. Three synthetic storage objects matched their SHA-256 hashes; removing one object caused verification to fail as expected.

No production database, account, image, maintenance job, or credential was changed. This is a repeatable application recovery check, not proof of recovery of the managed Supabase project.

## Coverage and evidence

The fixture includes three users, two OAuth identities, published/hidden projects, covers, an avatar, pins, votes, follows, a collection, notifications, preferences, a report, moderation audit, administrator assignment, and a pending erasure snapshot. The pending job is restored as data and never executed.

The fingerprint compares row counts and canonical row digests, table ownership and grants, column grants, RLS flags and policies, functions, columns/defaults, constraints, indexes, and triggers. Equivalent table grants are normalized because PostgreSQL can reorder ACL entries during restore. Authentication roles are pre-existing in the local cluster; this does not test restoration of global roles or the complete managed Auth schema.

The restored permission checks cover public visibility, private votes/media/reports/audit, ordinary-user denial of moderation and role escalation, notification/report isolation, administrator access, service-only media lookup, and retention of the erasure payload.

Latest verified run at `2026-10-13T18:25:23Z`: archive 189,317 bytes; dump 334 ms; database restore 541 ms. These timings describe tiny synthetic fixtures and are not production recovery estimates. The ignored local archive, fingerprints on failure, object copies, logs, and summary are under `.vercel/restore-tests/`. Archives are intentionally never committed.

## Repeating the isolated check

Use a disposable PostgreSQL 18 cluster with a local superuser named `ark_test`. Install the repository dependencies with Node.js 22. Set `ARK_RESTORE_TEST=1`, `PGUSER=ark_test`, `PGHOST=127.0.0.1`, the cluster's `PGPORT`, and optionally `PG_BIN` to the PostgreSQL binary directory, then run:

```sh
node scripts/verify-database-restore.mjs
```

The runner rejects remote hosts and arbitrary database names. It creates two random databases from `template0`, applies the local Auth stub and migrations, seeds synthetic data, exports with `pg_dump --format=custom`, imports with `pg_restore --exit-on-error --single-transaction`, and verifies the result. It drops only databases successfully created by that invocation. Commands are limited to 60 seconds and 64 MiB of output for this small fixture.

GitHub Actions runs this check against its disposable PostgreSQL 18 service. Native dump/restore commands run inside that service container so their version matches the server. CI does not receive ARK production credentials.

## Managed recovery gate still open

A production recovery rehearsal needs a separate Supabase project or approved branch, a protected real database backup, and a separately protected copy of storage objects. Supabase database backups contain storage metadata but not the stored files. Therefore a successful database import alone cannot establish recoverability of project screenshots or avatars. See [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).

Prepare the following before an invited beta:

1. Confirm backup availability, retention, access, and a protected off-platform copy for the current plan. Never place credentials, production dumps, or customer objects in Git or CI artifacts.
2. Record schema migration versions, application commit, bucket privacy/configuration, Auth provider settings, callback allowlists, and required extensions/roles. SQL-editor migrations must be registered before adopting CLI migration management.
3. Restore only into a separate approved environment, following Supabase's managed restore guidance. Do not run the local Auth stub against a managed project. Match PostgreSQL tooling versions and preserve ownership/grants deliberately; see [pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html) and [pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html).
4. Restore storage objects separately, compare object references, lengths, and hashes, and confirm private bucket access boundaries. Account erasure requires durable tracking of which backup copies contain deleted data.
5. Keep cron workers, outbound integrations, and real-user access disabled in the recovery environment. Restored pending erasure/media jobs must not run automatically during validation.
6. Verify real Auth identities, provider callbacks, sessions, cross-user authorization, public/hidden content, moderation permissions, storage delivery, and pending jobs. Measure end-to-end recovery time and the backup's data-loss window.
7. Document results, failures, and a cutover/rollback decision. Enable workers and traffic only after validation and explicit approval of a production cutover.

Other independent gates remain: the first successful scheduled maintenance invocation, manual screen-reader checks, wider multi-user/provider and load checks, and a profile metadata read-grant review. Current profile table grants still permit reading avatar object references for publicly visible makers; buckets remain private, but the references should be removed from direct browser reads in a separate hardening migration. Demo video remains deferred by the user's instruction.
