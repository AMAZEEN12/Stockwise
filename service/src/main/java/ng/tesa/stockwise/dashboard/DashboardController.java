package ng.tesa.stockwise.dashboard;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import ng.tesa.stockwise.config.AppProperties;

/**
 * {@code GET /api/v1/dashboard} (spec R14). Safe and read-only; any logged-in role
 * ({@code SecurityConfig}'s "any other request" rule). "Today" is the shop's calendar day in
 * {@code stockwise.timezone} (Africa/Lagos, DM14), from midnight to the next midnight there, so a
 * sale at 00:30 WAT counts as today even though it is still yesterday in UTC.
 */
@RestController
public class DashboardController {

    private final DashboardQueries queries;
    private final Clock clock;
    private final ZoneId zone;

    public DashboardController(DashboardQueries queries, Clock clock, AppProperties properties) {
        this.queries = queries;
        this.clock = clock;
        this.zone = ZoneId.of(properties.timezone());
    }

    @GetMapping("/api/v1/dashboard")
    public Dashboard dashboard() {
        Instant now = clock.instant();
        LocalDate today = LocalDate.ofInstant(now, zone);
        ZonedDateTime start = today.atStartOfDay(zone);
        ZonedDateTime end = today.plusDays(1).atStartOfDay(zone);

        Dashboard.TodaySales sales = queries.todaySales(start.toOffsetDateTime(), end.toOffsetDateTime());
        DashboardQueries.CreditTotals credit = queries.creditTotals();
        return new Dashboard(now, true, today, sales,
                credit.outstandingKobo(), credit.customersOwing(), credit.storeCreditHeldKobo(),
                queries.lowStockCount(), queries.lowStock(), queries.recentSales());
    }
}
