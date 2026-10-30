# Monitoring: Real Sale Reversal & Oldest-First Repayment Allocation

Status: deferred per DM31 (Stockwise decisions file)
Author: Nnaemeka Chukwuma (Data and rules owner) · Date: 2026-10-30

## Status note
Monitoring (Maintain stage) is postponed for the Stockwise product per team decision DM31 to prioritize MVP capabilities and core data/financial rules.

When monitoring is resumed:
- **Core Metric 1:** Reversal frequency and ratio to total daily sales (`GET /dashboard`).
- **Core Metric 2:** Unallocated legacy balance manual review alerts (`REVERSAL_MANUAL_REVIEW_REQUIRED` occurrences).
- **Core Metric 3:** Supervisor OTP generation vs. redemption rate (detecting unused expired codes).
- **Control Bands:** Alert if reversal rate exceeds 5% of daily volume or if any database constraint violation occurs.
