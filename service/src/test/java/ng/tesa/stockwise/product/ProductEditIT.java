package ng.tesa.stockwise.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import ng.tesa.stockwise.support.ApiTestSupport;

class ProductEditIT extends ApiTestSupport {

    @Autowired
    private ProductRepository productRepository;

    @Test
    void ownerCanUpdateProductDetailsWithIfMatch() {
        String ownerToken = login(OWNER);
        UUID milkId = product("MILK-EDIT-1", 100_000, 20);

        Response getResp = get("/api/v1/products/" + milkId, ownerToken);
        assertThat(getResp.status()).isEqualTo(200);
        assertThat(getResp.header("ETag")).isEqualTo("\"0\"");

        Response patchResp = send("PATCH", "/api/v1/products/" + milkId, ownerToken, """
                {
                    "name": "Peak Evaporated Milk 400g",
                    "priceKobo": 150000,
                    "lowStockThreshold": 8
                }
                """, "If-Match", "0");

        assertThat(patchResp.status()).isEqualTo(200);
        assertThat(patchResp.header("ETag")).isEqualTo("\"1\"");
        assertThat(patchResp.body().get("name").asString()).isEqualTo("Peak Evaporated Milk 400g");
        assertThat(patchResp.body().get("priceKobo").asLong()).isEqualTo(150_000L);
        assertThat(patchResp.body().get("lowStockThreshold").asInt()).isEqualTo(8);
        assertThat(patchResp.body().get("version").asInt()).isEqualTo(1);

        Product updated = productRepository.findById(milkId).orElseThrow();
        assertThat(updated.name()).isEqualTo("Peak Evaporated Milk 400g");
        assertThat(updated.priceKobo()).isEqualTo(150_000L);
        assertThat(updated.lowStockThreshold()).isEqualTo(8);
        assertThat(updated.version()).isEqualTo(1);
    }

    @Test
    void versionMismatchReturns412() {
        String ownerToken = login(OWNER);
        UUID milkId = product("MILK-EDIT-2", 100_000, 20);

        Response patchResp = send("PATCH", "/api/v1/products/" + milkId, ownerToken, """
                {"priceKobo": 120000}
                """, "If-Match", "99");

        assertThat(patchResp.status()).isEqualTo(412);
        assertThat(patchResp.code()).isEqualTo("VERSION_CONFLICT");
    }

    @Test
    void missingIfMatchReturns412() {
        String ownerToken = login(OWNER);
        UUID milkId = product("MILK-EDIT-3", 100_000, 20);

        Response patchResp = send("PATCH", "/api/v1/products/" + milkId, ownerToken, """
                {"priceKobo": 120000}
                """);

        assertThat(patchResp.status()).isEqualTo(412);
        assertThat(patchResp.code()).isEqualTo("VERSION_CONFLICT");
    }

    @Test
    void nonOwnerCannotPatchProduct() {
        String assistantToken = login(ASSISTANT);
        String adminToken = login(ADMIN);
        UUID milkId = product("MILK-EDIT-4", 100_000, 20);

        Response asstResp = send("PATCH", "/api/v1/products/" + milkId, assistantToken, """
                {"priceKobo": 120000}
                """, "If-Match", "0");
        assertThat(asstResp.status()).isEqualTo(403);

        Response adminResp = send("PATCH", "/api/v1/products/" + milkId, adminToken, """
                {"priceKobo": 120000}
                """, "If-Match", "0");
        assertThat(adminResp.status()).isEqualTo(403);
    }

    @Test
    void archiveAndUnarchiveProduct() {
        String ownerToken = login(OWNER);
        UUID milkId = product("MILK-EDIT-5", 100_000, 20);

        // Archive
        Response archiveResp = send("PATCH", "/api/v1/products/" + milkId, ownerToken, """
                {"active": false}
                """, "If-Match", "0");
        assertThat(archiveResp.status()).isEqualTo(200);
        assertThat(archiveResp.body().get("active").asBoolean()).isFalse();
        assertThat(archiveResp.body().get("stockState").asString()).isEqualTo("ARCHIVED");

        // Unarchive
        Response unarchiveResp = send("PATCH", "/api/v1/products/" + milkId, ownerToken, """
                {"active": true}
                """, "If-Match", "1");
        assertThat(unarchiveResp.status()).isEqualTo(200);
        assertThat(unarchiveResp.body().get("active").asBoolean()).isTrue();
        assertThat(unarchiveResp.body().get("stockState").asString()).isEqualTo("IN_STOCK");
    }

    @Test
    void duplicateReferenceReturns409() {
        String ownerToken = login(OWNER);
        product("MILK-EXISTS", 100_000, 20);
        UUID otherId = product("MILK-OTHER", 100_000, 20);

        Response patchResp = send("PATCH", "/api/v1/products/" + otherId, ownerToken, """
                {"reference": "MILK-EXISTS"}
                """, "If-Match", "0");

        assertThat(patchResp.status()).isEqualTo(409);
        assertThat(patchResp.code()).isEqualTo("DUPLICATE_REFERENCE");
    }
}
