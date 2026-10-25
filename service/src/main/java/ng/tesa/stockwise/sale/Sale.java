package ng.tesa.stockwise.sale;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** A recorded sale (contract {@code Sale}). Money is integer kobo. */
public record Sale(
        UUID id,
        String reference,
        PaymentType paymentType,
        UUID customerId,
        LocalDate dueDate,
        long totalKobo,
        List<Line> lines,
        UUID createdBy,
        Instant createdAt) {

    /** One line with the unit price copied at the time of sale (contract {@code SaleLine}). */
    public record Line(UUID productId, String productName, int quantity, long unitPriceKobo, long lineTotalKobo) {
    }
}
