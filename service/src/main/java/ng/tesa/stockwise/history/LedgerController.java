package ng.tesa.stockwise.history;

import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ng.tesa.stockwise.common.NotFoundException;
import ng.tesa.stockwise.common.Page;

/**
 * {@code GET /api/v1/customers/{customerId}/ledger}: a customer's credit sales, repayments,
 * reversals and store credit, with the balance after each (spec R10). Safe and read-only; any
 * logged-in role ({@code SecurityConfig}'s "any other request" rule).
 */
@RestController
public class LedgerController {

    private final LedgerQueries ledger;

    public LedgerController(LedgerQueries ledger) {
        this.ledger = ledger;
    }

    @GetMapping("/api/v1/customers/{customerId}/ledger")
    public LedgerPage list(
            @PathVariable UUID customerId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(Page.MAX_SIZE) int size) {
        LedgerQueries.Balances balances = ledger.balances(customerId)
                .orElseThrow(() -> new NotFoundException("Customer " + customerId));
        Page.Request request = new Page.Request(page, size);
        return new LedgerPage(customerId, balances.balanceKobo(), balances.storeCreditKobo(),
                ledger.page(customerId, request), page, size, ledger.count(customerId));
    }
}
