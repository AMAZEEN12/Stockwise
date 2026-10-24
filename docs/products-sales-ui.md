# Products and sales UI

2026-10-24. Decided by Victor Oyeleke (scope and supplied references); implementation choices/proposals by Codex; logged by Codex.

Products and shared application layout belong to feat/products-ui. New sale and Receipt belong to a subsequent feat/sales-ui branch based on Products; these are stacked on the existing authentication work, without merging main. Each gets a descriptive feature commit. No publishing or deployment is implied.

Reference inputs live locally in web/Screens, ignored and removed from the Git index while preserving local files. This supersedes DM43's versioned-reference policy. Runtime assets remain in src/assets/images with named exports. Existing binary history is not rewritten.

Quality control uses the latest Stock conflict @2x exports (2880x1800 desktop and 720x2000 mobile) and corrected Store credit exports currently @1x (1440x900 and 360x1000). Compare at common logical viewports; never upscale CSS dimensions because export density differs. Store credit is 6150 - 6000 = 150 naira. Stock conflict keeps a zero-quantity row, blocks Confirm until removal, and recalculates totals from valid units. Use the updated bordered quantity field consistently. Product form uses 1440x900 and 360x900; mobile catalogue/sales use 360x1000.

Keep Inter Tight, JetBrains Mono, the supplied dark/lime tokens, 48px controls, 44px icon targets, desktop 240px sidebar, 48px content gutter, 480px form drawer and mobile 20px gutters. Reuse shared Button/Input/Dialog with documented styling slots and canonical Tailwind classes from AGENTS.md. Native semantic fields, focus restoration, keyboard navigation, live statuses and reduced motion remain required.

The active OpenAPI stays unchanged; see [contract proposals and recovery](products-sales-contract-proposal.md). The mock is development-only simulation, never backend or concurrency evidence. No money/stock business rule or migration is changed in this UI work.

Verification and measured visual differences are recorded in sdlc/WORKLOG.md as work proceeds. Human approval of pixel comparison remains with Victor; do not claim perfect fidelity without comparison evidence.
