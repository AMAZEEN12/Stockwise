package ng.tesa.stockwise.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.support.ApiTestSupport;
import tools.jackson.databind.JsonNode;

/**
 * Spec R14: the dashboard's figures equal what the records say, are computed when read, are
 * labelled as demonstration data, and "today" is the Africa/Lagos day (DM14).
 */
class DashboardIT extends ApiTestSupport {

    private static final ZoneId LAGOS = ZoneId.of("Africa/Lagos");

    private String product(String token, String reference, long priceKobo, int quantity, int threshold) {
        var response = post("/api/v1/products", token, """
                {"reference":"%s","name":"Product %s","category":"Dairy","priceKobo":%d,"quantity":%d,"lowStockThreshold":%d}"""
                .formatted(reference, reference, priceKobo, quantity, threshold));
        assertThat(response.status()).as("create product %s", response.body()).isEqualTo(201);
        return response.body().get("id").asString();
    }

    private String customer(String token, String name) {
        var response = post("/api/v1/customers", token, """
                {"displayName":"%s"}""".formatted(name));
        assertThat(response.status()).isEqualTo(201);
        return response.body().get("id").asString();
    }

    @Test
    void todaysSalesCreditAndLowStockMatchTheRecords() {
        String owner = login(OWNER);
        String milk = product(owner, "MILK-400", 100_000, 10, 2);
        String salt = product(owner, "SALT-500", 20_000, 3, 5);
        product(owner, "OIL-1L", 300_000, 50, 5);
        String ada = customer(owner, "Ada");

        assertThat(sell(owner, """
                {"paymentType":"PAID","lines":[{"productId":"%s","quantity":2}]}""".formatted(milk)).status()).isEqualTo(201);
        assertThat(sell(owner, """
                {"paymentType":"CREDIT","customerId":"%s","lines":[{"productId":"%s","quantity":1}]}"""
                .formatted(ada, salt)).status()).isEqualTo(201);

        var response = get("/api/v1/dashboard", owner);

        assertThat(response.status()).isEqualTo(200);
        JsonNode body = response.body();
        assertThat(body.get("isDemonstrationData").asBoolean()).isTrue();
        assertThat(Instant.parse(body.get("computedAt").asString())).isBeforeOrEqualTo(Instant.now());
        assertThat(LocalDate.parse(body.get("today").asString())).isEqualTo(LocalDate.now(LAGOS));

        JsonNode today = body.get("todaySales");
        assertThat(today.get("count").asInt()).isEqualTo(2);
        assertThat(today.get("totalKobo").asLong()).isEqualTo(220_000);
        assertThat(today.get("paidCount").asInt()).isEqualTo(1);
        assertThat(today.get("paidKobo").asLong()).isEqualTo(200_000);
        assertThat(today.get("creditCount").asInt()).isEqualTo(1);
        assertThat(today.get("creditKobo").asLong()).isEqualTo(20_000);

        assertThat(body.get("outstandingCreditKobo").asLong()).isEqualTo(20_000);
        assertThat(body.get("customersOwing").asInt()).isEqualTo(1);
        assertThat(body.get("storeCreditHeldKobo").asLong()).isZero();

        assertThat(body.get("lowStockCount").asInt()).isEqualTo(1);
        assertThat(body.get("lowStock").get(0).get("id").asString()).isEqualTo(salt);
        assertThat(body.get("lowStock").get(0).get("quantity").asInt()).isEqualTo(2);

        assertThat(body.get("recentSales").size()).isEqualTo(2);
        assertThat(body.get("recentSales").get(0).get("paymentType").asString()).isEqualTo("CREDIT");
    }

    /** DM14: a sale at 00:30 WAT is today; one at 23:30 WAT the evening before is not. */
    @Test
    void todayIsTheLagosCalendarDay() {
        String owner = login(OWNER);
        OffsetDateTime lagosMidnight = LocalDate.now(LAGOS).atStartOfDay(LAGOS).toOffsetDateTime();
        insertSale(30_000, lagosMidnight.plusMinutes(30));
        insertSale(70_000, lagosMidnight.minusMinutes(30));

        JsonNode today = get("/api/v1/dashboard", owner).body().get("todaySales");

        assertThat(today.get("count").asInt()).isEqualTo(1);
        assertThat(today.get("totalKobo").asLong()).isEqualTo(30_000);
    }

    @Test
    void archivedProductsAreNotListedAsLowStock() {
        String owner = login(OWNER);
        String gone = product(owner, "OLD-1", 10_000, 0, 5);
        jdbc.sql("UPDATE product SET active = false WHERE id = :id").param("id", UUID.fromString(gone)).update();

        JsonNode body = get("/api/v1/dashboard", owner).body();

        assertThat(body.get("lowStockCount").asInt()).isZero();
        assertThat(body.get("lowStock").size()).isZero();
    }

    @Test
    void anEmptyShopGivesZerosNotErrors() {
        JsonNode body = get("/api/v1/dashboard", login(ADMIN)).body();

        assertThat(body.get("todaySales").get("count").asInt()).isZero();
        assertThat(body.get("todaySales").get("totalKobo").asLong()).isZero();
        assertThat(body.get("outstandingCreditKobo").asLong()).isZero();
        assertThat(body.get("lowStock").size()).isZero();
        assertThat(body.get("recentSales").size()).isZero();
    }

    @Test
    void anonymousIs401() {
        var anonymous = get("/api/v1/dashboard", null);
        assertThat(anonymous.status()).isEqualTo(401);
        assertThat(anonymous.code()).isEqualTo("UNAUTHENTICATED");
    }

    /** A paid sale with no lines, written directly so its time can be set either side of midnight. */
    private void insertSale(long totalKobo, OffsetDateTime createdAt) {
        jdbc.sql("""
                        INSERT INTO sale (idempotency_key, request_hash, payment_type, total_kobo, created_by, created_at)
                        VALUES (:key, 'test', 'PAID', :total, :by, :at)
                        """)
                .param("key", UUID.randomUUID())
                .param("total", totalKobo)
                .param("by", cashier)
                .param("at", createdAt.withOffsetSameInstant(ZoneOffset.UTC))
                .update();
    }
}
