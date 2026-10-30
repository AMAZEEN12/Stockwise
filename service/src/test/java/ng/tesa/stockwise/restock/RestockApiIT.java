package ng.tesa.stockwise.restock;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.support.ApiTestSupport;

/** HTTP contract and role checks for restocks. */
class RestockApiIT extends ApiTestSupport {

    @Test
    void ownerRecordsAndReadsARestock() {
        UUID milk = product("MILK-400", 120_000, 4);
        String owner = login(OWNER);
        String body = """
                {"productId":"%s","quantity":12,"receivedOn":"2026-10-29","note":"Supplier delivery"}
                """.formatted(milk);

        Response created = post("/api/v1/restocks", owner, body,
                "Idempotency-Key", UUID.randomUUID().toString());

        assertThat(created.status()).isEqualTo(201);
        assertThat(created.header("Location")).isEqualTo("/api/v1/restocks/" + created.body().get("id").asString());
        assertThat(created.body().get("quantity").asInt()).isEqualTo(12);
        assertThat(created.body().get("receivedOn").asString()).isEqualTo("2026-10-29");
        assertThat(quantity(milk)).isEqualTo(16);
        assertThat(get(created.header("Location"), owner).status()).isEqualTo(200);
        assertThat(get("/api/v1/restocks?productId=" + milk, owner).body().get("totalItems").asLong()).isEqualTo(1);
    }

    @Test
    void assistantAndAdminCannotRecordRestocks() {
        UUID milk = product("MILK-400", 120_000, 4);
        String body = """
                {"productId":"%s","quantity":1,"receivedOn":"2026-10-29"}
                """.formatted(milk);
        for (String email : new String[] {ASSISTANT, ADMIN}) {
            Response response = post("/api/v1/restocks", login(email), body,
                    "Idempotency-Key", UUID.randomUUID().toString());
            assertThat(response.status()).isEqualTo(403);
            assertThat(response.code()).isEqualTo("FORBIDDEN");
        }
        assertThat(quantity(milk)).isEqualTo(4);
        assertThat(count("restock")).isZero();
    }

    @Test
    void validatesBodyAndRequiredKey() {
        UUID milk = product("MILK-400", 120_000, 4);
        String owner = login(OWNER);
        String invalid = """
                {"productId":"%s","quantity":0,"receivedOn":"not-a-date","note":"%s"}
                """.formatted(milk, "x".repeat(501));

        Response missingKey = post("/api/v1/restocks", owner,
                "{\"productId\":\"" + milk + "\",\"quantity\":1,\"receivedOn\":\"2026-10-29\"}");
        Response invalidBody = post("/api/v1/restocks", owner, invalid,
                "Idempotency-Key", UUID.randomUUID().toString());

        assertThat(missingKey.status()).isEqualTo(400);
        assertThat(missingKey.code()).isEqualTo("VALIDATION_FAILED");
        assertThat(invalidBody.status()).isEqualTo(400);
        assertThat(invalidBody.code()).isEqualTo("VALIDATION_FAILED");
        assertThat(quantity(milk)).isEqualTo(4);
        assertThat(count("restock")).isZero();
    }
}
