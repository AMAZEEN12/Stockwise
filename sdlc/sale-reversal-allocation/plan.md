# Plan: Real Sale Reversal & Oldest-First Repayment Allocation

Derived from: intent.md (2026-10-30), spec.md (2026-10-30) · Status: draft
Accepted by: Nnaemeka Chukwuma (Data and rules owner) · Higher-risk sign-off: Isaac Bassey (API & access owner)
Supporting skills: sdlc

## Files that change
| File | New / modified / deleted | Requirements covered |
|------|--------------------------|----------------------|
| `contract/openapi.yaml` | modified | R11, R12, R14, R15, N5 |
| `decisions.md` | modified | Sign-off log and contract entries |
| `service/src/main/resources/db/migration/V6__sale_reversal_allocation.sql` | new | R11, R12, R13, R14, N1 |
| `service/src/main/resources/db/rollback/U6__sale_reversal_allocation.sql` | new | DM13 (Rollback testing) |
| `service/src/main/java/ng/tesa/stockwise/reversal/ReversalReason.java` | new | R11 |
| `service/src/main/java/ng/tesa/stockwise/reversal/SaleReversalRequest.java` | new | R11, R14 |
| `service/src/main/java/ng/tesa/stockwise/reversal/SaleReversalResponse.java` | new | R11, R12 |
| `service/src/main/java/ng/tesa/stockwise/reversal/ReversalAuthorization.java` | new | R14 |
| `service/src/main/java/ng/tesa/stockwise/reversal/ReversalAuthorizationRepository.java` | new | R14 |
| `service/src/main/java/ng/tesa/stockwise/reversal/ReversalAuthorizationController.java` | new | R14, N3 |
| `service/src/main/java/ng/tesa/stockwise/reversal/SaleReversalService.java` | new | R11, R12, R15, R16, N1, N2, N4 |
| `service/src/main/java/ng/tesa/stockwise/reversal/SaleReversalController.java` | new | R11, R14, R15, N3 |
| `service/src/main/java/ng/tesa/stockwise/customer/RepaymentAllocation.java` | new | R13, N4 |
| `service/src/main/java/ng/tesa/stockwise/customer/CustomerRepository.java` | modified | R12, R13, N2 |
| `service/src/main/java/ng/tesa/stockwise/common/ProblemHandler.java` | modified | N5 |
| `service/src/test/java/ng/tesa/stockwise/reversal/SaleReversalIT.java` | new | R11, R12, R14, R15, R16 |
| `service/src/test/java/ng/tesa/stockwise/customer/RepaymentAllocationIT.java` | new | R13 |
| `web/src/api/schema.d.ts` | modified | Regenerated types |
| `sdlc/sale-reversal-allocation/WORKLOG.md` | modified | Stage tracking |

## Order of work
1. **Contract definition (OpenAPI):** Add `POST /sales/{saleId}/reversal` and `POST /reversals/authorizations` to `contract/openapi.yaml`. Validate with Redocly CLI (`contract/redocly.yaml`).
2. **Database migration (V6 & U6):** Write Flyway migration `V6__sale_reversal_allocation.sql` and rollback `U6__sale_reversal_allocation.sql` (columns on `sale`, table `repayment_allocation`, table `reversal_authorization`). Test migration rollback via `MigrationRollbackIT`.
3. **Supervisor Authorization (OTP):** Implement `ReversalAuthorization` repository and controller (`POST /reversals/authorizations`) generating cryptographically secure 6-digit codes with 15-minute expiration for `OWNER`/`ADMIN`.
4. **Oldest-First Repayment Allocation Engine:** Implement `repayment_allocation` logic in `CustomerRepository` ensuring repayments allocate in ascending `(created_at, id)` order.
5. **Sale Reversal Service & Controller:** Implement atomic `POST /sales/{saleId}/reversal`:
   - Enforce single reversal and idempotency.
   - Enforce assistant OTP code verification.
   - Restore stock and append `Movement` (`SALE_REVERSAL`).
   - Relieve unpaid sale debt and convert repaid excess to store credit (DM5/R12).
   - Append `CustomerLedgerEntry` (`SALE_REVERSAL` and `STORE_CREDIT`).
6. **Error handling & RFC 9457:** Map `SALE_ALREADY_REVERSED`, `INVALID_AUTHORIZATION_CODE`, `AUTHORIZATION_EXPIRED`, `REVERSAL_MANUAL_REVIEW_REQUIRED`, and `REVERSAL_CONFLICT` in `ProblemHandler`.
7. **Testing & Evidence:** Run integration tests (`SaleReversalIT`, `RepaymentAllocationIT`), verify rule removal in `docs/rule-removal-log.md`, regenerate web contract types (`npm run generate:api`), and run web tests.

## Parallelization
- **Independent:**
  - Supervisor OTP authorization module (`reversal_authorization` table, repo, controller).
  - OpenAPI contract editing and web type generation.
- **Sequential:**
  - V6 Migration → Repayment allocation engine → Sale reversal service → End-to-end integration tests.

## Risks
| Risk | What it could break | Mitigation |
|------|---------------------|------------|
| Concurrency race on customer debt | Over-relieving debt or overallocating repayments | Acquire pessimistic lock (`SELECT id FROM customer WHERE id = ? FOR UPDATE`) before calculating debt/credit effects. |
| Inconsistent store credit | Creating negative store credit on subsequent adjustments | Enforce `CHECK (store_credit_kobo >= 0)` and reject conflicting operations with 409. |
| Non-deterministic allocation | Sales allocated differently on replay | Order strictly by `(created_at ASC, id ASC)`. |

**Riskiest step:** The atomic reversal transaction inside `SaleReversalService` where stock, customer debt, and store credit are adjusted simultaneously across multiple tables.

## Alternatives considered
- *Allowing negative customer debt:* Rejected per DM5 and brief invariants; negative balances confuse shopkeepers and violate database constraints.
- *Netting store credit against older credit sales automatically:* Rejected per proposal; customer debt and store credit remain distinct balances so customers retain full visibility and agency over their account position.

## Proof
| Requirement | Test or check that proves it |
|-------------|------------------------------|
| R11 (Stock restoration) | `SaleReversalIT.reversingSaleRestoresStockAndAppendsMovement()` |
| R12 (Excess to store credit) | `SaleReversalIT.reversingPartiallyRepaidCreditSaleIssuesStoreCredit()` |
| R13 (Oldest-first allocation) | `RepaymentAllocationIT.repaymentAllocatesToOldestSalesFirst()` |
| R14 (Assistant authorization) | `SaleReversalIT.assistantRequiresValidSupervisorOtp()` |
| R15 (Idempotency) | `SaleReversalIT.reversalIsIdempotentWithSameKey()` |
| N1 (Integer kobo) | `SchemaRulesIT` asserts `BIGINT` columns on `sale` and `repayment_allocation`. |
| N2 (Serialization) | `SaleReversalIT.concurrentReversalAndRepaymentDoesNotCorruptBalances()` |

## Plan maintenance
If implementation departs from this plan, update this file in the same commit as the code.

## Measurement
- Leading: Time from plan acceptance to green integration tests.
- Lagging: Zero production bugs on reversal accounting or inventory movements.
