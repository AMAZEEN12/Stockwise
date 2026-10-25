-- Reset the DEMO database to the Monday seed (run before a demo rehearsal or the live demo).
-- DESTROYS ALL DATA in the database it runs against. Never run it against a real shop.
-- Usage: psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -f scripts/reset-demo.sql
-- Then re-run the migrate step with the seed location (deploy.yml with vars.SEED_DEMO=true, or
-- `./mvnw spring-boot:run -Dspring-boot.run.profiles=local,demo` locally).
-- NOT YET RUN against a real Postgres by the delivery owner (the build machine had no Postgres): rehearse it once on the staging branch.
BEGIN;
TRUNCATE ledger_entry, stock_movement, sale_line, sale, customer, product, app_user RESTART IDENTITY CASCADE;
-- The seed is a Flyway repeatable migration: forget that it ran so Flyway applies it again.
DELETE FROM flyway_schema_history WHERE version IS NULL AND script LIKE 'R__%';
COMMIT;
