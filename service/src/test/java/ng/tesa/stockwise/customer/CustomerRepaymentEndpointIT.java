package ng.tesa.stockwise.customer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import ng.tesa.stockwise.sale.NewSale;
import ng.tesa.stockwise.sale.PaymentType;
import ng.tesa.stockwise.sale.SaleService;
import ng.tesa.stockwise.support.ApiTestSupport;

class CustomerRepaymentEndpointIT extends ApiTestSupport {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private SaleService saleService;

    @Test
    void cashierRecordsRepaymentAllocatedOldestFirst() {
        String asstToken = login(ASSISTANT);
        UUID custId = customer("Ngozi Obi");
        UUID bread = product("BREAD-REP-1", 100_000, 50);
        UUID milk = product("MILK-REP-1", 50_000, 50);

        // Credit sale 1: 5 breads = 500,000 kobo
        var sale1 = saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, custId, null, List.of(new NewSale.Line(bread, 5))), assistantId).sale();

        // Credit sale 2: 10 milks = 500,000 kobo
        var sale2 = saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, custId, null, List.of(new NewSale.Line(milk, 10))), assistantId).sale();

        assertThat(balance(custId)).isEqualTo(1_000_000L);

        // Repay 700,000 kobo: clears sale1 (500,000) and partly clears sale2 (200,000)
        UUID key = UUID.randomUUID();
        Response resp = post("/api/v1/repayments", asstToken, """
                {
                    "customerId": "%s",
                    "amountKobo": 700000
                }
                """.formatted(custId), "Idempotency-Key", key.toString());

        assertThat(resp.status()).isEqualTo(201);
        assertThat(resp.body().get("customerId").asString()).isEqualTo(custId.toString());
        assertThat(resp.body().get("amountKobo").asLong()).isEqualTo(700_000L);
        assertThat(resp.body().get("balanceAfterKobo").asLong()).isEqualTo(300_000L);
        assertThat(resp.body().get("allocations")).hasSize(2);

        assertThat(balance(custId)).isEqualTo(300_000L);

        long s1Unpaid = jdbc.sql("SELECT unpaid_kobo FROM sale WHERE id = :id").param("id", sale1.id()).query(Long.class).single();
        long s2Unpaid = jdbc.sql("SELECT unpaid_kobo FROM sale WHERE id = :id").param("id", sale2.id()).query(Long.class).single();
        assertThat(s1Unpaid).isZero();
        assertThat(s2Unpaid).isEqualTo(300_000L);

        // Test replay with same idempotency key returns identical 201 without re-allocating
        Response replayResp = post("/api/v1/repayments", asstToken, """
                {
                    "customerId": "%s",
                    "amountKobo": 700000
                }
                """.formatted(custId), "Idempotency-Key", key.toString());

        assertThat(replayResp.status()).isEqualTo(201);
        assertThat(balance(custId)).isEqualTo(300_000L);

        // Replay with same key and different body returns 422 IDEMPOTENCY_KEY_REUSED
        Response reusedResp = post("/api/v1/repayments", asstToken, """
                {
                    "customerId": "%s",
                    "amountKobo": 200000
                }
                """.formatted(custId), "Idempotency-Key", key.toString());

        assertThat(reusedResp.status()).isEqualTo(422);
        assertThat(reusedResp.code()).isEqualTo("IDEMPOTENCY_KEY_REUSED");
    }

    @Test
    void repaymentExceedingDebtReturns400() {
        String asstToken = login(ASSISTANT);
        UUID custId = customer("Emeka Repay");
        UUID bread = product("BREAD-REP-2", 100_000, 50);

        saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, custId, null, List.of(new NewSale.Line(bread, 2))), assistantId);

        assertThat(balance(custId)).isEqualTo(200_000L);

        Response resp = post("/api/v1/repayments", asstToken, """
                {
                    "customerId": "%s",
                    "amountKobo": 500000
                }
                """.formatted(custId));

        assertThat(resp.status()).isEqualTo(400);
        assertThat(resp.code()).isEqualTo("VALIDATION_FAILED");
        assertThat(balance(custId)).isEqualTo(200_000L);
    }

    @Test
    void customerPathRepaymentWorks() {
        String asstToken = login(ASSISTANT);
        UUID custId = customer("Chioma Repay");
        UUID bread = product("BREAD-REP-3", 100_000, 50);

        saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, custId, null, List.of(new NewSale.Line(bread, 3))), assistantId);

        assertThat(balance(custId)).isEqualTo(300_000L);

        Response resp = post("/api/v1/customers/" + custId + "/repayments", asstToken, """
                {"amountKobo": 300000}
                """);

        assertThat(resp.status()).isEqualTo(201);
        assertThat(balance(custId)).isZero();
    }

    @Test
    void adminCannotRecordRepayments() {
        String adminToken = login(ADMIN);
        UUID custId = customer("Admin Repay Test");

        Response resp = post("/api/v1/repayments", adminToken, """
                {
                    "customerId": "%s",
                    "amountKobo": 100000
                }
                """.formatted(custId));

        assertThat(resp.status()).isEqualTo(403);
    }
}
