package ng.tesa.stockwise.common;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** An RFC 9457 problem response (contract {@code Problem}). */
public record Problem(
        String type,
        String title,
        int status,
        String detail,
        String code,
        String requestId,
        List<FieldError> errors) {

    public static final MediaType MEDIA_TYPE = MediaType.APPLICATION_PROBLEM_JSON;

    public record FieldError(String field, String message) {
    }

    public static Problem of(ErrorCode code, String detail, String requestId, List<FieldError> errors) {
        return new Problem(code.type(), code.title(), code.status().value(), detail, code.name(), requestId,
                errors == null || errors.isEmpty() ? null : List.copyOf(errors));
    }

    public ResponseEntity<Problem> toResponse() {
        return ResponseEntity.status(status).contentType(MEDIA_TYPE).body(this);
    }
}
