import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {makeProducts} from '../scripts/mock-data.mjs';

const user={id:'a2222222-2222-4222-8222-222222222222',email:'owner@stockwise.demo',displayName:'Ada Okafor',role:'OWNER'};
test.beforeEach(async ({page})=>{
  await page.addInitScript((user)=>sessionStorage.setItem('stockwise.session',JSON.stringify({accessToken:'stockwise-contract-mock-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user})),user);
  await page.route('**/me',(route)=>route.fulfill({json:user}));
});

test('shared category select supports keyboard selection and clearing restores search focus',async ({page})=>{
  const products=makeProducts();
  await page.route('**/products?*',(route)=>{
    const params=new URL(route.request().url()).searchParams;
    const items=products.filter((p)=>(!params.get('category') || p.category===params.get('category')) && (!params.get('q') || p.name.toLowerCase().includes(params.get('q')!.toLowerCase())));
    return route.fulfill({json:{items,page:0,size:100,totalItems:items.length}});
  });
  await page.goto('/app/products');
  const select=page.getByRole('combobox',{name:'Filter by category'});
  await select.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('n');await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/category=Noodles/);
  await expect(select).toBeFocused();
  await page.getByRole('button',{name:'Clear all',exact:true}).click();
  const search=page.getByRole('textbox',{name:'Search name or reference'});
  await expect(search).toBeFocused();await expect(page).not.toHaveURL(/category=/);
  await expect(search).toHaveCSS('border-radius','10px');
  const axe=await new AxeBuilder({page}).analyze();
  expect(axe.violations.filter((v)=>['serious','critical'].includes(v.impact||''))).toEqual([]);
});

test('shared success toast dismisses automatically after customer creation',async ({page})=>{
  const customer={id:'33333333-3333-4333-8333-333333333333',displayName:'Shared Toast Customer',balanceKobo:0,storeCreditKobo:0,createdAt:'2026-10-25T08:00:00Z'};
  let created=false;
  await page.route('**/customers?*',(route)=>route.fulfill({json:{items:created?[customer]:[],page:0,size:100,totalItems:Number(created)}}));
  await page.route('**/customers',(route)=>{
    if(route.request().method()!=='POST')return route.fallback();
    created=true;return route.fulfill({status:201,json:customer});
  });
  await page.goto('/app/customers');
  await page.getByRole('button',{name:'Add customer',exact:false}).click();
  await page.getByRole('textbox',{name:'Display name (required)'}).fill(customer.displayName);
  await page.getByRole('button',{name:'Save customer',exact:true}).click();
  const notice=page.getByText('Customer added. Shared Toast Customer is in the list.',{exact:true});
  await expect(notice).toBeVisible();
  await expect(notice).toHaveCount(0,{timeout:8000});
});

test('shared checkbox keyboard acceptance controls sale confirmation',async ({page})=>{
  const product=makeProducts()[0];
  await page.route('**/products?*',(route)=>route.fulfill({json:{items:[product],page:0,size:20,totalItems:1}}));
  await page.route('**/products/*',(route)=>route.fulfill({json:{...product,priceKobo:48000}}));
  await page.route('**/customers?*',(route)=>route.fulfill({json:{items:[],page:0,size:100,totalItems:0}}));
  await page.goto('/app/sell');
  await page.getByRole('textbox',{name:'Search products to add'}).fill('Indomie');
  await page.getByRole('button',{name:/Indomie Chicken 70g/}).click();
  await page.getByRole('button',{name:'Confirm sale',exact:true}).click();
  const confirm=page.getByRole('button',{name:'Confirm',exact:true});
  const checkbox=page.getByRole('checkbox',{name:'I accept these changes'});
  await expect(confirm).toBeDisabled();
  await checkbox.focus();await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();await expect(confirm).toBeEnabled();
  await expect(checkbox).toHaveCSS('outline-width','3px');
  await expect(checkbox).toHaveCSS('outline-offset','2px');
  await page.keyboard.press('Space');
  await expect(checkbox).not.toBeChecked();await expect(confirm).toBeDisabled();
  const axe=await new AxeBuilder({page}).analyze();
  expect(axe.violations.filter((v)=>['serious','critical'].includes(v.impact||''))).toEqual([]);
});
