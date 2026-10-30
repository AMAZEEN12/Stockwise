package ng.tesa.stockwise.restock;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Stable SHA-256 fingerprint used to compare idempotent restock replays. */
final class RestockRequestHash {

    private RestockRequestHash() {
    }

    static String of(Restock.New restock) {
        String note = RestockRepository.normalisedNote(restock.note());
        String canonical = String.join("|", "v1", restock.productId().toString(),
                Integer.toString(restock.quantity()), restock.receivedOn().toString(),
                note == null ? "0" : "1" + note);
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required by every Java platform", e);
        }
    }
}
