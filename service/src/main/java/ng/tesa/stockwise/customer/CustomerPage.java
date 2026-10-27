package ng.tesa.stockwise.customer;

import java.time.Instant;
import java.util.List;

import ng.tesa.stockwise.common.Page;

/** Contract {@code CustomerPage}. Includes the {@code asOf} timestamp when the page was queried. */
public record CustomerPage(
        List<Customer> items,
        int page,
        int size,
        long totalItems,
        Instant asOf) {

    public static CustomerPage of(Page<Customer> page, Instant asOf) {
        return new CustomerPage(page.items(), page.page(), page.size(), page.totalItems(), asOf);
    }
}
