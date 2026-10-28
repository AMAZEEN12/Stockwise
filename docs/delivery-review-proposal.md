# Delivery review of the 28 Oct proposals

2026-10-28 · Reviewer: Blessing Nwafor (Delivery and evidence). Both proposals are still DRAFT in decisions.md section 3; this note changes nothing in the contract. Drafted with an AI assistant (see docs/ai-log.md).

## A. Delegated reversal codes (Supervisor OTP)

Checked: the `sale(id)` and `app_user(id)` references in the proposed V5 match V3.

Delivery needs before this can ship:
- Add `U5__reversal_authorizations.sql`. The undo-script CI check requires one for every V file.
- Include V5 in a rollback rehearsal and record it in docs/releases.md.
- Isaac approves V5 (migrations are a high-risk path, REVIEW.md).
- Add a concurrency test: N parallel redemptions of one code give exactly one success and the rest 409. A script is proposed at `load/concurrency/code-redeem.mjs`.
- Update `scripts/reset-demo.sql` so the new table is cleared on reset.

Questions for Isaac:
1. A 6-digit code has 1,000,000 values. Is there an attempt limit per user or per sale on redemption?
2. Should expired and used codes be purged, or kept for audit?
3. What status does a successful reversal return (the proposal says 201 only for generating a code)?

Cost: none. The code is shown on the owner's screen, so no SMS or other paid service is needed.

## B. Customer portal and store credit

Store credit already exists in scope (DM5). The portal is new scope.

Delivery risks if the portal goes ahead:
- Public, no-login endpoints (`/portal/customer/{token}/...`) on free Render and Neon.
- The token sits in the URL path, so it will appear in Render request logs. It needs redaction before anything is deployed.
- Pre-orders let any token holder write to the database. Rate limits and a size cap are needed.
- More migrations, so more undo scripts, more rehearsal time, and more seed and reset changes.
- Token lifetime, revocation and rotation are not defined (Isaac to review).

Recommendation: build store credit only if the team agrees, and list the portal as future work. The final is 3 Nov.

## Sign-off

Delivery owner: Blessing Nwafor. No approval of the contract is implied.