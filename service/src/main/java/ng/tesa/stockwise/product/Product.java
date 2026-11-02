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
    public record Filter(String q, String category, StockState stockState, Boolean active) {
        public Filter(String q, String category, StockState stockState) {
            this(q, category, stockState, null);
        }

        public static Filter none() {
            return new Filter(null, null, null, null);
        }
    }

    /**
     * Contract {@code ProductUpdate} (R1, R18): the fields an owner may change. A null field is left
     * as it is. Quantity is not here: stock changes only through sales, restocks and reversals,
     * so the quantity always equals the sum of the product's movements (R13).
     */
    public record Changes(String reference, String name, String category, Long priceKobo,
                          Integer lowStockThreshold, Boolean active) {
        public boolean isEmpty() {
            return reference == null && name == null && category == null && priceKobo == null
                    && lowStockThreshold == null && active == null;
        }
    }

    /**
     * {@code PATCH /products/{id}} whose {@code If-Match} is not the current version: 412
     * {@code VERSION_CONFLICT} (R18). The version also moves when stock changes, so a screen that
     * read the product before a sale must reload it first.
     */
    public static final class VersionConflict extends RuntimeException {
        private final int currentVersion;

        public VersionConflict(int currentVersion) {
            super("The product was changed by someone else (now version " + currentVersion + "). Reload it and try again.");
            this.currentVersion = currentVersion;
        }

        public int currentVersion() {
            return currentVersion;
        }
    }

    /** {@code PATCH /products/{id}} with an empty body: 400 {@code VALIDATION_FAILED}. */
    public static final class NoChanges extends RuntimeException {
        public NoChanges() {
            super("Send at least one field to change.");
        }
    }

    /** {@code PATCH /products/{id}} without a usable {@code If-Match}: 428 {@code PRECONDITION_REQUIRED}. */
    public static final class VersionRequired extends RuntimeException {
        public VersionRequired() {
            super("Send the version you edited in the If-Match header, as returned in the product's ETag.");
        }
    }

    /** {@code POST /products} with a reference already in use: 409 {@code DUPLICATE_REFERENCE} (R1). */
    public static final class DuplicateReference extends RuntimeException {
        public DuplicateReference(String reference) {
            super("A product with reference \"" + reference + "\" already exists.");
        }
    }
}
