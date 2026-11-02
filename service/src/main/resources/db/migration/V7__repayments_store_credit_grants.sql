-- V7: retry-safe customer repayments and manual store-credit grants
-- (spec R9, R12; DM5, DM73, DM74; contract v0.5.0).
-- Undo: db/rollback/U7__repayments_store_credit_grants.sql
--
-- Each row claims its Idempotency-Key, so a retried request records nothing twice. The money
-- itself moves through customer (cached balances) and ledger_entry (append-only history), whose
-- REPAYMENT and STORE_CREDIT rows point back here through source_id.

CREATE TABLE repayment (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     uuid        NOT NULL REFERENCES customer (id),
    amount_kobo     bigint      NOT NULL,
    note            text,
    idempotency_key uuid        NOT NULL,
    request_hash    text        NOT NULL,
    created_by      uuid        NOT NULL REFERENCES app_user (id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repayment_amount_positive      CHECK (amount_kobo > 0),
    CONSTRAINT repayment_note_length          CHECK (note IS NULL OR length(note) <= 200),
    CONSTRAINT repayment_request_hash_sha256  CHECK (length(request_hash) = 64),
    CONSTRAINT repayment_idempotency_key_uq   UNIQUE (idempotency_key)
);

CREATE INDEX repayment_customer_time_idx ON repayment (customer_id, created_at);

CREATE TABLE store_credit_grant (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     uuid        NOT NULL REFERENCES customer (id),
    amount_kobo     bigint      NOT NULL,
    reason          text        NOT NULL,
    note            text,
    idempotency_key uuid        NOT NULL,
    request_hash    text        NOT NULL,
    created_by      uuid        NOT NULL REFERENCES app_user (id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT store_credit_grant_amount_positive     CHECK (amount_kobo > 0),
    CONSTRAINT store_credit_grant_reason_valid        CHECK (reason IN
        ('RETURN_REFUND', 'ADVANCE_DEPOSIT', 'CHANGE_SHORTAGE', 'LOYALTY_REWARD', 'MANUAL_ADJUSTMENT')),
    CONSTRAINT store_credit_grant_note_length         CHECK (note IS NULL OR length(note) <= 200),
    CONSTRAINT store_credit_grant_request_hash_sha256 CHECK (length(request_hash) = 64),
    CONSTRAINT store_credit_grant_idempotency_key_uq  UNIQUE (idempotency_key)
);

CREATE INDEX store_credit_grant_customer_time_idx ON store_credit_grant (customer_id, created_at);
