package ng.tesa.stockwise.sale;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * A request to record a sale: the body of {@code POST /sales} (contract {@code SaleCreate}).
 * Prices are never taken from the client; they are copied from the product when recorded.
 */
public record NewSale(PaymentType paymentType, UUID customerId, LocalDate dueDate, List<Line> lines) {

    public record Line(UUID productId, int quantity) {
    }
}
