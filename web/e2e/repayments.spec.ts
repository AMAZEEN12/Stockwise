import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ownerUser = {
  id: 'a2222222-2222-4222-8222-222222222222',
  email: 'owner@stockwise.demo',
  displayName: 'Ada Okafor',
  role: 'OWNER',
};

const adminUser = {
  id: 'a3333333-3333-4333-8333-333333333333',
  email: 'admin@stockwise.demo',
  displayName: 'Admin User',
  role: 'ADMIN',
};

const initialCustomers = [
  {
    id: '22222222-2222-4222-8222-222222222221',
    displayName: 'Mama Chidi',
    contactPlaceholder: '0803 000 0001',
    balanceKobo: 450000, // ₦4,500.00 debt
    storeCreditKobo: 0,
    hasDebtActivity: true,
    hasStoreCreditActivity: false,
    createdAt: '2026-10-24T08:41:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    displayName: 'Bolu Adeyemi',
    contactPlaceholder: '0802 000 0002',
    balanceKobo: 0, // No debt
    storeCreditKobo: 500000,
    hasDebtActivity: false,
    hasStoreCreditActivity: true,
    createdAt: '2026-10-24T08:41:00Z',
  },
];

async function setupSession(page: Page, user = ownerUser) {
  if (page.viewportSize()?.width === 360) await page.setViewportSize({ width: 360, height: 1000 });
  await page.clock.setFixedTime(new Date('2026-10-24T08:41:00Z'));
  await page.addInitScript((u) => {
    sessionStorage.setItem(
      'stockwise.session',
      JSON.stringify({
        accessToken: 'stockwise-contract-mock-token',
        tokenType: 'Bearer',
        expiresAt: '2099-01-01T00:00:00Z',
        user: u,
      })
    );
  }, user);
  await page.route('**/me', (route) => route.fulfill({ json: user }));
}

async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.screenshot({ path: info.outputPath(`repayments-${name}.png`) });
}

test('customer list rows never contain repayment or action buttons', async ({ page }) => {
  await setupSession(page);
  await page.route('**/customers?*', (route) =>
    route.fulfill({ json: { items: initialCustomers, page: 0, size: 100, totalItems: initialCustomers.length } })
  );

  await page.goto('/app/customers');
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();

  // STANDING RULE: Customer list rows and cards must never contain action buttons
  await expect(page.getByRole('button', { name: /Record repayment/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Repay/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Issue store credit/i })).toHaveCount(0);
});

test('dedicated customer page shows Record repayment button only when customer has debt', async ({ page }) => {
  await setupSession(page);
  await page.route('**/customers?*', (route) =>
    route.fulfill({ json: { items: initialCustomers, page: 0, size: 100, totalItems: initialCustomers.length } })
  );
  await page.route('**/customers/*/ledger*', (route) =>
    route.fulfill({
      json: {
        customerId: initialCustomers[1].id,
        balanceKobo: 0,
        storeCreditKobo: 500000,
        page: 0,
        size: 50,
        totalItems: 0,
        items: [],
      },
    })
  );

  // Navigate to Bolu Adeyemi (balanceKobo === 0)
  await page.goto(`/app/customers/${initialCustomers[1].id}`);
  await expect(page.getByRole('heading', { name: /Bolu Adeyemi.*Ledger/ })).toBeVisible();

  // Since debt is 0, Record repayment button is not rendered
  await expect(page.getByRole('button', { name: 'Record repayment', exact: true })).toHaveCount(0);
});

test('admin cannot record repayments (read-only role)', async ({ page }) => {
  await setupSession(page, adminUser);
  await page.route('**/customers?*', (route) =>
    route.fulfill({ json: { items: initialCustomers, page: 0, size: 100, totalItems: initialCustomers.length } })
  );
  await page.route('**/customers/*/ledger*', (route) =>
    route.fulfill({
      json: {
        customerId: initialCustomers[0].id,
        balanceKobo: 450000,
        storeCreditKobo: 0,
        page: 0,
        size: 50,
        totalItems: 0,
        items: [],
      },
    })
  );

  // Navigate to Mama Chidi (has debt) as ADMIN
  await page.goto(`/app/customers/${initialCustomers[0].id}`);
  await expect(page.getByRole('heading', { name: /Mama Chidi.*Ledger/ })).toBeVisible();

  // Admin cannot record repayment
  await expect(page.getByRole('button', { name: 'Record repayment', exact: true })).toHaveCount(0);
});

test('full and partial debt repayment journey with validation and running ledger updates', async ({ page }, info) => {
  await setupSession(page);

  interface MockLedgerEntry {
    id: string;
    sourceType: string;
    sourceId: string | null;
    deltaKobo: number;
    balanceAfterKobo: number;
    storeCreditAfterKobo: number;
    createdAt: string;
  }

  const customerState = { ...initialCustomers[0] };
  const ledgerEntries: MockLedgerEntry[] = [
    {
      id: 'entry-credit-sale-1',
      sourceType: 'CREDIT_SALE',
      sourceId: 'sale-1',
      deltaKobo: 450000,
      balanceAfterKobo: 450000,
      storeCreditAfterKobo: 0,
      createdAt: '2026-10-24T08:00:00Z',
    },
  ];

  await page.route('**/customers?*', (route) =>
    route.fulfill({ json: { items: [customerState], page: 0, size: 100, totalItems: 1 } })
  );

  await page.route('**/customers/*/ledger*', (route) =>
    route.fulfill({
      json: {
        customerId: customerState.id,
        balanceKobo: customerState.balanceKobo,
        storeCreditKobo: customerState.storeCreditKobo,
        page: 0,
        size: 50,
        totalItems: ledgerEntries.length,
        items: ledgerEntries,
      },
    })
  );

  await page.route('**/repayments', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON();
    expect(body.customerId).toBe(customerState.id);
    expect(body.amountKobo).toBeGreaterThan(0);
    expect(body.amountKobo).toBeLessThanOrEqual(customerState.balanceKobo);

    customerState.balanceKobo -= body.amountKobo;
    const repaymentId = 'repayment-' + Date.now();
    ledgerEntries.unshift({
      id: 'entry-' + Date.now(),
      sourceType: 'REPAYMENT',
      sourceId: repaymentId,
      deltaKobo: -body.amountKobo,
      balanceAfterKobo: customerState.balanceKobo,
      storeCreditAfterKobo: 0,
      createdAt: new Date().toISOString(),
    });

    await route.fulfill({
      status: 201,
      json: {
        id: repaymentId,
        customerId: customerState.id,
        amountKobo: body.amountKobo,
        balanceAfterKobo: customerState.balanceKobo,
        createdAt: new Date().toISOString(),
      },
    });
  });

  // 1. Visit Mama Chidi's ledger page
  await page.goto(`/app/customers/${customerState.id}`);
  await expect(page.getByRole('heading', { name: /Mama Chidi.*Ledger/ })).toBeVisible();
  await expect(page.getByText('₦4,500.00').first()).toBeVisible();

  // 2. Click "Record repayment"
  const recordBtn = page.getByRole('button', { name: 'Record repayment', exact: true });
  await expect(recordBtn).toBeVisible();
  await recordBtn.click();

  // 3. Verify Dialog opened
  const dialog = page.getByRole('dialog', { name: 'Record debt repayment' });
  await expect(dialog).toBeVisible();
  await capture(page, info, 'dialog-open');

  // 4. Test validation: Empty submission
  await dialog.getByRole('button', { name: 'Record repayment', exact: true }).click();
  await expect(page.getByText('Enter a valid Naira amount')).toBeVisible();

  // 5. Test validation: Exceeds debt
  const amountInput = dialog.getByLabel('Repayment amount', { exact: false });
  await amountInput.fill('5000');
  await dialog.getByRole('button', { name: 'Record repayment', exact: true }).click();
  await expect(page.getByText('Repayment cannot exceed current debt of ₦4,500.00.')).toBeVisible();

  // 6. Test Partial Repayment: ₦1,500.00
  await amountInput.fill('1500');
  await dialog.getByRole('button', { name: 'Record repayment', exact: true }).click();

  // Dialog closes and success toast appears
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('Repayment of ₦1,500.00 recorded successfully', { exact: true })).toBeVisible();
  await capture(page, info, 'partial-success');

  // Verify updated debt and ledger entry
  await expect(page.getByText('₦3,000.00').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('Repayment').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('-₦1,500.00').filter({ visible: true }).first()).toBeVisible();

  // 7. Test "Repay full balance" shortcut for remaining ₦3,000.00
  await recordBtn.click();
  await expect(dialog).toBeVisible();

  const repayFullBtn = dialog.getByRole('button', { name: /Repay full balance/i });
  await expect(repayFullBtn).toBeVisible();
  await repayFullBtn.click();

  // Input is filled with 3000.00
  await expect(amountInput).toHaveValue('3000.00');

  // Submit full repayment
  await dialog.getByRole('button', { name: 'Record repayment', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('Repayment of ₦3,000.00 recorded successfully', { exact: true })).toBeVisible();
  await capture(page, info, 'full-success');

  // Balance is now 0 (displayed as "—" per debtDisplay when balanceKobo === 0)
  // And Record repayment button disappears
  await expect(recordBtn).toHaveCount(0);

  // 8. Run Axe accessibility check on the final page
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
});

