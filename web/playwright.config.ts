import { defineConfig, devices } from '@playwright/test';
const port = Number(process.env.PLAYWRIGHT_PORT || 5173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PLAYWRIGHT_PORT');
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './e2e', fullyParallel: true,
  use: { baseURL, trace: 'retain-on-failure', reducedMotion: 'reduce', channel: process.env.PLAYWRIGHT_CHANNEL },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 880 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: `npm run dev -- --port ${port} --strictPort`, url:baseURL, reuseExistingServer: !process.env.CI },
});
