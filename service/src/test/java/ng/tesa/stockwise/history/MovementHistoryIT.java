package ng.tesa.stockwise.history;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.support.ApiTestSupport;
import tools.jackson.databind.JsonNode;

/**
 * Spec R13: each product shows its stock movements in time order, and the movements reconcile
 * with the product's quantity. Over HTTP, as the web app calls it.
 */
class MovementHistoryIT extends ApiTestSupport {

    private String product(String token, String reference, int quantity) {
        var response = post("/api/v1/products", token, """
                {"reference":"%s","name":"Product %s","category":"Dairy","priceKobo":50000,"quantity":%d,"lowStockThreshold":2}"""
                .formatted(reference, reference, quantity));
        assertThat(response.status()).as("create product %s", response.body()).isEqualTo(201);
        return response.body().get("id").asString();
    }

    private String sellOne(String token, String productId, int quantity) {
        var sale = sell(token, """
                {"paymentType":"PAID","lines":[{"productId":"%s","quantity":%d}]}""".formatted(productId, quantity));
        assertThat(sale.status()).as("sale %s", sale.body()).isEqualTo(201);
        return sale.body().get("id").asString();
    }

    @Test
    void openingStockAndSalesAppearNewestFirstWithRunningTotals() {
        String owner = login(OWNER);
        String assistant = login(ASSISTANT);
        String id = product(owner, "MILK-400", 10);
        String firstSale = sellOne(assistant, id, 3);
        String secondSale = sellOne(assistant, id, 2);

        var history = get("/api/v1/products/" + id + "/movements", assistant);

        assertThat(history.status()).isEqualTo(200);
        JsonNode body = history.body();
        assertThat(body.get("productId").asString()).isEqualTo(id);
        assertThat(body.get("currentQuantity").asInt()).isEqualTo(5);
        assertThat(body.get("totalItems").asLong()).isEqualTo(3);
        JsonNode items = body.get("items");
        assertThat(items.size()).isEqualTo(3);

        assertThat(items.get(0).get("sourceType").asString()).isEqualTo("SALE");
        assertThat(items.get(0).get("sourceId").asString()).isEqualTo(secondSale);
        assertThat(items.get(0).get("delta").asInt()).isEqualTo(-2);
        assertThat(items.get(0).get("quantityAfter").asInt()).isEqualTo(5);

        assertThat(items.get(1).get("sourceId").asString()).isEqualTo(firstSale);
        assertThat(items.get(1).get("quantityAfter").asInt()).isEqualTo(7);

        assertThat(items.get(2).get("sourceType").asString()).isEqualTo("OPENING");
        assertThat(items.get(2).has("sourceId")).isFalse();
        assertThat(items.get(2).get("delta").asInt()).isEqualTo(10);
        assertThat(items.get(2).get("quantityAfter").asInt()).isEqualTo(10);
    }

    @Test
    void movementsReconcileWithTheProductQuantity() {
        String owner = login(OWNER);
        String id = product(owner, "RICE-5KG", 12);
        sellOne(owner, id, 4);
        sellOne(owner, id, 1);

        JsonNode body = get("/api/v1/products/" + id + "/movements?size=100", owner).body();

        int sum = 0;
        for (JsonNode movement : body.get("items")) {
            sum += movement.get("delta").asInt();
        }
        int quantity = get("/api/v1/products/" + id, owner).body().get("quantity").asInt();
        assertThat(sum).isEqualTo(quantity).isEqualTo(body.get("currentQuantity").asInt());
        assertThat(body.get("items").get(0).get("quantityAfter").asInt()).isEqualTo(quantity);
    }

    /** Fails if the running total is computed per page instead of over the whole history. */
    @Test
    void runningTotalsStayCorrectOnLaterPages() {
        String owner = login(OWNER);
        String id = product(owner, "SUGAR-1KG", 8);
        sellOne(owner, id, 3);

        var secondPage = get("/api/v1/products/" + id + "/movements?page=1&size=1", owner);

        assertThat(secondPage.status()).isEqualTo(200);
        JsonNode only = secondPage.body().get("items").get(0);
        assertThat(only.get("sourceType").asString()).isEqualTo("OPENING");
        assertThat(only.get("quantityAfter").asInt()).isEqualTo(8);
        assertThat(secondPage.body().get("page").asInt()).isEqualTo(1);
        assertThat(secondPage.body().get("totalItems").asLong()).isEqualTo(2);
    }

    @Test
    void aProductCreatedWithNoStockHasAnEmptyHistory() {
        String owner = login(OWNER);
        String id = product(owner, "EMPTY-1", 0);

        JsonNode body = get("/api/v1/products/" + id + "/movements", owner).body();

        assertThat(body.get("items").size()).isZero();
        assertThat(body.get("totalItems").asLong()).isZero();
        assertThat(body.get("currentQuantity").asInt()).isZero();
    }

    @Test
    void everyRoleCanReadButNotWithoutLoggingIn() {
        String id = product(login(OWNER), "OIL-1L", 4);

        assertThat(get("/api/v1/products/" + id + "/movements", login(ADMIN)).status()).isEqualTo(200);
        var anonymous = get("/api/v1/products/" + id + "/movements", null);
        assertThat(anonymous.status()).isEqualTo(401);
        assertThat(anonymous.code()).isEqualTo("UNAUTHENTICATED");
    }

    @Test
    void unknownProductIs404AndBadPagingIs400() {
        String token = login(OWNER);

        var unknown = get("/api/v1/products/" + UUID.randomUUID() + "/movements", token);
        assertThat(unknown.status()).isEqualTo(404);
        assertThat(unknown.code()).isEqualTo("NOT_FOUND");

        String id = product(token, "SALT-500", 1);
        var tooBig = get("/api/v1/products/" + id + "/movements?size=101", token);
        assertThat(tooBig.status()).isEqualTo(400);
        assertThat(tooBig.code()).isEqualTo("VALIDATION_FAILED");
    }
}
