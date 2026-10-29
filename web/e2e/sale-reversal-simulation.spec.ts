import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const user = {id:'a2222222-2222-4222-8222-222222222222',email:'owner@stockwise.test',displayName:'Owner',role:'OWNER'};
const sale = {id:'33333333-3333-4333-8333-000000000002',reference:'S-000002',paymentType:'CREDIT',customerId:'22222222-2222-4222-8222-222222222221',totalKobo:395000,createdBy:user.id,createdAt:'2026-10-29T09:00:00Z',lines:[{productId:'11111111-1111-4111-8111-000000000005',productName:'Milk',quantity:1,unitPriceKobo:395000,lineTotalKobo:395000}]};

for (const simulated of [true,false]) test(`${simulated ? 'simulated' : 'real'} reversal access`, async ({page}) => {
  await page.addInitScript(({person,token}) => sessionStorage.setItem('stockwise.session',JSON.stringify({user:person,accessToken:token,tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z'})),{person:user,token:simulated ? 'stockwise-simulation-test' : 'real-token'});
  await page.route('**/me',(route) => route.fulfill({json:user}));
  await page.route(`**/sales/${sale.id}`,(route) => route.fulfill({json:sale}));
  await page.route('**/customers?*',(route) => route.fulfill({json:{items:[],page:0,size:100,totalItems:0}}));
  let writes = 0;
  await page.route(`**/sales/${sale.id}/reversal`,(route) => {
    writes++;
    expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    return route.fulfill({json:{reversalId:'44444444-4444-4444-8444-444444444444',saleId:sale.id,reversedAt:'2026-10-29T10:00:00Z',reversedBy:'Owner',reason:'CUSTOMER_RETURN',stockRestored:true,debtRemovedKobo:340000,storeCreditAddedKobo:55000}});
  });
  await page.goto(`/app/receipts/${sale.id}`);
  await page.getByRole('button',{name:'Reverse sale'}).click();
  const dialog = page.getByRole('dialog',{name:'Reverse sale'});
  await expect(dialog).toBeVisible();
  if (!simulated) {
    await expect(dialog.getByText('Sale reversal is unavailable until the service contract is approved.')).toBeVisible();
    await expect(dialog.getByRole('button',{name:'Confirm reversal'})).toBeDisabled();
    expect(writes).toBe(0);
    return;
  }
  await expect(dialog.getByText(/Simulation only/)).toBeVisible();
  expect((await new AxeBuilder({page}).analyze()).violations.filter((v) => ['serious','critical'].includes(v.impact || ''))).toEqual([]);
  await dialog.getByRole('button',{name:'Confirm reversal'}).click();
  await expect(page.getByRole('heading',{name:'Sale reversed'})).toBeVisible();
  await expect(page.getByText(/Simulated debt removed/)).toContainText('3,400.00');
  await expect(page.getByText(/Simulated debt removed/)).toContainText('550.00');
  expect(writes).toBe(1);
});

test('uncertain simulated reversal survives reload and reuses its key and body', async ({page}) => {
  await page.addInitScript((person) => sessionStorage.setItem('stockwise.session',JSON.stringify({user:person,accessToken:'stockwise-simulation-test',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z'})),user);
  await page.route('**/me',(route) => route.fulfill({json:user}));
  await page.route(`**/sales/${sale.id}`,(route) => route.fulfill({json:sale}));
  await page.route('**/customers?*',(route) => route.fulfill({json:{items:[],page:0,size:100,totalItems:0}}));
  const keys:string[] = []; const bodies:string[] = [];
  await page.route(`**/sales/${sale.id}/reversal`,(route) => {
    keys.push(route.request().headers()['idempotency-key']); bodies.push(route.request().postData() || '');
    return keys.length === 1 ? route.abort('connectionreset') : route.fulfill({json:{reversalId:'44444444-4444-4444-8444-444444444444',saleId:sale.id,reversedAt:'2026-10-29T10:00:00Z',reversedBy:'Owner',reason:'CUSTOMER_RETURN',stockRestored:true,debtRemovedKobo:340000,storeCreditAddedKobo:55000}});
  });
  await page.goto(`/app/receipts/${sale.id}`);
  await page.getByRole('button',{name:'Reverse sale'}).click();
  await page.getByRole('button',{name:'Confirm reversal'}).click();
  await expect(page.getByText(/not confirmed/).first()).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name:'Reverse sale'}).click();
  await page.getByRole('button',{name:'Retry same reversal'}).click();
  await expect(page.getByRole('heading',{name:'Sale reversed'})).toBeVisible();
  expect(keys).toHaveLength(2); expect(new Set(keys).size).toBe(1); expect(new Set(bodies).size).toBe(1);
});
