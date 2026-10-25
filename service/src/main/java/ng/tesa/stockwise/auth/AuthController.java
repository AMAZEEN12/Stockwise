package ng.tesa.stockwise.auth;

import java.time.Instant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** {@code POST /auth/sessions} (login) and {@code GET /me} (R15). */
@RestController
@RequestMapping("/api/v1")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    /** Checked when the email is unknown, so a wrong email takes as long as a wrong password. */
    private final String timingHash;

    public AuthController(UserRepository users, PasswordEncoder passwords, TokenService tokens) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
        this.timingHash = passwords.encode("timing-equaliser-not-a-password");
    }

    public record LoginRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 128) String password) {
    }

    public record Session(String accessToken, String tokenType, Instant expiresAt, CurrentUser user) {
    }

    /** Wrong email and wrong password get the same 401, so the response doesn't reveal which accounts exist. */
    @PostMapping("/auth/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public Session login(@Valid @RequestBody LoginRequest request) {
        var found = users.findCredentials(request.email());
        String hash = found.map(UserRepository.Credentials::passwordHash).orElse(timingHash);
        boolean matches = passwords.matches(request.password(), hash);
        if (found.isEmpty() || !matches) {
            throw new BadCredentialsException("Email or password is wrong.");
        }
        CurrentUser user = found.get().user();
        var token = tokens.issue(user);
        return new Session(token.value(), "Bearer", token.expiresAt(), user);
    }

    @GetMapping("/me")
    public CurrentUser me(@AuthenticationPrincipal CurrentUser user) {
        return user;
    }
}
