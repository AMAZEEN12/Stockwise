package ng.tesa.stockwise.reversal;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SaleReversalRequest(
        @NotNull ReversalReason reason,
        @Size(max = 500) String note,
        @Pattern(regexp = "^[0-9]{6}$", message = "Authorization code must be 6 digits") String authorizationCode
) {
}
