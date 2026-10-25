-- V4: retry-safe customer creation (contract v0.2.0, proposal A; sdlc/contract-v0-2).
-- Undo: db/rollback/U4__customer_idempotency.sql
--
-- A POST /customers that carries an Idempotency-Key claims it here, so a retry finds the
-- original row instead of creating a duplicate. Customers created without a key (v0.1.0 clients,
-- the seed) keep NULLs; a UNIQUE constraint allows any number of NULLs.

ALTER TABLE customer
    ADD COLUMN idempotency_key uuid,
    ADD COLUMN request_hash    text,
    ADD COLUMN created_by      uuid REFERENCES app_user (id);

ALTER TABLE customer
    ADD CONSTRAINT customer_idempotency_key_uq UNIQUE (idempotency_key);

-- A key is only meaningful with the request it was used for, and the other way round.
ALTER TABLE customer
    ADD CONSTRAINT customer_key_and_hash_together CHECK ((idempotency_key IS NULL) = (request_hash IS NULL));
