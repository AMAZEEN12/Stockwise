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

import ng.tesa.stockwise.common.IdempotencyKeyReused;
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

    static String normalisedName(Customer.New customer) {
        return customer.displayName().trim();
    }

    static String normalisedContact(Customer.New customer) {
        return customer.contactPlaceholder() == null || customer.contactPlaceholder().isBlank()
                ? null : customer.contactPlaceholder().trim();
    }

    /** Two customers may share a name (a shop knows several "Mama Ngozi"s), so there is no uniqueness rule. */
    public Customer create(Customer.New customer) {
        UUID id = jdbc.sql("""
                        INSERT INTO customer (display_name, contact_placeholder)
                        VALUES (:name, :contact)
                        RETURNING id
                        """)
                .param("name", normalisedName(customer))
                .param("contact", normalisedContact(customer))
                .query(UUID.class)
                .single();
        return findById(id).orElseThrow();
    }

    /**
     * Contract v0.2.0: a retry-safe create. The INSERT claims the Idempotency-Key through
     * {@code customer_idempotency_key_uq}; a parallel attempt with the same key waits there until
     * the first commits, then inserts nothing. A replay returns the original customer only if the
     * same user sent the same body; anything else is {@link IdempotencyKeyReused}.
     */
    public Customer create(Customer.New customer, UUID idempotencyKey, UUID createdBy) {
        String hash = CustomerRequestHash.of(customer);
        Optional<UUID> claimed = jdbc.sql("""
                        INSERT INTO customer (display_name, contact_placeholder, idempotency_key, request_hash, created_by)
                        VALUES (:name, :contact, :key, :hash, :createdBy)
                        ON CONFLICT (idempotency_key) DO NOTHING
                        RETURNING id
                        """)
                .param("name", normalisedName(customer))
                .param("contact", normalisedContact(customer))
                .param("key", idempotencyKey)
                .param("hash", hash)
                .param("createdBy", createdBy)
                .query(UUID.class)
                .optional();
        if (claimed.isPresent()) {
            return findById(claimed.get()).orElseThrow();
        }
        return jdbc.sql("SELECT id, request_hash, created_by FROM customer WHERE idempotency_key = :key")
                .param("key", idempotencyKey)
                .query((rs, row) -> {
                    boolean same = hash.equals(rs.getString("request_hash"))
                            && createdBy.equals(rs.getObject("created_by", UUID.class));
                    return same ? rs.getObject("id", UUID.class) : null;
                })
                .optional()
                .map(id -> findById(id).orElseThrow())
                .orElseThrow(() -> new IdempotencyKeyReused(idempotencyKey));
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
