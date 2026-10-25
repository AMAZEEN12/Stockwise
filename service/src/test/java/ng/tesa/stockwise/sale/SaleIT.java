package ng.tesa.stockwise.sale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.sale.SaleExceptions.InsufficientStock;
import ng.tesa.stockwise.sale.SaleExceptions.InvalidSale;
import ng.tesa.stockwise.sale.SaleExceptions.ReferenceNotFound;

/**
 * Recording a sale (spec R3, R8). Non-integer quantities (1.5) are refused earlier, when the
 * JSON is read (N1, {@code MoneyJsonTest}); these tests start from the service call.
 */
class SaleIT extends SaleTestSupport {

    /** R3: one transaction reduces every line's stock, copies prices and records movements. */
    @Test
    void paidMultiLineSaleReducesStockAndCopiesPrices() {
        UUID milk = product("MILK-400", 120_000, 10);
        UUID rice = product("RICE-5KG", 850_000, 3);

        Sale sale = saleService.record(UUID.randomUUID(), paid(line(milk, 2), line(rice, 1)), cashier).sale();

        assertThat(sale.reference()).matches("S-\\d{6}");
        assertThat(sale.paymentType()).isEqualTo(PaymentType.PAID);
        assertThat(sale.totalKobo()).isEqualTo(2 * 120_000 + 850_000);
        assertThat(sale.createdBy()).isEqualTo(cashier);
        assertThat(sale.lines()).extracting(Sale.Line::productId, Sale.Line::quantity, Sale.Line::unitPriceKobo, Sale.Line::lineTotalKobo)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(milk, 2, 120_000L, 240_000L),
                        org.assertj.core.groups.Tuple.tuple(rice, 1, 850_000L, 850_000L));
        assertThat(quantity(milk)).isEqualTo(8);
        assertThat(quantity(rice)).isEqualTo(2);
        assertThat(jdbc.sql("SELECT sum(delta) FROM stock_movement WHERE source_type = 'SALE' AND source_id = :id")
                .param("id", sale.id()).query(Long.class).single()).isEqualTo(-3);
    }

    /** R3: the line keeps the price at the time of sale, whatever happens to the product later. */
    @Test
    void laterPriceChangeDoesNotChangeTheSale() {
        UUID milk = product("MILK-400", 120_000, 10);
        Sale sale = saleService.record(UUID.randomUUID(), paid(line(milk, 1)), cashier).sale();

        jdbc.sql("UPDATE product SET price_kobo = 99900 WHERE id = :id").param("id", milk).update();

        Sale reread = new SaleRepository(jdbc).findSale(sale.id()).orElseThrow();
        assertThat(reread.lines().getFirst().unitPriceKobo()).isEqualTo(120_000);
        assertThat(reread.totalKobo()).isEqualTo(120_000);
    }

    /** R3: if any line is short, nothing at all is recorded, including the lines that fitted. */
    @Test
    void shortLineRecordsNothing() {
        UUID milk = product("MILK-400", 120_000, 10);
        UUID rice = product("RICE-5KG", 850_000, 1);

        assertThatThrownBy(() -> saleService.record(UUID.randomUUID(), paid(line(milk, 2), line(rice, 2)), cashier))
                .isInstanceOfSatisfying(InsufficientStock.class, e -> {
                    assertThat(e.lineIndex()).isEqualTo(1);
                    assertThat(e.productId()).isEqualTo(rice);
                    assertThat(e.availableQuantity()).isEqualTo(1);
                    assertThat(e.getMessage()).isEqualTo("Only 1 of \"Product RICE-5KG\" left.");
                });

        assertThat(quantity(milk)).isEqualTo(10);
        assertThat(quantity(rice)).isEqualTo(1);
        assertThat(count("sale")).isZero();
        assertThat(count("sale_line")).isZero();
        assertThat(count("stock_movement")).isZero();
    }

    /** R3: zero, negative and oversized quantities are refused before anything is written. */
    @Test
    void quantitiesMustBePositiveWholeNumbersInRange() {
        UUID milk = product("MILK-400", 120_000, 10);
        for (int bad : new int[] {0, -1, SaleService.MAX_QUANTITY + 1}) {
            assertThatThrownBy(() -> saleService.record(UUID.randomUUID(), paid(line(milk, bad)), cashier))
                    .isInstanceOfSatisfying(InvalidSale.class, e -> assertThat(e.errors())
                            .extracting(SaleExceptions.FieldError::field).containsExactly("lines[0].quantity"));
        }
        assertThat(quantity(milk)).isEqualTo(10);
        assertThat(count("sale")).isZero();
    }

    @Test
    void emptySaleAndRepeatedProductAreRefused() {
        UUID milk = product("MILK-400", 120_000, 10);
        assertThatThrownBy(() -> saleService.record(UUID.randomUUID(), paid(), cashier))
                .isInstanceOf(InvalidSale.class);
        assertThatThrownBy(() -> saleService.record(UUID.randomUUID(), paid(line(milk, 1), line(milk, 1)), cashier))
                .isInstanceOfSatisfying(InvalidSale.class, e -> assertThat(e.errors())
                        .extracting(SaleExceptions.FieldError::field).containsExactly("lines[1].productId"));
        assertThat(count("sale")).isZero();
    }

    /** An archived product can't be sold, and an unknown one is reported as not found. */
    @Test
    void archivedOrUnknownProductIsNotFound() {
        UUID archived = product("OLD-1", 10_000, 5);
        jdbc.sql("UPDATE product SET active = false WHERE id = :id").param("id", archived).update();

        assertThatThrownBy(() -> saleService.record(UUID.randomUUID(), paid(line(archived, 1)), cashier))
                .isInstanceOfSatisfying(ReferenceNotFound.class, e -> assertThat(e.field()).isEqualTo("lines[0].productId"));
        assertThatThrownBy(() -> saleService.record(UUID.randomUUID(), paid(line(UUID.randomUUID(), 1)), cashier))
                .isInstanceOf(ReferenceNotFound.class);
        assertThat(quantity(archived)).isEqualTo(5);
        assertThat(count("sale")).isZero();
    }

    /** R8: a credit sale raises the customer's balance by exactly the total, with a ledger entry. */
    @Test
    void creditSaleRaisesBalanceByTotal() {
        UUID milk = product("MILK-400", 120_000, 10);
        UUID ada = customer("Ada");
        var request = new NewSale(PaymentType.CREDIT, ada, LocalDate.of(2026, 11, 15), List.of(line(milk, 3)));

        Sale sale = saleService.record(UUID.randomUUID(), request, cashier).sale();
        Sale second = saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, ada, null, List.of(line(milk, 1))), cashier).sale();

        assertThat(sale.customerId()).isEqualTo(ada);
        assertThat(sale.dueDate()).isEqualTo(LocalDate.of(2026, 11, 15));
        assertThat(balance(ada)).isEqualTo(4 * 120_000);
        assertThat(jdbc.sql("""
                        SELECT delta_kobo, balance_after_kobo FROM ledger_entry
                        WHERE customer_id = :id AND source_type = 'CREDIT_SALE' ORDER BY balance_after_kobo
                        """)
                .param("id", ada)
                .query((rs, row) -> List.of(rs.getLong(1), rs.getLong(2))).list())
                .containsExactly(List.of(360_000L, 360_000L), List.of(120_000L, 480_000L));
        assertThat(second.totalKobo()).isEqualTo(120_000);
    }

    /** R8: a credit sale needs a customer; a due date is for credit sales only. */
    @Test
    void creditRulesAreValidated() {
        UUID milk = product("MILK-400", 120_000, 10);
        assertThatThrownBy(() -> saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, null, null, List.of(line(milk, 1))), cashier))
                .isInstanceOfSatisfying(InvalidSale.class, e -> assertThat(e.errors())
                        .extracting(SaleExceptions.FieldError::field).containsExactly("customerId"));
        assertThatThrownBy(() -> saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.PAID, null, LocalDate.of(2026, 11, 1), List.of(line(milk, 1))), cashier))
                .isInstanceOfSatisfying(InvalidSale.class, e -> assertThat(e.errors())
                        .extracting(SaleExceptions.FieldError::field).containsExactly("dueDate"));
        assertThatThrownBy(() -> saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, UUID.randomUUID(), null, List.of(line(milk, 1))), cashier))
                .isInstanceOfSatisfying(ReferenceNotFound.class, e -> assertThat(e.field()).isEqualTo("customerId"));
        assertThat(quantity(milk)).isEqualTo(10);
        assertThat(count("sale")).isZero();
    }

    /** A paid sale may name a customer; their balance doesn't change. */
    @Test
    void paidSaleWithCustomerLeavesBalanceAlone() {
        UUID milk = product("MILK-400", 120_000, 10);
        UUID ada = customer("Ada");
        Sale sale = saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.PAID, ada, null, List.of(line(milk, 1))), cashier).sale();
        assertThat(sale.customerId()).isEqualTo(ada);
        assertThat(balance(ada)).isZero();
        assertThat(count("ledger_entry")).isZero();
    }
}
