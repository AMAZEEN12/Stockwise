package ng.tesa.stockwise.reversal;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ng.tesa.stockwise.auth.CurrentUser;
import ng.tesa.stockwise.auth.Role;
import ng.tesa.stockwise.common.IdempotencyKeyReused;
import ng.tesa.stockwise.common.NotFoundException;
import ng.tesa.stockwise.reversal.ReversalExceptions.AuthorizationAlreadyUsedException;
import ng.tesa.stockwise.reversal.ReversalExceptions.AuthorizationSaleMismatchException;
import ng.tesa.stockwise.reversal.ReversalExceptions.InvalidAuthorizationCodeException;
import ng.tesa.stockwise.reversal.ReversalExceptions.ReversalManualReviewException;
import ng.tesa.stockwise.reversal.ReversalExceptions.SaleAlreadyReversedException;
import ng.tesa.stockwise.sale.PaymentType;

/**
 * Transactional coordinator for real sale reversals (spec R11, R12, R14, R15, R16).
 * Atomically restores product stock, relieves unpaid debt, converts repaid debt to store credit (DM5),
 * restores tender credit, and records append-only movements and ledger entries.
 */
@Service
public class SaleReversalService {

    private final JdbcClient jdbc;
    private final ReversalAuthorizationRepository authRepo;
    private final Clock clock;

    public SaleReversalService(JdbcClient jdbc, ReversalAuthorizationRepository authRepo, Clock clock) {
        this.jdbc = jdbc;
        this.authRepo = authRepo;
        this.clock = clock;
    }

    @Transactional
    public SaleReversalResponse reverse(UUID saleId, UUID idempotencyKey, SaleReversalRequest request, CurrentUser user) {
        if (idempotencyKey == null) {
            throw new IllegalArgumentException("Idempotency-Key is required");
        }
        if (request == null || request.reason() == null) {
            throw new IllegalArgumentException("Reversal request with reason is required");
        }

        String requestHash = SaleReversalRequestHash.of(saleId, request);

        // 1. Check idempotency replay
        var existingReversal = jdbc.sql("""
                SELECT id, reversal_request_hash
                FROM sale
                WHERE reversal_idempotency_key = :key
                """)
                .param("key", idempotencyKey)
                .query((rs, row) -> new KeyedReversal(rs.getObject("id", UUID.class), rs.getString("reversal_request_hash")))
                .optional();

        if (existingReversal.isPresent()) {
            KeyedReversal rev = existingReversal.get();
            if (!rev.id().equals(saleId) || !rev.requestHash().equals(requestHash)) {
                throw new IdempotencyKeyReused(idempotencyKey);
            }
            return buildReversalResponse(saleId);
        }

        OffsetDateTime now = clock.instant().atOffset(ZoneOffset.UTC);

        // 2. Lock and load sale
        var saleOpt = jdbc.sql("""
                SELECT id, payment_type, customer_id, total_kobo, unpaid_kobo, store_credit_used_kobo,
                       reversed_at, reversal_idempotency_key, reversal_request_hash
                FROM sale
                WHERE id = :id
                FOR UPDATE
                """)
                .param("id", saleId)
                .query((rs, row) -> new LockedSale(
                        rs.getObject("id", UUID.class),
                        PaymentType.valueOf(rs.getString("payment_type")),
                        rs.getObject("customer_id", UUID.class),
                        rs.getLong("total_kobo"),
                        rs.getLong("unpaid_kobo"),
                        rs.getLong("store_credit_used_kobo"),
                        rs.getObject("reversed_at", OffsetDateTime.class) != null
                                ? rs.getObject("reversed_at", OffsetDateTime.class).toInstant() : null,
                        rs.getObject("reversal_idempotency_key", UUID.class),
                        rs.getString("reversal_request_hash")
                ))
                .optional();

        if (saleOpt.isEmpty()) {
            throw new NotFoundException("Sale not found: " + saleId);
        }

        LockedSale sale = saleOpt.get();
        if (sale.reversedAt() != null) {
            throw new SaleAlreadyReversedException(saleId);
        }

        // 3. Supervisor OTP authorization check (spec R14, DM10)
        if (user.role() == Role.ASSISTANT) {
            if (request.authorizationCode() == null || request.authorizationCode().isBlank()) {
                throw new InvalidAuthorizationCodeException();
            }
            var result = authRepo.validateAndRedeem(request.authorizationCode().trim(), saleId, user.id());
            switch (result) {
                case NOT_FOUND_OR_EXPIRED -> throw new InvalidAuthorizationCodeException();
                case ALREADY_USED -> throw new AuthorizationAlreadyUsedException();
                case SALE_MISMATCH -> throw new AuthorizationSaleMismatchException();
                case SUCCESS -> {}
            }
        } else {
            if (request.authorizationCode() != null && !request.authorizationCode().isBlank()) {
                authRepo.validateAndRedeem(request.authorizationCode().trim(), saleId, user.id());
            }
        }

        // 4. Restore product stock and append SALE_REVERSAL movement (spec R11)
        List<SaleReversalResponse.StockRestoredLine> restoredLines = new ArrayList<>();
        List<SaleLineRow> lines = jdbc.sql("""
                SELECT product_id, quantity
                FROM sale_line
                WHERE sale_id = :saleId
                ORDER BY product_id
                """)
                .param("saleId", saleId)
                .query((rs, row) -> new SaleLineRow(rs.getObject("product_id", UUID.class), rs.getInt("quantity")))
                .list();

        for (SaleLineRow line : lines) {
            jdbc.sql("""
                    UPDATE product
                    SET quantity = quantity + :qty, version = version + 1, updated_at = :now
                    WHERE id = :productId
                    """)
                    .param("qty", line.quantity())
                    .param("now", now)
                    .param("productId", line.productId())
                    .update();

            jdbc.sql("""
                    INSERT INTO stock_movement (product_id, delta, source_type, source_id, created_at)
                    VALUES (:productId, :delta, 'SALE_REVERSAL', :saleId, :now)
                    """)
                    .param("productId", line.productId())
                    .param("delta", line.quantity())
                    .param("saleId", saleId)
                    .param("now", now)
                    .update();

            restoredLines.add(new SaleReversalResponse.StockRestoredLine(line.productId(), line.quantity()));
        }

        // 5. Debt relief and Store Credit calculation (spec R12, DM5; Victor's PR #40 policy directions)
        long debtRelievedKobo = 0L;
        long storeCreditAddedKobo = 0L;
        long storeCreditRestoredKobo = sale.storeCreditUsedKobo();

        if (sale.paymentType() == PaymentType.CREDIT) {
            debtRelievedKobo = sale.unpaidKobo();
            long repaidKobo = sale.totalKobo() - debtRelievedKobo - sale.storeCreditUsedKobo();

            // Policy direction 1: Block for manual review if existing balances cannot be reliably allocated
            if (repaidKobo > 0) {
                long allocatedKobo = jdbc.sql("""
                        SELECT COALESCE(SUM(amount_kobo), 0)
                        FROM repayment_allocation
                        WHERE sale_id = :saleId
                        """)
                        .param("saleId", saleId)
                        .query(Long.class)
                        .single();

                if (allocatedKobo != repaidKobo) {
                    throw new ReversalManualReviewException(
                            "Sale has " + repaidKobo + " kobo repaid but only " + allocatedKobo
                            + " kobo recorded in allocation history. Manual review required.");
                }
            }

            storeCreditAddedKobo = repaidKobo;

            // Lock customer row
            CustomerBalance cust = jdbc.sql("""
                    SELECT balance_kobo, store_credit_kobo
                    FROM customer
                    WHERE id = :id
                    FOR UPDATE
                    """)
                    .param("id", sale.customerId())
                    .query((rs, row) -> new CustomerBalance(rs.getLong("balance_kobo"), rs.getLong("store_credit_kobo")))
                    .single();

            long newDebt = cust.balanceKobo() - debtRelievedKobo;
            if (newDebt < 0) {
                throw new IllegalStateException("Reversal would result in negative customer debt: " + newDebt);
            }

            // Update customer debt if any was outstanding on this sale
            if (debtRelievedKobo > 0) {
                jdbc.sql("""
                        UPDATE customer
                        SET balance_kobo = :newDebt
                        WHERE id = :id
                        """)
                        .param("newDebt", newDebt)
                        .param("id", sale.customerId())
                        .update();

                jdbc.sql("""
                        INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, balance_after_kobo, created_at)
                        VALUES (:customerId, :delta, 'REVERSAL', :saleId, :balanceAfter, :createdAt)
                        """)
                        .param("customerId", sale.customerId())
                        .param("delta", -debtRelievedKobo)
                        .param("saleId", saleId)
                        .param("balanceAfter", newDebt)
                        .param("createdAt", now)
                        .update();
            }

            // Policy direction 3: Credited repaid amount + returned original store credit spent
            long totalStoreCreditGain = storeCreditAddedKobo + storeCreditRestoredKobo;
            if (totalStoreCreditGain > 0) {
                jdbc.sql("""
                        UPDATE customer
                        SET store_credit_kobo = store_credit_kobo + :creditGain
                        WHERE id = :id
                        """)
                        .param("creditGain", totalStoreCreditGain)
                        .param("id", sale.customerId())
                        .update();

                jdbc.sql("""
                        INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, balance_after_kobo, created_at)
                        VALUES (:customerId, :delta, 'STORE_CREDIT', :saleId, :balanceAfter, :createdAt)
                        """)
                        .param("customerId", sale.customerId())
                        .param("delta", totalStoreCreditGain)
                        .param("saleId", saleId)
                        .param("balanceAfter", newDebt)
                        .param("createdAt", now)
                        .update();
            }
        } else {
            // PAID sale: return any store credit originally tendered
            if (storeCreditRestoredKobo > 0 && sale.customerId() != null) {
                CustomerBalance cust = jdbc.sql("""
                        SELECT balance_kobo, store_credit_kobo
                        FROM customer
                        WHERE id = :id
                        FOR UPDATE
                        """)
                        .param("id", sale.customerId())
                        .query((rs, row) -> new CustomerBalance(rs.getLong("balance_kobo"), rs.getLong("store_credit_kobo")))
                        .single();

                jdbc.sql("""
                        UPDATE customer
                        SET store_credit_kobo = store_credit_kobo + :creditGain
                        WHERE id = :id
                        """)
                        .param("creditGain", storeCreditRestoredKobo)
                        .param("id", sale.customerId())
                        .update();

                jdbc.sql("""
                        INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, balance_after_kobo, created_at)
                        VALUES (:customerId, :delta, 'STORE_CREDIT', :saleId, :balanceAfter, :createdAt)
                        """)
                        .param("customerId", sale.customerId())
                        .param("delta", storeCreditRestoredKobo)
                        .param("saleId", saleId)
                        .param("balanceAfter", cust.balanceKobo())
                        .param("createdAt", now)
                        .update();
            }
        }

        // 6. Update sale record with reversal metadata and zero out unpaid_kobo
        jdbc.sql("""
                UPDATE sale
                SET reversed_at = :now,
                    reversed_by = :userId,
                    reversal_reason = :reason,
                    reversal_notes = :notes,
                    reversal_idempotency_key = :idempotencyKey,
                    reversal_request_hash = :requestHash,
                    unpaid_kobo = 0
                WHERE id = :id
                """)
                .param("now", now)
                .param("userId", user.id())
                .param("reason", request.reason().name())
                .param("notes", request.note())
                .param("idempotencyKey", idempotencyKey)
                .param("requestHash", requestHash)
                .param("id", saleId)
                .update();

        UUID reversalId = UUID.nameUUIDFromBytes(("reversal:" + saleId).getBytes(StandardCharsets.UTF_8));
        return new SaleReversalResponse(
                reversalId,
                saleId,
                now.toInstant(),
                user.id(),
                request.reason(),
                request.note(),
                true,
                debtRelievedKobo,
                storeCreditAddedKobo,
                storeCreditRestoredKobo,
                restoredLines
        );
    }

    private SaleReversalResponse buildReversalResponse(UUID saleId) {
        var saleRow = jdbc.sql("""
                SELECT id, payment_type, customer_id, total_kobo, store_credit_used_kobo,
                       reversed_at, reversed_by, reversal_reason, reversal_notes
                FROM sale
                WHERE id = :id
                """)
                .param("id", saleId)
                .query((rs, row) -> new ReversalDetails(
                        rs.getObject("id", UUID.class),
                        PaymentType.valueOf(rs.getString("payment_type")),
                        rs.getObject("customer_id", UUID.class),
                        rs.getLong("total_kobo"),
                        rs.getLong("store_credit_used_kobo"),
                        rs.getObject("reversed_at", OffsetDateTime.class).toInstant(),
                        rs.getObject("reversed_by", UUID.class),
                        ReversalReason.valueOf(rs.getString("reversal_reason")),
                        rs.getString("reversal_notes")
                ))
                .single();

        List<SaleReversalResponse.StockRestoredLine> restoredLines = jdbc.sql("""
                SELECT product_id, quantity
                FROM sale_line
                WHERE sale_id = :saleId
                ORDER BY product_id
                """)
                .param("saleId", saleId)
                .query((rs, row) -> new SaleReversalResponse.StockRestoredLine(
                        rs.getObject("product_id", UUID.class),
                        rs.getInt("quantity")
                ))
                .list();

        long debtRemovedKobo = 0L;
        long storeCreditAddedKobo = 0L;
        long storeCreditRestoredKobo = saleRow.storeCreditUsedKobo();

        if (saleRow.paymentType() == PaymentType.CREDIT) {
            debtRemovedKobo = jdbc.sql("""
                    SELECT COALESCE(ABS(SUM(delta_kobo)), 0)
                    FROM ledger_entry
                    WHERE source_id = :saleId AND source_type = 'REVERSAL'
                    """)
                    .param("saleId", saleId)
                    .query(Long.class)
                    .single();

            storeCreditAddedKobo = Math.max(0, saleRow.totalKobo() - debtRemovedKobo - saleRow.storeCreditUsedKobo());
        }

        UUID reversalId = UUID.nameUUIDFromBytes(("reversal:" + saleId).getBytes(StandardCharsets.UTF_8));
        return new SaleReversalResponse(
                reversalId,
                saleId,
                saleRow.reversedAt(),
                saleRow.reversedBy(),
                saleRow.reason(),
                saleRow.notes(),
                true,
                debtRemovedKobo,
                storeCreditAddedKobo,
                storeCreditRestoredKobo,
                restoredLines
        );
    }

    private record KeyedReversal(UUID id, String requestHash) {}
    private record LockedSale(
            UUID id,
            PaymentType paymentType,
            UUID customerId,
            long totalKobo,
            long unpaidKobo,
            long storeCreditUsedKobo,
            Instant reversedAt,
            UUID reversalIdempotencyKey,
            String reversalRequestHash
    ) {}
    private record SaleLineRow(UUID productId, int quantity) {}
    private record CustomerBalance(long balanceKobo, long storeCreditKobo) {}
    private record ReversalDetails(
            UUID id,
            PaymentType paymentType,
            UUID customerId,
            long totalKobo,
            long storeCreditUsedKobo,
            Instant reversedAt,
            UUID reversedBy,
            ReversalReason reason,
            String notes
    ) {}
}
