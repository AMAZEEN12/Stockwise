package ng.tesa.stockwise.sale;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.stream.Collectors;

/**
 * Fingerprint of a sale request, stored as {@code sale.request_hash} (R5). A replay with the
 * same key must carry the same fingerprint, otherwise it is {@code IDEMPOTENCY_KEY_REUSED}.
 * Line order doesn't change the fingerprint: the same cart in another order is the same sale.
 */
final class SaleRequestHash {

    private SaleRequestHash() {
    }

    static String of(NewSale sale) {
        String lines = sale.lines().stream()
                .sorted(Comparator.comparing(NewSale.Line::productId))
                .map(line -> line.productId() + ":" + line.quantity())
                .collect(Collectors.joining(","));
        String canonical = String.join("|", "v1", String.valueOf(sale.paymentType()),
                String.valueOf(sale.customerId()), String.valueOf(sale.dueDate()), lines);
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required by every Java platform", e);
        }
    }
}
