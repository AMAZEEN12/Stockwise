import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

// Uses the actual local Prism instance and browser UI, without intercepted requests.
const apiBase = 'http://127.0.0.1:4710';
const login = await fetch(`${apiBase}/auth/sessions`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'owner@stockwise.demo', password: 'stockwise-demo' }),
});
assert.equal(login.status, 201);
const session = await login.json();
assert.ok(Date.parse(session.expiresAt) > Date.now());
const me = await fetch(`${apiBase}/me`, { headers: { Authorization: `Bearer ${session.accessToken}` } });
assert.equal(me.status, 200);
assert.equal((await me.json()).id, session.user.id);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`${process.env.WEB_BASE_URL || 'http://127.0.0.1:5173'}/sign-in`);
  await page.getByRole('button', { name: 'Owner', exact: true }).click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('owner@stockwise.demo');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('stockwise-demo');
  const styles = await page.getByLabel('Password', { exact: true }).evaluate((element) => {
    const computed = element.ownerDocument.defaultView.getComputedStyle(element);
    return { radius: computed.borderRadius, font: computed.fontFamily, offset: computed.outlineOffset };
  });
  assert.equal(styles.radius, '10px');
  assert.ok(styles.font.includes('Inter Tight'));
  assert.equal(styles.offset, '2px');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Demo Owner.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome, Demo Owner.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
  console.log('PASS: actual Prism 201/200, future session, demo autofill, canonical styles, browser sign-in, refresh and sign-out.');
} finally { await browser.close(); }
