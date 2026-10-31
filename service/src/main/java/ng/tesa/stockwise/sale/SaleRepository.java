package ng.tesa.stockwise.sale;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ng.tesa.stockwise.common.Page;


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

    /** What one sold line returns: the product name and the copied price (R3), for the response. */
    public record SoldLine(String productName, long unitPriceKobo, long lineTotalKobo) {
    }

    /**
     * Steps 3.2 and 3.3 in ONE statement: the guarded stock update, the sale line with its copied
     * price, and the matching stock movement. Empty means the guard refused (R4): nothing was
     * written, because the line and the movement are inserted from the rows the update returned.
     * Same rule as {@link #takeStock} plus {@link #insertLine}, with two fewer round trips.
     */
    public Optional<SoldLine> sellLine(UUID saleId, UUID productId, int quantity) {
        return jdbc.sql("""
                        WITH taken AS (
                            UPDATE product
                            SET quantity = quantity - CAST(:quantity AS integer), version = version + 1, updated_at = now()
                            WHERE id = :productId AND active AND quantity >= CAST(:quantity AS integer)
                            RETURNING id, name, price_kobo),
                        line AS (
                            INSERT INTO sale_line (sale_id, product_id, quantity, unit_price_kobo, line_total_kobo)
                            SELECT :saleId, id, CAST(:quantity AS integer), price_kobo, price_kobo * CAST(:quantity AS integer)
                            FROM taken
                            RETURNING 1),
                        move AS (
                            INSERT INTO stock_movement (product_id, delta, source_type, source_id)
                            SELECT id, -CAST(:quantity AS integer), 'SALE', :saleId
                            FROM taken
                            RETURNING 1)
                        SELECT name, price_kobo, price_kobo * CAST(:quantity AS integer) AS line_total_kobo
                        FROM taken
                        """)
                .param("saleId", saleId)
                .param("productId", productId)
                .param("quantity", quantity)
                .query((rs, row) -> new SoldLine(rs.getString("name"), rs.getLong("price_kobo"), rs.getLong("line_total_kobo")))
                .optional();
    }

    /** Lines in the order the database sorts uuid values (unsigned bytes), as {@link #findSale} returns them. */
    private static final Comparator<Sale.Line> LINE_ORDER = Comparator
            .comparingLong((Sale.Line l) -> l.productId().getMostSignificantBits() ^ Long.MIN_VALUE)
            .thenComparingLong(l -> l.productId().getLeastSignificantBits() ^ Long.MIN_VALUE);

    /**
     * Writes the total and returns the finished sale from the same statement, so the response needs
     * no re-read. The lines are the ones this transaction just wrote.
     */
    public Sale finishSale(UUID saleId, long totalKobo, List<Sale.Line> lines) {
        List<Sale.Line> ordered = lines.stream().sorted(LINE_ORDER).toList();
        return jdbc.sql("""
                        UPDATE sale SET total_kobo = :total WHERE id = :id
                        RETURNING id, reference, payment_type, customer_id, due_date, total_kobo, created_by, created_at, reversed_at
                        """)
                .param("total", totalKobo)
                .param("id", saleId)
                .query((rs, row) -> mapSale(rs, ordered))
                .single();
    }

    public void setTotal(UUID saleId, long totalKobo) {
        jdbc.sql("""
                UPDATE sale
                SET total_kobo = :total,
                    unpaid_kobo = CASE WHEN payment_type = 'CREDIT' THEN :total ELSE 0 END
                WHERE id = :id
                """)
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
                        SELECT id, reference, payment_type, customer_id, due_date, total_kobo, created_by, created_at,
                               reversed_at, reversed_by, reversal_reason, reversal_notes, unpaid_kobo
                        FROM sale WHERE id = :id
                        """)
                .param("id", saleId)
                .query((rs, row) -> mapSale(rs, lines))
                .optional();
    }

    /** Contract query parameters of {@code GET /sales}; a null filter is not applied. Dates are Lagos days (DM14). */
    public record Filter(LocalDate from, LocalDate to, PaymentType paymentType, UUID customerId) {
    }

    /**
     * {@code GET /sales}: newest first. {@code from} and {@code to} are inclusive Africa/Lagos
     * calendar days, so "today" in Lagos is right even when the server runs in UTC. Lines are
     * fetched for the whole page in one query.
     */
    public Page<Sale> list(Filter filter, Page.Request page) {
        List<String> where = new ArrayList<>();
        Map<String, Object> params = new HashMap<>();
        if (filter.from() != null) {
            where.add("created_at >= (CAST(:from AS date)::timestamp AT TIME ZONE 'Africa/Lagos')");
            params.put("from", filter.from());
        }
        if (filter.to() != null) {
            where.add("created_at < ((CAST(:to AS date) + 1)::timestamp AT TIME ZONE 'Africa/Lagos')");
            params.put("to", filter.to());
        }
        if (filter.paymentType() != null) {
            where.add("payment_type = :paymentType");
            params.put("paymentType", filter.paymentType().name());
        }
        if (filter.customerId() != null) {
            where.add("customer_id = :customerId");
            params.put("customerId", filter.customerId());
        }
        String whereClause = where.isEmpty() ? "" : " WHERE " + String.join(" AND ", where);

        long total = jdbc.sql("SELECT count(*) FROM sale" + whereClause).params(params).query(Long.class).single();
        Map<UUID, List<Sale.Line>> lines = new LinkedHashMap<>();
        List<Sale> headers = jdbc.sql("""
                        SELECT id, reference, payment_type, customer_id, due_date, total_kobo, created_by, created_at,
                               reversed_at, reversed_by, reversal_reason, reversal_notes, unpaid_kobo
                        FROM sale""" + whereClause + " ORDER BY created_at DESC, id LIMIT :limit OFFSET :offset")
                .params(params)
                .param("limit", page.size())
                .param("offset", page.offset())
                .query((rs, row) -> {
                    List<Sale.Line> saleLines = new ArrayList<>();
                    lines.put(rs.getObject("id", UUID.class), saleLines);
                    return mapSale(rs, saleLines);
                })
                .list();
        if (!lines.isEmpty()) {
            jdbc.sql("""
                            SELECT l.sale_id, l.product_id, p.name, l.quantity, l.unit_price_kobo, l.line_total_kobo
                            FROM sale_line l JOIN product p ON p.id = l.product_id
                            WHERE l.sale_id IN (:ids)
                            ORDER BY l.sale_id, l.product_id
                            """)
                    .param("ids", List.copyOf(lines.keySet()))
                    .query(rs -> {
                        lines.get(rs.getObject("sale_id", UUID.class)).add(new Sale.Line(rs.getObject("product_id", UUID.class),
                                rs.getString("name"), rs.getInt("quantity"), rs.getLong("unit_price_kobo"),
                                rs.getLong("line_total_kobo")));
                    });
        }
        return new Page<>(headers, page.page(), page.size(), total);
    }

    private static Sale mapSale(ResultSet rs, List<Sale.Line> lines) throws SQLException {
        OffsetDateTime revAt = rs.getObject("reversed_at", OffsetDateTime.class);
        return new Sale(
                rs.getObject("id", UUID.class),
                rs.getString("reference"),
                PaymentType.valueOf(rs.getString("payment_type")),
                rs.getObject("customer_id", UUID.class),
                rs.getObject("due_date", LocalDate.class),
                rs.getLong("total_kobo"),
                lines,
                rs.getObject("created_by", UUID.class),
                rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                revAt != null ? revAt.toInstant() : null,
                rs.getObject("reversed_by", UUID.class),
                rs.getString("reversal_reason"),
                rs.getString("reversal_notes"),
                rs.getLong("unpaid_kobo"));
    }
}
