# Sign-in and callback fixes

The production GitHub flow was inspected in Chrome. A complete sign-in returned to Explore with the real `@sndp` profile. The in-app browser remained unauthenticated; browser cookie stores are separate, so sign-in must start and finish in the same browser.

The following fixes cover reproducible routing and recovery issues:

- Login moves from an alternate hostname to the configured canonical hostname before creating the PKCE verification cookie. Stale forms also move to canonical login before OAuth starts.
- Callback cookie updates are attached to the final redirect response. The session is re-saved without GitHub provider tokens.
- Callback failures distinguish cancellation, missing browser verification, expired flows, provider errors, and profile errors. Retry links preserve the intended internal destination.
- Encoded search query values are preserved while encoded redirect paths and external destinations remain rejected.
- Profile read errors fail explicitly, rather than sending an existing maker into onboarding. Partially issued sessions are cleared locally on failure; unrelated browser sessions are not signed out.
- Restricted accounts reach their access notice. Onboarding retains the intended destination if a session expires.
- Callback network requests are bounded. A pending provider request disables both sign-in buttons to reduce duplicate submissions.

Validation: 55 unit tests, 28 desktop/mobile browser workflows, type checking, and lint passed. The provider fixture performs a real SDK PKCE challenge/verifier exchange and checks the returned browser cookies. It does not create test accounts in production. Tests include alternate hosts, successful callbacks, session persistence, missing verifiers, cancellation, profile failures, onboarding, restricted accounts, and local sign-out.

Supabase documents the same-browser requirement in its [PKCE guide](https://supabase.com/docs/guides/auth/sessions/pkce-flow).
