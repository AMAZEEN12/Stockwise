package ng.tesa.stockwise.product;

/**
 * Contract {@code StockState}: IN_STOCK above the threshold, LOW at or below it and above 0,
 * OUT at 0, ARCHIVED when inactive (whatever the quantity). Always derived, never stored.
 */
public enum StockState {
    IN_STOCK,
    LOW,
    OUT,
    ARCHIVED;

    static StockState of(boolean active, int quantity, int lowStockThreshold) {
        if (!active) {
            return ARCHIVED;
        }
        if (quantity == 0) {
            return OUT;
        }
        return quantity <= lowStockThreshold ? LOW : IN_STOCK;
    }

    /** The same rule as {@link #of}, as SQL over the {@code product} columns. */
    String sqlCondition() {
        return switch (this) {
            case IN_STOCK -> "active AND quantity > low_stock_threshold AND quantity > 0";
            case LOW -> "active AND quantity > 0 AND quantity <= low_stock_threshold";
            case OUT -> "active AND quantity = 0";
            case ARCHIVED -> "NOT active";
        };
    }
}
