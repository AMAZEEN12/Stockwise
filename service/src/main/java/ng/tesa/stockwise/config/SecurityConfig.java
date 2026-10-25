package ng.tesa.stockwise.config;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.web.SecurityFilterChain;

import ng.tesa.stockwise.auth.CurrentUser;
import ng.tesa.stockwise.auth.TokenService;
import ng.tesa.stockwise.auth.UserRepository;

/**
 * R15: who may do what. Roles are checked here, in the service, never only in the interface.
 * Stateless bearer tokens (no cookies), so CSRF protection is not needed. CORS comes from
 * {@link CorsConfig} and is applied before authentication.
 *
 * <table>
 *   <tr><th>Request</th><th>Roles</th></tr>
 *   <tr><td>{@code GET /}, {@code GET /api/v1/health}, {@code POST /api/v1/auth/sessions}</td><td>public</td></tr>
 *   <tr><td>{@code POST /api/v1/products}</td><td>OWNER</td></tr>
 *   <tr><td>{@code POST /api/v1/customers}, {@code POST /api/v1/sales}</td><td>OWNER, ASSISTANT</td></tr>
 *   <tr><td>any other request</td><td>any logged-in role</td></tr>
 * </table>
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain api(HttpSecurity http, ProblemSecurityHandlers problems,
                            Converter<Jwt, AbstractAuthenticationToken> currentUserConverter) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(cors -> { })
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .logout(logout -> logout.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/", "/api/v1/health").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/sessions").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/products").hasRole("OWNER")
                        .requestMatchers(HttpMethod.POST, "/api/v1/customers").hasAnyRole("OWNER", "ASSISTANT")
                        .requestMatchers(HttpMethod.POST, "/api/v1/sales").hasAnyRole("OWNER", "ASSISTANT")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(rs -> rs
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(currentUserConverter))
                        .authenticationEntryPoint(problems)
                        .accessDeniedHandler(problems))
                .exceptionHandling(e -> e.authenticationEntryPoint(problems).accessDeniedHandler(problems));
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(AppProperties properties) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withSecretKey(TokenService.signingKey(properties.security().jwtSecret()))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(TokenService.ISSUER)));
        return decoder;
    }

    /** DM15: the token only says who you are; the database says what you may do, on every request. */
    @Bean
    Converter<Jwt, AbstractAuthenticationToken> currentUserConverter(UserRepository users) {
        return jwt -> {
            UUID id;
            try {
                id = UUID.fromString(jwt.getSubject());
            } catch (IllegalArgumentException | NullPointerException e) {
                throw new InvalidBearerTokenException("The token has no valid subject.");
            }
            CurrentUser user = users.findById(id)
                    .orElseThrow(() -> new InvalidBearerTokenException("This account no longer exists."));
            return UsernamePasswordAuthenticationToken.authenticated(user, jwt,
                    List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name())));
        };
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
