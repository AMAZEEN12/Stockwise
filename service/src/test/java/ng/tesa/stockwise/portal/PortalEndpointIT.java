package ng.tesa.stockwise.portal;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import ng.tesa.stockwise.customer.CustomerRepository;
import ng.tesa.stockwise.product.ProductRepository;
import ng.tesa.stockwise.support.ApiTestSupport;

class PortalEndpointIT extends ApiTestSupport {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Test
    void unauthenticatedCustomerAccessesPortalDetailsWithValidUuid() {
        UUID custId = customer("Chinedu Eze");

        // Public customer without token (null token passed)
        Response resp = get("/api/v1/portal/customer/" + custId, null);

        assertThat(resp.status()).isEqualTo(200);
        assertThat(resp.body().get("shop").get("name").asString()).isEqualTo("Ngozi Provisions Store");
        assertThat(resp.body().get("customer").get("displayName").asString()).isEqualTo("Chinedu Eze");
        assertThat(resp.body().get("customer").get("balanceKobo").asLong()).isZero();
        assertThat(resp.body().get("tokenExpiresAt")).isNotNull();
    }

    @Test
    void unauthenticatedCustomerAccessesDemoToken() {
        customer("Mama Chidi");
        Response resp = get("/api/v1/portal/customer/chidi-demo-token", null);

        assertThat(resp.status()).isEqualTo(200);
        assertThat(resp.body().get("shop").get("currency").asString()).isEqualTo("NGN");
        assertThat(resp.body().get("customer")).isNotNull();
    }

    @Test
    void expiredTokenReturns410Gone() {
        Response resp = get("/api/v1/portal/customer/expired-token", null);

        assertThat(resp.status()).isEqualTo(410);
        assertThat(resp.code()).isEqualTo("TOKEN_EXPIRED");
    }

    @Test
    void invalidTokenReturns404NotFound() {
        Response resp = get("/api/v1/portal/customer/invalid-token", null);

        assertThat(resp.status()).isEqualTo(404);
        assertThat(resp.code()).isEqualTo("NOT_FOUND");
    }

    @Test
    void unauthenticatedCustomerBrowsesActiveProducts() {
        UUID custId = customer("Amaka Okoye");
        product("PORTAL-RICE-1", 45_000, 20);

        Response resp = get("/api/v1/portal/customer/" + custId + "/products?q=PORTAL-RICE", null);

        assertThat(resp.status()).isEqualTo(200);
        assertThat(resp.body().get("items").asArray()).isNotEmpty();
        assertThat(resp.body().get("items").get(0).get("name").asString()).isEqualTo("Product PORTAL-RICE-1");
        assertThat(resp.body().get("items").get(0).get("priceKobo").asLong()).isEqualTo(45_000L);
    }

    @Test
    void unauthenticatedCustomerSubmitsPreOrder() {
        UUID custId = customer("Tobi Salami");
        UUID bread = product("PORTAL-BREAD-1", 120_000, 15);

        String orderBody = """
                {
                    "lines": [
                        { "productId": "%s", "quantity": 2 }
                    ],
                    "paymentPreference": "PAY_ON_PICKUP",
                    "pickupNote": "Will pick up around 6pm"
                }
                """.formatted(bread);

        Response resp = post("/api/v1/portal/customer/" + custId + "/orders", null, orderBody);

        assertThat(resp.status()).isEqualTo(201);
        assertThat(resp.body().get("orderNumber").asString()).startsWith("ORD-");
        assertThat(resp.body().get("customerName").asString()).isEqualTo("Tobi Salami");
        assertThat(resp.body().get("itemsCount").asInt()).isEqualTo(2);
        assertThat(resp.body().get("totalKobo").asLong()).isEqualTo(240_000L);
        assertThat(resp.body().get("whatsappUrl").asString()).contains("wa.me");
    }

    @Test
    void preOrderWithInsufficientStockReturns409() {
        UUID custId = customer("Ifeanyi Obi");
        UUID egg = product("PORTAL-EGG-1", 10_000, 2);

        String orderBody = """
                {
                    "lines": [
                        { "productId": "%s", "quantity": 10 }
                    ],
                    "paymentPreference": "PAY_ON_PICKUP"
                }
                """.formatted(egg);

        Response resp = post("/api/v1/portal/customer/" + custId + "/orders", null, orderBody);

        assertThat(resp.status()).isEqualTo(409);
        assertThat(resp.code()).isEqualTo("INSUFFICIENT_STOCK");
    }

    @Test
    void staffProtectedRoutesStillRejectUnauthenticatedRequests() {
        Response resp = post("/api/v1/sales", null, "{}");
        assertThat(resp.status()).isEqualTo(401);
    }
}
