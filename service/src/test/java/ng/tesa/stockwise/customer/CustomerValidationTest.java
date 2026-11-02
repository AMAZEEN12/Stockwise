package ng.tesa.stockwise.customer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class CustomerValidationTest {

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
    void repaymentRequestValidates() {
        UUID custId = UUID.randomUUID();
        var valid = new CustomerController.RepaymentRequest(custId, 50000L);
        assertThat(validator.validate(valid)).isEmpty();

        var missingCust = new CustomerController.RepaymentRequest(null, 50000L);
        assertThat(validator.validate(missingCust)).anyMatch(v -> v.getPropertyPath().toString().equals("customerId"));

        var zeroAmount = new CustomerController.RepaymentRequest(custId, 0L);
        assertThat(validator.validate(zeroAmount)).anyMatch(v -> v.getPropertyPath().toString().equals("amountKobo"));

        var negAmount = new CustomerController.RepaymentRequest(custId, -500L);
        assertThat(validator.validate(negAmount)).anyMatch(v -> v.getPropertyPath().toString().equals("amountKobo"));

        var tooLargeAmount = new CustomerController.RepaymentRequest(custId, 9007199254740992L);
        assertThat(validator.validate(tooLargeAmount)).anyMatch(v -> v.getPropertyPath().toString().equals("amountKobo"));
    }

    @Test
    void storeCreditGrantRequestValidates() {
        var valid = new CustomerController.StoreCreditGrantRequest(100000L, "RETURN_REFUND", "Returned product");
        assertThat(validator.validate(valid)).isEmpty();

        var blankReason = new CustomerController.StoreCreditGrantRequest(100000L, "  ", null);
        assertThat(validator.validate(blankReason)).anyMatch(v -> v.getPropertyPath().toString().equals("reason"));

        var zeroAmount = new CustomerController.StoreCreditGrantRequest(0L, "RETURN_REFUND", null);
        assertThat(validator.validate(zeroAmount)).anyMatch(v -> v.getPropertyPath().toString().equals("amountKobo"));

        var tooLongNote = new CustomerController.StoreCreditGrantRequest(100000L, "RETURN_REFUND", "X".repeat(501));
        assertThat(validator.validate(tooLongNote)).anyMatch(v -> v.getPropertyPath().toString().equals("note"));
    }
}
