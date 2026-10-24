-- Undo of V3__customers_sales_ledger.sql (DM13). Run by MigrationUndo, never by Flyway.
-- Drop in reverse dependency order. Dropping sale also drops sale_reference_seq (OWNED BY).
DROP TABLE IF EXISTS ledger_entry;
DROP TABLE IF EXISTS stock_movement;
DROP TABLE IF EXISTS sale_line;
DROP TABLE IF EXISTS sale;
DROP SEQUENCE IF EXISTS sale_reference_seq;
DROP TABLE IF EXISTS customer;
