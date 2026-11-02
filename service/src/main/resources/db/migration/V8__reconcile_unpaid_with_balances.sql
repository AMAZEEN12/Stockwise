-- V8: bring sale.unpaid_kobo in line with what customers actually owe (spec R9, R11, R12).
-- Undo: db/rollback/U8__reconcile_unpaid_with_balances.sql (data only; the schema is unchanged).
--
-- V6 set unpaid_kobo = total_kobo on every unreversed credit sale, but repayments recorded before
-- V6 (the demo seed's, for example) were never allocated to sales. For those customers the unpaid
-- amounts add up to more than their balance, so reversing an already repaid sale tried to relieve
-- debt that no longer exists and failed. This applies the old repayments oldest sale first, as
-- V6's allocation rule does: the newest sales keep their unpaid amount until the balance is used
-- up, older ones are marked repaid, and each change is recorded as a repayment_allocation (with no
-- ledger entry, since the repayment predates them). A customer whose unpaid total already equals
-- or is below their balance is not touched. Running it again changes nothing.
--
-- First, sales that were reversed before V6 (the seed reverses one) have their REVERSAL ledger
-- entry and SALE_REVERSAL movements but no reversed_at, so they could be reversed a second time,
-- returning the stock and the credit twice. They are marked reversed, at the time of that entry.

UPDATE sale s
SET reversed_at              = le.created_at,
    reversed_by              = s.created_by,
    reversal_reason          = 'OTHER',
    reversal_notes           = 'Reversed before reversals were recorded on the sale (V8)',
    reversal_idempotency_key = gen_random_uuid(),
    unpaid_kobo              = 0
FROM ledger_entry le
WHERE le.source_type = 'REVERSAL' AND le.source_id = s.id AND s.reversed_at IS NULL;

WITH open_sale AS (
    SELECT s.id, s.customer_id, s.created_by, s.unpaid_kobo, c.balance_kobo,
           sum(s.unpaid_kobo) OVER (PARTITION BY s.customer_id) AS unpaid_total,
           sum(s.unpaid_kobo) OVER (PARTITION BY s.customer_id ORDER BY s.created_at DESC, s.id DESC)
               - s.unpaid_kobo AS unpaid_newer
    FROM sale s
    JOIN customer c ON c.id = s.customer_id
    WHERE s.payment_type = 'CREDIT' AND s.reversed_at IS NULL AND s.unpaid_kobo > 0
), corrected AS (
    SELECT id, customer_id, created_by, unpaid_kobo,
           GREATEST(0, LEAST(unpaid_kobo, balance_kobo - unpaid_newer)) AS new_unpaid
    FROM open_sale
    WHERE unpaid_total > balance_kobo
), allocated AS (
    INSERT INTO repayment_allocation (customer_id, sale_id, repayment_ledger_entry_id, amount_kobo, created_by)
    SELECT customer_id, id, NULL, unpaid_kobo - new_unpaid, created_by
    FROM corrected
    WHERE new_unpaid < unpaid_kobo
    RETURNING sale_id
)
UPDATE sale s
SET unpaid_kobo = corrected.new_unpaid
FROM corrected
WHERE s.id = corrected.id AND corrected.new_unpaid < corrected.unpaid_kobo;
