package ng.tesa.stockwise.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import ng.tesa.stockwise.common.Page;
import ng.tesa.stockwise.support.DatabaseTestSupport;

/** The catalogue (spec R1, R2) at the database level. HTTP and role checks belong to {@code ProductIT}. */
class ProductRepositoryIT extends DatabaseTestSupport {

    @Autowired
    ProductRepository products;

    static Product.New milk(int quantity) {
        return new Product.New("MILK-400", "Peak Milk 400g", "Dairy", 120_000, quantity, 5);
    }

    /** R1: a new product is stored as sent and its opening stock is a movement (R13). */
    @Test
    void createStoresTheProductAndItsOpeningMovement() {
        Product created = products.create(new Product.New("  MILK-400 ", " Peak Milk 400g ", "Dairy", 120_000, 24, 5));

        assertThat(created.reference()).isEqualTo("MILK-400");
        assertThat(created.name()).isEqualTo("Peak Milk 400g");
        assertThat(created.priceKobo()).isEqualTo(120_000);
        assertThat(created.quantity()).isEqualTo(24);
        assertThat(created.stockState()).isEqualTo(StockState.IN_STOCK);
        assertThat(created.active()).isTrue();
        assertThat(created.version()).isZero();
        assertThat(products.findById(created.id())).contains(created);
        assertThat(jdbc.sql("SELECT delta FROM stock_movement WHERE product_id = :id AND source_type = 'OPENING'")
                .param("id", created.id()).query(Integer.class).list()).containsExactly(24);
    }

    /** No zero-delta movement for a product that opens empty (stock_movement_delta_non_zero). */
    @Test
    void productOpeningWithNoStockHasNoMovement() {
        Product created = products.create(milk(0));
        assertThat(created.stockState()).isEqualTo(StockState.OUT);
        assertThat(count("stock_movement")).isZero();
    }

    /** R1: a taken reference is 409 DUPLICATE_REFERENCE, and nothing is added. */
    @Test
    void duplicateReferenceIsRefused() {
        products.create(milk(10));
        assertThatThrownBy(() -> products.create(new Product.New("MILK-400", "Other", "Dairy", 1, 3, 0)))
                .isInstanceOf(Product.DuplicateReference.class)
                .hasMessage("A product with reference \"MILK-400\" already exists.");
        assertThat(count("product")).isEqualTo(1);
        assertThat(count("stock_movement")).isEqualTo(1);
    }

    @Test
    void findByIdOfUnknownProductIsEmpty() {
        assertThat(products.findById(UUID.randomUUID())).isEmpty();
    }

    /** Contract StockState: at the threshold is LOW, 0 is OUT, inactive is ARCHIVED whatever the quantity. */
    @Test
    void stockStateFollowsTheContract() {
        assertThat(StockState.of(true, 6, 5)).isEqualTo(StockState.IN_STOCK);
        assertThat(StockState.of(true, 5, 5)).isEqualTo(StockState.LOW);
        assertThat(StockState.of(true, 1, 5)).isEqualTo(StockState.LOW);
        assertThat(StockState.of(true, 0, 5)).isEqualTo(StockState.OUT);
        assertThat(StockState.of(true, 0, 0)).isEqualTo(StockState.OUT);
        assertThat(StockState.of(false, 50, 5)).isEqualTo(StockState.ARCHIVED);
    }

    /** R2: every filter on its own, filters combined, and "All" (no filter) including archived products. */
    @Test
    void filtersCombineAndCanBeCleared() {
        UUID inStock = products.create(new Product.New("MILK-400", "Peak Milk 400g", "Dairy", 120_000, 20, 5)).id();
        UUID low = products.create(new Product.New("YOG-1", "Hollandia Yoghurt", "Dairy", 90_000, 5, 5)).id();
        UUID out = products.create(new Product.New("RICE-5", "Mama Gold Rice 5kg", "Grains", 850_000, 0, 2)).id();
        UUID archived = products.create(new Product.New("MILK-OLD", "Peak Milk 170g (old tin)", "Dairy", 50_000, 7, 2)).id();
        jdbc.sql("UPDATE product SET active = false WHERE id = :id").param("id", archived).update();

        assertThat(ids(Product.Filter.none())).containsExactlyInAnyOrder(inStock, low, out, archived);
        assertThat(ids(new Product.Filter(null, null, StockState.IN_STOCK))).containsExactly(inStock);
        assertThat(ids(new Product.Filter(null, null, StockState.LOW))).containsExactly(low);
        assertThat(ids(new Product.Filter(null, null, StockState.OUT))).containsExactly(out);
        assertThat(ids(new Product.Filter(null, null, StockState.ARCHIVED))).containsExactly(archived);
        assertThat(ids(new Product.Filter(null, "dairy", null))).containsExactlyInAnyOrder(inStock, low, archived);
        assertThat(ids(new Product.Filter("peak milk", null, null))).containsExactlyInAnyOrder(inStock, archived);
        assertThat(ids(new Product.Filter("rice-5", null, null))).containsExactly(out);
        assertThat(ids(new Product.Filter("milk", "Dairy", StockState.IN_STOCK))).containsExactly(inStock);
        assertThat(ids(new Product.Filter("milk", "Grains", null))).isEmpty();
        assertThat(ids(new Product.Filter(null, null, null, true))).containsExactlyInAnyOrder(inStock, low, out);
        assertThat(ids(new Product.Filter(null, null, null, false))).containsExactly(archived);
    }

    /** R2: a keyword is plain text, so % and _ match only themselves. */
    @Test
    void keywordWildcardsAreLiteral() {
        products.create(new Product.New("A_1", "Sugar 100% cane", "Grocery", 10_000, 1, 0));
        products.create(new Product.New("AB1", "Salt", "Grocery", 10_000, 1, 0));

        assertThat(products.list(new Product.Filter("%", null, null), Page.Request.first()).items())
                .extracting(Product::name).containsExactly("Sugar 100% cane");
        assertThat(products.list(new Product.Filter("a_", null, null), Page.Request.first()).items())
                .extracting(Product::reference).containsExactly("A_1");
    }

    /** Pages are stable (name, then ID) and report the total across pages. */
    @Test
    void pagesAreOrderedByNameWithTotals() {
        for (String name : List.of("Eggs", "bread", "Cornflakes", "Apples", "Dates")) {
            products.create(new Product.New(name.toUpperCase(), name, "Grocery", 10_000, 1, 0));
        }
        Page<Product> first = products.list(Product.Filter.none(), new Page.Request(0, 2));
        Page<Product> last = products.list(Product.Filter.none(), new Page.Request(2, 2));

        assertThat(first.items()).extracting(Product::name).containsExactly("Apples", "bread");
        assertThat(first.totalItems()).isEqualTo(5);
        assertThat(last.items()).extracting(Product::name).containsExactly("Eggs");
        assertThat(last.page()).isEqualTo(2);
        assertThat(last.size()).isEqualTo(2);
    }

    @Test
    void pageRequestLimitsFollowTheContract() {
        assertThatThrownBy(() -> new Page.Request(-1, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Page.Request(0, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Page.Request(0, 101)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void listCategoriesReturnsAlphabeticallySortedDistinctCategories() {
        products.create(new Product.New("P1", "Product 1", "Dairy", 10_000, 1, 0));
        products.create(new Product.New("P2", "Product 2", "beverages", 10_000, 1, 0));
        products.create(new Product.New("P3", "Product 3", "Dairy", 10_000, 1, 0));
        products.create(new Product.New("P4", "Product 4", "Grains", 10_000, 1, 0));

        List<String> categories = products.listCategories();
        assertThat(categories).containsExactly("beverages", "Dairy", "Grains");
    }

    private List<UUID> ids(Product.Filter filter) {
        return products.list(filter, Page.Request.first()).items().stream().map(Product::id).toList();
    }
}
