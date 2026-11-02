package ng.tesa.stockwise.customer;

import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import ng.tesa.stockwise.auth.CurrentUser;

/**
 * Money a customer pays back (R9) and store credit added by hand (DM74), contract v0.5.0. Both
 * take a required {@code Idempotency-Key}; a replay of the same key and body by the same user
 * answers like the original and records nothing again. Roles are in SecurityConfig.
 */
@RestController
public class RepaymentController {

    private final CustomerMoneyService service;

    public RepaymentController(CustomerMoneyService service) {
        this.service = service;
    }

    /** Contract {@code RepaymentCreate}. Boxed types, so a missing number is a field error, not a 0. */
    public record RepaymentRequest(
            @NotNull UUID customerId,
            @NotNull @Positive @Max(9007199254740991L) Long amountKobo,
            @Size(max = 200) String note) {
    }

    /** Contract {@code StoreCreditGrantCreate}. */
    public record StoreCreditRequest(
            @NotNull @Positive @Max(9007199254740991L) Long amountKobo,
            @NotNull StoreCreditGrant.Reason reason,
            @Size(max = 200) String note) {
    }

    /** OWNER or ASSISTANT. 201 with the repayment, also for a replay. */
    @PostMapping("/api/v1/repayments")
    public ResponseEntity<Repayment> repay(@RequestHeader("Idempotency-Key") UUID idempotencyKey,
                                           @Valid @RequestBody RepaymentRequest request,
                                           @AuthenticationPrincipal CurrentUser user) {
        var recorded = service.repay(idempotencyKey,
                new Repayment.New(request.customerId(), request.amountKobo(), request.note()), user.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(recorded.repayment());
    }

    /** OWNER or ADMIN. 200 with the customer's updated figures. */
    @PostMapping("/api/v1/customers/{customerId}/store-credit")
    public Customer grantStoreCredit(@PathVariable UUID customerId,
                                     @RequestHeader("Idempotency-Key") UUID idempotencyKey,
                                     @Valid @RequestBody StoreCreditRequest request,
                                     @AuthenticationPrincipal CurrentUser user) {
        return service.grantStoreCredit(customerId, idempotencyKey,
                new StoreCreditGrant(request.amountKobo(), request.reason(), request.note()), user.id());
    }
}
