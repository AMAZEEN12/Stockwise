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
