package ng.tesa.stockwise.customer;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ng.tesa.stockwise.common.IdempotencyKeyReused;

/**
 * SQL for the two keyed money writes on a customer (contract v0.5.0): repayments (R9) and manual
 * store-credit grants (DM74). Each INSERT claims its Idempotency-Key through a unique constraint,
 * never a prior SELECT, so a parallel retry with the same key waits for the first and then
 * records nothing.
 */
@Repository
public class CustomerMoneyRepository {

    private final JdbcClient jdbc;

    public CustomerMoneyRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** A row found by its Idempotency-Key, to decide whether a replay is the same request. */
    private record Keyed(UUID id, String requestHash, UUID createdBy) {
    }

    // Repayments (R9).

    Optional<UUID> claimRepayment(UUID key, String requestHash, Repayment.New repayment, UUID createdBy) {
        return jdbc.sql("""
                        INSERT INTO repayment (customer_id, amount_kobo, note, idempotency_key, request_hash, created_by)
                        VALUES (:customerId, :amount, :note, :key, :hash, :createdBy)
                        ON CONFLICT (idempotency_key) DO NOTHING
                        RETURNING id
                        """)
                .param("customerId", repayment.customerId())
                .param("amount", repayment.amountKobo())
                .param("note", MoneyRequestHash.normalisedNote(repayment.note()))
                .param("key", key)
                .param("hash", requestHash)
                .param("createdBy", createdBy)
                .query(UUID.class)
                .optional();
    }

    /** The original repayment for a replayed key; another body or another user is 422. */
    Repayment replayRepayment(UUID key, String requestHash, UUID createdBy) {
        Keyed existing = jdbc.sql("SELECT id, request_hash, created_by FROM repayment WHERE idempotency_key = :key")
                .param("key", key)
                .query((rs, row) -> new Keyed(rs.getObject("id", UUID.class), rs.getString("request_hash"),
                        rs.getObject("created_by", UUID.class)))
                .optional()
                .orElseThrow(() -> new IllegalStateException("Idempotency-Key conflict without a repayment row: " + key));
        if (!existing.requestHash().equals(requestHash) || !existing.createdBy().equals(createdBy)) {
            throw new IdempotencyKeyReused(key);
        }
        return findRepayment(existing.id()).orElseThrow();
    }

    /** The repayment with the balance its ledger entry recorded right after it. */
    Optional<Repayment> findRepayment(UUID id) {
        return jdbc.sql("""
                        SELECT r.id, r.customer_id, r.amount_kobo, r.note, r.created_by, r.created_at,
                               le.balance_after_kobo
                        FROM repayment r
                        JOIN ledger_entry le ON le.source_type = 'REPAYMENT' AND le.source_id = r.id
                        WHERE r.id = :id
                        """)
                .param("id", id)
                .query((rs, row) -> new Repayment(
                        rs.getObject("id", UUID.class),
                        rs.getObject("customer_id", UUID.class),
                        rs.getLong("amount_kobo"),
                        rs.getLong("balance_after_kobo"),
                        rs.getString("note"),
                        rs.getObject("created_by", UUID.class),
                        rs.getObject("created_at", OffsetDateTime.class).toInstant()))
                .optional();
    }

    // Manual store-credit grants (DM74).

    Optional<UUID> claimGrant(UUID key, String requestHash, UUID customerId, StoreCreditGrant grant, UUID createdBy) {
        return jdbc.sql("""
                        INSERT INTO store_credit_grant
                            (customer_id, amount_kobo, reason, note, idempotency_key, request_hash, created_by)
                        VALUES (:customerId, :amount, :reason, :note, :key, :hash, :createdBy)
                        ON CONFLICT (idempotency_key) DO NOTHING
                        RETURNING id
                        """)
                .param("customerId", customerId)
                .param("amount", grant.amountKobo())
                .param("reason", grant.reason().name())
                .param("note", MoneyRequestHash.normalisedNote(grant.note()))
                .param("key", key)
                .param("hash", requestHash)
                .param("createdBy", createdBy)
                .query(UUID.class)
                .optional();
    }

    /** Checks a replayed grant key; another body (including another customer) or user is 422. */
    void checkGrantReplay(UUID key, String requestHash, UUID createdBy) {
        Keyed existing = jdbc.sql("SELECT id, request_hash, created_by FROM store_credit_grant WHERE idempotency_key = :key")
                .param("key", key)
                .query((rs, row) -> new Keyed(rs.getObject("id", UUID.class), rs.getString("request_hash"),
                        rs.getObject("created_by", UUID.class)))
                .optional()
                .orElseThrow(() -> new IllegalStateException("Idempotency-Key conflict without a grant row: " + key));
        if (!existing.requestHash().equals(requestHash) || !existing.createdBy().equals(createdBy)) {
            throw new IdempotencyKeyReused(key);
        }
    }

    /**
     * Adds the grant to the customer's store credit and writes its {@code STORE_CREDIT} ledger row
     * (DM5 convention: the balance owed doesn't change, so {@code balance_after_kobo} is the current
     * balance). The UPDATE holds the customer's row lock until commit. The guard keeps the total
     * within the contract's safe-integer maximum; empty means it would not.
     */
    OptionalLong addStoreCredit(UUID customerId, UUID grantId, long amountKobo) {
        Optional<Long> balance = jdbc.sql("""
                        UPDATE customer SET store_credit_kobo = store_credit_kobo + :amount
                        WHERE id = :id AND store_credit_kobo <= 9007199254740991 - :amount
                        RETURNING balance_kobo
                        """)
                .param("amount", amountKobo)
                .param("id", customerId)
                .query(Long.class)
                .optional();
        if (balance.isEmpty()) {
            return OptionalLong.empty();
        }
        jdbc.sql("""
                        INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, balance_after_kobo, created_at)
                        VALUES (:customerId, :amount, 'STORE_CREDIT', :grantId, :balanceAfter, clock_timestamp())
                        """)
                .param("customerId", customerId)
                .param("amount", amountKobo)
                .param("grantId", grantId)
                .param("balanceAfter", balance.get())
                .update();
        return OptionalLong.of(amountKobo);
    }
}
