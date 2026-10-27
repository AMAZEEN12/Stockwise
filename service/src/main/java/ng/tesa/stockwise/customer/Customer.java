package ng.tesa.stockwise.customer;

import java.time.Instant;
import java.util.UUID;

/**
 * A customer (contract {@code Customer}). {@code balanceKobo} is what they owe and
 * {@code storeCreditKobo} what the shop owes them (DM5); both are cached values that
 * reconcile to {@code ledger_entry}.
 */
public record Customer(
        UUID id,
        String displayName,
        String contactPlaceholder,
        long balanceKobo,
        long storeCreditKobo,
        boolean hasDebtActivity,
        boolean hasStoreCreditActivity,
        Instant createdAt) {

    /** Backwards-compatible constructor for existing tests and call sites without activity flags. */
    public Customer(
            UUID id,
            String displayName,
            String contactPlaceholder,
            long balanceKobo,
            long storeCreditKobo,
            Instant createdAt) {
        this(id, displayName, contactPlaceholder, balanceKobo, storeCreditKobo, false, false, createdAt);
    }

    /** Contract {@code CustomerCreate}. A new customer owes nothing and holds no store credit. */
    public record New(String displayName, String contactPlaceholder) {
    }
}
