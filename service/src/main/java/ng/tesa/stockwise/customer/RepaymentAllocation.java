package ng.tesa.stockwise.customer;

import java.time.Instant;
import java.util.UUID;

/** An immutable allocation of repayment funds to an outstanding credit sale (spec R13). */
public record RepaymentAllocation(
        UUID id,
        UUID customerId,
        UUID saleId,
        UUID repaymentLedgerEntryId,
        long amountKobo,
        UUID createdBy,
        Instant createdAt
) {
}
