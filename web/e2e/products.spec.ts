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

test('stock movement history drawer opens on product row click and shows movement timeline', async ({page}, info) => {
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

  // Drawer dialog opens
  const dialog = page.getByRole('dialog', { name: 'Stock movements' });
  await expect(dialog).toBeVisible();

  // Displays product details
  await expect(dialog.getByText('Indomie Chicken 70g', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/In stock/i)).toBeVisible();
  await expect(dialog.getByText(/2 movements recorded/i)).toBeVisible();

  // Displays movements
  await expect(dialog.getByText('Sale', { exact: true })).toBeVisible();
  await expect(dialog.getByText('-1', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Opening stock', { exact: true })).toBeVisible();
  await expect(dialog.getByText(`+${targetProduct.quantity + 1}`, { exact: true })).toBeVisible();

  // Accessibility audit
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);

  await page.screenshot({ path: info.outputPath('product-movements-drawer.png'), fullPage: true });

  // Close drawer
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/app\/products$/);
});
