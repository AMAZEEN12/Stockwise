package ng.tesa.stockwise.customer;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Fingerprint of a customer-create request, stored as {@code customer.request_hash} (contract
 * v0.2.0). It hashes the body as stored: the trimmed name, and the trimmed contact with blank
 * meaning none. So " Ada " and "Ada" are the same request, and "Ada" with contact "" equals "Ada"
 * with no contact.
 */
final class CustomerRequestHash {

    private CustomerRequestHash() {
    }

    static String of(Customer.New customer) {
        String canonical = String.join("|", "v1", CustomerRepository.normalisedName(customer),
                String.valueOf(CustomerRepository.normalisedContact(customer)));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required by every Java platform", e);
        }
    }
}
