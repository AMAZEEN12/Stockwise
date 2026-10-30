package ng.tesa.stockwise.history;

import java.util.List;
import java.util.UUID;

/** A page of one customer's ledger, newest first, with their current figures (contract {@code LedgerPage}). */
public record LedgerPage(UUID customerId, long balanceKobo, long storeCreditKobo, List<LedgerEntry> items,
                         int page, int size, long totalItems) {
}
