package ng.tesa.stockwise.common;

import java.util.List;

/** One page of a list (contract {@code ProductPage}, {@code CustomerPage}, {@code SalePage}). Pages are zero-based. */
public record Page<T>(List<T> items, int page, int size, long totalItems) {

    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    /** Contract parameters {@code page} (min 0) and {@code size} (1 to 100). */
    public record Request(int page, int size) {
        public Request {
            if (page < 0) {
                throw new IllegalArgumentException("page must be 0 or more");
            }
            if (size < 1 || size > MAX_SIZE) {
                throw new IllegalArgumentException("size must be from 1 to " + MAX_SIZE);
            }
        }

        public static Request first() {
            return new Request(0, DEFAULT_SIZE);
        }

        public long offset() {
            return (long) page * size;
        }
    }
}
