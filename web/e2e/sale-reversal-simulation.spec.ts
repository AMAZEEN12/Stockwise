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
  if (simulated) await expect(dialog.getByText(/Simulation only/)).toBeVisible();
  else await expect(dialog.getByText(/Confirming restores stock/)).toBeVisible();
  expect((await new AxeBuilder({page}).analyze()).violations.filter((v) => ['serious','critical'].includes(v.impact || ''))).toEqual([]);
  await dialog.getByRole('button',{name:'Confirm reversal'}).click();
  await expect(page.getByRole('heading',{name:'Sale reversed'})).toBeVisible();
  await expect(page.getByText(/debt removed/i)).toContainText('3,400.00');
  await expect(page.getByText(/debt removed/i)).toContainText('550.00');
  expect(writes).toBe(1);
});

for (const simulated of [true, false]) test(`uncertain ${simulated ? 'simulated' : 'real'} reversal survives reload and reuses its key and body`, async ({page}) => {
  await page.addInitScript(({person, token}) => sessionStorage.setItem('stockwise.session',JSON.stringify({user:person,accessToken:token,tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z'})),{person:user, token:simulated ? 'stockwise-simulation-test' : 'real-token'});
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


test('real assistant uses a supervisor code and refreshed receipt retains reversal status', async ({page}) => {
  const assistant = {...user, role:'ASSISTANT'};
  await page.addInitScript((person) => sessionStorage.setItem('stockwise.session',JSON.stringify({user:person,accessToken:'real-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z'})),assistant);
  await page.route('**/me', route => route.fulfill({json:assistant}));
  let reversedAt: string | undefined;
  await page.route(`**/sales/${sale.id}`, route => route.fulfill({json:{...sale,reversedAt}}));
  await page.route('**/customers?*', route => route.fulfill({json:{items:[],page:0,size:100,totalItems:0}}));
  await page.route(`**/sales/${sale.id}/reversal`, route => {
    expect(route.request().postDataJSON().authorizationCode).toBe('123456');
    reversedAt = '2026-11-02T10:00:00Z';
    return route.fulfill({json:{reversalId:sale.id,saleId:sale.id,reversedAt,reversedBy:assistant.id,reason:'CUSTOMER_RETURN',stockRestored:true}});
  });
  await page.goto(`/app/receipts/${sale.id}`);
  await expect(page.getByRole('button',{name:'Generate reversal code'})).toHaveCount(0);
  await page.getByRole('button',{name:'Reverse sale'}).click();
  await expect(page.getByRole('button',{name:'Confirm reversal'})).toBeDisabled();
  await page.getByLabel('6-Digit Authorization Code').fill('123456');
  await page.getByRole('button',{name:'Confirm reversal'}).click();
  await expect(page.getByRole('heading',{name:'Sale reversed'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Sale reversed'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Reverse sale',exact:true})).toHaveCount(0);
});

test('real owner generates a sale-bound supervisor code', async ({page}) => {
  await page.addInitScript((person) => sessionStorage.setItem('stockwise.session',JSON.stringify({user:person,accessToken:'real-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z'})),user);
  await page.route('**/me', route => route.fulfill({json:user}));
  await page.route(`**/sales/${sale.id}`, route => route.fulfill({json:sale}));
  await page.route('**/customers?*', route => route.fulfill({json:{items:[],page:0,size:100,totalItems:0}}));
  await page.route('**/reversals/authorizations', route => {
    expect(route.request().postDataJSON()).toEqual({saleId:sale.id,validMinutes:15});
    return route.fulfill({status:201,json:{code:'123456',saleId:sale.id,generatedBy:user.id,generatedByRole:'OWNER',expiresAt:new Date(Date.now()+900000).toISOString()}});
  });
  await page.goto(`/app/receipts/${sale.id}`);
  await page.getByRole('button',{name:'Generate reversal code'}).click();
  await page.getByRole('button',{name:'Generate 6-digit code'}).click();
  await expect(page.getByLabel('Code: 123456')).toHaveText('123 456');
});
