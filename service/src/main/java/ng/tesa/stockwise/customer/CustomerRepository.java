package ng.tesa.stockwise.customer;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ng.tesa.stockwise.common.Page;

/**
 * SQL for customers (spec R7). Balances are never written here: only the sale, repayment and
 * reversal transactions change them, through guarded updates with ledger entries.
 */
@Repository
public class CustomerRepository {

    private static final String COLUMNS = "id, display_name, contact_placeholder, balance_kobo, store_credit_kobo, created_at";

    private final JdbcClient jdbc;

    public CustomerRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Two customers may share a name (a shop knows several "Mama Ngozi"s), so there is no uniqueness rule. */
    public Customer create(Customer.New customer) {
        String contact = customer.contactPlaceholder() == null || customer.contactPlaceholder().isBlank()
                ? null : customer.contactPlaceholder().trim();
        UUID id = jdbc.sql("""
                        INSERT INTO customer (display_name, contact_placeholder)
                        VALUES (:name, :contact)
                        RETURNING id
                        """)
                .param("name", customer.displayName().trim())
                .param("contact", contact)
                .query(UUID.class)
                .single();
        return findById(id).orElseThrow();
    }

    public Optional<Customer> findById(UUID id) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM customer WHERE id = :id")
                .param("id", id)
                .query((rs, row) -> map(rs))
                .optional();
    }

    /** {@code q} matches the display name, case-insensitively, as plain text. Ordered by name, then ID. */
    public Page<Customer> list(String q, Page.Request page) {
        boolean filtered = q != null && !q.isBlank();
        String where = filtered ? " WHERE display_name ILIKE :q ESCAPE '\\'" : "";
        Map<String, Object> params = filtered ? Map.of("q", "%" + escapeLike(q.trim()) + "%") : Map.of();

        long total = jdbc.sql("SELECT count(*) FROM customer" + where)
                .params(params)
                .query(Long.class)
                .single();
        List<Customer> items = jdbc.sql("SELECT " + COLUMNS + " FROM customer" + where
                        + " ORDER BY lower(display_name), id LIMIT :limit OFFSET :offset")
                .params(params)
                .param("limit", page.size())
                .param("offset", page.offset())
                .query((rs, row) -> map(rs))
                .list();
        return new Page<>(items, page.page(), page.size(), total);
    }

    private static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static Customer map(ResultSet rs) throws SQLException {
        return new Customer(
                rs.getObject("id", UUID.class),
                rs.getString("display_name"),
                rs.getString("contact_placeholder"),
                rs.getLong("balance_kobo"),
                rs.getLong("store_credit_kobo"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant());
    }
}
