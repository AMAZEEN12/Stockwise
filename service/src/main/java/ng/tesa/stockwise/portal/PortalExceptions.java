package ng.tesa.stockwise.portal;

public class PortalExceptions {

    public static class TokenExpiredException extends RuntimeException {
        public TokenExpiredException(String message) {
            super(message);
        }
    }

    public static class PortalOrderValidationException extends RuntimeException {
        public PortalOrderValidationException(String message) {
            super(message);
        }
    }
}
