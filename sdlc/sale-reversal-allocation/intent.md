# Intent: Real Sale Reversal & Oldest-First Repayment Allocation

Author: Nnaemeka Chukwuma (Data and rules owner) · Product owner: Victor Oyeleke / Team 3 · Status: draft
Created: 2026-10-30 · Accepted: pending
Source document: `docs/oldest-outstanding-sale-allocation-proposal.md`, PR #40, and `Tesa cohort 6 software engineering capstone project.pdf` (Stockwise R11, R12) · Entry route: ticket
Source of truth: repository (`contract/openapi.yaml`, `decisions.md`, `sdlc/`)
Supporting skills: sdlc

## Problem
When a customer purchases goods on credit and later makes partial repayments, the current system tracks only the customer's aggregate debt balance. It does not record how repayments divide among individual sales. 

When a credit sale must be reversed (due to product returns, damage, or cashier correction), the system cannot determine how much of that specific sale was already paid versus still owed. Consequently:
1. Reversing the entire sale amount from total debt would produce negative customer balances if repayments were already received, violating database constraints and financial ledger reconciliation (PD1/DM5).
2. The shop would fail to honor cash already received by not converting the repaid portion into store credit (R12).
3. The frontend currently operates on in-memory mock simulations (`feat/sale-reversal-simulation`), leaving R11 and R12 unimplemented on the real backend service.

## Proposed outcome
Implement real backend services and authoritative OpenAPI contracts for sale reversals and deterministic credit repayment allocation:
1. **Deterministic Repayment Allocation:** Customer debt repayments automatically allocate to eligible outstanding credit sales in ascending `(created_at, id)` order, with customer UUID isolation.
2. **Atomic Sale Reversal (`POST /sales/{saleId}/reversal`):**
   - Restores physical stock for all items in the sale and appends reversing `SALE_REVERSAL` inventory movements (R11).
   - Reduces the customer's debt balance only by that sale's remaining unpaid debt.
   - Credits any cash previously repaid toward this sale into the customer's store credit (DM5, R12), and restores any store credit originally tendered at checkout.
   - Marks the sale as reversed so it cannot be reversed again or receive further repayments.
3. **Delegated Authorization & Access Control:** Direct reversal access for `OWNER` and `ADMIN` (DM10); validated single-use supervisor OTP authorization code required for `ASSISTANT`.
4. **Auditability & Integrity:** Immutable `repayment_allocation` records and append-only ledger entries preserving strict mathematical reconciliation: `customer.debt_kobo = SUM(sale.unpaid_kobo)` and `customer.store_credit_kobo >= 0`.

## Affected users and systems
- **Users:** Shop Owners, Store Administrators, Cashiers/Assistants, Customers.
- **Systems:** 
  - `POST /sales/{saleId}/reversal` (contract & service controller)
  - `POST /repayments` (repayment allocation engine)
  - `POST /reversals/authorizations` (supervisor OTP authorization)
  - `CustomerRepository`, `SaleRepository`, `LedgerQueries`
  - Flyway migration `V6__sale_reversal_allocation.sql` with undo script `U6__sale_reversal_allocation.sql`

## Constraints
- **Integer Kobo:** All monetary values strictly `BIGINT` in PostgreSQL and `long` in Java, within JavaScript safe integer bounds `[0, 9007199254740991]`. No floating-point math.
- **Non-Negative Balances:** Database-enforced `CHECK (balance_kobo >= 0)` and `CHECK (store_credit_kobo >= 0)`.
- **Append-Only Ledger:** Historical ledger entries and stock movements are never updated or deleted; reversals append new offsetting entries.
- **Customer Serialization:** Operations affecting customer debt, allocations, and store credit acquire a consistent row-level lock on the customer record (`FOR UPDATE`) to prevent race conditions during concurrent repayments and reversals.
- **PR #40 Policies:**
  - Where legacy historical data cannot be reliably allocated to individual sales, sale reversal is blocked for manual review (`409 REVERSAL_MANUAL_REVIEW_REQUIRED`).
  - Repayment reversal after a sale reversal is blocked for manual review if the resulting store credit has already been drawn down (`409 REVERSAL_CONFLICT`).
  - Reversing a sale that utilized store credit restores that original store credit in addition to credit earned from allocated repayments.

## Out of scope
- Automatic netting of store credit against unrelated outstanding credit sales (customer debt and store credit remain distinct per DM5).
- Cash refunds for store credit (store credit is applied to future sales).
- Restock delivery reversals (deferred to a separate administrative workflow).

## Success criteria
1. TeSA Capstone requirements R11 (sale reversal restoring inventory and adjusting balance) and R12 (partial repayment converted to store credit) pass automated integration tests against real PostgreSQL Testcontainers.
2. The two-sale test scenario from the proposal passes:
   - Sale A (₦10,000 credit) + Sale B (₦5,000 credit) -> Debt = ₦15,000.
   - Repay ₦6,000 -> Allocates to A (A owes ₦4,000, B owes ₦5,000, Debt = ₦9,000, Credit = ₦0).
   - Reverse A -> Stock restored, A debt (₦4,000) removed, repaid (₦6,000) credited as store credit -> Debt = ₦5,000, Credit = ₦6,000, Sale B still owed.
3. Database guard tests fail when the constraint is removed (evidence logged in `docs/rule-removal-log.md`).
4. Reversal and repayment endpoints are strictly idempotent on retries with identical `Idempotency-Key`.

## Open questions
- None (intake questions Q1–Q5 answered and PR #40 policy directions adopted).

## Measurement
- Leading: Time from intake to accepted `intent.md` and `spec.md`.
- Lagging: 100% pass rate on `SaleReversalIT` and `RepaymentAllocationIT` with zero regression on existing 88+ service tests.
