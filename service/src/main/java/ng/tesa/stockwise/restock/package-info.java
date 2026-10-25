/**
 * Restocks: add stock with an Idempotency-Key. Not started (after Monday).
 *
 * <p>Owner area: Data and rules (service) with API and access (controller). Contract paths: restock paths, not yet in the contract.
 * <p>Layout to follow (copy the {@code sale} package): record types, {@code XRepository} (JdbcClient, plain SQL),
 * {@code XService} (transaction), {@code XController} (API owner), exceptions in {@code XExceptions}.
 * Tests: {@code XIT} against real Postgres, one rule test per business rule that fails when the rule is removed.
 * Delete this file when the first real class lands.
 */
package ng.tesa.stockwise.restock;
