# Spec: Stockwise, stock and customer credit for one small shop

Derived from: [intent.md](intent.md) (accepted 2026-10-23) · Status: accepted (2026-10-23 by Nnaemeka Chukwuma; revised 2026-10-23 to apply team decisions DM5-DM16)

Frontend amendments: 2026-10-24, DM32–DM42. Victor authorized Home/authentication implementation after review; the shared agreement covers four interface engineers, with the count corrected and approved by Victor on 2026-10-25 (DM53). Implementation choices and API proposals are attributed separately in decisions.md. DM41 adopts canonical Tailwind utilities; DM42 selects local contract-mock development with explicit simulated account examples. See [auth UI implementation](../docs/auth-ui-implementation.md) and [approved shared-source clarifications](../docs/shared-component-alignment.md). No proposed API or business-rule change is approved by these amendments.
Product owner: Nnaemeka Chukwuma (acting) · Technical sign-off (if high risk): Isaac Bassey, Team 3 lead (DM7)
Policies applied: TeSA brief "Shared technical requirements", "Shared rules for fairness", "Delivery and cost", assessment rubric and mentor checklist (PDF pp. 3, 23-26, dated 21 Oct 2026). No separate organisational policy supplied.
Supporting skills: none
Pending decisions: tracked in [`decisions.md`](../decisions.md), including `PD5a`–`PD5c` and remaining `PD14` cart/money behavior. PD13 is resolved by DM37. Registration and auth API gaps are [proposals](../docs/auth-contract-proposal.md), pending two-engineer agreement.

## Summary
Stockwise is a web app for one demonstration shop. It records products, paid and credit sales, restocks, customer repayments and reversing entries, and answers three questions: what is running low, what we recorded as sold, and what credit is outstanding. The service is Java 25 / Spring Boot 4 over Postgres. The database protects the one rule the product depends on (stock never below zero, even when two devices sell the last unit), and every amount is an integer number of kobo.

## Functional requirements
Traceability: S1-S8 refer to the success criteria in intent.md.

| ID | Requirement | Acceptance criterion (measurable) |
|----|-------------|-----------------------------------|
| R1 | **Product catalogue.** The owner creates, edits and archives products: name, unique reference, category, selling price (kobo), quantity, low stock threshold, active flag. | Created and edited products survive a refresh. Archived products disappear from the sale screen but stay in history. A duplicate reference returns 409. |
| R2 | **Search and filter products** by keyword (name or reference), category and stock state (in stock / low / out of stock / archived). Filters combine and can be cleared. | With the seed data, each filter combination returns exactly the matching rows. "Clear" restores the full list. |
| R3 | **Record a sale** of one or more products with quantities, as `PAID` or `CREDIT`. Quantities must be positive whole numbers within available stock. Unit prices are copied onto the sale lines when the sale is recorded. | POST /sales returns 201 and every product's quantity drops by the line quantity, in one transaction. A quantity of 0, a negative quantity or a non-integer returns 400. If any line exceeds stock, nothing is recorded (409 `INSUFFICIENT_STOCK`). |
| R4 | **Stock never falls below zero**, and the check happens where two devices cannot both pass it. (The product's key rule.) | Concurrency test: N parallel sales of the last unit against the deployed service leave quantity 0 with exactly 1 sale recorded, and the other N-1 get 409. The same test **fails** when the protection is removed (S1). |
| R5 | **Repeat submissions are safe.** Every POST /sales carries an `Idempotency-Key` (a UUID made by the client). A replay with the same key and body returns the original result without recording again. The same key with a different body is refused. | Submitting the same sale twice, in sequence and in parallel, records one sale and both calls return the same sale ID (S2). Same key with a different body returns 422 `IDEMPOTENCY_KEY_REUSED`. Repayments and restocks use the same mechanism. |
| R6 | **Restock.** The owner records a restock with product, quantity (> 0), received date and an optional note. Stock increases. | Product quantity increases by exactly the restocked amount, and the restock appears in the product's movement history. |
| R7 | **Customers.** Create and list customers with a display name and an optional fictional contact placeholder. | A customer created during a sale appears in the customer list and ledger. |
| R8 | **Credit sale.** A `CREDIT` sale requires a customer and may carry a due date. It increases the customer's balance by the sale total. | Database CHECK: `payment_type = 'PAID' OR customer_id IS NOT NULL`. A credit sale without a customer returns 400. The balance rises by exactly the total. |
| R9 | **Repayment, full or partial.** A repayment may not exceed the outstanding balance at the moment it is applied, which is enforced atomically. | Two parallel repayments that together exceed the balance: one succeeds and the other gets 409 `REPAYMENT_EXCEEDS_BALANCE`, and the balance never goes below zero (`CHECK balance_kobo >= 0`). |
| R10 | **Customer ledger.** Shows every credit sale, repayment and reversal, with a running balance after each entry and the current balance. | The ledger's final running balance equals the customer's current balance and equals the sum of the ledger entries (reconciliation test). |
| R11 | **Reversing entries.** Any sale, repayment or restock can be reversed with a reason. A reversal is a new entry that points at the original, and an entry can be reversed at most once. Nothing is edited or deleted. | A reversed sale restores stock and, for a credit sale, the customer balance, and both entries are visible (S3). A second reversal of the same entry returns 409 `ALREADY_REVERSED`, including when two arrive in parallel. Reversing a restock that would push stock below zero returns 409 `INSUFFICIENT_STOCK`. |
| R12 | **Design problem: reversing a credit sale that has already been partly repaid** (DM5, option C). The reversal goes through. The customer's balance falls to zero, never below, and the excess already repaid becomes **store credit**: a `store_credit` entry on the customer, used up automatically by the customer's next sale in the same transaction. The decision record states the cost and what would make us reverse it. | Example: ₦10,000 credit sale, ₦6,000 repaid, sale reversed. Balance 0, store credit ₦6,000. The next ₦4,000 sale draws ₦4,000 from store credit and leaves ₦2,000. Two parallel sales can't spend the same credit twice: a conditional update on `store_credit_kobo >= :amt`, with a test that fails when that guard is removed. |
| R13 | **Movement history.** Each product shows its sales, restocks and reversals in time order, and each sale has a detail view. | For every seeded product, the sum of movement deltas equals its current quantity (reconciliation test). |
| R14 | **Dashboard.** Shows today's recorded sales (count and total, paid vs credit), products at or below threshold, total outstanding credit, total store credit held, and recent activity. Everything is computed from the records when it is read, labelled "Demonstration data", and shows the time it was computed. | Dashboard figures equal hand-computed SQL over the seed data. Reversing a sale moves today's total and the outstanding credit on the next load (S5). "Today" means the Africa/Lagos calendar day (DM14). |
| R15 | **Authentication and roles.** Email and password login gives a JWT bearer token. Roles are `OWNER`, `ASSISTANT` and `ADMIN`, with the permission matrix under "Design". The service enforces it. | A test calls the service directly with the wrong role (an assistant creating a product) and gets 403. That test **fails** when the check is removed. A missing or expired token returns 401. |
| R16 | **Naira on screen, kobo everywhere else.** The UI shows ₦ with thousands separators and two decimals. The API and database carry integer kobo only. | ₦450.00 is displayed for 45000. Every money field in the OpenAPI document is `type: integer, format: int64` with `x-unit: kobo`. |
| R17 | **Five screen states** (loading, empty, error, success, confirmation) on every screen. "Empty" means first use with no data. | A review checklist per screen. Each state can be reached in the deployed app (empty via a fresh account or filter, error via the throttled or offline dev tools). |
| R18 | **Optimistic update with rollback** (DM11): **archive or unarchive a product** updates the screen before the service answers. On 412 `VERSION_CONFLICT` or 403, the row reverts and explains in terms the user can act on. Why this action: no money is at risk if the screen is briefly wrong. | Two-tab test: edit in tab A, archive in tab B, and B's row reverts to Active with the conflict message within one render. |
| R19 | **Seed data with awkward cases:** ≥120 products, 60 days of sales, ≥14 customers carrying credit (one with a reversed transaction), plus zero-stock, at-threshold, archived and very-long-name products, a fully repaid customer, a customer holding store credit, and a reversed restock. | A seed verification script asserts the counts and that each awkward case exists (S6). Monday subset (DM16): 20 products, 5 customers (one owing, one with store credit), 7 days of sales, one login per role, with every awkward case present. |
| R20 | **Demo credentials and labelling.** The README lists one account per role. Anything simulated is labelled beside the feature. | Clean-browser check of the README and the UI labels before every checkpoint. |

## Non-functional requirements
| ID | Category | Requirement | Acceptance criterion |
|----|----|----|----|
| N1 | Correctness / money | Money is stored as `BIGINT` kobo, held as `long` in Java, and sent as JSON integers. Jackson is configured to reject floats for integer fields (`ACCEPT_FLOAT_AS_INT` disabled) and to reject strings coerced to numbers. | An automated test sends `45000.5`, `"45000"` and `4.5e4` and gets 400 each time. A schema test asserts every money column is `bigint` and no column is `numeric`, `real` or `double` (S4). |
| N2 | Security | Every endpoint except `POST /auth/sessions` and `GET /health` requires a valid token. Passwords are hashed with bcrypt (cost ≥ 10). JWTs are signed with HS256 using a secret from the environment, with an 8-hour lifetime (one trading shift, DM15) and no refresh token. | Unauthenticated calls return 401 (test per resource). No secrets in the repository (a secret scan runs in CI). |
| N3 | Security / authorisation | Roles are enforced in the service (method-level security), and the user's role is re-read from the database on each request so that demotion takes effect immediately. | See R15. |
| N4 | Reliability / concurrency | Business rules are protected by database constraints and transactions, not by reading and then writing in application code. | Each rule (R4, R5, R8, R9, R11) has a test that fails when its constraint or conditional update is removed. |
| N5 | Contract | One OpenAPI 3.1 document is the contract and is written before code. Every path, method, status, error shape, field type, required flag and unit is in it, and it validates. A mock server starts with one command. Contract tests in CI check the deployed service against it. | The `openapi lint` step passes. The mock starts with one command. A contract divergence fails the build on the commit that caused it. |
| N6 | Observability | Structured JSON logs. The interface sends `X-Request-Id` (a UUID), the service generates one if it is absent, returns it, includes it in every log line and every error body. No passwords or tokens are logged. | One user journey can be followed by request ID across browser network logs and service logs. |
| N7 | Performance (service) | Target: `POST /sales` p95 ≤ 500 ms and `GET /dashboard` p95 ≤ 800 ms on a warm instance (DM12). The load test reports p50, p95 and p99 and the point of saturation. | A load test report in the README with a saturation point. Cold-start time is measured and reported separately. |
| N8 | Performance (interface) | LCP ≤ 2.5 s and INP ≤ 200 ms (DM12), measured on the deployed address. | Measured figures in the README, whether the targets are met or missed. |
| N9 | Accessibility | WCAG 2.2 AA: fully keyboard operable, visible focus, semantic headings, labelled inputs, status changes announced (`aria-live`), targets ≥ 24×24 px. | Axe-core finds no serious or critical issues. Manual NVDA or VoiceOver pass recorded in the README (final, not Monday). |
| N10 | Usability / responsive | Phone-first sale screen ("a phone held at a counter"), plus layouts for tablet and desktop. | Usable at 360 px wide without horizontal scrolling. Primary actions are reachable with one thumb. |
| N11 | Resilience | Usable on a throttled "Slow 3G" profile. If the connection drops during a write, the UI shows "Not confirmed, retrying" (never "Saved") and retries with the same `Idempotency-Key`. | A manual test under dev-tools throttling and offline toggling, written up in the README. |
| N12 | Data / migrations | Versioned Flyway migrations run automatically in the pipeline and **can be reversed** (DM13): every `V<n>__*.sql` has a hand-written `db/rollback/U<n>__*.sql`. The schema is expected to change after day 6. | The pipeline applies migrations before deploying. CI runs up → down → up for every migration pair against Testcontainers. |
| N13 | Data privacy | Demonstration data only: fictional customer names, placeholder contacts, no real financial data. | Seed review. A README statement. |
| N14 | Cost | Nil. Free tiers only, with each provider's terms checked on its own pricing page and recorded with the date. | A README "Free tier terms checked" section with dates. |
| N15 | Testing levels | Unit tests on the rules, integration tests against real Postgres (Testcontainers), and contract tests. | All three run in CI and any failure blocks the deploy. |

## Design

### Components and responsibilities
| Component | Location | Responsibility |
|----|----|----|
| OpenAPI contract | `stockwise/contract/openapi.yaml` | Single source of the API. The mock server (e.g. Prism) runs from it. |
| Web interface | `web/` (repository-relative) | React 19 + strict TypeScript + Vite, React Router Data Mode, Tailwind, Axios, Formik/Yup, Redux Toolkit and RTK Query (DM32). API request/response models derive from generated contract types; resource API modules use the shared HTTP client. Shared-component foundation pending (PD13); shadcn is not required. Hosted on Vercel when deployment is implemented. |
| Service | `stockwise/service/` | Java 25, Spring Boot 4 (Web MVC, Security, Validation, JDBC/JPA), Flyway. Packaged as a container image for Render. |
| Database | Neon Postgres (free) | Tables, constraints, indexes. Owned by the "Data and rules" area. |
| Pipeline | `.github/workflows/stockwise-*.yml` | Lint, type-check, test (Testcontainers), contract tests, migrate, deploy both tiers. A failure blocks the deploy. |
| Decisions file | `stockwise/decisions.md` | Contract changes (dated, what, why, two approving engineers), decisions made, and decisions still to make. |

### Data flow: recording a sale (the critical path)
1. The assistant builds a cart on the phone. When they tap **Confirm**, the client generates `Idempotency-Key = uuid()` once for this attempt and keeps it until a definitive answer arrives.
2. `POST /sales` with `Authorization: Bearer`, `Idempotency-Key`, `X-Request-Id`, and the body `{paymentType, customerId?, dueDate?, lines:[{productId, quantity}]}`.
3. The service validates the shape (integers only) and the role (OWNER or ASSISTANT), then opens **one transaction**:
   1. `INSERT INTO sale (..., idempotency_key, request_hash) ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`. If no row comes back, the service loads the existing sale. If its `request_hash` matches, it returns the stored 201 body. If not, it returns 422.
   2. For each line, **ordered by product_id** to avoid deadlocks: `UPDATE product SET quantity = quantity - :q, version = version + 1 WHERE id = :id AND active AND quantity >= :q RETURNING price_kobo`. If no row comes back, it **rolls back** and returns 409 `INSUFFICIENT_STOCK` with the product ID. A `CHECK (quantity >= 0)` on `product` is the backstop.
   3. It inserts `sale_line` rows with the copied `unit_price_kobo`, and `stock_movement` rows (delta = -q).
   4. If `CREDIT`: `UPDATE customer SET balance_kobo = balance_kobo + :total` and it inserts a `ledger_entry` with `balance_after_kobo`.
   5. Commit, then return 201 with the sale and its `X-Request-Id`.
4. The client shows success only on 201. On a timeout or network drop, it shows "Not confirmed, retrying" and retries with the **same key**. On 409, it returns the user to an editable cart showing the stock now available.

Repayment (R9) uses `UPDATE customer SET balance_kobo = balance_kobo - :amt WHERE id = :id AND balance_kobo >= :amt`. If no row comes back, it returns 409. Reversal (R11) inserts into `reversal` under `UNIQUE (entry_type, entry_id)`, then applies the inverse deltas through the same conditional updates.

### Interfaces and contracts
Resources are nouns. Everything is under `/api/v1`. Every error uses `application/problem+json` (RFC 9457): `{type, title, status, detail, code, requestId, errors?:[{field, message}]}`.

| Method & path | Safe / idempotent | Roles | Notes |
|----|----|----|----|
| `POST /auth/sessions` | neither | public | Login, returns `{accessToken, expiresAt, user}` |
| `GET /me` | safe | any | Current user and role |
| `GET /products` | safe | any | `?q=&category=&stockState=&page=&size=` |
| `POST /products` | neither | OWNER | 409 on duplicate reference |
| `GET /products/{id}` | safe | any | |
| `PATCH /products/{id}` | idempotent (with `If-Match: version`) | OWNER | Edit, archive or unarchive. 412 `VERSION_CONFLICT` |
| `GET /products/{id}/movements` | safe | any | Movement history |
| `POST /sales` | idempotent via `Idempotency-Key` (required) | OWNER, ASSISTANT | 201 / 400 / 409 `INSUFFICIENT_STOCK` / 422 `IDEMPOTENCY_KEY_REUSED` |
| `GET /sales`, `GET /sales/{id}` | safe | any | `?from=&to=&paymentType=&customerId=` |
| `POST /restocks` | idempotent via key | OWNER | |
| `GET /restocks` | safe | any | |
| `GET /customers`, `POST /customers`, `GET /customers/{id}` | safe / neither / safe | OWNER, ASSISTANT (ADMIN read) | |
| `GET /customers/{id}/ledger` | safe | any | Entries with running balance |
| `POST /repayments` | idempotent via key | OWNER, ASSISTANT | 409 `REPAYMENT_EXCEEDS_BALANCE` |
| `POST /reversals` | idempotent (one per entry, enforced by a unique constraint) | OWNER, ADMIN (DM10) | `{entryType: SALE\|REPAYMENT\|RESTOCK, entryId, reason}`. 409 `ALREADY_REVERSED` / `INSUFFICIENT_STOCK`. A partly repaid credit sale produces store credit (R12) |
| `GET /dashboard` | safe | any | Includes `computedAt` and `isDemonstrationData: true` |
| `GET /health` | safe | public | Liveness and database reachability |

**Permission matrix** (DM10): OWNER can do everything. ASSISTANT can read, record sales, create customers and record repayments. ADMIN is read-only across the shop (the "demonstration administrator reviewing the shop") **except that it can also create reversals**. OWNER and ADMIN have full reversal access.

### Data model
All money columns are `BIGINT` (kobo). All timestamps are `timestamptz`, stored in UTC.

- `app_user(id, email UNIQUE, password_hash, display_name, role CHECK IN ('OWNER','ASSISTANT','ADMIN'), created_at)`
- `product(id, reference UNIQUE, name, category, price_kobo CHECK >= 0, quantity INT CHECK >= 0, low_stock_threshold INT CHECK >= 0, active BOOL, version INT, created_at, updated_at)`
- `customer(id, display_name, contact_placeholder NULL, balance_kobo BIGINT CHECK >= 0, store_credit_kobo BIGINT CHECK >= 0, created_at)`. Both are cached values, reconciled by test against `ledger_entry` (store credit movements are ledger entries with `source_type = 'STORE_CREDIT'`).
- `sale(id, reference UNIQUE, idempotency_key UUID UNIQUE, request_hash, payment_type CHECK IN ('PAID','CREDIT'), customer_id NULL FK, due_date NULL, total_kobo CHECK >= 0, created_by FK, created_at, CHECK (payment_type='PAID' OR customer_id IS NOT NULL))`
- `sale_line(id, sale_id FK, product_id FK, quantity INT CHECK > 0, unit_price_kobo, line_total_kobo)`
- `restock(id, product_id FK, quantity INT CHECK > 0, received_on DATE, note, idempotency_key UNIQUE, created_by, created_at)`
- `repayment(id, customer_id FK, amount_kobo CHECK > 0, idempotency_key UNIQUE, created_by, created_at)`
- `reversal(id, entry_type CHECK IN ('SALE','REPAYMENT','RESTOCK'), entry_id, reason NOT NULL, created_by, created_at, UNIQUE (entry_type, entry_id))`
- `stock_movement(id, product_id FK, delta INT, source_type, source_id, created_at)`, append-only
- `ledger_entry(id, customer_id FK, delta_kobo BIGINT, source_type, source_id, balance_after_kobo, created_at)`, append-only

Append-only tables are protected by revoking UPDATE and DELETE from the application's database role. If Neon's free tier doesn't allow separate roles, a trigger that raises on UPDATE or DELETE does the same job (decide in plan.md).

**Key queries and indexes** (the full analysis of rows examined against rows returned goes in plan.md and the README):
1. Product list and filter: `(active, category)`, plus a partial index for low stock `WHERE quantity <= low_stock_threshold`.
2. Today's sales: `sale(created_at)`.
3. Customer ledger: `ledger_entry(customer_id, created_at)`.
4. Idempotency lookup: the unique indexes on `idempotency_key`.
5. Product movement history: `stock_movement(product_id, created_at)`.
- Index deliberately **not** created: a `pg_trgm` GIN index on `product.name`. With about 120 products, a sequential scan with `ILIKE` is cheaper than maintaining the index. Revisit above about 10k products.

### UI / UX
Screens: Login · Dashboard · Products (list, filter, detail, create/edit, archive) · New sale (phone-first cart, paid/credit toggle, customer picker, confirm) · Customers (list, create) · Customer ledger (with "Record repayment") · Restock · Sale detail (with "Reverse") · History.
- Every screen has the five states. Every figure that might be stale shows "as of HH:MM". The dashboard carries a "Demonstration data" badge.
- Reversal and archive both ask for confirmation, and a reversal requires a reason.
- Shared-component source: the four engineers' agreement is adopted in DM37, with the count confirmed by Victor in DM53; preserve the reviewed copy-in APIs/accessibility and use Stockwise tokens. The earlier PDF remains historical proposal context. Card and Select/Checkbox source behavior is clarified in the approved alignment notes; component migrations remain separate proposals.
- Victor supplied a design-token image on 2026-10-24. Its foundational colors, typography, spacing, radii and focus styles apply throughout Stockwise; the wordmark, coin and hero layout are login-specific (DM34). See [frontend architecture](../docs/frontend-architecture.md) for the transcription and unresolved phase 3 details. No UI or token stylesheet is implemented in this phase.

### Integration with the existing system
Not applicable: a new, standalone product. The only shared assets are the cross-team component set and, possibly, hosting accounts shared with Genie (C3).

## Policy compliance
| Policy (brief) | How the design satisfies it | Status |
|--------|-----------------------------|--------|
| Contract first; no code days 1-2; mock from day 3 | N5; `contract/openapi.yaml` and a Prism mock come before code | planned |
| Own service and own database; the interface never touches the database | Component table | planned |
| Resources as nouns; safe/idempotent stated; actionable errors | Endpoint table, problem+json | planned |
| Auth and roles in the service, with a wrong-role test that fails when the check is removed | R15, N3 | planned |
| Key rule protected by database constraints and transactions; concurrent test fails without the protection | R4, N4, data flow step 3.2 | planned |
| At least one write safe to submit twice, with the client's part documented | R5, data flow step 1 | planned |
| Documented data model, 5 queries, an index not created | Data model section | partly; analysis goes in plan.md |
| Versioned, automatic, reversible migrations | N12 | **concern C1** |
| Background work: what happens if it doesn't run for an hour | No background jobs. Everything (low stock, dashboard) is computed when read | satisfied |
| Unit, integration (real database) and contract tests | N15 | planned |
| Structured logs with request ID | N6 | planned |
| Load test with p50/p95/p99 and a saturation point | N7 | planned (final, not Monday) |
| Seed data with awkward cases | R19 | planned |
| Five screen states; optimistic action with rollback; slow network | R17, R18, N11 | planned (R18 = archive/unarchive, DM11) |
| WCAG 2.2 AA plus a screen-reader test | N9 | planned (final) |
| LCP/INP target published and measured on the deployed address | N8 | planned (targets DM12) |
| Stale figures and estimates labelled | UI/UX section | planned |
| GitHub Actions deploys both tiers; failures block | Pipeline component | planned |
| Free tiers only; terms verified and dated | N14 | **concerns C2, C3** |
| Realistic demo data; no real organisation; simulated features labelled | N13, R20 | planned |
| Money exact (rubric) | N1 | planned |

## Areas of concern
| # | Concern | Policy owner | Resolution | Status |
|---|----|----|----|----|
| C1 | **Resolved (DM13): hand-written undo scripts, tested up → down → up in CI.** Reversible migrations against Flyway Community. The brief requires migrations that "can be reversed", but Flyway's undo migrations (`U__` scripts) are a paid Teams feature, not in Community. | Delivery and evidence owner (PD4) | Options: (a) a hand-written `db/rollback/R<version>__*.sql` for every migration, applied by a pipeline or manual job and tested in CI (up, down, up); (b) switch to Liquibase, whose free edition supports rollback; (c) forward-only "compensating" migrations, documented as the reversal strategy. Recorded as **PD9**. | open |
| C2 | **Spring Boot on Render free.** The free instance has limited memory (512 MB as last known) and sleeps when idle. JVM cold starts could take tens of seconds, which can stall the live demo, distort LCP and the load test, and leave a refused user "on a loading indicator". | Delivery and evidence owner | Verify current terms on Render's pricing page (date them). Tune the JVM (`-XX:MaxRAMPercentage=75`, Class Data Sharing / AOT cache), set an interface timeout with a "service waking up" state, and warm the service before demos. Measure cold start separately in N7. Fallback: another free host recorded in decisions.md. | open |
| C3 | **Partly resolved (DM9, [deploy-plan.md](../deploy-plan.md)): Neon for all databases; Render workspace split still open (PD5c).** **Free-tier quotas across two products.** Stockwise and Genie each need a service and a database. Render's monthly free instance hours and Neon's project or compute limits may be per account or workspace. | Delivery and evidence owner | Check both pricing pages on day 1 and decide one account versus several per product (**PD5**). | open |
| C4 | **Resolved by the team (DM5, option C, store credit); Goodnews still to confirm this is the intended design problem.** The brief names no "design problem" for Stockwise, though it says every main product has one. The proposed problem (reversing a partly repaid credit sale) still needs the supervisor to agree, and the team must choose among options A, B and C. | Goodnews (supervisor) and Team 3 | **PD1**. Until then, R12 refuses that case with `REVERSAL_NEEDS_DECISION`, which is labelled and honest. | open |
| C5 | **Showing the concurrency test fail with the protection removed** without breaking the deployed service. | Data and rules owner | Run the test in CI against Testcontainers with a "protection removed" migration profile, and capture the failing run as evidence. Run the protected version against the deployed service. Detail in plan.md and test-plan.md. | proposed |
| C6 | **Resolved (DM8): named area owners recorded.** **Individual-contribution evidence.** Nnaemeka works across all service areas, but the rubric's "Your own contribution" (15 points) judges "the area you owned". Without a recorded split, each engineer's marks are harder to evidence. | Team 3 and Goodnews | Record the area split on day 1 (**PD4**), even if engineers help across areas, and log the help as the brief requires. | open |
| C7 | **A new, heavy stack against a three-day MVP.** Java 25 and Spring Boot 4 are recent, so check Testcontainers, the OpenAPI generator and Spring Security 7 for compatibility. The JVM also adds build and deploy time in CI. | Team 3 | Pin versions on day 1, scaffold a walking-skeleton deploy before anything else, and fall back to Spring Boot 3.5 / Java 21 if a blocking incompatibility appears (record it in decisions.md). | open |
| C8 | **Load testing free-tier hosts.** Provider terms may limit load testing, and the saturation point will be low. | Delivery and evidence owner | Check the terms. Keep the load short and bounded, and report the low saturation point honestly as a property of the free tier. | open |

## Open questions carried from intent.md
- [x] Final submission date: answered, Tue 3 Nov 2026, with the MVP presentation on Mon 26 Oct (DM6)
- [x] Design problem option: answered, C store credit (DM5). Supervisor confirmation of the problem itself: UNRESOLVED (owner Goodnews)
- [x] Team 3 lead: answered, Isaac Bassey (DM7)
- [x] Service area split: answered (DM8). Nnaemeka: Data and rules. Isaac: API and access. Blessing: Delivery and evidence
- [ ] Weekend availability 24-25 Oct. UNRESOLVED (owner Goodnews)

New in Design (all in decisions.md):
- [x] PD5-PD12 answered (DM9-DM16). Still open: **PD5a** who funds the Qocent credits (owners Isaac Bassey and Goodnews), **PD5b** Qocent day-1 spike results and **PD5c** Render workspace per product (owner Blessing Nwafor). UNRESOLVED

## Measurement
- Leading: time from the intent.md commit to the spec.md commit.
- Lagging: commits to spec.md made after plan.md was first committed (requirements rework).

Frontend Sales History amendment (2026-10-25, DM57-DM58), scope approved by Victor Oyeleke and logged by Codex: use the existing GET /sales contract and IDs for responsive recorded-sale history. Today/Yesterday/Last 7 days use Africa/Lagos; entries remain non-interactive, original totals are integer kobo, and successful retrieval time is explicit. Display-name snapshots and receipt linking remain deferred. This verifies the selected R16/R17/N5/N9/N10 interface scope; it does not claim the full reversal/movement-history requirement complete. Evidence and pending API semantics are in docs/sales-history-ui.md and WORKLOG.
