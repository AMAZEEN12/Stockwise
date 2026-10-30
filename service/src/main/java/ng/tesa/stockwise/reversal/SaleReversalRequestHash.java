package ng.tesa.stockwise.reversal;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

/** Stable SHA-256 fingerprint used to compare idempotent sale reversal replays. */
final class SaleReversalRequestHash {

    private SaleReversalRequestHash() {
    }

    static String of(UUID saleId, SaleReversalRequest request) {
        String note = request.note() == null || request.note().isBlank() ? null : request.note().trim();
        String code = request.authorizationCode() == null || request.authorizationCode().isBlank()
                ? null : request.authorizationCode().trim();
        String canonical = String.join("|",
                "v1",
                saleId.toString(),
                request.reason().name(),
                note == null ? "0" : "1" + note,
                code == null ? "0" : "1" + code);
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required by every Java platform", e);
        }
    }
}
