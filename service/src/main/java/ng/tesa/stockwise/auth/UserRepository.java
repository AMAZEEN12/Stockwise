package ng.tesa.stockwise.auth;

import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Users (V1 {@code app_user}). Emails are matched case-insensitively ({@code app_user_email_lower_uq}). */
@Repository
public class UserRepository {

    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** A user with the stored password hash, for login only. */
    public record Credentials(CurrentUser user, String passwordHash) {
    }

    public Optional<Credentials> findCredentials(String email) {
        return jdbc.sql("""
                        SELECT id, email, display_name, role, password_hash FROM app_user
                        WHERE lower(email) = lower(:email)
                        """)
                .param("email", email.trim())
                .query((rs, row) -> new Credentials(
                        new CurrentUser(rs.getObject("id", UUID.class), rs.getString("email"),
                                rs.getString("display_name"), Role.valueOf(rs.getString("role"))),
                        rs.getString("password_hash")))
                .optional();
    }

    public Optional<CurrentUser> findById(UUID id) {
        return jdbc.sql("SELECT id, email, display_name, role FROM app_user WHERE id = :id")
                .param("id", id)
                .query((rs, row) -> new CurrentUser(rs.getObject("id", UUID.class), rs.getString("email"),
                        rs.getString("display_name"), Role.valueOf(rs.getString("role"))))
                .optional();
    }
}
