package ng.tesa.stockwise.customer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import ng.tesa.stockwise.support.ApiTestSupport;

class StoreCreditSettlementIT extends ApiTestSupport {

    @Autowired
    private CustomerRepository customerRepository;

    @Test
    void ownerAndAdminCanIssueStoreCredit() {
        String ownerToken = login(OWNER);
        String adminToken = login(ADMIN);
        String asstToken = login(ASSISTANT);
        UUID custId = customer("Ifeanyi Credit");

        // Assistant is forbidden
        Response asstResp = post("/api/v1/customers/" + custId + "/store-credit", asstToken, """
                {
                    "amountKobo": 200000,
                    "reason": "RETURN_REFUND"
                }
                """);
        assertThat(asstResp.status()).isEqualTo(403);

        // Owner issues credit
        UUID key = UUID.randomUUID();
        Response ownerResp = post("/api/v1/customers/" + custId + "/store-credit", ownerToken, """
                {
                    "amountKobo": 300000,
                    "reason": "RETURN_REFUND",
                    "note": "Refund for unopened tin"
                }
                """, "Idempotency-Key", key.toString());

        assertThat(ownerResp.status()).isEqualTo(201);
        assertThat(ownerResp.body().get("storeCreditKobo").asLong()).isEqualTo(300_000L);
        assertThat(ownerResp.body().get("hasStoreCreditActivity").asBoolean()).isTrue();

        // Idempotent replay
        Response replayResp = post("/api/v1/customers/" + custId + "/store-credit", ownerToken, """
                {
                    "amountKobo": 300000,
                    "reason": "RETURN_REFUND",
                    "note": "Refund for unopened tin"
                }
                """, "Idempotency-Key", key.toString());
        assertThat(replayResp.status()).isEqualTo(201);
        assertThat(replayResp.body().get("storeCreditKobo").asLong()).isEqualTo(300_000L);

        // Key reuse with different amount returns 422
        Response conflictResp = post("/api/v1/customers/" + custId + "/store-credit", ownerToken, """
                {
                    "amountKobo": 500000,
                    "reason": "ADVANCE_DEPOSIT"
                }
                """, "Idempotency-Key", key.toString());
        assertThat(conflictResp.status()).isEqualTo(422);
        assertThat(conflictResp.code()).isEqualTo("IDEMPOTENCY_KEY_REUSED");

        // Admin can also issue credit
        Response adminResp = post("/api/v1/customers/" + custId + "/store-credit", adminToken, """
                {
                    "amountKobo": 200000,
                    "reason": "ADVANCE_DEPOSIT"
                }
                """);
        assertThat(adminResp.status()).isEqualTo(201);
        assertThat(adminResp.body().get("storeCreditKobo").asLong()).isEqualTo(500_000L);
    }

    @Test
    void saleCheckoutDrawsDownStoreCreditAtomically() {
        String asstToken = login(ASSISTANT);
        String ownerToken = login(OWNER);
        UUID custId = customer("Bisi Store Credit");
        UUID soap = product("SOAP-SC-1", 100_000, 20); // 1,000 NGN

        // Issue 350,000 kobo (3,500 NGN) store credit
        post("/api/v1/customers/" + custId + "/store-credit", ownerToken, """
                {
                    "amountKobo": 350000,
                    "reason": "ADVANCE_DEPOSIT"
                }
                """);

        // Sale: 5 soaps = 500,000 kobo total, with useStoreCredit = true (CREDIT sale)
        UUID saleKey = UUID.randomUUID();
        Response saleResp = post("/api/v1/sales", asstToken, """
                {
                    "paymentType": "CREDIT",
                    "customerId": "%s",
                    "useStoreCredit": true,
                    "lines": [{"productId": "%s", "quantity": 5}]
                }
                """.formatted(custId, soap), "Idempotency-Key", saleKey.toString());

        assertThat(saleResp.status()).isEqualTo(201);
        UUID saleId = UUID.fromString(saleResp.body().get("id").asString());
        assertThat(saleResp.body().get("totalKobo").asLong()).isEqualTo(500_000L);
        assertThat(saleResp.body().get("storeCreditUsedKobo").asLong()).isEqualTo(350_000L);
        assertThat(saleResp.body().get("unpaidKobo").asLong()).isEqualTo(150_000L);

        // Check customer balances: store credit was wiped, remaining 150,000 kobo added to debt
        Customer customer = customerRepository.findById(custId).orElseThrow();
        assertThat(customer.storeCreditKobo()).isZero();
        assertThat(customer.balanceKobo()).isEqualTo(150_000L);

        // Check ledger entries: 1 STORE_CREDIT grant (+350k), 1 STORE_CREDIT drawdown (-350k), 1 CREDIT_SALE (+150k)
        long scDrawnCount = jdbc.sql("""
                SELECT count(*) FROM ledger_entry
                WHERE customer_id = :id AND source_type = 'STORE_CREDIT' AND delta_kobo = -350000 AND source_id = :saleId
                """)
                .param("id", custId)
                .param("saleId", saleId)
                .query(Long.class).single();
        assertThat(scDrawnCount).isEqualTo(1L);

        // Now reverse the sale: restores stock AND restores store credit spent!
        Response revResp = post("/api/v1/sales/" + saleId + "/reversal", ownerToken, """
                {"reason": "CUSTOMER_RETURN"}
                """, "Idempotency-Key", UUID.randomUUID().toString());

        assertThat(revResp.status()).isEqualTo(200);
        assertThat(quantity(soap)).isEqualTo(20);

        // Customer debt relieved, store credit restored back to 350,000 kobo
        Customer afterRev = customerRepository.findById(custId).orElseThrow();
        assertThat(afterRev.balanceKobo()).isZero();
        assertThat(afterRev.storeCreditKobo()).isEqualTo(350_000L);
    }
}
