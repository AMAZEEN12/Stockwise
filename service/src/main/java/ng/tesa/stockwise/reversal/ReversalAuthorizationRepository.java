package ng.tesa.stockwise.reversal;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ng.tesa.stockwise.auth.Role;

@Repository
public class ReversalAuthorizationRepository {

    private final JdbcClient jdbc;
    private final Clock clock;

    public ReversalAuthorizationRepository(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public ReversalAuthorization create(String code, UUID saleId, int validMinutes, UUID createdBy, Role role) {
        Instant now = clock.instant();
        Instant expiresAt = now.plusSeconds(validMinutes * 60L);

        jdbc.sql("""
                INSERT INTO reversal_authorization (code, sale_id, created_by, created_at, expires_at)
                VALUES (:code, :saleId, :createdBy, :createdAt, :expiresAt)
                """)
                .param("code", code)
                .param("saleId", saleId)
                .param("createdBy", createdBy)
                .param("createdAt", now.atOffset(ZoneOffset.UTC))
                .param("expiresAt", expiresAt.atOffset(ZoneOffset.UTC))
                .update();

        return new ReversalAuthorization(code, saleId, expiresAt, createdBy, role);
    }

    public enum RedemptionResult {
        SUCCESS,
        NOT_FOUND_OR_EXPIRED,
        ALREADY_USED,
        SALE_MISMATCH
    }

    public RedemptionResult validateAndRedeem(String code, UUID saleId, UUID usedBy) {
        Instant now = clock.instant();
        var list = jdbc.sql("SELECT id, sale_id, expires_at, used_at FROM reversal_authorization WHERE code = :code")
                .param("code", code)
                .query((rs, row) -> new CodeState(
                        rs.getObject("id", UUID.class),
                        rs.getObject("sale_id", UUID.class),
                        rs.getObject("expires_at", OffsetDateTime.class).toInstant(),
                        rs.getObject("used_at", OffsetDateTime.class) != null
                                ? rs.getObject("used_at", OffsetDateTime.class).toInstant() : null
                ))
                .list();

        if (list.isEmpty()) {
            return RedemptionResult.NOT_FOUND_OR_EXPIRED;
        }

        CodeState state = list.getFirst();
        if (state.usedAt != null) {
            return RedemptionResult.ALREADY_USED;
        }
        if (now.isAfter(state.expiresAt)) {
            return RedemptionResult.NOT_FOUND_OR_EXPIRED;
        }
        if (state.saleId != null && !state.saleId.equals(saleId)) {
            return RedemptionResult.SALE_MISMATCH;
        }

        int updated = jdbc.sql("""
                UPDATE reversal_authorization
                SET used_at = :now, used_by = :usedBy
                WHERE id = :id AND used_at IS NULL
                """)
                .param("now", now.atOffset(ZoneOffset.UTC))
                .param("usedBy", usedBy)
                .param("id", state.id)
                .update();

        return updated > 0 ? RedemptionResult.SUCCESS : RedemptionResult.ALREADY_USED;
    }

    private record CodeState(UUID id, UUID saleId, Instant expiresAt, Instant usedAt) {
    }
}
