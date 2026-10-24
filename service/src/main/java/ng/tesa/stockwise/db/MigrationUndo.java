package ng.tesa.stockwise.db;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * Reverses applied Flyway migrations using the hand-written undo scripts in
 * {@code db/rollback/U<version>__<description>.sql} (DM13). Flyway Community has no undo,
 * so this runner does it: newest version first, each undo script and the removal of its
 * {@code flyway_schema_history} row in one transaction (Postgres DDL is transactional).
 *
 * <p>The undo script for a version is found from the history row's description, which
 * Flyway derives from the migration file name ({@code V3__customers_sales_ledger.sql} has
 * description {@code customers sales ledger}).
 */
public final class MigrationUndo {

    private static final String ROLLBACK_LOCATION = "db/rollback/";

    private final Connection connection;

    public MigrationUndo(Connection connection) {
        this.connection = connection;
    }

    /** Undoes every applied migration newer than {@code targetVersion}; returns the versions undone, newest first. */
    public List<Integer> undoTo(int targetVersion) throws SQLException {
        List<AppliedMigration> toUndo = appliedNewerThan(targetVersion);
        List<Integer> undone = new ArrayList<>();
        boolean previousAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try {
            for (AppliedMigration migration : toUndo) {
                try (Statement statement = connection.createStatement()) {
                    statement.execute(loadUndoScript(migration));
                }
                try (PreparedStatement delete = connection.prepareStatement(
                        "DELETE FROM flyway_schema_history WHERE version = ?")) {
                    delete.setString(1, Integer.toString(migration.version()));
                    delete.executeUpdate();
                }
                connection.commit();
                undone.add(migration.version());
            }
        } catch (SQLException | RuntimeException e) {
            connection.rollback();
            throw e;
        } finally {
            connection.setAutoCommit(previousAutoCommit);
        }
        return undone;
    }

    /** The undo script file name for a migration, e.g. {@code U3__customers_sales_ledger.sql}. */
    static String undoScriptName(int version, String description) {
        return "U" + version + "__" + description.trim().replace(' ', '_') + ".sql";
    }

    private List<AppliedMigration> appliedNewerThan(int targetVersion) throws SQLException {
        List<AppliedMigration> result = new ArrayList<>();
        try (PreparedStatement query = connection.prepareStatement(
                "SELECT version, description, success FROM flyway_schema_history "
                        + "WHERE version IS NOT NULL ORDER BY installed_rank DESC");
             ResultSet rows = query.executeQuery()) {
            while (rows.next()) {
                int version = Integer.parseInt(rows.getString("version"));
                if (version <= targetVersion) {
                    continue;
                }
                if (!rows.getBoolean("success")) {
                    throw new IllegalStateException("Migration V" + version
                            + " is recorded as failed; repair it before undoing.");
                }
                result.add(new AppliedMigration(version, rows.getString("description")));
            }
        }
        return result;
    }

    private String loadUndoScript(AppliedMigration migration) {
        String name = ROLLBACK_LOCATION + undoScriptName(migration.version(), migration.description());
        try (InputStream in = MigrationUndo.class.getClassLoader().getResourceAsStream(name)) {
            if (in == null) {
                throw new IllegalStateException("Missing undo script " + name
                        + " for V" + migration.version() + " (DM13 requires one per migration).");
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read " + name, e);
        }
    }

    private record AppliedMigration(int version, String description) {
    }

    /**
     * {@code ./mvnw -Pundo -Dundo.target=<version> exec:java}. Reads the connection from
     * DATABASE_JDBC_URL, DATABASE_USERNAME and DATABASE_PASSWORD (never from arguments, so
     * secrets don't land in shell history).
     */
    public static void main(String[] args) throws SQLException {
        if (args.length != 1) {
            System.err.println("Usage: MigrationUndo <targetVersion>");
            System.exit(2);
        }
        int target = Integer.parseInt(args[0]);
        String url = requireEnv("DATABASE_JDBC_URL");
        try (Connection connection = DriverManager.getConnection(
                url, System.getenv("DATABASE_USERNAME"), System.getenv("DATABASE_PASSWORD"))) {
            List<Integer> undone = new MigrationUndo(connection).undoTo(target);
            System.out.println(undone.isEmpty()
                    ? "Nothing to undo: schema is already at or below V" + target
                    : "Undid " + undone + "; schema is now at V" + target);
        }
    }

    private static String requireEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            System.err.println(name + " is not set.");
            System.exit(2);
        }
        return value;
    }
}
