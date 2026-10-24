# Review instructions: Stockwise

Applied to every pull request, whether a human or an AI tool reviews it. Findings inform the decision. A human code owner approves the merge through branch protection (DM30). The author of a change never approves it, and an AI tool never approves anything.

## Approvals
- One approval from the code owner of the changed area (CODEOWNERS): Data and rules is Nnaemeka Chukwuma, API and access is Isaac Bassey, Delivery is Blessing Nwafor, Interface is Victor Oyeleke.
- Changes to the sale, reversal or store-credit code, or to any migration or undo script, also need **Isaac Bassey** (technical sign-off, DM7).
- Contract changes need a dated line in `decisions.md` §3 naming the two engineers who agreed it.

## Passes
Run these passes and tag each finding with its pass:
- **Bugs:** logic errors, broken edge cases, subtle regressions. Check the five screen states on UI changes.
- **Security:** authentication and role checks enforced in the service (not only hidden in the UI), SQL built only with bind parameters, no secrets in code or config, no passwords, tokens or full request bodies in logs.
- **Compliance:** the change matches `sdlc/spec.md` (requirement IDs cited in the PR) and `sdlc/plan.md`. Flag drift from plan.md; plan.md must be updated in the same PR. No endpoint missing from `contract/openapi.yaml`.
- **Money and concurrency (Stockwise-specific):**
  - Amounts are integer kobo end to end (`BIGINT` / `long` / JSON integer). Any `double`, `float`, `BigDecimal`, `numeric` or `parseFloat` near money is **Important**.
  - Every rule that protects stock, balance or store credit is enforced in SQL (CHECK constraint or conditional `UPDATE … WHERE <guard>`), not by read-then-check-then-write in Java.
  - Multi-row updates lock in a consistent order (`product_id` ascending).
  - Ledger and movement rows are never updated or deleted; corrections are reversals.
  - Recording writes accept and honour `Idempotency-Key`.
  - A new rule comes with a test that fails when the rule is removed, logged in `docs/rule-removal-log.md`.
  - A new migration has its undo script; applied migrations are not edited.
- **Accessibility (UI PRs):** keyboard reachable, visible focus, labelled inputs, status changes announced (`aria-live`), no information conveyed by colour alone, works at 360 px. Stale or estimated figures say so.

## Severity
- **Important:** would break behaviour, lose or misstate money or stock, leak data, weaken a test, or breach the brief's rules. Must be resolved before merge.
- **Nit:** style, naming, minor readability.

## Cap the nits
Report at most **5** nits per review. Summarise the rest as a count ("+7 more nits").

## Always reject
- Deleting, skipping (`@Disabled`, `.skip`, `.only`) or loosening a test without a decision entry.
- Any PR from `evidence/no-stock-guard`.
- Edits to `web/src/api/schema.d.ts` by hand.
- Hard-coded dashboard figures or demo data presented as real.

## Do not report
- Generated files: `web/src/api/schema.d.ts`, build output, lockfile churn.
- Anything CI already enforces (formatting, lint rules, type errors, gitleaks).

## Feedback into AGENTS.md
When a review flags the same mistake for the second time, add the correction to `AGENTS.md` "Mistakes to avoid" in the same PR. Also flag when a change makes AGENTS.md outdated (commands, paths, conventions).

## Tuning
After Monday 26 Oct and again around day 10, the team lead (Isaac Bassey) rates the findings from recent reviews and adjusts this file.
