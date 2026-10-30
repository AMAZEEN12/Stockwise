-- V5: retry-safe, append-only restocks (spec R5, R6).
-- Undo: db/rollback/U5__restocks.sql

CREATE TABLE restock (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      uuid        NOT NULL REFERENCES product (id),
    quantity        integer     NOT NULL,
    received_on     date        NOT NULL,
    note            text,
    idempotency_key uuid        NOT NULL,
    request_hash    text        NOT NULL,
    created_by      uuid        NOT NULL REFERENCES app_user (id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT restock_quantity_positive CHECK (quantity > 0),
    CONSTRAINT restock_note_length CHECK (note IS NULL OR length(note) <= 500),
    CONSTRAINT restock_request_hash_sha256 CHECK (length(request_hash) = 64),
    CONSTRAINT restock_idempotency_key_uq UNIQUE (idempotency_key)
);

CREATE INDEX restock_product_time_idx ON restock (product_id, created_at DESC, id DESC);
CREATE INDEX restock_time_idx ON restock (created_at DESC, id DESC);

-- Restocks are ledger records. Corrections are later reversal rows, never mutation or deletion.
CREATE FUNCTION reject_restock_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'restock rows are append-only' USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

CREATE TRIGGER restock_append_only
    BEFORE UPDATE OR DELETE ON restock
    FOR EACH ROW EXECUTE FUNCTION reject_restock_mutation();
