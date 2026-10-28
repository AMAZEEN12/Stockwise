import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {makeProducts} from '../scripts/mock-data.mjs';
import type {Product} from '../src/models/responses/products.response';
const user = {id:'a2222222-2222-4222-8222-222222222222',email:'owner@stockwise.demo',displayName:'Ada Okafor',role:'OWNER'};
const customers = [{id:'22222222-2222-4222-8222-222222222221',displayName:'Mama Chidi',balanceKobo:450000,storeCreditKobo:0,createdAt:'2026-10-24T08:41:00Z'}, {id:'22222222-2222-4222-8222-222222222222',displayName:'Bolu Adeyemi',balanceKobo:0,storeCreditKobo:600000,createdAt:'2026-10-24T08:41:00Z'}];
async function setup(page:Page, products:Product[] = makeProducts()) {
  const viewport = page.viewportSize(); if (viewport?.width === 360) await page.setViewportSize({width:360,height:1000});
  await page.addInitScript((user) => sessionStorage.setItem('stockwise.session',JSON.stringify({accessToken:'stockwise-contract-mock-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user})),user);
  await page.route('**/me',(route) => route.fulfill({json:user}));
  await page.route('**/customers?*',(route) => route.fulfill({json:{items:customers,page:0,size:100,totalItems:customers.length}}));
  await page.route('**/products?*',(route) => {const q = new URL(route.request().url()).searchParams.get('q')?.toLowerCase() || ''; const items = products.filter((product) => product.name.toLowerCase().includes(q)); return route.fulfill({json:{items,page:0,size:20,totalItems:items.length}});});
  await page.route('**/products/*',(route) => {const product = products.find((item) => route.request().url().endsWith(item.id)); return route.fulfill({json:product});});
}
async function add(page:Page, name:string, quantity:number) {
  await page.getByRole('textbox',{name:'Search products to add'}).fill(name);
  await page.getByRole('button',{name:new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).first().click();
  await page.getByRole('textbox',{name:`Quantity for ${name}`,exact:true}).fill(String(quantity));
}
function receipt(body:{paymentType:string;customerId?:string;lines:{productId:string;quantity:number}[]}, products = makeProducts()) {
  const lines = body.lines.map((line) => {const product = products.find((item) => item.id === line.productId)!; return {productId:line.productId,productName:product.name,quantity:line.quantity,unitPriceKobo:product.priceKobo,lineTotalKobo:product.priceKobo*line.quantity};});
  return {id:'44444444-4444-4444-8444-444444444444',reference:'S-000042',paymentType:body.paymentType,customerId:body.customerId,lines,totalKobo:lines.reduce((sum,line) => sum+line.lineTotalKobo,0),createdBy:user.id,createdAt:'2026-10-24T08:47:00Z'};
}
test('paid cart, confirmation, receipt and refresh preserve exact server values',async ({page},info) => {
  await setup(page); let posts = 0;
  await page.route('**/sales',async (route) => {posts++; const body = route.request().postDataJSON(); expect(Object.keys(body).sort()).toEqual(['lines','paymentType']); expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/); await route.fulfill({status:201,json:receipt(body)});});
  await page.goto('/app/sell'); await add(page,'Indomie Chicken 70g',3); await add(page,'Dettol 250ml',1);
  await expect(page.locator('.sale-total-heading')).toContainText('₦3,150.00'); await page.evaluate(() => document.fonts.ready);
  await page.screenshot({path:info.outputPath('paid-cart.png')});
  await page.getByRole('button',{name:'Confirm sale',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Confirm this sale'})).toBeVisible();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Sale recorded'})).toBeVisible(); expect(posts).toBe(1);
  await page.reload();
  await expect(page.getByText('S-000042', { exact: false })).toBeVisible();
  await expect(page.getByText('09:47 WAT', { exact: false })).toBeVisible();
});
test('updated stock conflict retains zero row and blocks confirm until removal',async ({page},info) => {
  const products = makeProducts(); products[1].quantity = 1; products[1].stockState = 'LOW'; await setup(page,products);
  await page.route('**/sales',async (route) => {products[1].quantity=0; products[1].stockState='OUT'; await route.fulfill({status:409,json:{code:'INSUFFICIENT_STOCK',requestId:'55555555-5555-4555-8555-555555555555',errors:[{field:'lines[1].quantity',message:'availableQuantity: 0'}]}});});
  await page.goto('/app/sell'); await add(page,'Indomie Chicken 70g',3); await add(page,'Peak Milk Tin 400g',1);
  await page.getByRole('button',{name:'Confirm sale',exact:true}).click(); await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(page.getByText('Remove the out-of-stock item to continue.')).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Quantity for Peak Milk Tin 400g'})).toHaveValue('0');
  await expect(page.getByRole('button',{name:'Confirm sale',exact:true})).toBeDisabled();
  await expect(page.locator('.sale-total-heading')).toContainText('₦1,350.00');
  await page.evaluate(async () => {await document.fonts.ready; window.scrollTo(0,0);}); await page.screenshot({path:info.outputPath('stock-conflict-updated.png')});
  const axe = await new AxeBuilder({page}).analyze(); expect(axe.violations.filter((v) => ['serious','critical'].includes(v.impact || ''))).toEqual([]);
  await page.getByRole('button',{name:'Remove Peak Milk Tin 400g',exact:true}).click(); await expect(page.getByRole('button',{name:'Confirm sale',exact:true})).toBeEnabled();
});
test('corrected store credit shows 6000 applied and 150 remaining in simulation',async ({page},info) => {
  await setup(page); await page.route('**/sales',(route) => route.fulfill({status:201,json:receipt(route.request().postDataJSON())}));
  await page.goto('/app/sell'); await add(page,'Dettol 250ml',3); await add(page,'Milo Sachet 20g',5);
  await page.getByRole('button',{name:'On credit',exact:true}).click(); await page.getByRole('button',{name:'Choose customer (required)',exact:true}).click(); await page.getByRole('button',{name:/Bolu Adeyemi Settled Store credit/}).click(); await page.getByRole('button',{name:'Back to sale',exact:true}).click();
  await expect(page.locator('.credit-breakdown')).toContainText('−₦6,000.00'); await expect(page.locator('.sale-total-heading')).toContainText('₦150.00');
  await page.getByRole('heading',{name:'New sale',exact:true}).scrollIntoViewIfNeeded();
  await page.evaluate(async () => {await document.fonts.ready; if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({top:0,behavior:'instant'}); await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));}); await page.screenshot({path:info.outputPath('store-credit-updated.png')});
  await page.getByRole('button',{name:'Confirm sale',exact:true}).click(); await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Sale recorded'})).toBeVisible(); await expect(page.locator('.receipt-total')).toContainText('₦150.00');
});
test('transport retry and reload recovery reuse the unchanged original submission',async ({page}) => {
  await setup(page); const keys:string[] = []; const bodies:string[] = [];
  await page.route('**/sales',async (route) => {keys.push(route.request().headers()['idempotency-key']); bodies.push(route.request().postData()!); if (keys.length <= 2) await route.abort('failed'); else await route.fulfill({status:201,json:receipt(route.request().postDataJSON())});});
  await page.goto('/app/sell'); await add(page,'Indomie Chicken 70g',1); await page.getByRole('button',{name:'Confirm sale',exact:true}).click(); await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible(); await expect(page.getByRole('textbox',{name:'Quantity for Indomie Chicken 70g'})).toBeDisabled();
  await page.reload(); await page.getByRole('button',{name:'Check and retry',exact:true}).click(); await expect(page.getByRole('heading',{name:'Sale recorded'})).toBeVisible();
  expect(keys).toHaveLength(3); expect(new Set(keys).size).toBe(1); expect(new Set(bodies).size).toBe(1);
});
test('admin read-only and real-credit restrictions prevent writes',async ({page}) => {
  await setup(page); let posts=0; await page.route('**/sales',(route) => {posts++; return route.abort();});
  await page.route('**/me',(route) => route.fulfill({json:{...user,role:'ADMIN'}}));
  await page.goto('/app/sell'); await expect(page.getByText('Read-only access',{exact:true})).toBeVisible(); await expect(page.getByRole('button',{name:'Confirm sale',exact:true})).toHaveCount(0); expect(posts).toBe(0);
});
