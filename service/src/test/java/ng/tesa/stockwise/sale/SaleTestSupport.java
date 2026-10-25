package ng.tesa.stockwise.sale;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Spring context for the sale integration tests: the real {@link SaleService} and
 * {@link SaleRepository}, Flyway migrations V1-V3, and a real Postgres 17.
 *
 * <p>This container is separate from {@code db.PostgresTestDatabase}, whose tests drop and
 * undo the schema; a cached Spring context must never see that. The test configuration is
 * explicit until the application class exists (plan step 3).
 */
@SpringBootTest(classes = SaleTestSupport.SaleTestApplication.class)
abstract class SaleTestSupport {

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
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @ComponentScan(basePackageClasses = SaleService.class)
    static class SaleTestApplication {
    }

    @Autowired
    SaleService saleService;

    @Autowired
    JdbcClient jdbc;

    UUID cashier;

    @BeforeEach
    void emptyTables() {
        jdbc.sql("TRUNCATE ledger_entry, stock_movement, sale_line, sale, customer, product, app_user").update();
        cashier = jdbc.sql("""
                        INSERT INTO app_user (email, password_hash, display_name, role)
                        VALUES ('assistant@shop.test', 'not-a-real-hash', 'Shop Assistant', 'ASSISTANT')
                        RETURNING id
                        """)
                .query(UUID.class).single();
    }

    UUID product(String reference, long priceKobo, int quantity) {
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

    UUID customer(String name) {
        return jdbc.sql("INSERT INTO customer (display_name) VALUES (:name) RETURNING id")
                .param("name", name)
                .query(UUID.class).single();
    }

    int quantity(UUID productId) {
        return jdbc.sql("SELECT quantity FROM product WHERE id = :id").param("id", productId).query(Integer.class).single();
    }

    long balance(UUID customerId) {
        return jdbc.sql("SELECT balance_kobo FROM customer WHERE id = :id").param("id", customerId).query(Long.class).single();
    }

    long count(String table) {
        return jdbc.sql("SELECT count(*) FROM " + table).query(Long.class).single();
    }

    static NewSale paid(NewSale.Line... lines) {
        return new NewSale(PaymentType.PAID, null, null, java.util.List.of(lines));
    }

    static NewSale.Line line(UUID productId, int quantity) {
        return new NewSale.Line(productId, quantity);
    }
}
