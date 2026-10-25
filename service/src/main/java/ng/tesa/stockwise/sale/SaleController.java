package ng.tesa.stockwise.sale;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
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
import ng.tesa.stockwise.common.NotFoundException;
import ng.tesa.stockwise.common.Page;

/**
 * Sale endpoints (spec R3, R4, R5, R8). Recording a sale is OWNER or ASSISTANT
 * (SecurityConfig); the rules themselves live in {@link SaleService} and the database.
 */
@RestController
@RequestMapping("/api/v1/sales")
public class SaleController {

    private final SaleService saleService;
    private final SaleRepository sales;

    public SaleController(SaleService saleService, SaleRepository sales) {
        this.saleService = saleService;
        this.sales = sales;
    }

    /** Contract {@code SaleCreate}. {@link SaleService} checks the cross-field rules (credit needs a customer). */
    public record CreateRequest(
            @NotNull PaymentType paymentType,
            UUID customerId,
            LocalDate dueDate,
            @NotEmpty @Size(max = SaleService.MAX_LINES) List<@Valid @NotNull Line> lines) {

        public record Line(@NotNull UUID productId, @NotNull @Min(1) @Max(SaleService.MAX_QUANTITY) Integer quantity) {
        }

        NewSale toNewSale() {
            return new NewSale(paymentType, customerId, dueDate,
                    lines.stream().map(l -> new NewSale.Line(l.productId(), l.quantity())).toList());
        }
    }

    /** A replay of the same key and body is also 201 with the original sale (R5). */
    @PostMapping
    public ResponseEntity<Sale> create(@RequestHeader("Idempotency-Key") UUID idempotencyKey,
                                       @Valid @RequestBody CreateRequest request,
                                       @AuthenticationPrincipal CurrentUser user) {
        Sale sale = saleService.record(idempotencyKey, request.toNewSale(), user.id()).sale();
        return ResponseEntity.created(URI.create("/api/v1/sales/" + sale.id())).body(sale);
    }

    @GetMapping
    public Page<Sale> list(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) PaymentType paymentType,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(Page.MAX_SIZE) int size) {
        return sales.list(new SaleRepository.Filter(from, to, paymentType, customerId), new Page.Request(page, size));
    }

    @GetMapping("/{saleId}")
    public Sale get(@PathVariable UUID saleId) {
        return sales.findSale(saleId).orElseThrow(() -> new NotFoundException("Sale " + saleId));
    }
}
