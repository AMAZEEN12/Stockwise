# Stockwise decisions file

Team 3 · Main product · Started 2026-10-23

This file is the brief's required "decisions file". It has three parts:
1. **Decisions to make or confirm.** Open items the team, or the supervisor, must settle. Each has options, the cost of each, and who decides.
2. **Decisions made.** Settled choices, append-only.
3. **Contract change log.** Every change to `contract/openapi.yaml`: a dated line saying what changed, why, and **which two engineers agreed it**.

Every entry records **who decided** (for example Team 3, a named engineer, or the supervisor) and **who logged it**, as separate columns. Decisions DM1-DM11 were made by Team 3 together and logged by Nnaemeka Chukwuma.

Frontend decisions DM32-DM36 were made by Victor Oyeleke on 2026-10-24 and logged by Codex as the logging assistant. Nnaemeka Chukwuma remains the existing decision-log owner. These entries do not imply approval by Team 3, the supervisor or the other interface engineers.

When a pending decision is settled, move it to "Decisions made" with the date and the deciders, and update [spec.md](sdlc/spec.md) and the work log ([sdlc/WORKLOG.md](sdlc/WORKLOG.md)).

## 1. Decisions to make or confirm

### PD1: Reversing a credit sale that has already been partly repaid (design problem)
**Who decides:** Goodnews (confirm that this is Stockwise's design problem) and Team 3 (choose the option). **Status:** resolved → DM5 (option C, store credit); supervisor confirmation of the problem still pending

The brief names no "design problem with no clean answer" for Stockwise, unlike the other three main products. Proposed problem: a customer buys ₦10,000 on credit and repays ₦6,000, then the sale is reversed. The balance would become -₦6,000, meaning the shop owes the customer.

| Option | Behaviour | Cost | What would make us reverse it |
|----|----|----|----|
| A. Allow, record refund owed | Reversal goes through. The balance goes negative and is shown as "shop owes customer ₦X". A later refund entry or new credit sale settles it. | Negative balances need careful wording. The dashboard needs a separate "owed to customers" total. The `balance ≥ 0` check can't be a simple CHECK constraint. | Owners misreading negative balances as debt in testing. |
| B. Block the reversal | Refused until the repayments are reversed first. `CHECK (balance_kobo >= 0)` holds. | Two or more steps for the assistant. Cash that was really received is awkward to represent. | Assistants repeatedly reversing repayments that really happened, just to unblock. |
| C. Convert to store credit | The excess becomes store credit, applied automatically to the next sale. | An extra entry type and auto-application logic in the sale transaction. More to test. | Customers wanting cash back rather than credit. |

Until this is decided, the service refuses this case with `409 REVERSAL_NEEDS_DECISION`, and the UI and README label it as an open decision.

### PD2: Final submission date
**Who decides:** facilitators (via Goodnews). **Status:** resolved → DM6. We are planning for **Tue 3 Nov 2026** (Day 14, counting Wed 21 Oct as Day 1).

### PD3: Team 3 lead
**Who decides:** Team 3. **Status:** resolved → DM7 (Isaac Bassey). The brief says to designate one lead to coordinate both projects. No one is pre-assigned.

### PD4: Service area split
**Who decides:** Team 3 (record on day 1). **Status:** resolved → DM8.
Areas: *Data and rules* · *API and access* · *Delivery and evidence*, among Blessing Nwafor, Isaac Bassey and Nnaemeka Chukwuma. Nnaemeka intends to work across all service areas. A named owner per area is still needed for the rubric's "Your own contribution" (spec concern C6).

### PD5: Hosting accounts and free-tier verification
**Who decides:** Delivery and evidence owner. **Status:** resolved → DM9 (both stacks in parallel). Still open: **PD5a** who funds the Qocent credits (Unknown yet; owners Isaac Bassey and Goodnews), **PD5b** the Qocent day-1 spike results (owner Blessing Nwafor), **PD5c** Render workspace per product or shared (owner Blessing Nwafor).
Plan: Vercel (interface), Render (service), Neon (Postgres). To do: read each provider's own pricing page, record what was found with the date in the README, and decide one account or several for Stockwise and Genie, given monthly instance hours and project limits.

### PD6: Role permission matrix and who may reverse
**Who decides:** Team 3. **Status:** resolved → DM10.
Proposed: OWNER can do everything. ASSISTANT can read, record sales, create customers and record repayments. ADMIN is read-only. **Only OWNER can create reversals.** Alternative: let ASSISTANT reverse their own entries made the same day.

### PD7: Which action updates the screen before the service answers
**Who decides:** Victor Oyeleke (interface) with the API owner. **Status:** resolved → DM11 (archive/unarchive).
Candidates: (a) archive or unarchive a product, which is low risk and refused on a version conflict; (b) record a repayment, which is refused when it exceeds the balance and so demonstrates rollback well, but is optimistic about money; (c) add to cart. Must state "which action and why".

### PD8: Performance targets
**Who decides:** Team 3. **Status:** resolved → DM12 (standard targets).
Proposed: `POST /sales` p95 ≤ 500 ms and `GET /dashboard` p95 ≤ 800 ms on a warm instance. LCP ≤ 2.5 s and INP ≤ 200 ms on the deployed address.

### PD9: How migrations are reversed
**Who decides:** Delivery and evidence owner. **Status:** resolved → DM13 (Flyway + undo scripts).
Flyway Community has no undo migrations (that is a paid feature). Options: (a) a hand-written rollback script per migration, tested up, down, up in CI; (b) Liquibase, whose free edition supports rollback; (c) forward-only compensating migrations, documented.

### PD10: Time zone for "today"
**Who decides:** Team 3. **Status:** resolved → DM14. Proposed: store UTC and compute "today" in Africa/Lagos (WAT, UTC+1).

### PD11: Access-token lifetime
**Who decides:** API and access owner. **Status:** resolved → DM15 (8 hours). Originally proposed: 60 minutes, no refresh token for the MVP (the user logs in again).

### PD12: Seed-data subset for Monday
**Who decides:** Data and rules owner. **Status:** resolved → DM16. Proposed: 20 products (including zero-stock, at-threshold and archived), 5 customers (one with credit), 7 days of sales, and one demo account per role. The full volumes (120 / 60 days / 14) come after Monday.

### PD13: Cross-team shared-component agreement
**Who decides:** the five interface engineers together, as reported by Victor. **Status:** resolved on 2026-10-24 → DM37. The earlier pending proposal below is retained as historical context; DM37 records the adopted copy-in source.

The eight-page `shared-component-set-plan.pdf` is a proposal. Radix, copy-in distribution, component interfaces, the work split and dates are not accepted commitments. Shadcn is not a Stockwise requirement (DM35). Record the actual agreed foundation, token names, Formik/Yup compatibility, component interfaces, distribution and approving engineers before adoption. Do not create a shared repository or assign Victor Dialog/Toast based only on the PDF.

### PD14: Phase 3 interface behavior and design details
**Who decides:** Victor Oyeleke, with Isaac Bassey for contract/session behavior and Team 3 for any change to business rules. **Status:** UNRESOLVED; align before implementing affected behavior.

Questions include session persistence and expiry during pending writes, recovery of submission keys after refresh, retry policy, changed stock/prices during checkout, store-credit presentation, login state details, safe client money limits, and missing design tokens/assets. See [frontend architecture](docs/frontend-architecture.md#pending-agreement-and-phase-3-questions). Existing permissions, eight-hour tokens without refresh tokens, integer kobo and safe-retry rules remain in force.

## 2. Decisions made
| ID | Date | Decision | Reason | Decided by | Logged by |
|----|------|----------|--------|------------|-----------|
| DM1 | 2026-10-23 | Service stack: Java 25, Spring Boot 4, Flyway, JUnit + Testcontainers, PostgreSQL | Team choice | Team 3 | Nnaemeka Chukwuma |
| DM2 | 2026-10-23 | Hosting plan: Vercel + Render + Neon (subject to the PD5 verification) | Free tiers that fit a static app, a container service and Postgres | Team 3 | Nnaemeka Chukwuma |
| DM3 | 2026-10-23 | Authentication: email + password (bcrypt), JWT bearer token, roles OWNER / ASSISTANT / ADMIN enforced in the service | Simple to test with direct service calls. No CSRF or cross-site cookie setup | Team 3 | Nnaemeka Chukwuma |
| DM4 | 2026-10-23 | Idempotency: a client-generated `Idempotency-Key` on POST /sales, /restocks and /repayments, stored under a unique constraint | The brief requires a duplicate sale to be recorded once | Team 3 (confirmed at spec acceptance) | Nnaemeka Chukwuma |
| DM5 | 2026-10-23 | **PD1 resolved: option C, convert to store credit.** Reversing a partly repaid credit sale turns the excess repaid amount into store credit, applied automatically to the customer's next sale. Supervisor (Goodnews) still to confirm this is Stockwise's design problem | Keeps balances non-negative while honouring cash already received | Team 3 | Nnaemeka Chukwuma |
| DM6 | 2026-10-23 | **PD2 resolved:** final submission Tue 3 Nov 2026. The MVP presentation on Mon 26 Oct 2026 stays the nearer milestone | Team plan | Team 3 | Nnaemeka Chukwuma |
| DM7 | 2026-10-23 | **PD3 resolved:** team lead is Isaac Bassey (also gives technical sign-off on high-risk items) | Team choice | Team 3 | Nnaemeka Chukwuma |
| DM8 | 2026-10-23 | **PD4 resolved:** Nnaemeka Chukwuma owns Data and rules. Isaac Bassey owns API and access. Blessing Nwafor owns Delivery and evidence. Help across areas is logged | Rubric "Your own contribution" needs named owners | Team 3 | Nnaemeka Chukwuma |
| DM9 | 2026-10-23 | **PD5 resolved:** both hosting stacks run in parallel (Stack Q: Qocent + Neon; Stack V: Vercel + Render + Neon), sharing one Neon database per product. Stack V is the official README address until PD5a is settled. See `deploy-plan.md` | Team wants both stacks available | Team 3 | Nnaemeka Chukwuma |
| DM10 | 2026-10-23 | **PD6 resolved:** OWNER and ADMIN both have full reversal access. ADMIN is otherwise read-only. ASSISTANT can read, record sales, create customers and record repayments | Team choice | Team 3 | Nnaemeka Chukwuma |
| DM11 | 2026-10-23 | **PD7 resolved:** the optimistic action is archive/unarchive product. It reverts with a message on 412 version conflict or 403 | No money at risk if briefly wrong; easy two-tab demo | Team 3 (Victor Oyeleke to confirm the interface detail) | Nnaemeka Chukwuma |
| DM12 | 2026-10-23 | **PD8 resolved:** standard targets. `POST /sales` p95 ≤ 500 ms, `GET /dashboard` p95 ≤ 800 ms (warm service), LCP ≤ 2.5 s, INP ≤ 200 ms on the deployed address. Cold start reported separately | Google's "good" thresholds; realistic on warm free tiers | Victor Oyeleke | Nnaemeka Chukwuma |
| DM13 | 2026-10-23 | **PD9 resolved:** keep Flyway Community. Every `V<n>__*.sql` gets a hand-written undo script in `db/rollback/U<n>__*.sql`, and CI tests up → down → up against Testcontainers. Resolves spec concern C1 | Keeps DM1 and plain SQL; reversible as the brief requires | Team 3 | Nnaemeka Chukwuma |
| DM14 | 2026-10-23 | **PD10 resolved:** store all timestamps in UTC (`timestamptz`). "Today" and date filters use Africa/Lagos (WAT, UTC+1) day boundaries | Dashboard totals match what the counter saw; one shop, one zone | Team 3 | Nnaemeka Chukwuma |
| DM15 | 2026-10-23 | **PD11 resolved:** JWT access tokens last 8 hours (one trading shift), with no refresh token for the MVP. The role is re-read from the database on each request, so demotion applies at once | An assistant is never logged out mid-sale. Accepted cost: a stolen token works for up to 8 h | Team 3 | Nnaemeka Chukwuma |
| DM16 | 2026-10-23 | **PD12 resolved:** Monday seed is 20 products (including zero-stock, at-threshold, archived and a very long name), 5 customers (one owing, one with store credit), 7 days of sales, one login per role. Full volumes (120 products / 60 days / 14 credit customers) after Monday | Demos every rule without delaying the Monday journey | Nnaemeka Chukwuma | Nnaemeka Chukwuma |
| DM17 | 2026-10-23 | Build tool: Maven with a committed wrapper (`./mvnw`) | Installed locally; Spring Initializr default; most Flyway and Testcontainers examples | Blessing Nwafor | Nnaemeka Chukwuma |
| DM18 | 2026-10-23 | Data access: Spring `JdbcClient` with hand-written SQL (no JPA) | Every concurrency guard is one visible SQL statement, easy to remove for the failing-test demo and to explain; no ORM caching hiding races | Nnaemeka Chukwuma | Nnaemeka Chukwuma |
| DM19 | 2026-10-23 | Two GitHub repositories: one for Stockwise (the `stockwise/` folder) and one for Genie (`genie/`). The parent folder is a local workspace only, not a repository | Each product deploys and is assessed on its own | Team 3 | Nnaemeka Chukwuma |
| DM20 | 2026-10-23 | Each repository carries its own SDLC artifacts (`sdlc/`), `AGENTS.md`, `REVIEW.md`, `decisions.md` and deploy plan, updated independently. Nothing is synced between them | The two products have different artifacts | Team 3 | Nnaemeka Chukwuma |
| DM21 | 2026-10-23 | Interface tooling: Vite, React 19, TypeScript strict, React Router, Tailwind, TanStack Query, openapi-typescript, Vitest + Testing Library, Playwright + axe, Prism mock, npm | Static build fits Vercel and Qocent; types generated from the contract | Victor Oyeleke | Nnaemeka Chukwuma |
| DM22 | 2026-10-23 | Coverage: JaCoCo fails the build below 80% line coverage on the rule packages (`sale`, `customer`, `reversal`, `product` services and repositories). Other packages are reported, not gated | Guards the code where bugs cost marks | Team 3 | Nnaemeka Chukwuma |
| DM23 | 2026-10-23 | Test protection: a CI check fails `fix/*` branches or PRs labelled `bug` that modify test files after the commit adding the failing test. CODEOWNERS requires the rule owner to approve test changes | Protects the test-first loop for humans and AI tools | Team 3 | Nnaemeka Chukwuma |
| DM24 | 2026-10-23 | Visual checks: Playwright screenshots (360 px and desktop) of five key screens after Monday. Victor approves the baselines. CI flags differences for review, not as a hard fail. A manual checklist before Monday | Catches regressions without noise while the UI is changing | Victor Oyeleke | Nnaemeka Chukwuma |
| DM25 | 2026-10-23 | Evals: a small suite (10-20 real AI-assisted tasks) in `evals/` from day 6, re-run manually on AGENTS.md changes. An AI-introduced bug adds an eval and an AI-log entry. Not a merge gate | Proportionate to a 14-day project; feeds the AI log | Team 3 | Nnaemeka Chukwuma |
| DM26 | 2026-10-23 | Release manager: Isaac Bassey approves every production deploy (GitHub `production` environment required reviewer). Blessing Nwafor is the backup. The approver is never the author of the change | Avoids a single point of delay over the weekend | Isaac Bassey | Nnaemeka Chukwuma |
| DM27 | 2026-10-23 | Staging from day 6: Neon `staging` branch, Vercel preview, and a second Render service; every PR deploys there. Production only until Monday | Keeps the weekend on the MVP | Isaac Bassey | Nnaemeka Chukwuma |
| DM28 | 2026-10-23 | Rollback rehearsals: Sat 24 Oct on the production walking skeleton, about day 9 in staging, and about day 13 before final. Each records the date and time taken in release.md | The Monday demo shouldn't run on an untried rollback | Team 3 | Nnaemeka Chukwuma |
| DM29 | 2026-10-23 | No AI agent runs in the CI/CD pipeline. AI tools are used locally only and logged in the AI log | Nil cost, no provider keys in GitHub secrets | Team 3 | Nnaemeka Chukwuma |
| DM30 | 2026-10-23 | Reviews: passes for bugs, security, compliance, money and concurrency, and accessibility. At most 5 nits. One code-owner approval, never from the author. Sale, store-credit and migration changes also need Isaac Bassey's approval | Proportionate rigour on the risky code | Isaac Bassey | Nnaemeka Chukwuma |
| DM31 | 2026-10-23 | Monitoring (Maintain stage) is postponed. `sdlc/monitoring.md` is kept as a deferred placeholder listing what is settled and what is still to decide. When to resume is UNRESOLVED | Team priority on the MVP and the core build | Team 3 | Nnaemeka Chukwuma |
| DM32 | 2026-10-24 | Frontend: keep Vite, React 19, strict TypeScript, Tailwind, npm and the existing generation/test tools; specify React Router Data Mode, Axios, Formik/Yup, Redux Toolkit and RTK Query. Supersedes DM21's TanStack Query selection only; no Framework Mode | Victor's interface stack; one server-state cache with Axios transport | Victor Oyeleke | Codex (logging assistant) |
| DM33 | 2026-10-24 | Frontend structure: one API file per resource in `web/src/service/api/`; central URL definitions in `service/endpoints/`; shared `service/http-client.ts`; contract-derived request/response models; Yup schemas; `auth/`; reusable `components/ui/`, layouts and separate shared hooks/constants/utilities. Preserve generated `src/api/schema.d.ts` and `lib/money.ts` locations | Separate transport, URLs, resource operations, models and validation without occupying the Java service folder | Victor Oyeleke | Codex (logging assistant) |
| DM34 | 2026-10-24 | Images live in `web/src/assets/images/` with central named exports added later. Supplied foundational design tokens apply app-wide; coin, wordmark treatment and hero layout stay login-specific | Central asset imports and consistent product styling; no artwork or stylesheet in phase 2 | Victor Oyeleke | Codex (logging assistant) |
| DM35 | 2026-10-24 | Shared-component agreement remains pending (PD13). Shadcn is not required; adopt the foundation and dependencies actually agreed by the interface engineers | The PDF describes a proposal and its copy-in approach does not require shadcn | Victor Oyeleke | Codex (logging assistant) |
| DM36 | 2026-10-24 | Phase 2 creates frontend folders, documentation, `.gitkeep` placeholders and one empty HTTP-client source file only. Publish existing planning docs as the one-time initial `main` baseline, then publish `chore/web-structure` and open a reviewed PR. Later features use separate branches and descriptive commits; no force-push or automatic merge | Make the empty cloned repository useful and visible to teammates without implementing screens or bypassing later review gates | Victor Oyeleke | Codex (logging assistant) |

### Frontend implementation decisions, 2026-10-24

| ID | Date | Decision | Reason | Decided by | Logged by |
|----|------|----------|--------|------------|-----------|
| DM37 | 2026-10-24 | Adopt [interface-eng-shared-components](https://github.com/spr-tech/interface-eng-shared-components) as the five engineers' agreed copy-in interface source. React/TypeScript/Tailwind/Radix; preserve component ownership and token names, replace neutral values with Stockwise values. Supersedes DM35's pending status and resolves PD13 | Victor reports the agreement; upstream still names four engineers, so no fifth name or extra approval is invented | Five interface engineers, as reported by Victor Oyeleke | Codex |
| DM38 | 2026-10-24 | Implement the supplied Home/sign-in/sign-up references as one entry/authentication feature on feat/auth-ui, using React Router Data Mode from react-router, Tailwind v4 with @tailwindcss/vite, central image imports, self-hosted specified fonts, and descriptive commits | Victor requested implementation after the read-only review; screenshots define responsive composition | Victor Oyeleke | Codex |
| DM39 | 2026-10-24 | Preserve merged v0.1.0 contract and generate frontend types from it. Call POST /auth/sessions and GET /me; registration remains a validated explicit pending adapter. Proposed POST /auth/registrations and additional responses are documented in docs/auth-contract-proposal.md, not activated | Keep UI and approved wire shapes aligned; merged log still marks two-engineer sign-off pending | Victor Oyeleke (scope); Codex (proposal details, pending API approval) | Codex |
| DM40 | 2026-10-24 | Implementation defaults: expiry-checked tab sessionStorage with memory fallback, no password persistence; /workspace authenticated welcome via /me; sign-out clears tab session/cache; demo buttons fill configured public seed details without auto-submit or invented password. Apply local additive shared component styling/loading slots, reconstruct coin as SVG with reduced-motion behavior, and verify supplied viewports before claiming visual accuracy | Complete the authorized UI while clearly recording missing backend registration/seeds and original artwork. Future money/cart behavior in PD14 remains unresolved | Codex, implementation choices under Victor's authorization | Codex |

Implementation details and remaining limits: [auth UI](docs/auth-ui-implementation.md), [contract proposal](docs/auth-contract-proposal.md). Historical DM32–DM36 remain intact. No proposed endpoint is added to the active contract or counted as two-engineer approval.

### Tailwind utility convention, 2026-10-24

| ID | Date | Decision | Reason | Decided by | Logged by |
|----|------|----------|--------|------------|-----------|
| DM41 | 2026-10-24 | Prefer `focus-visible:outline-offset-(--focus-ring-offset)`, `rounded-md`, and `font-sans` over their equivalent arbitrary CSS-variable classes. Record recurring examples in AGENTS.md and apply the replacements across Button, Input and FormField, including future shared-component copies. Preserve 10px radius, Inter Tight and the configured focus offset | Victor identified recurring IDE canonical-class suggestions; reduce repeated guidance without changing appearance | Victor Oyeleke | Codex |

**DM41 reaffirmed, 2026-10-24:** Victor clarified that preventing recurrence in future agent work is the purpose of this decision. The repository-root AGENTS.md now calls out the rule at task startup, contains the exact replacement table under Mistakes to avoid, and requires reviewing it before frontend edits and checking touched components before completion. This reinforces the existing decision without creating a duplicate or attributing it to the whole team. **Decided by:** Victor Oyeleke. **Logged by:** Codex.

Initial observations: neither the local mock (4710) nor backend (8080) was listening; no local override or demo password was configured. The seven reported D-marked files exist and are tracked in the current tree; deletion history includes the earlier requested rollback, followed by recreation in ec0bf7f. Victor identified vite.config.ts as an example after describing folder badges. `web/vite.config.ts` is a tracked, unchanged 196-byte file, not a deleted folder. The IDE panel/badge state cannot be reproduced from Git; refreshing Explorer/current Source Control is suggested without resetting files.

| ID | Date | Decision | Reason | Decided by | Logged by |
|----|------|----------|--------|------------|-----------|
| DM42 | 2026-10-24 | Run the contract mock for UI development. Add a pinned Prism launcher with a generated, ignored copy of the active contract containing consistent OWNER/session response examples and a future eight-hour expiry. Configure the local UI to use port 4710. The public sample owner@stockwise.demo / stockwise-demo is mock-only; Prism validates request shape, not credentials, and returns a fixed OWNER fixture for all valid login bodies. Supersedes DM40's unset local demo password only for mock development; real backend seeds remain pending | Victor chose contract mock development when asked how sign-in should work; generated examples prevent random/expired sessions without changing the authoritative contract | Victor Oyeleke (mock mode); Codex (fixture/launcher implementation) | Codex |

No registration endpoint, real account, server-authentication implementation or two-engineer contract approval is implied by DM42.

### Publication and supplied Home refinements, 2026-10-24

| ID | Date | Decision | Reason | Decided by | Logged by |
|----|------|----------|--------|------------|-----------|
| DM43 | 2026-10-24 | Commit Victor's recent HomePage/CSS changes and the 16 design references under web/Screens before pushing feat/auth-ui and opening a PR into main. Preserve the supplied headline punctuation, removed description, 320px desktop coin offset and CSS formatting. Treat Screens as versioned design inputs, not runtime assets; no automatic merge/deployment | Victor explicitly requested committing his recent changes before creating the PR | Victor Oyeleke | Codex |

Visual-review note: the supplied CSS still hides the headline on mobile. With the description removed, mobile Home has no supporting copy; this is retained as supplied for human review rather than silently changed during publication.

### Products and sales implementation, 2026-10-24

| ID | Date | Decision | Reason | Decided by | Logged by |
|----|------|----------|--------|------------|-----------|
| DM44 | 2026-10-24 | Implement Products and New sale/Receipt on separate feat/products-ui and feat/sales-ui branches, with descriptive commits. Defer Sales history. Use updated stock-conflict and corrected store-credit frames for quality control, including bordered quantity controls across cart states | Victor authorized implementation after design reviews and chose the supplied sale/receipt scope | Victor Oyeleke | Codex |
| DM45 | 2026-10-24 | Ignore web/Screens and remove already tracked references from the index, preserving local copies. Supersedes DM43's versioned-reference policy only | Victor requested keeping design exports out of future commits/checkouts | Victor Oyeleke | Codex |
| DM46 | 2026-10-24 | Keep v0.1.0 API unchanged; document gaps separately. Use contract-derived models and one RTK Query cache. Exact decimal-to-kobo parsing and checked integer arithmetic; unknown/unsafe amounts block submission. Categories use an editable catalogue-derived combobox. No unsupported archive/edit endpoints | Implement within existing wire shapes without inventing API approval | Codex, implementation choices under Victor's authorization | Codex |
| DM47 | 2026-10-24 | Development simulation supports product/sale interaction and corrected automatic store credit. Real credit-bearing writes remain blocked pending settlement fields. Persist an immutable pending write before POST; bounded transport retry preserves key/body; reauthentication requires same user and current permitted role; refreshed recovery replays the same POST until a lookup exists | Prevent false success, changed-body retries and fabricated authoritative credit totals | Codex, implementation choices; wire additions remain proposals | Codex |

Details and unresolved API decisions: [UI implementation](docs/products-sales-ui.md), [contract proposal](docs/products-sales-contract-proposal.md). No two-engineer sign-off is invented.

| DM48 | 2026-10-25 | Keep unsubmitted carts in per-user tab storage as well as immutable pending writes. Bind pending recovery to the original service base URL and user, recheck current role, reject unsafe customer money, and retain the original preview during recovery. Use one browser worker on this Windows machine. Decorative error icons use SVG; keep exact-copy assertions intact | Continuation safety and concrete browser/lint findings during implementation; no backend business-rule change | Codex, implementation choices under Victor's authorization | Codex |

### Products and sales publication, 2026-10-25

| ID | Date | Decision | Reason | Decided by | Logged by |
|----|------|----------|--------|------------|-----------|
| DM49 | 2026-10-25 | Confirm the feature commits, push feat/products-ui and feat/sales-ui, and open both PRs against main. Products is PR #4 (86fb5ea); Sales is PR #5 (74d6eef). Preserve the existing stacked history and document review order: authentication PR #3, Products PR #4, then Sales PR #5. No automatic merge or deployment | Victor explicitly requested a PR to main for both branches and confirmation that the commits exist | Victor Oyeleke | Codex |

Published: [Products PR #4](https://github.com/AMAZEEN12/Stockwise/pull/4) and [Sales PR #5](https://github.com/AMAZEEN12/Stockwise/pull/5), both open with base main. Authentication [PR #3](https://github.com/AMAZEEN12/Stockwise/pull/3) was still open when checked on 2026-10-25. The descriptions disclose inherited changes, prior local verification, visual differences, service setup limits and pending API proposals. Creating these PRs does not supply human review or contract approval.

Publication follow-up: current main includes merged structure PR #1 (2d170e6). Its only merge conflict with Products was in sdlc/WORKLOG.md. Codex retained the current frontend guidance and appended the incoming historical startup notes, committed the main integration as 8fa08ac on Products, then carried it into Sales. No application files changed, existing feature commits were preserved and neither branch was force-pushed. Decided by: Codex (routine conflict resolution within Victor's publication request). Logged by: Codex.

### Customer Picker and Customers, 2026-10-25

| ID | Date | Decision | Reason | Decided by | Logged by |
|----|------|----------|--------|------------|-----------|
| DM50 | 2026-10-25 | Implement the 14 Customer Picker and 22 Customers references using root Screens tokens; separate feat/customer-picker and feat/customers-ui branches and descriptive completed-feature commits. Keep the selected-customer reference message exactly as supplied | Victor authorized implementation after the read-only review and explicitly chose unchanged reference text | Victor Oyeleke | Codex |
| DM51 | 2026-10-25 | Reuse current GET/POST customers contract and one form/cache. Keep real store-credit writes gated. Preserve server order, load every collection page, use last successful client retrieval for WAT freshness, and use UUID identity even for duplicate names. Handle unsafe amounts and non-idempotent create uncertainty explicitly; proposed API changes stay separate | Complete the supplied flows without inventing approved endpoints, retry guarantees or authoritative balance snapshots | Codex, implementation choices under Victor's authorization | Codex |
| DM52 | 2026-10-25 | Use PLAYWRIGHT_PORT=5184 for current-config QA while preserving the user's existing 5173 preview. Register Tailwind sources explicitly, ignore generated .vite/.mock for lint, and assert dialog positioning/bounds. Override individual translate for the mobile sheet. Keep optional contact valid after Formik normalization | Visual inspection caught missing utilities and offscreen mobile content that interaction-only checks did not detect | Codex, implementation/verification choices | Codex |

Details: [customer UI](docs/customers-ui.md) and [pending contract proposals](docs/customers-contract-proposal.md). No new two-engineer sign-off is recorded.

Implementation follow-up, 2026-10-25: confirmed customer creations update the existing shared cache; the directory uses semantic row headers, matching responsive cards and a persistent dismissible success notice. The last retrieval time is displayed in Africa/Lagos. Independent verification owns temporary API/Vite ports 4711/5185 and stops them afterwards; the user's preview is preserved. All 36 supplied customer frames were compared, remaining differences disclosed, and current OpenAPI/generated types left unchanged. Decided by: Codex (technical choices within DM50 scope). Logged by: Codex.

## 3. Contract change log

| Date | Change | Why | Agreed by (two engineers) |
|------|--------|-----|---------------------------|
| 2026-10-23 | **v0.1.0 (DRAFT):** first contract with the Monday paths: `GET /health`, `POST /auth/sessions`, `GET /me`, `GET/POST /products`, `GET /products/{id}`, `GET/POST /customers`, `GET/POST /sales` (`Idempotency-Key` required), `GET /sales/{id}`. Problem+json errors with codes. Money as int64 kobo (`x-unit: kobo`, enforced by the lint rule `money-is-integer-kobo`). Mock on port 4710 | EXECUTION step 2: contract before code; unblocks the interface | **Pending:** Isaac Bassey (API and access owner) and Nnaemeka Chukwuma. Drafted by the agent for review; not agreed until both names are recorded here |
