package ng.tesa.stockwise.sale;

import java.util.List;
import java.util.UUID;

/**
 * Why a sale was refused. Nothing is recorded in any of these cases: the transaction rolls back.
 * The problem handler (API and access area) maps each one to the contract's error codes.
 */
public final class SaleExceptions {

    private SaleExceptions() {
    }

    /** A field-level rule failed: 400 {@code VALIDATION_FAILED}. */
    public static final class InvalidSale extends RuntimeException {
        private final List<FieldError> errors;

        public InvalidSale(List<FieldError> errors) {
            super("Invalid sale: " + errors);
            this.errors = List.copyOf(errors);
        }

        public List<FieldError> errors() {
            return errors;
        }
    }

    /** {@code field} uses the contract's paths, for example {@code lines[1].quantity}. */
    public record FieldError(String field, String message) {
    }

    /**
     * A line asked for more than is in stock (R4): 409 {@code INSUFFICIENT_STOCK}.
     * {@code lineIndex} is the line's position in the request, not the locking order.
     */
    public static final class InsufficientStock extends RuntimeException {
        private final int lineIndex;
        private final UUID productId;
        private final String productName;
        private final int availableQuantity;

        public InsufficientStock(int lineIndex, UUID productId, String productName, int availableQuantity) {
            super("Only " + availableQuantity + " of \"" + productName + "\" left.");
            this.lineIndex = lineIndex;
            this.productId = productId;
            this.productName = productName;
            this.availableQuantity = availableQuantity;
        }

        public int lineIndex() {
            return lineIndex;
        }

        public UUID productId() {
            return productId;
        }

        public String productName() {
            return productName;
        }

        public int availableQuantity() {
            return availableQuantity;
        }
    }

    /** The Idempotency-Key was already used with a different body (R5): 422 {@code IDEMPOTENCY_KEY_REUSED}. */
    public static final class IdempotencyKeyReused extends RuntimeException {
        public IdempotencyKeyReused(UUID idempotencyKey) {
            super("Idempotency-Key " + idempotencyKey + " was already used with a different request.");
        }
    }

    /** A product (unknown or archived) or customer the sale names doesn't exist: 404 {@code NOT_FOUND}. */
    public static final class ReferenceNotFound extends RuntimeException {
        private final String field;

        public ReferenceNotFound(String field, UUID id) {
            super(field + " " + id + " not found");
            this.field = field;
        }

        public String field() {
            return field;
        }
    }
}
