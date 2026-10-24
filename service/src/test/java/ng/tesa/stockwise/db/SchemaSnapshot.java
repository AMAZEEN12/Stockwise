package ng.tesa.stockwise.db;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * A comparable description of the public schema (tables, columns, constraints, indexes,
 * sequences), excluding Flyway's own history table. Two equal snapshots mean an undo
 * restored the schema exactly.
 */
final class SchemaSnapshot {

    private static final String[] QUERIES = {
            """
            SELECT 'column ' || table_name || '.' || column_name || ' ' || data_type
                   || ' nullable=' || is_nullable || ' default=' || coalesce(column_default, '-')
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name <> 'flyway_schema_history'
            """,
            """
            SELECT 'constraint ' || rel.relname || '.' || con.conname || ' ' || pg_get_constraintdef(con.oid)
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace ns ON ns.oid = rel.relnamespace
            WHERE ns.nspname = 'public' AND rel.relname <> 'flyway_schema_history'
            """,
            """
            SELECT 'index ' || indexname || ' ' || indexdef
            FROM pg_indexes
            WHERE schemaname = 'public' AND tablename <> 'flyway_schema_history'
            """,
            """
            SELECT 'sequence ' || sequence_name
            FROM information_schema.sequences
            WHERE sequence_schema = 'public'
            """
    };

    private SchemaSnapshot() {
    }

    static List<String> take() throws SQLException {
        List<String> lines = new ArrayList<>();
        try (Connection c = PostgresTestDatabase.connect(); Statement s = c.createStatement()) {
            for (String query : QUERIES) {
                try (ResultSet rows = s.executeQuery(query)) {
                    while (rows.next()) {
                        lines.add(rows.getString(1));
                    }
                }
            }
        }
        lines.sort(String::compareTo);
        return lines;
    }
}
