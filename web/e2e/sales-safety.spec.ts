import {test,expect} from '@playwright/test';
import {makeProducts} from '../scripts/mock-data.mjs';
test('role changes and unavailable real settlement never send a sale',async ({page}) => {
  const user={id:'a2222222-2222-4222-8222-222222222222',email:'owner@stockwise.test',displayName:'Demo Owner',role:'OWNER'};
  await page.addInitScript((user)=>sessionStorage.setItem('stockwise.session',JSON.stringify({accessToken:'real-service-token',tokenType:'Bearer',expiresAt:'2099-01-01T00:00:00Z',user})),user);
  let role='OWNER'; let posts=0; const products=makeProducts();
  await page.route('**/me',(route)=>route.fulfill({json:{...user,role}}));
  await page.route('**/products?*',(route)=>route.fulfill({json:{items:[products[2]],page:0,size:20,totalItems:1}}));
  await page.route('**/products/*',(route)=>route.fulfill({json:products[2]}));
  await page.route('**/customers?*',(route)=>route.fulfill({json:{items:[{id:'22222222-2222-4222-8222-222222222222',displayName:'Bolu Adeyemi',balanceKobo:0,storeCreditKobo:600000,createdAt:'2026-10-24T00:00:00Z'}],page:0,size:100,totalItems:1}}));
  await page.route('**/sales',(route)=>{posts++; return route.abort();});
  await page.goto('/app/sell'); await page.getByRole('textbox',{name:'Search products to add'}).fill('Dettol'); await page.getByRole('button',{name:/Dettol 250ml/}).click();
  await page.getByRole('button',{name:'On credit',exact:true}).click(); await page.getByRole('button',{name:'Choose customer (required)',exact:true}).click(); await page.getByRole('button',{name:/Bolu Adeyemi Settled Store credit/}).click(); await page.getByRole('button',{name:'Back to sale',exact:true}).click();
  await expect(page.getByText('Store-credit recording is awaiting service support. No sale has been sent.')).toBeVisible(); await expect(page.getByRole('button',{name:'Confirm sale',exact:true})).toBeDisabled(); expect(posts).toBe(0);
  await page.getByRole('button',{name:'Remove customer',exact:true}).click(); await page.getByRole('button',{name:'Paid',exact:true}).click(); role='ADMIN';
  await page.getByRole('button',{name:'Confirm sale',exact:true}).click(); await expect(page.getByText('Read-only access',{exact:true})).toBeVisible(); expect(posts).toBe(0);
});
