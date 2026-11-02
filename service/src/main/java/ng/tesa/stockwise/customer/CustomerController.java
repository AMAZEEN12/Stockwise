package ng.tesa.stockwise.customer;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ng.tesa.stockwise.auth.CurrentUser;
import ng.tesa.stockwise.common.Page;

/** Customer endpoints (spec R7, R9, R12). Adding a customer is OWNER or ASSISTANT (SecurityConfig). */
@RestController
@RequestMapping("/api/v1")
public class CustomerController {

    private final CustomerRepository customers;

    public CustomerController(CustomerRepository customers) {
        this.customers = customers;
    }

    /** Contract {@code CustomerCreate}. */
    public record CreateRequest(
            @NotBlank @Size(max = 120) String displayName,
            @Size(max = 60) String contactPlaceholder) {
    }

    public record StoreCreditGrantRequest(
            @NotNull @Positive @Max(9007199254740991L) Long amountKobo,
            @NotBlank @Size(max = 60) String reason,
            @Size(max = 500) String note) {
    }

    public record RepaymentRequest(
            @NotNull UUID customerId,
            @NotNull @Positive @Max(9007199254740991L) Long amountKobo) {
    }

    public record RepaymentAmountRequest(
            @NotNull @Positive @Max(9007199254740991L) Long amountKobo) {
    }

    public record RepaymentResponse(
            UUID customerId,
            long amountKobo,
            long balanceAfterKobo,
            List<RepaymentAllocation> allocations,
            Instant createdAt) {
    }

    @GetMapping("/customers")
    public CustomerPage list(
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(Page.MAX_SIZE) int size) {
        Page<Customer> result = customers.list(q, new Page.Request(page, size));
        return CustomerPage.of(result, Instant.now());
    }

    /**
     * With an {@code Idempotency-Key} (optional, contract v0.2.0) a retry returns the original
     * customer; without one, every call creates (v0.1.0 behaviour).
     */
    @PostMapping("/customers")
    public ResponseEntity<Customer> create(@RequestHeader(name = "Idempotency-Key", required = false) UUID idempotencyKey,
                                           @Valid @RequestBody CreateRequest request,
                                           @AuthenticationPrincipal CurrentUser user) {
        var newCustomer = new Customer.New(request.displayName(), request.contactPlaceholder());
        Customer customer = idempotencyKey == null
                ? customers.create(newCustomer)
                : customers.create(newCustomer, idempotencyKey, user.id());
        return ResponseEntity.created(URI.create("/api/v1/customers/" + customer.id())).body(customer);
    }

    /**
     * R12: Issue store credit to a customer (OWNER or ADMIN).
     */
    @PostMapping("/customers/{customerId}/store-credit")
    public ResponseEntity<Customer> issueStoreCredit(
            @PathVariable UUID customerId,
            @RequestHeader(name = "Idempotency-Key", required = false) UUID idempotencyKey,
            @Valid @RequestBody StoreCreditGrantRequest request,
            @AuthenticationPrincipal CurrentUser user) {
        Customer customer = customers.issueStoreCredit(customerId, request.amountKobo(),
                request.reason(), request.note(), user.id(), idempotencyKey);
        return ResponseEntity.created(URI.create("/api/v1/customers/" + customer.id())).body(customer);
    }

    /**
     * R9/R13: Record customer debt repayment and allocate to oldest outstanding credit sales.
     */
    @PostMapping(path = {"/repayments", "/customers/repayments"})
    public ResponseEntity<RepaymentResponse> recordRepayment(
            @RequestHeader(name = "Idempotency-Key", required = false) UUID idempotencyKey,
            @Valid @RequestBody RepaymentRequest request,
            @AuthenticationPrincipal CurrentUser user) {
        var res = customers.recordRepayment(request.customerId(), request.amountKobo(), user.id(), idempotencyKey);
        var resp = new RepaymentResponse(res.customerId(), res.amountKobo(), res.balanceAfterKobo(), res.allocations(), res.createdAt());
        return ResponseEntity.created(URI.create("/api/v1/customers/" + res.customerId() + "/ledger")).body(resp);
    }

    @PostMapping("/customers/{customerId}/repayments")
    public ResponseEntity<RepaymentResponse> recordCustomerRepayment(
            @PathVariable UUID customerId,
            @RequestHeader(name = "Idempotency-Key", required = false) UUID idempotencyKey,
            @Valid @RequestBody RepaymentAmountRequest request,
            @AuthenticationPrincipal CurrentUser user) {
        var res = customers.recordRepayment(customerId, request.amountKobo(), user.id(), idempotencyKey);
        var resp = new RepaymentResponse(res.customerId(), res.amountKobo(), res.balanceAfterKobo(), res.allocations(), res.createdAt());
        return ResponseEntity.created(URI.create("/api/v1/customers/" + res.customerId() + "/ledger")).body(resp);
    }
}
