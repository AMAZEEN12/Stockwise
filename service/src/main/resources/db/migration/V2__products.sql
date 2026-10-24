-- V2: product catalogue (spec R1, R2, R4).
-- Undo: db/rollback/U2__products.sql
--
-- product_quantity_non_negative is the database backstop for the key rule
-- "stock never falls below zero" (R4). The sale transaction also guards each line with
-- UPDATE ... WHERE quantity >= :q; the evidence branch evidence/no-stock-guard removes both.

CREATE TABLE product (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    reference           text        NOT NULL,
    name                text        NOT NULL,
    category            text        NOT NULL,
    price_kobo          bigint      NOT NULL,
    quantity            integer     NOT NULL,
    low_stock_threshold integer     NOT NULL,
    active              boolean     NOT NULL DEFAULT true,
    version             integer     NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT product_reference_uq             UNIQUE (reference),
    CONSTRAINT product_reference_not_blank      CHECK (length(trim(reference)) BETWEEN 1 AND 40),
    CONSTRAINT product_name_length              CHECK (length(trim(name)) BETWEEN 1 AND 200),
    CONSTRAINT product_category_not_blank       CHECK (length(trim(category)) BETWEEN 1 AND 60),
    CONSTRAINT product_price_non_negative       CHECK (price_kobo >= 0),
    CONSTRAINT product_quantity_non_negative    CHECK (quantity >= 0),
    CONSTRAINT product_threshold_non_negative   CHECK (low_stock_threshold >= 0),
    CONSTRAINT product_version_non_negative     CHECK (version >= 0)
);

-- Q1: catalogue list filtered by active flag and category.
CREATE INDEX product_active_category_idx ON product (active, category);

-- Q2: low-stock list; only the (few) low rows are indexed.
CREATE INDEX product_low_stock_idx ON product (quantity)
    WHERE active AND quantity <= low_stock_threshold;
