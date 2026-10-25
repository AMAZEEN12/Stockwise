package ng.tesa.stockwise.sale;

/**
 * The result of {@link SaleService#record}. Both cases answer 201 with the same body (R5);
 * {@code replayed} is true when the Idempotency-Key had already recorded this sale.
 */
public record RecordedSale(Sale sale, boolean replayed) {
}
