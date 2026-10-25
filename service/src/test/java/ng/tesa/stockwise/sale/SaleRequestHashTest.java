package ng.tesa.stockwise.sale;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

/** R5: the request fingerprint behind IDEMPOTENCY_KEY_REUSED (test-plan {@code IdempotencyHashTest}). */
class SaleRequestHashTest {

    static final UUID MILK = UUID.fromString("3f1c2a9e-6b7d-4c1e-9a52-0d8e4f6a1b23");
    static final UUID RICE = UUID.fromString("7a9b0c1d-2e3f-4a5b-8c6d-7e8f9a0b1c2d");
    static final UUID ADA = UUID.fromString("9c8b7a6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d");

    static NewSale sale(PaymentType type, UUID customer, LocalDate due, NewSale.Line... lines) {
        return new NewSale(type, customer, due, List.of(lines));
    }

    @Test
    void sameRequestSameHash() {
        var a = sale(PaymentType.PAID, null, null, new NewSale.Line(MILK, 2));
        var b = sale(PaymentType.PAID, null, null, new NewSale.Line(MILK, 2));
        assertThat(SaleRequestHash.of(a)).isEqualTo(SaleRequestHash.of(b)).hasSize(64);
    }

    @Test
    void lineOrderIsIgnored() {
        var a = sale(PaymentType.PAID, null, null, new NewSale.Line(MILK, 2), new NewSale.Line(RICE, 1));
        var b = sale(PaymentType.PAID, null, null, new NewSale.Line(RICE, 1), new NewSale.Line(MILK, 2));
        assertThat(SaleRequestHash.of(a)).isEqualTo(SaleRequestHash.of(b));
    }

    @Test
    void everyFieldChangesTheHash() {
        String base = SaleRequestHash.of(sale(PaymentType.CREDIT, ADA, null, new NewSale.Line(MILK, 2)));
        assertThat(List.of(
                SaleRequestHash.of(sale(PaymentType.CREDIT, ADA, null, new NewSale.Line(MILK, 3))),
                SaleRequestHash.of(sale(PaymentType.CREDIT, ADA, null, new NewSale.Line(RICE, 2))),
                SaleRequestHash.of(sale(PaymentType.PAID, ADA, null, new NewSale.Line(MILK, 2))),
                SaleRequestHash.of(sale(PaymentType.CREDIT, UUID.randomUUID(), null, new NewSale.Line(MILK, 2))),
                SaleRequestHash.of(sale(PaymentType.CREDIT, ADA, LocalDate.of(2026, 11, 15), new NewSale.Line(MILK, 2))),
                SaleRequestHash.of(sale(PaymentType.CREDIT, ADA, null, new NewSale.Line(MILK, 2), new NewSale.Line(RICE, 1)))))
                .doesNotContain(base)
                .doesNotHaveDuplicates();
    }
}
