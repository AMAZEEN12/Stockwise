package ng.tesa.stockwise.restock;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** R5/R6: records a restock and its stock movement exactly once in one transaction. */
@Service
public class RestockService {

    private final RestockRepository restocks;

    public RestockService(RestockRepository restocks) {
        this.restocks = restocks;
    }

    @Transactional
    public Restock record(UUID idempotencyKey, Restock.New request, UUID createdBy) {
        String hash = RestockRequestHash.of(request);
        var claimed = restocks.claim(idempotencyKey, hash, request, createdBy);
        if (claimed.isEmpty()) {
            return restocks.replay(idempotencyKey, hash, createdBy);
        }
        UUID restockId = claimed.get();
        restocks.addStock(request.productId(), request.quantity());
        restocks.insertMovement(restockId, request.productId(), request.quantity());
        return restocks.findById(restockId).orElseThrow();
    }
}
