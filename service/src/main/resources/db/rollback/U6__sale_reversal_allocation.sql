DROP TABLE IF EXISTS reversal_authorization;
DROP TRIGGER IF EXISTS repayment_alloc_append_only ON repayment_allocation;
DROP FUNCTION IF EXISTS reject_repayment_alloc_mutation();
DROP TABLE IF EXISTS repayment_allocation;

DROP INDEX IF EXISTS sale_customer_unpaid_idx;
DROP INDEX IF EXISTS sale_reversal_idempotency_key_uq;

ALTER TABLE sale
    DROP CONSTRAINT IF EXISTS sale_store_credit_used_non_negative,
    DROP CONSTRAINT IF EXISTS sale_unpaid_non_negative,
    DROP CONSTRAINT IF EXISTS sale_reversal_notes_length,
    DROP CONSTRAINT IF EXISTS sale_reversal_reason_valid,
    DROP CONSTRAINT IF EXISTS sale_reversal_fields_consistent,
    DROP COLUMN IF EXISTS store_credit_used_kobo,
    DROP COLUMN IF EXISTS unpaid_kobo,
    DROP COLUMN IF EXISTS reversal_request_hash,
    DROP COLUMN IF EXISTS reversal_idempotency_key,
    DROP COLUMN IF EXISTS reversal_notes,
    DROP COLUMN IF EXISTS reversal_reason,
    DROP COLUMN IF EXISTS reversed_by,
    DROP COLUMN IF EXISTS reversed_at;
