package ng.tesa.stockwise.sale;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.sale.SaleExceptions.InsufficientStock;

/**
 * R4, the key rule: stock never falls below zero, even when devices sell at the same moment
 * (S1). Asserts the final database state, not only the outcomes. This class must fail on the
 * {@code evidence/no-stock-guard} branch (plan step 11).
 */
class SaleConcurrencyIT extends SaleTestSupport {

    static final int DEVICES = 10;

    /** Ten parallel sales of the last unit: exactly one is recorded, nine get INSUFFICIENT_STOCK. */
    @Test
    void lastUnitIsSoldExactlyOnce() throws Exception {
        UUID milk = product("MILK-400", 120_000, 1);

        List<Object> outcomes = Parallel.run(DEVICES,
                n -> saleService.record(UUID.randomUUID(), paid(line(milk, 1)), cashier));

        assertThat(outcomes).filteredOn(RecordedSale.class::isInstance).hasSize(1);
        assertThat(outcomes).filteredOn(InsufficientStock.class::isInstance).hasSize(DEVICES - 1);
        assertThat(quantity(milk)).isZero();
        assertThat(count("sale")).isEqualTo(1);
        assertThat(count("sale_line")).isEqualTo(1);
        assertThat(jdbc.sql("SELECT sum(delta) FROM stock_movement WHERE product_id = :id")
                .param("id", milk).query(Long.class).single()).isEqualTo(-1);
    }

    /** Ten parallel sales of 2 units from a stock of 5: two are recorded and 1 unit is left. */
    @Test
    void parallelSalesNeverOversell() throws Exception {
        UUID rice = product("RICE-5KG", 850_000, 5);

        List<Object> outcomes = Parallel.run(DEVICES,
                n -> saleService.record(UUID.randomUUID(), paid(line(rice, 2)), cashier));

        assertThat(outcomes).filteredOn(RecordedSale.class::isInstance).hasSize(2);
        assertThat(outcomes).filteredOn(InsufficientStock.class::isInstance).hasSize(DEVICES - 2);
        assertThat(quantity(rice)).isEqualTo(1);
        assertThat(count("sale")).isEqualTo(2);
    }

    /**
     * Two-product carts listed in opposite orders. Locking in product-ID order means they queue
     * instead of deadlocking, and every one is recorded.
     */
    @Test
    void oppositeLineOrdersDoNotDeadlock() throws Exception {
        UUID milk = product("MILK-400", 120_000, 100);
        UUID rice = product("RICE-5KG", 850_000, 100);

        List<Object> outcomes = Parallel.run(DEVICES, n -> saleService.record(UUID.randomUUID(),
                n % 2 == 0 ? paid(line(milk, 1), line(rice, 1)) : paid(line(rice, 1), line(milk, 1)), cashier));

        assertThat(outcomes).allMatch(RecordedSale.class::isInstance);
        assertThat(quantity(milk)).isEqualTo(100 - DEVICES);
        assertThat(quantity(rice)).isEqualTo(100 - DEVICES);
    }

    /** Parallel credit sales to one customer: the balance and every ledger entry add up exactly. */
    @Test
    void parallelCreditSalesKeepTheBalanceExact() throws Exception {
        UUID milk = product("MILK-400", 120_000, 100);
        UUID ada = customer("Ada");

        List<Object> outcomes = Parallel.run(DEVICES, n -> saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, ada, null, List.of(line(milk, 1))), cashier));

        assertThat(outcomes).allMatch(RecordedSale.class::isInstance);
        assertThat(balance(ada)).isEqualTo(DEVICES * 120_000L);
        assertThat(jdbc.sql("SELECT balance_after_kobo FROM ledger_entry WHERE customer_id = :id ORDER BY balance_after_kobo")
                .param("id", ada).query(Long.class).list())
                .containsExactlyElementsOf(java.util.stream.LongStream.rangeClosed(1, DEVICES)
                        .map(n -> n * 120_000L).boxed().toList());
    }
}
