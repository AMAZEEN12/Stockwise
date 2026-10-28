import type { Page } from '@playwright/test';

// Resize, then wait until the browser has actually applied the new width
// and finished a layout pass, so measurements are not taken on a stale layout.
export async function resizeAndSettle(page: Page, width: number, height = 1000) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(
        (w) => window.innerWidth === w && matchMedia(`(max-width: ${w}px)`).matches,
        width,
    );
    await page.evaluate(
        () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    );
}