package ng.tesa.stockwise.sale;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * A request to record a sale: the body of {@code POST /sales} (contract {@code SaleCreate}).
 * Prices are never taken from the client; they are copied from the product when recorded.
 *
 * <p>{@code useStoreCredit} asks the service to draw the named customer's store credit against
 * this sale (R12, DM5, DM73). How much is drawn is decided in the database, never by the client.
 */
public record NewSale(PaymentType paymentType, UUID customerId, LocalDate dueDate, List<Line> lines,
                      boolean useStoreCredit) {

    /** A sale that does not draw store credit, the contract's default. */
    public NewSale(PaymentType paymentType, UUID customerId, LocalDate dueDate, List<Line> lines) {
        this(paymentType, customerId, dueDate, lines, false);
    }

    public record Line(UUID productId, int quantity) {
    }
}
