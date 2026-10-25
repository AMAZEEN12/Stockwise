package ng.tesa.stockwise.auth;

import java.util.UUID;

/**
 * The logged-in user, loaded from the database on every request (DM15), so a role change or a
 * removed account takes effect at once, whatever the token says. Contract {@code User}.
 */
public record CurrentUser(UUID id, String email, String displayName, Role role) {
}
