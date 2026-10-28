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
