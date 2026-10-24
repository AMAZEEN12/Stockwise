-- V3: customers, sales, sale lines, stock movements and the customer ledger
-- (spec R3, R5, R7, R8, R10, R12, R13; DM5 store credit).
-- Undo: db/rollback/U3__customers_sales_ledger.sql
--
-- Balances and quantities are cached values guarded by CHECK constraints and conditional
-- UPDATEs; stock_movement and ledger_entry are the append-only history they reconcile to.

CREATE TABLE customer (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name        text        NOT NULL,
    contact_placeholder text,
    balance_kobo        bigint      NOT NULL DEFAULT 0,
    store_credit_kobo   bigint      NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT customer_name_length             CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
    CONSTRAINT customer_contact_length          CHECK (contact_placeholder IS NULL OR length(contact_placeholder) <= 60),
    -- R9: a repayment can never take the balance below zero.
    CONSTRAINT customer_balance_non_negative    CHECK (balance_kobo >= 0),
    -- R12 (DM5): store credit can never be spent twice.
    CONSTRAINT customer_store_credit_non_negative CHECK (store_credit_kobo >= 0)
);

CREATE SEQUENCE sale_reference_seq;

CREATE TABLE sale (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    reference       text        NOT NULL DEFAULT 'S-' || lpad(nextval('sale_reference_seq')::text, 6, '0'),
    -- R5: one sale per client attempt; a replay finds the original row.
    idempotency_key uuid        NOT NULL,
    request_hash    text        NOT NULL,
    payment_type    text        NOT NULL,
    customer_id     uuid        REFERENCES customer (id),
    due_date        date,
    total_kobo      bigint      NOT NULL,
    created_by      uuid        NOT NULL REFERENCES app_user (id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sale_reference_uq          UNIQUE (reference),
    CONSTRAINT sale_idempotency_key_uq    UNIQUE (idempotency_key),
    CONSTRAINT sale_payment_type_valid    CHECK (payment_type IN ('PAID', 'CREDIT')),
    -- R8: a credit sale requires a customer.
    CONSTRAINT sale_credit_requires_customer CHECK (payment_type = 'PAID' OR customer_id IS NOT NULL),
    CONSTRAINT sale_due_date_only_credit  CHECK (due_date IS NULL OR payment_type = 'CREDIT'),
    CONSTRAINT sale_total_non_negative    CHECK (total_kobo >= 0)
);

ALTER SEQUENCE sale_reference_seq OWNED BY sale.reference;

-- Q3: today's sales (range scan on created_at).
CREATE INDEX sale_created_at_idx ON sale (created_at);
CREATE INDEX sale_customer_idx   ON sale (customer_id) WHERE customer_id IS NOT NULL;

CREATE TABLE sale_line (
    id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id         uuid    NOT NULL REFERENCES sale (id),
    product_id      uuid    NOT NULL REFERENCES product (id),
    quantity        integer NOT NULL,
    unit_price_kobo bigint  NOT NULL,
    line_total_kobo bigint  NOT NULL,
    CONSTRAINT sale_line_quantity_positive     CHECK (quantity > 0),
    CONSTRAINT sale_line_price_non_negative    CHECK (unit_price_kobo >= 0),
    CONSTRAINT sale_line_total_matches         CHECK (line_total_kobo = quantity * unit_price_kobo)
);

CREATE INDEX sale_line_sale_idx    ON sale_line (sale_id);
CREATE INDEX sale_line_product_idx ON sale_line (product_id);

CREATE TABLE stock_movement (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  uuid        NOT NULL REFERENCES product (id),
    delta       integer     NOT NULL,
    source_type text        NOT NULL,
    source_id   uuid,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT stock_movement_delta_non_zero  CHECK (delta <> 0),
    CONSTRAINT stock_movement_source_valid    CHECK (source_type IN
        ('OPENING', 'SALE', 'SALE_REVERSAL', 'RESTOCK', 'RESTOCK_REVERSAL'))
);

-- Q5: a product's movement history in time order.
CREATE INDEX stock_movement_product_time_idx ON stock_movement (product_id, created_at);

CREATE TABLE ledger_entry (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id        uuid        NOT NULL REFERENCES customer (id),
    delta_kobo         bigint      NOT NULL,
    source_type        text        NOT NULL,
    source_id          uuid,
    balance_after_kobo bigint      NOT NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ledger_entry_delta_non_zero       CHECK (delta_kobo <> 0),
    CONSTRAINT ledger_entry_source_valid         CHECK (source_type IN
        ('CREDIT_SALE', 'REPAYMENT', 'REVERSAL', 'STORE_CREDIT')),
    CONSTRAINT ledger_entry_balance_non_negative CHECK (balance_after_kobo >= 0)
);

-- Q4: a customer's ledger in time order.
CREATE INDEX ledger_entry_customer_time_idx ON ledger_entry (customer_id, created_at);
