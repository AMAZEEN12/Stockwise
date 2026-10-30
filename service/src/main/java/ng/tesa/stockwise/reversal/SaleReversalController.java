package ng.tesa.stockwise.reversal;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import ng.tesa.stockwise.auth.CurrentUser;

/**
 * Endpoint for reversing a recorded sale (spec R11, R12, R14, R15).
 */
@RestController
@RequestMapping("/api/v1/sales")
public class SaleReversalController {

    private final SaleReversalService reversalService;

    public SaleReversalController(SaleReversalService reversalService) {
        this.reversalService = reversalService;
    }

    @PostMapping("/{saleId}/reversal")
    public ResponseEntity<SaleReversalResponse> reverse(
            @PathVariable UUID saleId,
            @RequestHeader("Idempotency-Key") UUID idempotencyKey,
            @Valid @RequestBody SaleReversalRequest request,
            @AuthenticationPrincipal CurrentUser user) {
        SaleReversalResponse response = reversalService.reverse(saleId, idempotencyKey, request, user);
        return ResponseEntity.ok(response);
    }
}
