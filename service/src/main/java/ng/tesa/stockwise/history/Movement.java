package ng.tesa.stockwise.history;

import java.time.Instant;
import java.util.UUID;

/**
 * One change to a product's stock (contract {@code Movement}, spec R13). {@code quantityAfter} is
 * the running total right after this movement. {@code sourceId} is null for opening stock.
 */
public record Movement(UUID id, int delta, String sourceType, UUID sourceId, int quantityAfter, Instant createdAt) {
}
