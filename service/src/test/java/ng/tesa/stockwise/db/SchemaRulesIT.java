package ng.tesa.stockwise.db;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Database-level protection of the rules, checked by direct SQL so they hold even when the
 * service is bypassed (brief: "cannot be broken by calling the service directly").
 * Each test fails if its constraint is removed from the migration.
 */
class SchemaRulesIT {

    @BeforeEach
    void freshSchema() throws SQLException {
        PostgresTestDatabase.resetSchema();
        PostgresTestDatabase.flyway(null).migrate();
    }

    /** N1 / S4: no floating-point or arbitrary-precision column can hold money or quantities. */
    @Test
    void noFloatingPointOrNumericColumns() throws SQLException {
        List<String> offenders = new ArrayList<>();
        try (Connection c = PostgresTestDatabase.connect(); Statement s = c.createStatement();
             ResultSet rows = s.executeQuery("""
                     SELECT table_name || '.' || column_name || ' ' || data_type
                     FROM information_schema.columns
                     WHERE table_schema = 'public'
                       AND data_type IN ('real', 'double precision', 'numeric', 'money')
                     """)) {
            while (rows.next()) {
                offenders.add(rows.getString(1));
            }
        }
        assertThat(offenders).isEmpty();
    }

    /** N1: every *_kobo column is bigint. */
    @Test
    void everyKoboColumnIsBigint() throws SQLException {
        List<String> koboColumns = new ArrayList<>();
        try (Connection c = PostgresTestDatabase.connect(); Statement s = c.createStatement();
             ResultSet rows = s.executeQuery("""
                     SELECT table_name || '.' || column_name || ' ' || data_type
                     FROM information_schema.columns
                     WHERE table_schema = 'public' AND column_name LIKE '%\\_kobo' ESCAPE '\\'
                     """)) {
            while (rows.next()) {
                koboColumns.add(rows.getString(1));
            }
        }
        assertThat(koboColumns).isNotEmpty().allSatisfy(col -> assertThat(col).endsWith(" bigint"));
    }

    /** R4 backstop: stock can never be negative, even by direct SQL. */
    @Test
    void productQuantityCannotGoNegative() throws SQLException {
        UUID product = insertProduct(1);
        assertThatThrownBy(() -> execute("UPDATE product SET quantity = quantity - 2 WHERE id = '" + product + "'"))
                .isInstanceOf(SQLException.class)
                .hasMessageContaining("product_quantity_non_negative");
    }

    /** R8: a credit sale without a customer is rejected by the database. */
    @Test
    void creditSaleRequiresCustomer() throws SQLException {
        UUID user = insertUser();
        assertThatThrownBy(() -> execute("""
                INSERT INTO sale (idempotency_key, request_hash, payment_type, total_kobo, created_by)
                VALUES ('%s', 'h', 'CREDIT', 45000, '%s')
                """.formatted(UUID.randomUUID(), user)))
                .isInstanceOf(SQLException.class)
                .hasMessageContaining("sale_credit_requires_customer");
    }

    /** R5: the same idempotency key cannot create two sales. */
    @Test
    void idempotencyKeyIsUnique() throws SQLException {
        UUID user = insertUser();
        UUID key = UUID.randomUUID();
        String insert = """
                INSERT INTO sale (idempotency_key, request_hash, payment_type, total_kobo, created_by)
                VALUES ('%s', 'h', 'PAID', 45000, '%s')
                """.formatted(key, user);
        execute(insert);
        assertThatThrownBy(() -> execute(insert))
                .isInstanceOf(SQLException.class)
                .hasMessageContaining("sale_idempotency_key_uq");
    }

    /** R9 and R12: balance and store credit can never go below zero. */
    @Test
    void customerBalanceAndStoreCreditCannotGoNegative() throws SQLException {
        execute("INSERT INTO customer (id, display_name, balance_kobo, store_credit_kobo) "
                + "VALUES ('00000000-0000-4000-8000-0000000000c1', 'Mama Ada', 1000000, 600000)");
        assertThatThrownBy(() -> execute("UPDATE customer SET balance_kobo = balance_kobo - 1000001"))
                .hasMessageContaining("customer_balance_non_negative");
        assertThatThrownBy(() -> execute("UPDATE customer SET store_credit_kobo = store_credit_kobo - 600001"))
                .hasMessageContaining("customer_store_credit_non_negative");
    }

    /** Sale lines can't carry a total that disagrees with quantity x price. */
    @Test
    void saleLineTotalMustMatch() throws SQLException {
        UUID user = insertUser();
        UUID product = insertProduct(5);
        UUID sale = UUID.randomUUID();
        execute("""
                INSERT INTO sale (id, idempotency_key, request_hash, payment_type, total_kobo, created_by)
                VALUES ('%s', '%s', 'h', 'PAID', 90000, '%s')
                """.formatted(sale, UUID.randomUUID(), user));
        assertThatThrownBy(() -> execute("""
                INSERT INTO sale_line (sale_id, product_id, quantity, unit_price_kobo, line_total_kobo)
                VALUES ('%s', '%s', 2, 45000, 90001)
                """.formatted(sale, product)))
                .hasMessageContaining("sale_line_total_matches");
    }

    @Test
    void saleReferenceIsGeneratedInOrder() throws SQLException {
        UUID user = insertUser();
        for (int i = 0; i < 2; i++) {
            execute("""
                    INSERT INTO sale (idempotency_key, request_hash, payment_type, total_kobo, created_by)
                    VALUES ('%s', 'h', 'PAID', 100, '%s')
                    """.formatted(UUID.randomUUID(), user));
        }
        assertThat(queryStrings("SELECT reference FROM sale ORDER BY reference"))
                .containsExactly("S-000001", "S-000002");
    }

    private static UUID insertUser() throws SQLException {
        UUID id = UUID.randomUUID();
        execute("INSERT INTO app_user (id, email, password_hash, display_name, role) "
                + "VALUES ('" + id + "', '" + id + "@demo.test', 'x', 'Demo', 'ASSISTANT')");
        return id;
    }

    private static UUID insertProduct(int quantity) throws SQLException {
        UUID id = UUID.randomUUID();
        execute("INSERT INTO product (id, reference, name, category, price_kobo, quantity, low_stock_threshold) "
                + "VALUES ('" + id + "', 'REF-" + id.toString().substring(0, 8) + "', 'Peak Milk 400g', 'Dairy', 45000, "
                + quantity + ", 2)");
        return id;
    }

    private static void execute(String sql) throws SQLException {
        try (Connection c = PostgresTestDatabase.connect(); Statement s = c.createStatement()) {
            s.execute(sql);
        }
    }

    private static List<String> queryStrings(String sql) throws SQLException {
        List<String> values = new ArrayList<>();
        try (Connection c = PostgresTestDatabase.connect(); Statement s = c.createStatement();
             ResultSet rows = s.executeQuery(sql)) {
            while (rows.next()) {
                values.add(rows.getString(1));
            }
        }
        return values;
    }
}
