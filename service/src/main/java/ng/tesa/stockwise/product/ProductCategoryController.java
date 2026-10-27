package ng.tesa.stockwise.product;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Distinct category endpoint (contract v0.2.0, proposal D). */
@RestController
@RequestMapping("/api/v1/product-categories")
public class ProductCategoryController {

    private final ProductRepository products;

    public ProductCategoryController(ProductRepository products) {
        this.products = products;
    }

    @GetMapping
    public List<String> list() {
        return products.listCategories();
    }
}
