# Web vitals evidence, 2026-10-30

Targets (DM12, spec N8): LCP ≤ 2.5 s and INP ≤ 200 ms on the deployed address.
Address measured: https://stockwise-smoky.vercel.app/ (Vercel, stack V). Measured by Blessing Nwafor.

## Result

| Measure | Target | Mobile | Desktop | Verdict |
|----|----|----|----|----|
| LCP | ≤ 2.5 s | 2.4 s | 0.5 s | **Met, narrowly on mobile** (0.1 s margin) |
| INP | ≤ 200 ms | 216 ms (worst interaction in the session) | not separately measured | **Not met, by 16 ms** |
| CLS | ≤ 0.1 | 0 | 0.001 | Met |
| Total blocking time | reported | 180 ms | 0 ms | Reported |
| First contentful paint | reported | 2.4 s | 0.4 s | Reported |
| Lighthouse performance | reported | 90 / 100 | 100 / 100 | Reported |
| Lighthouse accessibility | reported | 100 / 100 | 100 / 100 | Reported (automated checks only) |

## LCP, CLS, TBT: Lighthouse

- Tool: Lighthouse 12.8.2 run by the `Lighthouse` workflow (Actions) from a GitHub-hosted runner, 2026-10-30 13:18 UTC.
- Mobile: Lighthouse mobile profile with simulated throttling. Desktop: desktop preset.
- One run per form factor. Lighthouse is lab data and varies from run to run, so the mobile LCP of 2.4 s could land on either side of 2.5 s on another run.
- The page measured is the address the site opens on (the first screen a visitor sees), not the screens behind sign-in.
- Server response for the page itself: 10 ms. Lighthouse's own notes: about 107 KiB of JavaScript is shipped but unused on first load, and a few resources block first render. Both are the likely route to a safer mobile LCP.
- Raw reports in this folder: `lh-mobile.report.html`, `lh-mobile.report.json`, `lh-desktop.report.html`, `lh-desktop.report.json`.

## INP: web-vitals library

- Tool: the web-vitals library in the browser on the deployed site, [browser and device], [throttled or not].
- INP is the slowest interaction (click, tap or key press) seen during the visit, so it can only rise as more interactions happen.
- Early in the session INP read **40 ms**. By the end of the session it had risen to **about 216 ms**. The figure reported is the end-of-session 216 ms, because that is the worst interaction a user would meet in that visit.
- The interaction behind the rise: [name the page and action, e.g. "typing in the product search on the new sale screen"] or [not identified]. Keep whichever applies.
- Single device, single session. This is not field data from real shops.

## What is not covered

- LCP and INP on the screens behind sign-in (sales, customers, products) were not run through Lighthouse.
- Lighthouse accessibility 100 is automated. The screen-reader pass (NVDA or VoiceOver) is separate.
- No fix for INP was made before submission. The interface owner has the figure.