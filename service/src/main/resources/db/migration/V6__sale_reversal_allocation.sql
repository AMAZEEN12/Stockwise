-- V6: sale reversal, oldest-first repayment allocation and supervisor authorization
-- (spec R11, R12, R13, R14, R15, R16; DM5, DM10; Victor's PR #40 direction).
-- Undo: db/rollback/U6__sale_reversal_allocation.sql

-- 1. Sale columns for reversal, remaining unpaid debt, and store credit tracking
ALTER TABLE sale
    ADD COLUMN reversed_at                timestamptz,
    ADD COLUMN reversed_by                uuid REFERENCES app_user (id),
    ADD COLUMN reversal_reason            text,
    ADD COLUMN reversal_notes             text,
    ADD COLUMN reversal_idempotency_key   uuid,
    ADD COLUMN reversal_request_hash      text,
    ADD COLUMN unpaid_kobo                bigint NOT NULL DEFAULT 0,
    ADD COLUMN store_credit_used_kobo     bigint NOT NULL DEFAULT 0,
    ADD CONSTRAINT sale_reversal_fields_consistent CHECK (
        (reversed_at IS NULL AND reversed_by IS NULL AND reversal_idempotency_key IS NULL) OR
        (reversed_at IS NOT NULL AND reversed_by IS NOT NULL AND reversal_idempotency_key IS NOT NULL)
    ),
    ADD CONSTRAINT sale_reversal_reason_valid CHECK (
        reversal_reason IS NULL OR reversal_reason IN ('CUSTOMER_RETURN', 'BILLING_ERROR', 'DAMAGED_PRODUCT', 'OTHER')
    ),
    ADD CONSTRAINT sale_reversal_notes_length CHECK (
        reversal_notes IS NULL OR length(reversal_notes) <= 500
    ),
    ADD CONSTRAINT sale_unpaid_non_negative CHECK (
        unpaid_kobo >= 0 AND unpaid_kobo <= total_kobo
    ),
    ADD CONSTRAINT sale_store_credit_used_non_negative CHECK (
        store_credit_used_kobo >= 0 AND store_credit_used_kobo <= total_kobo
    );

CREATE UNIQUE INDEX sale_reversal_idempotency_key_uq ON sale (reversal_idempotency_key)
    WHERE reversal_idempotency_key IS NOT NULL;

CREATE INDEX sale_customer_unpaid_idx ON sale (customer_id, created_at, id)
    WHERE reversed_at IS NULL AND unpaid_kobo > 0;

-- Backfill existing credit sales that were not reversed: unpaid_kobo = total_kobo
UPDATE sale SET unpaid_kobo = total_kobo WHERE payment_type = 'CREDIT' AND reversed_at IS NULL;

-- 2. Repayment allocation table: records how repayments are applied to individual credit sales
CREATE TABLE repayment_allocation (
    id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id                 uuid        NOT NULL REFERENCES customer (id),
    sale_id                     uuid        NOT NULL REFERENCES sale (id),
    repayment_ledger_entry_id   uuid        REFERENCES ledger_entry (id),
    amount_kobo                 bigint      NOT NULL,
    created_by                  uuid        NOT NULL REFERENCES app_user (id),
    created_at                  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repayment_alloc_amount_positive CHECK (amount_kobo > 0)
);

CREATE INDEX repayment_alloc_sale_idx ON repayment_allocation (sale_id, created_at);
CREATE INDEX repayment_alloc_customer_idx ON repayment_allocation (customer_id, created_at);

-- Repayment allocations are immutable financial records.
CREATE FUNCTION reject_repayment_alloc_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'repayment_allocation rows are append-only' USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

CREATE TRIGGER repayment_alloc_append_only
    BEFORE UPDATE OR DELETE ON repayment_allocation
    FOR EACH ROW EXECUTE FUNCTION reject_repayment_alloc_mutation();

-- 3. Supervisor reversal authorization codes (single-use 6-digit OTP codes for assistants)
CREATE TABLE reversal_authorization (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    code        text        NOT NULL,
    sale_id     uuid        REFERENCES sale (id),
    created_by  uuid        NOT NULL REFERENCES app_user (id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz,
    used_by     uuid        REFERENCES app_user (id),
    CONSTRAINT reversal_auth_code_format CHECK (code ~ '^[0-9]{6}$'),
    CONSTRAINT reversal_auth_time_consistent CHECK (expires_at > created_at)
);

CREATE INDEX reversal_auth_active_idx ON reversal_authorization (code, expires_at)
    WHERE used_at IS NULL;
