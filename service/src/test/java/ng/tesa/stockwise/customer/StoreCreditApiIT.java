package ng.tesa.stockwise.customer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.support.ApiTestSupport;
import tools.jackson.databind.JsonNode;

/**
 * Store credit over HTTP, as the web app sends it (R12, DM5, DM73, DM74): granted by hand by the
 * owner or admin, spent at the till, and given back when that sale is reversed.
 */
class StoreCreditApiIT extends ApiTestSupport {

    private String newCustomer(String token, String name) {
        var response = post("/api/v1/customers", token, """
                {"displayName":"%s"}""".formatted(name));
        assertThat(response.status()).isEqualTo(201);
        return response.body().get("id").asString();
    }

    private Response grant(String token, String customerId, String key, String body) {
        return post("/api/v1/customers/" + customerId + "/store-credit", token, body, "Idempotency-Key", key);
    }

    private long storeCredit(String customerId) {
        return jdbc.sql("SELECT store_credit_kobo FROM customer WHERE id = :id")
                .param("id", UUID.fromString(customerId)).query(Long.class).single();
    }

    @Test
    void theOwnerGrantsStoreCreditOnceEvenWhenRetried() {
        String owner = login(OWNER);
        String bola = newCustomer(owner, "Bola Adeyemi");
        String key = UUID.randomUUID().toString();
        String body = """
                {"amountKobo":600000,"reason":"ADVANCE_DEPOSIT","note":"Cash left for next week"}""";

        var first = grant(owner, bola, key, body);
        var again = grant(owner, bola, key, body);

        assertThat(first.status()).as("grant %s", first.body()).isEqualTo(200);
        assertThat(first.body().get("storeCreditKobo").asLong()).isEqualTo(600_000);
        assertThat(first.body().get("hasStoreCreditActivity").asBoolean()).isTrue();
        assertThat(again.status()).isEqualTo(200);
        assertThat(again.body().get("storeCreditKobo").asLong()).isEqualTo(600_000);
        assertThat(storeCredit(bola)).isEqualTo(600_000);

        JsonNode entry = get("/api/v1/customers/" + bola + "/ledger", owner).body().get("items").get(0);
        assertThat(entry.get("sourceType").asString()).isEqualTo("STORE_CREDIT");
        assertThat(entry.get("deltaKobo").asLong()).isEqualTo(600_000);
        String grantId = jdbc.sql("SELECT id FROM store_credit_grant").query(UUID.class).single().toString();
        assertThat(entry.get("sourceId").asString()).isEqualTo(grantId);
    }

    @Test
    void theSameKeyWithAnotherAmountIs422() {
        String owner = login(OWNER);
        String bola = newCustomer(owner, "Bola");
        String key = UUID.randomUUID().toString();
        grant(owner, bola, key, """
                {"amountKobo":100000,"reason":"LOYALTY_REWARD"}""");

        var changed = grant(owner, bola, key, """
                {"amountKobo":900000,"reason":"LOYALTY_REWARD"}""");

        assertThat(changed.status()).isEqualTo(422);
        assertThat(changed.code()).isEqualTo("IDEMPOTENCY_KEY_REUSED");
        assertThat(storeCredit(bola)).isEqualTo(100_000);
    }

    @Test
    void adminMayGrantButAssistantMayNot() {
        String owner = login(OWNER);
        String bola = newCustomer(owner, "Bola");
        String body = """
                {"amountKobo":50000,"reason":"CHANGE_SHORTAGE"}""";

        assertThat(grant(login(ADMIN), bola, UUID.randomUUID().toString(), body).status()).isEqualTo(200);
        var assistant = grant(login(ASSISTANT), bola, UUID.randomUUID().toString(), body);
        assertThat(assistant.status()).isEqualTo(403);
        assertThat(assistant.code()).isEqualTo("FORBIDDEN");
        assertThat(storeCredit(bola)).isEqualTo(50_000);
    }

    @Test
    void badGrantsAreRefused() {
        String owner = login(OWNER);
        String bola = newCustomer(owner, "Bola");

        var zero = grant(owner, bola, UUID.randomUUID().toString(), """
                {"amountKobo":0,"reason":"LOYALTY_REWARD"}""");
        assertThat(zero.status()).isEqualTo(400);
        assertThat(zero.body().get("errors").get(0).get("field").asString()).isEqualTo("amountKobo");

        var noReason = grant(owner, bola, UUID.randomUUID().toString(), """
                {"amountKobo":1000,"reason":"BIRTHDAY"}""");
        assertThat(noReason.status()).isEqualTo(400);

        var unknown = grant(owner, UUID.randomUUID().toString(), UUID.randomUUID().toString(), """
                {"amountKobo":1000,"reason":"LOYALTY_REWARD"}""");
        assertThat(unknown.status()).isEqualTo(404);

        var noKey = post("/api/v1/customers/" + bola + "/store-credit", owner, """
                {"amountKobo":1000,"reason":"LOYALTY_REWARD"}""");
        assertThat(noKey.status()).isEqualTo(400);
        assertThat(storeCredit(bola)).isZero();
    }

    /** The whole journey: grant, spend at the till, reverse that sale, and the credit comes back. */
    @Test
    void creditSpentAtTheTillComesBackWhenTheSaleIsReversed() {
        String owner = login(OWNER);
        String assistant = login(ASSISTANT);
        UUID rice = product("RICE-5KG", 400_000, 10);
        String bola = newCustomer(owner, "Bola Adeyemi");
        grant(owner, bola, UUID.randomUUID().toString(), """
                {"amountKobo":600000,"reason":"RETURN_REFUND"}""");

        var sale = sell(assistant, """
                {"paymentType":"PAID","customerId":"%s","useStoreCredit":true,"lines":[{"productId":"%s","quantity":1}]}"""
                .formatted(bola, rice));
        assertThat(sale.status()).as("sale %s", sale.body()).isEqualTo(201);
        assertThat(sale.body().get("totalKobo").asLong()).isEqualTo(400_000);
        assertThat(sale.body().get("storeCreditAppliedKobo").asLong()).isEqualTo(400_000);
        String saleId = sale.body().get("id").asString();
        assertThat(get("/api/v1/sales/" + saleId, owner).body().get("storeCreditAppliedKobo").asLong()).isEqualTo(400_000);
        assertThat(storeCredit(bola)).isEqualTo(200_000);
        assertThat(get("/api/v1/dashboard", owner).body().get("storeCreditHeldKobo").asLong()).isEqualTo(200_000);

        var reversal = post("/api/v1/sales/" + saleId + "/reversal", owner, """
                {"reason":"CUSTOMER_RETURN"}""", "Idempotency-Key", UUID.randomUUID().toString());
        assertThat(reversal.status()).as("reversal %s", reversal.body()).isEqualTo(200);
        assertThat(storeCredit(bola)).isEqualTo(600_000);
    }

    @Test
    void storeCreditAtTheTillNeedsACustomer() {
        String owner = login(OWNER);
        UUID rice = product("RICE-5KG", 400_000, 10);

        var refused = sell(owner, """
                {"paymentType":"PAID","useStoreCredit":true,"lines":[{"productId":"%s","quantity":1}]}""".formatted(rice));

        assertThat(refused.status()).isEqualTo(400);
        assertThat(refused.code()).isEqualTo("VALIDATION_FAILED");
        assertThat(refused.body().get("errors").get(0).get("field").asString()).isEqualTo("customerId");
    }

    @Test
    void aSaleWithoutTheFieldReportsZero() {
        String owner = login(OWNER);
        UUID rice = product("RICE-5KG", 400_000, 10);

        var sale = sell(owner, """
                {"paymentType":"PAID","lines":[{"productId":"%s","quantity":1}]}""".formatted(rice));

        assertThat(sale.status()).isEqualTo(201);
        assertThat(sale.body().get("storeCreditAppliedKobo").asLong()).isZero();
        assertThat(sale.body().get("storeCreditAppliedKobo").isIntegralNumber()).isTrue();
    }
}
