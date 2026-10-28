import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {makeProducts} from '../scripts/mock-data.mjs';

const user={id:'a2222222-2222-4222-8222-222222222222',displayName:'Demo Owner',email:'owner@stockwise.test',role:'OWNER'};
function products(count=25){return Array.from({length:count},(_,i)=>({...makeProducts()[0],id:`33333333-3333-4333-8333-${String(i+1).padStart(12,'0')}`,name:`Item ${String(i+1).padStart(3,'0')}`,reference:`REF-${String(i+1).padStart(3,'0')}`,quantity:10}));}
async function setup(page:Page){
  await page.addInitScript((user)=>sessionStorage.setItem('stockwise.session',JSON.stringify({accessToken:'catalogue-test',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user})),user);
  await page.route('**/me',(route)=>route.fulfill({json:user}));
  await page.route('**/customers?*',(route)=>route.fulfill({json:{items:[],page:0,size:100,totalItems:0}}));
}

test('default catalogue, alphabetical order, pagination, reference search and keyboard selection',async({page},info)=>{
  await setup(page);const rows=products();rows[0].quantity=0;rows[1].active=false;
  const calls:number[]=[];
  await page.route('**/products?*',(route)=>{
    const url=new URL(route.request().url());expect([...url.searchParams.keys()].sort()).toEqual(['page','q','size']);
    const q=url.searchParams.get('q')!.toLowerCase();const number=Number(url.searchParams.get('page'));calls.push(number);
    const matches=rows.filter((p)=>`${p.name} ${p.reference}`.toLowerCase().includes(q));
    return route.fulfill({json:{items:matches.slice(number*20,(number+1)*20).reverse(),page:number,size:20,totalItems:matches.length}});
  });
  await page.goto('/app/sell');
  const list=page.getByRole('list',{name:'Products available for this sale'});
  await expect(list.getByRole('button')).toHaveCount(19);
  await expect(list.locator('strong')).toHaveText(rows.slice(0,20).filter((p)=>p.active).map((p)=>p.name));
  await expect(list.getByRole('button',{name:/Item 001/})).toBeDisabled();
  await expect(list.getByText('Item 002',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Load more products',exact:true}).click();
  await expect(list.getByRole('button')).toHaveCount(24);expect(calls).toEqual([0,0,1]);
  await expect(page.getByRole('button',{name:'Load more products',exact:true})).toHaveCount(0);
  await page.getByRole('textbox',{name:'Search products to add'}).fill('REF-025');
  await expect(list.getByRole('button')).toHaveCount(1);
  await list.getByRole('button',{name:/Item 025/}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox',{name:'Quantity for Item 025'})).toHaveValue('1');
  await expect(page.getByRole('textbox',{name:'Search products to add'})).toHaveValue('');
  await expect(list.getByRole('button')).toHaveCount(19);
  expect(await list.evaluate((element)=>element.scrollHeight>element.clientHeight)).toBe(true);
  const bounds=await list.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const axe=await new AxeBuilder({page}).analyze();expect(axe.violations.filter((v)=>['serious','critical'].includes(v.impact||''))).toEqual([]);
  await page.screenshot({path:info.outputPath('sale-default-catalogue.png'),fullPage:true});
});

test('loading, error retry, empty catalogue and no search results stay distinct',async({page})=>{
  await setup(page);let state='loading';let release!:()=>void;const gate=new Promise<void>((resolve)=>{release=resolve;});
  await page.route('**/products?*',async(route)=>{
    if(state==='loading')await gate;
    if(state==='error')return route.fulfill({status:503,json:{code:'INTERNAL_ERROR'}});
    return route.fulfill({json:{items:[],page:0,size:20,totalItems:0}});
  });
  await page.goto('/app/sell');await expect(page.getByText('Loading products…',{exact:true})).toBeVisible();
  state='error';release();await expect(page.getByRole('heading',{name:'Could not load products'})).toBeVisible();
  state='empty';await page.getByRole('button',{name:'Retry products'}).click();await expect(page.getByRole('heading',{name:'No products yet'})).toBeVisible();
  await page.getByRole('textbox',{name:'Search products to add'}).fill('missing');await expect(page.getByRole('heading',{name:'No matching products'})).toBeVisible();
  await page.getByRole('button',{name:'Clear all',exact:true}).click();await expect(page.getByRole('heading',{name:'No products yet'})).toBeVisible();
});

test('failed Load more retains unavailable old rows and retries the full prefix',async({page})=>{
  await setup(page);const rows=products();let fail=true;
  await page.route('**/products?*',(route)=>{
    const number=Number(new URL(route.request().url()).searchParams.get('page'));
    if(number===1 && fail)return route.fulfill({status:503,json:{code:'INTERNAL_ERROR'}});
    return route.fulfill({json:{items:rows.slice(number*20,(number+1)*20),page:number,size:20,totalItems:rows.length}});
  });
  await page.goto('/app/sell');const list=page.getByRole('list',{name:'Products available for this sale'});await expect(list.getByRole('button')).toHaveCount(20);
  await page.getByRole('button',{name:'Load more products'}).click();await expect(page.getByRole('heading',{name:'Could not refresh products'})).toBeVisible();
  await expect(list.getByRole('button')).toHaveCount(20);await expect(list.getByRole('button').first()).toBeDisabled();
  fail=false;await page.getByRole('button',{name:'Retry products'}).click();await expect(list.getByRole('button')).toHaveCount(25);await expect(list.getByRole('button').first()).toBeEnabled();
});

test('archived-only pages are skipped and old searches never supply selectable rows',async({page})=>{
  await setup(page);const rows=products(21);rows.slice(0,20).forEach((row)=>{row.active=false;});
  let release!:()=>void;const gate=new Promise<void>((resolve)=>{release=resolve;});
  await page.route('**/products?*',async(route)=>{
    const url=new URL(route.request().url());const q=url.searchParams.get('q');const number=Number(url.searchParams.get('page'));
    if(q==='missing'){await gate;return route.fulfill({json:{items:[],page:0,size:20,totalItems:0}});}
    return route.fulfill({json:{items:rows.slice(number*20,(number+1)*20),page:number,size:20,totalItems:rows.length}});
  });
  await page.goto('/app/sell');await expect(page.getByRole('button',{name:/Item 021/})).toBeVisible();
  await expect(page.getByRole('heading',{name:'No products yet'})).toHaveCount(0);
  await page.getByRole('textbox',{name:'Search products to add'}).fill('missing');await expect(page.getByText('Searching products…',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/Item 021/})).toHaveCount(0);
  release();await expect(page.getByRole('heading',{name:'No matching products'})).toBeVisible();
});
