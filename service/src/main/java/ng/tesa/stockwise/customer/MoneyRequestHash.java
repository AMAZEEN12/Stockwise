package ng.tesa.stockwise.customer;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * SHA-256 fingerprint of a keyed repayment or store-credit request. A replay with the same
 * Idempotency-Key must carry the same fingerprint and come from the same user, otherwise it is
 * 422 {@code IDEMPOTENCY_KEY_REUSED} and nothing is written.
 */
final class MoneyRequestHash {

    private MoneyRequestHash() {
    }

    static String of(Repayment.New repayment) {
        return sha256(String.join("|", "repayment-v1", repayment.customerId().toString(),
                Long.toString(repayment.amountKobo()), noteKey(repayment.note())));
    }

    static String of(java.util.UUID customerId, StoreCreditGrant grant) {
        return sha256(String.join("|", "store-credit-v1", customerId.toString(),
                Long.toString(grant.amountKobo()), grant.reason().name(), noteKey(grant.note())));
    }

    /** Blank and missing notes are the same note. */
    static String normalisedNote(String note) {
        return note == null || note.isBlank() ? null : note.trim();
    }

    private static String noteKey(String note) {
        String normalised = normalisedNote(note);
        return normalised == null ? "0" : "1" + normalised;
    }

    private static String sha256(String canonical) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required by every Java platform", e);
        }
    }
}
