# ARK deployment

- Private source repository: https://github.com/sandeeprage/ark
- Vercel project: `sandeeprages-projects/ark`
- Production origin: https://ark-rage.vercel.app
- Runtime: Node.js 22, Next.js 16.4

Production environment variables are managed in Vercel. `SUPABASE_SECRET_KEY` and `CRON_SECRET` are server-only secrets; never commit environment files or put those keys in `NEXT_PUBLIC_` variables. Preview environment variables have not been configured.

The application uses the existing Supabase project. Its migrations were applied using the SQL editor; register migration history before using `supabase db push`, as described in the build status.

## Authentication

Supabase Auth must use `https://ark-rage.vercel.app` as its Site URL and allow the exact redirect `https://ark-rage.vercel.app/auth/callback`. Retain local callback URLs for development. The GitHub OAuth application's callback remains the Supabase `/auth/v1/callback` URL; it does not change to the Vercel origin.

## Deploying updates

The private `sandeeprage/ark` repository is connected to Vercel. Push changes to `main` to trigger a production deployment. For a manual deployment from the linked directory:

```sh
npx vercel deploy --prod
```

Run application and database checks before deploying. GitHub Actions runs both test jobs on pushes.

## Media maintenance

The committed `vercel.json` invokes `/api/maintenance/media` daily at 03:00 UTC (08:30 Asia/Calcutta). Vercel supplies the configured `CRON_SECRET` as a bearer authorization header. Unauthenticated calls must return 403. Each invocation processes at most ten durable jobs; inspect failures and backlog before an invited beta. Preview deployments do not run production cron jobs.

An authenticated manual invocation can permanently remove expired or retired screenshot objects. The deployment smoke test checks the unauthenticated boundary without triggering cleanup. A successful schedule configuration does not prove the first scheduled run succeeded; check Vercel's cron logs after it runs.
