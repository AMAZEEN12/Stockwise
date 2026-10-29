package ng.tesa.stockwise.dashboard;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Contract {@code Dashboard} (spec R14): every figure is computed from the records when read, never
 * stored, and labelled as demonstration data with the time it was computed.
 */
public record Dashboard(
        Instant computedAt,
        boolean isDemonstrationData,
        LocalDate today,
        TodaySales todaySales,
        long outstandingCreditKobo,
        int customersOwing,
        long storeCreditHeldKobo,
        int lowStockCount,
        List<LowStockProduct> lowStock,
        List<RecentSale> recentSales) {

    /** Sales recorded on the shop's calendar day "today" (Africa/Lagos, DM14). */
    public record TodaySales(int count, long totalKobo, int paidCount, long paidKobo, int creditCount,
                             long creditKobo) {
    }

    /** An active product at or below its low-stock threshold (out of stock included). */
    public record LowStockProduct(UUID id, String reference, String name, int quantity, int lowStockThreshold) {
    }

    public record RecentSale(UUID id, String reference, String paymentType, long totalKobo, Instant createdAt) {
    }
}
