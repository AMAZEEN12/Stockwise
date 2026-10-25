package ng.tesa.stockwise.config;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** The {@code app.*} settings in application.yml. */
@ConfigurationProperties("app")
public record AppProperties(String version, String timezone, Security security, Cors cors) {

    /** DM15: tokens last 8 hours; the signing key comes only from the environment. */
    public record Security(String jwtSecret, Duration tokenLifetime) {
        public Security {
            if (jwtSecret == null || jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
                throw new IllegalStateException(
                        "JWT_SECRET must be set to at least 32 bytes (for example: openssl rand -base64 48)");
            }
            if (tokenLifetime == null) {
                tokenLifetime = Duration.ofHours(8);
            }
        }
    }

    /** Web origins allowed to call the API (deploy-plan §2: the Vercel and Qocent addresses). */
    public record Cors(List<String> allowedOrigins) {
        public Cors {
            allowedOrigins = allowedOrigins == null ? List.of()
                    : allowedOrigins.stream().map(String::trim).filter(o -> !o.isEmpty()).toList();
        }
    }
}
