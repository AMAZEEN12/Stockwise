package ng.tesa.stockwise.dashboard;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Read-only queries behind the dashboard (spec R14). Nothing here writes and nothing is cached:
 * each figure is computed from the records on every read.
 *
 * <p>When reversals arrive (R11), {@link #todaySales} must leave reversed sales out, so that
 * reversing a sale moves today's total on the next load (R14 acceptance).
 */
@Repository
public class DashboardQueries {

    /** How many low-stock products the dashboard lists by name; {@code lowStockCount} counts all. */
    static final int LOW_STOCK_LIMIT = 10;
    static final int RECENT_SALES_LIMIT = 5;

    /** Outstanding credit across all customers. */
    public record CreditTotals(long outstandingKobo, int customersOwing, long storeCreditHeldKobo) {
    }

    private final JdbcClient jdbc;

    public DashboardQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Sales created in [start, end): one query over index {@code sale_created_at_idx}. */
    public Dashboard.TodaySales todaySales(OffsetDateTime start, OffsetDateTime end) {
        return jdbc.sql("""
                        SELECT count(*) AS sales,
                               coalesce(sum(total_kobo), 0) AS total,
                               count(*) FILTER (WHERE payment_type = 'PAID') AS paid,
                               coalesce(sum(total_kobo) FILTER (WHERE payment_type = 'PAID'), 0) AS paid_total,
                               count(*) FILTER (WHERE payment_type = 'CREDIT') AS credit,
                               coalesce(sum(total_kobo) FILTER (WHERE payment_type = 'CREDIT'), 0) AS credit_total
                        FROM sale
                        WHERE created_at >= :start AND created_at < :end
                        """)
                .param("start", start)
                .param("end", end)
                .query((rs, row) -> new Dashboard.TodaySales(
                        rs.getInt("sales"), rs.getLong("total"),
                        rs.getInt("paid"), rs.getLong("paid_total"),
                        rs.getInt("credit"), rs.getLong("credit_total")))
                .single();
    }

    public CreditTotals creditTotals() {
        return jdbc.sql("""
                        SELECT coalesce(sum(balance_kobo), 0) AS outstanding,
                               count(*) FILTER (WHERE balance_kobo > 0) AS owing,
                               coalesce(sum(store_credit_kobo), 0) AS store_credit
                        FROM customer
                        """)
                .query((rs, row) -> new CreditTotals(
                        rs.getLong("outstanding"), rs.getInt("owing"), rs.getLong("store_credit")))
                .single();
    }

    /** Uses the partial index {@code product_low_stock_idx}. */
    public int lowStockCount() {
        return jdbc.sql("SELECT count(*) FROM product WHERE active AND quantity <= low_stock_threshold")
                .query(Integer.class)
                .single();
    }

    /** The lowest first (out of stock at the top), then by name. */
    public List<Dashboard.LowStockProduct> lowStock() {
        return jdbc.sql("""
                        SELECT id, reference, name, quantity, low_stock_threshold
                        FROM product
                        WHERE active AND quantity <= low_stock_threshold
                        ORDER BY quantity, lower(name), id
                        LIMIT :limit
                        """)
                .param("limit", LOW_STOCK_LIMIT)
                .query((rs, row) -> new Dashboard.LowStockProduct(
                        rs.getObject("id", UUID.class), rs.getString("reference"), rs.getString("name"),
                        rs.getInt("quantity"), rs.getInt("low_stock_threshold")))
                .list();
    }

    public List<Dashboard.RecentSale> recentSales() {
        return jdbc.sql("""
                        SELECT id, reference, payment_type, total_kobo, created_at
                        FROM sale
                        ORDER BY created_at DESC, id DESC
                        LIMIT :limit
                        """)
                .param("limit", RECENT_SALES_LIMIT)
                .query((rs, row) -> new Dashboard.RecentSale(
                        rs.getObject("id", UUID.class), rs.getString("reference"), rs.getString("payment_type"),
                        rs.getLong("total_kobo"), rs.getObject("created_at", OffsetDateTime.class).toInstant()))
                .list();
    }
}
