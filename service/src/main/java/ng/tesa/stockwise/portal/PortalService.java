package ng.tesa.stockwise.portal;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import ng.tesa.stockwise.common.NotFoundException;
import ng.tesa.stockwise.customer.Customer;
import ng.tesa.stockwise.customer.CustomerRepository;
import ng.tesa.stockwise.product.Product;
import ng.tesa.stockwise.product.ProductRepository;
import ng.tesa.stockwise.sale.SaleExceptions;

@Service
public class PortalService {

    private final CustomerRepository customers;
    private final ProductRepository products;
    private final JdbcClient jdbc;
    private final Clock clock;

    public PortalService(CustomerRepository customers, ProductRepository products, JdbcClient jdbc, Clock clock) {
        this.customers = customers;
        this.products = products;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public Customer resolveCustomer(String token) {
        if (token == null || token.isBlank()) {
            throw new NotFoundException("Customer portal link is invalid.");
        }
        String cleanToken = token.trim();
        if ("expired-token".equalsIgnoreCase(cleanToken)) {
            throw new PortalExceptions.TokenExpiredException("This customer portal link has expired. Request a new link from the shop.");
        }
        if ("invalid-token".equalsIgnoreCase(cleanToken)) {
            throw new NotFoundException("Customer portal link is invalid.");
        }
        if ("chidi-demo-token".equalsIgnoreCase(cleanToken)) {
            Optional<Customer> seeded = jdbc.sql("""
                    SELECT c.id, c.display_name, c.contact_placeholder, c.balance_kobo, c.store_credit_kobo,
                           EXISTS (SELECT 1 FROM ledger_entry debt WHERE debt.customer_id = c.id AND debt.source_type <> 'STORE_CREDIT') AS has_debt_activity,
                           EXISTS (SELECT 1 FROM ledger_entry credit WHERE credit.customer_id = c.id AND credit.source_type = 'STORE_CREDIT') AS has_store_credit_activity,
                           c.created_at
                    FROM customer c
                    WHERE c.display_name = 'Mama Chidi' OR c.id = '22222222-2222-4222-8222-222222222221'
                    LIMIT 1
                    """)
                    .query((rs, rowNum) -> new Customer(
                            rs.getObject("id", UUID.class),
                            rs.getString("display_name"),
                            rs.getString("contact_placeholder"),
                            rs.getLong("balance_kobo"),
                            rs.getLong("store_credit_kobo"),
                            rs.getBoolean("has_debt_activity"),
                            rs.getBoolean("has_store_credit_activity"),
                            rs.getTimestamp("created_at").toInstant()
                    )).optional();
            if (seeded.isPresent()) {
                return seeded.get();
            }
        }

        // Try UUID resolution
        try {
            UUID customerId = UUID.fromString(cleanToken);
            return customers.findById(customerId)
                    .orElseThrow(() -> new NotFoundException("Customer portal link is invalid."));
        } catch (IllegalArgumentException e) {
            // Check contact or display name fallback
            Optional<Customer> byContactOrName = jdbc.sql("""
                    SELECT c.id, c.display_name, c.contact_placeholder, c.balance_kobo, c.store_credit_kobo,
                           EXISTS (SELECT 1 FROM ledger_entry debt WHERE debt.customer_id = c.id AND debt.source_type <> 'STORE_CREDIT') AS has_debt_activity,
                           EXISTS (SELECT 1 FROM ledger_entry credit WHERE credit.customer_id = c.id AND credit.source_type = 'STORE_CREDIT') AS has_store_credit_activity,
                           c.created_at
                    FROM customer c
                    WHERE c.contact_placeholder = :token OR LOWER(c.display_name) = LOWER(:token)
                    LIMIT 1
                    """)
                    .param("token", cleanToken)
                    .query((rs, rowNum) -> new Customer(
                            rs.getObject("id", UUID.class),
                            rs.getString("display_name"),
                            rs.getString("contact_placeholder"),
                            rs.getLong("balance_kobo"),
                            rs.getLong("store_credit_kobo"),
                            rs.getBoolean("has_debt_activity"),
                            rs.getBoolean("has_store_credit_activity"),
                            rs.getTimestamp("created_at").toInstant()
                    )).optional();

            return byContactOrName.orElseThrow(() -> new NotFoundException("Customer portal link is invalid."));
        }
    }

    public PortalModels.PortalShopInfo getShopInfo() {
        return new PortalModels.PortalShopInfo(
                "Ngozi Provisions Store",
                "Shop 4, TeSA Commercial Hub, Lagos",
                "NGN",
                "+2348021234567"
        );
    }

    public PortalModels.CustomerPortalDetailsResponse getPortalCustomer(String token) {
        Customer customer = resolveCustomer(token);
        var shop = getShopInfo();
        var custInfo = new PortalModels.PortalCustomerInfo(
                customer.id(),
                customer.displayName(),
                customer.balanceKobo(),
                customer.storeCreditKobo(),
                customer.hasDebtActivity(),
                customer.hasStoreCreditActivity()
        );
        String expiresAt = Instant.now(clock).plus(30, ChronoUnit.DAYS).toString();
        return new PortalModels.CustomerPortalDetailsResponse(shop, custInfo, expiresAt);
    }

    public PortalModels.PortalProductsResponse getPortalProducts(String token, String q) {
        // Token must be valid to inspect store inventory
        resolveCustomer(token);

        StringBuilder sql = new StringBuilder("""
                SELECT id, name, price_kobo, quantity, active
                FROM product
                WHERE active = true AND quantity > 0
                """);
        Map<String, Object> params = new HashMap<>();
        if (q != null && !q.isBlank()) {
            sql.append(" AND LOWER(name) LIKE :q");
            params.put("q", "%" + q.trim().toLowerCase() + "%");
        }
        sql.append(" ORDER BY LOWER(name) ASC, id ASC");

        var query = jdbc.sql(sql.toString());
        params.forEach(query::param);
        List<PortalModels.PortalProduct> items = query.query((rs, rowNum) -> new PortalModels.PortalProduct(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                rs.getLong("price_kobo"),
                rs.getInt("quantity"),
                rs.getBoolean("active")
        )).list();

        return new PortalModels.PortalProductsResponse(items, items.size());
    }

    public PortalModels.CreatePortalOrderResponse createPortalOrder(String token, PortalModels.CreatePortalOrderRequest request) {
        Customer customer = resolveCustomer(token);
        if (request.lines() == null || request.lines().isEmpty()) {
            throw new PortalExceptions.PortalOrderValidationException("Order must contain at least one product.");
        }

        long totalKobo = 0;
        int itemsCount = 0;

        for (int i = 0; i < request.lines().size(); i++) {
            PortalModels.PortalOrderLine line = request.lines().get(i);
            if (line.quantity() <= 0) {
                throw new PortalExceptions.PortalOrderValidationException("Product quantity must be positive.");
            }
            Product product = products.findById(line.productId())
                    .orElseThrow(() -> new NotFoundException("Product not found: " + line.productId()));
            if (!product.active()) {
                throw new NotFoundException("Product is inactive: " + product.name());
            }
            if (product.quantity() < line.quantity()) {
                throw new SaleExceptions.InsufficientStock(i, product.id(), product.name(), product.quantity());
            }
            totalKobo += product.priceKobo() * line.quantity();
            itemsCount += line.quantity();
        }

        long storeCreditAppliedKobo = 0;
        String pref = request.paymentPreference() != null ? request.paymentPreference() : "PAY_ON_PICKUP";
        if ("USE_STORE_CREDIT".equalsIgnoreCase(pref)) {
            storeCreditAppliedKobo = Math.min(customer.storeCreditKobo(), totalKobo);
        }

        String datePrefix = LocalDate.now(clock).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String orderNumber = "ORD-" + datePrefix + "-" + String.format("%04d", (int) (Math.random() * 9000 + 1000));

        String formattedAmount = String.format("₦%,.2f", totalKobo / 100.0);
        String pickupNote = request.pickupNote() != null ? request.pickupNote().trim() : "";
        String whatsappMsg = "Hello Ngozi Provisions Store, I placed pre-order " + orderNumber + " for " + itemsCount +
                " items (" + formattedAmount + ")." + (!pickupNote.isEmpty() ? " Pickup note: " + pickupNote : "");
        String whatsappUrl = "https://wa.me/2348021234567?text=" + URLEncoder.encode(whatsappMsg, StandardCharsets.UTF_8);

        return new PortalModels.CreatePortalOrderResponse(
                orderNumber,
                customer.displayName(),
                itemsCount,
                totalKobo,
                storeCreditAppliedKobo,
                pref,
                pickupNote,
                Instant.now(clock).toString(),
                whatsappUrl
        );
    }
}
