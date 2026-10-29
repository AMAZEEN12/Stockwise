package ng.tesa.stockwise.history;

import java.util.List;
import java.util.UUID;

/** A page of one product's movements, newest first (contract {@code MovementPage}). */
public record MovementPage(UUID productId, int currentQuantity, List<Movement> items, int page, int size,
                           long totalItems) {
}
