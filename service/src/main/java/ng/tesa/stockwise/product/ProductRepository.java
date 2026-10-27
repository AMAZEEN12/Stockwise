package ng.tesa.stockwise.product;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import ng.tesa.stockwise.common.Page;

/**
 * SQL for the catalogue (spec R1, R2; plan Q1 and Q2). Field rules are the V2 CHECK
 * constraints; the API layer checks the contract's limits first.
 */
@Repository
public class ProductRepository {

    private static final String COLUMNS = """
            id, reference, name, category, price_kobo, quantity, low_stock_threshold, active, version,
            created_at, updated_at""";

    private final JdbcClient jdbc;

    public ProductRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * R1: adds a product and, when it opens with stock, the {@code OPENING} movement, so its
     * quantity always equals the sum of its movements (R13). A taken reference is refused by
     * {@code product_reference_uq}, never by a prior SELECT, so two owners adding the same
     * reference at once get one product and one 409.
     */
    @Transactional
    public Product create(Product.New product) {
        UUID id;
        try {
            id = jdbc.sql("""
                            INSERT INTO product (reference, name, category, price_kobo, quantity, low_stock_threshold)
                            VALUES (:reference, :name, :category, :price, :quantity, :threshold)
                            RETURNING id
                            """)
                    .param("reference", product.reference().trim())
                    .param("name", product.name().trim())
                    .param("category", product.category().trim())
                    .param("price", product.priceKobo())
                    .param("quantity", product.quantity())
                    .param("threshold", product.lowStockThreshold())
                    .query(UUID.class)
                    .single();
        } catch (DuplicateKeyException e) {
            if (e.getMessage() != null && e.getMessage().contains("product_reference_uq")) {
                throw new Product.DuplicateReference(product.reference().trim());
            }
            throw e;
        }
        if (product.quantity() > 0) {
            jdbc.sql("""
                            INSERT INTO stock_movement (product_id, delta, source_type, source_id)
                            VALUES (:id, :delta, 'OPENING', NULL)
                            """)
                    .param("id", id)
                    .param("delta", product.quantity())
                    .update();
        }
        return findById(id).orElseThrow();
    }

    public Optional<Product> findById(UUID id) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM product WHERE id = :id")
                .param("id", id)
                .query((rs, row) -> map(rs))
                .optional();
    }

    /**
     * R2: filters combine, and an omitted filter is not applied, so "All" includes archived
     * products. {@code q} matches name or reference, case-insensitively, as plain text
     * ({@code %} and {@code _} are not wildcards). Ordered by name, then ID, for stable pages.
     */
    public Page<Product> list(Product.Filter filter, Page.Request page) {
        List<String> where = new ArrayList<>();
        Map<String, Object> params = new HashMap<>();
        if (filter.q() != null && !filter.q().isBlank()) {
            where.add("(name ILIKE :q ESCAPE '\\' OR reference ILIKE :q ESCAPE '\\')");
            params.put("q", "%" + escapeLike(filter.q().trim()) + "%");
        }
        if (filter.category() != null && !filter.category().isBlank()) {
            where.add("lower(category) = lower(:category)");
            params.put("category", filter.category().trim());
        }
        if (filter.stockState() != null) {
            where.add("(" + filter.stockState().sqlCondition() + ")");
        }
        if (filter.active() != null) {
            where.add("active = :active");
            params.put("active", filter.active());
        }
        String whereClause = where.isEmpty() ? "" : " WHERE " + String.join(" AND ", where);

        long total = jdbc.sql("SELECT count(*) FROM product" + whereClause)
                .params(params)
                .query(Long.class)
                .single();
        List<Product> items = jdbc.sql("SELECT " + COLUMNS + " FROM product" + whereClause
                        + " ORDER BY lower(name), id LIMIT :limit OFFSET :offset")
                .params(params)
                .param("limit", page.size())
                .param("offset", page.offset())
                .query((rs, row) -> map(rs))
                .list();
        return new Page<>(items, page.page(), page.size(), total);
    }

    /**
     * Contract v0.2.0: returns distinct, non-empty product categories in case-insensitive alphabetical order.
     */
    public List<String> listCategories() {
        return jdbc.sql("""
                SELECT DISTINCT category
                FROM product
                WHERE category IS NOT NULL AND trim(category) <> ''
                ORDER BY lower(category), category
                """)
                .query(String.class)
                .list();
    }

    static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static Product map(ResultSet rs) throws SQLException {
        boolean active = rs.getBoolean("active");
        int quantity = rs.getInt("quantity");
        int threshold = rs.getInt("low_stock_threshold");
        return new Product(
                rs.getObject("id", UUID.class),
                rs.getString("reference"),
                rs.getString("name"),
                rs.getString("category"),
                rs.getLong("price_kobo"),
                quantity,
                threshold,
                StockState.of(active, quantity, threshold),
                active,
                rs.getInt("version"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                rs.getObject("updated_at", OffsetDateTime.class).toInstant());
    }
}
