package ng.tesa.stockwise.web;

import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import ng.tesa.stockwise.config.AppProperties;

/**
 * The walking skeleton's two public addresses (deploy-plan §2). {@code /} answers the host's
 * health check; {@code /api/v1/health} (contract {@code Health}) also asks the database, and a
 * database that doesn't answer becomes 503 {@code DATABASE_UNAVAILABLE} through the problem handler.
 */
@RestController
public class RootController {

    private final JdbcClient jdbc;
    private final String version;

    public RootController(JdbcClient jdbc, AppProperties properties) {
        this.jdbc = jdbc;
        this.version = properties.version();
    }

    @GetMapping("/")
    public Map<String, String> root() {
        return Map.of("service", "stockwise", "status", "UP");
    }

    @GetMapping("/api/v1/health")
    public Map<String, String> health() {
        jdbc.sql("SELECT 1").query(Integer.class).single();
        return Map.of("status", "UP", "service", "stockwise", "version", version);
    }
}
