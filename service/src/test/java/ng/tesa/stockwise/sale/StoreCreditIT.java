package ng.tesa.stockwise.sale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.sale.SaleExceptions.IdempotencyKeyReused;
import ng.tesa.stockwise.sale.SaleExceptions.InsufficientStock;
import ng.tesa.stockwise.sale.SaleExceptions.InvalidSale;

/**
 * Spec R12 (DM5, DM73): a customer's store credit pays for their next sale in the same
 * transaction, never more than they hold and never twice. Every test checks the database
 * afterwards, not only what the service returned.
 */
class StoreCreditIT extends SaleTestSupport {

    /** Gives the customer store credit the way a reversal will: the cached value plus its ledger row. */
    private void giveStoreCredit(UUID customerId, long amountKobo) {
        jdbc.sql("UPDATE customer SET store_credit_kobo = store_credit_kobo + :amount WHERE id = :id")
                .param("amount", amountKobo).param("id", customerId).update();
        jdbc.sql("""
                        INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, balance_after_kobo, created_at)
                        SELECT id, :amount, 'STORE_CREDIT', NULL, balance_kobo, now() - interval '1 hour' FROM customer WHERE id = :id
                        """)
                .param("amount", amountKobo).param("id", customerId).update();
    }

    private long storeCredit(UUID customerId) {
        return jdbc.sql("SELECT store_credit_kobo FROM customer WHERE id = :id")
                .param("id", customerId).query(Long.class).single();
    }

    /** The cached store credit must always equal the sum of the customer's STORE_CREDIT ledger rows. */
    private long storeCreditInLedger(UUID customerId) {
        return jdbc.sql("""
                        SELECT coalesce(sum(delta_kobo), 0) FROM ledger_entry
                        WHERE customer_id = :id AND source_type = 'STORE_CREDIT'
                        """)
                .param("id", customerId).query(Long.class).single();
    }

    private static NewSale withCredit(PaymentType type, UUID customerId, NewSale.Line... lines) {
        return new NewSale(type, customerId, null, List.of(lines), true);
    }

    /** Spec R12 example: ₦6,000 of store credit, a ₦4,000 sale draws ₦4,000 and leaves ₦2,000. */
    @Test
    void aSaleDrawsStoreCreditAndLeavesTheRest() {
        UUID rice = product("RICE-5KG", 400_000, 10);
        UUID bola = customer("Bola");
        giveStoreCredit(bola, 600_000);

        Sale sale = saleService.record(UUID.randomUUID(), withCredit(PaymentType.PAID, bola, line(rice, 1)), cashier).sale();

        assertThat(sale.totalKobo()).isEqualTo(400_000);
        assertThat(sale.storeCreditAppliedKobo()).isEqualTo(400_000);
        assertThat(storeCredit(bola)).isEqualTo(200_000);
        assertThat(storeCreditInLedger(bola)).isEqualTo(200_000);
        assertThat(balance(bola)).isZero();
        assertThat(jdbc.sql("SELECT store_credit_used_kobo FROM sale WHERE id = :id")
                .param("id", sale.id()).query(Long.class).single()).isEqualTo(400_000);
        assertThat(jdbc.sql("""
                        SELECT delta_kobo FROM ledger_entry
                        WHERE customer_id = :id AND source_type = 'STORE_CREDIT' AND source_id = :sale
                        """)
                .param("id", bola).param("sale", sale.id()).query(Long.class).list()).containsExactly(-400_000L);
    }

    @Test
    void storeCreditCoversOnlyWhatTheCustomerHolds() {
        UUID oil = product("OIL-1L", 500_000, 10);
        UUID bola = customer("Bola");
        giveStoreCredit(bola, 200_000);

        Sale sale = saleService.record(UUID.randomUUID(), withCredit(PaymentType.PAID, bola, line(oil, 1)), cashier).sale();

        assertThat(sale.totalKobo()).isEqualTo(500_000);
        assertThat(sale.storeCreditAppliedKobo()).isEqualTo(200_000);
        assertThat(storeCredit(bola)).isZero();
        assertThat(storeCreditInLedger(bola)).isZero();
    }

    /** A CREDIT sale only adds what the store credit didn't cover, and the ledger shows the draw first. */
    @Test
    void aCreditSaleOwesOnlyTheRemainder() {
        UUID oil = product("OIL-1L", 300_000, 10);
        UUID ada = customer("Ada");
        giveStoreCredit(ada, 100_000);

        Sale sale = saleService.record(UUID.randomUUID(), withCredit(PaymentType.CREDIT, ada, line(oil, 1)), cashier).sale();

        assertThat(sale.storeCreditAppliedKobo()).isEqualTo(100_000);
        assertThat(sale.unpaidKobo()).isEqualTo(200_000);
        assertThat(balance(ada)).isEqualTo(200_000);
        assertThat(storeCredit(ada)).isZero();
        record Entry(String sourceType, long delta, long balanceAfter) {
        }
        assertThat(jdbc.sql("""
                        SELECT source_type, delta_kobo, balance_after_kobo FROM ledger_entry
                        WHERE customer_id = :id AND source_id = :sale ORDER BY created_at, id
                        """)
                .param("id", ada).param("sale", sale.id())
                .query((rs, row) -> new Entry(rs.getString(1), rs.getLong(2), rs.getLong(3))).list())
                .containsExactly(new Entry("STORE_CREDIT", -100_000, 0), new Entry("CREDIT_SALE", 200_000, 200_000));
    }

    /** Fully covered: nothing is owed, so there is no CREDIT_SALE entry (ledger deltas are never 0). */
    @Test
    void aCreditSaleFullyCoveredAddsNoDebt() {
        UUID oil = product("OIL-1L", 300_000, 10);
        UUID ada = customer("Ada");
        giveStoreCredit(ada, 500_000);

        Sale sale = saleService.record(UUID.randomUUID(), withCredit(PaymentType.CREDIT, ada, line(oil, 1)), cashier).sale();

        assertThat(sale.storeCreditAppliedKobo()).isEqualTo(300_000);
        assertThat(sale.unpaidKobo()).isZero();
        assertThat(balance(ada)).isZero();
        assertThat(storeCredit(ada)).isEqualTo(200_000);
        assertThat(jdbc.sql("SELECT count(*) FROM ledger_entry WHERE source_type = 'CREDIT_SALE'")
                .query(Long.class).single()).isZero();
    }

    @Test
    void withoutTheFlagStoreCreditIsKept() {
        UUID rice = product("RICE-5KG", 400_000, 10);
        UUID bola = customer("Bola");
        giveStoreCredit(bola, 600_000);

        Sale sale = saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.PAID, bola, null, List.of(line(rice, 1))), cashier).sale();

        assertThat(sale.storeCreditAppliedKobo()).isZero();
        assertThat(storeCredit(bola)).isEqualTo(600_000);
        assertThat(storeCreditInLedger(bola)).isEqualTo(600_000);
    }

    @Test
    void aCustomerWithNoStoreCreditPaysInFull() {
        UUID rice = product("RICE-5KG", 400_000, 10);
        UUID chidi = customer("Chidi");

        Sale sale = saleService.record(UUID.randomUUID(), withCredit(PaymentType.PAID, chidi, line(rice, 1)), cashier).sale();

        assertThat(sale.storeCreditAppliedKobo()).isZero();
        assertThat(count("ledger_entry")).isZero();
    }

    @Test
    void storeCreditNeedsACustomer() {
        UUID rice = product("RICE-5KG", 400_000, 10);

        assertThatThrownBy(() -> saleService.record(UUID.randomUUID(), withCredit(PaymentType.PAID, null, line(rice, 1)), cashier))
                .isInstanceOfSatisfying(InvalidSale.class, e -> assertThat(e.errors())
                        .extracting(SaleExceptions.FieldError::field).containsExactly("customerId"));
        assertThat(count("sale")).isZero();
        assertThat(quantity(rice)).isEqualTo(10);
    }

    /** A refused sale rolls back the draw too: the customer keeps every kobo. */
    @Test
    void aRefusedSaleKeepsTheStoreCredit() {
        UUID rice = product("RICE-5KG", 400_000, 1);
        UUID bola = customer("Bola");
        giveStoreCredit(bola, 600_000);

        assertThatThrownBy(() -> saleService.record(UUID.randomUUID(), withCredit(PaymentType.PAID, bola, line(rice, 2)), cashier))
                .isInstanceOf(InsufficientStock.class);
        assertThat(storeCredit(bola)).isEqualTo(600_000);
        assertThat(storeCreditInLedger(bola)).isEqualTo(600_000);
    }

    /** R5 with store credit: a replay reports the same amount and draws nothing more. */
    @Test
    void aReplayDrawsOnceAndReportsTheSameAmount() {
        UUID rice = product("RICE-5KG", 400_000, 10);
        UUID bola = customer("Bola");
        giveStoreCredit(bola, 600_000);
        UUID key = UUID.randomUUID();

        RecordedSale first = saleService.record(key, withCredit(PaymentType.PAID, bola, line(rice, 1)), cashier);
        RecordedSale again = saleService.record(key, withCredit(PaymentType.PAID, bola, line(rice, 1)), cashier);

        assertThat(again.replayed()).isTrue();
        assertThat(again.sale().storeCreditAppliedKobo()).isEqualTo(first.sale().storeCreditAppliedKobo()).isEqualTo(400_000);
        assertThat(storeCredit(bola)).isEqualTo(200_000);
        assertThat(count("sale")).isEqualTo(1);
    }

    @Test
    void switchingStoreCreditOnARetryIsADifferentBody() {
        UUID rice = product("RICE-5KG", 400_000, 10);
        UUID bola = customer("Bola");
        giveStoreCredit(bola, 600_000);
        UUID key = UUID.randomUUID();
        saleService.record(key, new NewSale(PaymentType.PAID, bola, null, List.of(line(rice, 1))), cashier);

        assertThatThrownBy(() -> saleService.record(key, withCredit(PaymentType.PAID, bola, line(rice, 1)), cashier))
                .isInstanceOf(IdempotencyKeyReused.class);
        assertThat(storeCredit(bola)).isEqualTo(600_000);
    }

    /**
     * R12: two tills can't spend the same credit twice. ₦6,000 of credit and three ₦4,000 sales at
     * the same moment: in total exactly ₦6,000 is drawn (₦4,000, ₦2,000 and ₦0), and every sale is
     * recorded. Fails if the draw isn't taken under the customer's row lock: the later sales then
     * draw nothing, or more than is held. Each sale is for a different product, so the product row
     * locks don't queue them before they reach the store credit.
     */
    @Test
    void parallelSalesCannotSpendTheSameCreditTwice() throws Exception {
        List<UUID> products = List.of(product("RICE-5KG", 400_000, 10), product("BEANS-5KG", 400_000, 10),
                product("GARRI-5KG", 400_000, 10));
        UUID bola = customer("Bola");
        giveStoreCredit(bola, 600_000);

        List<Object> outcomes = Parallel.run(3, n -> saleService.record(UUID.randomUUID(),
                withCredit(PaymentType.PAID, bola, line(products.get(n), 1)), cashier));

        assertThat(outcomes).allMatch(RecordedSale.class::isInstance);
        assertThat(outcomes.stream().map(o -> ((RecordedSale) o).sale().storeCreditAppliedKobo()).sorted().toList())
                .containsExactly(0L, 200_000L, 400_000L);
        assertThat(storeCredit(bola)).isZero();
        assertThat(storeCreditInLedger(bola)).isZero();
    }
}
