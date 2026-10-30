package ng.tesa.stockwise.reversal;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import ng.tesa.stockwise.customer.CustomerRepository;
import ng.tesa.stockwise.support.ApiTestSupport;

class SaleReversalIT extends ApiTestSupport {

    @Autowired
    private CustomerRepository customerRepository;

    @Test
    void reversingPaidSaleRestoresStockAndAppendsMovement() {
        UUID coke = product("COKE-REV-1", 200_000, 10);
        String ownerToken = login(OWNER);

        Response saleResp = sell(ownerToken, """
                {"paymentType":"PAID","lines":[{"productId":"%s","quantity":3}]}
                """.formatted(coke));
        assertThat(saleResp.status()).isEqualTo(201);
        UUID saleId = UUID.fromString(saleResp.body().get("id").asString());
        assertThat(quantity(coke)).isEqualTo(7);

        UUID key = UUID.randomUUID();
        Response revResp = post("/api/v1/sales/" + saleId + "/reversal", ownerToken, """
                {"reason":"CUSTOMER_RETURN","note":"Customer changed mind"}
                """, "Idempotency-Key", key.toString());

        assertThat(revResp.status()).isEqualTo(200);
        assertThat(revResp.body().get("saleId").asString()).isEqualTo(saleId.toString());
        assertThat(revResp.body().get("reason").asString()).isEqualTo("CUSTOMER_RETURN");
        assertThat(revResp.body().get("note").asString()).isEqualTo("Customer changed mind");
        assertThat(revResp.body().get("stockRestored").asBoolean()).isTrue();

        // Verify stock is restored
        assertThat(quantity(coke)).isEqualTo(10);

        // Verify stock movement entry
        long movements = jdbc.sql("""
                SELECT count(*) FROM stock_movement
                WHERE source_id = :saleId AND source_type = 'SALE_REVERSAL' AND delta = 3
                """)
                .param("saleId", saleId)
                .query(Long.class)
                .single();
        assertThat(movements).isEqualTo(1L);

        // Verify sale record is marked reversed
        String status = jdbc.sql("SELECT reversal_reason FROM sale WHERE id = :id")
                .param("id", saleId)
                .query(String.class)
                .single();
        assertThat(status).isEqualTo("CUSTOMER_RETURN");
    }

    @Test
    void reversingPartiallyRepaidCreditSaleIssuesStoreCredit() {
        UUID bread = product("BREAD-REV-2", 100_000, 50); // 1,000 NGN
        UUID custId = customer("Ngozi Proposal Customer");
        String ownerToken = login(OWNER);

        // Credit sale A: 10 breads = 10,000 NGN (1,000,000 kobo)
        Response saleAResp = sell(ownerToken, """
                {"paymentType":"CREDIT","customerId":"%s","lines":[{"productId":"%s","quantity":10}]}
                """.formatted(custId, bread));
        UUID saleAId = UUID.fromString(saleAResp.body().get("id").asString());

        // Credit sale B: 5 breads = 5,000 NGN (500,000 kobo)
        Response saleBResp = sell(ownerToken, """
                {"paymentType":"CREDIT","customerId":"%s","lines":[{"productId":"%s","quantity":5}]}
                """.formatted(custId, bread));
        UUID saleBId = UUID.fromString(saleBResp.body().get("id").asString());

        // Total customer debt = 1,500,000 kobo
        assertThat(balance(custId)).isEqualTo(1_500_000L);

        // Repay 6,000 NGN (600,000 kobo) allocated to oldest (Sale A)
        customerRepository.recordRepayment(custId, 600_000L, ownerId);

        assertThat(balance(custId)).isEqualTo(900_000L);

        // Reverse Sale A
        UUID key = UUID.randomUUID();
        Response revResp = post("/api/v1/sales/" + saleAId + "/reversal", ownerToken, """
                {"reason":"CUSTOMER_RETURN","note":"Defective batch"}
                """, "Idempotency-Key", key.toString());

        assertThat(revResp.status()).isEqualTo(200);
        assertThat(revResp.body().get("debtRemovedKobo").asLong()).isEqualTo(400_000L);
        assertThat(revResp.body().get("storeCreditAddedKobo").asLong()).isEqualTo(600_000L);

        // Customer remaining debt is only Sale B's 500,000 kobo
        assertThat(balance(custId)).isEqualTo(500_000L);

        // Customer store credit gained the 600,000 kobo repaid on A
        long storeCredit = jdbc.sql("SELECT store_credit_kobo FROM customer WHERE id = :id")
                .param("id", custId)
                .query(Long.class)
                .single();
        assertThat(storeCredit).isEqualTo(600_000L);

        // Sale A has unpaid_kobo = 0
        long saleAUnpaid = jdbc.sql("SELECT unpaid_kobo FROM sale WHERE id = :id")
                .param("id", saleAId)
                .query(Long.class)
                .single();
        assertThat(saleAUnpaid).isZero();
    }

    @Test
    void assistantRequiresValidSupervisorOtp() {
        UUID biscuit = product("BISCUIT-REV-3", 50_000, 20);
        String assistantToken = login(ASSISTANT);
        String ownerToken = login(OWNER);

        Response saleResp = sell(assistantToken, """
                {"paymentType":"PAID","lines":[{"productId":"%s","quantity":2}]}
                """.formatted(biscuit));
        UUID saleId = UUID.fromString(saleResp.body().get("id").asString());

        // 1. Assistant without code fails
        Response noCode = post("/api/v1/sales/" + saleId + "/reversal", assistantToken, """
                {"reason":"CUSTOMER_RETURN"}
                """, "Idempotency-Key", UUID.randomUUID().toString());
        assertThat(noCode.status()).isEqualTo(409);
        assertThat(noCode.code()).isEqualTo("INVALID_AUTHORIZATION_CODE");

        // 2. Assistant with invalid code fails
        Response badCode = post("/api/v1/sales/" + saleId + "/reversal", assistantToken, """
                {"reason":"CUSTOMER_RETURN","authorizationCode":"999999"}
                """, "Idempotency-Key", UUID.randomUUID().toString());
        assertThat(badCode.status()).isEqualTo(409);
        assertThat(badCode.code()).isEqualTo("INVALID_AUTHORIZATION_CODE");

        // 3. Owner creates 6-digit OTP code bound to saleId
        Response authResp = post("/api/v1/reversals/authorizations", ownerToken, """
                {"saleId":"%s","validMinutes":15}
                """.formatted(saleId));
        assertThat(authResp.status()).isEqualTo(201);
        String code = authResp.body().get("code").asString();
        assertThat(code).matches("^[0-9]{6}$");

        // 4. Assistant uses valid OTP code -> success
        Response okResp = post("/api/v1/sales/" + saleId + "/reversal", assistantToken, """
                {"reason":"CUSTOMER_RETURN","authorizationCode":"%s"}
                """.formatted(code), "Idempotency-Key", UUID.randomUUID().toString());
        assertThat(okResp.status()).isEqualTo(200);

        // 5. Trying to reuse same OTP code fails
        Response reusedCode = post("/api/v1/sales/" + saleId + "/reversal", assistantToken, """
                {"reason":"CUSTOMER_RETURN","authorizationCode":"%s"}
                """.formatted(code), "Idempotency-Key", UUID.randomUUID().toString());
        assertThat(reusedCode.status()).isEqualTo(409);
        // Can be SALE_ALREADY_REVERSED or AUTHORIZATION_ALREADY_USED depending on check order
        assertThat(reusedCode.code()).isIn("SALE_ALREADY_REVERSED", "AUTHORIZATION_ALREADY_USED");
    }

    @Test
    void reversalIsIdempotentWithSameKey() {
        UUID soap = product("SOAP-REV-4", 150_000, 20);
        String ownerToken = login(OWNER);

        Response saleResp = sell(ownerToken, """
                {"paymentType":"PAID","lines":[{"productId":"%s","quantity":2}]}
                """.formatted(soap));
        UUID saleId = UUID.fromString(saleResp.body().get("id").asString());
        assertThat(quantity(soap)).isEqualTo(18);

        UUID key = UUID.randomUUID();
        String body = """
                {"reason":"BILLING_ERROR","note":"Wrong quantity entered"}
                """;

        // First attempt
        Response first = post("/api/v1/sales/" + saleId + "/reversal", ownerToken, body,
                "Idempotency-Key", key.toString());
        assertThat(first.status()).isEqualTo(200);
        assertThat(quantity(soap)).isEqualTo(20);

        // Second attempt with exact same key and body -> returns 200 replay without duplicating effects
        Response second = post("/api/v1/sales/" + saleId + "/reversal", ownerToken, body,
                "Idempotency-Key", key.toString());
        assertThat(second.status()).isEqualTo(200);
        assertThat(second.body().get("reversalId").asString()).isEqualTo(first.body().get("reversalId").asString());
        assertThat(quantity(soap)).isEqualTo(20);

        // Third attempt with same key but different body -> 422 IDEMPOTENCY_KEY_REUSED
        Response conflict = post("/api/v1/sales/" + saleId + "/reversal", ownerToken, """
                {"reason":"CUSTOMER_RETURN","note":"Different body"}
                """, "Idempotency-Key", key.toString());
        assertThat(conflict.status()).isEqualTo(422);
        assertThat(conflict.code()).isEqualTo("IDEMPOTENCY_KEY_REUSED");
    }

    @Test
    void cannotReverseAlreadyReversedSaleWithDifferentKey() {
        UUID oil = product("OIL-REV-5", 300_000, 10);
        String ownerToken = login(OWNER);

        Response saleResp = sell(ownerToken, """
                {"paymentType":"PAID","lines":[{"productId":"%s","quantity":1}]}
                """.formatted(oil));
        UUID saleId = UUID.fromString(saleResp.body().get("id").asString());

        // First reversal
        Response first = post("/api/v1/sales/" + saleId + "/reversal", ownerToken, """
                {"reason":"CUSTOMER_RETURN"}
                """, "Idempotency-Key", UUID.randomUUID().toString());
        assertThat(first.status()).isEqualTo(200);

        // Second reversal with fresh key
        Response second = post("/api/v1/sales/" + saleId + "/reversal", ownerToken, """
                {"reason":"CUSTOMER_RETURN"}
                """, "Idempotency-Key", UUID.randomUUID().toString());
        assertThat(second.status()).isEqualTo(409);
        assertThat(second.code()).isEqualTo("SALE_ALREADY_REVERSED");
    }

    @Test
    void reversingLegacySaleWithoutAllocationsRequiresManualReview() {
        UUID rice = product("RICE-REV-6", 500_000, 20);
        UUID custId = customer("Legacy Customer");
        String ownerToken = login(OWNER);

        Response saleResp = sell(ownerToken, """
                {"paymentType":"CREDIT","customerId":"%s","lines":[{"productId":"%s","quantity":2}]}
                """.formatted(custId, rice));
        UUID saleId = UUID.fromString(saleResp.body().get("id").asString());

        // Simulate legacy unallocated repayment: unpaid_kobo reduced on sale without repayment_allocation record
        jdbc.sql("UPDATE sale SET unpaid_kobo = 400000 WHERE id = :id").param("id", saleId).update();

        // Reversal should be blocked for manual review
        Response blocked = post("/api/v1/sales/" + saleId + "/reversal", ownerToken, """
                {"reason":"CUSTOMER_RETURN"}
                """, "Idempotency-Key", UUID.randomUUID().toString());

        assertThat(blocked.status()).isEqualTo(409);
        assertThat(blocked.code()).isEqualTo("REVERSAL_MANUAL_REVIEW_REQUIRED");
    }
}
