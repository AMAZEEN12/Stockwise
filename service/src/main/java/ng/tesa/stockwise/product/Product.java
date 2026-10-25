package ng.tesa.stockwise.product;

import java.time.Instant;
import java.util.UUID;

/** A catalogue product (contract {@code Product}). Money is integer kobo. */
public record Product(
        UUID id,
        String reference,
        String name,
        String category,
        long priceKobo,
        int quantity,
        int lowStockThreshold,
        StockState stockState,
        boolean active,
        int version,
        Instant createdAt,
        Instant updatedAt) {

    /** Contract {@code ProductCreate}; {@code quantity} is the opening stock. */
    public record New(String reference, String name, String category, long priceKobo, int quantity, int lowStockThreshold) {
    }

    /** Contract query parameters of {@code GET /products}; a null filter is not applied. */
    public record Filter(String q, String category, StockState stockState) {
        public static Filter none() {
            return new Filter(null, null, null);
        }
    }

    /** {@code POST /products} with a reference already in use: 409 {@code DUPLICATE_REFERENCE} (R1). */
    public static final class DuplicateReference extends RuntimeException {
        public DuplicateReference(String reference) {
            super("A product with reference \"" + reference + "\" already exists.");
        }
    }
}
