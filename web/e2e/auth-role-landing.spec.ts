import {test,expect,type Page} from '@playwright/test';
const owner={id:'a2222222-2222-4222-8222-222222222222',email:'owner@stockwise.demo',displayName:'Demo Owner',role:'OWNER'};
const session=(role:string)=>({accessToken:'role-test-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user:{...owner,role}});
async function resources(page:Page) {
  for(const resource of ['products','customers','sales'])await page.route(`**/${resource}?*`,(route)=>{const params=new URL(route.request().url()).searchParams;return route.fulfill({json:{items:[],page:Number(params.get('page') || 0),size:Number(params.get('size') || 20),totalItems:0}});});
}
for(const [role,label,path,heading] of [['OWNER','Owner','/app/products','Products'],['ASSISTANT','Assistant','/app/sell','New sale'],['ADMIN','Admin','/app/sales','Sales']] as const) {
  test(`${role} demo fills only; explicit sign-in bypasses Workspace and survives refresh/bookmark`,async({page})=>{
    await resources(page);let posts=0;
    await page.route('**/auth/sessions',(route)=>{posts++;expect(route.request().postDataJSON().email).toBe(`${role.toLowerCase()}@stockwise.demo`);expect(Object.keys(route.request().postDataJSON()).sort()).toEqual(['email','password']);return route.fulfill({status:201,json:session(role)});});
    await page.route('**/me',(route)=>{expect(route.request().headers().authorization).toBe('Bearer role-test-token');return route.fulfill({json:{...owner,role}});});
    await page.goto('/sign-in');await page.getByRole('button',{name:label,exact:true}).click();
    await expect(page.getByRole('textbox',{name:'Email',exact:true})).toHaveValue(`${role.toLowerCase()}@stockwise.demo`);expect(posts).toBe(0);await expect(page).toHaveURL('/sign-in');
    await page.getByLabel('Password',{exact:true}).fill('stockwise-demo');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(path);await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();expect(posts).toBe(1);await expect(page.getByRole('link',{name:'Open your shop',exact:true})).toHaveCount(0);
    await page.reload();await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();await page.goto('/workspace');await expect(page).toHaveURL(path);await page.goto('/app');await expect(page).toHaveURL(path);
  });
}
test('fresh /me role wins over the demo button and session role',async({page})=>{
  await resources(page);await page.route('**/auth/sessions',(route)=>route.fulfill({status:201,json:session('OWNER')}));await page.route('**/me',(route)=>route.fulfill({json:{...owner,role:'ASSISTANT'}}));
  await page.goto('/sign-in');await page.getByRole('button',{name:'Admin',exact:true}).click();await page.getByLabel('Password',{exact:true}).fill('stockwise-demo');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL('/app/sell');
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('stockwise.session')!).user.role)).toBe('ASSISTANT');
});
test('permitted return destination survives login; demoted role and external targets use safe landing',async({page})=>{
  await resources(page);let role='ASSISTANT';await page.route('**/auth/sessions',(route)=>route.fulfill({status:201,json:session(role)}));await page.route('**/me',(route)=>route.fulfill({json:{...owner,role}}));
  for(const [returnTo,expected] of [['/app/customers?from=sale','/app/customers?from=sale'],['//example.com','/app/sell'],['/app/products/new','/app/sell'],['/app/sell','/app/sales']]) {
    if(expected==='/app/sales')role='ADMIN';await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);await page.getByLabel('Email',{exact:true}).fill(owner.email);await page.getByLabel('Password',{exact:true}).fill('stockwise-demo');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(expected);
  }
});
test('failed /me shows retry without rendering Workspace; 401 returns to sign-in',async({page})=>{
  await resources(page);let status=503;await page.route('**/auth/sessions',(route)=>route.fulfill({status:201,json:session('OWNER')}));await page.route('**/me',(route)=>status===200 ? route.fulfill({json:owner}) : route.fulfill({status,json:{code:status===401?'UNAUTHENTICATED':'DATABASE_UNAVAILABLE'}}));
  await page.goto('/sign-in');await page.getByRole('button',{name:'Owner',exact:true}).click();await page.getByLabel('Password',{exact:true}).fill('stockwise-demo');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Your shop could not be loaded'})).toBeVisible();await expect(page.getByText('Welcome, Demo Owner.',{exact:true})).toHaveCount(0);
  status=200;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page).toHaveURL('/app/products');status=401;await page.goto('/workspace');await expect(page).toHaveURL(/\/sign-in/);expect(await page.evaluate(()=>sessionStorage.getItem('stockwise.session'))).toBeNull();
});
