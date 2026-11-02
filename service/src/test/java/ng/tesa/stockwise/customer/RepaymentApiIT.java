package ng.tesa.stockwise.customer;

import static org.assertj.core.api.Assertions.assertThat;

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
import tools.jackson.databind.JsonNode;

/**
 * Spec R9: a repayment, full or partial, can never exceed what the customer owes at that moment,
 * even when two arrive together. Over HTTP, as the "Record repayment" screen sends it.
 */
class RepaymentApiIT extends ApiTestSupport {

    /** A customer who owes {@code owedKobo} through one credit sale. */
    private String customerOwing(String token, String name, long owedKobo) {
        var created = post("/api/v1/customers", token, """
                {"displayName":"%s"}""".formatted(name));
        assertThat(created.status()).isEqualTo(201);
        String id = created.body().get("id").asString();
        UUID product = product("P-" + UUID.randomUUID().toString().substring(0, 8), owedKobo, 5);
        var sale = sell(token, """
                {"paymentType":"CREDIT","customerId":"%s","lines":[{"productId":"%s","quantity":1}]}""".formatted(id, product));
        assertThat(sale.status()).as("credit sale %s", sale.body()).isEqualTo(201);
        return id;
    }

    private Response repay(String token, String key, String customerId, long amountKobo) {
        return post("/api/v1/repayments", token, """
                {"customerId":"%s","amountKobo":%d,"note":"Paid at the shop"}""".formatted(customerId, amountKobo),
                "Idempotency-Key", key);
    }

    private long balanceOf(String customerId) {
        return balance(UUID.fromString(customerId));
    }

    @Test
    void aPartialRepaymentLowersTheBalanceAndIsInTheLedger() {
        String assistant = login(ASSISTANT);
        String ada = customerOwing(assistant, "Ada Okafor", 1_000_000);

        var paid = repay(assistant, UUID.randomUUID().toString(), ada, 400_000);

        assertThat(paid.status()).as("repayment %s", paid.body()).isEqualTo(201);
        assertThat(paid.body().get("customerId").asString()).isEqualTo(ada);
        assertThat(paid.body().get("amountKobo").asLong()).isEqualTo(400_000);
        assertThat(paid.body().get("balanceAfterKobo").asLong()).isEqualTo(600_000);
        assertThat(paid.body().get("note").asString()).isEqualTo("Paid at the shop");
        assertThat(balanceOf(ada)).isEqualTo(600_000);

        // Found by type, not position: the repayment's time comes from the service's clock and the
        // sale's from the database's, which can differ slightly when the database runs in Docker.
        JsonNode entry = null;
        for (JsonNode item : get("/api/v1/customers/" + ada + "/ledger", assistant).body().get("items")) {
            if ("REPAYMENT".equals(item.get("sourceType").asString())) {
                entry = item;
            }
        }
        assertThat(entry).as("REPAYMENT ledger entry").isNotNull();
        assertThat(entry.get("sourceId").asString()).isEqualTo(paid.body().get("id").asString());
        assertThat(entry.get("deltaKobo").asLong()).isEqualTo(-400_000);
        assertThat(entry.get("balanceAfterKobo").asLong()).isEqualTo(600_000);
    }

    @Test
    void aFullRepaymentClearsTheBalance() {
        String owner = login(OWNER);
        String ada = customerOwing(owner, "Ada", 250_000);

        var paid = repay(owner, UUID.randomUUID().toString(), ada, 250_000);

        assertThat(paid.status()).isEqualTo(201);
        assertThat(paid.body().get("balanceAfterKobo").asLong()).isZero();
        assertThat(balanceOf(ada)).isZero();
    }

    @Test
    void moreThanIsOwedIs409AndNothingIsRecorded() {
        String owner = login(OWNER);
        String ada = customerOwing(owner, "Ada", 250_000);

        var refused = repay(owner, UUID.randomUUID().toString(), ada, 250_001);

        assertThat(refused.status()).isEqualTo(409);
        assertThat(refused.code()).isEqualTo("REPAYMENT_EXCEEDS_BALANCE");
        assertThat(refused.body().get("errors").get(0).get("field").asString()).isEqualTo("amountKobo");
        assertThat(balanceOf(ada)).isEqualTo(250_000);
        assertThat(count("repayment")).isZero();
    }

    @Test
    void aRetryWithTheSameKeyRepaysOnce() {
        String owner = login(OWNER);
        String ada = customerOwing(owner, "Ada", 1_000_000);
        String key = UUID.randomUUID().toString();

        var first = repay(owner, key, ada, 300_000);
        var again = repay(owner, key, ada, 300_000);

        assertThat(first.status()).isEqualTo(201);
        assertThat(again.status()).isEqualTo(201);
        assertThat(again.body().get("id").asString()).isEqualTo(first.body().get("id").asString());
        assertThat(again.body().get("balanceAfterKobo").asLong()).isEqualTo(700_000);
        assertThat(balanceOf(ada)).isEqualTo(700_000);
        assertThat(count("repayment")).isEqualTo(1);
    }

    @Test
    void theSameKeyWithAnotherAmountIs422() {
        String owner = login(OWNER);
        String ada = customerOwing(owner, "Ada", 1_000_000);
        String key = UUID.randomUUID().toString();
        repay(owner, key, ada, 300_000);

        var changed = repay(owner, key, ada, 500_000);

        assertThat(changed.status()).isEqualTo(422);
        assertThat(changed.code()).isEqualTo("IDEMPOTENCY_KEY_REUSED");
        assertThat(balanceOf(ada)).isEqualTo(700_000);
    }

    @Test
    void rolesUnknownCustomersAndBadAmounts() {
        String owner = login(OWNER);
        String ada = customerOwing(owner, "Ada", 1_000_000);

        var admin = repay(login(ADMIN), UUID.randomUUID().toString(), ada, 100_000);
        assertThat(admin.status()).isEqualTo(403);

        var unknown = repay(owner, UUID.randomUUID().toString(), UUID.randomUUID().toString(), 100_000);
        assertThat(unknown.status()).isEqualTo(404);
        assertThat(unknown.code()).isEqualTo("NOT_FOUND");

        var zero = repay(owner, UUID.randomUUID().toString(), ada, 0);
        assertThat(zero.status()).isEqualTo(400);
        assertThat(zero.body().get("errors").get(0).get("field").asString()).isEqualTo("amountKobo");

        var noKey = post("/api/v1/repayments", owner, """
                {"customerId":"%s","amountKobo":1000}""".formatted(ada));
        assertThat(noKey.status()).isEqualTo(400);

        assertThat(repay(null, UUID.randomUUID().toString(), ada, 100_000).status()).isEqualTo(401);
        assertThat(balanceOf(ada)).isEqualTo(1_000_000);
    }

    /**
     * R9 acceptance: two repayments of ₦6,000 at the same moment against ₦10,000 owed. One is
     * recorded, the other gets 409, and the balance ends at ₦4,000, never below zero.
     */
    @Test
    void twoParallelRepaymentsCannotTogetherExceedTheBalance() throws Exception {
        String owner = login(OWNER);
        String ada = customerOwing(owner, "Ada", 1_000_000);

        CountDownLatch start = new CountDownLatch(1);
        List<Integer> statuses = new ArrayList<>();
        try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return repay(owner, UUID.randomUUID().toString(), ada, 600_000).status();
                }));
            }
            start.countDown();
            for (Future<Integer> future : futures) {
                statuses.add(future.get(30, TimeUnit.SECONDS));
            }
        }

        assertThat(statuses).containsExactlyInAnyOrder(201, 409);
        assertThat(balanceOf(ada)).isEqualTo(400_000);
        assertThat(count("repayment")).isEqualTo(1);
    }
}
