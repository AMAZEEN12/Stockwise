package ng.tesa.stockwise.common;

import org.springframework.http.HttpStatus;

/**
 * The contract's {@code Problem.code} values, each with its HTTP status and the {@code type} and
 * {@code title} of the problem response.
 * {@code INTERNAL_ERROR} is not in contract v0.1.0 yet (its enum has no code for a 500); it is
 * proposed for v0.1.1.
 */
public enum ErrorCode {
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "validation-failed", "The request is not valid"),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "unauthenticated", "Not logged in"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "forbidden", "Not allowed for your role"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "not-found", "Not found"),
    DUPLICATE_REFERENCE(HttpStatus.CONFLICT, "duplicate-reference", "Reference already in use"),
    INSUFFICIENT_STOCK(HttpStatus.CONFLICT, "insufficient-stock", "Not enough stock"),
    IDEMPOTENCY_KEY_REUSED(HttpStatus.UNPROCESSABLE_CONTENT, "idempotency-key-reused", "Idempotency-Key already used"),
    DATABASE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "database-unavailable", "Database unavailable"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "internal-error", "Something went wrong");

    public static final String TYPE_BASE = "https://stockwise.example/problems/";

    private final HttpStatus status;
    private final String slug;
    private final String title;

    ErrorCode(HttpStatus status, String slug, String title) {
        this.status = status;
        this.slug = slug;
        this.title = title;
    }

    public HttpStatus status() {
        return status;
    }

    public String type() {
        return TYPE_BASE + slug;
    }

    public String title() {
        return title;
    }
}
