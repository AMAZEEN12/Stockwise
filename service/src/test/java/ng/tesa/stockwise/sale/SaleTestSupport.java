package ng.tesa.stockwise.sale;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;

import ng.tesa.stockwise.support.DatabaseTestSupport;

/** Sale integration tests: the shared database context plus request builders. */
abstract class SaleTestSupport extends DatabaseTestSupport {

    @Autowired
    SaleService saleService;

    static NewSale paid(NewSale.Line... lines) {
        return new NewSale(PaymentType.PAID, null, null, List.of(lines));
    }

    static NewSale.Line line(UUID productId, int quantity) {
        return new NewSale.Line(productId, quantity);
    }
}
