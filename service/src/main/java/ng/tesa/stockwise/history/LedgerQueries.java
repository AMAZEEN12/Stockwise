package ng.tesa.stockwise.history;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ng.tesa.stockwise.common.Page;

/**
 * Read-only queries for a customer's ledger (spec R10). Nothing here writes.
 *
 * <p>The balance after each entry is stored on the row ({@code balance_after_kobo}), written in the
 * same transaction as the entry. Store credit after each entry is a window sum of the
 * {@code STORE_CREDIT} rows over the whole history, computed before LIMIT and OFFSET so later pages
 * stay correct. Uses index {@code ledger_entry_customer_time_idx}.
 */
@Repository
public class LedgerQueries {

    /** The customer's current figures. */
    public record Balances(long balanceKobo, long storeCreditKobo) {
    }

    private final JdbcClient jdbc;

    public LedgerQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Empty if the customer doesn't exist. */
    public Optional<Balances> balances(UUID customerId) {
        return jdbc.sql("SELECT balance_kobo, store_credit_kobo FROM customer WHERE id = :id")
                .param("id", customerId)
                .query((rs, row) -> new Balances(rs.getLong("balance_kobo"), rs.getLong("store_credit_kobo")))
                .optional();
    }

    public long count(UUID customerId) {
        return jdbc.sql("SELECT count(*) FROM ledger_entry WHERE customer_id = :id")
                .param("id", customerId)
                .query(Long.class)
                .single();
    }

    /** One page of entries, newest first; ties on time are broken by ID so paging is stable. */
    public List<LedgerEntry> page(UUID customerId, Page.Request request) {
        return jdbc.sql("""
                        SELECT id, source_type, source_id, delta_kobo, balance_after_kobo, created_at,
                               store_credit_after_kobo
                        FROM (
                            SELECT id, source_type, source_id, delta_kobo, balance_after_kobo, created_at,
                                   sum(CASE WHEN source_type = 'STORE_CREDIT' THEN delta_kobo ELSE 0 END)
                                       OVER (ORDER BY created_at, id) AS store_credit_after_kobo
                            FROM ledger_entry
                            WHERE customer_id = :id
                        ) ledger
                        ORDER BY created_at DESC, id DESC
                        LIMIT :limit OFFSET :offset
                        """)
                .param("id", customerId)
                .param("limit", request.size())
                .param("offset", request.offset())
                .query((rs, row) -> new LedgerEntry(
                        rs.getObject("id", UUID.class),
                        rs.getString("source_type"),
                        rs.getObject("source_id", UUID.class),
                        rs.getLong("delta_kobo"),
                        rs.getLong("balance_after_kobo"),
                        rs.getLong("store_credit_after_kobo"),
                        rs.getObject("created_at", OffsetDateTime.class).toInstant()))
                .list();
    }
}
