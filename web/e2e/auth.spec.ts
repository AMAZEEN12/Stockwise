import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const session = { accessToken: 'test-token', tokenType: 'Bearer', expiresAt: '2099-01-01T00:00:00Z', user: { id: 'a2222222-2222-4222-8222-222222222222', email: 'owner@stockwise.demo', displayName: 'Demo Owner', role: 'OWNER' } };
async function fillLogin(page: import('@playwright/test').Page) {
  await page.getByLabel('Email', { exact: true }).fill(session.user.email);
  await page.getByLabel('Password', { exact: true }).fill('demo-password');
}

test('home, dialogs, password visibility, validation, keyboard and accessibility', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { name: 'Stockwise', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sign-in-default.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter your email.', { exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('owner@');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter a valid email, like name@shop.com')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sign-in-validation.png'), fullPage: true });
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(accessibility.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeFocused();
});

test('401 and network errors preserve input and allow a deliberate retry', async ({ page }, testInfo) => {
  let attempts = 0;
  await page.route('**/auth/sessions', async (route) => {
    attempts++;
    if (attempts === 1) await route.fulfill({ status: 401, contentType: 'application/problem+json', body: JSON.stringify({ code: 'UNAUTHENTICATED', requestId: 'trace-1' }) });
    else await route.abort('failed');
  });
  await page.goto('/sign-in');
  await fillLogin(page);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('!Wrong email or password');
  await page.screenshot({ path: testInfo.outputPath('sign-in-401.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText("Can't reach the service. Try again.");
  await page.screenshot({ path: testInfo.outputPath('sign-in-network.png'), fullPage: true });
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(session.user.email);
  expect(attempts).toBe(2);
});

test('pending login shows waking state, blocks duplicate submission, then uses /me', async ({ page }, testInfo) => {
  let attempts = 0;
  await page.route('**/auth/sessions', async (route) => {
    attempts++;
    expect(route.request().postDataJSON()).toEqual({ email: session.user.email, password: 'demo-password' });
    expect(route.request().headers()['x-request-id']).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 4500));
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(session) });
  });
  await page.route('**/me', async (route) => {
    expect(route.request().headers().authorization).toBe('Bearer test-token');
    await route.fulfill({ json: session.user });
  });
  await page.goto('/sign-in');
  await fillLogin(page);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Signing in...' })).toHaveAttribute('aria-busy', 'true');
  await page.screenshot({ path: testInfo.outputPath('sign-in-loading.png'), fullPage: true });
  await expect(page.getByRole('status')).toContainText('Service is waking up');
  await page.screenshot({ path: testInfo.outputPath('sign-in-waking.png'), fullPage: true });
  await expect(page).toHaveURL('/workspace');
  await expect(page.getByRole('heading', { name: 'Welcome, Demo Owner.' })).toBeVisible();
  expect(attempts).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome, Demo Owner.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/workspace');
  await expect(page).toHaveURL('/sign-in');
});

test('registration matches the reference, validates, and makes no unapproved API call', async ({ page }, testInfo) => {
  const writes: string[] = [];
  page.on('request', (request) => { if (request.method() === 'POST') writes.push(request.url()); });
  await page.goto('/sign-up');
  await expect(page.getByRole('dialog', { name: 'Create your account' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath('sign-up-default.png'), fullPage: true });
  await page.getByLabel('Full name').fill('Demo Owner');
  await fillLogin(page);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Account creation is not available yet');
  expect(writes).toEqual([]);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(accessibility.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await page.getByRole('link', { name: 'Have an account? Sign in' }).click();
  await expect(page.getByRole('dialog', { name: 'Sign in' })).toBeVisible();
});

test('server validation keeps field associations and demo buttons only fill credentials', async ({ page }) => {
  let writes = 0;
  await page.route('**/auth/sessions', async (route) => {
    writes++;
    await route.fulfill({ status: 400, contentType: 'application/problem+json', body: JSON.stringify({ code: 'VALIDATION_FAILED', requestId: 'trace-2', errors: [{ field: 'email', message: 'Use your shop email address.' }] }) });
  });
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Owner', exact: true }).click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(session.user.email);
  expect(writes).toBe(0);
  await page.getByLabel('Password', { exact: true }).fill('demo-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Email', { exact: true })).toHaveAccessibleDescription('Use your shop email address.');
  expect(writes).toBe(1);
});

test('responsive layouts stay within the viewport and reduced motion stops the coin', async ({ page }) => {
  for (const width of [320, 360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 880 });
    await page.goto('/sign-up');
    await expect(page.getByRole('dialog', { name: 'Create your account' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const dialog = await page.getByRole('dialog').boundingBox();
    expect(dialog!.x).toBeGreaterThanOrEqual(0);
    expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(width);
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Stockwise', exact: true })).toBeVisible();
  expect(await page.locator('.coin-sway').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});
