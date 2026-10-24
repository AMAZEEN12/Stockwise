# Intent: Stockwise, stock and customer credit for one small shop

Author: Nnaemeka Chukwuma (Team 3, service tier) · Product owner: Nnaemeka Chukwuma (acting; team lead not yet designated) · Status: accepted
Created: 2026-10-23 · Accepted: 2026-10-23 by Nnaemeka Chukwuma
Source document: `Tesa cohort 6 software engineering capstone project.pdf`, product 3 "Stockwise" (pp. 10-11), shared requirements (pp. 3, 23-26) · Entry route: idea (programme brief)
Source of truth: repository
Supporting skills: none

## Problem
From the brief: "Small retailers need to track fast-moving items, restocking, and customers who buy on credit." The records sit in notebooks or in somebody's memory. That makes it hard to know what is available, what needs replenishing and what credit is outstanding. The brief singles out the credit record as "the part that most often proves unreliable."

Context for the build: TeSA Africa Cohort 6 capstone. Team 3 (Victor Oyeleke on the interface tier; Blessing Nwafor, Isaac Bassey and Nnaemeka Chukwuma on the service tier; supervised by Goodnews) has 14 days, with an MVP checkpoint on **Monday 26 October 2026**. Stockwise is the team's main product, worth 60 team marks plus 40 individual marks.

## Proposed outcome
One small shop has a stock and customer ledger that quickly answers three questions:
1. What is running low?
2. What did we record as sold?
3. What balances remain outstanding?

The owner manages the catalogue and restocks. An assistant records paid and credit sales on a phone at the counter. Corrections are reversing entries, and the history is always complete. Figures stay correct when two devices act at once, when the network stalls and a sale is resubmitted, and in every money calculation, which uses integer kobo.

## Affected users and systems
- Users: shop owner or manager; sales assistant (on a phone at the counter); demonstration administrator.
- Systems (new): the Stockwise web interface on a free static host; the Stockwise HTTP service on free application hosting; free managed Postgres; GitHub Actions pipeline; OpenAPI contract and a mock server. These live in `stockwise/` in this repository.

## Primary journeys (from the brief)
1. The owner adds products with name, category, selling price, quantity and a low stock threshold.
2. An assistant records a sale by selecting products and quantities, and stock falls.
3. The owner sees low stock items and records a restock when new stock arrives.
4. For a credit purchase, the assistant records the amount owed and an optional due date.
5. When a customer pays part or all of a balance, the assistant records it and the balance updates.
6. A dashboard shows today's recorded sales, low stock products and total outstanding credit.

**Monday journey (26 Oct):** journeys 1 and 2 with a credit sale. The owner adds a product, an assistant records a sale in kobo, and stock falls. When two devices sell the last unit, stock ends at zero with one sale recorded. Submitting the same sale twice records it once.

## Constraints
- **Money:** every amount is stored, sent and calculated as an integer number of kobo (₦450 = 45000). Naira formatting is applied on screen only. An automated test must prove that no floating-point value enters the ledger.
- **Concurrency:** stock never falls below zero, and the check runs where two devices cannot both pass it, using database constraints and transactions. A read-then-write in application code does not meet the rule.
- **Idempotency:** submitting the same sale twice because the network stalled records one sale.
- **Ledger integrity:** sale, repayment and restock history is kept forever. Corrections are reversing entries, never edits. A credit sale requires a customer. A repayment may not exceed the balance outstanding at the moment it is applied.
- **Contract first:** no application code on days 1-2. The OpenAPI document and the mock server come first, and every contract change goes in the decisions file, agreed by two engineers.
- **Cost:** nil, on free tiers only. Free-tier terms must be verified on each provider's own pricing page, with the date recorded in the README.
- **Data:** demonstration data only. No real financial data, and no claim of any relationship with a real shop.
- **Accessibility and UX:** WCAG 2.2 AA; five screen states on every screen; usable on a phone at the counter and on a throttled connection.
- **Deadline:** MVP checkpoint Mon 26 Oct 2026. Final submission assumed Tue 3 Nov 2026 (Day 14); not confirmed, see open questions.
- **Team capacity:** about two thirds of team time goes to Stockwise and one third to Genie. If both MVPs can't be finished, Stockwise is protected and the supervisor is told by Friday.

## Out of scope
- Payment gateway or bank integration.
- Automatic messaging, invoicing integration, accounting or tax compliance.
- Multiple branches, supplier procurement, barcode hardware.
- Real financial data. One shop, one currency (NGN), no tax.
- Delivery integrations, live chat, real identity verification (shared fairness rules).

## Success criteria
Taken from the brief's definition of done. Each must be demonstrable from a clean browser on the deployed addresses.
- S1. When two devices sell the last unit at the same moment, stock ends at zero with exactly one sale recorded. An automated test shows this, and the same test fails when the database protection is removed.
- S2. Submitting the same sale twice records it once.
- S3. A reversed sale restores stock and the customer's balance, and both the original and the reversal appear in the history.
- S4. An automated test proves that no floating-point value enters the ledger.
- S5. Low stock indicators and dashboard figures match the underlying records and are labelled as demonstration data.
- S6. Seed data includes at least 120 products, 60 days of sales and 14 customers carrying credit, one of them with a reversed transaction.
- S7 (Monday checkpoint). The Monday journey works end to end against the deployed service, the S1 test is shown failing and then passing, both tiers deploy through GitHub Actions, and the README lists the demonstration credentials and labels anything simulated.
- S8 (final). The rubric evidence exists: a load test with p50/p95/p99 figures and a saturation point, screen-reader findings in the README, LCP and INP targets measured on the deployed address, five decision records, the AI log and a 10-minute walkthrough.

## Open questions
- [x] Final submission date: answered later, Tue 3 Nov 2026 (DM6, Team 3)
- [x] Design problem with no clean answer. Unlike the other three main products, the brief names none for Stockwise. Proposed candidate: **a credit sale is reversed after the customer has already repaid part of it, so the balance would go negative (the shop owes the customer).** Should the reversal be blocked, create a store credit, or record a refund owed? Each option has a named cost. The supervisor needs to agree that this is the intended design problem, or name another. (owner: Goodnews) · answered later: option C, store credit (DM5, Team 3). The supervisor still has to confirm this is the intended design problem (UNRESOLVED, owner Goodnews)
- [x] Team lead: answered later, Isaac Bassey (DM7, Team 3)
- [x] Split of the three service areas (Data and rules, API and access, Delivery and evidence) among Blessing, Isaac and Nnaemeka. The brief says to record this on day 1. Nnaemeka says they will work across all service areas. (owner: Team 3) · answered later (DM8, Team 3)
- [ ] Weekend availability (24-25 Oct) for each engineer, which the supervisor is to confirm. (owner: Goodnews) · UNRESOLVED

## Measurement
- Leading: time from the first conversation to an accepted intent.md (git timestamps).
- Lagging: whether this intent is accepted into Design, and how many edits it gets after spec.md is first committed.
