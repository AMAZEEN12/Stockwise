package ng.tesa.stockwise.restock;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** A recorded stock receipt and the request used to create it. */
public record Restock(
        UUID id,
        UUID productId,
        int quantity,
        LocalDate receivedOn,
        String note,
        UUID createdBy,
        Instant createdAt) {

    public record New(UUID productId, int quantity, LocalDate receivedOn, String note) {
    }
}
