package ng.tesa.stockwise.reversal;

import java.time.Instant;
import java.util.UUID;
import ng.tesa.stockwise.auth.Role;

/** Response of {@code POST /reversals/authorizations}. */
public record ReversalAuthorization(
        String code,
        UUID saleId,
        Instant expiresAt,
        UUID generatedBy,
        Role generatedByRole
) {
}
