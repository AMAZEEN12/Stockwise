package ng.tesa.stockwise.customer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import ng.tesa.stockwise.common.Page;
import ng.tesa.stockwise.support.DatabaseTestSupport;

/** Customers (spec R7) at the database level. HTTP and role checks belong to {@code CustomerIT}. */
class CustomerRepositoryIT extends DatabaseTestSupport {

    @Autowired
    CustomerRepository customers;

    /** R7: a new customer owes nothing and holds no store credit. */
    @Test
    void createStartsWithZeroBalanceAndStoreCredit() {
        Customer ada = customers.create(new Customer.New("  Ada Okafor ", " Shop 14, Ariaria "));

        assertThat(ada.displayName()).isEqualTo("Ada Okafor");
        assertThat(ada.contactPlaceholder()).isEqualTo("Shop 14, Ariaria");
        assertThat(ada.balanceKobo()).isZero();
        assertThat(ada.storeCreditKobo()).isZero();
        assertThat(customers.findById(ada.id())).contains(ada);
    }

    @Test
    void blankContactIsStoredAsNone() {
        assertThat(customers.create(new Customer.New("Ada", "  ")).contactPlaceholder()).isNull();
        assertThat(customers.create(new Customer.New("Bola", null)).contactPlaceholder()).isNull();
    }

    /** Two customers may share a name. */
    @Test
    void sameNameIsAllowed() {
        customers.create(new Customer.New("Mama Ngozi", null));
        customers.create(new Customer.New("Mama Ngozi", null));
        assertThat(count("customer")).isEqualTo(2);
    }

    @Test
    void findByIdOfUnknownCustomerIsEmpty() {
        assertThat(customers.findById(UUID.randomUUID())).isEmpty();
    }

    /** The keyword is case-insensitive plain text; pages are ordered by name with a total. */
    @Test
    void listFiltersByNameAndPages() {
        customers.create(new Customer.New("Chidi Eze", null));
        customers.create(new Customer.New("ada Okafor", null));
        customers.create(new Customer.New("Bola Ade", null));
        customers.create(new Customer.New("100% Cash Ltd", null));

        assertThat(customers.list(null, Page.Request.first()).items()).extracting(Customer::displayName)
                .containsExactly("100% Cash Ltd", "ada Okafor", "Bola Ade", "Chidi Eze");
        assertThat(customers.list("ADE", Page.Request.first()).items()).extracting(Customer::displayName)
                .containsExactly("Bola Ade");
        assertThat(customers.list("%", Page.Request.first()).items()).extracting(Customer::displayName)
                .containsExactly("100% Cash Ltd");

        Page<Customer> second = customers.list(null, new Page.Request(1, 3));
        assertThat(second.items()).extracting(Customer::displayName).containsExactly("Chidi Eze");
        assertThat(second.totalItems()).isEqualTo(4);
    }
}
