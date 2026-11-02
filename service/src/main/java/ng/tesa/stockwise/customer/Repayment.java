package ng.tesa.stockwise.customer;

import java.time.Instant;
import java.util.UUID;

/**
 * A recorded repayment (contract {@code Repayment}, spec R9). {@code balanceAfterKobo} is what the
 * customer owed right after it, taken from its ledger entry. Money is integer kobo.
 */
public record Repayment(
        UUID id,
        UUID customerId,
        long amountKobo,
        long balanceAfterKobo,
        String note,
        UUID createdBy,
        Instant createdAt) {

    /** Contract {@code RepaymentCreate}. */
    public record New(UUID customerId, long amountKobo, String note) {
    }
}
