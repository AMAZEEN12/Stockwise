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

## 2026-10-25: Approved shared-source documentation correction

- Victor Oyeleke confirmed and approved four interface engineers and the Card and Select/Checkbox source clarifications (DM53). Codex updated Markdown and retained the original copy-in provenance. See [source clarifications](shared-component-alignment.md). Component migration proposals remain separate.
