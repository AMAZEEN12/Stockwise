import {test,expect} from '@playwright/test';
import {makeProducts} from '../scripts/mock-data.mjs';
import { resizeAndSettle } from './helpers/viewport';
test('price acceptance, quantity limits and responsive cart remain usable',async ({page}) => {
  const products=makeProducts(); const user={id:'a2222222-2222-4222-8222-222222222222',email:'owner@stockwise.test',displayName:'Demo Owner',role:'OWNER'};
  await page.addInitScript((user)=>sessionStorage.setItem('stockwise.session',JSON.stringify({accessToken:'test-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user})),user);
  await page.route('**/me',(route)=>route.fulfill({json:user}));
  await page.route('**/products?*',(route)=>route.fulfill({json:{items:[products[0]],page:0,size:20,totalItems:1}}));
  await page.route('**/products/*',(route)=>route.fulfill({json:{...products[0],priceKobo:48000}}));
  await page.route('**/customers?*',(route)=>route.fulfill({json:{items:[],page:0,size:100,totalItems:0}}));
  await page.goto('/app/sell'); await page.getByRole('textbox',{name:'Search products to add'}).fill('Indomie'); await page.getByRole('button',{name:/Indomie Chicken 70g/}).click();
  await page.getByRole('textbox',{name:'Quantity for Indomie Chicken 70g'}).fill('10001'); await expect(page.getByRole('button',{name:'Confirm sale',exact:true})).toBeDisabled(); await expect(page.getByText('Quantity cannot exceed 10,000.')).toBeVisible();
  await page.getByRole('textbox',{name:'Quantity for Indomie Chicken 70g'}).fill('3'); await page.getByRole('button',{name:'Confirm sale',exact:true}).click();
  await expect(page.getByText('Indomie Chicken 70g: Price changed ₦450.00 → ₦480.00')).toBeVisible(); await expect(page.getByRole('button',{name:'Confirm',exact:true})).toBeDisabled();
  await page.getByRole('checkbox',{name:'I accept these changes'}).check(); await expect(page.getByRole('button',{name:'Confirm',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Back to cart',exact:true}).click();
  for (const width of [320,360,768,1024,1440]) {await resizeAndSettle(page,width); const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth})); expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);}
});
test('401 preserves pending write through explicit same-account reauthentication',async ({page}) => {
  const product=makeProducts()[0]; const user={id:'a2222222-2222-4222-8222-222222222222',email:'owner@stockwise.test',displayName:'Demo Owner',role:'OWNER'};
  await page.addInitScript((user)=>{if (!sessionStorage.getItem('stockwise.test-initialized')) {sessionStorage.setItem('stockwise.test-initialized','1'); sessionStorage.setItem('stockwise.session',JSON.stringify({accessToken:'test-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user}));}},user);
  await page.route('**/me',(route)=>route.fulfill({json:user})); await page.route('**/products?*',(route)=>route.fulfill({json:{items:[product],page:0,size:20,totalItems:1}})); await page.route('**/products/*',(route)=>route.fulfill({json:product})); await page.route('**/customers?*',(route)=>route.fulfill({json:{items:[],page:0,size:100,totalItems:0}}));
  await page.route('**/auth/sessions',(route)=>route.fulfill({status:201,json:{accessToken:'renewed-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user}}));
  const keys:string[]=[]; const bodies:string[]=[];
  await page.route('**/sales',async (route)=>{keys.push(route.request().headers()['idempotency-key']); bodies.push(route.request().postData()!); if (keys.length === 1) await route.fulfill({status:401,json:{code:'UNAUTHENTICATED'}}); else await route.fulfill({status:201,json:{id:'44444444-4444-4444-8444-444444444444',reference:'S-000001',paymentType:'PAID',totalKobo:45000,lines:[{productId:product.id,productName:product.name,quantity:1,unitPriceKobo:45000,lineTotalKobo:45000}],createdBy:user.id,createdAt:'2026-10-24T08:47:00Z'}});});
  await page.goto('/app/sell'); await page.getByRole('textbox',{name:'Search products to add'}).fill('Indomie'); await page.getByRole('button',{name:/Indomie Chicken 70g/}).click(); await page.getByRole('button',{name:'Confirm sale',exact:true}).click(); await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(page.getByText('Your session ended. This sale is NOT confirmed.')).toBeVisible(); await page.getByRole('button',{name:'Sign in again',exact:true}).click(); await page.getByLabel('Email',{exact:true}).fill(user.email); await page.getByLabel('Password',{exact:true}).fill('demo-password'); await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('button',{name:'Check and retry',exact:true}).click(); await expect(page.getByRole('heading',{name:'Sale recorded'})).toBeVisible(); expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]); expect(bodies[0]).toBe(bodies[1]);
});
