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
 * {@code GET /api/v1/products/{productId}/movements}: a product's stock history (spec R13).
 * Safe and read-only; any logged-in role ({@code SecurityConfig}'s "any other request" rule).
 */
@RestController
public class MovementController {

    private final MovementQueries movements;

    public MovementController(MovementQueries movements) {
        this.movements = movements;
    }

    @GetMapping("/api/v1/products/{productId}/movements")
    public MovementPage list(
            @PathVariable UUID productId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(Page.MAX_SIZE) int size) {
        int currentQuantity = movements.currentQuantity(productId)
                .orElseThrow(() -> new NotFoundException("Product " + productId));
        Page.Request request = new Page.Request(page, size);
        return new MovementPage(productId, currentQuantity, movements.page(productId, request), page, size,
                movements.count(productId));
    }
}
