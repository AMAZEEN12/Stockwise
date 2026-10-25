import {test,expect} from '@playwright/test';
import type {Page,TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {makeProducts} from '../scripts/mock-data.mjs';

const user = {id:'a2222222-2222-4222-8222-222222222222',email:'owner@stockwise.demo',displayName:'Ada Okafor',role:'OWNER'};
const names = ['Mama Chidi','Bolu Adeyemi','Ngozi Okoro','Tunde Bakare'];
const customers = names.map((displayName,index) => ({id:`22222222-2222-4222-8222-22222222222${index+1}`,displayName,balanceKobo:[450000,0,85000,0][index],storeCreditKobo:index===1?600000:0,createdAt:'2026-10-24T08:41:00Z'}));
async function setup(page:Page) {
  if (page.viewportSize()?.width===360) await page.setViewportSize({width:360,height:1000});
  await page.addInitScript((user) => {if (!sessionStorage.getItem('stockwise.session')) sessionStorage.setItem('stockwise.session',JSON.stringify({accessToken:'stockwise-contract-mock-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user}));},user);
  await page.route('**/me',(route) => route.fulfill({json:user}));
  const products=makeProducts();
  await page.route('**/products?*',(route) => {const q=new URL(route.request().url()).searchParams.get('q')||'';return route.fulfill({json:{items:products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),page:0,size:20,totalItems:products.length}});});
  await page.route('**/products/*',(route) => route.fulfill({json:products.find((p) => route.request().url().endsWith(p.id))}));
}
async function open(page:Page) {
  await page.goto('/app/sell');
  for (const [name,quantity] of [['Indomie Chicken 70g',3],['Dettol 250ml',1]] as const) {
    await page.getByRole('textbox',{name:'Search products to add'}).fill(name);
    await page.getByRole('button',{name:new RegExp(name)}).first().click();
    await page.getByRole('textbox',{name:`Quantity for ${name}`,exact:true}).fill(String(quantity));
  }
  await page.getByRole('button',{name:'On credit',exact:true}).click();
  await page.getByRole('button',{name:'Choose customer (required)',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCSS('position','fixed');
  await expect(page.getByRole('dialog')).toHaveCSS('background-color','rgb(18, 18, 17)');
  const bounds=await page.getByRole('dialog').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.y).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
}
async function capture(page:Page,info:TestInfo,name:string) {
  await page.evaluate(async () => {await document.fonts.ready;if(document.activeElement instanceof HTMLElement) document.activeElement.blur();});
  await expect(page.getByRole('dialog')).toHaveCSS('position','fixed');
  await page.screenshot({path:info.outputPath(`picker-${name}.png`)});
}
test('picker supplied list, inline create, name error and selected frames',async ({page},info) => {
  await setup(page);const data=[...customers];let posts=0;
  await page.route('**/customers?*',(route) => route.fulfill({json:{items:data,page:0,size:100,totalItems:data.length}}));
  await page.route('**/customers',async (route) => {posts++;const body=route.request().postDataJSON();expect(body).toEqual({displayName:'Adaeze Nwosu'});await route.fulfill({status:201,json:{...customers[3],...body,id:'33333333-3333-4333-8333-333333333333'}});data.push({...customers[3],...body,id:'33333333-3333-4333-8333-333333333333'});});
  await open(page);await expect(page.getByRole('button',{name:/Mama Chidi Owes/})).toBeVisible();await capture(page,info,'list');
  const axe=await new AxeBuilder({page}).analyze();expect(axe.violations.filter((v)=>['serious','critical'].includes(v.impact||''))).toEqual([]);
  await page.getByRole('button',{name:'Add new customer'}).click();await capture(page,info,'add');
  await page.getByRole('button',{name:'Save and select',exact:true}).click();await expect(page.getByText('Enter a display name.',{exact:true})).toBeVisible();expect(posts).toBe(0);await capture(page,info,'name-required');
  await page.getByRole('textbox',{name:'Display name (required)'}).fill('  Adaeze Nwosu  ');await page.getByRole('button',{name:'Save and select',exact:true}).click();
  await expect(page.getByText('Customer selected. Confirm stays disabled until one is chosen.',{exact:true})).toBeVisible();expect(posts).toBe(1);
  await page.getByRole('button',{name:'Change',exact:true}).click();await page.getByRole('button',{name:/Mama Chidi Owes/}).click();await capture(page,info,'selected');
  await page.getByRole('button',{name:'Back to sale',exact:true}).click();await expect(page.getByRole('button',{name:'Confirm sale',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Choose customer (required)',exact:true}).click();await page.getByRole('button',{name:'Change',exact:true}).click();await page.getByRole('textbox',{name:'Search customers by name'}).fill('zzzzz');await expect(page.getByText('No customers match',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Clear search',exact:true}).click();await expect(page.getByRole('button',{name:/Adaeze Nwosu Settled/})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Choose customer (required)',exact:true})).toBeFocused();
});
test('picker loading, read error retry and empty frames',async ({page},info) => {
  await setup(page);let state='loading';let release!:()=>void;const gate=new Promise<void>((resolve)=>{release=resolve;});
  await page.route('**/customers?*',async (route) => {if(state==='loading') await gate; if(state==='error') return route.fulfill({status:503,json:{code:'DATABASE_UNAVAILABLE',requestId:'55555555-5555-4555-8555-555555555555'}});return route.fulfill({json:{items:[],page:0,size:100,totalItems:0}});});
  await open(page);await expect(page.getByText('Loading customers…',{exact:true})).toBeVisible();await capture(page,info,'loading');
  state='error';release();await expect(page.getByText("Couldn't load customers",{exact:true})).toBeVisible();await capture(page,info,'error');
  state='empty';await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByText('No customers yet',{exact:true})).toBeVisible();await capture(page,info,'empty');
});
test('picker loads subsequent pages and distinguishes duplicate display names by UUID',async ({page}) => {
  await setup(page);const seen:number[]=[];
  await page.route('**/customers?*',(route) => {const number=Number(new URL(route.request().url()).searchParams.get('page'));seen.push(number);return route.fulfill({json:{items:[{...customers[number],displayName:'Same Name',contactPlaceholder:number===0?'fictional A':'fictional B'}],page:number,size:100,totalItems:2}});});
  await open(page);await page.getByRole('textbox',{name:'Search customers by name'}).fill('same');
  await expect(page.getByRole('button',{name:/Same Name.*fictional B/})).toBeVisible();expect(seen).toContain(1);
  await page.getByRole('button',{name:/Same Name.*fictional B/}).click();await page.getByRole('button',{name:'Back to sale',exact:true}).click();
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('stockwise.cart.a2222222-2222-4222-8222-222222222222') || 'null').customerId)).toBe(customers[1].id);
  await expect(page.getByText('Store credit ₦6,000.00',{exact:true})).toBeVisible();
});
test('uncertain customer creation is not retried and survives refresh',async ({page}) => {
  await setup(page);let posts=0;
  await page.route('**/customers?*',(route)=>route.fulfill({json:{items:customers,page:0,size:100,totalItems:customers.length}}));
  await page.route('**/customers',(route)=>{posts++;return route.abort('failed');});
  await open(page);await page.getByRole('button',{name:'Add new customer'}).click();await page.getByRole('textbox',{name:'Display name (required)'}).fill('Unknown result');await page.getByRole('button',{name:'Save and select',exact:true}).click();
  await expect(page.getByText('This customer is not confirmed. Check the customer list before creating again.',{exact:true})).toBeVisible();expect(posts).toBe(1);await expect(page.getByRole('button',{name:'Save and select',exact:true})).toHaveCount(0);
  await page.reload();await page.getByRole('button',{name:'Choose customer (required)',exact:true}).click();await page.getByRole('button',{name:'Add new customer'}).click();await expect(page.getByRole('textbox',{name:'Display name (required)'})).toHaveValue('Unknown result');await expect(page.getByRole('textbox',{name:'Display name (required)'})).toBeDisabled();expect(posts).toBe(1);
});
