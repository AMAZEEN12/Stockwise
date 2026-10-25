package ng.tesa.stockwise.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import ng.tesa.stockwise.support.ApiTestSupport;


/** The web app on another origin can call the API with its headers; other origins can't (deploy-plan §2). */
class CorsIT extends ApiTestSupport {

    @Test
    void webOriginMayPostASale() {
        var preflight = send("OPTIONS", "/api/v1/sales", null, null,
                "Origin", "http://localhost:5173",
                "Access-Control-Request-Method", "POST",
                "Access-Control-Request-Headers", "authorization,content-type,idempotency-key,x-request-id");

        assertThat(preflight.status()).isEqualTo(200);
        assertThat(preflight.header("Access-Control-Allow-Origin")).isEqualTo("http://localhost:5173");
        assertThat(preflight.header("Access-Control-Allow-Headers")).containsIgnoringCase("idempotency-key");
    }

    @Test
    void responsesExposeTheRequestId() {
        var response = send("GET", "/api/v1/health", null, null, "Origin", "http://localhost:5173");
        assertThat(response.header("Access-Control-Expose-Headers")).contains("X-Request-Id").contains("Location");
    }

    @Test
    void otherOriginsAreRefused() {
        var preflight = send("OPTIONS", "/api/v1/sales", null, null,
                "Origin", "https://evil.example",
                "Access-Control-Request-Method", "POST");
        assertThat(preflight.status()).isEqualTo(403);
    }
}
