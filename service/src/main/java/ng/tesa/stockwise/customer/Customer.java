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
        Instant createdAt) {

    /** Contract {@code CustomerCreate}. A new customer owes nothing and holds no store credit. */
    public record New(String displayName, String contactPlaceholder) {
    }
}
