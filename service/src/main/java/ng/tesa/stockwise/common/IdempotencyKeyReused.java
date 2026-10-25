package ng.tesa.stockwise.common;

import java.util.UUID;

/**
 * An Idempotency-Key that already recorded something different, or was used by another user:
 * 422 {@code IDEMPOTENCY_KEY_REUSED}, and nothing is written. Shared by every keyed write except
 * sales, which keep their own {@code SaleExceptions.IdempotencyKeyReused}.
 */
public class IdempotencyKeyReused extends RuntimeException {
    public IdempotencyKeyReused(UUID idempotencyKey) {
        super("Idempotency-Key " + idempotencyKey + " was already used with a different request.");
    }
}
