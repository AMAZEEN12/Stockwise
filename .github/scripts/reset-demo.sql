-- Reset the DEMO database to the Monday seed (run before a demo rehearsal or the live demo).
-- DESTROYS ALL DATA in the database it runs against. Never run it against a real shop.
BEGIN;
TRUNCATE ledger_entry, stock_movement, sale_line, sale, customer, product, app_user RESTART IDENTITY CASCADE;
-- The seed is a Flyway repeatable migration: forget that it ran so Flyway applies it again.
DELETE FROM flyway_schema_history WHERE version IS NULL AND script LIKE 'R__%';
COMMIT;