package ng.tesa.stockwise.common;

/** Thrown when an optimistic concurrency check fails (HTTP 412). */
public class PreconditionFailedException extends RuntimeException {

    public PreconditionFailedException(String message) {
        super(message);
    }
}
