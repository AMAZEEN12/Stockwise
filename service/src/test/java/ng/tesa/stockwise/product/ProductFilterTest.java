package ng.tesa.stockwise.product;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * Contract v0.2.0 Proposal D: Product.Filter supporting optional active boolean.
 */
class ProductFilterTest {

    @Test
    void filterNoneHasAllNulls() {
        var filter = Product.Filter.none();
        assertThat(filter.q()).isNull();
        assertThat(filter.category()).isNull();
        assertThat(filter.stockState()).isNull();
        assertThat(filter.active()).isNull();
    }

    @Test
    void backwardsCompatibleConstructorSetsActiveToNull() {
        var filter = new Product.Filter("query", "Category", StockState.IN_STOCK);
        assertThat(filter.q()).isEqualTo("query");
        assertThat(filter.category()).isEqualTo("Category");
        assertThat(filter.stockState()).isEqualTo(StockState.IN_STOCK);
        assertThat(filter.active()).isNull();
    }

    @Test
    void explicitActiveConstructorSetsActive() {
        var activeFilter = new Product.Filter(null, null, null, true);
        assertThat(activeFilter.active()).isTrue();

        var inactiveFilter = new Product.Filter(null, null, null, false);
        assertThat(inactiveFilter.active()).isFalse();
    }
}
