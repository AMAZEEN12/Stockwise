package ng.tesa.stockwise.sale;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.ArrayList;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ng.tesa.stockwise.sale.SaleExceptions.FieldError;
import ng.tesa.stockwise.sale.SaleExceptions.IdempotencyKeyReused;
import ng.tesa.stockwise.sale.SaleExceptions.InsufficientStock;
import ng.tesa.stockwise.sale.SaleExceptions.InvalidSale;
import ng.tesa.stockwise.sale.SaleExceptions.ReferenceNotFound;

/**
 * Records a sale in one transaction (spec R3, R4, R5, R8; "Data flow: recording a sale").
 * Role checks (OWNER or ASSISTANT) happen before this, in the API layer.
 *
 * <p>Order inside the transaction: claim the Idempotency-Key, take stock line by line in
 * product-ID order (so two multi-line sales can't deadlock), write lines and movements, set the
 * total, then charge credit. Any refusal throws and rolls everything back.
 *
 * <p>Store credit (R12) is not drawn yet: it only exists after reversals, which come after
 * Monday (plan step 16, {@code StoreCreditIT}).
 */
@Service
public class SaleService {

    static final int MAX_LINES = 50;
    static final int MAX_QUANTITY = 10_000;

    private final SaleRepository sales;

    public SaleService(SaleRepository sales) {
        this.sales = sales;
    }

    @Transactional
    public RecordedSale record(UUID idempotencyKey, NewSale request, UUID createdBy) {
        validate(idempotencyKey, request);
        String requestHash = SaleRequestHash.of(request);

        if (request.customerId() != null && !sales.customerExists(request.customerId())) {
            throw new ReferenceNotFound("customerId", request.customerId());
        }

        var claimed = sales.insertSale(idempotencyKey, requestHash, request.paymentType(),
                request.customerId(), request.dueDate(), createdBy);
        if (claimed.isEmpty()) {
            return replay(idempotencyKey, requestHash);
        }
        UUID saleId = claimed.get();

        List<Integer> lockOrder = IntStream.range(0, request.lines().size()).boxed()
                .sorted(Comparator.comparing(i -> request.lines().get(i).productId()))
                .toList();
        long total = 0;
        List<Sale.Line> soldLines = new ArrayList<>(request.lines().size());
        for (int index : lockOrder) {
            NewSale.Line line = request.lines().get(index);
            // One statement per line: guarded stock update + line + stock movement (R4 unchanged).
            var sold = sales.sellLine(saleId, line.productId(), line.quantity());
            if (sold.isEmpty()) {
                throw refusal(index, line);
            }
            SaleRepository.SoldLine done = sold.get();
            total = Math.addExact(total, done.lineTotalKobo());
            soldLines.add(new Sale.Line(line.productId(), done.productName(), line.quantity(),
                    done.unitPriceKobo(), done.lineTotalKobo()));
        }
        // Writes the total and returns the finished sale in one statement (no re-read).
        Sale sale = sales.finishSale(saleId, total, soldLines);

        // A zero total has no ledger entry: ledger deltas are never zero (ledger_entry_delta_non_zero).
        if (request.paymentType() == PaymentType.CREDIT && total > 0) {
            sales.chargeCredit(request.customerId(), saleId, total);
        }
        return new RecordedSale(sale, false);
    }

    /** R5: the key already recorded a sale. Same body: return it. Different body: refuse. */
    private RecordedSale replay(UUID idempotencyKey, String requestHash) {
        var existing = sales.findByIdempotencyKey(idempotencyKey).orElseThrow(
                () -> new IllegalStateException("Idempotency-Key conflict without a sale row: " + idempotencyKey));
        if (!existing.requestHash().equals(requestHash)) {
            throw new IdempotencyKeyReused(idempotencyKey);
        }
        return new RecordedSale(sales.findSale(existing.id()).orElseThrow(), true);
    }

    /** Explains a line the guarded update refused. Read after the refusal, for the message only. */
    private RuntimeException refusal(int index, NewSale.Line line) {
        return sales.findStock(line.productId())
                .filter(SaleRepository.ProductStock::active)
                .<RuntimeException>map(stock -> new InsufficientStock(index, line.productId(), stock.name(), stock.quantity()))
                .orElseGet(() -> new ReferenceNotFound("lines[" + index + "].productId", line.productId()));
    }

    /** Shape rules the contract states; the API layer checks them too, the service doesn't rely on it. */
    private static void validate(UUID idempotencyKey, NewSale request) {
        List<FieldError> errors = new ArrayList<>();
        if (idempotencyKey == null) {
            errors.add(new FieldError("Idempotency-Key", "is required"));
        }
        if (request.paymentType() == null) {
            errors.add(new FieldError("paymentType", "is required"));
        }
        if (request.paymentType() == PaymentType.CREDIT && request.customerId() == null) {
            errors.add(new FieldError("customerId", "is required for a CREDIT sale"));
        }
        if (request.dueDate() != null && request.paymentType() != PaymentType.CREDIT) {
            errors.add(new FieldError("dueDate", "is only allowed on a CREDIT sale"));
        }
        List<NewSale.Line> lines = request.lines();
        if (lines == null || lines.isEmpty() || lines.size() > MAX_LINES) {
            errors.add(new FieldError("lines", "must have between 1 and " + MAX_LINES + " lines"));
        } else {
            Set<UUID> seen = new HashSet<>();
            for (int i = 0; i < lines.size(); i++) {
                NewSale.Line line = lines.get(i);
                if (line == null || line.productId() == null) {
                    errors.add(new FieldError("lines[" + i + "].productId", "is required"));
                    continue;
                }
                if (!seen.add(line.productId())) {
                    errors.add(new FieldError("lines[" + i + "].productId", "appears in more than one line"));
                }
                if (line.quantity() < 1 || line.quantity() > MAX_QUANTITY) {
                    errors.add(new FieldError("lines[" + i + "].quantity", "must be a whole number from 1 to " + MAX_QUANTITY));
                }
            }
        }
        if (!errors.isEmpty()) {
            throw new InvalidSale(errors);
        }
    }
}
