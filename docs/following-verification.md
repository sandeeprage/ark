# Following — 12 October 2026

Maker profiles now expose Follow/Unfollow, public follower/following counts, and paginated public connection lists. Following shows visible projects from currently followed active makers, newest first, with the existing category/stack/search filters, keyset pagination, deduplication, and refresh behavior.

Writes derive the actor from the authenticated session. The database requires an active onboarded account, rejects self-following, serializes account locks in a stable order, and rate-limits changed relationships to 30 per minute. Explicit desired states make retries idempotent. Suspended makers and followers disappear from public lists/counts; an active user can remove an existing follow to an unavailable maker.

Follow notifications are atomic, recipient-private, preference-aware, and deduplicated across retries/refollows. Unfollow withdraws and marks the original event read; refollow retains its read state. Following existing makers does not send retrospective launch notifications. The notification center and preference editor remain a later slice.

Verification: type checking, lint, 55 unit tests, production build, existing auth/discovery/publishing browser regression checks, four new desktop/mobile following browser checks, database regression checks, and parallel/reciprocal follow tests passed. Test users and projects exist only in disposable local fixtures. No synthetic production users or relationships were created.

Migration `202610120008_following.sql` extends the project reader and adds the authorized follow transaction and public connection readers. Apply it before deploying the application change. Dashboard-applied migrations require CLI history repair before adopting `supabase db push`.
