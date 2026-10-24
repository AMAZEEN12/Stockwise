package ng.tesa.stockwise.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * N12 / DM13: every migration can be reversed. Migrates up one version at a time recording
 * the schema, undoes one version at a time checking the schema matches the earlier state
 * exactly, then migrates back up to latest.
 */
class MigrationRollbackIT {

    private static final Pattern VERSIONED = Pattern.compile("V(\\d+)__(.+)\\.sql");

    @BeforeEach
    void emptySchema() throws SQLException {
        PostgresTestDatabase.resetSchema();
    }

    @Test
    void everyMigrationHasAnUndoScript() throws Exception {
        List<String> undoScripts = fileNames("db/rollback");
        for (String migration : fileNames("db/migration")) {
            Matcher m = VERSIONED.matcher(migration);
            assertThat(m.matches()).as("migration file name %s", migration).isTrue();
            String expected = "U" + m.group(1) + "__" + m.group(2) + ".sql";
            assertThat(undoScripts).as("undo script for %s", migration).contains(expected);
        }
    }

    @Test
    void upDownUpRestoresTheSchemaAtEveryStep() throws Exception {
        int latest = versions().getLast();

        List<List<String>> schemaAt = new ArrayList<>();
        schemaAt.add(SchemaSnapshot.take());
        for (int v = 1; v <= latest; v++) {
            PostgresTestDatabase.flyway(Integer.toString(v)).migrate();
            schemaAt.add(SchemaSnapshot.take());
            assertThat(schemaAt.get(v)).as("V%d changes the schema", v).isNotEqualTo(schemaAt.get(v - 1));
        }

        try (Connection c = PostgresTestDatabase.connect()) {
            MigrationUndo undo = new MigrationUndo(c);
            for (int v = latest; v >= 1; v--) {
                assertThat(undo.undoTo(v - 1)).containsExactly(v);
                assertThat(SchemaSnapshot.take()).as("schema after undoing V%d", v).isEqualTo(schemaAt.get(v - 1));
            }
            assertThat(undo.undoTo(0)).isEmpty();
        }

        Flyway flyway = PostgresTestDatabase.flyway(null);
        flyway.migrate();
        flyway.validate();
        assertThat(SchemaSnapshot.take()).isEqualTo(schemaAt.get(latest));
    }

    @Test
    void undoScriptNameFollowsFlywayDescription() {
        assertThat(MigrationUndo.undoScriptName(3, "customers sales ledger"))
                .isEqualTo("U3__customers_sales_ledger.sql");
    }

    private static List<Integer> versions() throws Exception {
        return fileNames("db/migration").stream()
                .map(VERSIONED::matcher)
                .filter(Matcher::matches)
                .map(m -> Integer.parseInt(m.group(1)))
                .sorted()
                .toList();
    }

    private static List<String> fileNames(String classpathDir) throws IOException, URISyntaxException {
        Path dir = Path.of(MigrationRollbackIT.class.getClassLoader().getResource(classpathDir).toURI());
        try (Stream<Path> files = Files.list(dir)) {
            return files.map(p -> p.getFileName().toString()).sorted().toList();
        }
    }
}
