# Plan: Priority Backend Services, Sale Reversal & Oldest-First Allocation

Derived from: intent.md (2026-11-02), spec.md (2026-11-02) · Status: accepted
Accepted by: Nnaemeka Chukwuma (Data and rules owner, 2026-11-02) · Higher-risk sign-off: Isaac Bassey (API & access owner, 2026-11-02)
Supporting skills: sdlc

## Files that change
| File | New / modified / deleted | Requirements covered |
|------|--------------------------|----------------------|
| `contract/openapi.yaml` | modified | R1, R9, R11, R12, R14, R15, R18, N5 |
| `decisions.md` | modified | Reconciled sign-off log for v0.4.0 and v0.5.0 |
| `service/src/main/java/ng/tesa/stockwise/product/Product.java` | modified | R1, R18 (Added `Product.Update` record) |
| `service/src/main/java/ng/tesa/stockwise/product/ProductRepository.java` | modified | R1, R18 (Implemented optimistic `update` method) |
| `service/src/main/java/ng/tesa/stockwise/product/ProductController.java` | modified | R1, R18 (Exposed `PATCH /products/{id}` with `If-Match`) |
| `service/src/main/java/ng/tesa/stockwise/common/PreconditionFailedException.java` | new | R1 (HTTP 412 exception) |
| `service/src/main/java/ng/tesa/stockwise/common/ErrorCode.java` | modified | R1 (`VERSION_CONFLICT`) |
| `service/src/main/java/ng/tesa/stockwise/common/ProblemHandler.java` | modified | R1, N5 (Mapped `PreconditionFailedException` and `IllegalArgumentException`) |
| `service/src/main/java/ng/tesa/stockwise/config/SecurityConfig.java` | modified | N3 (Role permissions for PATCH products, repayments, store credit) |
| `service/src/main/java/ng/tesa/stockwise/customer/CustomerRepository.java` | modified | R9, R12, R13 (Repayment idempotency replay, `issueStoreCredit`) |
| `service/src/main/java/ng/tesa/stockwise/customer/CustomerController.java` | modified | R9, R12 (`POST /repayments`, `POST /store-credit`) |
| `service/src/main/java/ng/tesa/stockwise/sale/Sale.java` | modified | R12 (Added `storeCreditUsedKobo`) |
| `service/src/main/java/ng/tesa/stockwise/sale/NewSale.java` | modified | R12 (Added `useStoreCredit`) |
| `service/src/main/java/ng/tesa/stockwise/sale/SaleRepository.java` | modified | R12 (`applyStoreCredit`, `setTotal`, `findSale`, `list`) |
| `service/src/main/java/ng/tesa/stockwise/sale/SaleService.java` | modified | R12 (Checkout store credit deduction and net debt calculation) |
| `service/src/main/java/ng/tesa/stockwise/sale/SaleRequestHash.java` | modified | R12 (Includes `useStoreCredit` in canonical hash) |
| `service/src/test/java/ng/tesa/stockwise/product/ProductValidationTest.java` | modified | R1 (`UpdateRequest` validation) |
| `service/src/test/java/ng/tesa/stockwise/customer/CustomerValidationTest.java` | new | R9, R12 (Repayment and store credit request validation) |
| `service/src/test/java/ng/tesa/stockwise/product/ProductEditIT.java` | new | R1, R18 (6 integration test scenarios) |
| `service/src/test/java/ng/tesa/stockwise/customer/CustomerRepaymentEndpointIT.java` | new | R9, R13 (4 integration test scenarios) |
| `service/src/test/java/ng/tesa/stockwise/customer/StoreCreditSettlementIT.java` | new | R12 (2 integration test scenarios) |
| `web/src/api/schema.d.ts` | modified | Regenerated OpenAPI TypeScript types |
| `sdlc/sale-reversal-allocation/WORKLOG.md` | modified | Stage tracking |

## Order of work
1. **Contract definition (OpenAPI):** Bump to v0.5.0 in `contract/openapi.yaml`. Add `PATCH /products/{id}`, `POST /repayments`, `POST /customers/{id}/store-credit`, `SaleCreate.useStoreCredit`, `Sale.storeCreditUsedKobo`, schemas, parameters, and responses. Validate with Redocly CLI.
2. **Web Contract Sync:** Run `npm run generate:api` in `web/` to produce updated `src/api/schema.d.ts`. Verify with `npm run typecheck` and `npm run lint`.
3. **Backend Priority 1 Implementation:**
   - Product edit & archive: Add `Product.Update`, `PreconditionFailedException`, update repository method with optimistic version check, and controller `PATCH` handler.
   - Customer repayments: Expose `POST /repayments` and `POST /customers/{customerId}/repayments` with idempotency replay cache.
   - Store credit settlement: Expose `POST /customers/{customerId}/store-credit`, integrate `applyStoreCredit` during sale creation in `SaleService`.
4. **Security Configuration:** Update `SecurityConfig.java` to enforce OWNER-only for PATCH products, OWNER/ADMIN for store credit, OWNER/ASSISTANT for repayments.
5. **Testing & Verification:**
   - Write and run unit tests for request records and validation.
   - Write integration tests: `ProductEditIT`, `CustomerRepaymentEndpointIT`, `StoreCreditSettlementIT`.
   - Run backend Maven test suite (`./mvnw.cmd test`).
   - Run frontend Vitest suite (`npm test -- --run`).
6. **Reconciliation & Sign-off:** Update `decisions.md` §3 with dual-engineer approval (Nnaemeka Chukwuma and Isaac Bassey). Update SDLC runbook and worklogs.

## Risks & Mitigations
| Risk | What it could break | Mitigation |
|------|---------------------|------------|
| Lost updates on product edits | Concurrent edits overwrite each other | Enforce optimistic locking via `If-Match: version` header; mismatch returns 412 `VERSION_CONFLICT`. |
| Store credit race condition | Negative store credit balance | Lock customer record (`SELECT ... FOR UPDATE`) before calculating available store credit and deducting amount. |
| Duplicate product references | Unique constraint violation in database | Handled explicitly in repository; throws `DuplicateReferenceException` mapped to 409 `DUPLICATE_REFERENCE`. |

## Proof
| Requirement | Test that proves it |
|-------------|---------------------|
| R1 (Product edit & 412) | `ProductEditIT.patchProductOptimisticLockSuccess` & `patchProductVersionMismatchReturns412` |
| R9 (Repayments & oldest-first) | `CustomerRepaymentEndpointIT.recordRepaymentAllocatesOldestFirst` |
| R12 (Store credit grant & checkout) | `StoreCreditSettlementIT.saleCheckoutDrawsDownStoreCreditAtomically` |
| R18 (Archive/unarchive) | `ProductEditIT.archiveAndUnarchiveProduct` |
| Contract validity | `@redocly/cli lint contract/openapi.yaml` (0 errors) |
| Web compatibility | `npm run typecheck` (0 errors) & 58 Vitest tests passing |
