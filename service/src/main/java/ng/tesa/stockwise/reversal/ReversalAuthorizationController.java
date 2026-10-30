package ng.tesa.stockwise.reversal;

import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import ng.tesa.stockwise.auth.CurrentUser;
import ng.tesa.stockwise.auth.Role;

/**
 * Endpoint for OWNER/ADMIN to generate supervisor authorization codes for assistant reversals.
 */
@RestController
@RequestMapping("/api/v1/reversals/authorizations")
public class ReversalAuthorizationController {

    private final ReversalAuthorizationRepository repository;
    private final SecureRandom random;

    public ReversalAuthorizationController(ReversalAuthorizationRepository repository) {
        this.repository = repository;
        SecureRandom sr;
        try {
            sr = SecureRandom.getInstanceStrong();
        } catch (NoSuchAlgorithmException e) {
            sr = new SecureRandom();
        }
        this.random = sr;
    }

    @PostMapping
    public ResponseEntity<ReversalAuthorization> create(
            @Valid @RequestBody(required = false) ReversalAuthorizationCreate body,
            @AuthenticationPrincipal CurrentUser user) {
        if (user.role() != Role.OWNER && user.role() != Role.ADMIN) {
            throw new AccessDeniedException("Only OWNER and ADMIN can generate reversal authorization codes.");
        }

        UUID saleId = body != null ? body.saleId() : null;
        int validMinutes = body != null ? body.effectiveMinutes() : 15;

        String code = String.format("%06d", random.nextInt(1_000_000));
        ReversalAuthorization auth = repository.create(code, saleId, validMinutes, user.id(), user.role());
        return ResponseEntity.status(HttpStatus.CREATED).body(auth);
    }
}
