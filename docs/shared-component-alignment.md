# Shared component source clarifications

Date: 2026-10-25. Decision: DM53 in [decisions.md](../decisions.md).

**Decided by:** Victor Oyeleke. **Approved by:** Victor Oyeleke. **Logged by:** Codex.

Victor confirmed that the upstream agreement correctly covers **four interface engineers**: Muizz Jamiu, Ehimare J. Okosun, Victor Oyeleke and Ufoma Onowho. The earlier Stockwise count of five is corrected by DM53; historical decision entries remain available with that correction identified. The names are recorded in the [upstream agreement](https://github.com/spr-tech/interface-eng-shared-components/blob/dbe1cac1f5e6e0838331e35b8da482ab4a1497fc/docs/decisions.md).

## Verified source behavior

The review inspected immutable upstream revision `dbe1cac1f5e6e0838331e35b8da482ab4a1497fc`. These notes correct stale statements in that revision's README; they describe the implementation actually inspected, rather than assuming the README's known-gap section is still accurate.

| Component | Correct behavior at the reviewed revision | Source and owner |
|---|---|---|
| Card | Omitting `image` renders text-only content with no image area. Passing a nonempty `image` renders a 16:9 image; passing `image=""` renders the decorative image-unavailable placeholder. The separate CardImage component also renders its placeholder when `src` is absent or empty. The README statement that Card always renders an image area is outdated. | [card.tsx](https://github.com/spr-tech/interface-eng-shared-components/blob/dbe1cac1f5e6e0838331e35b8da482ab4a1497fc/src/components/ui/card.tsx); Ufoma Onowho |
| Select | The trigger already reads shared CSS variables directly for background, text, border, focus, radius and font. Its form-control edge uses `--color-border-input`; its popover uses the decorative `--color-border`. The README warning about unmapped semantic utility classes and a low-contrast trigger border is resolved in this source. | [select.tsx](https://github.com/spr-tech/interface-eng-shared-components/blob/dbe1cac1f5e6e0838331e35b8da482ab4a1497fc/src/components/ui/select.tsx); Ehimare J. Okosun |
| Checkbox | The control already reads shared CSS variables directly and uses `--color-border-input` for its unchecked edge. Checked colors and focus styling also use shared variables. The README warning about missing semantic utility mappings and the control using a decorative border is resolved in this source. | [checkbox.tsx](https://github.com/spr-tech/interface-eng-shared-components/blob/dbe1cac1f5e6e0838331e35b8da482ab4a1497fc/src/components/ui/checkbox.tsx); Ehimare J. Okosun |

No additional semantic utility mapping or upstream border repair is needed to address those obsolete Select/Checkbox warnings. Stockwise must still supply the existing shared tokens and verify contrast after overriding their values; this review does not establish contrast or visual approval for a future adoption. Keep DM41's canonical Tailwind replacements when copying components.

## Approval scope and provenance

Victor approved correcting the engineer count and recording these source clarifications in Stockwise Markdown. Runtime component migrations, new shared APIs, dependency changes and API-contract changes remain separate proposals. This documentation update does not modify the upstream repository or claim approval from its other engineers.

Stockwise's existing copied primitives retain provenance at `d15361177dff8b67a4ad71ed287321adb3d7fe71`; the newer review revision is not a claim that the code was upgraded. See [auth implementation provenance](auth-ui-implementation.md#shared-component-provenance).

## Implementation authorized, 2026-10-25 (DM55)

**Approved by:** Victor Oyeleke. **Logged by:** Codex. Victor subsequently authorized implementing all seven reviewed alignment proposals. This supersedes the earlier documentation-only scope for Stockwise's local component migration; it does not supply approval from other shared owners or approve an API-contract change.

Work is on `feat/shared-component-alignment`, retaining Victor's current product and CSS refinements. Card, EmptyState, ErrorState, Skeleton, StatusBadge, FilterBar, Select and Checkbox are copied from reviewed revision `dbe1cac1f5e6e0838331e35b8da482ab4a1497fc`; ownership and default APIs are retained. DM41's three canonical Tailwind substitutions are applied. Existing Button/Input/FormField/Dialog/Toast provenance remains separately recorded; extensions are identified below rather than presented as upstream changes.

| Proposal | Stockwise implementation |
|---|---|
| Shared screen states | Customer loading composes Skeleton; customer empty/error states and product states use shared primitives. StatusPanel's error path composes ErrorState, preserving multi-action recovery content. Its informational path remains a persistent business notice for unresolved sales; transient Toast cannot replace that record. Sale search, empty cart and receipt loading use shared states. |
| Shared controls | FilterBar gives Products, Customers, Customer Picker and sale search visible labels and result announcements. Product filtering uses Select; category creation retains the editable catalogue-backed Input/datalist because the existing API permits new category strings. Native text/quantity/date fields use FormField/Input, acknowledgements use Checkbox, and action buttons use Button. Navigation remains React Router links. Customer Picker stays a compound Dialog flow, rather than being reduced to a single-option Select. |
| Notifications | One root ToastProvider supports customer/product/sale success. Success notices use the shared five-second duration and explicit dismissal. Uncertain saves remain persistent and never rely solely on a toast. The original four-toast eviction policy is retained and remains an upstream limitation. |
| Dialogs and confirmation | Product and mobile navigation drawers use Dialog. Sale and unsaved-product/customer confirmation use ConfirmDialog. Sale confirmation still requires accepting changed stock/prices; customer POST is never automatically retried. Controlled sale transitions are preserved without forcing the parent state back to idle after confirmation. |
| Cards and badges | Mobile customer balance cards compose text-only Card/CardBody. Stock, store-credit and user-role labels use StatusBadge with an outlined appearance. Tables retain their semantic headers and money remains integer kobo. |
| Tokens | Warning uses the existing muted color with an on-background pair, avoiding a new brand color. Existing overlay, disabled/saving/skeleton, shadow and radius values move into tokens. The radius alias now reads radius-md; card/dialog compositions explicitly retain their supplied 16px or 12px corners. Focus width and offset come from shared tokens. |
| Persistent guidance | Root AGENTS.md points agents to the copied shared-component skill and this document. The skill retains upstream rules and identifies the locally approved adaptations. |

Visible search/quantity/date labels, filter result counts and automatic success dismissal are intentional changes approved as part of the proposal. They change reference geometry; neither the previous references nor this migration are automatically approved as pixel-perfect.

## Additive APIs proposed to shared owners

These extensions are implemented locally under Victor's DM55 authorization. They are documented proposals for the named owners, not claims of acceptance in the shared repository. No upstream PR or message has been sent.

| Owner | Proposed additions and purpose |
|---|---|
| Muizz Jamiu | Button `loadingLabel` (existing) and `contentClassName` preserve pending copy and compound option layouts. FormField `requiredIndicator` suppresses a duplicate asterisk when the visible label already says required, while preserving required ARIA. Existing decorative error SVG and DM41 canonical classes remain. |
| Ehimare J. Okosun | FilterBar `searchInputProps`, `searchIcon` and `searchInputClassName` provide bounded native field configuration and the supplied search-icon composition. Stockwise retains the existing textbox role, input length limits and busy disabling. Select and Checkbox need only canonical utility substitutions, not the obsolete README token/border fixes. |
| Victor Oyeleke | Dialog adds placement, header/body/footer/close slots and dismissible control, retaining the earlier style/focus slots. ConfirmDialog adds confirmDisabled, closeOnConfirm, actionOrder and bounded button props; a synchronous submission ref prevents same-tick double confirmation. ToastProvider adds toastClassName. Dialog/Toast focus reads configured width/offset, and the hidden notification variant remains announced. |
| Ufoma Onowho | EmptyState/ErrorState add layout, title/description/action slots and details for reference compositions and request IDs. ErrorState title/description remain strings. Card adds a body layout slot and reads the product card-radius token with a shared fallback. StatusBadge adds outlined appearance. Skeleton reads an optional product skeleton-color token with the shared border-token fallback. |

Dependencies added for the selected controls only: pinned `@radix-ui/react-select` 2.4.1, `@radix-ui/react-checkbox` 1.4.1 and `lucide-react` 1.61.0. React Router Data Mode, Formik/Yup, Axios and RTK Query remain in place. No endpoints, generated types, money rules, migrations or backend files are changed.

Product category options have opaque `category:`-prefixed values inside Select, so a real free-text category cannot collide with the shared Any sentinel. The adapter strips the prefix before updating the URL/API filter; the existing category wire format is unchanged.

## Verification and limits

The copied components use the supplied Stockwise values. Twenty computed foreground/background token pairs meet their thresholds; the lowest measured ratio is 5.56:1 (input border on the surface). Decorative divider/card-edge contrast is not counted as a form-control boundary. Browser checks also verify 10px input corners and 3px/2px keyboard focus treatment. Automated axe checks do not constitute a manual screen-reader sign-off.

Initial browser QA exposed a cold-start navigation timeout. A later run exposed Vite watching an exclusively locked Playwright trace, which crashed its server on Windows. The dev watcher now excludes generated test results/reports, local mock scratch files and reference exports. Expensive builds run separately from browser QA; existing assertions and timeouts are preserved.

Visual review caught and corrected double borders/padding on mobile Card composition and excess Button padding that wrapped the selected customer name. Current screenshots retain the exact selected-customer message Victor approved. Visible labels/result counts and notification duration remain the intended proposal changes, with human visual approval still required.

The production dependency audit reports zero vulnerabilities; the existing development mock dependency tree still reports eight advisories (seven high, one moderate). The production build succeeds with the existing main-chunk warning: 555.23 kB, gzip 182.68 kB. No forced dependency remediation or unrelated bundling change was applied.

Service verification was attempted but cannot start because JAVA_HOME is not defined correctly. No backend test result or deployed service behavior is claimed. Final frontend/browser outputs are recorded in sdlc/WORKLOG.md.

All 56 browser scenarios passed across the full suite and focused reruns, rather than in a single uninterrupted run. The final full run passed 54/56; a README-triggered navigation refresh affected desktop picker UUID selection, and the mobile picker screenshot/axe flow exceeded its existing 30-second deadline. UUID selection subsequently passed on both viewports; the long picker flow passed on both viewports using the unchanged checks with the supported full Chromium channel. Headless-shell timing remains variable on this Windows machine. `npm run check:ui` provides an owned, warmed server and accepts the original Playwright arguments; it does not change assertions or deadlines.

All 36 Customer Picker/Customers reference states were compared, preferring final targeted captures for rerun states. Changed-pixel percentages range from 1.97% to 13.32%. The four stock-conflict/store-credit comparisons range from 3.93% to 16.67%. Stock uses the updated 2x exports; the corrected store-credit frames currently supplied are 1x and are normalized to logical dimensions. Reports remain ignored local QA artifacts. These nonzero measurements include intentional labels/counts and existing differences; no pixel-perfect claim is made.
