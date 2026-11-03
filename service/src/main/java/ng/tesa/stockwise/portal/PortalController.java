package ng.tesa.stockwise.portal;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public customer self-service portal endpoints (zero authentication link access).
 * Customers inspect live balances, store catalogue, and submit click-and-collect orders.
 */
@RestController
@RequestMapping("/api/v1/portal/customer")
public class PortalController {

    private final PortalService portalService;

    public PortalController(PortalService portalService) {
        this.portalService = portalService;
    }

    @GetMapping("/{token}")
    public PortalModels.CustomerPortalDetailsResponse getDetails(@PathVariable("token") String token) {
        return portalService.getPortalCustomer(token);
    }

    @GetMapping("/{token}/products")
    public PortalModels.PortalProductsResponse getProducts(
            @PathVariable("token") String token,
            @RequestParam(value = "q", required = false) String q) {
        return portalService.getPortalProducts(token, q);
    }

    @PostMapping("/{token}/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public PortalModels.CreatePortalOrderResponse createOrder(
            @PathVariable("token") String token,
            @Valid @RequestBody PortalModels.CreatePortalOrderRequest request) {
        return portalService.createPortalOrder(token, request);
    }
}
