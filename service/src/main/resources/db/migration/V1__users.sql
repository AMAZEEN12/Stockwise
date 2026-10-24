-- V1: application users and roles (spec R15, DM3, DM10).
-- Undo: db/rollback/U1__users.sql

CREATE TABLE app_user (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text        NOT NULL,
    password_hash text        NOT NULL,
    display_name  text        NOT NULL,
    role          text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT app_user_role_valid      CHECK (role IN ('OWNER', 'ASSISTANT', 'ADMIN')),
    CONSTRAINT app_user_email_not_blank CHECK (length(trim(email)) > 0),
    CONSTRAINT app_user_name_not_blank  CHECK (length(trim(display_name)) > 0)
);

-- Login looks users up by email, case-insensitively.
CREATE UNIQUE INDEX app_user_email_lower_uq ON app_user (lower(email));
