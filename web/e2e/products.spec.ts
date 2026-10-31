import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {makeProducts} from '../scripts/mock-data.mjs';
const products = makeProducts();
const user = {id:'a2222222-2222-4222-8222-222222222222',email:'owner@stockwise.test',displayName:'Ada Okafor',role:'OWNER'};
test.beforeEach(async ({page}) => {
  await page.addInitScript((user) => sessionStorage.setItem('stockwise.session', JSON.stringify({accessToken:'test-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user})),user);
  await page.route('**/me', (route) => route.fulfill({json:user}));
  await page.route('**/products?*', (route) => {const url = new URL(route.request().url()); const q = url.searchParams.get('q')?.toLowerCase() || ''; const state = url.searchParams.get('stockState'); const items = products.filter((p) => p.name.toLowerCase().includes(q) && (!state || p.stockState === state)); return route.fulfill({json:{items,page:0,size:20,totalItems:items.length}});});
});
test('catalogue, filter, add product, exact kobo and duplicate response', async ({page}, info) => {
  let writes = 0;
  await page.route('**/products', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    writes++; expect(route.request().postDataJSON()).toMatchObject({reference:'IND-070',priceKobo:45000,quantity:48,lowStockThreshold:5});
    await route.fulfill({status:409,json:{code:'DUPLICATE_REFERENCE',errors:[{field:'reference',message:'A product with this reference already exists'}]}});
  });
  await page.goto('/app/products');
  await expect(page.getByRole('heading',{name:'Products',exact:true})).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({path:info.outputPath('products.png'),fullPage:true});
  await page.getByRole('button',{name:'Out of stock',exact:true}).click();
  await expect(page.locator('.product-row')).toHaveCount(2);
  await page.getByRole('button',{name:'All',exact:true}).click();
  await page.getByRole('link',{name:'Add product'}).click();
  await expect(page.getByRole('dialog',{name:'Add product',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('add-product.png'),fullPage:true});
  await page.getByRole('button',{name:'Save product',exact:true}).click();
  await expect(page.getByText('Enter a product name.',{exact:true})).toHaveCount(2);
  for (const [label,value] of [['Name','Indomie Chicken 70g'],['Reference','IND-070'],['Category','Noodles'],['Selling price','450.00'],['Quantity','48'],['Low-stock threshold','5']]) await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole('button',{name:'Save product',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Could not save this product'); expect(writes).toBe(1);
  await page.screenshot({path:info.outputPath('duplicate-reference.png'),fullPage:true});
  const axe = await new AxeBuilder({page}).analyze(); expect(axe.violations.filter((v) => ['serious','critical'].includes(v.impact || ''))).toEqual([]);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Discard this product?'})).toBeVisible();
  await page.getByRole('button',{name:'Keep editing',exact:true}).click();
  await expect(page.getByLabel('Reference',{exact:true})).toHaveValue('IND-070');
});

test('stock movement history dedicated page opens on product row click and shows movement timeline', async ({page}, info) => {
  const targetProduct = products[0]; // Indomie Chicken 70g
  await page.route(`**/products/${targetProduct.id}`, (route) => route.fulfill({json: targetProduct}));
  await page.route(`**/products/${targetProduct.id}/movements*`, (route) => {
    return route.fulfill({
      json: {
        productId: targetProduct.id,
        currentQuantity: targetProduct.quantity,
        items: [
          {
            id: '44444444-4444-4444-8444-000000000002',
            delta: -1,
            sourceType: 'SALE',
            sourceId: '33333333-3333-4333-8333-000000000001',
            quantityAfter: targetProduct.quantity,
            createdAt: '2026-10-24T09:00:00Z',
          },
          {
            id: '44444444-4444-4444-8444-000000000001',
            delta: targetProduct.quantity + 1,
            sourceType: 'OPENING',
            quantityAfter: targetProduct.quantity + 1,
            createdAt: '2026-10-24T08:00:00Z',
          },
        ],
        page: 0,
        size: 20,
        totalItems: 2,
      },
    });
  });

  await page.goto('/app/products');
  await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();

  // Click on the product row
  const row = page.locator('.product-row-clickable').first();
  await expect(row).toBeVisible();
  await row.click();

  // Dedicated page opens
  await expect(page).toHaveURL(new RegExp(`/app/products/${targetProduct.id}/movements`));
  await expect(page.getByRole('heading', { level: 1, name: 'Stock Movements' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: targetProduct.name })).toBeVisible();

  // Restock button is visible and primary
  await expect(page.getByRole('button', { name: 'Restock' })).toBeVisible();

  // Displays product details
  await expect(page.getByText(new RegExp(targetProduct.category))).toBeVisible();
  await expect(page.getByText(/In stock/i).first()).toBeVisible();
  await expect(page.getByText(/2 records/i)).toBeVisible();

  // Displays movements
  await expect(page.getByText('Sale', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('-1', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Opening stock', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(`+${targetProduct.quantity + 1}`, { exact: true }).filter({ visible: true })).toBeVisible();

  // Verify there is no "Close" button and no 'x' icon
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Close stock movements' })).toHaveCount(0);

  // Accessibility audit
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);

  await page.screenshot({ path: info.outputPath('product-movements-page.png'), fullPage: true });

  // Return to products via breadcrumb
  const backLink = page.getByRole('link', { name: /Back to products/i });
  await expect(backLink).toBeVisible();
  await backLink.click();
  await expect(page).toHaveURL(/\/app\/products$/);
});

test('owner can edit product catalogue fields', async ({ page }) => {
  const target = products[0];
  let patchSent: Record<string, unknown> | null = null;
  let ifMatchHeader: string | null = null;

  await page.route(`**/products/${target.id}`, async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        json: { ...target, version: 1 },
        headers: { etag: '"1"' },
      });
    }
    if (route.request().method() === 'PATCH') {
      patchSent = route.request().postDataJSON();
      ifMatchHeader = route.request().headers()['if-match'] || null;
      return route.fulfill({
        json: { ...target, ...patchSent, version: 2 },
        headers: { etag: '"2"' },
      });
    }
    return route.fallback();
  });

  await page.goto('/app/products');
  await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();

  // Find Edit button on target product row
  const row = page.locator('.product-row').filter({ hasText: target.name });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Edit', exact: true }).click();

  // Edit dialog opens with prefilled fields
  const dialog = page.getByRole('dialog', { name: 'Edit product' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue(target.name);
  await expect(dialog.getByLabel('Reference', { exact: true })).toHaveValue(target.reference);

  // Edit name and price
  await dialog.getByLabel('Name', { exact: true }).fill('Indomie Chicken 70g Special');
  await dialog.getByLabel('Selling price', { exact: true }).fill('520.00');

  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();

  // Dialog closes and patch was sent with If-Match version
  await expect(dialog).not.toBeVisible();
  expect(ifMatchHeader).toBe('"1"');
  expect(patchSent).toMatchObject({
    name: 'Indomie Chicken 70g Special',
    priceKobo: 52000,
  });

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
});

test('optimistic archive updates immediately and rolls back on 412 version conflict (R18, DM11)', async ({ page }) => {
  const target = products[0]; // Active in stock product
  let releasePatch: (() => void) | null = null;
  const patchDeferred = new Promise<void>((resolve) => {
    releasePatch = resolve;
  });

  await page.route(`**/products/${target.id}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      await patchDeferred;
      return route.fulfill({
        status: 412,
        json: {
          code: 'VERSION_CONFLICT',
          message: 'This product was modified in another session. Please refresh.',
        },
      });
    }
    return route.fallback();
  });

  await page.goto('/app/products');
  const row = page.locator('.product-row').filter({ hasText: target.name });
  await expect(row).toBeVisible();
  await expect(row.getByText(/In stock/i).first()).toBeVisible();

  // Click Archive
  await row.getByRole('button', { name: 'Archive', exact: true }).click();

  // Confirmation dialog opens
  const confirmDialog = page.getByRole('dialog', { name: /Archive/i });
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole('button', { name: 'Archive product', exact: true }).click();
  await expect(confirmDialog).not.toBeVisible();

  // OPTIMISTIC CHECK: Before the server answers, the row is immediately shown as Archived
  await expect(row.getByText('Archived')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Unarchive', exact: true })).toBeVisible();

  // Release the 412 conflict response from the server
  releasePatch!();

  // ROLLBACK CHECK: The row reverts back to Active ("In stock") within one render
  await expect(row.getByText(/In stock/i).first()).toBeVisible();
  await expect(row.getByRole('button', { name: 'Archive', exact: true })).toBeVisible();

  // Toast conflict error is displayed
  await expect(page.getByText('Conflict: product modified', { exact: true })).toBeVisible();

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
});
