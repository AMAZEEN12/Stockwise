package ng.tesa.stockwise.reversal;

import java.util.UUID;

public final class ReversalExceptions {

    private ReversalExceptions() {
    }

    public static class SaleAlreadyReversedException extends RuntimeException {
        public SaleAlreadyReversedException(UUID saleId) {
            super("Sale " + saleId + " has already been reversed.");
        }
    }

    public static class InvalidAuthorizationCodeException extends RuntimeException {
        public InvalidAuthorizationCodeException() {
            super("The reversal authorization code is invalid or expired.");
        }
    }

    public static class AuthorizationAlreadyUsedException extends RuntimeException {
        public AuthorizationAlreadyUsedException() {
            super("The reversal authorization code has already been used.");
        }
    }

    public static class AuthorizationSaleMismatchException extends RuntimeException {
        public AuthorizationSaleMismatchException() {
            super("The reversal authorization code was issued for a different sale.");
        }
    }

    public static class ReversalManualReviewException extends RuntimeException {
        public ReversalManualReviewException(String message) {
            super(message);
        }
    }

    public static class ReversalConflictException extends RuntimeException {
        public ReversalConflictException(String message) {
            super(message);
        }
    }
}
