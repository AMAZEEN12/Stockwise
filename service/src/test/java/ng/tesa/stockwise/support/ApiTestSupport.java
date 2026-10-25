package ng.tesa.stockwise.support;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;

import ng.tesa.stockwise.StockwiseApplication;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * The real service on a random port, called over HTTP like the web app calls it. Each test
 * starts with three users, one per role, all with {@link #PASSWORD}.
 */
@SpringBootTest(classes = StockwiseApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class ApiTestSupport extends DatabaseTestSupport {

    protected static final String PASSWORD = "Correct-Horse-Battery-1";
    protected static final String OWNER = "owner@shop.test";
    protected static final String ASSISTANT = "till@shop.test";
    protected static final String ADMIN = "admin@shop.test";

    private final HttpClient http = HttpClient.newHttpClient();

    @LocalServerPort
    protected int port;

    @Autowired
    protected JsonMapper json;

    @Autowired
    protected PasswordEncoder passwords;

    protected UUID ownerId;
    protected UUID assistantId;
    protected UUID adminId;

    @BeforeEach
    void users() {
        String hash = passwords.encode(PASSWORD);
        ownerId = user(OWNER, "Ngozi (Owner)", "OWNER", hash);
        assistantId = user(ASSISTANT, "Tunde (Assistant)", "ASSISTANT", hash);
        adminId = user(ADMIN, "Kemi (Admin)", "ADMIN", hash);
    }

    protected UUID user(String email, String name, String role, String hash) {
        return jdbc.sql("""
                        INSERT INTO app_user (email, password_hash, display_name, role)
                        VALUES (:email, :hash, :name, :role) RETURNING id
                        """)
                .param("email", email).param("hash", hash).param("name", name).param("role", role)
                .query(UUID.class).single();
    }

    /** An HTTP response with its body parsed as JSON (null when empty). */
    public record Response(int status, HttpResponse<String> raw, JsonNode body) {
        public String header(String name) {
            return raw.headers().firstValue(name).orElse(null);
        }

        public String code() {
            return body == null || body.get("code") == null ? null : body.get("code").asString();
        }
    }

    protected Response send(String method, String path, String token, String body, String... headers) {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        if (body != null) {
            request.header("Content-Type", "application/json");
        }
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        for (int i = 0; i < headers.length; i += 2) {
            request.header(headers[i], headers[i + 1]);
        }
        try {
            HttpResponse<String> response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
            boolean isJson = response.headers().firstValue("Content-Type").map(t -> t.contains("json")).orElse(false);
            JsonNode parsed = !isJson || response.body() == null || response.body().isBlank() ? null : json.readTree(response.body());
            return new Response(response.statusCode(), response, parsed);
        } catch (Exception e) {
            throw new IllegalStateException(method + " " + path + " failed", e);
        }
    }

    protected Response get(String path, String token) {
        return send("GET", path, token, null);
    }

    protected Response post(String path, String token, String body, String... headers) {
        return send("POST", path, token, body, headers);
    }

    protected String login(String email) {
        Response session = post("/api/v1/auth/sessions", null,
                "{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}");
        if (session.status() != 201) {
            throw new IllegalStateException("login failed: " + session.status() + " " + session.body());
        }
        return session.body().get("accessToken").asString();
    }

    /** POST /sales with a fresh Idempotency-Key. */
    protected Response sell(String token, String body) {
        return post("/api/v1/sales", token, body, "Idempotency-Key", UUID.randomUUID().toString());
    }
}
