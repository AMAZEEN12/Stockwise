# AI assistance log

Record actual AI use, human decisions and verification. Do not include credentials, tokens, passwords or real customer data.

## 2026-10-24: Frontend phase 2 starter

- Engineer and decision maker: Victor Oyeleke (Interface). Assistant: Codex, used locally; no AI runs in CI.
- Request: understand the product documents and component proposal, align the frontend structure, then publish folders/docs and one empty HTTP-client file without application implementation.
- Human decisions: folders/docs only with an explicit exception for the empty HTTP client; one API file per resource; central endpoints and image exports; app-wide foundational tokens; React Router Data Mode, Axios, Formik/Yup and Redux Toolkit/RTK Query; component foundation pending, shadcn not required; initial docs baseline on main followed by a separate starter branch and reviewed PR. See DM32-DM36 for attribution.
- Work: read the SDLC chain and supporting Markdown, extracted the local shared-component PDF text, created the starter placeholders, documented responsibilities and phase 3 unknowns, and aligned the current plan/spec/runbook/conventions. No API shapes, endpoints, component agreements or session-storage policy were invented.
- References consulted during planning: official React Router Data Mode installation, Redux Toolkit query customization/Axios integration, shadcn introduction and Radix Primitives introduction. Their availability does not mean those libraries were installed or the shared component proposal adopted.
- Review finding: local self-review found that blank lines before newly appended Markdown decision/question rows split the existing tables. Removed the blank lines before committing and included table continuity in the static verification.
- Verification: exact folder/file set, zero-byte placeholders and HTTP client, existing local Markdown link targets, decision IDs and table continuity, staged scope and whitespace. Application/service/contract checks cannot run because their scaffolds do not exist; no runtime passing result is claimed. Publication evidence belongs in WORKLOG.md and the PR.
- Publication: baseline `176fc3a` on main; starter `45f49c6` on `chore/web-structure`; [PR #1](https://github.com/AMAZEEN12/Stockwise/pull/1) opened into main for human review. Initial remote heads matched local refs. The connector could read but not create the PR (403); the Git credentials that successfully pushed the branches were used for the authorized PR creation without displaying or storing credential values in the project. A docs-only follow-up records this outcome; no merge or deployment was performed.

## Phase 3 frontend alignment (2026-10-24)

- Login implementation uses the existing OpenAPI PR #2 contract (`POST /auth/sessions`, `GET /me`) and does not invent a registration endpoint.
- Sign-up is currently a validated UI flow with an explicit pending adapter until the API owner approves a registration contract.
- The finalized four-engineer shared component set is a copy-in source; Stockwise does not depend on that repository at runtime.
- Stockwise supplied design tokens are the single source of truth for every feature and override neutral shared token values.
- The local `web/Stockwise — Login-png/` design-reference folder is ignored and is not a runtime asset.
- Decided by: Victor Oyeleke. Logged by: Codex.
