package ng.tesa.stockwise.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

import org.flywaydb.core.Flyway;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** One real Postgres 17 for every integration test in the JVM (test-plan: no H2 substitutes). */
final class PostgresTestDatabase {

    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    private PostgresTestDatabase() {
    }

    static Connection connect() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    /** Flyway against the test database; {@code target} null means latest. */
    static Flyway flyway(String target) {
        var config = Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .cleanDisabled(false);
        if (target != null) {
            config.target(target);
        }
        return config.load();
    }

    /** Drops everything in the public schema so each test starts empty. */
    static void resetSchema() throws SQLException {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
        }
    }
}
