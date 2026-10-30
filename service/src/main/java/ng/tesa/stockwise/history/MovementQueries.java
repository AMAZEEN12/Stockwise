package ng.tesa.stockwise.history;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ng.tesa.stockwise.common.Page;

/**
 * Read-only queries for a product's stock movement history (spec R13). Nothing here writes.
 *
 * <p>The running total ({@code quantity_after}) is a window sum over the product's whole history,
 * computed before LIMIT and OFFSET, so every page shows the true quantity after each movement,
 * not a total restarted at the top of the page. Uses index {@code stock_movement_product_time_idx}.
 */
@Repository
public class MovementQueries {

    private final JdbcClient jdbc;

    public MovementQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The product's current quantity, or empty if the product doesn't exist (archived products count). */
    public Optional<Integer> currentQuantity(UUID productId) {
        return jdbc.sql("SELECT quantity FROM product WHERE id = :id")
                .param("id", productId)
                .query(Integer.class)
                .optional();
    }

    public long count(UUID productId) {
        return jdbc.sql("SELECT count(*) FROM stock_movement WHERE product_id = :id")
                .param("id", productId)
                .query(Long.class)
                .single();
    }

    /** One page of movements, newest first; ties on time are broken by ID so paging is stable. */
    public List<Movement> page(UUID productId, Page.Request request) {
        return jdbc.sql("""
                        SELECT id, delta, source_type, source_id, created_at, quantity_after
                        FROM (
                            SELECT id, delta, source_type, source_id, created_at,
                                   sum(delta) OVER (ORDER BY created_at, id) AS quantity_after
                            FROM stock_movement
                            WHERE product_id = :id
                        ) history
                        ORDER BY created_at DESC, id DESC
                        LIMIT :limit OFFSET :offset
                        """)
                .param("id", productId)
                .param("limit", request.size())
                .param("offset", request.offset())
                .query((rs, row) -> new Movement(
                        rs.getObject("id", UUID.class),
                        rs.getInt("delta"),
                        rs.getString("source_type"),
                        rs.getObject("source_id", UUID.class),
                        rs.getInt("quantity_after"),
                        rs.getObject("created_at", OffsetDateTime.class).toInstant()))
                .list();
    }
}
