package ng.tesa.stockwise.portal;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class PortalModels {

    public record PortalShopInfo(
            String name,
            String address,
            String currency,
            String whatsappPhone
    ) {
    }

    public record PortalCustomerInfo(
            UUID id,
            String displayName,
            long balanceKobo,
            long storeCreditKobo,
            boolean hasDebtActivity,
            boolean hasStoreCreditActivity
    ) {
    }

    public record CustomerPortalDetailsResponse(
            PortalShopInfo shop,
            PortalCustomerInfo customer,
            String tokenExpiresAt
    ) {
    }

    public record PortalProduct(
            UUID id,
            String name,
            long priceKobo,
            int quantity,
            boolean active
    ) {
    }

    public record PortalProductsResponse(
            List<PortalProduct> items,
            int totalItems
    ) {
    }

    public record PortalOrderLine(
            @NotNull UUID productId,
            @Positive int quantity
    ) {
    }

    public record CreatePortalOrderRequest(
            @NotEmpty List<@Valid PortalOrderLine> lines,
            String paymentPreference,
            @Size(max = 500) String pickupNote
    ) {
    }

    public record CreatePortalOrderResponse(
            String orderNumber,
            String customerName,
            int itemsCount,
            long totalKobo,
            long storeCreditAppliedKobo,
            String paymentPreference,
            String pickupNote,
            String createdAt,
            String whatsappUrl
    ) {
    }
}
