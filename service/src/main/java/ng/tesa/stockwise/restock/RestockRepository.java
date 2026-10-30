package ng.tesa.stockwise.restock;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ng.tesa.stockwise.common.IdempotencyKeyReused;
import ng.tesa.stockwise.common.NotFoundException;
import ng.tesa.stockwise.common.Page;
import ng.tesa.stockwise.restock.RestockExceptions.StockLimitExceeded;

/** Hand-written SQL for the atomic, retry-safe restock transaction. */
@Repository
public class RestockRepository {

    private static final String COLUMNS = "id, product_id, quantity, received_on, note, created_by, created_at";

    private final JdbcClient jdbc;

    public RestockRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    Optional<UUID> claim(UUID key, String requestHash, Restock.New restock, UUID createdBy) {
        return jdbc.sql("""
                        INSERT INTO restock
                            (product_id, quantity, received_on, note, idempotency_key, request_hash, created_by)
                        SELECT id, :quantity, :receivedOn, :note, :key, :hash, :createdBy
                        FROM product WHERE id = :productId
                        ON CONFLICT (idempotency_key) DO NOTHING
                        RETURNING id
                        """)
                .param("productId", restock.productId())
                .param("quantity", restock.quantity())
                .param("receivedOn", restock.receivedOn())
                .param("note", normalisedNote(restock.note()))
                .param("key", key)
                .param("hash", requestHash)
                .param("createdBy", createdBy)
                .query(UUID.class)
                .optional();
    }

    Restock replay(UUID key, String requestHash, UUID createdBy) {
        var found = jdbc.sql("SELECT id, request_hash, created_by FROM restock WHERE idempotency_key = :key")
                .param("key", key)
                .query((rs, row) -> new KeyedRestock(rs.getObject("id", UUID.class),
                        rs.getString("request_hash"), rs.getObject("created_by", UUID.class)))
                .optional();
        if (found.isEmpty()) {
            throw new NotFoundException("Product");
        }
        var existing = found.get();
        if (!requestHash.equals(existing.hash()) || !createdBy.equals(existing.createdBy())) {
            throw new IdempotencyKeyReused(key);
        }
        return findById(existing.id()).orElseThrow();
    }

    private record KeyedRestock(UUID id, String hash, UUID createdBy) { }

    void addStock(UUID productId, int quantity) {
        Optional<Integer> updated = jdbc.sql("""
                        UPDATE product
                        SET quantity = quantity + :quantity,
                            version = version + 1,
                            updated_at = now()
                        WHERE id = :productId
                          AND quantity <= 2147483647 - :quantity
                        RETURNING quantity
                        """)
                .param("productId", productId)
                .param("quantity", quantity)
                .query(Integer.class)
                .optional();
        if (updated.isPresent()) {
            return;
        }
        boolean exists = jdbc.sql("SELECT EXISTS (SELECT 1 FROM product WHERE id = :productId)")
                .param("productId", productId)
                .query(Boolean.class)
                .single();
        if (!exists) {
            throw new NotFoundException("Product " + productId);
        }
        throw new StockLimitExceeded(productId);
    }

    void insertMovement(UUID restockId, UUID productId, int quantity) {
        jdbc.sql("""
                        INSERT INTO stock_movement (product_id, delta, source_type, source_id)
                        VALUES (:productId, :quantity, 'RESTOCK', :restockId)
                        """)
                .param("productId", productId)
                .param("quantity", quantity)
                .param("restockId", restockId)
                .update();
    }

    public Optional<Restock> findById(UUID id) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM restock WHERE id = :id")
                .param("id", id)
                .query((rs, row) -> map(rs))
                .optional();
    }

    public Page<Restock> list(UUID productId, Page.Request page) {
        String where = productId == null ? "" : " WHERE product_id = :productId";
        Map<String, Object> params = new HashMap<>();
        if (productId != null) {
            params.put("productId", productId);
        }
        long total = jdbc.sql("SELECT count(*) FROM restock" + where)
                .params(params)
                .query(Long.class)
                .single();
        var items = jdbc.sql("SELECT " + COLUMNS + " FROM restock" + where
                        + " ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset")
                .params(params)
                .param("limit", page.size())
                .param("offset", page.offset())
                .query((rs, row) -> map(rs))
                .list();
        return new Page<>(items, page.page(), page.size(), total);
    }

    static String normalisedNote(String note) {
        if (note == null || note.isBlank()) {
            return null;
        }
        return note.trim();
    }

    private static Restock map(ResultSet rs) throws SQLException {
        return new Restock(
                rs.getObject("id", UUID.class),
                rs.getObject("product_id", UUID.class),
                rs.getInt("quantity"),
                rs.getObject("received_on", java.time.LocalDate.class),
                rs.getString("note"),
                rs.getObject("created_by", UUID.class),
                rs.getObject("created_at", OffsetDateTime.class).toInstant());
    }
}
