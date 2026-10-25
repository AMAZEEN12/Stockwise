package ng.tesa.stockwise.sale;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * SQL for the sale transaction (spec "Data flow: recording a sale"). Every rule-bearing
 * statement is a single conditional write, so the database decides, never a read-then-write
 * in Java (brief; plan "Alternatives considered").
 */
@Repository
public class SaleRepository {

    private final JdbcClient jdbc;

    public SaleRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** A sale row found by its Idempotency-Key. */
    public record KeyedSale(UUID id, String requestHash) {
    }

    /** What a product holds now, read only to explain a refused line. */
    public record ProductStock(String name, int quantity, boolean active) {
    }

    /**
     * Step 3.1: claims the Idempotency-Key. Empty when the key already has a sale; a parallel
     * attempt with the same key waits here until the first transaction ends (R5).
     * The total is set by {@link #setTotal} once the lines are priced.
     */
    public Optional<UUID> insertSale(UUID idempotencyKey, String requestHash, PaymentType paymentType,
                                     UUID customerId, LocalDate dueDate, UUID createdBy) {
        return jdbc.sql("""
                        INSERT INTO sale (idempotency_key, request_hash, payment_type, customer_id, due_date,
                                          total_kobo, created_by)
                        VALUES (:key, :hash, :paymentType, CAST(:customerId AS uuid), CAST(:dueDate AS date),
                                0, :createdBy)
                        ON CONFLICT (idempotency_key) DO NOTHING
                        RETURNING id
                        """)
                .param("key", idempotencyKey)
                .param("hash", requestHash)
                .param("paymentType", paymentType.name())
                .param("customerId", customerId)
                .param("dueDate", dueDate)
                .param("createdBy", createdBy)
                .query(UUID.class)
                .optional();
    }

    public Optional<KeyedSale> findByIdempotencyKey(UUID idempotencyKey) {
        return jdbc.sql("SELECT id, request_hash FROM sale WHERE idempotency_key = :key")
                .param("key", idempotencyKey)
                .query((rs, row) -> new KeyedSale(rs.getObject("id", UUID.class), rs.getString("request_hash")))
                .optional();
    }

    /**
     * Step 3.2, the key rule (R4): takes {@code quantity} units only if that many remain, and
     * returns the price to copy onto the line. Empty means nothing was taken. The
     * {@code product_quantity_non_negative} CHECK is the backstop.
     */
    public OptionalLong takeStock(UUID productId, int quantity) {
        return jdbc.sql("""
                        UPDATE product
                        SET quantity = quantity - :quantity, version = version + 1, updated_at = now()
                        WHERE id = :id AND active AND quantity >= :quantity
                        RETURNING price_kobo
                        """)
                .param("id", productId)
                .param("quantity", quantity)
                .query(Long.class)
                .optional()
                .map(OptionalLong::of)
                .orElse(OptionalLong.empty());
    }

    public Optional<ProductStock> findStock(UUID productId) {
        return jdbc.sql("SELECT name, quantity, active FROM product WHERE id = :id")
                .param("id", productId)
                .query((rs, row) -> new ProductStock(rs.getString("name"), rs.getInt("quantity"), rs.getBoolean("active")))
                .optional();
    }

    /** Step 3.3: the line with its copied price, and the matching stock movement. */
    public void insertLine(UUID saleId, UUID productId, int quantity, long unitPriceKobo, long lineTotalKobo) {
        jdbc.sql("""
                        INSERT INTO sale_line (sale_id, product_id, quantity, unit_price_kobo, line_total_kobo)
                        VALUES (:saleId, :productId, :quantity, :unitPrice, :lineTotal)
                        """)
                .param("saleId", saleId)
                .param("productId", productId)
                .param("quantity", quantity)
                .param("unitPrice", unitPriceKobo)
                .param("lineTotal", lineTotalKobo)
                .update();
        jdbc.sql("""
                        INSERT INTO stock_movement (product_id, delta, source_type, source_id)
                        VALUES (:productId, :delta, 'SALE', :saleId)
                        """)
                .param("productId", productId)
                .param("delta", -quantity)
                .param("saleId", saleId)
                .update();
    }

    public void setTotal(UUID saleId, long totalKobo) {
        jdbc.sql("UPDATE sale SET total_kobo = :total WHERE id = :id")
                .param("total", totalKobo)
                .param("id", saleId)
                .update();
    }

    public boolean customerExists(UUID customerId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM customer WHERE id = :id)")
                .param("id", customerId)
                .query(Boolean.class)
                .single();
    }

    /**
     * Step 3.4 (R8): raises the customer's balance by the credit sale's total and writes the
     * ledger entry with the resulting balance. The UPDATE holds the customer's row lock until
     * commit, so {@code balance_after_kobo} is exact even under parallel sales.
     */
    public void chargeCredit(UUID customerId, UUID saleId, long totalKobo) {
        long balanceAfter = jdbc.sql("""
                        UPDATE customer SET balance_kobo = balance_kobo + :total
                        WHERE id = :id
                        RETURNING balance_kobo
                        """)
                .param("total", totalKobo)
                .param("id", customerId)
                .query(Long.class)
                .single();
        jdbc.sql("""
                        INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, balance_after_kobo)
                        VALUES (:customerId, :delta, 'CREDIT_SALE', :saleId, :balanceAfter)
                        """)
                .param("customerId", customerId)
                .param("delta", totalKobo)
                .param("saleId", saleId)
                .param("balanceAfter", balanceAfter)
                .update();
    }

    public Optional<Sale> findSale(UUID saleId) {
        List<Sale.Line> lines = jdbc.sql("""
                        SELECT l.product_id, p.name, l.quantity, l.unit_price_kobo, l.line_total_kobo
                        FROM sale_line l JOIN product p ON p.id = l.product_id
                        WHERE l.sale_id = :id
                        ORDER BY l.product_id
                        """)
                .param("id", saleId)
                .query((rs, row) -> new Sale.Line(rs.getObject("product_id", UUID.class), rs.getString("name"),
                        rs.getInt("quantity"), rs.getLong("unit_price_kobo"), rs.getLong("line_total_kobo")))
                .list();
        return jdbc.sql("""
                        SELECT id, reference, payment_type, customer_id, due_date, total_kobo, created_by, created_at
                        FROM sale WHERE id = :id
                        """)
                .param("id", saleId)
                .query((rs, row) -> mapSale(rs, lines))
                .optional();
    }

    private static Sale mapSale(ResultSet rs, List<Sale.Line> lines) throws SQLException {
        return new Sale(
                rs.getObject("id", UUID.class),
                rs.getString("reference"),
                PaymentType.valueOf(rs.getString("payment_type")),
                rs.getObject("customer_id", UUID.class),
                rs.getObject("due_date", LocalDate.class),
                rs.getLong("total_kobo"),
                lines,
                rs.getObject("created_by", UUID.class),
                rs.getObject("created_at", OffsetDateTime.class).toInstant());
    }
}
