# ARK quality pass — 13 October 2026

This pass completes public collections and the private notification center, and fixes verified recovery defects. It does not claim a flawless application or completion of the public-beta launch gates.

## Completed

- Public collection creation/editing/deletion, stable public URLs, default Saved on first save, multiple memberships, visible saved state, and explicit public disclosure before saving. Database transactions enforce ownership, active/onboarded accounts, quotas, rate limits, retry-safe creation, and unique memberships. Default Saved is retained and cannot be renamed or deleted.
- Recipient-private notification pagination, unread totals, individual/mark-all reading with a cutoff, preferences, and visible-tab polling/focus refresh. Unavailable actor/project details are replaced with neutral messages; withdrawn events disappear. New events after the mark-all cutoff remain unread.
- Temporary profile/account-state read failures produce retryable errors instead of onboarding/suspension notices. Authentication service outages are distinguished from anonymous sessions. Local sign-out clears this browser’s auth cookies even when the provider is unavailable.
- Publishing works when browser storage is blocked. Tab caching is optional and cannot turn a successful save into an error.
- Owners can see their hidden project’s screenshots through an authorized owner read, edit it without restoring public visibility, and stay in the editor after saving. No public reader signs hidden screenshots. Private object paths are omitted from returned form data.
- Screenshot dialogs restore keyboard focus to their opener. Feed media/vote/save reads run in parallel. Following sort is scoped to its authenticated route/API.
- Failed media cleanup returns a retryable HTTP failure so operational monitoring can detect it.

## Verification

64 unit checks; 30 desktop/mobile publishing/auth/discovery/following/social checks; 8 foundation browser checks; 147 database checks; concurrent vote/follow/collection tests; type checks, lint, and production build. Fixtures are confined to disposable localhost services and PostgreSQL. No synthetic content or social activity was inserted into production.

Migrations 009–010 add collections, their protected writes/public readers, and recipient-only notification/preferences functions. They must precede the compatible application deployment. Dashboard application does not register Supabase CLI migration history.

## Remaining launch gates

Google OAuth configuration and real-provider tests; identity linking/disconnection; personal repository ownership verification; reporting/admin moderation; account erasure; database-plus-media restore drills; scheduled cleanup verification; full accessibility, performance/load measurements, and staging/production separation. The beta remains internal until those gates are complete. OAuth owner branding also requires an ARK GitHub organization, and hiding the Supabase callback hostname requires a custom authentication domain.
