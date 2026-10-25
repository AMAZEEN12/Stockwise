package ng.tesa.stockwise.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import ng.tesa.stockwise.config.AppProperties;
import ng.tesa.stockwise.support.ApiTestSupport;

/**
 * R15, N2, N3: the service decides who may do what, whatever the interface shows. A wrong role
 * gets 403 and changes nothing; a missing, forged, expired or orphaned token gets 401. The
 * wrong-role tests must fail when the role check in SecurityConfig is removed (rule-removal log).
 */
class AuthorizationIT extends ApiTestSupport {

    static final String PRODUCT = """
            {"reference":"MILK-400","name":"Peak Milk 400g","category":"Dairy","priceKobo":420000,"quantity":10,"lowStockThreshold":3}""";

    @Autowired
    AppProperties properties;

    /** R15: an assistant can't add a product, even by calling the service directly. */
    @Test
    void assistantCannotAddAProduct() {
        var response = post("/api/v1/products", login(ASSISTANT), PRODUCT);
        assertThat(response.status()).isEqualTo(403);
        assertThat(response.code()).isEqualTo("FORBIDDEN");
        assertThat(response.header("Content-Type")).startsWith("application/problem+json");
        assertThat(count("product")).isZero();
    }

    @Test
    void ownerCanAddAProduct() {
        assertThat(post("/api/v1/products", login(OWNER), PRODUCT).status()).isEqualTo(201);
    }

    /** Contract: sales and customers are OWNER or ASSISTANT; ADMIN reverses (later), it doesn't sell. */
    @Test
    void adminCannotSellOrAddCustomers() {
        UUID milk = product("MILK-400", 420_000, 5);
        String admin = login(ADMIN);

        var sale = sell(admin, "{\"paymentType\":\"PAID\",\"lines\":[{\"productId\":\"" + milk + "\",\"quantity\":1}]}");
        var customer = post("/api/v1/customers", admin, "{\"displayName\":\"Ada\"}");

        assertThat(sale.status()).isEqualTo(403);
        assertThat(customer.status()).isEqualTo(403);
        assertThat(count("sale")).isZero();
        assertThat(count("customer")).isZero();
        assertThat(quantity(milk)).isEqualTo(5);
    }

    @Test
    void everyRoleCanRead() {
        for (String email : new String[] {OWNER, ASSISTANT, ADMIN}) {
            String token = login(email);
            assertThat(get("/api/v1/products", token).status()).isEqualTo(200);
            assertThat(get("/api/v1/customers", token).status()).isEqualTo(200);
            assertThat(get("/api/v1/sales", token).status()).isEqualTo(200);
        }
    }

    /** DM15: the role is re-read from the database on every request, not trusted from the token. */
    @Test
    void roleChangeTakesEffectWithTheSameToken() {
        String token = login(ASSISTANT);
        assertThat(post("/api/v1/products", token, PRODUCT).status()).isEqualTo(403);

        jdbc.sql("UPDATE app_user SET role = 'OWNER' WHERE id = :id").param("id", assistantId).update();
        assertThat(post("/api/v1/products", token, PRODUCT).status()).isEqualTo(201);
        assertThat(get("/api/v1/me", token).body().get("role").asString()).isEqualTo("OWNER");
    }

    @Test
    void removedAccountsTokenStopsWorking() {
        String token = login(ADMIN);
        jdbc.sql("DELETE FROM app_user WHERE id = :id").param("id", adminId).update();
        var response = get("/api/v1/me", token);
        assertThat(response.status()).isEqualTo(401);
        assertThat(response.code()).isEqualTo("UNAUTHENTICATED");
    }

    @Test
    void missingTokenIs401WithProblem() {
        var response = get("/api/v1/products", null);
        assertThat(response.status()).isEqualTo(401);
        assertThat(response.code()).isEqualTo("UNAUTHENTICATED");
        assertThat(response.header("WWW-Authenticate")).startsWith("Bearer");
        assertThat(response.body().get("requestId").asString()).isEqualTo(response.header("X-Request-Id"));
    }

    @Test
    void forgedOrBrokenTokenIs401() {
        var forged = new TokenService(new AppProperties("t", "Africa/Lagos",
                new AppProperties.Security("another-key-that-is-long-enough-0123456789", Duration.ofHours(8)),
                new AppProperties.Cors(null)), Clock.systemUTC())
                .issue(new CurrentUser(ownerId, OWNER, "Owner", Role.OWNER)).value();

        assertThat(get("/api/v1/me", forged).status()).isEqualTo(401);
        assertThat(get("/api/v1/me", "not-a-token").status()).isEqualTo(401);
    }

    /** DM15: tokens last 8 hours. One issued 9 hours ago is refused. */
    @Test
    void expiredTokenIs401() {
        var oldClock = Clock.offset(Clock.systemUTC(), Duration.ofHours(-9));
        String expired = new TokenService(properties, oldClock)
                .issue(new CurrentUser(ownerId, OWNER, "Owner", Role.OWNER)).value();
        assertThat(get("/api/v1/me", expired).status()).isEqualTo(401);
    }

    @Test
    void loginGivesAnEightHourTokenAndTheUser() {
        var session = post("/api/v1/auth/sessions", null, "{\"email\":\"OWNER@Shop.Test\",\"password\":\"" + PASSWORD + "\"}");

        assertThat(session.status()).isEqualTo(201);
        assertThat(session.body().get("tokenType").asString()).isEqualTo("Bearer");
        assertThat(session.body().get("user").get("role").asString()).isEqualTo("OWNER");
        assertThat(session.body().get("user").get("email").asString()).isEqualTo(OWNER);
        var expiresAt = java.time.Instant.parse(session.body().get("expiresAt").asString());
        assertThat(Duration.between(java.time.Instant.now(), expiresAt)).isBetween(Duration.ofMinutes(479), Duration.ofMinutes(481));

        var me = get("/api/v1/me", session.body().get("accessToken").asString());
        assertThat(me.status()).isEqualTo(200);
        assertThat(me.body().get("id").asString()).isEqualTo(ownerId.toString());
        assertThat(me.body().has("passwordHash")).isFalse();
    }

    /** Wrong password and unknown email look the same, so accounts can't be discovered. */
    @Test
    void wrongPasswordAndUnknownEmailAreTheSame401() {
        var wrongPassword = post("/api/v1/auth/sessions", null, "{\"email\":\"" + OWNER + "\",\"password\":\"wrong-password\"}");
        var unknownEmail = post("/api/v1/auth/sessions", null, "{\"email\":\"nobody@shop.test\",\"password\":\"wrong-password\"}");

        assertThat(wrongPassword.status()).isEqualTo(401);
        assertThat(unknownEmail.status()).isEqualTo(401);
        assertThat(wrongPassword.body().get("detail")).isEqualTo(unknownEmail.body().get("detail"));
    }

    @Test
    void malformedLoginIs400() {
        var response = post("/api/v1/auth/sessions", null, "{\"email\":\"not-an-email\",\"password\":\"short\"}");
        assertThat(response.status()).isEqualTo(400);
        assertThat(response.code()).isEqualTo("VALIDATION_FAILED");
        assertThat(response.body().get("errors").findValuesAsString("field")).containsExactly("email", "password");
    }
}
