# Intent: Priority Backend Services, Sale Reversal & Oldest-First Allocation

Author: Nnaemeka Chukwuma (Data and rules owner) · Product owner: Victor Oyeleke / Team 3 · Status: accepted
Accepted by: Nnaemeka Chukwuma (2026-11-02) · Technical sign-off: Isaac Bassey (API & access owner, 2026-11-02)
Source document: `Api_awaiting_implementation.docx`, `docs/oldest-outstanding-sale-allocation-proposal.md`, PR #40, and `Tesa cohort 6 software engineering capstone project.pdf` (Stockwise R1, R9, R11, R12, R13, R18) · Entry route: ticket
Source of truth: repository (`contract/openapi.yaml`, `decisions.md`, `sdlc/`)
Supporting skills: sdlc

## Problem
1. **Sale Reversal & Repayment Allocation (R11, R12):** When a customer purchases goods on credit and later makes repayments, tracking only aggregate customer debt balance prevents deterministic reversal of credit sales. Without granular tracking of which sale was paid, reversing a partially repaid credit sale either corrupts debt balances into negative numbers (violating database constraints) or fails to credit the repaid cash back to the customer as store credit (DM5/R12).
2. **Customer Repayments (R9):** The backend previously had repository methods for recording repayments and allocating them, but lacked public HTTP endpoints (`POST /repayments` and `POST /customers/{customerId}/repayments`) allowing cashiers and store owners to record incoming debt repayments via API.
3. **Store Credit Settlement (R12):** Store credit could not be granted directly via API (`POST /customers/{customerId}/store-credit`), and `POST /sales` checkout lacked an automated drawdown mechanism (`useStoreCredit: boolean`) to decrement store credit and offset debt atomically during sale creation.
4. **Product Edit & Optimistic Archiving (R1, R18):** Store owners had no HTTP endpoint to update product details or archive/unarchive products (`PATCH /products/{productId}`) with optimistic concurrency control (`If-Match: version`), exposing catalog edits to lost-update races.

## Proposed outcome
Implement authoritative OpenAPI contracts (v0.5.0) and backend Spring Boot services for all Priority 1 items:
1. **Product Edit & Optimistic Concurrency (`PATCH /products/{productId}`):**
   - OWNER-only endpoint for editing product reference, name, category, price, low stock threshold, and active status (archive/unarchive).
   - Optimistic concurrency control requiring `If-Match: "<version>"` or `If-Match: <version>`. Returns 412 `VERSION_CONFLICT` if the version has changed.
   - Unique reference collision guard returning 409 `DUPLICATE_REFERENCE`.
2. **Customer Repayments (`POST /repayments` and `POST /customers/{customerId}/repayments`):**
   - OWNER or ASSISTANT endpoint accepting repayments in integer kobo.
   - Replay-safe using `Idempotency-Key` header with in-memory caching.
   - Allocates funds across outstanding credit sales in deterministic ascending `(created_at, id)` order.
   - Appends append-only `REPAYMENT` ledger entries and creates `repayment_allocation` records.
3. **Store Credit Settlement (`POST /customers/{customerId}/store-credit` & `POST /sales`):**
   - OWNER or ADMIN endpoint granting store credit and recording `STORE_CREDIT` ledger entries.
   - Sale checkout extension: `SaleCreate.useStoreCredit: boolean`. When true, draws down available store credit via pessimistic row lock (`SELECT balance_kobo, store_credit_kobo FROM customer FOR UPDATE`), calculates net credit, and charges debt only for the remaining balance.
   - Records `Sale.storeCreditUsedKobo` and restores tender store credit upon sale reversal.
4. **Atomic Sale Reversal (`POST /sales/{saleId}/reversal`):**
   - Restores inventory stock for all line items via `SALE_REVERSAL` movements.
   - Relieves customer debt only for the sale's remaining unpaid debt.
   - Converts previously repaid cash into store credit per DM5/R12.
   - Enforces single reversal and idempotency.
5. **Secondary Feature Proposals Awaiting Agreement:**
   - Formalized and documented proposals for supervisor OTP codes (`POST /reversals/authorizations`), price protection guards (`expectedUnitPriceKobo` and 409 `PRODUCT_CHANGED`), quote locking (`POST /quotes`), idempotency lookup (`GET /sales/submissions/:key`), user registration & session endpoints, and public customer portal access.

## Affected users and systems
- **Users:** Shop Owners, Store Administrators, Cashiers/Assistants, Customers.
- **Systems:** 
  - `ProductController` & `ProductRepository`
  - `CustomerController` & `CustomerRepository`
  - `SaleController`, `SaleService`, & `SaleRepository`
  - `SaleReversalController`, `SaleReversalService`, & `ReversalAuthorizationController`
  - `contract/openapi.yaml` (v0.5.0) & `web/src/api/schema.d.ts`

## Constraints
- **Integer Kobo:** All monetary values strictly `BIGINT` in PostgreSQL and `long` in Java bounded within `[0, 9007199254740991]`. No floating-point math.
- **No Schema Migrations Needed:** Priority 1 features utilize existing V2 (`product.version`) and V6 (`sale.store_credit_used_kobo`, `sale.unpaid_kobo`, `repayment_allocation`, `reversal_authorization`) tables and columns.
- **Optimistic Concurrency:** `If-Match: version` header required on `PATCH /products/{id}`. Mismatch returns HTTP 412 `VERSION_CONFLICT`.
- **Append-Only Ledger:** Historical ledger entries and stock movements are never updated or deleted; reversals append new offsetting entries.
- **Customer Row Serialization:** Operations affecting customer debt, allocations, and store credit acquire a consistent row-level lock on the customer record (`FOR UPDATE`).

## Out of scope
- Merging unapproved secondary proposals into the active contract before team agreement.
- Automatic netting of store credit against unrelated credit sales (debt and store credit remain distinct per DM5).

## Success criteria
1. 100% pass rate on backend unit tests (13/13).
2. Redocly contract lint passes cleanly with zero errors on `contract/openapi.yaml` (v0.5.0).
3. Web API types regenerated successfully with zero typecheck or lint errors.
4. All 58 web unit tests passing.
5. Two-engineer sign-off recorded in `decisions.md` §3 (Nnaemeka Chukwuma and Isaac Bassey).
