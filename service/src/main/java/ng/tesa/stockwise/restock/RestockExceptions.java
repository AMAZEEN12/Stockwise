package ng.tesa.stockwise.restock;

import java.util.UUID;

/** Rule failures specific to restock recording. */
public final class RestockExceptions {

    private RestockExceptions() {
    }

    public static final class StockLimitExceeded extends RuntimeException {
        private final UUID productId;

        public StockLimitExceeded(UUID productId) {
            super("Adding this quantity would exceed the supported stock count for product " + productId + ".");
            this.productId = productId;
        }

        public UUID productId() {
            return productId;
        }
    }
}
