# Spec: Real Sale Reversal & Oldest-First Repayment Allocation

Derived from: intent.md (2026-10-30) · Status: draft
Product owner: Victor Oyeleke / Team 3 · Technical sign-off: Isaac Bassey (API & access) & Nnaemeka Chukwuma (Data & rules)
Policies applied: TeSA Capstone Brief (Stockwise R11, R12, R10), integer kobo rule, RFC 9457 Problem Details, DM5 (excess repaid credit to store credit), DM10 (reversal permissions), DM13 (Flyway undo scripts)
Supporting skills: sdlc

## Summary
Implements authoritative OpenAPI contracts, database migrations, and Spring Boot backend transactions for real sale reversals and oldest-first credit repayment allocations. When a credit sale is reversed, inventory is returned to stock, the customer's outstanding debt is relieved only for that sale's unpaid portion, and any previously repaid amount is credited to store credit per DM5.

## Functional requirements
| ID | Requirement | Acceptance criterion (measurable) |
|----|-------------|-----------------------------------|
| R11 | Sale Reversal & Stock Restoration | `POST /sales/{saleId}/reversal` restores stock for all sale items via `SALE_REVERSAL` movement entries and marks sale `reversed_at = NOW()`. |
| R12 | Excess Repaid Debt to Store Credit | On reversing a partly repaid credit sale, the repaid amount (`total_kobo - unpaid_kobo`) is credited to customer store credit; any store credit drawn at checkout is restored. |
| R13 | Oldest-First Debt Repayment Allocation | `POST /repayments` allocates cash to customer credit sales in strictly ascending `(created_at, id)` order, decrementing `sale.unpaid_kobo` and creating immutable `repayment_allocation` rows. |
| R14 | Delegated Assistant Authorization | `POST /reversals/authorizations` allows `OWNER`/`ADMIN` to generate single-use 6-digit codes (15-min TTL); `ASSISTANT` must provide a valid unused code in `POST /sales/{saleId}/reversal`. |
| R15 | Reversal Idempotency & Single-Use | A sale can be reversed only once (`409 SALE_ALREADY_REVERSED` on subsequent attempts). Replay with identical `Idempotency-Key` returns original 200 response without duplicating effects. |
| R16 | Historical & Repayment Reversal Protection | Reversal of legacy sales lacking allocation records is rejected for manual review (`409 REVERSAL_MANUAL_REVIEW_REQUIRED`). Repayment reversal is blocked if store credit was already drawn (`409 REVERSAL_CONFLICT`). |

## Non-functional requirements
| ID | Category | Requirement | Acceptance criterion |
|----|----------|-------------|----------------------|
| N1 | Reliability | Integer Kobo Arithmetic | All financial fields (`unpaid_kobo`, `debt_relieved_kobo`, `store_credit_issued_kobo`) are `BIGINT` in PostgreSQL and `long` in Java bounded within `[0, 9007199254740991]`. |
| N2 | Reliability | Concurrency Serialization | Operations on customer balances acquire a pessimistic row lock (`SELECT id FROM customer WHERE id = ? FOR UPDATE`) preventing race conditions between concurrent repayments and reversals. |
| N3 | Security | Role-Based Access Control | `OWNER` and `ADMIN` can reverse sales without a code; `ASSISTANT` cannot reverse without a valid supervisor authorization code. |
| N4 | Auditability | Append-Only Ledger History | Customer ledger gains `SALE_REVERSAL` debt relief entry and `STORE_CREDIT` entry. Stock movements gain `SALE_REVERSAL` rows. No history row is modified or deleted. |
| N5 | Interoperability | RFC 9457 Errors | Validation failures and business rule violations return `application/problem+json` with documented machine-readable codes. |

## Design

### Components and responsibilities
1. **`SaleReversalController`**: Exposes `POST /sales/{saleId}/reversal`. Validates `Idempotency-Key`, role permissions, and supervisor code.
2. **`ReversalAuthorizationController`**: Exposes `POST /reversals/authorizations` for `OWNER`/`ADMIN` to mint 6-digit OTP codes.
3. **`SaleReversalService`**: Coordinates transactional reversal logic:
   - Locks customer row (`FOR UPDATE`).
   - Verifies sale exists, belongs to shop, and is not already reversed.
   - Atomically restores product stock quantities and appends `Movement` (`SALE_REVERSAL`).
   - Calculates debt relief = `sale.unpaid_kobo`.
   - Calculates store credit issued = `sale.total_kobo - sale.unpaid_kobo - sale.store_credit_used_kobo`.
   - Restores original store credit = `sale.store_credit_used_kobo`.
   - Appends customer ledger entries and updates `customer.balance_kobo` and `store_credit_kobo`.
   - Updates `sale` record with reversal audit fields and marks `unpaid_kobo = 0`.
4. **`RepaymentAllocationService`**: When a repayment occurs, fetches outstanding credit sales (`WHERE customer_id = ? AND unpaid_kobo > 0 AND reversed_at IS NULL ORDER BY created_at ASC, id ASC FOR UPDATE`). Apportions repayment across sales and inserts `repayment_allocation` records.

### Data flow
```
[Client / Cashier] 
      │
      ▼  POST /sales/{saleId}/reversal (Idempotency-Key, optional authCode)
[SaleReversalController]
      │
      ├──> If ASSISTANT: Validate & burn authCode in reversal_authorization
      │
      ├──> Acquire Lock: SELECT customer WHERE id = sale.customer_id FOR UPDATE
      │
      ├──> Update Products: UPDATE product SET stock_quantity = stock_quantity + sale_qty, version = version + 1
      │    └──> Insert into stock_movement (type: SALE_REVERSAL)
      │
      ├──> Update Balances:
      │    ├──> debt_relief = sale.unpaid_kobo
      │    ├──> store_credit_gain = (sale.total_kobo - sale.unpaid_kobo)
      │    ├──> customer.balance_kobo -= debt_relief
      │    └──> customer.store_credit_kobo += store_credit_gain
      │
      ├──> Insert into customer_ledger (SALE_REVERSAL, STORE_CREDIT)
      │
      ├──> Mark Sale: UPDATE sale SET reversed_at = NOW(), unpaid_kobo = 0, reversed_by = ...
      │
      └──> Return 200 OK (SaleReversalResponse)
```

### Interfaces and contracts
1. `POST /sales/{saleId}/reversal`:
   - Headers: `Idempotency-Key: <UUID>`
   - Request Body:
     ```json
     {
       "reason": "CUSTOMER_RETURN",
       "notes": "Returned unopened in original packaging",
       "authorizationCode": "583921"
     }
     ```
   - Response 200 OK:
     ```json
     {
       "saleId": "c9b7...UUID",
       "reversedAt": "2026-10-30T12:00:00Z",
       "reversedBy": "u1a2...UUID",
       "reason": "CUSTOMER_RETURN",
       "stockRestoredLines": [
         { "productId": "p1...UUID", "quantity": 2 }
       ],
       "debtRelievedKobo": 400000,
       "storeCreditIssuedKobo": 600000,
       "storeCreditRestoredKobo": 0,
       "newCustomerDebtKobo": 500000,
       "newCustomerStoreCreditKobo": 600000
     }
     ```
2. `POST /reversals/authorizations`:
   - Role: `OWNER`, `ADMIN`
   - Request Body: `{}` (empty)
   - Response 201 Created:
     ```json
     {
       "code": "583921",
       "expiresAt": "2026-10-30T12:15:00Z"
     }
     ```

### Data model
PostgreSQL Migration `V6__sale_reversal_allocation.sql`:
```sql
-- Alter sale table for reversal state and settlement tracking
ALTER TABLE sale
    ADD COLUMN reversed_at TIMESTAMPTZ NULL,
    ADD COLUMN reversed_by UUID NULL REFERENCES app_user(id),
    ADD COLUMN reversal_reason VARCHAR(64) NULL,
    ADD COLUMN reversal_notes TEXT NULL,
    ADD COLUMN unpaid_kobo BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN store_credit_used_kobo BIGINT NOT NULL DEFAULT 0;

-- Backfill existing credit sales: unpaid_kobo = total_kobo
UPDATE sale SET unpaid_kobo = total_kobo WHERE payment_type = 'CREDIT';

-- Repayment allocation table
CREATE TABLE repayment_allocation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(id),
    repayment_id UUID NOT NULL,
    sale_id UUID NOT NULL REFERENCES sale(id),
    amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES app_user(id)
);
CREATE INDEX idx_repayment_alloc_sale ON repayment_allocation(sale_id);
CREATE INDEX idx_repayment_alloc_cust ON repayment_allocation(customer_id);

-- Reversal authorization table (Supervisor OTP)
CREATE TABLE reversal_authorization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    used_by UUID NULL REFERENCES app_user(id),
    sale_id UUID NULL REFERENCES sale(id)
);
```

### UI / UX
Frontend already contains:
- `ReverseSaleDialog.tsx` with supervisor OTP input and reason selector.
- `GenerateReversalCodeDialog.tsx` with 6-digit monospace display and live countdown.
- Pointing `reversals.endpoints.ts` to real backend `/sales/{saleId}/reversal` and `/reversals/authorizations` seamlessly replaces mock simulation.

### Policy compliance
| Policy | How the design satisfies it | Status |
|--------|-----------------------------|--------|
| DM5 (Store credit excess) | Repaid cash is returned as store credit; debt reduces only by unpaid kobo. | Compliant |
| DM10 (Reversal permissions) | `OWNER`/`ADMIN` direct access; `ASSISTANT` gated by supervisor OTP. | Compliant |
| DM13 (Reversible migrations) | Hand-written `U6__sale_reversal_allocation.sql` tests up/down/up. | Compliant |
| Money Rule (Integer kobo) | All amounts strictly `BIGINT`/`long`, no decimal floats. | Compliant |
| Ledger Reconciliation (R10) | `customer.balance_kobo = SUM(sale.unpaid_kobo)` holds across all writes. | Compliant |

## Areas of concern
| # | Concern | Policy owner | Resolution | Status |
|---|---------|--------------|------------|--------|
| 1 | Legacy debt without allocation history | Victor Oyeleke / Nnaemeka Chukwuma | Adopted Victor's PR #40 rule: block for manual review with `409 REVERSAL_MANUAL_REVIEW_REQUIRED`. | Resolved |
| 2 | Repayment reversal after sale reversal | Victor Oyeleke / Nnaemeka Chukwuma | Adopted Victor's PR #40 rule: block for manual review with `409 REVERSAL_CONFLICT` if credit spent. | Resolved |
| 3 | Concurrent race between repayment & reversal | Nnaemeka Chukwuma | Resolved by acquiring pessimistic row-level lock (`SELECT ... FOR UPDATE`) on customer record. | Resolved |

## Measurement
- Leading: Time from intent.md to accepted spec.md.
- Lagging: Number of requirement changes or bug fixes to reversal calculation logic post-plan.
