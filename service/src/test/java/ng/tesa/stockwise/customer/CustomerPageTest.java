package ng.tesa.stockwise.customer;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.common.Page;

/**
 * Contract v0.2.0 Proposal B: CustomerPage contains asOf timestamp.
 */
class CustomerPageTest {

    @Test
    void customerPageOfPopulatesAllFieldsIncludingAsOf() {
        var now = Instant.now();
        var customer = new Customer(UUID.randomUUID(), "Ada Okafor", "Shop 1", 0L, 0L, now);
        var page = new Page<>(List.of(customer), 0, 20, 1L);

        var customerPage = CustomerPage.of(page, now);

        assertThat(customerPage.items()).containsExactly(customer);
        assertThat(customerPage.page()).isZero();
        assertThat(customerPage.size()).isEqualTo(20);
        assertThat(customerPage.totalItems()).isEqualTo(1L);
        assertThat(customerPage.asOf()).isEqualTo(now);
    }
}
