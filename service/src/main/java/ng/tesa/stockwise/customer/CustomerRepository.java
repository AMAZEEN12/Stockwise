package ng.tesa.stockwise.customer;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import ng.tesa.stockwise.common.IdempotencyKeyReused;
import ng.tesa.stockwise.common.NotFoundException;
import ng.tesa.stockwise.common.Page;

/**
 * SQL for customers (spec R7). Balances are never written here: only the sale, repayment and
 * reversal transactions change them, through guarded updates with ledger entries.
 */
@Repository
public class CustomerRepository {

    private static final String COLUMNS = """
            c.id, c.display_name, c.contact_placeholder, c.balance_kobo, c.store_credit_kobo,
            EXISTS (
                SELECT 1 FROM ledger_entry debt
                WHERE debt.customer_id = c.id AND debt.source_type <> 'STORE_CREDIT'
            ) AS has_debt_activity,
            EXISTS (
                SELECT 1 FROM ledger_entry credit
                WHERE credit.customer_id = c.id AND credit.source_type = 'STORE_CREDIT'
            ) AS has_store_credit_activity,
            c.created_at
            """;

    private final JdbcClient jdbc;
    private final Clock clock;

    public CustomerRepository(JdbcClient jdbc) {
        this(jdbc, Clock.systemUTC());
    }

    @Autowired
    public CustomerRepository(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
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
        return jdbc.sql("SELECT " + COLUMNS + " FROM customer c WHERE c.id = :id")
                .param("id", id)
                .query((rs, row) -> map(rs))
                .optional();
    }

    /** {@code q} matches the display name, case-insensitively, as plain text. Ordered by name, then ID. */
    public Page<Customer> list(String q, Page.Request page) {
        boolean filtered = q != null && !q.isBlank();
        String countWhere = filtered ? " WHERE display_name ILIKE :q ESCAPE '\\'" : "";
        String listWhere = filtered ? " WHERE c.display_name ILIKE :q ESCAPE '\\'" : "";
        Map<String, Object> params = filtered ? Map.of("q", "%" + escapeLike(q.trim()) + "%") : Map.of();

        long total = jdbc.sql("SELECT count(*) FROM customer" + countWhere)
                .params(params)
                .query(Long.class)
                .single();
        List<Customer> items = jdbc.sql("SELECT " + COLUMNS + " FROM customer c" + listWhere
                        + " ORDER BY lower(c.display_name), c.id LIMIT :limit OFFSET :offset")
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
                rs.getBoolean("has_debt_activity"),
                rs.getBoolean("has_store_credit_activity"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant());
    }

    /**
     * Records a debt repayment and allocates it to the customer's oldest outstanding credit sales
     * in strictly ascending (created_at, id) order (spec R13, proposal "Example").
     */
    @Transactional
    public List<RepaymentAllocation> recordRepayment(UUID customerId, long amountKobo, UUID createdBy) {
        if (amountKobo <= 0) {
            throw new IllegalArgumentException("Repayment amount must be positive");
        }
        Instant now = clock.instant();

        // Lock customer row to serialize concurrent debt changes
        CustomerBalance balance = jdbc.sql("""
                SELECT id, balance_kobo, store_credit_kobo
                FROM customer WHERE id = :id FOR UPDATE
                """)
                .param("id", customerId)
                .query((rs, row) -> new CustomerBalance(
                        rs.getObject("id", UUID.class),
                        rs.getLong("balance_kobo"),
                        rs.getLong("store_credit_kobo")
                ))
                .optional()
                .orElseThrow(() -> new NotFoundException("Customer not found: " + customerId));

        if (balance.balanceKobo < amountKobo) {
            throw new IllegalArgumentException("Repayment amount (" + amountKobo + " kobo) exceeds outstanding debt (" + balance.balanceKobo + " kobo)");
        }

        long newBalance = balance.balanceKobo - amountKobo;

        // Append repayment ledger entry
        UUID ledgerEntryId = jdbc.sql("""
                INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, balance_after_kobo, created_at)
                VALUES (:customerId, :delta, 'REPAYMENT', NULL, :balanceAfter, :createdAt)
                RETURNING id
                """)
                .param("customerId", customerId)
                .param("delta", -amountKobo)
                .param("balanceAfter", newBalance)
                .param("createdAt", now.atOffset(ZoneOffset.UTC))
                .query(UUID.class)
                .single();

        // Query outstanding credit sales in deterministic (created_at ASC, id ASC) order
        List<OutstandingSale> outstandingSales = jdbc.sql("""
                SELECT id, unpaid_kobo
                FROM sale
                WHERE customer_id = :customerId AND payment_type = 'CREDIT' AND reversed_at IS NULL AND unpaid_kobo > 0
                ORDER BY created_at ASC, id ASC
                FOR UPDATE
                """)
                .param("customerId", customerId)
                .query((rs, row) -> new OutstandingSale(rs.getObject("id", UUID.class), rs.getLong("unpaid_kobo")))
                .list();

        List<RepaymentAllocation> allocations = new ArrayList<>();
        long remaining = amountKobo;

        for (OutstandingSale sale : outstandingSales) {
            if (remaining <= 0) {
                break;
            }
            long allocated = Math.min(remaining, sale.unpaidKobo);
            jdbc.sql("""
                    UPDATE sale
                    SET unpaid_kobo = unpaid_kobo - :allocated
                    WHERE id = :id
                    """)
                    .param("allocated", allocated)
                    .param("id", sale.id)
                    .update();

            UUID allocId = jdbc.sql("""
                    INSERT INTO repayment_allocation (customer_id, sale_id, repayment_ledger_entry_id, amount_kobo, created_by, created_at)
                    VALUES (:customerId, :saleId, :ledgerEntryId, :amount, :createdBy, :createdAt)
                    RETURNING id
                    """)
                    .param("customerId", customerId)
                    .param("saleId", sale.id)
                    .param("ledgerEntryId", ledgerEntryId)
                    .param("amount", allocated)
                    .param("createdBy", createdBy)
                    .param("createdAt", now.atOffset(ZoneOffset.UTC))
                    .query(UUID.class)
                    .single();

            allocations.add(new RepaymentAllocation(allocId, customerId, sale.id, ledgerEntryId, allocated, createdBy, now));
            remaining -= allocated;
        }

        if (remaining > 0) {
            throw new IllegalStateException("Repayment cannot be fully allocated to outstanding sales: " + remaining + " kobo unallocated");
        }

        // Update customer balance
        jdbc.sql("""
                UPDATE customer
                SET balance_kobo = :newBalance
                WHERE id = :id
                """)
                .param("newBalance", newBalance)
                .param("id", customerId)
                .update();

        return allocations;
    }

    public List<RepaymentAllocation> findAllocationsBySaleId(UUID saleId) {
        return jdbc.sql("""
                SELECT id, customer_id, sale_id, repayment_ledger_entry_id, amount_kobo, created_by, created_at
                FROM repayment_allocation
                WHERE sale_id = :saleId
                ORDER BY created_at ASC, id ASC
                """)
                .param("saleId", saleId)
                .query((rs, row) -> new RepaymentAllocation(
                        rs.getObject("id", UUID.class),
                        rs.getObject("customer_id", UUID.class),
                        rs.getObject("sale_id", UUID.class),
                        rs.getObject("repayment_ledger_entry_id", UUID.class),
                        rs.getLong("amount_kobo"),
                        rs.getObject("created_by", UUID.class),
                        rs.getObject("created_at", OffsetDateTime.class).toInstant()
                ))
                .list();
    }

    public List<RepaymentAllocation> findAllocationsByCustomerId(UUID customerId) {
        return jdbc.sql("""
                SELECT id, customer_id, sale_id, repayment_ledger_entry_id, amount_kobo, created_by, created_at
                FROM repayment_allocation
                WHERE customer_id = :customerId
                ORDER BY created_at ASC, id ASC
                """)
                .param("customerId", customerId)
                .query((rs, row) -> new RepaymentAllocation(
                        rs.getObject("id", UUID.class),
                        rs.getObject("customer_id", UUID.class),
                        rs.getObject("sale_id", UUID.class),
                        rs.getObject("repayment_ledger_entry_id", UUID.class),
                        rs.getLong("amount_kobo"),
                        rs.getObject("created_by", UUID.class),
                        rs.getObject("created_at", OffsetDateTime.class).toInstant()
                ))
                .list();
    }

    private record CustomerBalance(UUID id, long balanceKobo, long storeCreditKobo) {}
    private record OutstandingSale(UUID id, long unpaidKobo) {}
}
