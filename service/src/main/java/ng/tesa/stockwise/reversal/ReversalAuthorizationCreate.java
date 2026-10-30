package ng.tesa.stockwise.reversal;

import java.util.UUID;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Body of {@code POST /reversals/authorizations}. */
public record ReversalAuthorizationCreate(
        UUID saleId,
        @Min(1) @Max(60) Integer validMinutes
) {
    public int effectiveMinutes() {
        return validMinutes != null ? validMinutes : 15;
    }
}
