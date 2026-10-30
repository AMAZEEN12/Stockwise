package ng.tesa.stockwise.support;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

import ng.tesa.stockwise.StockwiseApplication;

/**
 * Spring context for the rule integration tests: the real services and repositories,
 * Flyway migrations, and a real Postgres 17. Each test starts from empty tables.
 *
 * <p>This container is separate from {@code db.PostgresTestDatabase}, whose tests drop and
 * undo the schema; a cached Spring context must never see that.
 */
@SpringBootTest(classes = StockwiseApplication.class)
public abstract class DatabaseTestSupport {

    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        // Enough connections for the parallel tests to really overlap.
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> "20");
        registry.add("stockwise.security.jwt-secret", () -> TEST_JWT_SECRET);
        registry.add("stockwise.cors.allowed-origins", () -> "http://localhost:5173");
    }

    /** Test-only signing key (never used outside tests). */
    protected static final String TEST_JWT_SECRET = "test-only-signing-key-0123456789-abcdefghijklmnop";

    /** The test database itself, for tests that run Flyway with other locations. */
    protected static org.flywaydb.core.api.configuration.FluentConfiguration flywayConfiguration() {
        return org.flywaydb.core.Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    @Autowired
    protected JdbcClient jdbc;

    protected UUID cashier;

    @BeforeEach
    void emptyTables() {
        // RESTART IDENTITY also restarts sale_reference_seq (owned by sale.reference), as in a fresh database.
        jdbc.sql("TRUNCATE restock, ledger_entry, stock_movement, sale_line, sale, customer, product, app_user RESTART IDENTITY").update();
        cashier = jdbc.sql("""
                        INSERT INTO app_user (email, password_hash, display_name, role)
                        VALUES ('assistant@shop.test', 'not-a-real-hash', 'Shop Assistant', 'ASSISTANT')
                        RETURNING id
                        """)
                .query(UUID.class).single();
    }

    protected UUID product(String reference, long priceKobo, int quantity) {
        return jdbc.sql("""
                        INSERT INTO product (reference, name, category, price_kobo, quantity, low_stock_threshold)
                        VALUES (:reference, :name, 'Groceries', :price, :quantity, 2)
                        RETURNING id
                        """)
                .param("reference", reference)
                .param("name", "Product " + reference)
                .param("price", priceKobo)
                .param("quantity", quantity)
                .query(UUID.class).single();
    }

    protected UUID customer(String name) {
        return jdbc.sql("INSERT INTO customer (display_name) VALUES (:name) RETURNING id")
                .param("name", name)
                .query(UUID.class).single();
    }

    protected int quantity(UUID productId) {
        return jdbc.sql("SELECT quantity FROM product WHERE id = :id").param("id", productId).query(Integer.class).single();
    }

    protected long balance(UUID customerId) {
        return jdbc.sql("SELECT balance_kobo FROM customer WHERE id = :id").param("id", customerId).query(Long.class).single();
    }

    protected long count(String table) {
        return jdbc.sql("SELECT count(*) FROM " + table).query(Long.class).single();
    }
}
