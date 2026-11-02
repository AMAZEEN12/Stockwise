package ng.tesa.stockwise.customer;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import ng.tesa.stockwise.common.NotFoundException;

/**
 * Repayments (R9) and manual store-credit grants (DM74), each in one transaction. Role checks
 * happen before this, in SecurityConfig. Any refusal rolls everything back, the claimed key
 * included, so a corrected retry with the same key can still succeed.
 */
@Service
public class CustomerMoneyService {

    private final CustomerRepository customers;
    private final CustomerMoneyRepository money;

    public CustomerMoneyService(CustomerRepository customers, CustomerMoneyRepository money) {
        this.customers = customers;
        this.money = money;
    }

    /**
     * Claims the key, then lowers the balance and allocates the money to the oldest unpaid credit
     * sales under the customer's row lock ({@link CustomerRepository#recordRepayment}). Above the
     * balance owed is 409 {@code REPAYMENT_EXCEEDS_BALANCE}, so two parallel repayments that
     * together exceed it can't both succeed.
     */
    @Transactional
    public RecordedRepayment repay(UUID idempotencyKey, Repayment.New request, UUID createdBy) {
        if (customers.findById(request.customerId()).isEmpty()) {
            throw new NotFoundException("Customer " + request.customerId());
        }
        String hash = MoneyRequestHash.of(request);
        var claimed = money.claimRepayment(idempotencyKey, hash, request, createdBy);
        if (claimed.isEmpty()) {
            return new RecordedRepayment(money.replayRepayment(idempotencyKey, hash, createdBy), true);
        }
        UUID repaymentId = claimed.get();
        customers.recordRepayment(request.customerId(), request.amountKobo(), createdBy, repaymentId);
        return new RecordedRepayment(money.findRepayment(repaymentId).orElseThrow(), false);
    }

    /** Adds store credit by hand and returns the customer with their new figures. */
    @Transactional
    public Customer grantStoreCredit(UUID customerId, UUID idempotencyKey, StoreCreditGrant grant, UUID createdBy) {
        if (customers.findById(customerId).isEmpty()) {
            throw new NotFoundException("Customer " + customerId);
        }
        String hash = MoneyRequestHash.of(customerId, grant);
        var claimed = money.claimGrant(idempotencyKey, hash, customerId, grant, createdBy);
        if (claimed.isEmpty()) {
            money.checkGrantReplay(idempotencyKey, hash, createdBy);
            return customers.findById(customerId).orElseThrow();
        }
        if (money.addStoreCredit(customerId, claimed.get(), grant.amountKobo()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This would take the customer's store credit above the largest amount Stockwise can hold.");
        }
        return customers.findById(customerId).orElseThrow();
    }

    /** {@code replayed} is true when the key had already recorded this repayment. */
    public record RecordedRepayment(Repayment repayment, boolean replayed) {
    }
}
