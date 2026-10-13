# Production performance and maintenance — 13 October 2026

## Measured baseline

Lighthouse CLI measured the live anonymous site in isolated headless Chrome with mobile simulated throttling. These are lab samples, not real-user percentiles or proof of INP. No existing browser session or private page was used. Full local reports are ignored because they include temporary signed media URLs; only sanitized summaries should be committed.

| Page           | Performance | Automated accessibility | LCP   | CLS | TBT    |
| -------------- | ----------- | ----------------------- | ----- | --- | ------ |
| Homepage       | 98          | 100                     | 2.1 s | 0   | 130 ms |
| Explore, run 1 | 87          | 100                     | 3.7 s | 0   | 130 ms |
| Explore, run 2 | 87          | 100                     | 3.6 s | 0   | 160 ms |

The Explore LCP element was the first project cover. The trace measured a 2.66-second delay before its resource request; the image was lazy-loaded. Vercel functions ran in `iad1` (Washington), while Supabase is in Tokyo. Source reads and media signing depend on that backend.

## Changes

- The first feed cover loads eagerly with high fetch priority. Remaining covers stay lazy-loaded, including appended pages.
- Function region is configured as `hnd1`, alongside Supabase, following [Vercel's guidance](https://vercel.com/docs/functions/configuring-functions/region). Static assets remain on the CDN.
- Responsive covers now use a visibility-checked same-origin thumbnail route at ten bounded widths, up to 1280 pixels. It reads only an authorized public cover, downloads privately, strips metadata and resizes without enlargement. Responses are `private, no-store`; gallery originals remain on short-lived signed URLs. Cover metadata no longer waits for signing, and storage paths are not sent to the feed. Shared image caching was not introduced.
- Cleanup prioritizes up to five account-erasure jobs, then up to ten media jobs. It claims individually, stops admitting jobs at 35 seconds, cancels work at 45 seconds, and reserves a separate bounded client to record failures. Unstarted jobs remain unleased.
- Workers catch transport exceptions and record retryable failures. Media lists are preflighted, including bucket validation, before any removal. Storage removals use batches of at most 100 paths. Auth deletion still follows successful owned-media removal.
- Failed or budget-deferred runs return HTTP 503. Aggregate `maintenance_finished` logs contain counts and duration, without user identifiers, storage paths, or tokens. Counts describe this bounded run, not proof that the entire queue is empty.

## Verification and operations

118 unit assertions passed across the full suite and the additional cover fast-path assertion, including limits, exhausted budgets, unknown buckets, batching, exceptions, real thumbnail resizing, metadata stripping, and visibility revalidation. Type checking, lint, production build, and six desktop/mobile publishing/discovery scenarios passed, with both publishing workflows rerun after responsive-image delivery. The workflow checks eager/high-priority loading, responsive sources, and actual decoding of the first cover.

The first deployed region/priority changes reduced Explore LCP to 3.4 and 3.3 seconds in two runs. Performance scores were 84 and 88 because blocking time varied to 270 and 240 ms; this is not evidence of a uniformly improved overall score. Responsive thumbnail delivery is measured separately after its deployment.

The production cron is enabled for 03:00 UTC (08:30 Asia/Calcutta). Aggregate-only queue inspection found two pending media jobs, one eligible at inspection. Earliest eligibility was 13 October at 12:14 UTC (17:44 Asia/Calcutta), after that day's schedule, explaining the absence of completion. No real cleanup or account deletion was manually invoked.

After the next scheduled run, inspect `maintenance_finished`, response status, failed leases, and remaining due jobs. Investigate repeated failed/deferred responses. No external alert destination is configured. Higher beta volume needs more frequent scheduling or a queue service with reviewed plan/cost implications.

Production remeasurement follows deployment. Manual screen-reader testing, real-provider identity isolation, independent backup restore rehearsal, and a successful managed cleanup execution remain launch gates. [Web Vitals guidance](https://web.dev/articles/vitals) distinguishes lab from field data; automated accessibility scores are not conformance certification.

Reproduce with `npx lighthouse https://ark-rage.vercel.app/explore --chrome-flags="--headless" --only-categories=performance,accessibility --output=json --output=html --output-path=.vercel/performance-explore`. Set `CHROME_PATH` to installed Chrome if necessary. `node scripts/summarize-lighthouse.mjs <report.json> ...` exports only safe metrics.
