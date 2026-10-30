import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { makeProducts } from '../scripts/mock-data.mjs';

const user = {id:'a2222222-2222-4222-8222-222222222222',email:'owner@stockwise.test',displayName:'Demo Owner',role:'OWNER'};

test('records stock once and retries an uncertain response with the same key and body', async ({page}) => {
  const product = makeProducts().find((item) => item.reference === 'PKM-400')!;
  let writes = 0;
  let firstKey = '';
  let firstBody: unknown;
  await page.addInitScript((person) => sessionStorage.setItem('stockwise.session', JSON.stringify({accessToken:'test-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user:person})), user);
  await page.route('**/me', (route) => route.fulfill({json:user}));
  await page.route('**/products?*', (route) => route.fulfill({json:{items:[product],page:0,size:20,totalItems:1}}));
  await page.route(`**/products/${product.id}`, (route) => route.fulfill({json:product}));
  await page.route('**/restocks', async (route) => {
    writes++;
    const key = route.request().headers()['idempotency-key'];
    const body = route.request().postDataJSON();
    if (writes === 1) {
      firstKey = key; firstBody = body;
      product.quantity = 2147483647;
      await route.abort('connectionreset');
      return;
    }
    expect(key).toBe(firstKey); expect(body).toEqual(firstBody);
    expect(body).toMatchObject({productId:product.id,quantity:3,receivedOn:'2026-10-29',note:'Supplier delivery'});
    await route.fulfill({status:201,json:{id:'22222222-2222-4222-8222-222222222222',...body,createdBy:user.id,createdAt:'2026-10-29T08:00:00Z'}});
  });
  await page.goto('/app/products');
  await page.getByRole('link',{name:'Restock'}).click();
  const dialog = page.getByRole('dialog',{name:'Restock product'});
  await expect(dialog).toBeVisible();
  await page.getByLabel('Quantity received').fill('3');
  await page.getByLabel('Date received').fill('2026-10-29');
  await page.getByLabel('Note').fill('Supplier delivery');
  const violations = (await new AxeBuilder({page}).analyze()).violations.filter((v) => ['serious','critical'].includes(v.impact || ''));
  expect(violations).toEqual([]);
  await page.getByRole('button',{name:'Record restock'}).click();
  await expect(page.getByText('This restock is not confirmed.',{exact:false})).toBeVisible();
  await expect(page.getByLabel('Quantity received')).toBeDisabled();
  await page.getByRole('button',{name:'Check same restock'}).click();
  await expect(page).toHaveURL(/\/app\/products$/);
  expect(writes).toBe(2);
});

test('non-owners do not see restock actions', async ({page}) => {
  const assistant = {...user,role:'ASSISTANT'};
  const product = makeProducts()[0];
  await page.addInitScript((person) => sessionStorage.setItem('stockwise.session', JSON.stringify({accessToken:'test-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user:person})), assistant);
  await page.route('**/me', (route) => route.fulfill({json:assistant}));
  await page.route('**/products?*', (route) => route.fulfill({json:{items:[product],page:0,size:20,totalItems:1}}));
  await page.goto('/app/products');
  await expect(page.getByText(product.name,{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Restock'})).toHaveCount(0);
});
