package ng.tesa.stockwise.restock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import ng.tesa.stockwise.common.IdempotencyKeyReused;
import ng.tesa.stockwise.common.NotFoundException;
import ng.tesa.stockwise.restock.RestockExceptions.StockLimitExceeded;
import ng.tesa.stockwise.support.DatabaseTestSupport;

/** R5/R6 against real Postgres: stock, history and retries remain one atomic result. */
class RestockIT extends DatabaseTestSupport {

    @Autowired
    RestockService service;

    @Autowired
    RestockRepository restocks;

    @Test
    void recordsQuantityReceivedDateAndMovement() {
        UUID milk = product("MILK-400", 120_000, 4);

        Restock recorded = service.record(UUID.randomUUID(),
                new Restock.New(milk, 12, LocalDate.of(2026, 10, 29), "  Supplier delivery  "), cashier);

        assertThat(recorded.productId()).isEqualTo(milk);
        assertThat(recorded.quantity()).isEqualTo(12);
        assertThat(recorded.receivedOn()).isEqualTo(LocalDate.of(2026, 10, 29));
        assertThat(recorded.note()).isEqualTo("Supplier delivery");
        assertThat(quantity(milk)).isEqualTo(16);
        assertThat(jdbc.sql("SELECT version FROM product WHERE id = :id").param("id", milk)
                .query(Integer.class).single()).isEqualTo(1);
        assertThat(jdbc.sql("""
                        SELECT delta FROM stock_movement
                        WHERE product_id = :productId AND source_type = 'RESTOCK' AND source_id = :restockId
                        """).param("productId", milk).param("restockId", recorded.id())
                .query(Integer.class).single()).isEqualTo(12);
    }

    @Test
    void sequentialReplayReturnsOriginalWithoutAddingStockTwice() {
        UUID milk = product("MILK-400", 120_000, 4);
        UUID key = UUID.randomUUID();
        Restock.New request = new Restock.New(milk, 3, LocalDate.of(2026, 10, 29), null);

        Restock first = service.record(key, request, cashier);
        Restock replay = service.record(key, request, cashier);

        assertThat(replay).isEqualTo(first);
        assertThat(quantity(milk)).isEqualTo(7);
        assertThat(count("restock")).isEqualTo(1);
        assertThat(count("stock_movement")).isEqualTo(1);
    }

    @Test
    void parallelReplayRecordsOneRestock() throws Exception {
        UUID milk = product("MILK-400", 120_000, 4);
        UUID key = UUID.randomUUID();
        Restock.New request = new Restock.New(milk, 3, LocalDate.of(2026, 10, 29), "Delivery");
        CountDownLatch ready = new CountDownLatch(10);
        CountDownLatch start = new CountDownLatch(1);

        List<Restock> results;
        try (var pool = Executors.newFixedThreadPool(10)) {
            var futures = java.util.stream.IntStream.range(0, 10).mapToObj(ignored -> pool.submit(() -> {
                ready.countDown();
                start.await();
                return service.record(key, request, cashier);
            })).toList();
            ready.await();
            start.countDown();
            results = futures.stream().map(future -> {
                try {
                    return future.get();
                } catch (Exception e) {
                    throw new IllegalStateException(e);
                }
            }).toList();
        }

        assertThat(results).extracting(Restock::id).containsOnly(results.getFirst().id());
        assertThat(quantity(milk)).isEqualTo(7);
        assertThat(count("restock")).isEqualTo(1);
        assertThat(count("stock_movement")).isEqualTo(1);
    }

    @Test
    void changedBodyOrUserCannotReuseAKey() {
        UUID milk = product("MILK-400", 120_000, 4);
        UUID key = UUID.randomUUID();
        Restock.New request = new Restock.New(milk, 3, LocalDate.of(2026, 10, 29), null);
        service.record(key, request, cashier);

        assertThatThrownBy(() -> service.record(key,
                new Restock.New(milk, 4, request.receivedOn(), null), cashier))
                .isInstanceOf(IdempotencyKeyReused.class);
        assertThatThrownBy(() -> service.record(key, request, UUID.randomUUID()))
                .isInstanceOf(IdempotencyKeyReused.class);
        assertThat(quantity(milk)).isEqualTo(7);
    }

    @Test
    void unknownProductAndStockOverflowRollBackEverything() {
        assertThatThrownBy(() -> service.record(UUID.randomUUID(),
                new Restock.New(UUID.randomUUID(), 1, LocalDate.of(2026, 10, 29), null), cashier))
                .isInstanceOf(NotFoundException.class);
        assertThat(count("restock")).isZero();

        UUID full = product("FULL", 1, Integer.MAX_VALUE);
        assertThatThrownBy(() -> service.record(UUID.randomUUID(),
                new Restock.New(full, 1, LocalDate.of(2026, 10, 29), null), cashier))
                .isInstanceOf(StockLimitExceeded.class);
        assertThat(quantity(full)).isEqualTo(Integer.MAX_VALUE);
        assertThat(count("restock")).isZero();
        assertThat(count("stock_movement")).isZero();
    }

    @Test
    void databaseRequiresPositiveQuantityAndKeepsRestocksAppendOnly() {
        UUID milk = product("MILK-400", 120_000, 4);
        assertThatThrownBy(() -> jdbc.sql("""
                        INSERT INTO restock
                            (product_id, quantity, received_on, idempotency_key, request_hash, created_by)
                        VALUES (:productId, 0, CURRENT_DATE, :key, :hash, :createdBy)
                        """).param("productId", milk).param("key", UUID.randomUUID())
                .param("hash", "0".repeat(64)).param("createdBy", cashier).update())
                .isInstanceOf(DataIntegrityViolationException.class);

        Restock recorded = service.record(UUID.randomUUID(),
                new Restock.New(milk, 2, LocalDate.of(2026, 10, 29), null), cashier);
        assertThatThrownBy(() -> jdbc.sql("UPDATE restock SET note = 'changed' WHERE id = :id")
                .param("id", recorded.id()).update()).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.sql("DELETE FROM restock WHERE id = :id")
                .param("id", recorded.id()).update()).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void listsNewestFirstAndFiltersByProduct() {
        UUID milk = product("MILK", 1, 0);
        UUID rice = product("RICE", 1, 0);
        Restock first = service.record(UUID.randomUUID(),
                new Restock.New(milk, 2, LocalDate.of(2026, 10, 28), null), cashier);
        Restock second = service.record(UUID.randomUUID(),
                new Restock.New(rice, 3, LocalDate.of(2026, 10, 29), null), cashier);

        assertThat(restocks.list(null, new ng.tesa.stockwise.common.Page.Request(0, 20)).items())
                .extracting(Restock::id).containsExactly(second.id(), first.id());
        assertThat(restocks.list(milk, new ng.tesa.stockwise.common.Page.Request(0, 20)).items())
                .extracting(Restock::id).containsExactly(first.id());
    }
}
