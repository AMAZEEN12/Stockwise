package ng.tesa.stockwise.sale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.sale.SaleExceptions.IdempotencyKeyReused;
import ng.tesa.stockwise.sale.SaleExceptions.InsufficientStock;

/** R5: repeat submissions are safe (S2). Restock and repayment variants come with those features. */
class IdempotencyIT extends SaleTestSupport {

    @Test
    void sequentialReplayReturnsTheOriginalSale() {
        UUID milk = product("MILK-400", 120_000, 10);
        UUID key = UUID.randomUUID();

        RecordedSale first = saleService.record(key, paid(line(milk, 2)), cashier);
        RecordedSale again = saleService.record(key, paid(line(milk, 2)), cashier);

        assertThat(first.replayed()).isFalse();
        assertThat(again.replayed()).isTrue();
        assertThat(again.sale()).isEqualTo(first.sale());
        assertThat(quantity(milk)).isEqualTo(8);
        assertThat(count("sale")).isEqualTo(1);
        assertThat(count("stock_movement")).isEqualTo(1);
    }

    /** A phone retrying on a bad network: ten copies at once still record one sale. */
    @Test
    void parallelReplaysRecordOneSale() throws Exception {
        UUID milk = product("MILK-400", 120_000, 10);
        UUID key = UUID.randomUUID();

        List<Object> outcomes = Parallel.run(10, n -> saleService.record(key, paid(line(milk, 1)), cashier));

        assertThat(outcomes).allMatch(RecordedSale.class::isInstance);
        assertThat(outcomes).map(o -> ((RecordedSale) o).sale().id()).containsOnly(((RecordedSale) outcomes.getFirst()).sale().id());
        assertThat(outcomes).filteredOn(o -> !((RecordedSale) o).replayed()).hasSize(1);
        assertThat(quantity(milk)).isEqualTo(9);
        assertThat(count("sale")).isEqualTo(1);
    }

    @Test
    void sameKeyWithDifferentBodyIsRefused() {
        UUID milk = product("MILK-400", 120_000, 10);
        UUID key = UUID.randomUUID();
        saleService.record(key, paid(line(milk, 1)), cashier);

        assertThatThrownBy(() -> saleService.record(key, paid(line(milk, 2)), cashier))
                .isInstanceOf(IdempotencyKeyReused.class);
        assertThat(quantity(milk)).isEqualTo(9);
        assertThat(count("sale")).isEqualTo(1);
    }

    /** The same cart listed in another order is the same request. */
    @Test
    void lineOrderDoesNotMakeADifferentRequest() {
        UUID milk = product("MILK-400", 120_000, 10);
        UUID rice = product("RICE-5KG", 850_000, 10);
        UUID key = UUID.randomUUID();

        RecordedSale first = saleService.record(key, paid(line(milk, 1), line(rice, 2)), cashier);
        RecordedSale again = saleService.record(key, paid(line(rice, 2), line(milk, 1)), cashier);

        assertThat(again.replayed()).isTrue();
        assertThat(again.sale().id()).isEqualTo(first.sale().id());
        assertThat(count("sale")).isEqualTo(1);
    }

    /** A refused sale records nothing, so its key isn't used up: the retry after a restock succeeds. */
    @Test
    void refusedSaleDoesNotConsumeTheKey() {
        UUID milk = product("MILK-400", 120_000, 1);
        UUID key = UUID.randomUUID();

        assertThatThrownBy(() -> saleService.record(key, paid(line(milk, 2)), cashier))
                .isInstanceOf(InsufficientStock.class);
        jdbc.sql("UPDATE product SET quantity = 5 WHERE id = :id").param("id", milk).update();

        RecordedSale retry = saleService.record(key, paid(line(milk, 2)), cashier);
        assertThat(retry.replayed()).isFalse();
        assertThat(quantity(milk)).isEqualTo(3);
    }
}
