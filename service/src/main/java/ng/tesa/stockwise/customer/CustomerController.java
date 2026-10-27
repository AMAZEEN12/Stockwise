package ng.tesa.stockwise.customer;

import java.net.URI;
import java.time.Instant;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ng.tesa.stockwise.auth.CurrentUser;
import ng.tesa.stockwise.common.Page;

/** Customer endpoints (spec R7). Adding a customer is OWNER or ASSISTANT (SecurityConfig). */
@RestController
@RequestMapping("/api/v1/customers")
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

    @GetMapping
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
    @PostMapping
    public ResponseEntity<Customer> create(@RequestHeader(name = "Idempotency-Key", required = false) UUID idempotencyKey,
                                           @Valid @RequestBody CreateRequest request,
                                           @AuthenticationPrincipal CurrentUser user) {
        var newCustomer = new Customer.New(request.displayName(), request.contactPlaceholder());
        Customer customer = idempotencyKey == null
                ? customers.create(newCustomer)
                : customers.create(newCustomer, idempotencyKey, user.id());
        return ResponseEntity.created(URI.create("/api/v1/customers/" + customer.id())).body(customer);
    }
}
