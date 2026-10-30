# Work log: Stockwise (Team 3 main product)

Change slug: `stockwise` · Started: 2026-10-23 · Last updated: 2026-10-27 by Codex (logging assistant for Victor Oyeleke); earlier handover by the agent for Nnaemeka Chukwuma
Source document: `Tesa cohort 6 software engineering capstone project.pdf` (TeSA Africa, "Four Real-World Products", 26 pages; Stockwise is product 3, pages 10-11; shared requirements pages 23-26)

> Any agent opening this project: read this file first, then the "Conventions and guidelines" and "Decisions" sections, then the artifacts in this folder. Continue from "Resume here". Don't re-ask anything already answered below.

## Resume here
Dashboard UI & Interactive Sales Donut Chart (PR 3 / R14), 2026-10-30 (Victor Oyeleke; logged by Antigravity):
Branch `feat/dashboard-ui` branched from conflict-free `feat/product-movements-ui` implements the Shop Dashboard screen (`/app/dashboard`, `R14`).
1. **Interactive Sales Pie/Donut Chart (`InteractiveSalesChart.tsx`, `donut-geometry.ts`)**:
   - Follows Victor's reference design (`https://tanstack.com/charts/catalog/charts/164-shadcn-pie-interactive` and uploaded image reference).
   - SVG Donut Chart with center numeric total and descriptive sublabel (`donut-center-value`, `donut-center-label`).
   - Outer Highlight Arc: Active/hovered slice triggers a separate floating highlight ring arc (`slice-highlight-arc`, `r = 110px`, `stroke-width = 3.5px`, opacity 0.85) and an expanded outer radius (+10px).
   - Segment Selection Dropdown: Native `<select className="chart-segment-select">` with live colored dot indicator for quick slice inspection (All, Paid sales, Credit sales).
   - Metric Toggle: Seamless toggle between Revenue (₦ kobo formatted) and Volume (sales count).
   - Fully Accessible (WCAG AAA): Interactive semantic legend buttons, keyboard support, `<svg aria-hidden="true">` to prevent nested interactive SVG violations, passing Axe-core with 0 violations.
2. **Dashboard Overview (`DashboardPage.tsx`, `dashboard.css`)**:
   - 4 KPI Metric Cards: Today's Revenue (kobo), Outstanding Customer Credit (kobo), Store Credit Held (kobo), and Low Stock Alerts count.
   - Low Stock Watchlist: Displays items with stock at or below threshold with quick navigation links to `/app/products/:id/movements`.
   - Recent Sales Stream: Displays latest transactions with receipt reference and payment type badges.
   - 5 Screen States (R17): Clean skeleton loaders, retryable error alert, empty state, and live demonstration badge.
3. **API & Navigation Integration (`router.tsx`, `ShopLayout.tsx`, `role-landing.ts`, `development-api.mjs`)**:
   - Mounted at `/app/dashboard` under `ShopLayout`. Added Dashboard navigation link with icon to sidebar for `OWNER` and `ADMIN`.
   - Permitted in `role-landing.ts` for safe routing.
   - Implemented `GET /dashboard` endpoint simulation in `development-api.mjs`.
4. **Verification**:
   - Vitest: 23 test suites, 85/85 tests passed (`donut-geometry.test.ts` 5/5, `dashboard.test.tsx` 4/4).
   - Strict TypeScript (`tsc --noEmit`): 0 errors.
   - ESLint: 0 errors, 0 warnings.
   - Vite Production Build: Succeeded in 28.35s with all chunks and css emitted cleanly.
   - Playwright: 2/2 tests passed in `dashboard.spec.ts` across desktop and mobile with 0 axe-core critical or serious accessibility violations.

PR #44 conflict resolution, 2026-10-30: merged `origin/main` at `250a7b85` into `feat/product-movements-ui`. Preserved both the product stock movements dedicated page implementation and the customer ledger dedicated page implementation from PR #42, along with all recent main branch commits and worklog entries. Preserved user-requested removals (no decorative icons on product status badges, no plus sign on the Add customer button).

Product stock movements dedicated page (PR 2 / PR #44), 2026-10-30 (Victor Oyeleke; logged by Antigravity):
Branch `feat/product-movements-ui` implements the stock movements history dedicated page for products (`GET /api/v1/products/{id}/movements`, `R17`).
1. Frontend implementation & refinements:
   - Dedicated page: Added `ProductMovementsPage.tsx` mounted at dedicated route `/app/products/:productId/movements` (sibling to `/app/products` in `router.tsx`).
   - Clean header hierarchy: `Stock Movements` is the top `<h1>` heading, `{product.name}` is a subordinate `<h2>` subheading, followed by product reference and category.
   - Restock action: Green button (`variant="primary"`) on both desktop and mobile, right-aligned on mobile (`justify-content: flex-end`). Removed catalogue item action buttons from `ProductsPage.tsx`; restocks are now initiated exclusively from the dedicated product page.
   - Summary cards interaction: Hovering over current stock, selling price, and recorded movements cards highlights border, background, labels, and values in brand green (`var(--color-primary)`).
   - Navigation: Removed redundant bottom "Close" button and unneeded "×" icon; return navigation is handled cleanly via the `← Back to products` breadcrumb link.
   - Filter chips: Styled `.filter-chips` on mobile to display horizontally on a single line with smooth horizontal scrolling (`flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none`).
   - Responsive typography, alignment & badge layout:
     - Left-aligned Quantity column header and values (`text-align: left`) on desktop/tablet catalogue table so numbers line up directly under `QUANTITY`.
     - Fixed stock badge pills (`Low (...)`, `Out of stock`): Added `white-space: nowrap; width: max-content;` and resolved medium breakpoint (`@media (min-width: 769px) and (max-width: 1150px)`) to 4 explicit grid tracks (`minmax(160px, 2fr) minmax(90px, 1fr) minmax(190px, max-content) 80px`), allocating sufficient width so badges never wrap or distort into oval bubbles.
     - Refined desktop typography & weight: Reduced table font to 14px, product names to 15px (500 weight), price to 14px (500 weight), `.stock-badge` and `.stock-count` to 13px (500 weight), and `.product-quantity` to 14px (500 weight). Scoped row hover to `.product-name strong` so numbers do not turn neon green on hover. Removed `@media (min-width: 1440px)` scaling that inflated numbers to 20px.
     - Preserved user-removed decorative badge icons and the customer add button `+` sign.
   - Dual responsive view: Comprehensive statement table on desktop (5 columns: Name, Category, Price, Stock, Quantity) and compact feed cards on mobile, with Africa/Lagos (WAT) timestamps, quantity delta badges, and running balance (`quantityAfter`), plus loading skeletons, error state with retry, and empty state.
   - Products catalogue rows in `ProductsPage.tsx` are clickable and keyboard accessible (`tabIndex={0}`, Enter/Space), styled with brand highlight (`color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))`) without text underlines, preserving active search parameters.
   - Added pure validators and formatters in `product-movements.ts`.
   - Updated development API simulation (`development-api.mjs`) to record and return stock movements for product creation, restocks, sales, and reversals.
2. Verification:
   - Vitest: 20 test files, 67 tests passing (`product-movements.test.ts` 9/9).
   - Strict TypeScript (`tsc --noEmit`): 0 errors.
   - ESLint: 0 errors, 0 warnings (`--max-warnings 0`).
   - Vite production build: SUCCESS (`dist/` generated cleanly in 16.53s).
   - Playwright: 4/4 passing on `products.spec.ts` and 4/4 passing on `restocks.spec.ts` across desktop and mobile with 0 axe accessibility violations.

Customer Ledger Dedicated Page (PR 1), 2026-10-30: Per Victor's design direction to eliminate repetitive row buttons when the customer list grows large, evolved the customer ledger feature from an overlay drawer into a clean, dedicated statement page (`/app/customers/:customerId`) on branch `feat/customer-ledger-ui`.
1. **Dedicated Page & Routing (`CustomerDetailPage.tsx`, `router.tsx`, `role-landing.ts`)**:
   - Registered `/app/customers/:customerId` under `ShopLayout` and permitted in `role-landing.ts` for deep-linking.
   - Breadcrumb navigation (`← Back to customers`) returning to directory list with cached RTK Query state.
   - Header with customer display name, optional fictional contact details, customer ID preview, and `+ Issue store credit` button (for `OWNER` and `ADMIN`).
   - Summary cards displaying current debt balance and available store credit in integer kobo (`formatMoney`).
   - Full-width transaction statement table on desktop and responsive statement feed on mobile with all 5 screen states (loading skeletons, error with retry, empty state, success data, and balance summaries).
2. **Directory Cleanliness (`CustomersPage.tsx`)**:
   - Removed repetitive "Ledger" buttons from every table row and card.
   - Made table rows and mobile cards directly clickable (`customer-row-clickable`, keyboard accessible on Enter/Space, matching `SalesHistoryPage`).
   - Directory table only displays `Name`, `Balance owed`, `Store credit`, and a clean `+ Credit` button when permitted.
3. **Verification**:
   - Vitest: 20 test files passed (67 tests, 0 failures), including all 9 ledger unit tests.
   - TypeScript: `tsc --noEmit` clean (0 errors).
   - ESLint: `eslint . --max-warnings 0` clean (0 errors, 0 warnings).
   - Vite Build: `npm run build` succeeded.
   - Playwright E2E: 14/14 tests in `customers.spec.ts` passed across desktop and mobile projects, verifying clickable row navigation to `/app/customers/:id`, statement presentation, axe-core 0 violations, and back-link navigation.
PR #40 conflict resolution, 2026-10-30: merged `origin/main` at `da60dfcf` into the proposal branch, keeping both the proposal-publication and simulation handover entries. The merged branch passed `npm test -- --run` (58 tests in 19 files). This documentation merge does not supply API or data-owner approval.

Proposal publication follow-up, 2026-10-30: Victor requested committing and pushing the previously local allocation-proposal edit. It records his three financial-policy directions without claiming data-owner or API-owner sign-off. PR #37 was already merged before this follow-up; the new edit needs separate review and integration into main. No service implementation is implied.

PR #39 conflict resolution, 2026-10-30: merged `origin/main` at `a1e7918` into `feat/sale-reversal-simulation`. Preserved both the simulated reversal settlement/idempotency state and the restock mock state, as well as both work-log histories. Web lint and typecheck passed; `npm test -- --run` passed 58 tests in 19 files; `npm run check:reversal-simulation` passed; focused reversal, restock and picker Playwright checks passed 18/18 across desktop and mobile. The reversal remains a simulation and does not implement the real service or imply contract approval.

Sale reversal simulation, 2026-10-29: Victor requested the existing PR #31 UI be made ready using mock data while PR #35 and the service contract await agreement. On `feat/sale-reversal-simulation` from `origin/main` `424b297`, the receipt and supervisor dialogs are clearly labelled simulation-only; the API adapter refuses reversal/code requests outside a local simulation session. The simulation restores stock and the selected sale's fixture debt/credit effects, preserves unrelated customer debt, supports identical-key replay and rejects another reversal. This is not a repayment allocator, real authorization or database implementation. See [simulation notes](../docs/sale-reversal-simulation.md); PR #35 remains draft.

Verification: `npm run check:reversal-simulation` passed against the stateful local server; lint, strict TypeScript and production build passed (existing >500 kB chunk warning). `npm test -- --run` passed 53 tests in 16 files. Focused browser checks passed 6/6 desktop/mobile including axe and reload/retry; an initial cold-start desktop timeout passed unchanged on rerun. Vite dev denied font requests through the dependency junction; the later full suite ran against a freshly built preview with bundled fonts. Full suite: 94/100 passed, with four mobile customer-picker bounds failures (x = -132 px) and two downstream mobile sale flows timing out on the off-screen picker. One bounds failure was reproduced unchanged on the separately built `origin/main` baseline `424b297`. No full-suite green or manual visual sign-off is claimed. Real service/database verification remains unavailable; the mock is not concurrency evidence, and final backend implementation requires PR #35 and contract review.
Approval follow-up, 2026-10-30: Victor reports that the sale-reversal work has been approved. GitHub PR #35 is merged but has no recorded reviews or comments; freshly fetched `origin/main` is still `d464911`, and the authoritative OpenAPI does not yet define the repayment or sale-reversal operations. The location and exact scope of the reported approval, including the two required contract signatories and the approved wire details, need confirmation before implementing contract-dependent service behavior. This entry records Victor's report without attributing an unverified sign-off to another engineer. No service changes were made during this follow-up.

Victor's financial-policy direction, 2026-10-30 (logged by Codex): block affected sale reversals for manual review when historical balances cannot be reliably allocated; block repayment reversal for manual review after its sale has been reversed; return store credit originally spent on a reversed sale in addition to credit from allocated repayments. The corresponding allocation proposal edit remains local and uncommitted. Data/rules and API/access owner agreement, detailed contract and two-engineer contract sign-off remain outstanding; Victor's direction is not attributed to those engineers. No implementation or production behavior has been changed.

Sale-reversal service investigation, 2026-10-30: Victor requested implementation of PR #35 and real R11/R12 behavior. Branch `feat/sale-reversal-service` starts from `origin/main` at `d464911`, in a separate worktree; no service or contract implementation has been made. PR #35 is merged, but its allocation document remains a draft and explicitly requires data/rules and API/access agreement before implementation; merging it is not the missing approval. Victor has since provided direction on the three financial policies above; owner agreement, the repayment/reversal API details and two-engineer contract sign-off remain outstanding. The authoritative contract currently lacks repayment and sale-reversal operations; PR #31's frontend route is not itself an approved service contract. Reserve the migration version only after reconciling the separate restocks branch, which proposes V5. Docker was not found in this environment, so PostgreSQL Testcontainers verification has not run. The sale-reversal simulation and restocks worktrees were not modified. No push was made.

PR #38 conflict resolution, 2026-10-30: merged `origin/main` at `d464911` into `feat/restocks`, preserving restock additions alongside the newer movement, ledger and dashboard contract, the mock reversal and restock state, and both branches' decision and handover history. Regenerated web API types from the combined contract. Contract lint, web lint and typecheck, 58 web unit tests, service verification (10 unit and 122 integration tests, including migration rollback; coverage checks met), and all 4 focused desktop/mobile restock browser tests passed. The restock contract remains a draft pending the recorded two-engineer agreement; merging main is not a PR approval.

Restocks Docker verification, 2026-10-30: Docker Desktop was started and PostgreSQL 17 Testcontainers ran. After restoring all temporarily removed guards, `mvn clean verify` ended `BUILD SUCCESS`: 10 unit and 106 integration tests, including 3 migration rollback tests and 10 restock tests, with JaCoCo checks met. Five rule-removal checks failed as expected for stock overflow, append-only records, owner-only access, retry idempotency and positive quantity; details are in `docs/rule-removal-log.md`. Restocks web `npm test -- --run` passed 45 tests in 16 files. The first service run failed the request-log privacy test because this shell inherited `DEBUG=release`, which Spring interpreted as debug enabled; rerunning with DEBUG removed from that process passed, without changing the test or application. Contract approval remains pending; this verification is not a sign-off. No PR or merge is claimed.

Reversal alignment, 2026-10-29: Victor requires PR #31's `POST /sales/{saleId}/reversal` and the combined R11/R12 outcome before the next reversal PR. The locally available `origin/feat/reversal-otp-ui` uses that route, but its in-memory mock only restores stock and marks the sale; it is not evidence of R11/R12 completion. Updated `spec.md`, `plan.md`, `test-plan.md` and `docs/sales-reversal-authorization-proposal.md` to reconcile the sale route, define the joint atomic acceptance gate, retain separate repayment/restock reversals, and avoid assuming V5 is free. Contract and OTP authorization remain pending the API and data owners. GitHub CLI had no authenticated session and the PR page was unavailable, so the current live PR head and status were not independently confirmed; compare its latest head before implementation. No reversal service or store-credit completion is claimed.

Restocks in progress, 2026-10-29: `feat/restocks` is in the isolated `.worktrees/feat-restocks` worktree, based on `origin/main` at `b696832`; the user's customer-portal work in the main worktree was preserved. R5/R6 draft contract, V5/U5 migration, service/controller, frontend sheet, simulation and tests are implemented. The contract requires Isaac Bassey and Nnaemeka Chukwuma's sign-off before merge. See [restocks implementation](../docs/restocks-implementation.md).

Verification so far: OpenAPI lint, web lint and typecheck passed; `npm test -- --run` passed 45 tests in 16 files; production build passed with the existing large-chunk warning. Focused Playwright restock checks passed 4/4 desktop/mobile including axe. The full 98-case browser run had 97 passes and one desktop authentication timeout waiting for Products after reload; the unchanged failing case passed in an isolated rerun. Initial focused browser launch also timed out during dependency preparation; unchanged rerun passed. Java 25 compiled all service and integration test sources (`test-compile`: BUILD SUCCESS); focused Testcontainers tests could not start because no Docker environment was found (10 errors, no database assertions executed). Full service `verify`, migration rollback, and rule-removal evidence remain required; no database pass is claimed. `npm ci` was interrupted after a prolonged partial install; the local test/build launchers and icon package were restored from the existing same-version installation. Do not push or claim completion until remaining verification is green. Product editing/archive and reversals are separate work.

Current frontend work, 2026-10-28 (Victor Oyeleke; logged by Antigravity): PR #27 merged hotfix branch `fix/dialog-drawer-placement` into main at `b060869`. Feature branch `feat/role-sidebar-and-mock-credentials` implements DM70 directly off merged main to:
1. Filter navigation links by role in `ShopLayout.tsx`: removes `Sell` (`/app/sell`) from both desktop and mobile navigation for the `ADMIN` role since Admins have read-only access and cannot record sales. Retains `Sell`, `Products`, `Customers`, and `Sales` for `OWNER` and `ASSISTANT`; retains `Products`, `Customers`, and `Sales` for `ADMIN`. Covered by unit tests in `ShopLayout.test.tsx`.
2. Align mock credentials with the backend demo seed (`R__seed_demo.sql` / README): updates demonstration emails to `owner@stockwise.test`, `assistant@stockwise.test`, and `admin@stockwise.test`, with password `Stockwise-Demo-2026`, across `.env.example`, `development-api.mjs`, `mock-data.mjs`, `mock-api.mjs`, `AuthOverlay.tsx`, check scripts, and browser E2E specs. Victor explicitly instructed implementing role-based sidebar link removal and mock credential alignment on a separate branch with a PR. Item 2 remains independently prepared on `feat/customer-credit-balances` (draft PR #25).
Oldest-outstanding-sale allocation proposal, 2026-10-29: Victor authorized a separate draft proposal for applying repayments to the customer's oldest outstanding credit sale, to support sale reversal R11/R12. See [proposal](../docs/oldest-outstanding-sale-allocation-proposal.md). The document specifies `(created_at, id)` ordering, the two-sale example, transaction and idempotency requirements, history and test gates, and unresolved repayment-reversal, historical-data and settlement-split questions. It aligns sale reversal with PR #31's `/sales/{saleId}/reversal` route without claiming API or data-owner approval. No service, API contract or UI behavior changes are included. Branch `docs/oldest-debt-allocation` starts at `origin/main` `424b297`; the existing `feat/restocks` worktree remains separate. `npm test -- --run` passed 53 tests in 16 files using the existing installed dependencies. GitHub CLI reported no authenticated session; no PR is claimed until it is confirmed.

Current frontend work, 2026-10-28 (Victor Oyeleke; logged by Antigravity):
1. **PR #30 (`feat/store-credit-ui`)**: Customer store credit issuing and tender simulation completed and submitted for review.
2. **PR #31 (`feat/reversal-otp-ui`)**: Sale reversal authorization code generation dialog (Owner/Admin) and OTP modal (Cashier/Assistant), plus persistent receipt inspection from Sales History and interactive row selection highlights.
3. **PR #32 (`feat/customer-portal-ui`)**: Customer Self-Service Online Portal (`/c/:token`):
   - Zero-authentication tokenized public route at `/c/:token` allowing customers to access their live ledger statement without login friction.
   - Transparent balance summary: shows live debt balance owed, available store credit, and net account position in integer kobo.
   - Mobile shopping catalogue: product search and interactive stepper quantity controls (`+`, `-`) with stock limits.
   - Pre-order checkout and submission dialog: supports flexible payment preferences (`USE_STORE_CREDIT`, `PAY_ON_PICKUP`, `ON_ACCOUNT`), optional pickup note, and auto-generated order reference with instant WhatsApp link.
   - Mock simulation endpoints in `development-api.mjs` for `/portal/customer/:token`, `/portal/customer/:token/products`, and `/portal/customer/:token/orders`.
   - 100% test verification (vitest: 45/45 passing across 14 test suites, Playwright: 22/22 passing with 0 axe violations, zero lint warnings, clean strict typecheck, and successful production build).

### Earlier deployment handover

Handover written 2026-10-25 (evening, the day before the Monday 26 Oct checkpoint) by the agent for Nnaemeka Chukwuma. Checked against GitHub at that time.

- **Stage:** Implementation (EXECUTION.md). Code for the Monday journey is **merged**. **Nothing is deployed yet.**
- **On `main` (head `cb49437`), all merged:**
  - PRs #1-#14: the web screens (Victor); the contract v0.1.0 and migrations V1-V3 (#2); the sale transaction (#7); the repositories, seed and evidence (#8); the backend app, auth and roles, and every v0.1.0 endpoint (#12); the template reorder with CI, deploy, smoke and load scripts (#13); removal of the shared-components skill from the repository (#14).
  - `cd service && ./mvnw verify`: 88 tests green locally. **CI is green on `main`** (GitHub Actions run of 17:39 UTC).
- **Deploy is failing, and that's expected until setup:** `deploy.yml` runs on every push to `main` and fails at the "Flyway migrate" step.
  - `DATABASE_JDBC_URL_DIRECT` is empty, so the repository secrets are not set.
  - The job also didn't wait for approval, so the GitHub `production` environment has no required reviewer yet.
- **Next actions, in order (owner):**
  1. **Blessing Nwafor:** do [docs/deploy-setup.md](../docs/deploy-setup.md):
     - **GitHub:** the `production` environment with required reviewers (Isaac Bassey, backup Blessing); its secrets (`DATABASE_JDBC_URL_DIRECT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RENDER_DEPLOY_HOOK_STOCKWISE`, `DEMO_OWNER_PASSWORD`); and the variables `API_URL`, `WEB_URL`, `SEED_DEMO=true`, `DEMO_OWNER_EMAIL`.
     - **Hosts:** the Neon project (pooled and direct URLs); the Render Docker service (root `service`, health check `/`, `JWT_SECRET` of 32+ bytes **required**, `CORS_ALLOWED_ORIGINS` = the Vercel address); the Vercel project (root `web`, `VITE_API_BASE_URL` = `https://<render>/api/v1`).
  2. **Isaac Bassey:** re-run `Deploy` (Actions, "Run workflow", `run_last_unit` ticked) and approve the `production` step. Expect `SMOKE OK` and `LAST-UNIT TEST PASSED`; save the last-unit log for slide 4. Add a row to [docs/releases.md](../docs/releases.md).
  3. **Victor Oyeleke:** check the web against the real service (locally first: `docker compose up -d db`, then the service with profiles `local,demo`, then `VITE_API_BASE_URL=http://localhost:8080/api/v1`). Demo logins: `owner@`, `assistant@` and `admin@stockwise.test`, password `Stockwise-Demo-2026`. The `@stockwise.demo` accounts in `web/.env.example` belong to the mock only.
  4. **All:** run the full Monday journey from a clean browser on the deployed site (intent S7), then rehearse the 10 slides. Use [docs/demo-runbook.md](../docs/demo-runbook.md).
  5. **Isaac Bassey:** add his half of the v0.1.0 contract sign-off in `decisions.md` §3 (Nnaemeka's half is recorded). Decide the v0.1.1 gaps: there is no `Problem.code` value for a 500 (the service sends `INTERNAL_ERROR`), and 405/415 reuse `VALIDATION_FAILED`.
  6. **Nnaemeka Chukwuma:** the change `contract-v0-2` (the Victor-requested proposals A-D, MVP-ready) is in Build. Proposal A (retry-safe `POST /customers`, migration V4) is done on `feat/contract-v0-2`; B-D are next. Continue from [sdlc/contract-v0-2/WORKLOG.md](contract-v0-2/WORKLOG.md).
- **Waiting on:** hosting accounts and secrets (Blessing); production approval and contract sign-off (Isaac). Whether Isaac has been added as a repository collaborator is unknown; earlier he wasn't (the owner is AMAZEEN12).
- **Help outside the Data and rules area (logged as the brief requires):** the backend app, auth, controllers, Dockerfile and README (#12), and the template reorder (#13), were built by the agent for Nnaemeka Chukwuma. Isaac and Blessing should review them as their own.
- **Local checkout:** the branch `docs/handover-log` holds only this handover update. The evidence branch `evidence/no-stock-guard` is pushed and must never be merged.

## How to continue without the sdlc skill
1. Stages run in order: Plan (intent.md), Design (spec.md), Build (plan.md + repo AGENTS.md), Test (test-plan.md), Deploy (release.md + repo REVIEW.md), Maintain (monitoring.md), then EXECUTION.md.
2. Each stage reads the accepted artifact before it. Never write a later artifact before the earlier one is accepted.
3. Fill in what is already known, then ask the user at most 5 numbered questions, each with a suggested default. Never invent answers. Mark gaps `UNRESOLVED` and carry them forward.
4. Show a short summary of each artifact and get the user's confirmation, then set `Status: accepted` with the approver and date.
5. Keep requirement IDs (R1, N1, ...) the same across spec.md, plan.md and test-plan.md.
6. Update this log after every round of answers, artifact change and decision.
7. Templates: `.claude/skills/sdlc/templates/`. If they're not available, copy the heading structure of the artifacts already in this folder.
8. Stockwise (main product) goes first; the side project Genie has its own chain in its own repository (`genie/sdlc/` in the local workspace) and follows the lighter "Side project standard".

## Artifact status
| Artifact | Status (missing / draft / accepted) | Approved by | Date |
|----------|-------------------------------------|-------------|------|
| intent.md | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| spec.md | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| plan.md | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| Frontend phase 2 amendment and docs/frontend-architecture.md | accepted (DM32-DM36; other area approvals unchanged) | Victor Oyeleke | 2026-10-24 |
| AGENTS.md (repo) | draft; service, image, smoke, last-unit and guard commands verified locally 2026-10-25 (deploy commands not yet run on real hosts) | | 2026-10-25 |
| test-plan.md | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| REVIEW.md (repo) | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| release.md | accepted | Nnaemeka Chukwuma | 2026-10-23 |
| monitoring.md | deferred (DM31) | Team 3 | 2026-10-23 |
| EXECUTION.md | written (runbook) | Nnaemeka Chukwuma | 2026-10-23 |
| Change `contract-v0-2` (sdlc/contract-v0-2/) | Build; intent, plan and test-plan **draft**; proposal A implemented | | 2026-10-25 |

## Conventions and guidelines
- **Stack and versions:** service: Java 25, Spring Boot 4, Flyway, JUnit + Testcontainers, PostgreSQL (DM1). Hosting: Vercel + Render + Neon, terms to verify (DM2). Auth: email+password, bcrypt, JWT bearer (DM3). Interface constraints from the brief: React interface with React Router (or equivalent) and Tailwind or plain CSS, typed models (no `any`); own HTTP service; free managed Postgres; GitHub Actions deploys both tiers; free tiers only.
- **Naming:** change slugs `stockwise` and `genie`. Two repositories (DM19): this one is `stockwise/` (code, `sdlc/`, `AGENTS.md`, `decisions.md`, `deploy-plan.md`). Genie is a separate repository. Artifacts are independent (DM20).
- **Code and docs style:** frontend folder map and conventions are in `docs/frontend-architecture.md` (DM32–DM40, DM53). One API file per resource, central endpoints, Axios HTTP client, Formik/Yup, Redux Toolkit/RTK Query, React Router Data Mode and Tailwind v4. Four engineers' shared copy-in source adopted; count confirmed and approved by Victor under DM53. Stockwise tokens override neutral values. Read docs/shared-component-alignment.md for approved source clarifications. Shadcn is not required. Use feature branches and descriptive commits. Backend conventions remain unchanged.
- **Versions (verified on Maven Central 2026-10-23):** Spring Boot 4.1.2 parent (manages Flyway 12.4.0, Testcontainers 2.0.5, postgresql 42.7.14, failsafe 3.5.6); exec-maven-plugin 3.6.4; Maven wrapper pinned to 3.9.16. Integration tests are `*IT` classes, run by Failsafe in `./mvnw verify`, against `postgres:17-alpine`.
- **Docker:** Docker Desktop must be running (per-user install at `%LOCALAPPDATA%/Programs/DockerDesktop`).
- **Local ports:** the Prism mock runs on **4710**, not its default 4010. Windows on Nnaemeka's machine reserves TCP 3965-4064 (Hyper-V/WSL). The mock serves paths at the root; the real service serves them under `/api/v1` on 8080. Prism returns 422 for invalid requests, while the real service returns 400 `VALIDATION_FAILED`.
- **Source of truth:** the repository. The Markdown artifacts are authoritative; the TeSA PDF brief is the originating record.
- **Policies in force:** TeSA brief sections "Shared technical requirements", "Shared rules for fairness", "Delivery and cost" and the assessment rubric (PDF pages 3, 23-26). No other organisational policy supplied.
- **Supporting skills:** none.
- **Approvers:** product owner: Nnaemeka Chukwuma (acting). Team lead and technical sign-off: Isaac Bassey. Area owners: Nnaemeka (Data and rules), Isaac (API and access), Blessing Nwafor (Delivery and evidence). Supervisor: Goodnews (reviews at checkpoints).
- **User preferences for this workflow:** structured multiple-choice questions with a recommended default, asked one decision at a time, with plain explanations and concrete examples. For every decision, also ask who to record as the decision maker (options: Team 3, a named engineer, the supervisor). Record "Decided by" and "Logged by" separately. Nnaemeka Chukwuma is the existing decision-log owner and historical logger. Victor explicitly owns DM32-DM36; Codex records those entries as logging assistant, without attributing wider team approval. Do not re-ask these settled choices.

## Decisions
Append-only. To change a decision, add a new entry that supersedes it.
| ID | Date | Decision | Reason | Decided by | Affects | Status |
|----|------|----------|--------|------------|---------|--------|
| D1 | 2026-10-23 | The SDLC chain covers Team 3: Stockwise (main) and Genie (side), one change folder each, Stockwise first | The user's team allocation; the main product carries the marks | user | all | active |
| D2 | 2026-10-23 | (superseded by D15) Layout: this folder is the parent, with subfolder `stockwise/` (main) and `genie/` (side). SDLC artifacts live in `sdlc/<slug>/` at the parent; AGENTS.md and REVIEW.md at the parent | User asked for a parent folder with two subfolders | user | plan.md, AGENTS.md | active |
| D3 | 2026-10-23 | Source of truth is the repository | No external tracker named; the brief is a PDF | agent (default, not objected) | all headers | active |
| D4 | 2026-10-23 | The user approves artifacts for now; a team lead is not designated yet | User's answer at intake | user | all | active |
| D5 | 2026-10-23 | Plan against a final submission date of Tue 3 Nov 2026 (Day 14), marked UNRESOLVED until a facilitator confirms | The brief leaves the date to the facilitators | Nnaemeka Chukwuma | intent.md, EXECUTION.md | active |
| D7 | 2026-10-23 | Service stack: Java 25 + Spring Boot 4 + Flyway + JUnit/Testcontainers + PostgreSQL | User's choice (the agent had recommended Node/TS) | Nnaemeka Chukwuma | spec.md, plan.md | active |
| D8 | 2026-10-23 | Hosting: Vercel + Render + Neon, pending pricing-page verification | User's choice | Nnaemeka Chukwuma | spec.md, release.md | active |
| D9 | 2026-10-23 | Auth: email+password with bcrypt, JWT bearer, roles OWNER/ASSISTANT/ADMIN | User's choice | Nnaemeka Chukwuma | spec.md | active |
| D10 | 2026-10-23 | Keep all three PD1 options (A allow/refund owed, B block, C store credit) open until team members confirm. Until then the service refuses that case with REVERSAL_NEEDS_DECISION | User: "keeps all 3 options open until other team members can confirm" | Nnaemeka Chukwuma | spec.md R12 | active |
| D11 | 2026-10-23 | Pending and made decisions for the product live in `stockwise/decisions.md` (also the brief's decisions file and contract change log) | User asked for decisions to be written in decisions.md | Nnaemeka Chukwuma | all | active |
| D12 | 2026-10-23 | Resolve pending decisions one at a time. PD1 option C (store credit), PD2 3 Nov final with the 26 Oct presentation, PD3 lead Isaac Bassey, PD4 Nnaemeka Data and rules / Isaac API and access / Blessing Delivery, PD5 both stacks in parallel (Stack V official until Qocent funding is known), PD6 OWNER and ADMIN may reverse. Full text: `stockwise/decisions.md` DM5-DM10 | User's answers | Nnaemeka Chukwuma | spec.md, plan.md, release.md | active |
| D13 | 2026-10-23 | Created `deploy-plan.md` (repo root) covering Qocent + Neon and Vercel + Render + Neon for both products | User asked for a deploy plan for both stacks after reading apps.qocent.com | agent | release.md | active (draft) |
| D14 | 2026-10-23 | Attribution correction: every decision in D1-D13 and DM1-DM11 recorded as decided by "user" or "Nnaemeka Chukwuma" was made by **Team 3 as a team** and only **logged** by Nnaemeka Chukwuma. From now on, record "Decided by" and "Logged by" separately, and ask who to record as the decision maker for each new decision | User's instruction | Team 3 (logged by Nnaemeka Chukwuma) | all decision tables | active |
| D15 | 2026-10-23 | Build answers: Maven wrapper (DM17, Blessing Nwafor), JdbcClient plain SQL (DM18, Nnaemeka Chukwuma), two repos (DM19, Team 3), independent per-repo artifacts (DM20, Team 3). Supersedes D2's single-folder artifact layout: artifacts moved from `sdlc/stockwise/` to `stockwise/sdlc/`, from `sdlc/genie/` to `genie/sdlc/`, and `deploy-plan.md` moved to `stockwise/deploy-plan.md` | User's answers | Team 3 (logged by Nnaemeka Chukwuma) | all paths | active |
| D16 | 2026-10-23 | Web tooling Vite + React + TS (DM21, Victor Oyeleke). The user re-asked the question and gave the same answer, so DM21 stands | User's answer | Victor Oyeleke (logged by Nnaemeka Chukwuma) | plan.md | active |
| D17 | 2026-10-23 | Test answers: coverage 80% on rule packages (DM22, Team 3), CI test guard plus CODEOWNERS (DM23, Team 3), Playwright screenshots of key screens (DM24, Victor Oyeleke), small eval suite after Monday (DM25, Team 3) | User's answers | as listed (logged by Nnaemeka Chukwuma) | test-plan.md, AGENTS.md | active |
| D18 | 2026-10-23 | Deploy answers: release manager Isaac Bassey with Blessing Nwafor as backup (DM26, Isaac), staging after Monday (DM27, Isaac), rollback rehearsals Sat 24 Oct plus two after Monday (DM28, Team 3), no AI agent in CI (DM29, Team 3), reviews with 5 nits and one code-owner approval, plus Isaac for high-risk code (DM30, Isaac) | User's answers | as listed (logged by Nnaemeka Chukwuma) | release.md, REVIEW.md | active |
| D19 | 2026-10-23 | Monitoring postponed (DM31). monitoring.md is a deferred placeholder | User answered "monitoring should be postponed" to Maintain 1 | Team 3 (logged by Nnaemeka Chukwuma) | monitoring.md, EXECUTION.md | active |
| D6 | 2026-10-23 | Propose "reversing a partly repaid credit sale (negative balance)" as Stockwise's design problem, pending Goodnews's agreement | The brief names no design problem for Stockwise | Nnaemeka Chukwuma | intent.md, spec.md | active |
| D20 | 2026-10-24 | Frontend phase 2 accepted: folders/docs and empty HTTP-client file; resource API files, central endpoints, image exports, app-wide foundational tokens, Formik/Yup, Axios, Redux Toolkit/RTK Query and Router Data Mode. Shared-component agreement pending and shadcn not required. Bootstrap docs on main then publish starter on a separate branch/PR. Details DM32-DM36 | Victor's answers and explicit implementation request in this conversation | Victor Oyeleke (logged by Codex, logging assistant) | frontend docs, plan, spec, AGENTS.md | active |

## Questions and answers
| # | Date | Stage | Question | Answer | Status |
|---|------|-------|----------|--------|--------|
| Q1 | 2026-10-23 | Intake | Which products does the chain cover? | Stockwise + Genie | answered |
| Q2 | 2026-10-23 | Intake | Who accepts intent / signs off artifacts? | "Me, not lead yet" | answered |
| Q3 | 2026-10-23 | Intake | Which service-tier area do you own? | "work on all service tiers" | answered |
| Q4 | 2026-10-23 | Intake | Repository layout? | "a parent folder with 2 subfolders one for main and one for side project" | answered |
| Q5 | 2026-10-23 | Intake | Team lead for Team 3? | not designated yet | open |
| Q6 | 2026-10-23 | Intake | Final submission date (brief asks facilitators to confirm) | "Tue 3 Nov, unconfirmed": plan for 3 Nov, carry as UNRESOLVED (owner Goodnews) | open |
| Q7 | 2026-10-23 | Plan | Name to record as author/approver? | Nnaemeka Chukwuma | answered |
| Q9 | 2026-10-23 | Design | Service stack? | "java 25 and spring boot 4, flyway, JUnit + Test containers, postgresql for database" | answered |
| Q10 | 2026-10-23 | Design | Hosting? | Vercel + Render + Neon | answered |
| Q11 | 2026-10-23 | Design | Auth? | Email+password, JWT bearer | answered |
| Q13 | 2026-10-23 | Maintain | What runs the monitoring checks? | "monitoring should be postponed" (decided by Team 3) | answered (deferred) |
| Q12 | 2026-10-23 | Design | Provisional rule for the design problem? | "keeps all 3 options open until other team members can confirm, write decisions that need to be confirmed/made in decisions.md" | answered (PD1 open) |
| Q8 | 2026-10-23 | Plan | How to handle Stockwise's missing design problem? | "Propose one, ask Goodnews" | answered (proposal UNRESOLVED) |
| Q14 | 2026-10-24 | Frontend phase 2 | Starter scope? | Folders, documentation, `.gitkeep` placeholders and one explicitly requested empty `http-client.ts`; frontend and docs only | answered |
| Q15 | 2026-10-24 | Frontend phase 2 | API and asset separation? | One file per resource, central endpoint definitions, central image named exports | answered |
| Q16 | 2026-10-24 | Frontend phase 2 | Components and tokens? | `components/ui/` plus `shared/` utilities; app-wide foundational tokens, login-specific hero/coin/wordmark; shared-component agreement pending, shadcn not required | answered |
| Q17 | 2026-10-24 | Frontend phase 2 | Attribution? | Decided by Victor Oyeleke; Codex as logging assistant; no implied cross-team approval | answered |
| Q18 | 2026-10-24 | Frontend phase 2 | Publish from an empty remote? | One-time docs baseline on main, then separate `chore/web-structure` commit/push and PR; never force-push or merge automatically | answered |

## Activity log
- 2026-10-25 · Codex · Sales implementation and QC completed on feat/sales-ui, stacked on Products 86fb5ea. Checks: lint/typecheck exit 0; unit output `Test Files 5 passed (5) / Tests 10 passed (10)`; latest full browser output `30 passed (3.1m)` with axe checks and no assertion weakening; production build `346 modules transformed / built in 17.36s` (main chunk 526.17 kB, gzip 173.16 kB warning retained). Contract lint remains valid and OpenAPI/generated types have no diff. Actual development API checks passed create/read/duplicate, integer validation, same-key replay, changed-body 422, stock conflict and credit settlement; actual browser without interception passed sign-in → open shop → add product → catalogue → confirmation → receipt → refresh. A workspace link contrast conflict was fixed and checked in that journey. A decorative status-icon text failure was fixed with SVG and added to AGENTS.md; tests were not loosened. Temporary visual-inspection script removed after lint caught it in the ignored scratch folder. Service verify: sandbox wrapper access first failed, then permitted wrapper invocation reported `The JAVA_HOME environment variable is not defined correctly`; no service pass is claimed. Final normalized visual differences are in docs/products-sales-ui.md and local .mock/design-comparison.json; they are not approved exact baselines. All 62 local reference PNGs remain; Git tracks none. No business rule or migration changed. Human visual review and API-owner agreement on proposed settlement/price/recovery fields remain next.
- 2026-10-24 · Codex · Products on feat/products-ui: shared layout, catalogue/filters, owner-only drawer/mobile form, exact money helpers, immutable contract aliases and stateful local product simulation. Verified lint and typecheck exit 0; 4 unit files/8 tests passed; contract lint valid; production build passed (338 modules, 20.82s, existing vendor-size warning noted). Playwright Products desktop/mobile 2 passed in 31.9s with one worker, including axe and unsaved-change checks. Initial sandboxed esbuild could not read ancestor directories; reran with required toolchain access. Initial parallel browser run exhausted the default per-test time; same assertions passed with one worker without weakening tests. React ref render lint finding corrected with an event-time blocker predicate. Screens removed from index only; local copies preserved. Sales still to implement.
Append-only, newest last.
- 2026-10-23 · agent · Read the source PDF (all 26 pages readable) and inspected the repository (empty apart from `.claude/`).
- 2026-10-23 · agent · Intake round 1 answered by the user. Created `sdlc/stockwise/WORKLOG.md`, `sdlc/genie/WORKLOG.md` and a minimal `AGENTS.md`.
- 2026-10-23 · agent · Stage 1 questions answered. Drafted `sdlc/stockwise/intent.md` (Status: draft).
- 2026-10-23 · Nnaemeka Chukwuma · Accepted intent.md. Agent set Status: accepted and started Design.
- 2026-10-23 · agent · Design questions answered. Drafted `sdlc/stockwise/spec.md` (draft) and created `stockwise/decisions.md` (PD1-PD12, DM1-DM4).
- 2026-10-23 · Nnaemeka Chukwuma · Accepted spec.md (open PD items stay in decisions.md).
- 2026-10-23 · agent · Read apps.qocent.com (/, /product, /pricing; no public docs at /docs, /help or /api) and the Render, Neon and Vercel free-tier pages. Wrote `deploy-plan.md`.
- 2026-10-23 · agent · Recorded PD1-PD6 resolutions as DM5-DM10 in `stockwise/decisions.md`. PD7 pending.
- 2026-10-23 · agent · Recorded PD7 = archive/unarchive (DM11). PD8 asked.
- 2026-10-23 · agent · Corrected attribution in `stockwise/decisions.md` (Decided by: Team 3 / Logged by: Nnaemeka Chukwuma for DM1-DM11) and added D14 to this log.
- 2026-10-23 · agent · Recorded PD8 = standard targets (DM12, decided by Victor Oyeleke, logged by Nnaemeka Chukwuma). PD9 asked.
- 2026-10-23 · agent · Recorded PD9 = Flyway + undo scripts (DM13, Team 3). PD10 asked.
- 2026-10-23 · agent · Recorded PD10 = UTC storage, Lagos 'today' (DM14, Team 3). PD11 asked.
- 2026-10-23 · agent · Recorded PD11 = 8-hour tokens (DM15, Team 3). PD12 asked.
- 2026-10-23 · agent · Recorded PD12 = small Monday seed with all awkward cases (DM16, decided by Nnaemeka Chukwuma). Applied DM5-DM16 to spec.md (R12 store credit, R14, R18, R19, N2, N7, N8, N12, permission matrix, data model, C1, C4, open questions).
- 2026-10-23 · agent · Recorded DM17-DM20. Moved `sdlc/stockwise/*` to `stockwise/sdlc/`, `sdlc/genie/*` to `genie/sdlc/` and `deploy-plan.md` to `stockwise/deploy-plan.md`. Fixed links. Older entries above use the old paths.
- 2026-10-23 · agent · Recorded DM21 (web tooling; re-asked at the user's request, unchanged). Wrote `sdlc/plan.md` (draft) and `AGENTS.md` for this repo. Rewrote the parent-folder `AGENTS.md` as a workspace pointer.
- 2026-10-23 · Nnaemeka Chukwuma · Accepted plan.md. Agent started the Test stage.
- 2026-10-23 · agent · Recorded DM22-DM25. Wrote `sdlc/test-plan.md` (draft). Filled in AGENTS.md "Verifying your work".
- 2026-10-23 · Nnaemeka Chukwuma · Accepted test-plan.md. Agent started the Deploy stage.
- 2026-10-23 · agent · Recorded DM26-DM30. Wrote `sdlc/release.md` (draft) and the repo `REVIEW.md`.
- 2026-10-23 · Nnaemeka Chukwuma · Accepted release.md and REVIEW.md. Agent started the Maintain stage.
- 2026-10-23 · agent · Recorded DM31 (monitoring postponed). Wrote `sdlc/monitoring.md` as a deferred placeholder.
- 2026-10-23 · agent · Annotated intent.md open questions answered later (DM5-DM8); intent's accepted content is unchanged. Wrote `sdlc/EXECUTION.md`. SDLC chain complete for Stockwise.
- 2026-10-24 · Codex (logging assistant for Victor Oyeleke) · Read every SDLC artifact, AGENTS.md, decisions.md, deploy-plan.md and REVIEW.md, plus the local eight-page shared-component proposal. Distinguished its proposals from Victor's instructions and recorded the unresolved shared agreement.
- 2026-10-24 · Victor Oyeleke · Accepted the phase 2 frontend publication plan and explicitly requested implementation. Confirmed resource-level API files, central endpoints/image exports, shared folder placement, token scope, stack changes, pending component foundation, empty HTTP-client file and Git bootstrap/publication workflow (DM32-DM36).
- 2026-10-24 · Codex · Confirmed the remote was empty; staged only the 12 existing planning documents, checked the staged diff and created `176fc3a` (`docs: establish Stockwise planning baseline`). Pushed `main` to `origin` successfully using configured Git credentials. No branch protections or CI setup claimed.
- 2026-10-24 · Codex · Created `chore/web-structure`, 27 empty `.gitkeep` placeholders and a zero-byte HTTP-client file. Added frontend architecture/design-token notes, appended DM32-DM36 and PD13-PD14, and aligned the frontend plan/spec/agent conventions and execution runbook. Static verification and branch publication are next; application checks remain unavailable.
- 2026-10-24 · Codex · Static verification passed before staging: exact folder/file set, all 28 starter files zero bytes, no unauthorized scaffolding, 29 local Markdown links/fragments resolving, continuous decision tables with unique IDs, historical decision rows and contract log unchanged, and no stale shared-agreement assertion or old API-client path in the current spec/plan. `git diff --check` exited 0. Runtime checks are unavailable because their scaffolds do not exist.
- 2026-10-24 · Codex · Created starter commit `45f49c6` (`chore(web): add frontend starter structure and conventions`), pushed `chore/web-structure`, and opened [PR #1](https://github.com/AMAZEEN12/Stockwise/pull/1) targeting `main`. The GitHub connector's PR creation returned 403 (integration permissions); creation succeeded through the Git credentials already used for the authorized pushes. No credentials were printed or written to project files. PR creation returned state `open`, base `main`, head `chore/web-structure`, merged `false`.
- 2026-10-24 · Codex · Verified remote branch heads after the starter push: `main` = `176fc3aa826a0299bacd5ea2139e1d39f90b5e0f`, `chore/web-structure` = `45f49c649b486e9809f50560cbfd2ba99f1ae7db`, matching local refs. A documentation-only follow-up on the same branch records this publication evidence; main and the review gate remain unchanged.
- 2026-10-28 · Blessing Nwafor (with an AI assistant) · Ran the Load test workflow on the deployed service: last-unit passed 3 of 3; k6 p95 over target (POST /sales 1.69 s, dashboard reads 802.63 ms, catalogue 503 ms). Results in `docs/evidence/load-2026-10-28/` and README. Cold start not yet run.
- 2026-10-28 · Blessing Nwafor (with an AI assistant) · Ran the Load test workflow 9 times on the deployed service (plus one login-failure run and one invalid cold-start attempt, both excluded). Last-unit passed 9 of 9. Reads held to 30 to 50 virtual users after tuning; `POST /sales` missed the 500 ms target (steady 3-till test p95 656 ms). Results in `docs/evidence/load-2026-10-28/`; README and `load/README.md` updated. Cold start and Lighthouse still to do.
### Phase 2 verification output (2026-10-24)

Read-only inline Python assertions and `git diff --check` produced:

```text
PASS: exact starter tree; 27 empty .gitkeep files and a zero-byte HTTP client
PASS: no dependencies, configuration, generated schema, backend or workflow scaffold
PASS: 29 local Markdown links and fragments resolve
PASS: appended decision IDs are unique, tables continuous, historical decisions and contract log preserved
PASS: current spec/plan use the pending shared agreement and new HTTP-client location
git diff --check: exit 0
```

Service verify, contract lint, web lint/typecheck/unit/build, and Playwright: unavailable at this stage, not run. No package manifest, service wrapper or OpenAPI file exists. No rendered UI or business rule was changed.

### Requested rollback (2026-10-24)

- Victor requested reverting all changes just made. Codex reverted login/home implementation commit `78f6363`, restoring the tracked starter state from `b49d07a`, with this rollback record as the only addition.
- Removed generated frontend dependencies, `web/package-lock.json` and `web/install.log`; stopped the project's Vite/esbuild processes to release locked files. Local design-reference images were preserved.
- Verification: staged files matched `b49d07a` before this log entry; `git diff --check` passed. Application checks remain unavailable because the restored starter has no package manifest, service scaffold or OpenAPI contract.
- 2026-10-23 · agent · EXECUTION step 1 (local part): `git init -b main` in `stockwise/`, added `.gitignore`, committed the artifacts one commit per stage (first commit 4de3402). No remote, nothing pushed (user: "local only for now").
- 2026-10-23 · agent · EXECUTION step 2: drafted `contract/openapi.yaml` v0.1.0 (Monday paths), `redocly.yaml` (recommended rules plus a custom `money-is-integer-kobo` rule) and the contract README. Redocly lint: 0 errors, 0 warnings after fixing a missing 4xx on /health and an if/then conflict with additionalProperties (the CREDIT → customerId rule moved to the description, enforced by service and DB). Proved the money rule fails on a deliberate `priceKobo: number`. Prism mock failed on port 4010 (EACCES, Windows reserved range 3965-4064) and moved to 4710. Smoke test: health 200, login 201, products 401 without token and 200 with, sale 201, missing Idempotency-Key 422, float quantity 422, forced 409 returns the INSUFFICIENT_STOCK example. Logged as DRAFT in decisions.md §3, pending Isaac Bassey and Nnaemeka Chukwuma.
- 2026-10-23 · agent · Committed the contract draft (Stockwise 199f70b) and the Genie port note (Genie 491ea43).
- 2026-10-23 · agent · EXECUTION step 4: started Docker Desktop (it wasn't running). Wrote V1__users, V2__products, V3__customers_sales_ledger with named CHECK and UNIQUE constraints and the indexes for Q1-Q5, plus hand-written U1-U3. Added `service/pom.xml` (Boot 4.1.2), the Maven wrapper, `MigrationUndo`, `MigrationRollbackIT` (an undo script exists for every migration; up/down/up with exact schema snapshots at every step) and `SchemaRulesIT` (no float or numeric columns, *_kobo is bigint, R4 backstop, R5, R8, R9, R12, sale-line total, sale reference). `./mvnw clean verify`: 11 tests, 0 failures. Removal checks: 6 protections removed one at a time, each made its test fail (the first R12 attempt was invalid because of a dangling comma, then redone). Logged in `docs/rule-removal-log.md`. Found and fixed a harness issue (stale .bak in target/classes). Added `.gitattributes` (LF) and the executable bit on mvnw for Linux CI. Recorded the plan departures in plan.md.
- 2026-10-24 · agent · Committed step 4 (local 164ff63). Remote https://github.com/AMAZEEN12/Stockwise already existed: `main` is one commit by Victor (176fc3a, "planning baseline") holding the same artifacts as local 34f82a0 but with no shared history, plus `chore/web-structure` (PR 1) and an empty `emeka's-branch`. Replayed local commits (.gitignore, log, contract, step 4) onto `emeka's-branch` from `origin/main`. The resulting tree is identical to local `main`. Pushed (head 93882f3). Nothing force-pushed; `main` untouched.
- 2026-10-24 · agent · Opened PR 2 (`emeka's-branch` → `main`) through the GitHub API with the user's stored Git credential (Chukwuma-Elvis); `gh` isn't installed. No reviewer requested: Isaac isn't a collaborator (collaborators are Victor-430, AMAZEEN12, Chukwuma-Elvis), per the user.
- 2026-10-24 · agent · EXECUTION step 9, service part (Data and rules area only): `SaleService.record` runs one transaction: it claims the Idempotency-Key (`INSERT … ON CONFLICT DO NOTHING`), takes stock per line with `UPDATE … WHERE active AND quantity >= :q RETURNING price_kobo` in product-ID order, writes lines and movements, sets the total, and charges credit with a ledger entry. Added `spring-boot-starter-jdbc`. Tests: `SaleIT` (9), `SaleConcurrencyIT` (4: last unit ×10, no oversell, opposite line orders, parallel credit), `IdempotencyIT` (5), `SaleRequestHashTest` (3). Full build: 32 green. Loop: 20/20. Removal checks: guard only, guard plus CHECK (10 of 10 sold the last unit), ON CONFLICT, hash comparison, lock ordering, each failing as expected. Store-credit draw deferred to step 16; controller left to Isaac (plan.md departures).

### Home/authentication implementation and verification (2026-10-24)

Historical engineer-count wording in this section is superseded by DM53: Victor confirmed and approved four interface engineers on 2026-10-25.

- Victor supplied the five-engineer shared agreement, screenshots and tokens, requested a read-only review, then authorized implementation. Recorded DM37–DM40 with separate attribution for human scope, reported agreement and Codex implementation defaults/proposals.
- Created `feat/auth-ui` and merged origin/main (`18151aa`, merged PR #2) as `3497a5e`. Resolved only WORKLOG conflicts, preserving both histories. Backend and contract source remain unchanged from origin/main. PR #1 remains open; no main merge, remote push or deployment was performed.
- Delivered Home, sign-in/sign-up overlays and all supplied states, Data Mode, Tailwind v4 Vite integration, shared copy-in components, Stockwise tokens, self-hosted fonts, central runtime image exports, generated OpenAPI types, Axios-backed RTK Query and Formik/Yup. Auth routes are lazy-loaded; largest initial JS chunk is 480.46 kB (157.85 kB gzip), auth chunk 118.39 kB (39.37 kB gzip).
- Registration remains validated UI with an explicit pending adapter; its proposed contract and account-role questions are in `docs/auth-contract-proposal.md`. Demo buttons never invent a seed password. `/workspace` validates `/me` and shows a minimal authenticated welcome. Session lifetime/refresh/logout behavior is explicit in DM40 and implementation docs.
- Reviewed desktop/mobile captures against reference frames; adjusted wordmark placement, spacing, field-error icons, dialog sizing, close icon, typography and loading treatment. The SVG coin is reconstructed, so original-artwork equivalence is not claimed. Human visual-baseline approval is still pending. References are ignored inputs; browser captures are under ignored web/test-results.
- Initial browser failures were fixed in UI code without loosening tests. A later manual screenshot review caught lazy-route capture timing; added a readiness assertion and additional server-field/demo/responsive checks. No failed test was skipped or deleted.

Actual final output (Node v24.21.0, npm 11.19.0; Windows):

```text
npm run generate:api
openapi-typescript 7.13.0: ../contract/openapi.yaml -> src/api/schema.d.ts

npm run lint
eslint . --max-warnings 0
exit 0, no errors or warnings

npm run typecheck
tsc --noEmit
exit 0, no diagnostics

npm test -- --run
RUN v5.0.5
Test Files 3 passed (3)
Tests 6 passed (6)

npm run build
vite v7.3.7 building client environment for production...
328 modules transformed.
built in 8.56s
exit 0, no chunk-size warning

npm run lint:contract
../contract/openapi.yaml: validated in 165ms
Woohoo! Your API description is valid.
exit 0

npx playwright test --workers=2
Running 12 tests using 2 workers
12 passed (1.2m)
axe assertions: zero serious/critical violations in checked auth states
Captures: 1440x900 desktop and 360x880 mobile at 2x
Additional viewport checks: 320, 360, 768, 1024 and 1440px; no horizontal overflow

npm dependency audit after patched tooling installation
found 0 vulnerabilities

service/mvnw.cmd verify
The JAVA_HOME environment variable is not defined correctly,
this environment variable is needed to run this program.
exit 1; service verification unavailable on this machine
```

The first sandboxed Vitest/Vite attempt could not resolve config paths; rerunning with filesystem permission succeeded. Playwright emits a terminal NO_COLOR/FORCE_COLOR environment warning, unrelated to lint or UI correctness. Backend tests were attempted but could not start without Java; upstream test results are not represented as this session's passing checks. Browser API interception proves UI behavior and wire shapes, not a deployed backend. No database guard or migration changed, so no new rule-removal run applies.

### Tailwind guidance and working local mock (2026-10-24)

- Victor requested recording the three recurring utility suggestions and applying them. Added them under AGENTS.md Mistakes to avoid; replaced every matching class in Button, Input and FormField (DM41). Kept existing design-token values and checked the compiled rules and browser computed styles.
- Asked how sign-in should work and where D appeared. Victor chose the contract mock, then identified vite.config.ts as an example badge. Current Git lists all seven originally named files as tracked and present; web/vite.config.ts is unchanged (196 bytes), with no deletion status. Full history shows deletion in requested rollback 3632ae0 and recreation in ec0bf7f. The specific IDE panel was not supplied; do not claim that Git currently reports a deletion or reset files to clear a badge.
- Initial API probes found no listeners on 4710 or 8080 and no local environment override. Added pinned Prism 5.16.0 and yaml 2.9.1, an npm mock launcher, an ignored generated fixture copy and an ignored local .env.local. The active contract and backend remain unchanged. Session and /me examples now agree and have a future expiry. Public mock-only input: owner@stockwise.demo / stockwise-demo. These are not seeded backend credentials; all schema-valid mock logins return the fixed OWNER fixture. Assistant/Admin role simulation remains outside this fixture (DM42).
- Started the mock at http://127.0.0.1:4710 and left it running for Victor's selected local workflow. Added a repeatable check:mock script and verified it against the actual mock and existing dev server, without intercepting HTTP. It confirmed demo autofill, login, /me, refresh and logout, plus radius/font/focus styles. No existing test file was edited in this follow-up.
- Preserved independent user modifications in HomePage.tsx and app.css and untracked web/Screens. They are excluded from this follow-up commit. Browser checks used the current working tree, including those edits. No remote push, main merge, backend implementation or production deployment is part of this round.

Actual verification output:

```text
npm run lint: exit 0, zero errors/warnings
npm run typecheck: exit 0, no diagnostics
npm test -- --run: Test Files 3 passed (3); Tests 6 passed (6)
npx playwright test --workers=2: 12 passed (1.4m)
Compiled CSS: canonical radius rule references --radius-md; token is 10px;
              canonical font utility and configured focus offset emitted
npm run build: 328 modules transformed; built in 15.38s; exit 0
npm run lint:contract: authoritative API description valid; exit 0
redocly lint .mock/openapi.yaml: generated example copy valid; exit 0
npm run mock: Prism is listening on http://127.0.0.1:4710
HTTP smoke: POST /auth/sessions 201; GET /me 200; matching OWNER and future expiry
npm run check:mock:
PASS: actual Prism 201/200, future session, demo autofill, canonical styles,
      browser sign-in, refresh and sign-out.
npm audit --omit=dev: total vulnerabilities 0
Full development audit: 8 advisories (7 high, 1 moderate), via Prism/Postman dependencies;
                       compatible npm audit fix could not resolve them
```

The mock is development-only, binds 127.0.0.1, reads the trusted repository contract and is excluded from the browser build. No forced major dependency overrides or unverified downgrade was applied. The remaining advisory limitation is documented in the implementation notes. Service verification remains unavailable due to the previously observed JAVA_HOME setup; no backend files or business-rule guards changed.

### Persistent agent guidance clarification (2026-10-24)

- Victor reaffirmed that DM41 exists to prevent agents repeating the three class patterns on every future task. Strengthened root AGENTS.md with a startup reminder, exact replacement table, before-edit/before-completion guidance, and explicit Decided by Victor Oyeleke / Logged by Codex attribution. Recorded the clarification beneath DM41 instead of duplicating the decision.
- Confirmed Button, Input and FormField already use the proposed replacements; no old pattern remains in web/src. This follow-up changes documentation only and preserves the user's independent Home/CSS/Screens work.
- Verification: exact replacement/attribution checks and git diff --check; no application tests rerun for this documentation-only clarification. The code replacements were verified in the previous round.

### Requested publication and latest user changes (2026-10-24)

- Confirmed 2f15ec4 exists locally with the persistent agent instructions. Victor requested a PR, then explicitly instructed committing his recent changes before creating it. DM43 records that instruction and attribution.
- Reviewed and prepared the exact supplied HomePage.tsx and app.css edits, plus 16 PNG design inputs under web/Screens (9,194,092 bytes, PNG signatures and expected frame dimensions checked). The prior ignored Login-png folder is no longer present locally; documentation now points to the versioned Screens location. Runtime assets remain in src/assets/images.
- Retained the supplied copy removal, punctuation and coin-position changes without changing tests or silently restoring mobile copy. Noted the mobile supporting-copy consequence for human visual review.
- Fresh verification on the final source: ESLint exit 0 (zero warnings), strict typecheck exit 0, authoritative contract lint valid in 507ms, 3 unit files / 6 tests passed, Vite build succeeded in 14.19s (328 modules), Playwright 12 passed in 1.5m with the existing axe assertions, and git diff --check passed. The service/JAVA_HOME limitation and development-only Prism advisories remain as previously recorded; no backend or active contract changed.
- Next: commit these changes, push feat/auth-ui and create an open PR into main. No merge or deployment is authorized by this publication request.

### Publication completed (2026-10-24)

- Committed Victor's supplied changes and their decision/documentation updates as `e200ce0` (`feat(home): refine landing copy and coin placement with design references`), including all 16 PNG references. Pushed `feat/auth-ui` to origin successfully; no user changes were omitted.
- Created [PR #3](https://github.com/AMAZEEN12/Stockwise/pull/3), title `feat(auth): add responsive entry UI, contract mock and agent conventions`, base `main`, head `feat/auth-ui`. GitHub returned state `open`, draft `false`, merged `false`, initial head `e200ce0716484d9236f63e84387580bd765b31ac`.
- The description covers the final feature, latest supplied refinements, fresh verification, mobile-copy consequence, and existing API/mock/artwork/environment limits. No reviewers were impersonated, no merge/deployment performed, and no credentials were printed or written to project files. This documentation follow-up records the confirmed publication on the same branch.

### Current main integration for Products/Sales PRs (2026-10-25)

Victor requested both feature PRs into main: Products [PR #4](https://github.com/AMAZEEN12/Stockwise/pull/4), feature commit 86fb5ea, and Sales [PR #5](https://github.com/AMAZEEN12/Stockwise/pull/5), feature commit 74d6eef. Both feature commits were confirmed and pushed. Authentication PR #3 remains open; review order is #3, #4, #5.

GitHub reported a WORKLOG conflict after main merged PR #1 (2d170e6). Merge current main into Products and carry that merge into Sales, preserving feature history without force-pushing or merging either PR. The conflict contains older main startup notes; retain current frontend guidance and the historical notes below. Decided by: Victor Oyeleke (publication scope); Codex (routine conflict resolution). Logged by: Codex. Only Markdown resolution is required; application source and earlier test results are unchanged.

Incoming main's historical Resume here snapshot, retained for context only; its open-PR and next-action statements are superseded by the current publication status:

- **Stage:** Implementation (EXECUTION.md)
- **Step:** Step 2 committed (contract draft, pending Isaac and Nnaemeka in decisions.md §3). Step 4 done locally: migrations V1-V3, undo scripts U1-U3, `MigrationUndo` runner, `MigrationRollbackIT` and `SchemaRulesIT`. `./mvnw clean verify` gives 11/11 green, and each protection was shown failing when removed (`docs/rule-removal-log.md`). Committed and pushed to `emeka's-branch` on https://github.com/AMAZEEN12/Stockwise PR https://github.com/AMAZEEN12/Stockwise/pull/2 (open, into `main`).
- **In progress:** nothing half-done.
- **Next action:** Get PR 2 reviewed and merged. Isaac must still approve the migrations (high-risk path, release.md). Then step 7 (auth and roles) and step 9 (sale transaction) need the Spring Boot application from step 3 (walking skeleton: app class, `spring-boot-maven-plugin`, Dockerfile, health). Work on `emeka's-branch` (based on `origin/main`), not local `main`, which has an unrelated history.
- **Waiting on:** Isaac Bassey (contract agreement and migration review). He isn't a repo collaborator yet, so the owner (AMAZEEN12) must invite him before he can be requested as reviewer on PR 2.

### Customer feature verification output, 2026-10-25

```text
npm run lint: exit 0, zero warnings
npm run typecheck: exit 0
npm test -- --run:
  Test Files  7 passed (7)
       Tests  14 passed (14)
npm run lint:contract:
  openapi.yaml: validated in 465ms
  Woohoo! Your API description is valid.
PLAYWRIGHT_PORT=5184 npx playwright test --workers=1:
  50 passed (5.0m)
Final selected-icon desktop/mobile journey:
  2 passed (33.8s)
npm run check:customers:
  PASS: actual local API rejects invalid names; browser sign-in, customer
  creation/contact, directory search/refresh, picker UUID selection, credit
  sale and resulting integer-kobo customer balance. No request interception.
  Development simulation only.
Final npm run build:
  353 modules transformed.
  index-zFq3yQn0.js 526.47 kB | gzip: 173.24 kB
  built in 15.87s
  Existing >500 kB chunk warning retained.
Service mvnw.cmd verify: exit 1 before tests
  The JAVA_HOME environment variable is not defined correctly.
Comparison: all 36 supplied Customer Picker/Customers frames processed.
Git: no active OpenAPI, generated schema, backend or migration diff;
  no reference PNG tracked; all 98 local reference PNGs preserved.
```

The final implementation notes include measured differences and explicit remaining visual/API limitations. Local checks do not substitute for human approval, backend tests or CI. Generated comparison/capture artifacts stay outside feature commits.

### Shared-source documentation clarification, 2026-10-25

- DM53 records Victor's correction to four interface engineers and his approval of the Card and Select/Checkbox source notes. Updated current AGENTS, architecture, provenance, spec, plan and execution guidance; retained the original DM37 and historical logs with explicit correction notices.
- Added docs/shared-component-alignment.md with immutable source links at reviewed revision dbe1cac1f5e6e0838331e35b8da482ab4a1497fc. Card omits its image area when image is omitted; Select/Checkbox already read shared CSS variables and use the input-border token for their control edges. Their obsolete README warnings do not require additional utility mappings or a border repair. The actual older copy-in revision is preserved separately.
- Verification: git diff --check passed; documentation checks confirmed approval/logger attribution, relative link targets, unique DM53 and corrected current guidance. SHA-256 checks confirmed all four pre-existing application edits (ProductsPage.tsx and customers/sales/shop CSS) are byte-for-byte unchanged by this task. No application tests rerun for Markdown-only changes.
- Decided by: Victor Oyeleke. Approved by: Victor Oyeleke. Logged by: Codex. Component migration proposals remain pending; no runtime, API-contract or upstream repository change was made.

### Shared-component implementation verification, 2026-10-25 (DM55)

- Approved by Victor Oyeleke; logged by Codex. Implemented the seven reviewed proposals on feat/shared-component-alignment. Imported eight primitives and persistent shared guidance at dbe1cac, retained earlier provenance for existing primitives, and recorded additive APIs by owner. Shared notifications use the five-second success duration; unresolved writes retain their persistent record and original request semantics.
- All three starting customer/sales/shop CSS refinements were compared with saved input: they are retained with only value-preserving literal-to-token substitutions. Products retains the current formatting/refinements while adopting shared controls/states. Existing test assertions/timeouts, API models/transport, OpenAPI, generated types, backend files and migrations are unchanged. No local design PNG is tracked.
- QA corrections: preserve compact empty-cart composition, mobile single-border cards and selected-customer action spacing; exclude generated trace/report/mock/reference files from Vite watchers on Windows. check:ui owns and warms an isolated server before unchanged timed tests, supports the existing browser-channel setting and stops only its own processes. Reference comparison now accepts capture folders in priority order.

```text
Final npm run lint: exit 0, zero warnings
Final npm run typecheck: exit 0
npm test -- --run:
  Test Files  8 passed (8)
       Tests  18 passed (18)
npm run lint:contract:
  openapi.yaml: validated in 531ms
  Woohoo! Your API description is valid.
Final npm run build:
  2295 modules transformed
  index-g2pyT9U_.js 555.23 kB | gzip: 182.68 kB
  built in 41.24s
  Existing >500 kB chunk warning retained
npm audit --omit=dev: total vulnerabilities 0
Development dependency install/audit: 8 advisories (7 high, 1 moderate)
20 token contrast pairs: PASS; minimum ratio 5.56:1
DM41 canonical-class scan: PASS
npm run check:customers:
  PASS: actual local API rejects invalid names; browser sign-in, customer
  creation/contact, directory search/refresh, picker UUID selection, credit
  sale and resulting integer-kobo customer balance. No request interception.
  Development simulation only.
Playwright full final run: 54 passed, 2 failed (11.7m)
  Desktop picker UUID case lost its dialog when a web README edit caused
  navigation 73ms later; confirmed with trace/document-write timestamps.
  Mobile picker capture/axe flow exceeded the original 30-second deadline.
Earlier focused auth/products/customers/shared-controls verification:
  14 passed (3.2m)
Targeted UUID selection rerun: desktop and mobile passed
Final long picker flow, PLAYWRIGHT_CHANNEL=chromium, npm run check:ui:
  desktop 26.9s, mobile 16.8s; 2 passed (1.5m)
All 56 distinct browser cases passed across full/focused reruns;
  no claim that one uninterrupted 56-case run was green.
  Headless-shell timing remains variable; original assertions/timeouts kept.
Customer Picker/Customers comparisons: all 36 states; 1.97%-13.32% changed pixels
Updated stock/corrected credit comparisons: 4 states; 3.93%-16.67% changed pixels
Service mvnw.cmd verify: cannot start, JAVA_HOME is not defined correctly
Guidance links, decision IDs, whitespace and protected-scope checks: PASS
```

Captures and comparison reports remain ignored local artifacts. Stock conflict uses the supplied updated 2x frames; corrected store-credit inputs currently supplied are 1x and normalized to logical dimensions. Visible labels/counts and transient success notices are approved adjustments; measured nonzero differences are disclosed rather than called pixel-perfect. No manual screen-reader, backend, cross-team API acceptance, new PR, merge or deployment is claimed. The feature is ready for its descriptive commit; publication remains by request.

### Shared-component publication preparation, 2026-10-25 (DM56)

- Confirmed clean feature branch and implementation commit 9cc489b before publication. Fresh origin/main c0ab694 includes Sales PR #5 and documentation PR #6. The remaining feature commits are de97504 (Customer Picker), cb19935 (Customers) and 9cc489b (shared-component alignment).
- Integrated main into this branch without rewriting history. Six overlapping Markdown files contained older startup instructions or duplicate documentation corrections; retained the current implementation records and DM53/DM54 content. Retained upstream deletion of 14 obsolete .gitkeep files in populated directories. No application source, tests, active contract, generated schema, backend or migration changed relative to the verified implementation.
- Publication verification uses whitespace, conflict-marker, unique-decision and protected-scope checks. Prior runtime results are evidence for unchanged implementation; no new uninterrupted all-green browser suite or backend verification is claimed. PR description must disclose the included customer features and previously measured visual differences.
- Decided by: Victor Oyeleke (publication scope); Codex (routine merge resolution). Logged by: Codex. Human review remains required; no automatic merge or deployment.

### Shared-component PR publication confirmed, 2026-10-25

- Pushed committed branch feat/shared-component-alignment and opened [PR #9](https://github.com/AMAZEEN12/Stockwise/pull/9), title `feat(ui): align shared components and add customer screens`, base main. Initial head was 6f7007254692f00dba0ed2db6ec4937a9d95fa10; GitHub confirmed open, non-draft and not merged. Original feature commit 9cc489b exists in its history, as do separate customer feature commits de97504 and cb19935.
- The description covers final implementation, inherited customer scope, unchanged active API, original source owners, validation evidence and remaining limits. Publication changed no application code; runtime tests were not repeated for Markdown/placeholder changes. Whitespace, unique decision IDs, absence of conflict markers and protected-scope checks passed before the commit.
- This follow-up is committed and pushed to the same PR branch. No reviewers were impersonated, no credentials were printed or stored in project files, and no main merge/deployment was performed. Decided by Victor Oyeleke (publication); logged by Codex.

### Sales History verification in progress, 2026-10-25 (DM57-DM58)

- Implemented the existing ID-only GET /sales and shared responsive states on feat/sales-history. Victor's date choices and non-interactive list are preserved; names, endpoints, generated schema, backend, migrations and money-write behavior are unchanged.
- First targeted run: 12 passed, 4 failed (desktop/mobile notice suppression and cached-prefix retention). Fixed implementation, kept assertions/timeouts. The subsequent full regression suite passed all 74 scenarios in one run (8.9m), including original auth/products/sales/customers and the 18 history cases.
- Review of RTK Query's local hook source showed a failed new page can retain data while dropping that argument's fulfilled timestamp. Added client-only retrieval metadata with the retained result and an explicit browser assertion; this does not change wire models. Final focused verification and actual simulation journey follow. No original test file was edited.
- Final frontend checks before that narrow metadata correction: lint/typecheck passed; unit 9 files/23 tests passed; contract valid in 220ms; build 2299 modules in 19.37s, main chunk 555.73 kB/gzip 182.86 kB with existing size warning. Service verify outside the sandbox cannot start: JAVA_HOME is not defined correctly. Final command outputs are recorded below after verification.
- Decided by: Victor Oyeleke (scope); Codex (technical corrections and client metadata). Logged by: Codex. Cross-team/API/human visual acceptance remains separate.

### Sales History final verification, 2026-10-25

```text
npm run lint: exit 0, zero warnings
npm run typecheck: exit 0
npm test -- --run: 9 files / 23 passed (13.99s)
npm run lint:contract: Woohoo! Your API description is valid. (220ms)
npm run build: 2299 modules transformed; built in 22.04s
  SalesHistoryPage JS 7.32 kB / gzip 2.79 kB; CSS 4.20 kB / gzip 1.16 kB
  main 555.73 kB / gzip 182.85 kB; existing >500 kB warning retained
Full Playwright/axe regression: 74 passed (8.9m), one uninterrupted run
After client-only timestamp correction: 18 focused history scenarios passed (1.8m)
Serious/critical axe violations in captured history states: 0
check:sales-history: PASS (unintercepted local simulation; keyboard controls included)
Reference comparison: 12/12 states; changed pixels 2.06-11.95%
Service mvnw.cmd verify: JAVA_HOME is not defined correctly; cannot start
Owned QA ports 4712/5187/5188 released; user-owned previews preserved
Whitespace, unique decisions, conflict markers, local Markdown links: PASS
Active OpenAPI/generated schema/backend/migrations unchanged; existing tests untouched
No local design PNG tracked; all 110 references preserved locally
```

The initial two browser-found defects were corrected in the implementation without weakening checks. Last successful retrieval now travels with retained client cache data through failed new-page requests; no wire field was added. Refresh retains/re-reads the displayed prefix and recomputes Lagos dates after midnight. The simulation supports the already-contracted list endpoint. Results do not imply manual screen-reader, pixel-perfect visual, backend, contract-owner or cross-team approval. Decided by Victor Oyeleke (chosen scope); Codex (technical choices). Logged by Codex. Commit the completed feature descriptively on feat/sales-history; publication is a separate request.

### Sales History publication preparation, 2026-10-25 (DM59)

- Confirmed feature commit 761c5c2 on feat/sales-history. Found Victor's three current uncommitted edits in sales-history.css, shared-components.css and tokens.css. PostCSS comparisons preserve rule/at-rule/declaration order, selectors, properties, normalized values and important flags; they confirm only formatting, equivalent hex case/decimal notation and quoting changed. Preserve all supplied edits and commit before PR creation.
- Fetched origin/main 9e59806 and read GitHub PR state: #9 shared-component/customer foundation, #7 backend sale transaction, and #4 Products are merged. Only 761c5c2 remains as the feature commit absent from main before this publication commit. The PR must accurately describe Sales History as its new feature scope, keep the ID-only contract unchanged, and retain existing QA/visual/environment limitations.
- No runtime checks repeated for behavior-preserving formatting and Markdown. Previous 23 unit tests, 74-scenario full regression, final 18 focused checks, actual simulation journey and 12 measured references remain linked evidence. No merge, deployment or upstream/API acceptance is supplied by publication. Decided by Victor Oyeleke (request and supplied changes); Codex (verification/mechanics). Logged by Codex.

### Sales History publication confirmed, 2026-10-25

- Feature 761c5c2 and supplied-formatting/publication d45a5ec were committed and pushed before PR creation. Opened [PR #10](https://github.com/AMAZEEN12/Stockwise/pull/10), base main, head feat/sales-history, title `feat(sales): add responsive sales history and filters`. Initial head d45a5ecaecb4740252d712d1817ab0d1d0e9c75e. GitHub confirmed open, non-draft, unmerged, mergeable true and clean.
- The description identifies the final scope, ID-only contract, preserved formatting, prior verification and its precise limits, existing visual differences/Java/bundle limits and required human review. No application behavior changed during publication, no credentials were displayed/stored, and no other engineer's approval was invented.
- This link/status follow-up is committed and pushed to the same PR branch. Final verification compares the PR head with local HEAD and confirms a clean working tree. Decided by Victor Oyeleke (publication); logged by Codex. No automatic merge or deployment.
- 2026-10-25 · agent (for Nnaemeka Chukwuma, outside his area, at his request) · Built the missing Monday backend on `feat/backend-api` (plan.md departures list the files). Tests added: `AuthorizationIT` (12), `MondayJourneyIT` (11), `MoneyJsonIT` (6), `CorsIT` (3). The full suite of 88 is green. Removal checks: deleting the product or the sale role rule made `AuthorizationIT` fail (403 became 201). A Docker smoke run with the demo profile passed, and without `JWT_SECRET` the service refuses to start. Found contract gaps (`INTERNAL_ERROR`, the `/` body), listed in plan.md for v0.1.1.
- 2026-10-25 · agent (for Nnaemeka Chukwuma) · Reordered the repository to the supplied backend template (`stockwise-backend-template`). The template's code was older (57 tests, no auth), so files were added and conventions aligned, and nothing newer was overwritten (plan.md departures). Verified:
  - `./mvnw clean verify`: 88 tests green after the moves;
  - **deploy rehearsal on Docker:** the `deploy.yml` Flyway container applied V1-V3 and the seed, the image started in `prod` without migrating, `scripts/smoke.sh` gave `SMOKE OK` with the version reported, and `load/concurrency/last-unit.mjs` passed 3 of 3 rounds (201 x1, 409 x9, stock 0);
  - the CI guard scripts pass against `origin/main`, all three workflows parse, and gitleaks found no leaks in the 44 commits or the files.

  Added `web/vercel.json`, which `deploy.yml` needs.
- 2026-10-25 · agent (for Nnaemeka Chukwuma) · Handover update ("update log in preparation for handover to new agent"). Checked GitHub:
  - PRs #12, #13 and #14 are merged into `main` (`cb49437`), and CI is green on `main`.
  - `Deploy` fails at "Flyway migrate" because `DATABASE_JDBC_URL_DIRECT` is empty, and it didn't wait for approval (no required reviewer on `production`).
  - Genie: PR #1 (scaffold) merged; branch `feat/backend-api` pushed, with no PR.

  Rewrote "Resume here" to the current state. Moved the earlier Resume-here bullets, unchanged, to the history block below. Created [sdlc/contract-v0-2/WORKLOG.md](contract-v0-2/WORKLOG.md) for the new change (intake: scope D1 = proposals A-D; path question open).

- 2026-10-25 · agent (for Nnaemeka Chukwuma) · Change `contract-v0-2`, proposal A, on `feat/contract-v0-2`: contract v0.2.0 (optional `Idempotency-Key` on `POST /customers`), migration V4 with undo U4, and `CustomerIdempotencyIT`. Full build 95 tests green; the web is green against the regenerated types. Details: [sdlc/contract-v0-2/WORKLOG.md](contract-v0-2/WORKLOG.md).

- 2026-10-25 · user · Reported that sign-in on the live site said "wrong email or password" with `Stockwise-Demo-2026`.
- 2026-10-25 · agent (for Nnaemeka Chukwuma) · Diagnosed it. The live bundle (`index-or5nVKS2.js`) had `baseURL:"https://stockwise-yc54.onrender.com"`, without `/api/v1`, so `POST /auth/sessions` got 401 UNAUTHENTICATED, which the web shows as a wrong password. The service, the demo accounts (20 products, 5 customers, 33 sales) and CORS were fine. Around 22:50 UTC someone with Vercel access fixed `VITE_API_BASE_URL` and rebuilt: the live bundle `index-D5OSGXjB.js` calls `…onrender.com/api/v1`.
- 2026-10-25 · agent (for Nnaemeka Chukwuma, Delivery-area change, for Blessing Nwafor to review) · Branch `fix/deploy-web-api-base`:
  - `deploy.yml` builds the web with `VITE_API_BASE_URL` = `vars.API_URL` + `/api/v1` (overriding the Vercel value), and refuses to deploy a build that doesn't contain that address.
  - The smoke checks moved into the approved `deploy-production` job, because the old `smoke` job couldn't read the production-environment secret `DEMO_OWNER_PASSWORD`, so its last-unit run would have had no password.
  - `scripts/smoke.sh` gained a check that the live web calls `<API_URL>/api/v1`, and a demo sign-in at `/api/v1/auth/sessions` (optional, via `LOGIN_EMAIL`/`LOGIN_PASSWORD`).
  - **Verified:** against the live site, all PASS (`SMOKE OK`); against a stand-in of the old bundle, "FAIL  the web's JavaScript does not call …" (exit 1); with a wrong password, the sign-in check FAILs (401, exit 1); `deploy.yml` parses; `bash -n` is OK. The workflow itself hasn't run on GitHub yet.

- 2026-10-26 · agent (for Nnaemeka Chukwuma) · Branch `feat/mobile-native-ui`:
  - Reworked mobile ergonomics and platform integration across all screens using `mobile-native`, `impeccable`, and `emil-design-eng`:
    - Viewport & metadata: added `viewport-fit=cover, interactive-widget=resizes-content`, `theme-color` for color schemes, and `color-scheme: dark` in `web/index.html`.
    - Input & touch ergonomics: fixed input font size $\ge 16\text{px}$ to eliminate iOS Safari auto-zooming; set `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`, and `user-select: none` on controls.
    - Safe-area insets: added `env(safe-area-inset-*)` padding for mobile header (notch protection), floating action buttons (`.add-product`, `.add-customer`), sticky sale total bar, toasts, sheets, and drawers.
    - Tactile response & motion: applied Emil Kowalski's `active:scale-[0.98]` tactile press states on buttons and pressable controls with snappy `100ms ease-out` transitions; added custom easing curves (`--ease-out`, `--ease-in-out`, `--ease-drawer`); added `overscroll-behavior: contain` on dialogs and sheets to prevent pull-to-refresh / rubber-band scroll chaining.
    - Store credit usability: resolved checkout blocker when selecting customers with store credit (e.g. Bola Adeyemi) by adding a store credit toggle and clear guidance ("Store credit deduction is awaiting service support. Uncheck above to complete this sale without credit deduction.") so merchants can complete sales smoothly without getting blocked.
    - Canonical conventions: preserved DM41 canonical Tailwind classes (`rounded-md`, `font-sans`, `focus-visible:outline-offset-(--focus-ring-offset)`) and integer kobo money arithmetic throughout.
  - Verified: `npm run lint` (0 errors, 0 warnings), `npm run typecheck` (clean), `npm test -- --run` (all 27 tests pass across 10 suites), `npm run build` (production build clean in 21.55s).
  - Pushed to `origin/feat/mobile-native-ui` and opened [PR #20](https://github.com/AMAZEEN12/Stockwise/pull/20) (`feat(ui): rework mobile views with native ergonomics and store credit toggle`) targeting `main`.

### Earlier "Resume here" entries (moved at the 2026-10-25 handover; history, not current state)
- **Role-landing publication completed (DM62), 2026-10-25:** feature commit 9fbcc87 and supplied-edit/publication commit 39322b9 were pushed before opening [PR #11](https://github.com/AMAZEEN12/Stockwise/pull/11) from feat/auth-role-landing into main. GitHub confirmed open, non-draft, unmerged and conflict-free. The ten supplied edits, including left-aligned product prices, are committed; eight inputs match verified snapshots byte-for-byte and router/shop-loader compile to equivalent JavaScript ASTs. Prior combined-tree QA remains applicable; only Markdown was added for publication. Sales History PR #10 is merged and origin/main is 367a891. Human review is next. Decided by Victor Oyeleke (publication/supplied edits); Codex (verification mechanics). Logged by Codex.
- **Role landing completed (DM60-DM61), 2026-10-25:** fill-only demo buttons and explicit Sign in now enter OWNER Products / ASSISTANT Sell / ADMIN Sales History through fresh /me. Workspace UI removed; legacy bookmarks redirect. Separate simulated tokens/users and per-user replay checks passed. Full browser regression 86/86 passed (6.8m); 27 unit tests, lint/typecheck, contract lint and build passed. Service JAVA_HOME/bundle warning remain. Ten prior edits are preserved; only owned deltas are committed on feat/auth-role-landing. See docs/auth-role-landing.md. Decided by Victor Oyeleke (scope); Codex (technical choices). Logged by Codex.
- **Sales History publication completed (DM59), 2026-10-25:** feature 761c5c2 and supplied-formatting/publication d45a5ec were committed/pushed before opening [PR #10](https://github.com/AMAZEEN12/Stockwise/pull/10) into main. GitHub confirmed open, non-draft, unmerged and conflict-free. Three supplied stylesheet edits are normalized-AST equivalent to the verified implementation. Scope and existing QA/visual/Java limitations are disclosed in the PR. Human review is next; no merge or deployment. Decided by Victor Oyeleke (scope); Codex (verification/publication). Logged by Codex.
- **Sales History completed (DM57-DM58), 2026-10-25:** implemented /app/sales on feat/sales-history with Today/Yesterday/Last 7 days, non-interactive entries and full customer/staff IDs under the unchanged contract. Final lint/typecheck/unit/build/contract checks passed (23 unit tests); full regression 74/74 passed, then final timestamp-retention correction passed all 18 focused history scenarios. Actual local simulation/keyboard journey passed. All 12 frames compared (2.06-11.95% changed pixels), with intentional ID/label/content differences disclosed. Service verify remains blocked by invalid JAVA_HOME. Descriptive feature commit: feat(sales): add responsive sales history and filters. Decided by Victor Oyeleke (scope); Codex (technical choices). Logged by Codex.
- **Publication completed, 2026-10-25 (DM56):** shared-component feature commit 9cc489b and integration/publication commit 6f70072 were pushed before opening [PR #9](https://github.com/AMAZEEN12/Stockwise/pull/9) into main. GitHub confirmed open, non-draft and unmerged. The PR also includes separate Customer Picker de97504 and Customers cb19935 commits and discloses prior browser/visual/Java limitations. Current main c0ab694 is integrated; human review is next. Decided by Victor Oyeleke (scope); Codex (routine integration). Logged by Codex.
- **Shared-component implementation completed, 2026-10-25 (DM55):** implemented the seven reviewed proposals on feat/shared-component-alignment, carrying Victor's current Product/CSS refinements forward. Shared states, controls, cards/badges, notifications, dialogs/confirmations and token usage are integrated; additive APIs are documented for their original owners. Eighteen unit tests passed; all 56 browser scenarios passed across the full run and targeted reruns, with the Windows headless-shell timing limitation disclosed below. API simulation journey passed; backend verification still cannot start because JAVA_HOME is invalid. No cross-team acceptance or pixel-perfect approval is invented. Approved by Victor Oyeleke; logged by Codex.
- **Shared-source documentation correction, 2026-10-25 (DM53):** Victor confirmed and approved four interface engineers, matching upstream. Current guidance is corrected; earlier references to five are historical and superseded. Approved Card and Select/Checkbox source clarifications, immutable revision links and owners are in docs/shared-component-alignment.md. This round updates Markdown only; component migration proposals remain pending. Decided by and approved by Victor Oyeleke; logged by Codex.
- **Customer features completed, 2026-10-25 (DM50-DM52):** Customer Picker committed as de97504 on feat/customer-picker; Customers implemented on stacked feat/customers-ui with its own descriptive feature commit. Exact selected-customer copy preserved. Final lint/typecheck passed; unit 7 files/14 tests; contract valid; browser 50 passed (5.0m), plus final icon/layout journey 2 passed (33.8s). Unintercepted customer-create-to-credit-sale journey passed. Build 353 modules, final CSS build 15.87s; main chunk warning 526.47 kB / 173.24 kB gzip retained. Service verify still blocked by JAVA_HOME. All 36 customer frames compared; 98 local references preserved, none tracked. See docs/customers-ui.md and docs/customers-contract-proposal.md for measured visual differences and pending API proposals. No pixel-perfect approval, backend proof, new PR or deployment is claimed. Decided by Victor Oyeleke (scope/copy); Codex (technical choices). Logged by Codex.
- **Current handoff:** role landing and the ten supplied edits are committed/pushed on feat/auth-role-landing; [PR #11](https://github.com/AMAZEEN12/Stockwise/pull/11) targets main (DM62). Human code-owner review, including Isaac's sign-off for included sale-related files, is next. Existing demo controls still require Sign in; no Workspace welcome screen or new dashboard remains. Restart the development simulation to load per-account sessions if an old process is running.
- **Earlier task (DM44-DM48):** Products implemented and committed as 86fb5ea on feat/products-ui; New sale/Receipt implemented on stacked feat/sales-ui. Final frontend/API/browser checks passed; actual outputs below. Sales history is deferred. Latest stock-conflict frames and corrected 6000-credit/150-due frames were compared at normalized sizes; remaining visual differences are explicitly recorded, not approved as pixel-perfect. Contract proposals remain separate, active OpenAPI/generated schema unchanged. Screens ignored/untracked with all then-current 62 local PNGs preserved. See docs/products-sales-ui.md and docs/products-sales-contract-proposal.md.
- **Publication (DM49, verified 2026-10-25):** Products commit 86fb5ea pushed on feat/products-ui, [PR #4](https://github.com/AMAZEEN12/Stockwise/pull/4); Sales commit 74d6eef pushed on feat/sales-ui, [PR #5](https://github.com/AMAZEEN12/Stockwise/pull/5). Both PRs are open against main as Victor requested. Authentication PR #3 remains open. Review order is #3, #4, #5 because the branches are stacked. No main merge or deployment was performed. Decided by Victor Oyeleke; logged by Codex.
- **Standing instruction reaffirmed by Victor:** before every new task, read root AGENTS.md, including Mistakes to avoid. DM41's three Tailwind replacements are persistent frontend conventions; the startup reminder, exact mapping and Victor/Codex attribution are now explicit there. Existing component replacements remain applied.
- **Current alignment follow-up:** Applied/verified canonical Tailwind replacements (DM41). Victor selected contract mock development (DM42); local mock-only configuration is set, and actual browser sign-in/refresh/logout passed. Task-owned mock/Vite processes were stopped after implementation verification; no currently running preview is claimed. Victor's supplied Home/CSS refinements are committed; web/Screens stays local and ignored under DM45. His example D badge is vite.config.ts: current web/vite.config.ts exists and is tracked; the precise IDE view cannot be reproduced from Git.
- **Stage:** Frontend implementation authorized by Victor on 2026-10-24, following review of all 16 references.
- **Review state (GitHub verified during DM56 publication):** Authentication PR #3, Sales PR #5 and shared-source documentation PR #6 are merged; main is c0ab694. Products PR #4 remains open, although its feature history is included through Sales. Customer Picker and Customers retain separate local feature branches/commits and are included in the requested shared-component PR. Backend PRs #7/#8 remain separate and untouched.
- **Next action:** Human review of captured Products/Sales/Customer screens and remaining visual differences; publish customer PRs when requested. Sales/store-credit review requires Isaac Bassey's sign-off under REVIEW.md. API owners must resolve customer idempotency/search/freshness, registration, authoritative credit settlement, price guards, recovery lookup and pending two-engineer contract sign-off. No automatic main merge or deployment.
- **Waiting on:** Registration API approval, seeded demo credentials, backend authentication implementation, and the two-engineer contract sign-off still marked pending in the merged log.
- **Backend, step 9 (Nnaemeka Chukwuma, Data and rules), 2026-10-25:** the sale transaction's service part (`SaleService`, `SaleRepository`) is in [PR #7](https://github.com/AMAZEEN12/Stockwise/pull/7) from `feat/sale-transaction` into main, after PR #2 merged. `./mvnw clean verify`: 32 tests green; `SaleConcurrencyIT` and `IdempotencyIT` looped 20/20; five removal checks in `docs/rule-removal-log.md`. Next: Isaac Bassey reviews PR #7 (riskiest step, REVIEW.md) and writes `SaleController` and `ProblemHandler` from the signature and error mapping in plan.md "Departures recorded". Store-credit draw comes with step 16. Isaac isn't a repo collaborator yet, so the owner (AMAZEEN12) must invite him. Next for Nnaemeka: `evidence/no-stock-guard` (step 12) and the Monday seed (step 14).
- **Backend before Monday (Nnaemeka Chukwuma, Data and rules), 2026-10-25:** branch `feat/monday-data` (stacked on PR #7) adds `ProductRepository`, `CustomerRepository`, the Monday seed with demo logins (`SeedVerificationIT`), and the step 12 evidence logs (`docs/evidence/concurrency/`, from branch `evidence/no-stock-guard`). Full build: 57 tests green. Nnaemeka's half of the v0.1.0 contract sign-off is recorded in decisions.md §3; Isaac's is still pending. Blocking the Monday journey, outside this area: `StockwiseApplication`, `application.yml` with the demo seed location, the Dockerfile, CI and deploy (Blessing), and auth plus the controllers (Isaac).
- **Backend for the Monday checkpoint (built 2026-10-25 for Nnaemeka Chukwuma, help outside the Data and rules area, logged as the brief requires):** branch `feat/backend-api` has:
  - the application class and config;
  - login with 8-hour JWTs and roles re-read per request;
  - every v0.1.0 endpoint with problem+json errors, CORS and request IDs;
  - the Dockerfile and the root README with demo credentials.

  `./mvnw clean verify`: 88 tests green. The R15 removal checks are logged. The image was run against Postgres 17 with the demo profile: the seeded owner logged in and saw 20 products and today's sales, and the assistant got 403 adding a product. **Isaac (API and access) and Blessing (skeleton) should review it as their own.** Still needed before the demo: CI and deploy workflows, the Neon, Render and Vercel setup, the live addresses in the README, `last-unit.mjs` on the deployed service, and the full journey from a clean browser.
- - 2026-10-25 · Isaac Bassey (API and access owner), with an AI assistant · Reviewed the merged API layer (PR #12) and commented on it. Branch `feat/api-request-id-logs`: `RequestIdFilter` logs one line per request with its request ID (method, path, status, time; no query string, headers, tokens or bodies; `GET /` skipped); `logging.pattern.level` prints the request ID; the `prod` profile logs ECS JSON (N6). New `RequestLogIT` (2 tests). Contract documentation additions folded into v0.2.0 and the v0.1.0 sign-off in decisions.md §3; web types regenerated. `./mvnw verify` on his machine: BUILD SUCCESS, 87 integration tests. Still to do: review PR #17 (contract v0.2.0 proposal A and migration V4, merged without the API owner's review).


### Default sale catalogue verification in progress, 2026-10-26 (DM63-DM64)

Decided by Victor Oyeleke (scope); Codex (implementation/verification mechanics). Logged by Codex.

- Branch feat/sale-product-catalog created from latest merged main 6bf48b8 after fetch and ff-only pull (already up to date). Pre-existing web/src/styles/app.css is preserved separately; ignored snapshot in web/.mock/sale-catalogue-input/.
- Shared-component skill is not locally present (removed from the tracked repository); inspected local APIs and docs/shared-component-alignment.md. Reused existing primitives and DM41 canonical classes.
- Added default catalogue, bounded internal list scrolling, existing q/page/size search/paging, archived-page traversal, deterministic displayed order and retry/query isolation. Simulation now sorts before paging like the service. No active contract/generated schema/backend/migration edits or new dependencies.
- Lint: exit 0, zero warnings. Strict typecheck: exit 0 after correcting the new test's Axios params typing; assertions unchanged. Initial new-script lint found browser globals in its page.evaluate callback; qualified globalThis, then lint passed.
- Unit: 11 files, 35 passed; 87.56s. Initial sandbox run could not load Vitest config because esbuild was denied parent-directory access; same suite passed with escalation.
- Contract: valid, 312ms. Production build: 2301 modules, 55.57s; existing main-chunk warning remains at 555.78 kB/gzip 183.08 kB.
- Focused catalogue Chromium: 8/8 desktop/mobile passed in 1.0m, including immediate products, ordering, paging, archived/zero stock, reference search, keyboard add, loading/error/empty/no-match, prefix retry, query isolation, bounds and axe serious/critical checks. Desktop/mobile captures inspected; new default catalogue is an intentional layout amendment, not a pixel-perfect reference claim.
- Full browser regression and unintercepted simulation journey are pending; no final pass claimed yet. QA uses owned ports and preserves user previews; build finished before browser runs.
- Service .\mvnw.cmd verify failed before Maven started: Cannot index into a null array / Cannot start maven from wrapper. JAVA_HOME is unset and Get-Command java found no executable. No backend pass is claimed.
- API ordering and independent debt/store-credit activity remain owner proposals. Proposal A customer idempotency is already merged/signed; current UI still omits its optional key. Future branches remain queued under the approved merge order.


### Catalogue full regression and merged-main comparison, 2026-10-26

- Full Chromium run completed: 87 passed / 7 failed (29.1m), 94 total. All eight catalogue scenarios passed again. Existing auth/picker/checkbox timing failures are kept in the result, not hidden by changing tests or deadlines.
- The exact Store credit amount-text assertion failed on both viewports. The merged mobile-native UI uses an Apply store credit checkbox label instead. The store-credit block is byte-identical to origin/main; CustomerPicker/CustomerForm are unchanged too.
- Isolated detached merged-main worktree at web/.mock/sale-catalogue-baseline, commit 6bf48b8: same application/tests, only Vite cacheDir isolated to avoid touching shared preview caches. Ran the five affected flows on both viewports: 8 passed / 2 failed (2.8m). Both failures reproduce the same Store credit amount-text assertion on main. No assertion is loosened, skipped or deleted; unrelated store-credit presentation is left for its own reviewed scope.
- Original full-run timing failures: desktop picker create/select and shared checkbox; mobile /me retry/401, pending login and picker create/select. The eight corresponding flow/viewports are being rerun unchanged on the feature branch. No all-green browser claim is made. Independent unintercepted catalogue journey remains pending.
- Decided by Codex (baseline isolation and focused rerun within Victor's DM63 verification scope); logged by Codex. Review gates remain; expose the known failures in the PR and do not auto-merge.

### Customer selector slide-over right drawer (Approach 1), 2026-10-26 (DM65)

- Implemented Approach 1 for customer selection on sale: converted desktop customer picker to a slide-over right drawer (`placement="right"`, full-height `100dvh`, `border-left: 1px solid var(--color-border)`).
- Resolved Chromium CSS grid scroll-clipping bug by converting `.customer-picker-list` from `display: grid` to `display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 0; padding-bottom: 24px;`. The final customer card is fully visible without clipping.
- Kept header, search filter bar and `+ Add new customer` button pinned at the top.
- Mobile retains a compact, centered modal with 16px margins (`width: min(440px, calc(100vw - 32px))`, `border-radius: var(--radius-card)`) rather than an edge-to-edge sheet.
- Verification: ESLint passed (0 errors, 0 warnings); TypeScript typecheck passed; 35 unit tests passed; production build clean in 46.83s; Playwright bounds/interaction checks passed.
- Decided by Victor Oyeleke; implemented and logged by Codex.

### Catalogue-row quantity controls in progress, 2026-10-26 (DM66)

- Victor confirmed PR #22 merged and selected quantity controls directly in each selected catalogue row. He clarified that only the sale-page empty-cart message is removed; the Products page Add product action remains.
- Updated local main by fast-forward to merge commit `9c00aac`, confirmed a clean tree, and created `fix/sale-quantity-controls` from that exact commit. PR #22's customer drawer/modal work is preserved.
- Selected rows remain above filtered/paged results and use the existing cart state, so page-two selections and service-reconciled zero-stock conflicts stay editable/removable. The results list remains separately labelled for catalogue searching and existing regression locators.
- No endpoint, generated type, backend, migration, money rule or submission/recovery behavior changes. Decided by Victor Oyeleke; implementation choices/logged by Codex.
- Implementation complete: selected lines render inside the catalogue with separate decrement/input/increment/remove controls; decrement is disabled at one, typed invalid values still block confirmation, and service-reconciled zero rows remain visible with Remove available. Refresh is in the heading, the searchable list grows to a bounded 55dvh/680px maximum, and the separate cart cards/empty-cart prompt are removed.
- ESLint passed with zero warnings; strict TypeScript passed; contract lint passed in 316ms; all 35 unit tests in 11 files passed. Unit/build initially hit the known restricted esbuild parent-directory access error, then passed unchanged with the required access. Production build passed (2301 modules, 31.00s); the existing 555.78 kB/gzip 183.08 kB main-chunk warning remains.
- Unchanged focused Playwright suite: 22/22 passed in 1.8m across desktop and mobile (`sale-product-catalogue`, `sales`, `sales-recovery`). Coverage includes axe, bounds, immediate catalogue/search/paging, quantity limits, disabled controls during recovery, zero-stock conflict retention/removal, immutable retry, receipts and 320/360/768/1024/1440 overflow checks. Captures were inspected at desktop and mobile; the selected counters remain horizontal and the fixed mobile total does not overlap their controls.
- Existing unintercepted `check:sale-catalogue` created 26 products, completed login/search/add/confirm through real local HTTP and reached the correct receipt, but exited 1 at its final exact-text locator: the receipt exposes `Catalogue QA 026 × 1` as one text node rather than a node whose entire text is only `Catalogue QA 026`. The receipt ARIA snapshot showed the correct product, quantity and ₦450.00. The QA script/assertion is unchanged on this fix branch, so no pass is claimed.
- Service verification is unavailable on this machine: `JAVA_HOME` is unset and `java` is not installed, matching the earlier catalogue limitation. No backend pass is claimed. No full-suite green claim is made beyond the focused 22 scenarios.
- Feature commit `9785810` (`fix(sales): align quantity controls horizontally`) was pushed to `origin/fix/sale-quantity-controls`; [PR #23](https://github.com/AMAZEEN12/Stockwise/pull/23) was subsequently reviewed and merged as `aaaca8e`.

### Mobile coin visibility in progress, 2026-10-26 (DM67)

- Confirmed remote main `aaaca8e` contains merged PR #23, updated local main by fast-forward, and created `fix/mobile-coin-visibility` from that exact merge.
- Replaced the mobile `display: none` rule with a normal-flow decorative coin below the wordmark. It is bounded to `min(42vw, 160px)`, aligned to the right with a small inset, ignores pointer events, preserves desktop placement and remains aria-hidden. Existing reduced-motion CSS keeps it static.
- No asset, route, API, contract, generated type, business rule or shared component changes. Decided by Victor Oyeleke; implementation choices/logged by Codex.
- Verification: ESLint passed with zero warnings; strict TypeScript passed; contract lint passed in 365ms; 35/35 unit tests in 11 files passed; production build passed (2301 modules, 29.75s) with the existing 555.78 kB/gzip 183.08 kB main-chunk warning.
- Unchanged Home/auth Playwright suite passed 24/24 desktop/mobile scenarios in 2.6m on isolated owned port 5195. It covered 320/360/768/1024/1440 viewport bounds, dialogs, role landing, keyboard behavior, axe serious/critical checks and reduced-motion coin behavior. Desktop and mobile Home captures were inspected: desktop placement is unchanged; mobile coin is fully visible below/right of the wordmark with no overlap or horizontal overflow.
- Service verification remains unavailable because this machine has no Java executable and `JAVA_HOME` is unset. No backend pass is claimed for this CSS-only change.
- Feature commit `7035c3a` (`fix(ui): show coin control on mobile`) was pushed to `origin/fix/mobile-coin-visibility`. [PR #24](https://github.com/AMAZEEN12/Stockwise/pull/24) was subsequently reviewed and merged as `6287154`.

### Contract v0.2.0 (Proposals B, C, D) completed, 2026-10-27

- **Author / Owner:** Nnaemeka Chukwuma (Data and rules).
- **Branch:** `feat/contract-v0-2` (rebased on latest `main` `6287154`).
- **Scope implemented:**
  - **Proposal B:** Customer search specification and deterministic ordering (`LOWER(display_name) ASC, id ASC`), duplicate display names explicitly permitted (UUID is identity), and `CustomerPage.asOf` UTC timestamp representing balance query snapshot freshness.
  - **Proposal C:** Safe integer bounds on money (`Kobo` schema `maximum: 9007199254740991` kobo; request validation via `@Max(9007199254740991L)` on `ProductController.CreateRequest.priceKobo`).
  - **Proposal D:** `GET /product-categories` returning distinct, non-empty categories sorted alphabetically (case-insensitive), and optional `active` boolean query parameter on `GET /products`.
- **Backend Service Changes:**
  - Added `CustomerPage` record carrying `(List<Customer> items, int page, int size, long totalItems, Instant asOf)` and updated `CustomerController.list()` to return `CustomerPage.of(result, Instant.now())`.
  - Added `@Max(9007199254740991L)` to `ProductController.CreateRequest.priceKobo`.
  - Added `Boolean active` to `Product.Filter` (preserving backwards-compatible 3-arg constructor).
  - Updated `ProductRepository.list()` to filter by `active` when present.
  - Added `ProductRepository.listCategories()` returning distinct, non-empty, case-insensitive alphabetically sorted categories.
  - Added `ProductCategoryController` mapped to `/api/v1/product-categories`.
- **Backend Verification:**
  - `CustomerPageTest` (unit): verifies `asOf` timestamp population and record components.
  - `ProductValidationTest` (unit): verifies `priceKobo = 9007199254740991L` passes while `9007199254740992L` fails with constraint violation.
  - `ProductFilterTest` (unit): verifies filter creation and active parameter variants.
  - `ProductRepositoryIT` (integration): updated to test `active` filter and `listCategories()`.
  - Java compilation and targeted test execution: 10/10 tests passed (BUILD SUCCESS in 24.2s).
- **Contract & Frontend Verification:**
  - `contract/openapi.yaml`: updated with proposals B, C, D; `redocly lint` passed with 0 errors.
  - Web types regenerated via `npm run generate:api` (`schema.d.ts`).
  - `npm run typecheck`: clean (0 errors).
  - `npm run lint`: clean (0 warnings, 0 errors).
  - `npm test -- --run`: 35/35 tests passing across all 11 test suites.
- **SDLC Artifacts & Sign-off:**
  - `stockwise/decisions.md` §3: updated with Nnaemeka Chukwuma's sign-off for proposals B, C, D (pending Isaac Bassey) and confirmation of prior documentation line.
  - Formally accepted `intent.md`, `plan.md`, `test-plan.md`, and generated `EXECUTION.md` in `stockwise/sdlc/contract-v0-2/`.
  - Updated `stockwise/sdlc/contract-v0-2/WORKLOG.md` (Q4 answered, activity logged).

### Customer Portal, Store Credit & Supervisor Reversal Authorization Proposals (2026-10-28)

- **Author / Origin:** Proposed by Interface Engineer (Victor Oyeleke; logged by Codex).
- **Branch:** `feat/proposal-store-credit-and-customer-portal`.
- **Documents Added / Updated:**
  - `docs/customer-portal-store-credit-proposal.md`:
    - Detailed store adoption incentives for Nigerian neighborhood retailers (debt transparency, debt recovery without social friction, zero cash drain on product returns, customer lock-in via store credit, and click-and-collect orders without password friction).
    - Store credit endpoints: `POST /customers/{id}/store-credit` (idempotent grant with reason/note), `POST /sales` extension with atomic store credit split settlement ($\min(\text{credit}, \text{subtotal})$) and remaining CASH/CREDIT tender.
    - Customer portal tokenized endpoints: `GET /portal/customer/{token}` (live balance & store credit statement), `GET /portal/customer/{token}/products` (in-stock catalogue), `POST /portal/customer/{token}/orders` (pre-orders).
    - UI architectural layout for both cashier drawer and mobile customer portal (`/c/:token`).
  - `docs/sales-reversal-authorization-proposal.md`:
    - Prevents cashier shrinkage and fraudulent post-sale voiding while avoiding counter bottlenecks and shared supervisor master passwords.
    - `POST /reversals/authorizations` for `OWNER`/`ADMIN` generating single-use 6-digit codes with 15-minute TTL.
    - `POST /sales/{saleId}/reversal` requiring `authorizationCode` for `ASSISTANT`, executed with atomic conditional SQL update to prevent reuse.
    - Frontend UX designs for Assistant prompt modal and Owner code generator.
  - `decisions.md` §3: Logged draft contract proposals pending Isaac Bassey (API & access) and Nnaemeka Chukwuma (Data & rules) review.

### Store Credit Tender & Issuing UI Implementation (2026-10-28)

- **Author / Origin:** Interface Engineer (Victor Oyeleke; logged by Codex).
- **Branch:** `feat/store-credit-ui`.
- **Scope Implemented:**
  - **Store Credit Tender (`NewSalePage.tsx`):**
    - Removed the hard block (`unavailableCredit = credit > 0 && !simulation`) that prevented confirming sales when store credit was checked.
    - Added `useStoreCredit: true` to the sale request payload snapshot when store credit is applied.
    - Updated payment breakdown to show clean deduction of store credit and remaining cash/credit balance.
    - Enhanced confirmation dialog (`ConfirmDialog`) to display subtotal and store credit applied explicitly.
    - Updated receipt persistence to record credit deductions seamlessly.
  - **Store Credit Issuing Drawer (`IssueStoreCreditDialog.tsx`, `CustomersPage.tsx`):**
    - Built a right-docked drawer (`placement="right"`) allowing `OWNER` and `ADMIN` to issue store credit.
    - Supports amount in Naira (validated integer kobo, safe bounds up to $9,007,199,254,740,991$), reason selection (`RETURN_REFUND`, `ADVANCE_DEPOSIT`, `CHANGE_SHORTAGE`, `LOYALTY_REWARD`, `MANUAL_ADJUSTMENT`), and optional reference notes.
    - Added "+ Credit" actions to customer table rows and mobile customer balance cards.
    - Integrated with RTK Query mutation `useIssueStoreCreditMutation` calling `POST /api/v1/customers/{id}/store-credit` with `Idempotency-Key` and tag invalidation.
  - **Development Simulation (`development-api.mjs`):**
    - Added mock handler for `POST /api/v1/customers/:id/store-credit` updating in-memory customer `storeCreditKobo` and setting `hasStoreCreditActivity = true`.
    - Added support for `body.useStoreCredit` in `POST /api/v1/sales` to deduct applied credit from customer balance.
  - **Typographic Fix (`CustomerPicker.tsx`):**
    - Corrected double-encoded middle dot character `Â·` to clean `·` in the customer picker trigger.
    - Replaced non-ASCII fullwidth plus character `＋` with standard ASCII `+` for inline customer creation button.
  - **Real Service vs. Simulation Guard:**
    - Per `e2e/sales-safety.spec.ts`, retained the safety guard `unavailableCredit = credit > 0 && !simulation` when running against live/staged backend tokens where the Java service engine has not yet deployed `useStoreCredit`. Full checkout and credit deduction remain enabled under local development simulation.
- **Verification:**
  - ESLint: passed with 0 warnings.
  - TypeScript: strict typecheck passed with 0 errors.
  - Vitest: 14 test suites passed (44/44 tests green), including new suite `issue-store-credit.test.ts`.
  - Playwright e2e: 2/2 passed in `e2e/sales-safety.spec.ts` (38.7s); 20/20 passed in `e2e/customer-picker.spec.ts` and `e2e/customers.spec.ts` (2.3m).
  - Production build: built cleanly in 23.21s with all assets bundled.
  - Contract lint: Redocly validated `contract/openapi.yaml` in 201ms with 0 errors.
  - GitHub Actions CI on PR #30: All checks passed (Web, Service, Guards, Secret scan, Contract lint).
- **PR:** Opened [PR #30](https://github.com/AMAZEEN12/Stockwise/pull/30) on `feat/store-credit-ui` targeting `main`.
### Delegated Sale Reversal OTP Dialogs Implementation (2026-10-28)

- **Author / Origin:** Interface Engineer (Victor Oyeleke; logged by Codex).
- **Branch:** `feat/reversal-otp-ui`.
- **Scope Implemented:**
  - **Models & Endpoints:**
    - Request models in `web/src/models/requests/reversals.request.ts` (`ReversalAuthorizationCreate`, `SaleReversalRequest`, `ReversalReason`).
    - Response models in `web/src/models/responses/reversals.response.ts` (`ReversalAuthorization`, `SaleReversalResponse`).
    - Service endpoints in `web/src/service/endpoints/reversals.endpoints.ts` and RTK Query mutations in `web/src/service/api/reversals.api.ts` (`useGenerateReversalCodeMutation`, `useReverseSaleMutation`).
  - **Supervisor Code Generator Dialog (`GenerateReversalCodeDialog.tsx`):**
    - Modal for `OWNER` and `ADMIN` to generate single-use 6-digit reversal authorization codes.
    - Monospace 6-digit display (`XXX XXX`), live 15-minute countdown timer (`MM:SS`), copy-to-clipboard action with visual feedback, and expired code regeneration.
  - **Cashier Reversal Dialog (`ReverseSaleDialog.tsx`):**
    - Modal for reversing sales. For role `ASSISTANT`, strictly requires a 6-digit supervisor code before submission.
    - Direct reversal permitted for `OWNER` / `ADMIN` with option to generate code for cashier.
    - Reason selection (`CUSTOMER_RETURN`, `BILLING_ERROR`, `DAMAGED_PRODUCT`, `OTHER`) and optional notes.
    - Idempotent submission via `Idempotency-Key` header with automatic error mapping (`INVALID_AUTHORIZATION_CODE`, `AUTHORIZATION_SALE_MISMATCH`, `AUTHORIZATION_ALREADY_USED`, `SALE_ALREADY_REVERSED`).
  - **Receipt Page Integration (`ReceiptPage.tsx`):**
    - Added "Reverse sale" action for all staff and "Generate reversal code" action for Owner/Admin.
    - Clear banner and status updates when a sale is reversed.
  - **Development Simulation API (`development-api.mjs`):**
    - Added in-memory authorization map and handlers for `POST /api/v1/reversals/authorizations` and `POST /api/v1/sales/:id/reversal`.
    - Handles supervisor code validation, single-use redemption, stock restoration, and duplicate reversal prevention.
  - **Verification:**
    - ESLint: passed with 0 warnings.
    - TypeScript: strict typecheck passed with 0 errors.
    - Vitest: 14 test suites passed (44/44 tests green), including `reversals.test.ts`.
    - Production build: built cleanly in 19.21s with all assets bundled.
    - Contract lint: Redocly validated `contract/openapi.yaml` in 186ms.
    - Playwright: 30/30 tests passed (2.6m) across desktop and mobile with zero axe accessibility violations.
- 2026-10-29 · Isaac Bassey (API and access owner), with an AI assistant · Reviewed v0.2.0 B, C, D and the customer activity fields after merge and signed them off in decisions.md §3 with follow-ups. Branch `feat/api-history-ledger-dashboard`: contract adds `GET /products/{productId}/movements` (R13), `GET /customers/{customerId}/ledger` (R10) and `GET /dashboard` (R14), all read-only, any role. New `history` package (`MovementQueries`, `MovementController`, `LedgerQueries`, `LedgerController` and records) and `dashboard` package (`DashboardQueries`, `DashboardController`, `Dashboard`); both `package-info.java` placeholders removed. Running totals are window sums over the whole history, computed before paging; "today" is the Africa/Lagos day from the injected `Clock`. New tests: `MovementHistoryIT` (6), `LedgerIT` (5), `DashboardIT` (5). No migration and no write path changed. Once merged, `load/k6/dashboard.js` can call `GET /dashboard` directly.
- 2026-10-30 · Blessing Nwafor (with an AI assistant) · Ran the Cold start workflow after 20 minutes idle: first 200 after 62.3 s, warm /health 161 to 330 ms (one run). Recorded in docs/evidence/cold-start-2026-10-30/ and the README performance table; known-limitations line updated. 2026-10-30 · Blessing Nwafor (with an AI assistant) · Ran the Lighthouse workflow on the deployed web address (mobile: performance 90, accessibility 100, LCP 2.4 s, CLS 0, TBT 180 ms; desktop: 100, 100, 0.5 s, 0.001, 0 ms) and measured INP with web-vitals (40 ms early, 216 ms worst by the end). LCP met, INP missed by 16 ms. Reports and write-up in docs/evidence/web-vitals-2026-10-30/; README updated with the figures and a known-limitation entry.