package ng.tesa.stockwise.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import ng.tesa.stockwise.support.ApiTestSupport;

/**
 * N6: one journey can be followed by its request ID through the service logs, and the logs
 * never hold tokens, passwords or search text. Fails if RequestIdFilter stops logging the
 * request line or the log pattern drops the request ID.
 */
@ExtendWith(OutputCaptureExtension.class)
class RequestLogIT extends ApiTestSupport {

    @Test
    void eachRequestIsLoggedWithItsRequestId(CapturedOutput output) {
        String id = UUID.randomUUID().toString();

        var response = send("GET", "/api/v1/products", null, null, "X-Request-Id", id);

        assertThat(response.status()).isEqualTo(401);
        String line = awaitLine(output, id);
        assertThat(line).contains("GET /api/v1/products 401");
    }

    @Test
    void tokensPasswordsAndQueryStringsAreNotLogged(CapturedOutput output) {
        String token = login(OWNER);
        String id = UUID.randomUUID().toString();

        var response = send("GET", "/api/v1/products?q=private-search-text", token, null, "X-Request-Id", id);

        assertThat(response.status()).isEqualTo(200);
        assertThat(awaitLine(output, id)).contains("GET /api/v1/products 200");
        assertThat(output.getAll())
                .doesNotContain(token)
                .doesNotContain(PASSWORD)
                .doesNotContain("private-search-text");
    }

    /**
     * The log line is written as the request finishes, which can be a moment after the client
     * has its response, so wait briefly for it instead of failing on timing.
     */
    private static String awaitLine(CapturedOutput output, String requestId) {
        long deadline = System.currentTimeMillis() + 5_000;
        while (System.currentTimeMillis() < deadline) {
            for (String line : output.getAll().split("\\R")) {
                if (line.contains("[" + requestId + "]") && line.contains("RequestIdFilter")) {
                    return line;
                }
            }
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        throw new AssertionError("No request log line with [" + requestId + "] in:\n" + output.getAll());
    }
}