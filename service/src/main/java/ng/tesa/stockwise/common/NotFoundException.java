package ng.tesa.stockwise.common;

/** The addressed resource doesn't exist: 404 {@code NOT_FOUND}. */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String what) {
        super(what + " not found");
    }
}
