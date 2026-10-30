package ng.tesa.stockwise.customer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import ng.tesa.stockwise.StockwiseApplication;
import ng.tesa.stockwise.sale.NewSale;
import ng.tesa.stockwise.sale.PaymentType;
import ng.tesa.stockwise.sale.SaleService;
import ng.tesa.stockwise.support.DatabaseTestSupport;

@SpringBootTest(classes = StockwiseApplication.class)
class RepaymentAllocationIT extends DatabaseTestSupport {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private SaleService saleService;

    @Test
    void repaymentAllocatesToOldestSalesFirst() {
        UUID custId = customer("Amaka Okafor");
        UUID bread = product("BREAD-1", 100_000, 50); // 1,000 NGN
        UUID milk = product("MILK-1", 50_000, 50);    // 500 NGN
        UUID sugar = product("SUGAR-1", 80_000, 50);  // 800 NGN

        // Sale 1: 10 breads = 10,000 NGN (1,000,000 kobo)
        var sale1 = saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, custId, null, List.of(new NewSale.Line(bread, 10))), cashier).sale();

        // Sale 2: 10 milks = 5,000 NGN (500,000 kobo)
        var sale2 = saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, custId, null, List.of(new NewSale.Line(milk, 10))), cashier).sale();

        // Sale 3: 10 sugars = 8,000 NGN (800,000 kobo)
        var sale3 = saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, custId, null, List.of(new NewSale.Line(sugar, 10))), cashier).sale();

        assertThat(balance(custId)).isEqualTo(2_300_000L);

        // Repayment 1: 12,000 NGN (1,200,000 kobo)
        List<RepaymentAllocation> allocs1 = customerRepository.recordRepayment(custId, 1_200_000L, cashier);

        assertThat(allocs1).hasSize(2);
        assertThat(allocs1.get(0).saleId()).isEqualTo(sale1.id());
        assertThat(allocs1.get(0).amountKobo()).isEqualTo(1_000_000L);
        assertThat(allocs1.get(1).saleId()).isEqualTo(sale2.id());
        assertThat(allocs1.get(1).amountKobo()).isEqualTo(200_000L);

        assertThat(balance(custId)).isEqualTo(1_100_000L);

        // Verify remaining unpaid kobo on sales
        long s1Unpaid = jdbc.sql("SELECT unpaid_kobo FROM sale WHERE id = :id").param("id", sale1.id()).query(Long.class).single();
        long s2Unpaid = jdbc.sql("SELECT unpaid_kobo FROM sale WHERE id = :id").param("id", sale2.id()).query(Long.class).single();
        long s3Unpaid = jdbc.sql("SELECT unpaid_kobo FROM sale WHERE id = :id").param("id", sale3.id()).query(Long.class).single();

        assertThat(s1Unpaid).isZero();
        assertThat(s2Unpaid).isEqualTo(300_000L);
        assertThat(s3Unpaid).isEqualTo(800_000L);

        // Repayment 2: 11,000 NGN (1,100,000 kobo)
        List<RepaymentAllocation> allocs2 = customerRepository.recordRepayment(custId, 1_100_000L, cashier);

        assertThat(allocs2).hasSize(2);
        assertThat(allocs2.get(0).saleId()).isEqualTo(sale2.id());
        assertThat(allocs2.get(0).amountKobo()).isEqualTo(300_000L);
        assertThat(allocs2.get(1).saleId()).isEqualTo(sale3.id());
        assertThat(allocs2.get(1).amountKobo()).isEqualTo(800_000L);

        assertThat(balance(custId)).isZero();

        s2Unpaid = jdbc.sql("SELECT unpaid_kobo FROM sale WHERE id = :id").param("id", sale2.id()).query(Long.class).single();
        s3Unpaid = jdbc.sql("SELECT unpaid_kobo FROM sale WHERE id = :id").param("id", sale3.id()).query(Long.class).single();
        assertThat(s2Unpaid).isZero();
        assertThat(s3Unpaid).isZero();
    }

    @Test
    void cannotRepayMoreThanCustomerDebt() {
        UUID custId = customer("Chinedu");
        UUID bread = product("BREAD-2", 100_000, 50);

        saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, custId, null, List.of(new NewSale.Line(bread, 2))), cashier);

        assertThat(balance(custId)).isEqualTo(200_000L);

        assertThatThrownBy(() -> customerRepository.recordRepayment(custId, 300_000L, cashier))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("exceeds outstanding debt");

        assertThat(balance(custId)).isEqualTo(200_000L);
    }

    @Test
    void repaymentAllocationsAreImmutable() {
        UUID custId = customer("Emeka");
        UUID bread = product("BREAD-3", 100_000, 50);

        var sale = saleService.record(UUID.randomUUID(),
                new NewSale(PaymentType.CREDIT, custId, null, List.of(new NewSale.Line(bread, 1))), cashier).sale();

        List<RepaymentAllocation> allocs = customerRepository.recordRepayment(custId, 100_000L, cashier);
        UUID allocId = allocs.getFirst().id();

        assertThatThrownBy(() -> jdbc.sql("UPDATE repayment_allocation SET amount_kobo = 500 WHERE id = :id")
                .param("id", allocId)
                .update())
                .hasMessageContaining("repayment_allocation rows are append-only");

        assertThatThrownBy(() -> jdbc.sql("DELETE FROM repayment_allocation WHERE id = :id")
                .param("id", allocId)
                .update())
                .hasMessageContaining("repayment_allocation rows are append-only");
    }
}
