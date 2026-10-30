package ng.tesa.stockwise.reversal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SaleReversalResponse(
        UUID reversalId,
        UUID saleId,
        Instant reversedAt,
        UUID reversedBy,
        ReversalReason reason,
        String note,
        boolean stockRestored,
        long debtRemovedKobo,
        long storeCreditAddedKobo,
        long storeCreditRestoredKobo,
        List<StockRestoredLine> stockRestoredLines
) {
    public record StockRestoredLine(UUID productId, int quantity) {
    }
}
