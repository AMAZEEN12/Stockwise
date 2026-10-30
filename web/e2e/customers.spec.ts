import {test,expect} from '@playwright/test';
import type {Page,TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const user={id:'a2222222-2222-4222-8222-222222222222',email:'owner@stockwise.demo',displayName:'Ada Okafor',role:'OWNER'};
const customers=['Chinedu Obi','Mama Chidi','Ngozi Okoro','Bolu Adeyemi','Tunde Bakare','Aisha Bello'].map((displayName,index)=>({id:`22222222-2222-4222-8222-22222222222${index+1}`,displayName,balanceKobo:[1230000,450000,85000,0,0,0][index],storeCreditKobo:index===3?600000:index===5?120000:0,hasDebtActivity:index<3,hasStoreCreditActivity:index===3||index===5,createdAt:'2026-10-24T08:41:00Z'}));
async function setup(page:Page,role='OWNER') {
  if(page.viewportSize()?.width===360)await page.setViewportSize({width:360,height:1000});
  await page.clock.setFixedTime(new Date('2026-10-24T08:41:00Z'));
  await page.addInitScript((user)=>{if(!sessionStorage.getItem('stockwise.session'))sessionStorage.setItem('stockwise.session',JSON.stringify({accessToken:'stockwise-contract-mock-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user}));},{...user,role});
  await page.route('**/me',(route)=>route.fulfill({json:{...user,role}}));
}
async function capture(page:Page,info:TestInfo,name:string) {
  await page.evaluate(async()=>{await document.fonts.ready;if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
  await page.screenshot({path:info.outputPath(`customers-${name}.png`)});
}
async function add(page:Page) {
  await page.getByRole('button',{name:'Add customer',exact:false}).click();
  await expect(page.getByRole('dialog',{name:'Add customer'})).toHaveCSS('position','fixed');
  const bounds=await page.getByRole('dialog').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
}
test('directory supplied list, search match and no-match states',async({page},info)=>{
  await setup(page);await page.route('**/customers?*',(route)=>route.fulfill({json:{items:customers,page:0,size:100,totalItems:customers.length}}));
  await page.goto('/app/customers');await expect(page.getByText('as of 09:41 WAT',{exact:true})).toBeVisible();await expect(page.getByText('Chinedu Obi',{exact:true}).filter({visible:true})).toBeVisible();await capture(page,info,'list');
  await page.getByRole('textbox',{name:'Search customers by name'}).fill('zzz');await expect(page.getByText('No customers match',{exact:true})).toBeVisible();await capture(page,info,'no-match');
  await page.getByRole('button',{name:'Clear search',exact:true}).click();await page.getByRole('textbox',{name:'Search customers by name'}).fill(' bOLu ');await expect(page.getByText('Bolu Adeyemi',{exact:true}).filter({visible:true})).toBeVisible();
  const axe=await new AxeBuilder({page}).analyze();expect(axe.violations.filter((v)=>['serious','critical'].includes(v.impact||''))).toEqual([]);
});
test('directory add, name-required, saving and success frames',async({page},info)=>{
  await setup(page);const data=[...customers];let posts=0;let release!:()=>void;const gate=new Promise<void>((resolve)=>{release=resolve;});
  await page.route('**/customers?*',(route)=>route.fulfill({json:{items:data,page:0,size:100,totalItems:data.length}}));
  await page.route('**/customers',async(route)=>{if(route.request().method()!=='POST')return route.fallback();posts++;await gate;const body=route.request().postDataJSON();expect(body).toEqual({displayName:'Adaeze Nwosu'});const person={...customers[4],...body,id:'33333333-3333-4333-8333-333333333333'};data.push(person);await route.fulfill({status:201,json:person});});
  await page.goto('/app/customers');await expect(page.getByRole('heading',{name:'Customers',exact:true})).toBeVisible();await add(page);await capture(page,info,'add');
  await page.getByRole('button',{name:'Save customer',exact:true}).click();await expect(page.getByText('Enter a display name.',{exact:true})).toBeVisible();await capture(page,info,'name-required');expect(posts).toBe(0);
  await page.getByRole('textbox',{name:'Display name (required)'}).fill('Adaeze Nwosu');await page.getByRole('button',{name:'Save customer',exact:true}).click();await expect(page.getByRole('button',{name:/Saving/})).toBeVisible();await capture(page,info,'saving');
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeVisible();expect(posts).toBe(1);release();
  await expect(page.getByText('Customer added. Adaeze Nwosu is in the list.',{exact:true})).toBeVisible();await expect(page.getByText('Adaeze Nwosu',{exact:true}).filter({visible:true})).toBeVisible();await capture(page,info,'success');
  await page.getByRole('button',{name:'Dismiss notification',exact:true}).click();await expect(page.getByText('Customer added. Adaeze Nwosu is in the list.',{exact:true})).toHaveCount(0);await page.reload();await expect(page.getByText('Adaeze Nwosu',{exact:true}).filter({visible:true})).toBeVisible();
});
test('directory definitive validation save error keeps fields and permits correction',async({page},info)=>{
  await setup(page);await page.route('**/customers?*',(route)=>route.fulfill({json:{items:customers,page:0,size:100,totalItems:customers.length}}));
  await page.route('**/customers',(route)=>route.request().method()!=='POST'?route.fallback():route.fulfill({status:400,json:{code:'VALIDATION_FAILED',requestId:'55555555-5555-4555-8555-555555555555',errors:[]} }));
  await page.goto('/app/customers');await add(page);await page.getByRole('textbox',{name:'Display name (required)'}).fill('Adaeze Nwosu');await page.getByRole('button',{name:'Save customer',exact:true}).click();await expect(page.getByText("Couldn't save the customer. Nothing was added.",{exact:true})).toBeVisible();await capture(page,info,'save-error');await expect(page.getByRole('textbox',{name:'Display name (required)'})).toHaveValue('Adaeze Nwosu');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Keep editing',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Discard changes',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('directory loading, fetch-error retry and empty frames',async({page},info)=>{
  await setup(page);let state='loading';let release!:()=>void;const gate=new Promise<void>((resolve)=>{release=resolve;});
  await page.route('**/customers?*',async(route)=>{if(state==='loading')await gate;if(state==='error')return route.fulfill({status:503,json:{code:'DATABASE_UNAVAILABLE',requestId:'55555555-5555-4555-8555-555555555555'}});return route.fulfill({json:{items:[],page:0,size:100,totalItems:0}});});
  await page.goto('/app/customers');await expect(page.getByText(/Loading customers/)).toBeVisible();await capture(page,info,'loading');state='error';release();await expect(page.getByText("Couldn't load customers",{exact:true})).toBeVisible();await capture(page,info,'error');
  state='empty';await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByText('No customers yet',{exact:true})).toBeVisible();await capture(page,info,'empty');await page.getByRole('button',{name:'Add your first customer',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
});
test('admin directory is read-only and role demotion prevents customer POST',async({page},info)=>{
  await setup(page,'ADMIN');let posts=0;await page.route('**/customers?*',(route)=>route.fulfill({json:{items:customers,page:0,size:100,totalItems:customers.length}}));await page.route('**/customers',(route)=>{if(route.request().method()!=='POST')return route.fallback();posts++;return route.abort();});
  await page.goto('/app/customers');await expect(page.getByText('Read-only access. Admins cannot add customers.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Add customer',exact:false})).toHaveCount(0);await expect(page.getByText('Chinedu Obi',{exact:true}).filter({visible:true})).toBeVisible();await capture(page,info,'admin');expect(posts).toBe(0);
  await page.route('**/me',(route)=>route.fulfill({json:{...user,role:'OWNER'}}));await page.reload();await add(page);await page.getByRole('textbox',{name:'Display name (required)'}).fill('No permission');await page.route('**/me',(route)=>route.fulfill({json:{...user,role:'ADMIN'}}));await page.getByRole('button',{name:'Save customer',exact:true}).click();await expect(page.getByText('Read-only access. Your current role cannot add customers.',{exact:true})).toBeVisible();expect(posts).toBe(0);
});
test('directory and form fit narrow and short viewports with long names',async({page})=>{
  await setup(page);await page.route('**/customers?*',(route)=>route.fulfill({json:{items:[{...customers[0],displayName:'VeryLongFictionalCustomerName'.repeat(4)}],page:0,size:100,totalItems:1}}));await page.goto('/app/customers');
  for(const width of [320,360,768,1024,1440]){await page.setViewportSize({width,height:1000});await expect(page.getByRole('heading',{name:'Customers',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);}
  await page.setViewportSize({width:360,height:500});await add(page);await page.getByRole('textbox',{name:'Display name (required)'}).fill('Short screen');await expect(page.getByRole('button',{name:'Save customer',exact:true})).toBeInViewport();
});

test('customer ledger dedicated page navigates, displays statement and passes axe check', async ({ page }, info) => {
  await setup(page);
  await page.route('**/customers?*', (route) =>
    route.fulfill({ json: { items: customers, page: 0, size: 100, totalItems: customers.length } })
  );
  await page.route('**/customers/*/ledger*', (route) =>
    route.fulfill({
      json: {
        customerId: customers[0].id,
        balanceKobo: 1230000,
        storeCreditKobo: 0,
        page: 0,
        size: 50,
        totalItems: 1,
        items: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            sourceType: 'CREDIT_SALE',
            sourceId: '22222222-2222-4222-8222-222222222222',
            deltaKobo: 1230000,
            balanceAfterKobo: 1230000,
            storeCreditAfterKobo: 0,
            createdAt: '2026-10-24T08:00:00Z',
          },
        ],
      },
    })
  );

  await page.goto('/app/customers');
  await expect(page.getByText('Chinedu Obi', { exact: true }).filter({ visible: true })).toBeVisible();

  // Click on customer name/row
  await page.getByText('Chinedu Obi', { exact: true }).filter({ visible: true }).click();

  await expect(page).toHaveURL(new RegExp(`/app/customers/${customers[0].id}`));
  await expect(page.getByRole('heading', { name: /Chinedu Obi.*Ledger/ })).toBeVisible();
  await expect(page.getByText('Current debt owed')).toBeVisible();
  await expect(page.getByText('Credit sale', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('+₦12,300.00').filter({ visible: true })).toBeVisible();
  await capture(page, info, 'ledger-page');

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);

  // Back link returns to customers list
  await page.getByRole('link', { name: /Back to customers/i }).click();
  await expect(page).toHaveURL(/\/app\/customers$/);
  await expect(page.getByText('Chinedu Obi', { exact: true }).filter({ visible: true })).toBeVisible();
});



