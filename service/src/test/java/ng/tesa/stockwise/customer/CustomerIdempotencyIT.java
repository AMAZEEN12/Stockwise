package ng.tesa.stockwise.customer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.support.ApiTestSupport;

/**
 * Contract v0.2.0, proposal A: {@code POST /customers} with an optional Idempotency-Key is safe to
 * repeat. Asserts the rows in the database, not only the responses. Must fail when
 * {@code ON CONFLICT (idempotency_key) DO NOTHING} is removed (rule-removal log).
 */
class CustomerIdempotencyIT extends ApiTestSupport {

    static final String ADA = "{\"displayName\":\"Ada Okafor\",\"contactPlaceholder\":\"Shop 14\"}";

    Response create(String token, String body, String key) {
        return key == null
                ? post("/api/v1/customers", token, body)
                : post("/api/v1/customers", token, body, "Idempotency-Key", key);
    }

    @Test
    void sameKeyReturnsTheOriginalCustomer() {
        String till = login(ASSISTANT);
        String key = UUID.randomUUID().toString();

        var first = create(till, ADA, key);
        var retry = create(till, ADA, key);
        // Same request after normalisation: extra spaces around the name.
        var spaced = create(till, "{\"displayName\":\"  Ada Okafor \",\"contactPlaceholder\":\" Shop 14 \"}", key);

        assertThat(first.status()).isEqualTo(201);
        assertThat(retry.status()).isEqualTo(201);
        assertThat(spaced.status()).isEqualTo(201);
        assertThat(retry.body()).isEqualTo(first.body());
        assertThat(spaced.body()).isEqualTo(first.body());
        assertThat(retry.header("Location")).isEqualTo(first.header("Location"));
        assertThat(count("customer")).isEqualTo(1);
    }

    /** A phone retrying on a bad network: ten copies at once still create one customer. */
    @Test
    void parallelRetriesCreateOneCustomer() throws Exception {
        String till = login(ASSISTANT);
        String key = UUID.randomUUID().toString();
        int attempts = 10;

        CountDownLatch start = new CountDownLatch(1);
        List<Future<Response>> futures = new ArrayList<>();
        try (ExecutorService pool = Executors.newFixedThreadPool(attempts)) {
            for (int i = 0; i < attempts; i++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return create(till, ADA, key);
                }));
            }
            start.countDown();
            List<Response> responses = new ArrayList<>();
            for (Future<Response> f : futures) {
                responses.add(f.get(30, TimeUnit.SECONDS));
            }
            assertThat(responses).allSatisfy(r -> assertThat(r.status()).isEqualTo(201));
            assertThat(responses).extracting(r -> r.body().get("id").asString()).containsOnly(
                    responses.getFirst().body().get("id").asString());
        }
        assertThat(count("customer")).isEqualTo(1);
    }

    @Test
    void sameKeyDifferentBodyIs422() {
        String till = login(ASSISTANT);
        String key = UUID.randomUUID().toString();
        create(till, ADA, key);

        var different = create(till, "{\"displayName\":\"Bola Adeyemi\"}", key);

        assertThat(different.status()).isEqualTo(422);
        assertThat(different.code()).isEqualTo("IDEMPOTENCY_KEY_REUSED");
        assertThat(count("customer")).isEqualTo(1);
    }

    /** A key belongs to the user who first sent it; another user can't read that customer back with it. */
    @Test
    void sameKeyOtherUserIs422() {
        String key = UUID.randomUUID().toString();
        create(login(ASSISTANT), ADA, key);

        var other = create(login(OWNER), ADA, key);

        assertThat(other.status()).isEqualTo(422);
        assertThat(other.code()).isEqualTo("IDEMPOTENCY_KEY_REUSED");
        assertThat(count("customer")).isEqualTo(1);
    }

    /** v0.1.0 behaviour is unchanged: without the header, each call creates a customer. */
    @Test
    void withoutKeyEachPostCreates() {
        String till = login(ASSISTANT);
        assertThat(create(till, ADA, null).status()).isEqualTo(201);
        assertThat(create(till, ADA, null).status()).isEqualTo(201);
        assertThat(count("customer")).isEqualTo(2);
        assertThat(jdbc.sql("SELECT count(*) FROM customer WHERE idempotency_key IS NULL AND request_hash IS NULL")
                .query(Long.class).single()).isEqualTo(2);
    }

    @Test
    void malformedKeyIs400() {
        var response = create(login(ASSISTANT), ADA, "not-a-uuid");
        assertThat(response.status()).isEqualTo(400);
        assertThat(response.code()).isEqualTo("VALIDATION_FAILED");
        assertThat(count("customer")).isZero();
    }

    /** Database rule: a key never exists without the request it was used for, even by direct SQL. */
    @Test
    void keyAndHashGoTogether() {
        assertThatThrownBy(() -> jdbc.sql("""
                        INSERT INTO customer (display_name, idempotency_key) VALUES ('Ada', gen_random_uuid())
                        """).update())
                .hasMessageContaining("customer_key_and_hash_together");
        assertThatThrownBy(() -> jdbc.sql("""
                        INSERT INTO customer (display_name, request_hash) VALUES ('Ada', 'h')
                        """).update())
                .hasMessageContaining("customer_key_and_hash_together");
    }
}
