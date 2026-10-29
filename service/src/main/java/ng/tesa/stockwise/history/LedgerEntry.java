package ng.tesa.stockwise.history;

import java.time.Instant;
import java.util.UUID;

/**
 * One entry in a customer's ledger (contract {@code LedgerEntry}, spec R10). {@code balanceAfterKobo}
 * is what the customer owed right after it; {@code storeCreditAfterKobo} is the store credit they
 * held right after it. A {@code STORE_CREDIT} entry changes store credit only (DM5 convention).
 */
public record LedgerEntry(UUID id, String sourceType, UUID sourceId, long deltaKobo, long balanceAfterKobo,
                          long storeCreditAfterKobo, Instant createdAt) {
}
