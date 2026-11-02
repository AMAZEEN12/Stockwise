package ng.tesa.stockwise.customer;

/**
 * Contract {@code StoreCreditGrantCreate} (DM74): store credit added by hand, for example a cash
 * deposit or a refund that is not a recorded sale. The reason is required so every grant can be
 * explained later.
 */
public record StoreCreditGrant(long amountKobo, Reason reason, String note) {

    /** Contract {@code StoreCreditReason}; the same list as {@code store_credit_grant_reason_valid}. */
    public enum Reason {
        RETURN_REFUND,
        ADVANCE_DEPOSIT,
        CHANGE_SHORTAGE,
        LOYALTY_REWARD,
        MANUAL_ADJUSTMENT
    }
}
