package ng.tesa.stockwise.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.support.ApiTestSupport;
import tools.jackson.databind.JsonNode;

/**
 * The Monday journey (intent S7) over HTTP, as the web app makes it: log in, add a product, add
 * a customer, sell for cash and on credit, retry safely, and be refused clearly. Every response
 * shape follows contract v0.1.0.
 */
class MondayJourneyIT extends ApiTestSupport {

    String product(String token, String reference, long priceKobo, int quantity) {
        var response = post("/api/v1/products", token, """
                {"reference":"%s","name":"Product %s","category":"Dairy","priceKobo":%d,"quantity":%d,"lowStockThreshold":3}"""
                .formatted(reference, reference, priceKobo, quantity));
        assertThat(response.status()).as("create product %s", response.body()).isEqualTo(201);
        return response.body().get("id").asString();
    }

    @Test
    void healthAndRootArePublic() {
        var health = get("/api/v1/health", null);
        assertThat(health.status()).isEqualTo(200);
        assertThat(health.body().get("status").asString()).isEqualTo("UP");
        assertThat(health.body().get("service").asString()).isEqualTo("stockwise");
        assertThat(health.body().get("version").asString()).isNotBlank().doesNotContain("@");
        assertThat(get("/", null).status()).isEqualTo(200);
    }

    @Test
    void ownerAddsListsAndReadsProducts() {
        String owner = login(OWNER);
        var created = post("/api/v1/products", owner, """
                {"reference":"MILK-400","name":"Peak Milk 400g","category":"Dairy","priceKobo":420000,"quantity":10,"lowStockThreshold":3}""");

        assertThat(created.status()).isEqualTo(201);
        String id = created.body().get("id").asString();
        assertThat(created.header("Location")).isEqualTo("/api/v1/products/" + id);
        assertThat(created.body().get("priceKobo").isIntegralNumber()).isTrue();
        assertThat(created.body().get("priceKobo").asLong()).isEqualTo(420_000);
        assertThat(created.body().get("stockState").asString()).isEqualTo("IN_STOCK");

        var one = get("/api/v1/products/" + id, login(ASSISTANT));
        assertThat(one.status()).isEqualTo(200);
        assertThat(one.header("ETag")).isEqualTo("\"0\"");

        var page = get("/api/v1/products?q=peak&category=dairy&stockState=IN_STOCK&page=0&size=5", owner);
        assertThat(page.status()).isEqualTo(200);
        assertThat(page.body().get("totalItems").asLong()).isEqualTo(1);
        assertThat(page.body().get("size").asInt()).isEqualTo(5);
        assertThat(page.body().get("items").get(0).get("id").asString()).isEqualTo(id);
    }

    @Test
    void duplicateReferenceIs409() {
        String owner = login(OWNER);
        product(owner, "MILK-400", 420_000, 1);
        var again = post("/api/v1/products", owner, """
                {"reference":"MILK-400","name":"Other","category":"Dairy","priceKobo":1,"quantity":1,"lowStockThreshold":0}""");
        assertThat(again.status()).isEqualTo(409);
        assertThat(again.code()).isEqualTo("DUPLICATE_REFERENCE");
    }

    @Test
    void unknownOrMalformedIdsAreClear() {
        String token = login(OWNER);
        assertThat(get("/api/v1/products/" + UUID.randomUUID(), token).code()).isEqualTo("NOT_FOUND");
        assertThat(get("/api/v1/sales/" + UUID.randomUUID(), token).status()).isEqualTo(404);
        var malformed = get("/api/v1/products/not-a-uuid", token);
        assertThat(malformed.status()).isEqualTo(400);
        assertThat(malformed.code()).isEqualTo("VALIDATION_FAILED");
        var noSuchPath = get("/api/v1/nothing-here", token);
        assertThat(noSuchPath.status()).isEqualTo(404);
        assertThat(noSuchPath.code()).isEqualTo("NOT_FOUND");
    }

    /** R3, R8: a paid sale and a credit sale, with the customer's balance rising by the total. */
    @Test
    void assistantSellsForCashAndOnCredit() {
        String milk = product(login(OWNER), "MILK-400", 420_000, 10);
        String till = login(ASSISTANT);

        var customer = post("/api/v1/customers", till, "{\"displayName\":\"Ada Okafor\",\"contactPlaceholder\":\"Shop 14\"}");
        assertThat(customer.status()).isEqualTo(201);
        String ada = customer.body().get("id").asString();
        assertThat(customer.body().get("balanceKobo").asLong()).isZero();
        assertThat(customer.body().get("hasDebtActivity").asBoolean()).isFalse();
        assertThat(customer.body().get("hasStoreCreditActivity").asBoolean()).isFalse();

        var paid = sell(till, "{\"paymentType\":\"PAID\",\"lines\":[{\"productId\":\"" + milk + "\",\"quantity\":2}]}");
        assertThat(paid.status()).isEqualTo(201);
        assertThat(paid.header("Location")).isEqualTo("/api/v1/sales/" + paid.body().get("id").asString());
        assertThat(paid.body().get("totalKobo").asLong()).isEqualTo(840_000);
        assertThat(paid.body().get("reference").asString()).matches("S-\\d{6}");
        assertThat(paid.body().get("createdBy").asString()).isEqualTo(assistantId.toString());
        assertThat(paid.body().has("customerId")).as("absent, not null").isFalse();
        JsonNode line = paid.body().get("lines").get(0);
        assertThat(line.get("productName").asString()).isEqualTo("Product MILK-400");
        assertThat(line.get("unitPriceKobo").asLong()).isEqualTo(420_000);

        var credit = sell(till, "{\"paymentType\":\"CREDIT\",\"customerId\":\"" + ada + "\",\"dueDate\":\"2026-11-15\","
                + "\"lines\":[{\"productId\":\"" + milk + "\",\"quantity\":1}]}");
        assertThat(credit.status()).isEqualTo(201);
        assertThat(credit.body().get("dueDate").asString()).isEqualTo("2026-11-15");

        var customers = get("/api/v1/customers?q=ada", till);
        assertThat(customers.body().get("items").get(0).get("balanceKobo").asLong()).isEqualTo(420_000);
        assertThat(customers.body().get("items").get(0).get("hasDebtActivity").asBoolean()).isTrue();
        assertThat(customers.body().get("items").get(0).get("hasStoreCreditActivity").asBoolean()).isFalse();
        assertThat(get("/api/v1/products/" + milk, till).body().get("quantity").asInt()).isEqualTo(7);
    }

    /** R5 over HTTP: the same key twice is one sale with the same answer; a different body is 422. */
    @Test
    void retryWithTheSameKeyIsSafe() {
        String milk = product(login(OWNER), "MILK-400", 420_000, 10);
        String till = login(ASSISTANT);
        String key = UUID.randomUUID().toString();
        String body = "{\"paymentType\":\"PAID\",\"lines\":[{\"productId\":\"" + milk + "\",\"quantity\":1}]}";

        var first = post("/api/v1/sales", till, body, "Idempotency-Key", key);
        var retry = post("/api/v1/sales", till, body, "Idempotency-Key", key);
        var different = post("/api/v1/sales", till, body.replace("\"quantity\":1", "\"quantity\":2"), "Idempotency-Key", key);

        assertThat(first.status()).isEqualTo(201);
        assertThat(retry.status()).isEqualTo(201);
        assertThat(retry.body()).isEqualTo(first.body());
        assertThat(different.status()).isEqualTo(422);
        assertThat(different.code()).isEqualTo("IDEMPOTENCY_KEY_REUSED");
        assertThat(count("sale")).isEqualTo(1);
    }

    /** R4 over HTTP: a short line is 409 naming the line and what is left, and nothing is recorded. */
    @Test
    void notEnoughStockIs409WithWhatIsLeft() {
        String milk = product(login(OWNER), "MILK-400", 420_000, 1);
        var refused = sell(login(ASSISTANT), "{\"paymentType\":\"PAID\",\"lines\":[{\"productId\":\"" + milk + "\",\"quantity\":3}]}");

        assertThat(refused.status()).isEqualTo(409);
        assertThat(refused.code()).isEqualTo("INSUFFICIENT_STOCK");
        assertThat(refused.body().get("detail").asString()).isEqualTo("Only 1 of \"Product MILK-400\" left.");
        assertThat(refused.body().get("errors").get(0).get("field").asString()).isEqualTo("lines[0].quantity");
        assertThat(refused.body().get("errors").get(0).get("message").asString()).isEqualTo("availableQuantity: 1");
        assertThat(count("sale")).isZero();
    }

    @Test
    void saleRequestErrorsAre400WithTheField() {
        String milk = product(login(OWNER), "MILK-400", 420_000, 5);
        String till = login(ASSISTANT);
        String line = "[{\"productId\":\"" + milk + "\",\"quantity\":1}]";

        var noKey = post("/api/v1/sales", till, "{\"paymentType\":\"PAID\",\"lines\":" + line + "}");
        assertThat(noKey.status()).isEqualTo(400);
        assertThat(noKey.body().get("errors").get(0).get("field").asString()).isEqualTo("Idempotency-Key");

        var badKey = post("/api/v1/sales", till, "{\"paymentType\":\"PAID\",\"lines\":" + line + "}", "Idempotency-Key", "abc");
        assertThat(badKey.status()).isEqualTo(400);

        var creditNoCustomer = sell(till, "{\"paymentType\":\"CREDIT\",\"lines\":" + line + "}");
        assertThat(creditNoCustomer.status()).isEqualTo(400);
        assertThat(creditNoCustomer.body().get("errors").get(0).get("field").asString()).isEqualTo("customerId");

        var zero = sell(till, "{\"paymentType\":\"PAID\",\"lines\":[{\"productId\":\"" + milk + "\",\"quantity\":0}]}");
        assertThat(zero.status()).isEqualTo(400);
        assertThat(zero.body().get("errors").get(0).get("field").asString()).isEqualTo("lines[0].quantity");

        var noLines = sell(till, "{\"paymentType\":\"PAID\",\"lines\":[]}");
        assertThat(noLines.status()).isEqualTo(400);

        var badType = sell(till, "{\"paymentType\":\"BARTER\",\"lines\":" + line + "}");
        assertThat(badType.status()).isEqualTo(400);
        assertThat(badType.body().get("errors").get(0).get("field").asString()).isEqualTo("paymentType");

        var unknownProduct = sell(till, "{\"paymentType\":\"PAID\",\"lines\":[{\"productId\":\"" + UUID.randomUUID() + "\",\"quantity\":1}]}");
        assertThat(unknownProduct.status()).isEqualTo(404);
        assertThat(count("sale")).isZero();
        assertThat(quantity(UUID.fromString(milk))).isEqualTo(5);
    }

    /** GET /sales: newest first, filters combine, Lagos calendar days (DM14). */
    @Test
    void salesListFiltersAndOrders() {
        String milk = product(login(OWNER), "MILK-400", 420_000, 10);
        String till = login(ASSISTANT);
        String ada = post("/api/v1/customers", till, "{\"displayName\":\"Ada\"}").body().get("id").asString();
        String first = sell(till, "{\"paymentType\":\"PAID\",\"lines\":[{\"productId\":\"" + milk + "\",\"quantity\":1}]}").body().get("id").asString();
        String second = sell(till, "{\"paymentType\":\"CREDIT\",\"customerId\":\"" + ada + "\",\"lines\":[{\"productId\":\"" + milk + "\",\"quantity\":2}]}")
                .body().get("id").asString();
        String today = LocalDate.now(ZoneId.of("Africa/Lagos")).toString();

        var all = get("/api/v1/sales", till);
        assertThat(all.body().get("totalItems").asLong()).isEqualTo(2);
        assertThat(all.body().get("items").findValuesAsString("id")).containsExactly(second, first);
        assertThat(all.body().get("items").get(0).get("lines").size()).isEqualTo(1);

        assertThat(get("/api/v1/sales?paymentType=CREDIT", till).body().get("items").findValuesAsString("id")).containsExactly(second);
        assertThat(get("/api/v1/sales?customerId=" + ada, till).body().get("totalItems").asLong()).isEqualTo(1);
        assertThat(get("/api/v1/sales?from=" + today + "&to=" + today, till).body().get("totalItems").asLong()).isEqualTo(2);
        assertThat(get("/api/v1/sales?to=2020-01-01", till).body().get("totalItems").asLong()).isZero();
        assertThat(get("/api/v1/sales/" + second, till).body().get("customerId").asString()).isEqualTo(ada);
        assertThat(get("/api/v1/sales?size=101", till).status()).isEqualTo(400);
        assertThat(get("/api/v1/sales?from=yesterday", till).status()).isEqualTo(400);
    }

    /** N6: the client's X-Request-Id comes back on success and on errors; a bad one is replaced. */
    @Test
    void requestIdIsEchoed() {
        String id = UUID.randomUUID().toString();
        var ok = send("GET", "/api/v1/health", null, null, "X-Request-Id", id);
        assertThat(ok.header("X-Request-Id")).isEqualTo(id);

        var error = send("GET", "/api/v1/products", null, null, "X-Request-Id", id);
        assertThat(error.header("X-Request-Id")).isEqualTo(id);
        assertThat(error.body().get("requestId").asString()).isEqualTo(id);

        var replaced = send("GET", "/api/v1/health", null, null, "X-Request-Id", "<script>");
        assertThat(UUID.fromString(replaced.header("X-Request-Id"))).isNotNull();
    }
}
