# Home and authentication UI

2026-10-24 · Feature branch `feat/auth-ui`. Scope approved by Victor Oyeleke after the read-only design/API review. Decisions DM37–DM40 supplement DM32–DM36; Codex logs implementation choices separately from human approvals.

## Reference and visual acceptance

All 16 PNGs were inspected during implementation. Victor subsequently placed the design inputs under `web/Screens/` (token sheet plus `login/` frames), replacing the earlier local `web/Stockwise — Login-png/` location. DM45 now ignores/untracks these references while preserving local files. They are not application backgrounds or runtime assets. Desktop Home is 1440×900 at 1×; desktop auth/interactive frames are 2880×1800, treated as 1440×900 at 2×. Mobile frames are 720×1760, treated as 360×880 at 2×. Intermediate widths interpolate responsively. A white strip at the export edge is not page artwork.

DM43 preserves Victor's supplied refinements for publication: remove headline-ending periods and the Home description, move the desktop coin offset from 350px to 320px, and retain expanded CSS formatting. The existing mobile rule hides the headline, so mobile Home now has no supporting copy. This consequence is noted for visual review; publication does not silently override his changes.

Reference screens take precedence for composition: stacked solid/outlined wordmark, home header, desktop coin, blurred modal backdrop, mobile stacked demo controls. General token notes remain authoritative for colors, fonts, focus and targets. Desktop Home's measured headline is 48px; the token-sheet 58px headline describes another composition, so the Home frame governs its geometry. Auth input/button height is 48px, minimum hit areas 44px, control radius 10px, card radius 16px. Supplied fonts are self-hosted from pinned Fontsource packages (Inter Tight, Syne 800, Instrument Serif italic, JetBrains Mono).

The coin is a reconstructed SVG, stored in `assets/images/` and imported via its named-export index. It is not the original source artwork; exact artwork equivalence cannot be claimed. CSS supplies pointer tilt and a nine-second sway; reduced motion stops both, and mobile hides it. There is no generated raster substitute or runtime dependency on reference screenshots. Wordmark text uses Syne inside responsive SVG for controlled reference proportions and accessible Stockwise text.

## Shared component provenance

Copy-in source: [interface-eng-shared-components](https://github.com/spr-tech/interface-eng-shared-components), revision `d15361177dff8b67a4ad71ed287321adb3d7fe71`. Button, Input, FormField, Dialog, Toast and cn are copied with ownership comments retained. No runtime GitHub dependency. The agreement covers four interface engineers, confirmed and approved by Victor Oyeleke on 2026-10-25 (DM53; logged by Codex). The later read-only review used revision `dbe1cac1f5e6e0838331e35b8da482ab4a1497fc`; [shared-source clarifications](shared-component-alignment.md) record Card and Select/Checkbox behavior without claiming those components were copied into Stockwise.

Local additive extensions: Dialog exposes styling slots and close-focus restoration; Button accepts a visible loadingLabel. FormField's decorative text exclamation is replaced by the reference-style SVG icon, keeping the error message and ARIA associations intact. Existing defaults and Radix keyboard/focus handling remain. Stockwise sets the shared token names, adds the missing --radius alias, and maps the unused Toast success role to supplied lime. Hover values are lighter derived variants, not additional brand colors. Formik/Yup uses native Input handlers and FormField ARIA wiring; React Hook Form is not installed. Loading uses one status union, blocks duplicate form submission, and shows visible text plus spinner. Pending demo controls remain visibly unchanged as in the references while disabled to block competing requests.

## Routes and data

DM42 local development update: run `npm run mock` with the web dev server. The pinned Prism launcher derives an ignored example-only contract copy without changing OpenAPI, ensuring a fixed OWNER response and future expiry. Local `.env.local` uses the public mock inputs from `.env.example`. These are simulated inputs, not backend seeds; other role buttons still receive the OWNER fixture. See auth-contract-proposal.md and web/README.md for switching to real authentication. `npm run check:mock` verifies actual browser integration and canonical computed styles without request interception.

Dependency note for this development tool: Prism 5.16.0 brings eight transitive audit advisories (seven high, one moderate in the final audit). Compatible `npm audit fix` did not resolve them. They are development-only; `npm audit --omit=dev` reports zero vulnerabilities. No forced major overrides or unverified downgrade was applied. The mock binds only 127.0.0.1 and reads this repository's trusted contract; it is not included in the browser build or intended for public hosting.

React Router Data Mode: `/` Home, `/sign-in` and `/sign-up` nested overlays; closing returns Home, switching replaces the modal route. Deep links render the same backdrop. Escape/backdrop/Close dismiss and abort the pending login. Route teardown clears timers and ignores stale results. Password visibility is a local toggle. Loading's visual password label is hidden as in the reference while retaining its accessible label.

Axios feeds one RTK Query service; models alias generated contract types. Per-resource files reference endpoint definitions. No invented registration, dashboard or logout call. `/workspace` is a minimal authenticated welcome/handoff, not a fabricated dashboard; its loader fetches `/me` on navigation/refresh and redirects 401 to sign-in. Transport failures show a retry page. Future feature routes replace this handoff as implemented.

Implementation default: an expiry-checked sessionStorage session lasts in its browser tab only, with memory fallback if storage is blocked. No password is persisted. Logout clears the session and query cache. This is an explicit implementation choice, not a server revocation promise or cross-tab session guarantee. Token storage can be revisited with the API owner if cookie-backed sessions are introduced.

State behavior: blank fields are initial/empty; Yup errors are inline; submit shows loading; pending after three seconds adds waking notice and an indeterminate bar; 401 gives generic credentials copy, network/timeout gives retry copy. Both error variants work at both viewport sizes. Success follows the actual 201 and protected `/me` handoff. Registration validates locally then explicitly reports unavailable, with no network write.

## Checks

Run `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`, `npm run lint:contract`, and `npx playwright test` in web. Playwright uses 1440×900 and 360×880 at 2× with reduced motion, captures Home and every auth state, checks keyboard dismissal/focus restoration, requests/headers, guarded navigation, retries and registration's lack of unapproved calls. Axe must have zero serious/critical violations. Pixel comparison is a review aid; do not label a newly captured screenshot as an approved baseline.

Actual output and remaining visual/integration limits are logged in sdlc/WORKLOG.md after verification.
