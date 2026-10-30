package ng.tesa.stockwise.restock;

import java.net.URI;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
import ng.tesa.stockwise.common.NotFoundException;
import ng.tesa.stockwise.common.Page;

/** REST endpoints for stock received from suppliers (spec R6). */
@RestController
@RequestMapping("/api/v1/restocks")
public class RestockController {

    private final RestockService service;
    private final RestockRepository restocks;

    public RestockController(RestockService service, RestockRepository restocks) {
        this.service = service;
        this.restocks = restocks;
    }

    public record CreateRequest(
            @NotNull UUID productId,
            @NotNull @Positive Integer quantity,
            @NotNull LocalDate receivedOn,
            @Size(max = 500) String note) {
    }

    @GetMapping
    public Page<Restock> list(
            @RequestParam(required = false) UUID productId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(Page.MAX_SIZE) int size) {
        return restocks.list(productId, new Page.Request(page, size));
    }

    @GetMapping("/{restockId}")
    public Restock get(@PathVariable UUID restockId) {
        return restocks.findById(restockId)
                .orElseThrow(() -> new NotFoundException("Restock " + restockId));
    }

    @PostMapping
    public ResponseEntity<Restock> create(
            @RequestHeader("Idempotency-Key") UUID idempotencyKey,
            @Valid @RequestBody CreateRequest request,
            @AuthenticationPrincipal CurrentUser user) {
        Restock restock = service.record(idempotencyKey,
                new Restock.New(request.productId(), request.quantity(), request.receivedOn(), request.note()),
                user.id());
        return ResponseEntity.created(URI.create("/api/v1/restocks/" + restock.id())).body(restock);
    }
}
