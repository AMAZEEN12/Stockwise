-- V8 changed data only (marked pre-V6 reversals, sale.unpaid_kobo, new repayment_allocation
-- rows), not the schema. Undoing V7 and V6 removes what V8 touched; there is nothing to drop here.
SELECT 1;
