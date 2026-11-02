# Spec: Priority Backend Services, Sale Reversal & Oldest-First Allocation

Derived from: intent.md (2026-11-02) · Status: accepted
Product owner: Victor Oyeleke / Team 3 · Technical sign-off: Isaac Bassey (API & access owner, 2026-11-02) & Nnaemeka Chukwuma (Data & rules owner, 2026-11-02)
Policies applied: TeSA Capstone Brief (Stockwise R1, R9, R11, R12, R13, R18), integer kobo rule, RFC 9457 Problem Details, DM5 (excess repaid credit to store credit), DM10 (reversal permissions), DM13 (Flyway undo scripts)
Supporting skills: sdlc

## Summary
Implements authoritative OpenAPI contract v0.5.0 and backend Spring Boot services for Priority 1 requirements: Product editing & optimistic archiving (`PATCH /products/{id}`), customer debt repayments with oldest-first credit sale allocation (`POST /repayments`), customer store credit issuance and checkout drawdown (`POST /customers/{id}/store-credit`, `POST /sales` extension), and atomic sale reversals with supervisor OTP authorizations (`POST /sales/{id}/reversal`). Secondary feature proposals awaiting team agreement are formally recorded.

## Functional requirements
| ID | Requirement | Acceptance criterion (measurable) |
|----|-------------|-----------------------------------|
| R1 | Product Edit & Concurrency | `PATCH /products/{productId}` updates reference, name, category, price, threshold, and active flag (OWNER-only). Requires `If-Match: version`; returns 412 `VERSION_CONFLICT` on version mismatch, 409 on duplicate reference. |
| R9 | Customer Debt Repayments | `POST /repayments` (and `/customers/{customerId}/repayments`) allocates repayment to oldest unpaid credit sales in ascending `(created_at, id)` order; records `REPAYMENT` ledger entries. Replay-safe via `Idempotency-Key`. |
| R11 | Sale Reversal & Stock Restoration | `POST /sales/{saleId}/reversal` restores stock for all sale items via `SALE_REVERSAL` movement entries and marks sale `reversed_at = NOW()`. |
| R12 | Store Credit Grant & Settlement | `POST /customers/{customerId}/store-credit` issues credit (OWNER/ADMIN). `POST /sales` with `useStoreCredit: true` draws down available customer store credit, offsets debt, and records `Sale.storeCreditUsedKobo`. On reversing a partly repaid credit sale, excess repaid debt converts to store credit (DM5); tendered credit is restored. |
| R13 | Oldest-First Allocation Engine | Repayments allocate to oldest unpaid credit sales with customer UUID isolation, decrementing `sale.unpaid_kobo` and creating immutable `repayment_allocation` rows. |
| R14 | Delegated Assistant OTP Authorization | `POST /reversals/authorizations` allows `OWNER`/`ADMIN` to mint 6-digit OTP codes (15-min TTL); `ASSISTANT` must provide a valid code in `POST /sales/{saleId}/reversal`. |
| R15 | Reversal Idempotency & Single-Use | A sale can be reversed only once (`409 SALE_ALREADY_REVERSED`). Replay with identical `Idempotency-Key` returns original 200 response. |
| R16 | Historical & Repayment Reversal Guard | Legacy sales lacking allocation records require manual review (`409 REVERSAL_MANUAL_REVIEW_REQUIRED`). Repayment reversal blocked if store credit was already drawn (`409 REVERSAL_CONFLICT`). |
| R18 | Product Archiving / Unarchiving | Setting `active: false` via `PATCH /products/{id}` archives the product; setting `active: true` unarchives it. Optimistic concurrency check applies. |

## Non-functional requirements
| ID | Category | Requirement | Acceptance criterion |
|----|----------|-------------|----------------------|
| N1 | Reliability | Integer Kobo Arithmetic | All financial fields (`price_kobo`, `unpaid_kobo`, `store_credit_kobo`, `amount_kobo`) are `BIGINT` in PostgreSQL and `long` in Java bounded within `[0, 9007199254740991]`. |
| N2 | Reliability | Concurrency Serialization | Operations on customer balances acquire a pessimistic row lock (`SELECT balance_kobo, store_credit_kobo FROM customer WHERE id = ? FOR UPDATE`) preventing race conditions between concurrent checkout, repayments, and reversals. |
| N3 | Security | Role-Based Access Control | `PATCH /products/*` is OWNER-only. `POST /customers/*/store-credit` is OWNER/ADMIN. `POST /repayments` is OWNER/ASSISTANT. Direct sale reversal is OWNER/ADMIN; ASSISTANT requires supervisor OTP. |
| N4 | Auditability | Append-Only Ledger History | Customer ledger gains append-only entries (`REPAYMENT`, `STORE_CREDIT`, `SALE_REVERSAL`). Stock movements gain `SALE_REVERSAL` rows. No history row is modified or deleted. |
| N5 | Interoperability | RFC 9457 Errors | Validation failures and business rule violations return `application/problem+json` with documented machine-readable codes (`VERSION_CONFLICT`, `VALIDATION_FAILED`, etc.). |

## Design

### Components and responsibilities
1. **`ProductController` & `ProductRepository`**:
   - `PATCH /api/v1/products/{productId}`: Parses `If-Match` header (stripped of quotes). Invokes `ProductRepository.update(id, expectedVersion, update)`.
   - Executes optimistic atomic SQL: `UPDATE product SET ... WHERE id = :id AND version = :expectedVersion`. Returns 412 if zero rows updated and product exists.
2. **`CustomerController` & `CustomerRepository`**:
   - `POST /api/v1/customers/{customerId}/store-credit`: Validates `StoreCreditGrantRequest`. Acquires pessimistic customer lock, increments `store_credit_kobo`, and appends `STORE_CREDIT` ledger entry. Replay-safe.
   - `POST /api/v1/repayments` & `POST /api/v1/customers/{customerId}/repayments`: Validates `RepaymentRequest` / `RepaymentAmountRequest`. Calls `recordRepayment(customerId, amountKobo, userId, idempotencyKey)`.
   - Queries unpaid sales ordered by `(created_at ASC, id ASC) FOR UPDATE`. Decrements `unpaid_kobo`, creates `repayment_allocation`, appends `REPAYMENT` ledger entry. Replay-safe with in-memory idempotency cache.
3. **`SaleService` & `SaleRepository`**:
   - Integrates store credit drawdown: when `useStoreCredit == true`, executes `SaleRepository.applyStoreCredit(customerId, saleId, totalKobo)`.
   - Decrements customer store credit, appends `-drawn` `STORE_CREDIT` ledger entry, sets `Sale.storeCreditUsedKobo`, and records credit debt only for `netCredit = total - storeCreditUsed`.
4. **`SaleReversalService` & `SaleReversalController`**:
   - Coordinates transactional reversal: restores stock (`SALE_REVERSAL` movement), relieves unpaid debt, converts repaid excess to store credit (DM5), restores tendered store credit, and marks sale reversed.
5. **`ReversalAuthorizationController`**:
   - Mints 6-digit OTP codes for `OWNER`/`ADMIN` with 15-minute TTL.

### Interfaces and contracts
1. `PATCH /products/{productId}`:
   - Header: `If-Match: "<version>"`
   - Body: `ProductUpdate` (optional fields: `reference`, `name`, `category`, `priceKobo`, `lowStockThreshold`, `active`)
   - Responses: `200 OK` (`Product`), `400`, `401`, `403`, `404`, `409` (`DUPLICATE_REFERENCE`), `412` (`VERSION_CONFLICT`).
2. `POST /customers/{customerId}/store-credit`:
   - Header: `Idempotency-Key: <UUID>` (optional)
   - Body: `StoreCreditGrantRequest` (`amountKobo`, `reason`, optional `note`)
   - Responses: `201 Created` (`Customer`), `400`, `401`, `403`, `404`, `422`.
3. `POST /repayments` & `POST /customers/{customerId}/repayments`:
   - Header: `Idempotency-Key: <UUID>` (optional)
   - Body: `RepaymentCreate` / `RepaymentAmountRequest` (`amountKobo`, `customerId`)
   - Responses: `201 Created` (`RepaymentResponse`), `400`, `401`, `403`, `404`, `422`.
4. `POST /sales`:
   - Body extension: `SaleCreate.useStoreCredit: boolean` (optional, default false)
   - Response: `Sale` includes `storeCreditUsedKobo: Kobo`.
5. `POST /sales/{saleId}/reversal`:
   - Header: `Idempotency-Key: <UUID>`
   - Body: `SaleReversalRequest` (`reason`, `note`, optional `authorizationCode`)
   - Responses: `200 OK` (`SaleReversalResponse`), `400`, `401`, `403`, `404`, `409`, `422`.

## Secondary Feature Proposals Awaiting Agreement
The following proposals from `Api_awaiting_implementation.docx` are documented and held awaiting team consensus:
- **Price Protection & Quotes:** `SaleLineCreate.expectedUnitPriceKobo` with 409 `PRODUCT_CHANGED`; `POST /quotes` quote locking; `GET /sales/submissions/:key` idempotency lookup.
- **Supervisor Reversal OTP:** `POST /reversals/authorizations` (implemented in service, awaiting active contract inclusion).
- **User Registration & Sessions:** `POST /auth/registrations` and session management.
- **Customer Portal & Pre-orders:** Public tokenized access (`/c/:token`) and online ordering.
