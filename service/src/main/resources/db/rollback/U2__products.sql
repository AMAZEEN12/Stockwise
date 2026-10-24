-- Undo of V2__products.sql (DM13). Run by MigrationUndo, never by Flyway.
DROP INDEX IF EXISTS product_low_stock_idx;
DROP INDEX IF EXISTS product_active_category_idx;
DROP TABLE IF EXISTS product;
