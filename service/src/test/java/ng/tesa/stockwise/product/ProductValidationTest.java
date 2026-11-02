package ng.tesa.stockwise.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Contract v0.2.0 Proposal C: safe integer money bounds (0..9007199254740991 kobo).
 */
class ProductValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void init() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void close() {
        factory.close();
    }

    @Test
    void maxSafeIntegerPriceKoboIsValid() {
        var req = new ProductController.CreateRequest(
                "REF-1", "Product 1", "Category", 9007199254740991L, 10, 2);
        Set<ConstraintViolation<ProductController.CreateRequest>> violations = validator.validate(req);
        assertThat(violations).isEmpty();
    }

    @Test
    void priceKoboExceedingMaxSafeIntegerIsRefused() {
        var req = new ProductController.CreateRequest(
                "REF-1", "Product 1", "Category", 9007199254740992L, 10, 2);
        Set<ConstraintViolation<ProductController.CreateRequest>> violations = validator.validate(req);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("priceKobo"));
    }

    @Test
    void negativePriceKoboIsRefused() {
        var req = new ProductController.CreateRequest(
                "REF-1", "Product 1", "Category", -1L, 10, 2);
        Set<ConstraintViolation<ProductController.CreateRequest>> violations = validator.validate(req);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("priceKobo"));
    }

    @Test
    void productUpdateRequestValidatesBounds() {
        var valid = new ProductController.UpdateRequest("REF-1", "Name", "Cat", 50000L, 5, true);
        assertThat(validator.validate(valid)).isEmpty();

        var invalidPrice = new ProductController.UpdateRequest(null, null, null, 9007199254740992L, null, null);
        assertThat(validator.validate(invalidPrice)).anyMatch(v -> v.getPropertyPath().toString().equals("priceKobo"));

        var negPrice = new ProductController.UpdateRequest(null, null, null, -100L, null, null);
        assertThat(validator.validate(negPrice)).anyMatch(v -> v.getPropertyPath().toString().equals("priceKobo"));

        var negThreshold = new ProductController.UpdateRequest(null, null, null, null, -1, null);
        assertThat(validator.validate(negThreshold)).anyMatch(v -> v.getPropertyPath().toString().equals("lowStockThreshold"));

        var longRef = new ProductController.UpdateRequest("A".repeat(41), null, null, null, null, null);
        assertThat(validator.validate(longRef)).anyMatch(v -> v.getPropertyPath().toString().equals("reference"));
    }
}
