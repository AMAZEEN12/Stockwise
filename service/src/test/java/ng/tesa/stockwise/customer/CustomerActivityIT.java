package ng.tesa.stockwise.customer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.support.ApiTestSupport;

/** The two presentation flags come from independent append-only ledger histories. */
class CustomerActivityIT extends ApiTestSupport {

    @Test
    void activityRemainsVisibleAfterEachBalanceReturnsToZero() {
        String token = login(ASSISTANT);
        var created = post("/api/v1/customers", token, "{\"displayName\":\"Activity Test\"}");
        UUID customerId = UUID.fromString(created.body().get("id").asString());

        assertActivity(getCustomer(token, customerId), false, false);

        ledger(customerId, 100, "CREDIT_SALE", 100);
        ledger(customerId, -100, "REPAYMENT", 0);
        assertActivity(getCustomer(token, customerId), true, false);

        ledger(customerId, 200, "STORE_CREDIT", 0);
        ledger(customerId, -200, "STORE_CREDIT", 0);
        assertActivity(getCustomer(token, customerId), true, true);
    }

    private tools.jackson.databind.JsonNode getCustomer(String token, UUID customerId) {
        var items = get("/api/v1/customers?q=Activity%20Test", token).body().get("items");
        assertThat(items.size()).isEqualTo(1);
        assertThat(items.get(0).get("id").asString()).isEqualTo(customerId.toString());
        return items.get(0);
    }

    private void assertActivity(tools.jackson.databind.JsonNode customer, boolean debt, boolean storeCredit) {
        assertThat(customer.get("balanceKobo").asLong()).isZero();
        assertThat(customer.get("storeCreditKobo").asLong()).isZero();
        assertThat(customer.get("hasDebtActivity").asBoolean()).isEqualTo(debt);
        assertThat(customer.get("hasStoreCreditActivity").asBoolean()).isEqualTo(storeCredit);
    }

    private void ledger(UUID customerId, long delta, String sourceType, long balanceAfter) {
        jdbc.sql("""
                        INSERT INTO ledger_entry
                            (customer_id, delta_kobo, source_type, balance_after_kobo)
                        VALUES (:customerId, :delta, :sourceType, :balanceAfter)
                        """)
                .param("customerId", customerId)
                .param("delta", delta)
                .param("sourceType", sourceType)
                .param("balanceAfter", balanceAfter)
                .update();
    }
}
