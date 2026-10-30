package ng.tesa.stockwise.common;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import ng.tesa.stockwise.config.RequestIdFilter;
import ng.tesa.stockwise.product.Product;
import ng.tesa.stockwise.restock.RestockExceptions;
import ng.tesa.stockwise.sale.SaleExceptions;
import tools.jackson.core.JacksonException;

/**
 * Every error leaves the service as {@code application/problem+json} with a {@code code} and
 * the {@code requestId} (contract {@code Problem}). Security errors (401, 403) are written by
 * {@code config.ProblemSecurityHandlers} in the same shape.
 */
@RestControllerAdvice
public class ProblemHandler {

    private static final Logger log = LoggerFactory.getLogger(ProblemHandler.class);

    private static ResponseEntity<Problem> problem(HttpServletRequest request, ErrorCode code, String detail,
                                                   List<Problem.FieldError> errors) {
        return Problem.of(code, detail, RequestIdFilter.of(request), errors).toResponse();
    }

    // Rules of the sale transaction (R3, R4, R5, R8).

    @ExceptionHandler(SaleExceptions.InvalidSale.class)
    ResponseEntity<Problem> invalidSale(SaleExceptions.InvalidSale e, HttpServletRequest request) {
        return problem(request, ErrorCode.VALIDATION_FAILED, "The sale is not valid.",
                e.errors().stream().map(f -> new Problem.FieldError(f.field(), f.message())).toList());
    }

    @ExceptionHandler(SaleExceptions.InsufficientStock.class)
    ResponseEntity<Problem> insufficientStock(SaleExceptions.InsufficientStock e, HttpServletRequest request) {
        return problem(request, ErrorCode.INSUFFICIENT_STOCK, e.getMessage(), List.of(new Problem.FieldError(
                "lines[" + e.lineIndex() + "].quantity", "availableQuantity: " + e.availableQuantity())));
    }

    @ExceptionHandler(SaleExceptions.IdempotencyKeyReused.class)
    ResponseEntity<Problem> keyReused(SaleExceptions.IdempotencyKeyReused e, HttpServletRequest request) {
        return problem(request, ErrorCode.IDEMPOTENCY_KEY_REUSED, e.getMessage(), null);
    }

    @ExceptionHandler(IdempotencyKeyReused.class)
    ResponseEntity<Problem> keyReusedGeneric(IdempotencyKeyReused e, HttpServletRequest request) {
        return problem(request, ErrorCode.IDEMPOTENCY_KEY_REUSED, e.getMessage(), null);
    }

    @ExceptionHandler(RestockExceptions.StockLimitExceeded.class)
    ResponseEntity<Problem> stockLimit(RestockExceptions.StockLimitExceeded e, HttpServletRequest request) {
        return problem(request, ErrorCode.STOCK_LIMIT_EXCEEDED, e.getMessage(),
                List.of(new Problem.FieldError("quantity", "would exceed the supported stock count")));
    }

    @ExceptionHandler(SaleExceptions.ReferenceNotFound.class)
    ResponseEntity<Problem> referenceNotFound(SaleExceptions.ReferenceNotFound e, HttpServletRequest request) {
        return problem(request, ErrorCode.NOT_FOUND, e.getMessage(),
                List.of(new Problem.FieldError(e.field(), "not found")));
    }

    @ExceptionHandler(Product.DuplicateReference.class)
    ResponseEntity<Problem> duplicateReference(Product.DuplicateReference e, HttpServletRequest request) {
        return problem(request, ErrorCode.DUPLICATE_REFERENCE, e.getMessage(),
                List.of(new Problem.FieldError("reference", "already in use")));
    }

    /** A failed login (wrong email or password). Token failures are handled before the controller. */
    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<Problem> unauthenticated(AuthenticationException e, HttpServletRequest request) {
        return problem(request, ErrorCode.UNAUTHENTICATED, e.getMessage(), null);
    }

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<Problem> notFound(NotFoundException e, HttpServletRequest request) {
        return problem(request, ErrorCode.NOT_FOUND, e.getMessage(), null);
    }

    // Malformed requests: always 400 VALIDATION_FAILED with the offending field.

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Problem> invalidBody(MethodArgumentNotValidException e, HttpServletRequest request) {
        List<Problem.FieldError> errors = e.getBindingResult().getFieldErrors().stream()
                .map(f -> new Problem.FieldError(f.getField(), f.getDefaultMessage()))
                .sorted(java.util.Comparator.comparing(Problem.FieldError::field))
                .toList();
        return problem(request, ErrorCode.VALIDATION_FAILED, "The request body is not valid.", errors);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    ResponseEntity<Problem> invalidParameters(HandlerMethodValidationException e, HttpServletRequest request) {
        List<Problem.FieldError> errors = new ArrayList<>();
        e.getParameterValidationResults().forEach(result -> {
            String name = result.getMethodParameter().getParameterName();
            result.getResolvableErrors().forEach(error -> errors.add(new Problem.FieldError(name, error.getDefaultMessage())));
        });
        return problem(request, ErrorCode.VALIDATION_FAILED, "A parameter is not valid.", errors);
    }

    /** N1: 1.5 for an integer, "2" for a number, an unknown field or broken JSON. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Problem> unreadable(HttpMessageNotReadableException e, HttpServletRequest request) {
        String field = "body";
        String message = "is not valid JSON for this request";
        if (e.getCause() instanceof JacksonException jackson && !jackson.getPath().isEmpty()) {
            field = jackson.getPath().stream()
                    .map(ref -> ref.getPropertyName() != null ? "." + ref.getPropertyName() : "[" + ref.getIndex() + "]")
                    .collect(Collectors.joining()).replaceFirst("^\\.", "");
            message = jackson.getClass().getSimpleName().startsWith("UnrecognizedProperty")
                    ? "is not a known field" : "has the wrong type (numbers must be whole numbers)";
        }
        return problem(request, ErrorCode.VALIDATION_FAILED, "The request body could not be read.",
                List.of(new Problem.FieldError(field, message)));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<Problem> typeMismatch(MethodArgumentTypeMismatchException e, HttpServletRequest request) {
        return problem(request, ErrorCode.VALIDATION_FAILED, "A parameter has the wrong format.",
                List.of(new Problem.FieldError(e.getName(), "has the wrong format")));
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    ResponseEntity<Problem> missingHeader(MissingRequestHeaderException e, HttpServletRequest request) {
        return problem(request, ErrorCode.VALIDATION_FAILED, "A required header is missing.",
                List.of(new Problem.FieldError(e.getHeaderName(), "is required")));
    }

    // The database is down: 503, so the interface can say "try again" rather than "broken".

    @ExceptionHandler({CannotGetJdbcConnectionException.class, DataAccessResourceFailureException.class})
    ResponseEntity<Problem> databaseDown(RuntimeException e, HttpServletRequest request) {
        log.warn("Database unavailable: {}", e.getMessage());
        return problem(request, ErrorCode.DATABASE_UNAVAILABLE, "The database can't be reached. Try again shortly.", null);
    }

    /** Spring's own errors (unknown path, wrong method, wrong media type) keep their status. */
    @ExceptionHandler({NoResourceFoundException.class, HttpRequestMethodNotSupportedException.class,
            HttpMediaTypeNotSupportedException.class, HttpMediaTypeNotAcceptableException.class,
            ErrorResponseException.class})
    ResponseEntity<Problem> framework(Exception e, HttpServletRequest request) {
        HttpStatus status = HttpStatus.resolve(((ErrorResponse) e).getStatusCode().value());
        if (status == HttpStatus.NOT_FOUND) {
            return problem(request, ErrorCode.NOT_FOUND, "No such address.", null);
        }
        Problem p = Problem.of(ErrorCode.VALIDATION_FAILED, e.getMessage(), RequestIdFilter.of(request), null);
        int code = status != null ? status.value() : 400;
        return new Problem(p.type(), p.title(), code, p.detail(), p.code(), p.requestId(), null).toResponse();
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Problem> unexpected(Exception e, HttpServletRequest request) {
        log.error("Unexpected error", e);
        return problem(request, ErrorCode.INTERNAL_ERROR, "Something went wrong. The request ID helps us find it.", null);
    }
}
