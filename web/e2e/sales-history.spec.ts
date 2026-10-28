import {test,expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const user={id:'a2222222-2222-4222-8222-222222222222',email:'owner@stockwise.test',displayName:'Ada Okafor',role:'OWNER'};
const customerId='22222222-2222-4222-8222-222222222221';
const makeSale=(index:number,paymentType='CREDIT')=>({id:`44444444-4444-4444-8444-${String(index).padStart(12,'0')}`,reference:`S-${String(index).padStart(6,'0')}`,paymentType,...(paymentType==='CREDIT' ? {customerId} : {}),totalKobo:315000,createdBy:user.id,createdAt:`2026-10-24T08:${String(index%60).padStart(2,'0')}:00Z`,lines:[{productId:'33333333-3333-4333-8333-333333333333',productName:'Demonstration item',quantity:1,unitPriceKobo:315000,lineTotalKobo:315000}]});
const sales=[makeSale(42),makeSale(41,'PAID'),makeSale(40),makeSale(39,'PAID')];
async function setup(page:Page,role='OWNER') {
  if(page.viewportSize()?.width===360)await page.setViewportSize({width:360,height:1000});
  await page.clock.setFixedTime(new Date('2026-10-24T09:10:00Z'));
  await page.addInitScript((user)=>sessionStorage.setItem('stockwise.session',JSON.stringify({accessToken:'stockwise-contract-mock-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user})),{...user,role});
  await page.route('**/me',(route)=>route.fulfill({json:{...user,role}}));
}
async function capture(page:Page,info:TestInfo,state:string) {
  await page.evaluate(async()=>{await document.fonts.ready;if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo(0,0);});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({path:info.outputPath(`history-${state}.png`)});
  const axe=await new AxeBuilder({page}).analyze();expect(axe.violations.filter((v)=>['serious','critical'].includes(v.impact || ''))).toEqual([]);
}
test('history list keeps server references, full IDs, recorded money and read-only entries',async({page},info)=>{
  await setup(page);let writes=0;let lookups=0;
  page.on('request',(request)=>{if(request.method()==='POST')writes++;if(/\/(customers|users)(\?|$)/.test(request.url()))lookups++;});
  await page.route('**/sales?*',(route)=>{const query=new URL(route.request().url()).searchParams;expect(query.get('from')).toBe('2026-10-24');expect(query.get('to')).toBe('2026-10-24');expect(query.get('size')).toBe('20');return route.fulfill({json:{items:sales,page:0,size:20,totalItems:4}});});
  await page.goto('/app/sales');await expect(page.getByText('S-000042',{exact:true}).filter({visible:true})).toBeVisible();
  await expect(page.locator('.history-identity').filter({visible:true}).first()).toContainText(customerId);
  await expect(page.locator('.history-identity').filter({visible:true}).nth(1)).toContainText(user.id);
  await expect(page.getByText('\u20a63,150.00',{exact:true}).filter({visible:true})).toHaveCount(4);
  await expect(page.locator('.history-table a,.history-cards a,.history-table button,.history-cards button')).toHaveCount(0);
  expect(writes).toBe(0);expect(lookups).toBe(0);await capture(page,info,'list');
});
test('credit and date filters use existing wire fields and include dates for the week',async({page},info)=>{
  await setup(page);const queries:URLSearchParams[]=[];
  await page.route('**/sales?*',(route)=>{const query=new URL(route.request().url()).searchParams;queries.push(query);const items=sales.filter((sale)=>!query.get('paymentType') || sale.paymentType===query.get('paymentType'));return route.fulfill({json:{items,page:0,size:20,totalItems:items.length}});});
  await page.goto('/app/sales');await page.getByRole('button',{name:'Credit',exact:true}).click();await expect(page.locator('.history-table tbody tr')).toHaveCount(2);await capture(page,info,'credit');
  await page.getByRole('combobox',{name:'Date range'}).click();await page.getByRole('option',{name:'Yesterday',exact:true}).click();await expect.poll(()=>queries.at(-1)?.get('from')).toBe('2026-10-23');expect(queries.at(-1)?.get('to')).toBe('2026-10-23');
  await page.getByRole('combobox',{name:'Date range'}).click();await page.getByRole('option',{name:'Last 7 days',exact:true}).click();await expect.poll(()=>queries.at(-1)?.get('from')).toBe('2026-10-18');expect(queries.at(-1)?.get('to')).toBe('2026-10-24');expect(queries.at(-1)?.get('paymentType')).toBe('CREDIT');
  await expect(page.locator('.history-date').filter({visible:true}).first()).toContainText('24 Oct');
});
test('loading frame keeps accessible skeletons until data is ready',async({page},info)=>{
  await setup(page);let release!:()=>void;const gate=new Promise<void>((resolve)=>{release=resolve;});
  await page.route('**/sales?*',async(route)=>{await gate;return route.fulfill({json:{items:sales,page:0,size:20,totalItems:4}});});
  await page.goto('/app/sales');await expect(page.getByText('Loading sales\u2026',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeDisabled();await capture(page,info,'loading');release();await expect(page.locator('.history-table tbody tr')).toHaveCount(4);
});
test('error frame shows request ID and retry loads real results',async({page},info)=>{
  await setup(page);let fail=true;
  await page.route('**/sales?*',(route)=>fail ? route.fulfill({status:503,json:{code:'DATABASE_UNAVAILABLE',requestId:'55555555-5555-4555-8555-555555555555'}}) : route.fulfill({json:{items:sales,page:0,size:20,totalItems:4}}));
  await page.goto('/app/sales');await expect(page.getByRole('heading',{name:"Couldn't load sales"})).toBeVisible();await expect(page.getByText('Request ID 55555555-5555-4555-8555-555555555555')).toBeVisible();await capture(page,info,'error');fail=false;await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.locator('.history-table tbody tr')).toHaveCount(4);
});
test('empty frame and filter-specific empty state do not invent recording success',async({page},info)=>{
  await setup(page);await page.route('**/sales?*',(route)=>route.fulfill({json:{items:[],page:0,size:20,totalItems:0}}));
  await page.goto('/app/sales');await expect(page.getByRole('heading',{name:'No sales recorded yet'})).toBeVisible();await capture(page,info,'empty');await page.getByRole('button',{name:'Credit',exact:true}).click();await expect(page.getByRole('heading',{name:'No sales match these filters'})).toBeVisible();await expect(page.locator('[data-toast-title]')).toHaveCount(0);
});
test('refresh highlights only a newer server-confirmed first sale and expires notice',async({page},info)=>{
  await setup(page);let items=sales;
  await page.route('**/sales?*',(route)=>route.fulfill({json:{items,page:0,size:20,totalItems:items.length}}));
  await page.goto('/app/sales');await expect(page.locator('.history-table tbody tr')).toHaveCount(4);await expect(page.locator('[data-toast-title]')).toHaveCount(0);
  items=[{...makeSale(43),createdAt:'2026-10-24T08:58:00Z'},...sales];await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByText('Sale recorded. S-000043 is at the top.',{exact:true})).toBeVisible();await expect(page.locator('.history-table tbody tr').first()).toHaveAttribute('data-highlight','true');await capture(page,info,'success');
  await expect(page.locator('[data-toast-title]')).toHaveCount(0,{timeout:8000});await expect(page.locator('[data-highlight="true"]')).toHaveCount(0);
});
test('pagination retains rows on failure, retries the prefix and never displays unsafe money',async({page})=>{
  await setup(page);let fail=false;let unsafe=false;const items=Array.from({length:25},(_,i)=>makeSale(59-i));
  await page.route('**/sales?*',(route)=>{const pageNumber=Number(new URL(route.request().url()).searchParams.get('page'));if(fail && pageNumber===1)return route.fulfill({status:503,json:{code:'DATABASE_UNAVAILABLE'}});const batch=items.slice(pageNumber*20,(pageNumber+1)*20).map((sale)=>unsafe ? {...sale,totalKobo:100.5} : sale);return route.fulfill({json:{items:batch,page:pageNumber,size:20,totalItems:25}});});
  await page.goto('/app/sales');await expect(page.locator('.history-table tbody tr')).toHaveCount(20);fail=true;await page.getByRole('button',{name:'Load more',exact:true}).click();await expect(page.getByRole('heading',{name:"Couldn't refresh sales"})).toBeVisible();await expect(page.locator('.history-table tbody tr')).toHaveCount(20);
  await expect(page.locator('.history-heading .micro')).toContainText('as of 10:10 WAT');
  fail=false;await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.locator('.history-table tbody tr')).toHaveCount(25);await expect(page.getByRole('button',{name:'Load more',exact:true})).toHaveCount(0);
  unsafe=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByRole('heading',{name:"Couldn't refresh sales"})).toBeVisible();await expect(page.locator('.history-table tbody tr')).toHaveCount(25);await expect(page.getByText('\u20a61.01',{exact:true})).toHaveCount(0);
});
test('admin can read history, expired sessions explain recovery, layout fits narrow screens',async({page})=>{
  await setup(page,'ADMIN');let expired=false;
  await page.route('**/sales?*',(route)=>expired ? route.fulfill({status:401,json:{code:'UNAUTHENTICATED'}}) : route.fulfill({json:{items:sales,page:0,size:20,totalItems:4}}));
  await page.goto('/app/sales');await expect(page.getByRole('heading',{name:'Sales',exact:true})).toBeVisible();
  for (const width of [320, 360, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 1000 });

  const diagnostics = await page.evaluate((expectedWidth) => {
    const elements = Array.from(document.querySelectorAll("*"));

    const overflowingElements = elements
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);

        return {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className:
            typeof element.className === "string"
              ? element.className
              : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          scrollWidth: element.scrollWidth,
          position: style.position,
          overflowX: style.overflowX,
        };
      })
      .filter(
        (element) =>
          element.width > 0 &&
          element.right > expectedWidth + 1,
      )
      .sort((a, b) => b.right - a.right)
      .slice(0, 15);

    return {
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      overflowingElements,
    };
  }, width);

  expect(
    diagnostics.documentWidth,
    `Horizontal overflow at viewport ${width}px:\n${JSON.stringify(diagnostics, null, 2)}`,
  ).toBeLessThanOrEqual(width);
}
  expired=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByText('Your session ended. Sign in again to load sales.',{exact:true})).toBeVisible();
});
test('refresh recomputes Lagos day after midnight and rejects duplicate page identities',async({page})=>{
  await setup(page);const ranges:string[]=[];let duplicate=false;
  await page.route('**/sales?*',(route)=>{ranges.push(new URL(route.request().url()).searchParams.get('from')!);return route.fulfill({json:{items:duplicate ? [sales[0],sales[0]] : sales,page:0,size:20,totalItems:duplicate ? 2 : 4}});});
  await page.goto('/app/sales');await expect(page.locator('.history-table tbody tr')).toHaveCount(4);
  await page.clock.setFixedTime(new Date('2026-10-24T23:00:01Z'));await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect.poll(()=>ranges.at(-1)).toBe('2026-10-25');
  duplicate=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByRole('heading',{name:"Couldn't refresh sales"})).toBeVisible();await expect(page.locator('.history-table tbody tr')).toHaveCount(4);
});

