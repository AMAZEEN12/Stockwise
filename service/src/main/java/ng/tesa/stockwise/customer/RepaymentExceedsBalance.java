package ng.tesa.stockwise.customer;

/**
 * A repayment above what the customer owes at that moment (spec R9): 409
 * {@code REPAYMENT_EXCEEDS_BALANCE}, and nothing is recorded. Extends
 * {@link IllegalArgumentException} so callers written before the HTTP endpoint keep working.
 */
public class RepaymentExceedsBalance extends IllegalArgumentException {

    private final long balanceKobo;

    public RepaymentExceedsBalance(long amountKobo, long balanceKobo) {
        super("Repayment amount (" + amountKobo + " kobo) exceeds outstanding debt (" + balanceKobo + " kobo)");
        this.balanceKobo = balanceKobo;
    }

    public long balanceKobo() {
        return balanceKobo;
    }
}
