-- Undo of V4__customer_idempotency.sql (DM13). Run by MigrationUndo, never by Flyway.
-- Dropping the columns also drops their constraints.
ALTER TABLE customer
    DROP COLUMN IF EXISTS created_by,
    DROP COLUMN IF EXISTS request_hash,
    DROP COLUMN IF EXISTS idempotency_key;
