import { expect, test } from '@playwright/test';

test('home coin stays visible and mobile tagline sits to its left', async ({ page }) => {
  await page.goto('/');
  for (const { width, height } of [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 412, height: 924 },
    { width: 500, height: 600 },
    { width: 768, height: 600 },
    { width: 1024, height: 600 },
    { width: 1440, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 720 },
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width < 768) {
      await expect(page.locator('.home-copy')).toHaveCSS('margin-bottom', '0px');
      // Dynamic viewport units can update a frame after the resize event.
      await expect.poll(() => page.locator('.home-main').evaluate((element) =>
        Math.abs(element.getBoundingClientRect().bottom - window.innerHeight),
      )).toBeLessThan(1);
    }
    const coin = await page.locator('.coin-position').boundingBox();
    expect(coin).not.toBeNull();
    expect(coin!.x).toBeGreaterThanOrEqual(0);
    expect(coin!.y).toBeGreaterThanOrEqual(0);
    expect(coin!.x + coin!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    if (width < 768) {
      expect(coin!.y + coin!.height).toBeLessThanOrEqual(height);
      const tagline = page.getByRole('heading', { name: 'Know your stock Know your credit' });
      await expect(tagline).toBeVisible();
      const bounds = await tagline.boundingBox();
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(coin!.x);
      expect(bounds!.y).toBeLessThan(coin!.y + coin!.height);
      expect(bounds!.y + bounds!.height).toBeGreaterThan(coin!.y);
      expect(height - (coin!.y + coin!.height)).toBeLessThanOrEqual(32);
    } else {
      await expect(page.locator('.home-copy')).toHaveCSS('margin-bottom', '32px');
      const wordmark = await page.locator('.wordmark').boundingBox();
      expect(coin!.y).toBeGreaterThanOrEqual(wordmark!.y + wordmark!.height);
      expect(coin!.width).toBe(width <= 1440 ? 340 : 440);
      // A resize can update the document height after the first scroll has run.
      await expect.poll(() => page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        const bounds = document.querySelector('.coin-position')!.getBoundingClientRect();
        return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
      })).toBe(true);
      const visibleCoin = await page.locator('.coin-position').boundingBox();
      expect(visibleCoin!.y).toBeGreaterThanOrEqual(0);
      expect(visibleCoin!.y + visibleCoin!.height).toBeLessThanOrEqual(height);
    }
  }
});
