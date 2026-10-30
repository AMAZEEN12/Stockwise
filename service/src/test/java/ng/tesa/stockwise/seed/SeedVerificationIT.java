package ng.tesa.stockwise.seed;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import ng.tesa.stockwise.sale.NewSale;
import ng.tesa.stockwise.sale.PaymentType;
import ng.tesa.stockwise.sale.SaleService;
import ng.tesa.stockwise.support.DatabaseTestSupport;

/**
 * The Monday seed subset (DM16, spec R19, S6): counts, every awkward case, and exact
 * reconciliation of stock, balances and store credit with their history (R10, R13).
 * The seed comes from {@code tools/seed/generate_monday_seed.py}.
 */
class SeedVerificationIT extends DatabaseTestSupport {

    static final String SEED = "db/seed/R__seed_demo.sql";
    static final String DEMO_PASSWORD = "Stockwise-Demo-2026";

    @Autowired
    SaleService saleService;

    @BeforeEach
    void seed() throws IOException {
        jdbc.sql(seedSql()).update();
    }

    static String seedSql() throws IOException {
        return new ClassPathResource(SEED).getContentAsString(StandardCharsets.UTF_8);
    }

    long number(String sql) {
        return jdbc.sql(sql).query(Long.class).single();
    }

    /** R15, R20: one demo login per role, each with the README password, stored as BCrypt. */
    @Test
    void oneDemoLoginPerRoleWithTheReadmePassword() {
        var encoder = new BCryptPasswordEncoder();
        List<List<String>> users = jdbc.sql("""
                        SELECT email, role, password_hash FROM app_user
                        WHERE email LIKE '%@stockwise.test' ORDER BY role
                        """)
                .query((rs, row) -> List.of(rs.getString(1), rs.getString(2), rs.getString(3))).list();

        assertThat(users).extracting(u -> u.get(1)).containsExactly("ADMIN", "ASSISTANT", "OWNER");
        assertThat(users).allSatisfy(u -> {
            assertThat(u.get(2)).startsWith("$2a$10$");
            assertThat(encoder.matches(DEMO_PASSWORD, u.get(2))).as("password of %s", u.get(0)).isTrue();
        });
    }

    /** DM16: 20 products, 5 customers, sales on each of the last 7 Lagos days including today. */
    @Test
    void mondaySubsetCounts() {
        assertThat(count("product")).isEqualTo(20);
        assertThat(count("customer")).isEqualTo(5);
        assertThat(number("""
                SELECT count(DISTINCT (created_at AT TIME ZONE 'Africa/Lagos')::date) FROM sale
                WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos' - interval '6 days'
                """)).isEqualTo(7);
        assertThat(number("""
                SELECT count(*) FROM sale
                WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos'
                """)).as("sales today (dashboard)").isGreaterThan(0);
        assertThat(number("SELECT count(*) FROM sale WHERE payment_type = 'CREDIT'")).isGreaterThan(0);
        assertThat(number("SELECT count(*) FROM sale WHERE created_at > now()")).as("sales in the future").isZero();
    }

    /** R19: every awkward product case is present. */
    @Test
    void awkwardProductsArePresent() {
        assertThat(number("SELECT count(*) FROM product WHERE active AND quantity = 0")).as("sold out").isGreaterThan(0);
        assertThat(number("SELECT count(*) FROM product WHERE active AND quantity > 0 AND quantity = low_stock_threshold"))
                .as("exactly at threshold").isGreaterThan(0);
        assertThat(number("SELECT count(*) FROM product WHERE active AND quantity > 0 AND quantity < low_stock_threshold"))
                .as("below threshold").isGreaterThan(0);
        assertThat(number("SELECT count(*) FROM product WHERE NOT active")).as("archived").isGreaterThan(0);
        assertThat(number("SELECT count(*) FROM product WHERE length(name) >= 150")).as("very long name").isGreaterThan(0);
        assertThat(number("""
                SELECT count(*) FROM product p WHERE NOT p.active
                  AND EXISTS (SELECT 1 FROM sale_line l WHERE l.product_id = p.id)
                """)).as("archived product with past sales").isGreaterThan(0);
    }

    /** R19, DM16: one owing, one holding store credit, one fully repaid, one with a reversed sale. */
    @Test
    void awkwardCustomersArePresent() {
        assertThat(number("SELECT count(*) FROM customer WHERE balance_kobo > 0")).as("owing").isGreaterThan(0);
        assertThat(number("SELECT count(*) FROM customer WHERE store_credit_kobo > 0 AND balance_kobo = 0"))
                .as("holding store credit").isGreaterThan(0);
        assertThat(number("""
                SELECT count(*) FROM customer c WHERE c.balance_kobo = 0 AND c.store_credit_kobo = 0
                  AND EXISTS (SELECT 1 FROM ledger_entry e WHERE e.customer_id = c.id AND e.source_type = 'CREDIT_SALE')
                  AND EXISTS (SELECT 1 FROM ledger_entry e WHERE e.customer_id = c.id AND e.source_type = 'REPAYMENT')
                """)).as("fully repaid").isGreaterThan(0);
        assertThat(number("SELECT count(DISTINCT source_id) FROM stock_movement WHERE source_type = 'SALE_REVERSAL'"))
                .as("reversed sale").isGreaterThan(0);
    }

    /** The spec R12 example as data: N10,000 credit sale, N6,000 repaid, reversed: balance 0, store credit N6,000. */
    @Test
    void storeCreditCaseMatchesTheSpecExample() {
        var bola = jdbc.sql("SELECT balance_kobo, store_credit_kobo FROM customer WHERE display_name = 'Bola Adeyemi'")
                .query((rs, row) -> List.of(rs.getLong(1), rs.getLong(2))).single();
        assertThat(bola).containsExactly(0L, 600_000L);
        assertThat(jdbc.sql("""
                        SELECT e.source_type || ' ' || e.delta_kobo || ' ' || e.balance_after_kobo
                        FROM ledger_entry e JOIN customer c ON c.id = e.customer_id
                        WHERE c.display_name = 'Bola Adeyemi' ORDER BY e.created_at, e.source_type
                        """).query(String.class).list())
                .containsExactly("CREDIT_SALE 1000000 1000000", "REPAYMENT -600000 400000",
                        "REVERSAL -400000 0", "STORE_CREDIT 600000 0");
    }

    /** R13: every product's quantity equals the sum of its movements. */
    @Test
    void stockReconcilesWithMovements() {
        assertThat(jdbc.sql("""
                        SELECT p.reference FROM product p
                        WHERE p.quantity <> (SELECT coalesce(sum(m.delta), 0) FROM stock_movement m WHERE m.product_id = p.id)
                        """).query(String.class).list()).isEmpty();
    }

    /** R10: balances and store credit equal their ledger rows, and each running balance follows on. */
    @Test
    void customersReconcileWithTheLedger() {
        assertThat(jdbc.sql("""
                        SELECT c.display_name FROM customer c
                        WHERE c.balance_kobo <> (SELECT coalesce(sum(e.delta_kobo), 0) FROM ledger_entry e
                                                 WHERE e.customer_id = c.id AND e.source_type <> 'STORE_CREDIT')
                           OR c.store_credit_kobo <> (SELECT coalesce(sum(e.delta_kobo), 0) FROM ledger_entry e
                                                      WHERE e.customer_id = c.id AND e.source_type = 'STORE_CREDIT')
                        """).query(String.class).list()).isEmpty();
        assertThat(number("""
                SELECT count(*) FROM (
                  SELECT balance_after_kobo, source_type, delta_kobo,
                         lag(balance_after_kobo, 1, 0::bigint) OVER (PARTITION BY customer_id ORDER BY created_at, source_type) AS before
                  FROM ledger_entry) r
                WHERE balance_after_kobo <> before + CASE WHEN source_type = 'STORE_CREDIT' THEN 0 ELSE delta_kobo END
                """)).as("running balances that don't follow on").isZero();
    }

    /** Each sale total is the sum of its lines, and a credit sale's total is on the ledger. */
    @Test
    void salesReconcileWithLinesAndLedger() {
        assertThat(number("""
                SELECT count(*) FROM sale s
                WHERE s.total_kobo <> (SELECT sum(l.line_total_kobo) FROM sale_line l WHERE l.sale_id = s.id)
                """)).isZero();
        assertThat(number("""
                SELECT count(*) FROM sale s WHERE s.payment_type = 'CREDIT' AND NOT EXISTS (
                  SELECT 1 FROM ledger_entry e WHERE e.source_type = 'CREDIT_SALE' AND e.source_id = s.id
                    AND e.delta_kobo = s.total_kobo AND e.customer_id = s.customer_id)
                """)).isZero();
        assertThat(jdbc.sql("SELECT reference FROM sale ORDER BY created_at, reference LIMIT 1").query(String.class).single())
                .isEqualTo("S-000001");
    }

    /** Running the seed again, or over existing data, changes nothing. */
    @Test
    void secondRunChangesNothing() throws IOException {
        long sales = count("sale");
        long ledger = count("ledger_entry");
        jdbc.sql(seedSql()).update();
        assertThat(count("product")).isEqualTo(20);
        assertThat(count("sale")).isEqualTo(sales);
        assertThat(count("ledger_entry")).isEqualTo(ledger);
    }

    /** The demo profile's Flyway locations apply the seed as a repeatable migration. */
    @Test
    void flywayAppliesTheSeedFromTheDemoLocation() {
        jdbc.sql("TRUNCATE restock, ledger_entry, stock_movement, sale_line, sale, customer, product RESTART IDENTITY").update();
        jdbc.sql("DELETE FROM app_user WHERE email LIKE '%@stockwise.test'").update();
        jdbc.sql("DELETE FROM flyway_schema_history WHERE version IS NULL").update();

        var result = flywayConfiguration().locations("classpath:db/migration", "classpath:db/seed").load().migrate();

        assertThat(result.migrationsExecuted).isEqualTo(1);
        assertThat(count("product")).isEqualTo(20);
        assertThat(count("customer")).isEqualTo(5);
    }

    /** The seeded shop can trade: a sale from seeded stock goes through the real transaction. */
    @Test
    void seededShopCanRecordASale() {
        UUID assistant = jdbc.sql("SELECT id FROM app_user WHERE email = 'assistant@stockwise.test'").query(UUID.class).single();
        UUID coke = jdbc.sql("SELECT id FROM product WHERE reference = 'COKE-50'").query(UUID.class).single();
        int before = quantity(coke);

        var sale = saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.PAID, null, null, List.of(new NewSale.Line(coke, 2))), assistant).sale();

        assertThat(sale.reference()).isEqualTo(String.format("S-%06d", count("sale")));
        assertThat(quantity(coke)).isEqualTo(before - 2);
    }
}
