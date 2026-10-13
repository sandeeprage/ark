# ARK audit against Checklist Design

Reviewed 13 October 2026 at source revision `6d3f680` and on https://ark-rage.vercel.app.

Reference: [Checklist Design — Web app](https://www.checklist.design/web-app), using the site's [official MIT-licensed reference bundle](https://github.com/Checklist-Design/skills). Checklist Design's audit skill was used for the review. Its checklist item names are retained below; the explanations describe ARK specifically.

## What was checked

The live landing page, Explore, onboarding, Momentstamp project detail, @sndp public profile, mobile maker directory/footer, and a search with no matches were inspected in the browser. Mobile inspection used a 360 × 800 viewport, then the viewport override was reset. Screenshots, accessibility trees, image load state, layout width, and available browser errors were inspected. No production content, accounts, preferences, or social activity were modified.

The current production browser session is authenticated but has not chosen an ARK username. The homepage correctly says **Complete profile** for that session. It is different from the existing @sndp public profile; this observation does not establish a lost-session bug. No new real GitHub or Google consent flow was performed during this audit.

Authenticated Settings, notifications, collection management, and publishing were checked in source and through existing isolated workflow tests. Their detailed visual appearance was not captured in this production session. Source evidence for a control is distinguished from live visual verification below.

Verification completed:

- Type checking and ESLint passed.
- All 93 unit tests passed.
- All 36 isolated desktop/mobile auth, publishing, discovery, following, repository, collection, and notification workflow tests passed.
- All 10 desktop/mobile foundation browser tests passed, covering landing/navigation, filters, private-route gates, search, dark mode, and the keyboard skip link.
- Live landing and Explore had no horizontal overflow at the inspected mobile size. The inspected project screenshot finished loading successfully. No browser console errors were reported on the inspected search page.

The initial unit run was blocked by sandbox file permissions, and the initial browser run could not locate Playwright's bundled browser. Successful reruns used execution outside the sandbox and installed Chrome. These were test-environment failures, not application assertion failures.

This is a design and interaction audit, supplemented by regression tests. It does not certify full WCAG conformance, real provider callbacks, database restore, performance/load, or production operational monitoring. Those require their own verification.

## Priorities

| Priority              | Finding                                                                                                                                   | Evidence and next change                                                                                                                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before public rollout | Users cannot delete/deactivate their account.                                                                                             | Settings explicitly defers account erasure. Implement the authorized account lifecycle, recent-authentication check, consequence summary, and confirmation.                                                                                                          |
| Before public rollout | Account identity management is incomplete.                                                                                                | Settings only reads the GitHub connection. Google identities are not listed, and there is no link/disconnect flow. Show actual connected identities and protect the final usable sign-in identity.                                                                   |
| Before public rollout | Footer and login lack privacy/terms/support destinations.                                                                                 | The footer has discovery links only; there are no corresponding public routes. Prepare accurate content and a real support destination before adding links.                                                                                                          |
| Before public rollout | Accessibility checks are incomplete and there are concrete gaps.                                                                          | Light-theme `--subtle: #858585` has 3.69:1 contrast on white and 3.44:1 on `#f7f7f7`. Some form errors are not programmatically associated with fields; publishing failures do not focus the affected field or an error summary.                                     |
| Before public rollout | Reporting and moderation remain unfinished.                                                                                               | The product specification includes reports/admin moderation; the implementation status records them as deferred. These are launch gaps, not reasons to add unrelated dashboard features.                                                                             |
| Next product fix      | A supplied demo-video URL never appears on the public project detail.                                                                     | The form validates and saves `demo_video_url`, but the public project model/detail renderer has no corresponding display. Expose a safe external demo link through the public read contract and detail page.                                                         |
| Next product fix      | Save feedback is uneven.                                                                                                                  | Profile and notification preferences have success messages. Collection edits refresh without an explicit success message, and a normal visible-project edit navigates without a dedicated saved acknowledgement. Save actions remain available when nothing changed. |
| Next product fix      | Avatar support is incomplete.                                                                                                             | Profiles use initials; there is no imported/uploaded avatar field or editor in the current profile UI. Initials are a good fallback but do not fulfill the specified avatar feature.                                                                                 |
| Polish                | Feed cards have no launch date; search no-results suggestions are sparse; onboarding ends without an explicit completion acknowledgement. | These are smaller UX gaps described in the item tables.                                                                                                                                                                                                              |

## Catalogue coverage

Every Web app category was considered. Applicability follows ARK's current product scope, including the explicit exclusions in its specification. An unrelated checklist is not a requirement to build an unrelated feature.

| Category              | Coverage / applicability                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 2FA                   | Provider-managed OAuth; ARK does not collect passwords. A separate ARK 2FA setup UI is not needed for this release.               |
| Notification Settings | Audited below.                                                                                                                    |
| Account               | Audited below.                                                                                                                    |
| Help Center           | Basic help/support is missing; a searchable article hub is not justified yet. See the support gap and help table.                 |
| Billing               | Not applicable: no payments/subscriptions in this release.                                                                        |
| Settings              | Audited below.                                                                                                                    |
| User Management       | Administrative moderation is a specified but deferred launch feature. No admin user-management UI exists to visually audit.       |
| Single Item Detail    | Audited against project detail below.                                                                                             |
| Admin Panel           | Deferred launch gap; no screen exists to audit. A consumer workspace-admin/billing dashboard is not applicable.                   |
| Empty State           | Audited across feeds, search, profiles, and error variants below.                                                                 |
| Data Table            | Not applicable to the current card/list discovery UI. Future moderation tables should use this checklist.                         |
| Analytics             | Explicitly excluded from this release.                                                                                            |
| Onboarding            | Audited below.                                                                                                                    |
| Notifications         | Audited below.                                                                                                                    |
| Public Profile        | Audited below.                                                                                                                    |
| Timeline / Gantt View | Not applicable: ARK does not schedule/manage project tasks.                                                                       |
| Feed                  | Audited below.                                                                                                                    |
| Report View           | This means a data/reporting screen, not abuse reporting; ARK has no such screen.                                                  |
| API Keys              | No user-facing developer API/key management is offered. Server configuration keys are not a user-facing feature.                  |
| Search Results        | Audited below.                                                                                                                    |
| Integrations          | ARK has OAuth identities, not an integration catalogue. Account identity management is audited in Account instead.                |
| Audit Log             | Durable moderation audit is a deferred launch gate; no admin audit UI exists to inspect.                                          |
| Version History       | Project version numbers prevent edit conflicts; a user-facing history/restore feature is not in this release.                     |
| Comments              | Explicitly excluded.                                                                                                              |
| Multi-step form       | Publishing deliberately uses one page with five labelled sections, not a wizard. The form/save/upload checks below apply instead. |
| Dashboard             | No private metrics dashboard is specified; Explore and the public profile serve discovery/portfolio needs.                        |
| Kanban board          | Not applicable: no task-management feature.                                                                                       |
| Checkout              | Not applicable: no purchases.                                                                                                     |
| Chat                  | Direct messages are explicitly excluded.                                                                                          |
| Maintenance           | Error recovery exists, but dedicated scheduled-maintenance/status/support communication is missing. Audited below.                |
| Pricing               | Monetization is not defined for this release.                                                                                     |
| Login                 | Audited below with OAuth-specific alternatives recorded.                                                                          |

Legend: 🟢 present; 🟡 partially present; 🔴 missing and relevant; ⚪ not needed here; ❔ not fully verifiable from this audit's evidence. There is no aggregate design score: deliberate exclusions are not failures.

## Login — Web app

[Checklist](https://www.checklist.design/web-app/login). ARK intentionally uses GitHub/Google OAuth for both registration and returning sign-in.

| Status | Item                      | ARK finding                                                                                                                                                             |
| ------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚪     | Email and password fields | OAuth providers handle credential entry; ARK has no password login.                                                                                                     |
| ⚪     | Show/hide password toggle | No ARK password input exists.                                                                                                                                           |
| ⚪     | Forgot password           | Password recovery belongs to the chosen identity provider.                                                                                                              |
| ⚪     | Remember me               | Persistent Supabase sessions cover this need; callback cookies and reload persistence pass fixture tests.                                                               |
| 🟢     | SSO or social login       | GitHub and Google buttons, provider availability, pending states, and destination preservation are implemented and tested. Real provider consent was not repeated here. |
| 🟡     | Sign up link              | The same OAuth buttons create new accounts, but the page does not plainly say that first-time users can join through them.                                              |
| 🟢     | Error messages            | Cancelled consent, missing verifier, callback/profile failures, and temporary provider errors have actionable messages; fixture checks passed.                          |

## Settings — Web app

[Checklist](https://www.checklist.design/web-app/settings). Settings was examined in source and existing workflow tests; its production layout was not visually inspected in this session.

| Status | Item                                   | ARK finding                                                                                                                                         |
| ------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢     | Structure                              | Public profile, connected identity, notification preferences, and sign-out are separate sections.                                                   |
| 🟡     | Account details                        | Name, username, and bio are editable. Avatar editing and an account-level summary of the actual sign-in identities are absent.                      |
| ⚪     | Security details                       | Password and provider 2FA changes belong to GitHub/Google. Sensitive ARK identity/deletion changes still need their own recent-authentication flow. |
| 🟢     | Notification preferences               | Follows, upvotes, and launches can be selected independently; persistence is tested.                                                                |
| ⚪     | Billing                                | ARK has no billing in this release.                                                                                                                 |
| ⚪     | Additional preferences (if applicable) | Appearance follows the OS; language/timezone preference controls are not currently specified. Dates explicitly label IST where applicable.          |
| 🔴     | Danger zone                            | Account deletion/deactivation is unavailable despite being part of the specified settings scope.                                                    |

## Account — Web app

[Checklist](https://www.checklist.design/web-app/account).

| Status | Item                            | ARK finding                                                                                                                       |
| ------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 🟡     | Profile photo                   | Initials render correctly, but users cannot import/upload/change an avatar.                                                       |
| 🟢     | Display name                    | A clearly labelled public name and separate ARK username are available.                                                           |
| 🟡     | Account details                 | Public profile fields are covered; the private page does not identify the current Google login or summarize all linked providers. |
| 🟡     | Linked accounts (if applicable) | GitHub connection can be displayed, but linking/disconnecting is deferred and Google is not listed.                               |
| 🟡     | Save confirmation               | Profile save success is announced. Other editors lack consistent confirmation and do not disable unchanged saves.                 |
| 🔴     | Delete or deactivate account    | Users have no self-service exit flow.                                                                                             |

## Onboarding — Web app

[Checklist](https://www.checklist.design/web-app/onboarding). The current live session's one-page setup screen was inspected without submitting it.

| Status | Item                    | ARK finding                                                                                                                                                              |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ⚪     | Progress indicator      | Setup is one page rather than a sequence; a multi-step progress bar would imply nonexistent steps.                                                                       |
| 🟢     | Welcome message         | “Let’s meet the maker” explains profile setup and public visibility.                                                                                                     |
| 🟡     | Account setup           | Name and unique username are collected, bio is optional, and privacy is explained. Avatar import and the specified skippable GitHub connection after Google are missing. |
| ⚪     | Product highlights      | Landing and Explore already introduce the product; forcing a separate walkthrough is unnecessary for this small setup flow.                                              |
| 🟢     | First action prompt     | “Create my profile” is clear and the requested destination is retained.                                                                                                  |
| 🟡     | Completion confirmation | A successful save redirects to the preserved destination, but there is no explicit profile-created acknowledgement.                                                      |

## Feed — Web app

[Checklist](https://www.checklist.design/web-app/feed).

| Status | Item                          | ARK finding                                                                                                                                                            |
| ------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢     | Feed item preview             | Cover, name, and tagline identify each project; thumbnails loaded on the inspected live project.                                                                       |
| 🟢     | Author                        | Initials and maker username link to the public profile.                                                                                                                |
| 🔴     | Timestamps                    | Cards omit launch dates even though `published_at` is available; Latest ordering alone does not show how recent a launch is.                                           |
| 🟢     | Engagement actions            | Upvotes are reversible and own-project voting is prevented; sharing/saving are available on detail. Removing Save from feed cards follows the user's explicit request. |
| 🟢     | New content indicator         | Refresh is offered without inserting/reordering cards underneath readers. Own-vote changes establish a new baseline quietly; regression tests passed.                  |
| 🟢     | Filtering                     | Query/category/stack controls and visible active filters are implemented.                                                                                              |
| 🟢     | Pagination or infinite scroll | Load more appends deduplicated keyset results and preserves existing cards; tested.                                                                                    |
| 🟢     | Empty state                   | Explore and Following distinguish initial emptiness, filter no-results, and loading failures.                                                                          |

## Empty State — Web app

[Checklist](https://www.checklist.design/web-app/empty-state).

| Status | Item                            | ARK finding                                                                                                                                                        |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🟡     | Illustration or icon            | The shared component distinguishes search/error/empty icons. Search's per-section zero results use plain text instead of that component.                           |
| 🟡     | Clear heading                   | Explore/search headings name the absence clearly. A maker without projects instead gets the vague “Great work starts somewhere.”                                   |
| 🟢     | Supporting description          | Empty feeds, profiles, collections, and notification screens explain what belongs there.                                                                           |
| 🟡     | Primary action                  | Explore offers publish/reset and Following offers discovery. A zero-match Search has Clear filters above the results, but no contextual reset beside its messages. |
| 🟢     | Zero state vs. no-results state | Explore distinguishes an empty platform from a narrowed search; maker directory distinguishes initial emptiness from failed matches.                               |
| 🟢     | Error state variant             | Failed reads use separate error messages rather than presenting them as empty data; profile/account errors also have recovery states.                              |

## Search Results — Web app

[Checklist](https://www.checklist.design/web-app/search-results). A zero-match live search was inspected on mobile.

| Status | Item                   | ARK finding                                                                                                                                                                 |
| ------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢     | Search input           | The URL query is retained in the input and can be refined.                                                                                                                  |
| 🟡     | Result count           | Zero is displayed for projects and makers. Counts reflect the loaded/limited result set, not an exhaustive total; labels should make that distinction clear when paginated. |
| 🟢     | Result items           | Project previews and maker names/usernames/bios identify matches. Term highlighting would be optional polish.                                                               |
| 🟢     | Result type indicators | Separate Projects and Makers headings distinguish result types.                                                                                                             |
| 🟢     | Filters                | Category and technology filters narrow project results and remain visible.                                                                                                  |
| 🟡     | No results state       | It says no matches and offers Clear filters, but gives no concrete suggestion such as a shorter name, username, or broader category.                                        |
| ⚪     | Recent searches        | A private search history is unnecessary for the current small discovery catalogue and would introduce additional retention decisions.                                       |

## Public Profile — Web app

[Checklist](https://www.checklist.design/web-app/public-profile). The live @sndp profile was inspected.

| Status | Item                        | ARK finding                                                                                                                                                                                     |
| ------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟡     | Avatar and display name     | Name, username, and initials are prominent; a photo/avatar is unsupported.                                                                                                                      |
| ⚪     | Role or title               | ARK is a maker portfolio, not a workplace/team directory; a separate role field is unnecessary.                                                                                                 |
| 🟢     | Bio or description          | Optional bio and a fallback are present.                                                                                                                                                        |
| 🟢     | Activity or contributions   | Public projects, pins, totals, and public collections are surfaced; private notification/voter data is not shown.                                                                               |
| 🟢     | Contact or follow action    | Follow/unfollow and public follower lists are implemented; incomplete onboarding is clearly gated.                                                                                              |
| 🟢     | Joined date (optional)      | Joined month/year is displayed.                                                                                                                                                                 |
| ⚪     | Profile visibility controls | Portfolios are deliberately public and this is disclosed at setup. Editable bio supports omission; private portfolios are not in scope. Optional identity disconnection remains an Account gap. |

## Single Item Detail — Web app

[Checklist](https://www.checklist.design/web-app/single-item-detail). Momentstamp's public detail was inspected; owner controls were checked in source and isolated tests.

| Status | Item                             | ARK finding                                                                                                                                       |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢     | Clear title or identifier        | Project name, tagline, category, and maker are prominent.                                                                                         |
| 🟢     | Status indicator (if applicable) | Repository verification has a dated text label and explanation. Hidden-project editors explain their moderation state.                            |
| 🟡     | Key details section              | Description, screenshots, stack, launch date, and destinations are present. The entered demo-video URL never appears publicly.                    |
| 🟢     | Edit action                      | Owner-only editing is available and tested.                                                                                                       |
| ⚪     | Related items or activity        | A collaboration activity log is not appropriate for a single-maker launch. The maker link provides the relevant adjacent portfolio.               |
| 🟡     | Breadcrumb or back navigation    | Back to Explore works, but does not preserve Search/Following filters if the detail was opened from those contexts.                               |
| 🟢     | Destructive actions              | Owner deletion is separate from visitor actions, describes consequences, and requires typing the name. Tested only with isolated fixture content. |

## Notifications — Web app

[Checklist](https://www.checklist.design/web-app/notifications). Source and isolated desktop/mobile tests were used.

| Status | Item                    | ARK finding                                                                                          |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| 🟢     | Notification list       | Recipient-specific chronological entries are paginated.                                              |
| 🟢     | Read and unread states  | Unread labels/styles and a navigation badge distinguish unseen notifications.                        |
| 🟢     | Notification type       | The text says followed, upvoted, or launched, so meaning does not depend on an icon or colour.       |
| 🟡     | Timestamp               | Exact date/time and IST are clear; recent notifications could be easier to scan with relative times. |
| 🟢     | Actions (if applicable) | Maker/project links and individual mark-read controls are present.                                   |
| 🟢     | Mark all as read        | A cutoff protects new arrivals from being marked read by an older request; tested.                   |
| 🟢     | Empty state             | The caught-up message explains which updates will appear.                                            |

## Notification Settings — Web app

[Checklist](https://www.checklist.design/web-app/notification-settings).

| Status | Item               | ARK finding                                                                                                                            |
| ------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢     | Categories         | Follows, project upvotes, and followed-maker launches have independent controls.                                                       |
| ⚪     | Channel selection  | Only in-app notifications are in scope; email/push/SMS controls would offer unsupported channels.                                      |
| ⚪     | Frequency controls | There is no external delivery/digest to schedule.                                                                                      |
| 🟡     | Global mute        | All three types can be disabled manually; there is no convenient temporary global pause. This is optional polish for three categories. |
| 🟢     | Save confirmation  | Saving and saved/error feedback are present; persistence tests passed.                                                                 |

## Help Center — Web app

[Checklist](https://www.checklist.design/web-app/help-center). ARK has inline instructions and repository docs, but no user-facing help page. For the tiny beta, a concise getting-started/support page is sufficient; a large documentation platform is not required.

| Status | Item                         | ARK finding                                                                                                                                    |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚪     | Search with suggestions      | There is no large article catalogue needing search.                                                                                            |
| 🟡     | Content categories           | Instructions are scattered in onboarding/forms; a central basics/account/publishing guide would help users find them again.                    |
| ⚪     | Featured and popular content | An analytics-based popular-article list is unnecessary and behavioral analytics are excluded.                                                  |
| 🔴     | Article formatting           | There is no public getting-started/troubleshooting article; repository implementation reports are not user help.                               |
| 🔴     | Last updated date            | Public help content and its review date are absent. Add the date when the minimal guide is published.                                          |
| ⚪     | Helpfulness feedback         | Direct beta feedback through a real support destination can cover this without a voting system. That support destination is currently missing. |
| ⚪     | Related articles             | A short single guide does not need a related-article recommendation system.                                                                    |

## Maintenance — Web app

[Checklist](https://www.checklist.design/web-app/maintenance). This concerns communication during unavailability, not the existing background media-cleanup endpoint.

| Status | Item                    | ARK finding                                                                                                                                                   |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟡     | Clear status message    | Error boundaries explain failed loading and offer retry; planned maintenance is not distinguished from unexpected outages.                                    |
| ❔     | Estimated return time   | No maintenance event is active and no scheduled-maintenance template is present. An actual planned event would establish whether an estimate is communicated. |
| 🔴     | Status page link        | There is no user-facing independent status destination.                                                                                                       |
| 🔴     | Contact or support link | Error/maintenance recovery has no urgent support route.                                                                                                       |
| 🟡     | Brand consistency       | Existing error screens use ARK naming and colours, but there is no dedicated maintenance view to inspect.                                                     |

## Footer — Website

[Checklist](https://www.checklist.design/website/footer). Added because the footer was an explicit recent area of concern.

| Status | Item                                        | ARK finding                                                                                           |
| ------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 🟢     | Size and responsiveness                     | The footer is contained, wraps on mobile, and fits the inspected viewport.                            |
| 🟢     | Style                                       | Logo, grayscale palette, muted copy, and dividing rules match ARK.                                    |
| 🟢     | Content links                               | Discover, Makers, About, Share, and home destinations exist. Foundation navigation checks passed.     |
| 🔴     | Legal and compliance links                  | There are no privacy/terms destinations. The login page also lacks them.                              |
| 🟢     | Logo or name of business                    | ARK branding links home and includes a short purpose statement.                                       |
| 🟢     | Hierarchy and layout                        | Brand and navigation are separated from the smaller bottom row; mobile wraps into a readable stack.   |
| ⚪     | Social media                                | No official ARK social account has been supplied; do not invent one or substitute a personal account. |
| ⚪     | Mobile app download actions (if applicable) | There is no native mobile app.                                                                        |
| ⚪     | Regulatory and trust certifications         | No certifications have been established; badges would make unsupported claims.                        |
| ⚪     | Back to top button                          | Current pages are short and loaded incrementally; a special control is not necessary yet.             |
| 🔴     | Contact methods                             | No real support contact/form is available.                                                            |
| ⚪     | Partner logos                               | No partnerships have been established.                                                                |
| ⚪     | Accepted payment methods (if applicable)    | No purchases are supported.                                                                           |

## Accessibility — Design system

[Checklist](https://www.checklist.design/design-system/accessibility). This was a targeted source/rendered check, not a full assistive-technology certification.

| Status | Item                                     | ARK finding                                                                                                                                                                                                                          |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🟡     | Target conformance level                 | The product spec calls for accessibility hardening; a concrete documented contribution-level WCAG target/checklist is missing.                                                                                                       |
| 🟡     | Colour contrast standards                | Main text has strong contrast. Light-theme secondary `#858585` text is below 4.5:1 on canvas/surface; search placeholders and small labels use it. Dark secondary text uses a different token.                                       |
| 🟢     | Focus indicator design                   | Shared interactive controls have visible focus rules; username/search wrappers use focus-within. Skip-link focus passed browser tests.                                                                                               |
| 🟡     | Keyboard navigation patterns             | Native controls and Radix dialogs provide standard behavior; gallery focus restoration is tested. Publishing validation does not focus an error summary/first invalid field.                                                         |
| 🟡     | ARIA pattern library                     | Navigation/current states, live messages, pressed states, labelled dialogs, and some field associations exist. Many publishing errors lack `aria-describedby` and URL/select invalid states; profile bio error is also unassociated. |
| ❔     | Screen reader testing                    | No NVDA/VoiceOver session was performed. Source/AX inspection and automated browser tests cannot establish equivalent coverage.                                                                                                      |
| ⚪     | Accessibility annotations in design      | This code-first repository has no separate Figma design files to annotate. The same requirements should be recorded in component documentation.                                                                                      |
| 🔴     | Accessibility in contribution guidelines | There is no complete checked contribution standard covering contrast, error associations, keyboard focus, announcements, and manual screen-reader verification.                                                                      |

## Saving changes — Flows

[Checklist](https://www.checklist.design/flows/saving-changes). Applies to profile, preferences, collection editing, and project editing.

| Status | Item                                          | ARK finding                                                                                                                                    |
| ------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢     | Show action that enables change               | Fields are editable and have explicit save actions.                                                                                            |
| 🔴     | Disable save action until changes are made    | Profile/preferences/collection saves are disabled only during requests; unchanged forms can still be resubmitted.                              |
| 🟡     | State changes to active once a change is made | Project changes track dirty state for navigation protection, but save-button state is not consistently tied to changed values.                 |
| 🟡     | Action changes to loading state when pressed  | Profile/preferences/project buttons show pending text; collection editing disables fields but leaves its static save label.                    |
| 🟡     | Notify changes have been saved                | Profile/preferences/hidden-project edits announce success; collection and normal project editing do not provide equally explicit confirmation. |

## Showing input error — Flows

[Checklist](https://www.checklist.design/flows/showing-input-error). Native browser validation is supplemented with server/schema errors.

| Status | Item                                   | ARK finding                                                                                                                                                                  |
| ------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢     | Keep the input in default state        | Forms start without error messages.                                                                                                                                          |
| 🟢     | Allow user to enter information        | Typing is not interrupted by premature inline validation.                                                                                                                    |
| 🟡     | Signal error after loss of focus       | Most schema errors appear only after submission rather than blur. This is a valid alternative, but error association, visible invalid styling, and focus recovery need work. |
| 🟡     | Return to default state upon reattempt | Project field errors reset on the next submission; corrected fields can retain stale server messages until then. Profile feedback similarly remains after editing.           |

## Submitting a form — Flows

[Checklist](https://www.checklist.design/flows/submitting-a-form).

| Status | Item                                                | ARK finding                                                                                                                                          |
| ------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢     | Show button to submit                               | Clear create/save/publish actions follow the relevant inputs.                                                                                        |
| 🟡     | Show loading state after submission                 | Most forms show pending labels. Collection edit has disabled controls but no changing save label.                                                    |
| 🟡     | Show success message when it submits                | Profile/preferences and hidden-project edits show it; collection edits and normal project saves need a consistent acknowledgement.                   |
| 🟢     | If it doesn't, show an error message                | Inline alerts/errors handle failures, with tested retries and rollbacks.                                                                             |
| 🟡     | An error may occur because of the wrong information | Native constraints and schema/server checks reject invalid input, but publishing lacks comprehensive field/error associations and first-error focus. |

## Filtering items — Flows

[Checklist](https://www.checklist.design/flows/filtering-items).

| Status | Item                                     | ARK finding                                                                                                                       |
| ------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 🟢     | Show action near item collection         | Filter controls sit directly above results.                                                                                       |
| 🟢     | Show available filter options            | Category select and technology disclosure present available choices.                                                              |
| 🟢     | Consider different filter types          | Text, select, and multi-select checkboxes fit their respective inputs.                                                            |
| 🟢     | Show active filters clearly when applied | Selected query/category/stack tags are visible and URL state is preserved.                                                        |
| 🟡     | Provide easy filter removal              | Clear all exists; individual active chips cannot be removed directly. Controls can still be adjusted.                             |
| 🟡     | Show result count                        | Search shows even zero. Explore's zero result count is replaced by a tagline, and nonzero counts reflect the current loaded page. |
| 🟢     | Empty state                              | A narrowed Explore result offers reset; Search has no-match messages and a Clear filters escape.                                  |

## Uploading media — Flows

[Checklist](https://www.checklist.design/flows/uploading-media). Publishing is a single-page form, as explicitly specified. Source and isolated upload tests were used.

| Status | Item                            | ARK finding                                                                                                              |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 🟢     | Empty state                     | An upload placeholder explains drop and file-picker alternatives.                                                        |
| 🟡     | Drag and drop interaction       | Dropping is supported, but there is no dedicated drag-enter/leave visual state to show a valid drop target.              |
| 🟡     | Progress indicator              | Processing reports screenshot number and overall activity; it does not show each file's upload percentage/name.          |
| 🟢     | File restrictions & constraints | Count/type/size/dimension constraints are stated and checked. Server image validation strips metadata.                   |
| 🟡     | Outcome status                  | Ready marks and per-image failures exist; some failures need clearer recovery instructions.                              |
| 🟡     | Upload actions                  | Remove/reorder/cover selection and resubmission retry are available. An in-flight upload has no explicit cancel control. |
| 🟢     | Showing multiple uploaded files | Preview, alt description, cover choice, and order are visible per screenshot. Multi-image workflow tests passed.         |

## Verification limits and next implementation order

Implementation follow-up: [13 October changes and verification](checklist-design-implementation-2026-10-13.md). The tables above record the original audit, not the current implementation status. Demo video remains deferred by user instruction.

1. Correct demo-video display, inconsistent save feedback, field error associations/focus, and light-theme secondary contrast. These are concrete local defects or gaps with limited scope.
2. Finish account identity management, avatars, and account erasure against the existing product requirements, including authorization and data lifecycle tests.
3. Publish owner-approved privacy/terms content and a real support destination; add meaningful footer/login links only when those destinations exist.
4. Complete reporting/moderation and the independent launch gates already recorded in `docs/build-status.md`.
5. Add smaller improvements: feed dates, contextual no-results suggestions, explicit onboarding completion, and individual filter-chip removal.

Manual screen-reader checks, real OAuth provider/callback revalidation, outage/maintenance communication, and operational launch checks remain unverified by this audit. No application behavior or database schema was changed during the review.
