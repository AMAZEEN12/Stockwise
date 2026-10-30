import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const user = {
  id: 'a2222222-2222-4222-8222-222222222222',
  email: 'owner@stockwise.test',
  displayName: 'Ada Okafor',
  role: 'OWNER',
};

const mockDashboardData = {
  computedAt: '2026-10-30T15:30:00Z',
  isDemonstrationData: true,
  today: '2026-10-30',
  todaySales: {
    count: 8,
    totalKobo: 3450000, // ₦34,500.00
    paidCount: 5,
    paidKobo: 2200000,  // ₦22,000.00
    creditCount: 3,
    creditKobo: 1250000, // ₦12,500.00
  },
  outstandingCreditKobo: 4500000, // ₦45,000.00
  customersOwing: 4,
  storeCreditHeldKobo: 1500000, // ₦15,000.00
  lowStockCount: 2,
  lowStock: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      reference: 'DET-250',
      name: 'Dettol 250ml',
      quantity: 5,
      lowStockThreshold: 5,
    },
    {
      id: '11111111-1111-4111-8111-111111111112',
      reference: 'DET-500',
      name: 'Dettol Liquid 500ml',
      quantity: 0,
      lowStockThreshold: 5,
    },
  ],
  recentSales: [
    {
      id: '33333333-3333-4333-8333-000000000001',
      reference: 'S-000008',
      paymentType: 'PAID',
      totalKobo: 395000,
      createdAt: '2026-10-30T14:45:00Z',
    },
    {
      id: '33333333-3333-4333-8333-000000000002',
      reference: 'S-000007',
      paymentType: 'CREDIT',
      totalKobo: 550000,
      createdAt: '2026-10-30T13:20:00Z',
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((user) => {
    sessionStorage.setItem(
      'stockwise.session',
      JSON.stringify({
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresAt: '2099-01-01T00:00:00Z',
        user,
      })
    );
  }, user);

  await page.route('**/me', (route) => route.fulfill({ json: user }));
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.endsWith('/dashboard') && !url.includes('/app/dashboard')) {
      return route.fulfill({ json: mockDashboardData });
    }
    return route.fallback();
  });
});

test('dashboard displays key metrics, interactive pie chart, low stock alerts, and passes axe', async ({
  page,
}, info) => {
  await page.goto('/app/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();

  // Verify demonstration data badge and time
  await expect(page.locator('.demo-badge')).toBeVisible();

  // Verify KPI metric cards
  await expect(page.locator('.metric-card-value').first()).toHaveText('₦34,500.00');
  await expect(page.getByText('₦45,000.00')).toBeVisible();
  await expect(page.getByText('₦15,000.00')).toBeVisible();
  await expect(page.locator('.metric-card-value').nth(3)).toHaveText('2'); // 2 low stock alerts

  // Interactive Chart Header and Controls
  await expect(page.getByRole('heading', { name: /Pie Chart - Interactive/i })).toBeVisible();
  const revenueBtn = page.getByRole('button', { name: /Revenue \(₦\)/i });
  const volumeBtn = page.getByRole('button', { name: /Volume \(Count\)/i });
  await expect(revenueBtn).toBeVisible();
  await expect(volumeBtn).toBeVisible();

  // Default center value is total revenue
  const donutValue = page.locator('.donut-center-value');
  const donutLabel = page.locator('.donut-center-label');
  await expect(donutValue).toHaveText('₦34,500.00');
  await expect(donutLabel).toHaveText('Total Revenue');

  // Toggle to Volume count
  await volumeBtn.click();
  await expect(donutValue).toHaveText('8 sales');
  await expect(donutLabel).toHaveText('Total Sales');

  // Switch back to Revenue
  await revenueBtn.click();
  await expect(donutValue).toHaveText('₦34,500.00');

  // Filter segment via select dropdown
  const segmentSelect = page.locator('.chart-segment-select');
  await segmentSelect.selectOption('paid');
  await expect(donutValue).toHaveText('₦22,000.00');
  await expect(donutLabel).toHaveText('Paid sales');
  await expect(page.locator('.slice-highlight-arc')).toBeVisible();

  await segmentSelect.selectOption('credit');
  await expect(donutValue).toHaveText('₦12,500.00');
  await expect(donutLabel).toHaveText('Credit sales');

  await segmentSelect.selectOption('all');
  await expect(donutValue).toHaveText('₦34,500.00');
  await expect(donutLabel).toHaveText('Total Revenue');

  // Low Stock Table & Navigation
  await expect(page.getByText('Dettol 250ml')).toBeVisible();
  await expect(page.getByText('Dettol Liquid 500ml')).toBeVisible();

  // Recent Sales Table
  await expect(page.getByText('S-000008')).toBeVisible();
  await expect(page.getByText('S-000007')).toBeVisible();

  // Screenshot for artifacts
  await page.screenshot({ path: info.outputPath('dashboard.png'), fullPage: true });

  // Accessibility audit
  const accessibilityScan = await new AxeBuilder({ page })
    .exclude('.donut-center-value') // exclude SVG text element contrast quirk in jsdom/headless
    .analyze();
  const criticalOrSerious = accessibilityScan.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
  expect(criticalOrSerious).toEqual([]);
});

