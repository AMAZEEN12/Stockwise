package ng.tesa.stockwise.config;

import java.io.IOException;
import java.util.UUID;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * N6: every request has an {@code X-Request-Id}. The client's UUID is kept; anything else is
 * replaced with a new one. It is echoed on every response (errors included, so this runs before
 * security), put in the log context, and copied into problem responses.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Request-Id";
    public static final String ATTRIBUTE = RequestIdFilter.class.getName();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String requestId = parse(request.getHeader(HEADER));
        request.setAttribute(ATTRIBUTE, requestId);
        response.setHeader(HEADER, requestId);
        MDC.put("requestId", requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove("requestId");
        }
    }

    static String parse(String header) {
        if (header != null) {
            try {
                return UUID.fromString(header.trim()).toString();
            } catch (IllegalArgumentException ignored) {
                // Not a UUID: generate one rather than log untrusted text.
            }
        }
        return UUID.randomUUID().toString();
    }

    public static String of(HttpServletRequest request) {
        Object id = request.getAttribute(ATTRIBUTE);
        return id != null ? id.toString() : UUID.randomUUID().toString();
    }
}
