/**
 * Retry-safe restock recording (spec R5 and R6). A restock and its positive stock movement are
 * committed in one transaction; history is append-only and corrections are future reversals.
 */
package ng.tesa.stockwise.restock;
