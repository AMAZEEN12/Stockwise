---
name: shared-components
description: Use the TeSA shared UI components (src/components/ui) whenever creating or changing a screen, page, form, form field, list, card grid, dialog or confirmation, filter or search bar, loading state, empty state, error state, status label, or toast/notification. Covers which component to use, the five screen states (loading, empty, error, success, confirmation), its real props, required files and dependencies, design tokens, and accessibility rules.
---

# Shared components

## Stockwise adaptation record

Copied from upstream revision `dbe1cac1f5e6e0838331e35b8da482ab4a1497fc`. For this product, first read root `AGENTS.md` and [approved local adaptations](../../../docs/shared-component-alignment.md). Victor Oyeleke approved the local migration under DM55; additive APIs remain proposals to their shared owners. His explicit approval takes precedence over the upstream restrictions on changing copied components for this documented scope. Preserve shared behavior and ownership, Stockwise design tokens and DM41's canonical Tailwind classes. The older README Card and Select/Checkbox notes are corrected in that adaptation record; inspect actual source rather than repeating those obsolete warnings.

Product UI in TeSA Cohort 6 is built from the shared components in `src/components/ui/`. The full reference, with props and examples for each component, is the shared repo's README: https://github.com/spr-tech/interface-eng-shared-components/blob/main/README.md. Read it before using a component.

## Before writing UI

1. **Look first.** List `src/components/ui/` in the project. If a shared component covers the need, use it.
2. **Read the real API.** Open the component file and check what it exports, its prop types, its required props and its header comment. Don't guess prop names; the README and the source are the truth.
3. **Bring its dependencies.** When copying a component into a product, also copy the files it imports:
   - `src/lib/cn.ts`, for every component except Card
   - `button.tsx`, for Dialog, EmptyState, ErrorState and FilterBar
   - `form-field.tsx` and `input.tsx`, for FilterBar

   Also install the npm packages the component imports: `clsx`, `tailwind-merge`, `@radix-ui/*` and `lucide-react`.
4. **Don't duplicate.** Don't write a one-off button, modal, spinner, badge, toast or form field when a shared one exists. If a shared component can't cover a need, say so. Propose the change to the shared repo instead of forking a local copy. Use `className` for layout tweaks only.
5. **Don't edit copies to change the look.** Change token values in `tokens.css` instead.

## Which component for which job

| Need | Use | Import from |
| --- | --- | --- |
| Loading | `Skeleton` (`shape="text" \| "card" \| "image"`), with `aria-busy="true"` on the container | `@/components/ui/skeleton` |
| Empty, or no filter results | `EmptyState` (title, description, optional `action`) | `@/components/ui/empty-state` |
| Load or save failed | `ErrorState` (plain-string title and description, `onRetry`, `retrying`) | `@/components/ui/error-state` |
| Success after an action | `useToast().toast({ variant: "success", ... })`; `<ToastProvider>` must wrap the app once | `@/components/ui/toast` |
| Error notification after an action | `toast({ variant: "error", ... })` | `@/components/ui/toast` |
| Populated list item | `Card` + `CardHeader` / `CardBody` / `CardFooter` | `@/components/ui/card` |
| An item's status | `StatusBadge` (`tone`, status written as text) | `@/components/ui/status-badge` |
| Actions | `Button` (`variant`, `size`, `loading`; `type="submit"` in forms) | `@/components/ui/button` |
| Form control wiring | `FormField` around every control: `{(field) => <Input {...field} />}` | `@/components/ui/form-field` |
| Text input | `Input` inside `FormField` | `@/components/ui/input` |
| Pick one option | `Select` inside `FormField` (`allowAny` for filters) | `@/components/ui/select` |
| Yes/no option | `Checkbox` (controlled: `checked`, `onCheckedChange`) | `@/components/ui/checkbox` |
| Modal content | `Dialog` (`title` and `description` required) | `@/components/ui/dialog` |
| "Are you sure?" | `ConfirmDialog` (`confirmLabel` names the action, `tone="danger"` for destructive, async `onConfirm`) | `@/components/ui/dialog` |
| Search and filters above a list | `FilterBar`, plus `FilterGroup` for checkbox groups | `@/components/ui/filter-bar` |
| Multi-line text | `Textarea` inside `FormField` (`maxLength` + `showCount` for a character count) | `@/components/ui/textarea` |

The `@/` alias assumes the product maps `@/*` to `src/*`. The shared repo's `tsconfig.json` does this. Otherwise use relative imports.

## The five screen states

Every data-driven screen handles all five states from the brief, each with its shared component:

| State | Use |
| --- | --- |
| Loading | `Skeleton` in place of the content, with `aria-busy="true"` on the region being filled. Remove `aria-busy` when the data arrives. |
| Empty | `EmptyState`, for both first use ("No events yet" / "Add your first event") and no results ("No events match these filters" / "Clear filters"). |
| Error | `ErrorState`, rendered when the failure happens, with plain-string copy and `onRetry`. |
| Success | `toast({ variant: "success", ... })` after an action completes. |
| Confirmation | `ConfirmDialog` before an action that needs a confirm step. `confirmLabel` names the action, and destructive actions use `tone="danger"`. |

Card and StatusBadge show the content once it has loaded. They are components, not states.

Where a figure is estimated or may be out of date, the screen says so in words, for example "Updated 10:42" or "Estimated".

## Design tokens

- All colours, radii, focus ring and font come from the CSS variables in `src/styles/tokens.css`, used as `var(--color-…)`. Never hard-code colours.
- Never rename a token; change only its value.
- After changing a colour, re-check contrast:
  - 4.5:1 for text, 3:1 for borders and the focus ring.
  - `--color-border-input` must stay at 3:1 or more.
  - Each `--color-on-*` must reach 4.5:1 on its role colour.

## Accessibility rules

- Every form control has a visible label through `FormField`, or `label` on `Checkbox`.
- Group related checkboxes in `FilterGroup`, which renders a fieldset with a legend.
- Icon-only buttons need `iconOnly` and an `aria-label`.
- Never use colour as the only signal. Badges, errors and toasts must say it in words.
- Pick the `headingLevel` on EmptyState and ErrorState to fit the page's heading order.
- Map errors to plain copy. Never show `error.message` or codes in `ErrorState` or a toast.
- Keep focus visible. Don't remove focus outlines, and don't leave focus on an element that has disappeared.
- Layouts must work at 360px wide without horizontal scroll.
- Respect `prefers-reduced-motion` for any new animation.
- Do a keyboard-only test of the changed screen.

## Validate

Run the project's checks after UI changes and fix every failure:

```
npm run lint
npm run typecheck
npm run build   # if the product defines it; the shared repo has no build script
```

Report the result of each check to the user. If one couldn't run, say so instead of claiming success.
