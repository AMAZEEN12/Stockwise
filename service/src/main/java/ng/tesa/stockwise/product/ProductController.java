package ng.tesa.stockwise.product;

import java.net.URI;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ng.tesa.stockwise.common.NotFoundException;
import ng.tesa.stockwise.common.Page;

/** Catalogue endpoints (spec R1, R2). Adding a product is OWNER only (SecurityConfig). */
@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductRepository products;

    public ProductController(ProductRepository products) {
        this.products = products;
    }

    /** Contract {@code ProductCreate}. Boxed types, so a missing number is a field error, not a 0. */
    public record CreateRequest(
            @NotBlank @Size(max = 40) String reference,
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Size(max = 60) String category,
            @NotNull @PositiveOrZero Long priceKobo,
            @NotNull @PositiveOrZero Integer quantity,
            @NotNull @PositiveOrZero Integer lowStockThreshold) {
    }

    @GetMapping
    public Page<Product> list(
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) @Size(max = 60) String category,
            @RequestParam(required = false) StockState stockState,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(Page.MAX_SIZE) int size) {
        return products.list(new Product.Filter(q, category, stockState), new Page.Request(page, size));
    }

    @PostMapping
    public ResponseEntity<Product> create(@Valid @RequestBody CreateRequest request) {
        Product product = products.create(new Product.New(request.reference(), request.name(), request.category(),
                request.priceKobo(), request.quantity(), request.lowStockThreshold()));
        return ResponseEntity.created(URI.create("/api/v1/products/" + product.id())).body(product);
    }

    /** The ETag is the version, for the later conditional edit and archive ({@code If-Match}). */
    @GetMapping("/{productId}")
    public ResponseEntity<Product> get(@PathVariable UUID productId) {
        Product product = products.findById(productId).orElseThrow(() -> new NotFoundException("Product " + productId));
        return ResponseEntity.ok().eTag(String.valueOf(product.version())).body(product);
    }
}
