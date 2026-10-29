package ng.tesa.stockwise.history;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.support.ApiTestSupport;
import tools.jackson.databind.JsonNode;

/**
 * Spec R10: a customer's ledger shows every credit sale, repayment, reversal and store-credit
 * change with the balance after each, and its final running balance equals the customer's balance.
 */
class LedgerIT extends ApiTestSupport {

    private String product(String token, String reference, long priceKobo, int quantity) {
        var response = post("/api/v1/products", token, """
                {"reference":"%s","name":"Product %s","category":"Dairy","priceKobo":%d,"quantity":%d,"lowStockThreshold":1}"""
                .formatted(reference, reference, priceKobo, quantity));
        assertThat(response.status()).as("create product %s", response.body()).isEqualTo(201);
        return response.body().get("id").asString();
    }

    private String customer(String token, String name) {
        var response = post("/api/v1/customers", token, """
                {"displayName":"%s"}""".formatted(name));
        assertThat(response.status()).as("create customer %s", response.body()).isEqualTo(201);
        return response.body().get("id").asString();
    }

    private String creditSale(String token, String customerId, String productId, int quantity) {
        var sale = sell(token, """
                {"paymentType":"CREDIT","customerId":"%s","lines":[{"productId":"%s","quantity":%d}]}"""
                .formatted(customerId, productId, quantity));
        assertThat(sale.status()).as("credit sale %s", sale.body()).isEqualTo(201);
        return sale.body().get("id").asString();
    }

    @Test
    void creditSalesAppearNewestFirstWithTheBalanceAfterEach() {
        String owner = login(OWNER);
        String assistant = login(ASSISTANT);
        String milk = product(owner, "MILK-400", 100_000, 20);
        String ada = customer(assistant, "Ada Okafor");
        String first = creditSale(assistant, ada, milk, 3);
        String second = creditSale(assistant, ada, milk, 1);

        var response = get("/api/v1/customers/" + ada + "/ledger", assistant);

        assertThat(response.status()).isEqualTo(200);
        JsonNode body = response.body();
        assertThat(body.get("customerId").asString()).isEqualTo(ada);
        assertThat(body.get("balanceKobo").asLong()).isEqualTo(400_000);
        assertThat(body.get("totalItems").asLong()).isEqualTo(2);
        JsonNode items = body.get("items");

        assertThat(items.get(0).get("sourceType").asString()).isEqualTo("CREDIT_SALE");
        assertThat(items.get(0).get("sourceId").asString()).isEqualTo(second);
        assertThat(items.get(0).get("deltaKobo").asLong()).isEqualTo(100_000);
        assertThat(items.get(0).get("balanceAfterKobo").asLong()).isEqualTo(400_000);

        assertThat(items.get(1).get("sourceId").asString()).isEqualTo(first);
        assertThat(items.get(1).get("deltaKobo").asLong()).isEqualTo(300_000);
        assertThat(items.get(1).get("balanceAfterKobo").asLong()).isEqualTo(300_000);
        assertThat(items.get(1).get("deltaKobo").isIntegralNumber()).isTrue();
    }

    @Test
    void paidSalesAreNotInTheLedger() {
        String owner = login(OWNER);
        String milk = product(owner, "MILK-400", 50_000, 5);
        String bola = customer(owner, "Bola");
        var paid = sell(owner, """
                {"paymentType":"PAID","customerId":"%s","lines":[{"productId":"%s","quantity":1}]}"""
                .formatted(bola, milk));
        assertThat(paid.status()).isEqualTo(201);

        JsonNode body = get("/api/v1/customers/" + bola + "/ledger", owner).body();

        assertThat(body.get("items").size()).isZero();
        assertThat(body.get("balanceKobo").asLong()).isZero();
    }

    /** Spec R10 acceptance: the newest running balance equals the balance and the sum of debt entries. */
    @Test
    void theLedgerReconcilesWithTheCustomerBalance() {
        String owner = login(OWNER);
        String rice = product(owner, "RICE-5KG", 250_000, 10);
        String chidi = customer(owner, "Chidi");
        creditSale(owner, chidi, rice, 2);
        creditSale(owner, chidi, rice, 1);

        JsonNode body = get("/api/v1/customers/" + chidi + "/ledger?size=100", owner).body();

        long debt = 0;
        for (JsonNode entry : body.get("items")) {
            if (!"STORE_CREDIT".equals(entry.get("sourceType").asString())) {
                debt += entry.get("deltaKobo").asLong();
            }
        }
        assertThat(debt).isEqualTo(body.get("balanceKobo").asLong()).isEqualTo(750_000);
        assertThat(body.get("items").get(0).get("balanceAfterKobo").asLong()).isEqualTo(750_000);
    }

    /**
     * DM5 convention: a STORE_CREDIT row changes store credit, not the balance. Store credit after
     * each entry is a running sum over the whole history, so it stays right on later pages; this
     * fails if it is computed per page.
     */
    @Test
    void storeCreditIsTrackedSeparatelyAndStaysRightOnLaterPages() {
        String owner = login(OWNER);
        String rice = product(owner, "RICE-5KG", 100_000, 10);
        String dayo = customer(owner, "Dayo");
        creditSale(owner, dayo, rice, 1);
        UUID dayoId = UUID.fromString(dayo);
        jdbc.sql("""
                        INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, balance_after_kobo, created_at)
                        VALUES (:customer, 60000, 'STORE_CREDIT', NULL, 100000, now() + interval '1 second')
                        """)
                .param("customer", dayoId).update();
        jdbc.sql("UPDATE customer SET store_credit_kobo = 60000 WHERE id = :customer").param("customer", dayoId).update();
        jdbc.sql("""
                        INSERT INTO ledger_entry (customer_id, delta_kobo, source_type, source_id, balance_after_kobo, created_at)
                        VALUES (:customer, -20000, 'STORE_CREDIT', NULL, 100000, now() + interval '2 seconds')
                        """)
                .param("customer", dayoId).update();
        jdbc.sql("UPDATE customer SET store_credit_kobo = 40000 WHERE id = :customer").param("customer", dayoId).update();

        JsonNode all = get("/api/v1/customers/" + dayo + "/ledger", owner).body();
        assertThat(all.get("storeCreditKobo").asLong()).isEqualTo(40_000);
        assertThat(all.get("balanceKobo").asLong()).isEqualTo(100_000);
        assertThat(all.get("items").get(0).get("storeCreditAfterKobo").asLong()).isEqualTo(40_000);
        assertThat(all.get("items").get(0).get("balanceAfterKobo").asLong()).isEqualTo(100_000);

        JsonNode secondPage = get("/api/v1/customers/" + dayo + "/ledger?page=1&size=1", owner).body();
        assertThat(secondPage.get("items").get(0).get("deltaKobo").asLong()).isEqualTo(60_000);
        assertThat(secondPage.get("items").get(0).get("storeCreditAfterKobo").asLong()).isEqualTo(60_000);
    }

    @Test
    void everyRoleCanReadUnknownIs404AndAnonymousIs401() {
        String owner = login(OWNER);
        String ngozi = customer(owner, "Ngozi");

        assertThat(get("/api/v1/customers/" + ngozi + "/ledger", login(ADMIN)).status()).isEqualTo(200);

        var unknown = get("/api/v1/customers/" + UUID.randomUUID() + "/ledger", owner);
        assertThat(unknown.status()).isEqualTo(404);
        assertThat(unknown.code()).isEqualTo("NOT_FOUND");

        var anonymous = get("/api/v1/customers/" + ngozi + "/ledger", null);
        assertThat(anonymous.status()).isEqualTo(401);
        assertThat(anonymous.code()).isEqualTo("UNAUTHENTICATED");
    }
}
