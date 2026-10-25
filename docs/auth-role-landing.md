# Role landing after sign-in

2026-10-25. Branch `feat/auth-role-landing`. Scope decided and approved by Victor Oyeleke; technical choices/logged by Codex. Decisions DM60-DM61 supersede DM40's temporary welcome screen only. Victor withdrew the earlier immediate-demo-login selection and explicitly retained credential filling plus a separate Sign in action before authorizing implementation.

| Verified account role | Default landing |
|---|---|
| OWNER | Products, `/app/products` |
| ASSISTANT | New sale, `/app/sell` |
| ADMIN | Sales History, `/app/sales` |

Demo buttons still fill public configured credentials and focus the password field. They do not submit, choose an authorization role, navigate or save a password. Explicit Sign in calls the unchanged POST /auth/sessions. Successful login clears the previous account's query cache and saves the session, then enters `/app`. Its Data Mode loader resolves a fresh GET /me, checks the account identity/role and synchronizes that verified user before redirecting. Destination permissions remain enforced by the service and existing feature guards.

Known internal return destinations retain their query/hash where permitted. OWNER/ASSISTANT may resume Sell; only OWNER may resume Add product. ADMIN defaults to Sales History if a stale link tries to resume Sell; other explicit feature navigation retains the existing read-only views. Absolute/protocol-relative URLs, backslashes, control characters, normalized traversal and unknown routes use the role default. `/workspace` is a compatibility redirect only, with no welcome component. Anonymous legacy bookmarks lead to sign-in; transport errors use the existing retry error screen and 401 clears the session.

The main in-memory development simulation maps the three configured demo emails to stable distinct users. Each login issues a separate expiring token; GET /me and permissions resolve the token's user, never a process-wide last-selected role. Simulated sale replay keys are scoped to that user so multiple accounts cannot receive each other's replay result. `--role=OWNER|ASSISTANT|ADMIN` remains an explicit fixed-role test override. This simulation still accepts valid-shaped demonstration passwords and is not production authentication or database concurrency evidence. Contract-only Prism remains a static fixture with its previous limitations.

No contract path, request field, generated type, database rule or migration changes. No new dashboard, analytics request, role selector in LoginRequest or artwork is introduced. The existing login reference layout and shared primitives remain unchanged. The old welcome-route expectations and standalone smoke steps are updated to the newly approved workflow; original error/loading/duplicate-submit/refresh/logout checks remain in place. Mobile logout now opens the existing shop menu before selecting Sign out, because the retired flat welcome screen is no longer the destination. This is an approved workflow change on a feature branch, not a test relaxation to conceal a bug.

Ten pre-existing user edits were snapshotted in ignored `web/.mock/auth-role-input/`. Eight unrelated files must remain byte-for-byte unchanged from those inputs. Router and shop-loader changes preserve supplied formatting in the working tree; only owned semantic deltas are staged for the feature commit, leaving pre-existing edits uncommitted. Verification is against the combined current working tree, with that limitation recorded. No user-owned preview is stopped. Publication remains a separate request.

## Verification

- Lint and strict typecheck passed. Unit tests: 10 files / 27 passed (41.10s), including four pure role/return-policy cases. Contract lint valid (210ms).
- Full desktop/mobile Playwright regression: 86/86 passed in one uninterrupted run (6.8m), including the updated mobile logout path. Existing auth axe checks and product/customer/sale safety journeys passed; no serious/critical findings in the checked states. No manual screen-reader or pixel-perfect approval is claimed.
- Initial focused run was 23 passed / 1 failed (3.0m) because the old mobile logout step expected Workspace's flat layout. Updated the step to open and assert the existing shop menu before Sign out, preserving the protected-bookmark/logout assertions and the original timeout. No check was skipped/disabled/deleted.
- Actual check:roles passed without request interception: explicit sign-in/default landing/refresh/old bookmark for all three accounts, separate identity/token isolation after other logins, simulated permissions and per-user idempotency, and explicit CLI role override. Local demonstration only; no backend authentication/concurrency proof.
- Production build: 2299 modules, 24.64s. Existing main-chunk warning remains (555.65 kB/gzip 183.01 kB). Contract/generated schema, backend and migrations unchanged. Service verify cannot start: JAVA_HOME is not defined correctly.
- Ten user-modified files were preserved. Eight unrelated files match their starting snapshots byte-for-byte; router/shop-loader working and selectively staged versions match normalized TypeScript ASTs. Tests ran against the combined working tree, so they include the supplied unrelated changes. Only owned deltas are committed. No dependencies/design images were added; owned QA ports are released and user previews untouched.

Start/restart `npm run mock` to load the new per-account simulation code; existing Node mock processes do not reload automatically. Contract-only Prism still uses static examples and cannot demonstrate all three accounts.
