import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function choose(page: Page, label: string) {
  await page.getByRole('combobox', {name:'Appearance'}).filter({visible:true}).click();
  await page.getByRole('option', {name:label,exact:true}).click();
}
async function check(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const violations = (await new AxeBuilder({page}).analyze()).violations.filter(v => ['serious','critical'].includes(v.impact || ''));
  expect(violations).toEqual([]);
}

test('appearance follows system, persists an override, and synchronizes tabs', async ({page, context}) => {
  await page.emulateMedia({colorScheme:'dark'});
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await choose(page,'Light mode');
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(246, 247, 242)');
  await check(page);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  const other = await context.newPage();
  await other.goto('/');
  await choose(page,'Dark mode');
  await expect(other.locator('html')).toHaveAttribute('data-theme','dark');
  await check(page);
  await choose(page,'System theme');
  await page.emulateMedia({colorScheme:'light'});
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.emulateMedia({colorScheme:'dark'});
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await other.close();
});

test('stored appearance applies before React and unavailable storage remains usable', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('stockwise.theme','light'));
  await page.route('**/src/main.tsx',route => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.unroute('**/src/main.tsx');
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  await page.goto('/');
  await choose(page,'Dark mode');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await choose(page,'Light mode');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

for (const mode of ['light','dark'] as const) test(`${mode} shop, dialog, and portal are readable`, async ({page}, testInfo) => {
  test.slow();
  const user = {id:'a2222222-2222-4222-8222-222222222222',displayName:'Ada Okafor',email:'owner@stockwise.test',role:'OWNER'};
  await page.addInitScript(({user,mode}) => {
    localStorage.setItem('stockwise.theme',mode);
    sessionStorage.setItem('stockwise.session',JSON.stringify({user,accessToken:'test-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z'}));
  },{user,mode});
  await page.route('**/me', route => route.fulfill({json:user}));
  await page.route('**/customers?*', route => route.fulfill({json:{items:[],page:0,size:100,totalItems:0,asOf:new Date().toISOString()}}));
  await page.goto('/app/customers');
  await expect(page.getByRole('heading',{name:'Customers',exact:true})).toBeVisible();
  await check(page);
  await page.screenshot({path:testInfo.outputPath(`${mode}-customers.png`),fullPage:true});
  if (testInfo.project.name === 'mobile') await page.getByRole('button',{name:'Open menu'}).click();
  await page.getByRole('combobox',{name:'Appearance'}).filter({visible:true}).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('option',{name:'Light mode',exact:true})).toBeVisible();
  const bounds = await page.getByRole('listbox').boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.keyboard.press('Escape');
  if (testInfo.project.name === 'mobile') await page.getByRole('button',{name:'Close menu'}).click();
  await page.goto('/sign-in');
  await expect(page.getByRole('dialog')).toBeVisible();
  await check(page);
  await page.screenshot({path:testInfo.outputPath(`${mode}-sign-in.png`),fullPage:true});
  await page.route('**/portal/customer/*',route => route.fulfill({status:404,json:{code:'NOT_FOUND'}}));
  await page.goto('/c/theme-check');
  await expect(page.getByRole('combobox',{name:'Appearance'})).toBeVisible();
  await check(page);
});


for (const mode of ['light','dark'] as const) test(`${mode} populated portal and checkout retain theme`, async ({page}, testInfo) => {
  await page.addInitScript(mode => localStorage.setItem('stockwise.theme',mode),mode);
  await page.route('**/portal/customer/theme-check',route => route.fulfill({json:{
    shop:{name:'Demo shop',address:'Lagos',currency:'NGN'},
    customer:{displayName:'Ada',balanceKobo:10000,storeCreditKobo:5000,hasDebtActivity:true,hasStoreCreditActivity:true,paymentDueAt:new Date(Date.now()+3600000).toISOString()},
    statement:[],tokenExpiresAt:'2099-01-01T00:00:00Z'
  }}));
  await page.route('**/portal/customer/theme-check/products*',route => route.fulfill({json:{items:[{id:'milk',name:'Milk',priceKobo:45000,quantity:5,active:true}],totalItems:1}}));
  await page.goto('/c/theme-check');
  await expect(page.getByRole('heading',{name:'Milk',exact:true})).toBeVisible();
  await check(page);
  await page.screenshot({path:testInfo.outputPath(`${mode}-portal.png`),fullPage:true});
  await page.getByRole('button',{name:'Increase Milk quantity'}).click();
  await page.getByRole('button',{name:'Review pre-order',exact:true}).click();
  const dialog = page.getByRole('dialog',{name:'Review Your Pre-Order'});
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await check(page);
});
