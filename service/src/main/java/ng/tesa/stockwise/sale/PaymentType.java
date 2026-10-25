package ng.tesa.stockwise.sale;

/** How a sale is settled (spec R3, R8). Matches the {@code sale_payment_type_valid} CHECK. */
public enum PaymentType {
    PAID,
    CREDIT
}
