# Rule-removal log

Evidence that each protection's test **fails when the protection is removed** (brief: "a test that passes both before and after proves nothing"; test-plan "Done-targets"; REVIEW.md). Each entry: what was removed, which test was run, what it reported. The protection was restored right afterwards and the full suite re-run green.

Method: a harness deletes the protection from the source file, runs only the named integration test against real Postgres 17 (Testcontainers), reports, and restores the file. Backups are kept outside `src/`.

| Date | Rule | Protection removed | Test run | Result with protection removed | By |
|----|----|----|----|----|----|
| 2026-10-23 | R4 backstop: stock never below zero | `CONSTRAINT product_quantity_non_negative` (V2) | `SchemaRulesIT#productQuantityCannotGoNegative` | **Failed**: "Expecting code to raise a throwable" (the negative quantity was accepted) | agent, for Nnaemeka Chukwuma |
| 2026-10-23 | R8: credit sale requires a customer | `CONSTRAINT sale_credit_requires_customer` (V3) | `SchemaRulesIT#creditSaleRequiresCustomer` | **Failed**: the credit sale without a customer was accepted | agent, for Nnaemeka Chukwuma |
| 2026-10-23 | R5: one sale per idempotency key | `CONSTRAINT sale_idempotency_key_uq` (V3) | `SchemaRulesIT#idempotencyKeyIsUnique` | **Failed**: the duplicate key was accepted | agent, for Nnaemeka Chukwuma |
| 2026-10-23 | R12: store credit never below zero | `CONSTRAINT customer_store_credit_non_negative` (V3) | `SchemaRulesIT#customerBalanceAndStoreCreditCannotGoNegative` | **Failed** at the store-credit assertion. (A first attempt left a dangling comma, so the migration failed for the wrong reason. It was redone and only this valid run counts.) | agent, for Nnaemeka Chukwuma |
| 2026-10-23 | N12: undo restores the schema | `DROP TABLE customer` deleted from U3 | `MigrationRollbackIT#upDownUpRestoresTheSchemaAtEveryStep` | **Failed**: "schema after undoing V3" differed from the schema at V2 | agent, for Nnaemeka Chukwuma |
| 2026-10-23 | N12: undo restores the schema | U2 emptied | `MigrationRollbackIT#upDownUpRestoresTheSchemaAtEveryStep` | **Failed**: "schema after undoing V2" differed from the schema at V1 | agent, for Nnaemeka Chukwuma |

Still to come: the **service-level** guard for R4 (`UPDATE … WHERE quantity >= :q` in the sale transaction) with `SaleConcurrencyIT` on the `evidence/no-stock-guard` branch (EXECUTION step 12), and the R15 role check (`AuthorizationIT`, step 7).
