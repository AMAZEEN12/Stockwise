package ng.tesa.stockwise.api;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.support.ApiTestSupport;

/**
 * N1 / S4 (test-plan {@code MoneyJsonTest}): money and quantities are whole numbers end to end.
 * A float, a numeric string or an unknown field is refused with 400 naming the field, never
 * rounded or ignored.
 */
class MoneyJsonIT extends ApiTestSupport {

    static final String GOOD = """
            {"reference":"MILK-400","name":"Peak Milk 400g","category":"Dairy","priceKobo":420000,"quantity":10,"lowStockThreshold":3}""";

    String fieldOf(ApiTestSupport.Response response) {
        assertThat(response.status()).as("%s", response.body()).isEqualTo(400);
        assertThat(response.code()).isEqualTo("VALIDATION_FAILED");
        return response.body().get("errors").get(0).get("field").asString();
    }

    @Test
    void fractionalKoboIsRefused() {
        String owner = login(OWNER);
        assertThat(fieldOf(post("/api/v1/products", owner, GOOD.replace("420000", "4200.5")))).isEqualTo("priceKobo");
        assertThat(count("product")).isZero();
    }

    @Test
    void numberAsStringIsRefused() {
        assertThat(fieldOf(post("/api/v1/products", login(OWNER), GOOD.replace("420000", "\"420000\"")))).isEqualTo("priceKobo");
    }

    @Test
    void fractionalQuantityIsRefused() {
        String owner = login(OWNER);
        assertThat(fieldOf(post("/api/v1/products", owner, GOOD.replace("\"quantity\":10", "\"quantity\":1.5")))).isEqualTo("quantity");

        String milk = post("/api/v1/products", owner, GOOD).body().get("id").asString();
        var sale = sell(login(ASSISTANT), "{\"paymentType\":\"PAID\",\"lines\":[{\"productId\":\"" + milk + "\",\"quantity\":1.5}]}");
        assertThat(fieldOf(sale)).isEqualTo("lines[0].quantity");
        assertThat(count("sale")).isZero();
    }

    /** Contract additionalProperties: false. A client can't slip in a price on a sale line. */
    @Test
    void unknownFieldIsRefused() {
        String owner = login(OWNER);
        String milk = post("/api/v1/products", owner, GOOD).body().get("id").asString();
        var sale = sell(login(ASSISTANT),
                "{\"paymentType\":\"PAID\",\"lines\":[{\"productId\":\"" + milk + "\",\"quantity\":1,\"unitPriceKobo\":1}]}");
        assertThat(fieldOf(sale)).isEqualTo("lines[0].unitPriceKobo");
    }

    @Test
    void missingAndNegativeNumbersAreRefused() {
        String owner = login(OWNER);
        assertThat(fieldOf(post("/api/v1/products", owner, GOOD.replace("\"priceKobo\":420000,", "")))).isEqualTo("priceKobo");
        assertThat(fieldOf(post("/api/v1/products", owner, GOOD.replace("420000", "-1")))).isEqualTo("priceKobo");
    }

    @Test
    void moneyIsWrittenAsIntegers() {
        var product = post("/api/v1/products", login(OWNER), GOOD).body();
        assertThat(product.get("priceKobo").isIntegralNumber()).isTrue();
        assertThat(product.get("priceKobo").toString()).isEqualTo("420000");
    }
}
