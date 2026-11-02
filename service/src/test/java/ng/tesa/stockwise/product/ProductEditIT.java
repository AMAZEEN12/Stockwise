package ng.tesa.stockwise.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.support.ApiTestSupport;

/**
 * Spec R1 and R18: the owner edits, archives and unarchives a product, and an edit made from a
 * stale screen is refused with 412 instead of overwriting someone else's change. Over HTTP, as
 * the edit screen and the archive toggle send it.
 */
class ProductEditIT extends ApiTestSupport {

    private Response patch(String token, UUID productId, String ifMatch, String body) {
        return ifMatch == null
                ? send("PATCH", "/api/v1/products/" + productId, token, body)
                : send("PATCH", "/api/v1/products/" + productId, token, body, "If-Match", ifMatch);
    }

    private String etag(String token, UUID productId) {
        var response = get("/api/v1/products/" + productId, token);
        assertThat(response.status()).isEqualTo(200);
        return response.header("ETag");
    }

    @Test
    void theOwnerEditsAProductAndGetsTheNewVersion() {
        String owner = login(OWNER);
        UUID milk = product("MILK-400", 100_000, 10);
        String before = etag(owner, milk);

        var edited = patch(owner, milk, before, """
                {"name":"Peak Milk 400g","priceKobo":125000,"lowStockThreshold":4}""");

        assertThat(edited.status()).as("edit %s", edited.body()).isEqualTo(200);
        assertThat(edited.body().get("name").asString()).isEqualTo("Peak Milk 400g");
        assertThat(edited.body().get("priceKobo").asLong()).isEqualTo(125_000);
        assertThat(edited.body().get("lowStockThreshold").asInt()).isEqualTo(4);
        assertThat(edited.body().get("reference").asString()).isEqualTo("MILK-400");
        assertThat(edited.body().get("quantity").asInt()).isEqualTo(10);
        assertThat(edited.header("ETag")).isNotEqualTo(before).isEqualTo(etag(owner, milk));
        assertThat(get("/api/v1/products/" + milk, owner).body().get("name").asString()).isEqualTo("Peak Milk 400g");
    }

    /** R1: an archived product leaves the sale screen but keeps its history; unarchive brings it back. */
    @Test
    void archiveAndUnarchive() {
        String owner = login(OWNER);
        UUID oil = product("OIL-1L", 300_000, 5);

        var archived = patch(owner, oil, etag(owner, oil), """
                {"active":false}""");
        assertThat(archived.status()).isEqualTo(200);
        assertThat(archived.body().get("active").asBoolean()).isFalse();
        assertThat(archived.body().get("stockState").asString()).isEqualTo("ARCHIVED");
        var sale = sell(owner, """
                {"paymentType":"PAID","lines":[{"productId":"%s","quantity":1}]}""".formatted(oil));
        assertThat(sale.status()).isEqualTo(404);
        assertThat(get("/api/v1/products/" + oil, owner).status()).isEqualTo(200);

        var restored = patch(owner, oil, etag(owner, oil), """
                {"active":true}""");
        assertThat(restored.status()).isEqualTo(200);
        assertThat(restored.body().get("active").asBoolean()).isTrue();
    }

    /** R18 two-tab test: tab A edits, tab B archives from the version it read; B gets 412 and nothing changes. */
    @Test
    void aStaleVersionIs412AndNothingChanges() {
        String owner = login(OWNER);
        UUID rice = product("RICE-5KG", 850_000, 5);
        String readByBothTabs = etag(owner, rice);

        assertThat(patch(owner, rice, readByBothTabs, """
                {"priceKobo":900000}""").status()).isEqualTo(200);
        var stale = patch(owner, rice, readByBothTabs, """
                {"active":false}""");

        assertThat(stale.status()).isEqualTo(412);
        assertThat(stale.code()).isEqualTo("VERSION_CONFLICT");
        var now = get("/api/v1/products/" + rice, owner).body();
        assertThat(now.get("active").asBoolean()).isTrue();
        assertThat(now.get("priceKobo").asLong()).isEqualTo(900_000);
    }

    /** A sale moves the version too, so a screen opened before the sale must reload first. */
    @Test
    void aSaleInBetweenAlsoMakesTheVersionStale() {
        String owner = login(OWNER);
        UUID salt = product("SALT-500", 20_000, 5);
        String before = etag(owner, salt);
        assertThat(sell(owner, """
                {"paymentType":"PAID","lines":[{"productId":"%s","quantity":1}]}""".formatted(salt)).status()).isEqualTo(201);

        assertThat(patch(owner, salt, before, """
                {"priceKobo":25000}""").status()).isEqualTo(412);
        assertThat(patch(owner, salt, etag(owner, salt), """
                {"priceKobo":25000}""").status()).isEqualTo(200);
    }

    @Test
    void ifMatchIsRequiredAndAcceptsTheUsualForms() {
        String owner = login(OWNER);
        UUID milk = product("MILK-400", 100_000, 10);

        var missing = patch(owner, milk, null, """
                {"priceKobo":1}""");
        assertThat(missing.status()).isEqualTo(428);
        assertThat(missing.code()).isEqualTo("PRECONDITION_REQUIRED");
        assertThat(patch(owner, milk, "latest", """
                {"priceKobo":1}""").status()).isEqualTo(428);

        int version = get("/api/v1/products/" + milk, owner).body().get("version").asInt();
        assertThat(patch(owner, milk, String.valueOf(version), """
                {"priceKobo":2}""").status()).isEqualTo(200);
        assertThat(patch(owner, milk, "W/\"" + (version + 1) + "\"", """
                {"priceKobo":3}""").status()).isEqualTo(200);
    }

    @Test
    void aTakenReferenceIs409() {
        String owner = login(OWNER);
        product("MILK-400", 100_000, 10);
        UUID rice = product("RICE-5KG", 850_000, 5);

        var taken = patch(owner, rice, etag(owner, rice), """
                {"reference":"MILK-400"}""");

        assertThat(taken.status()).isEqualTo(409);
        assertThat(taken.code()).isEqualTo("DUPLICATE_REFERENCE");
        assertThat(get("/api/v1/products/" + rice, owner).body().get("reference").asString()).isEqualTo("RICE-5KG");
    }

    @Test
    void invalidEditsAreRefused() {
        String owner = login(OWNER);
        UUID milk = product("MILK-400", 100_000, 10);
        String version = etag(owner, milk);

        assertThat(patch(owner, milk, version, "{}").status()).isEqualTo(400);
        var quantity = patch(owner, milk, version, """
                {"quantity":99}""");
        assertThat(quantity.status()).isEqualTo(400);
        assertThat(quantity.body().get("errors").get(0).get("field").asString()).isEqualTo("quantity");
        assertThat(patch(owner, milk, version, """
                {"name":"   "}""").status()).isEqualTo(400);
        assertThat(patch(owner, milk, version, """
                {"priceKobo":-1}""").status()).isEqualTo(400);
        assertThat(patch(owner, UUID.randomUUID(), "0", """
                {"priceKobo":1}""").status()).isEqualTo(404);
        assertThat(etag(owner, milk)).isEqualTo(version);
    }

    @Test
    void onlyTheOwnerMayEdit() {
        String owner = login(OWNER);
        UUID milk = product("MILK-400", 100_000, 10);
        String version = etag(owner, milk);

        assertThat(patch(login(ASSISTANT), milk, version, """
                {"active":false}""").status()).isEqualTo(403);
        assertThat(patch(login(ADMIN), milk, version, """
                {"active":false}""").status()).isEqualTo(403);
        assertThat(patch(null, milk, version, """
                {"active":false}""").status()).isEqualTo(401);
        assertThat(etag(owner, milk)).isEqualTo(version);
    }
}
