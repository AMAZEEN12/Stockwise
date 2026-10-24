-- Undo of V1__users.sql (DM13). Run by MigrationUndo, never by Flyway.
DROP INDEX IF EXISTS app_user_email_lower_uq;
DROP TABLE IF EXISTS app_user;
