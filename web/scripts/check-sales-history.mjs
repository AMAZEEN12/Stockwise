// Actual local simulation journey without route interception; not backend evidence.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {chromium,expect} from '@playwright/test';
const apiBase='http://127.0.0.1:4712';const siteBase='http://127.0.0.1:5187';
const children=[];let browser;
async function start(args,env,url) {
  try {await fetch(url);throw new Error(`QA port is occupied: ${url}`);}catch(error){if(error.message.startsWith('QA port'))throw error;}
  const child=spawn(process.execPath,args,{env:{...process.env,...env},windowsHide:true,stdio:['ignore','pipe','pipe']});children.push(child);
  let failure='';child.stderr.on('data',(data)=>{failure+=String(data).slice(-500);});child.stdout.on('data',()=>{});
  for(let i=0;i<150;i++){if(child.exitCode!==null)throw new Error(`Owned preview exited: ${failure}`);try{const response=await fetch(url);if(response.ok)return;}catch{/* Wait for owned server. */}await new Promise((resolve)=>setTimeout(resolve,200));}
  throw new Error('Owned preview did not become ready.');
}
try {
  await start(['scripts/development-api.mjs'],{DEVELOPMENT_API_PORT:'4712'},`${apiBase}/health`);
  await start(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5187','--strictPort'],{VITE_API_BASE_URL:apiBase},siteBase);
  const session=await(await fetch(`${apiBase}/auth/sessions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'owner@stockwise.test',password:'Stockwise-Demo-2026'})})).json();
  const headers={Authorization:`Bearer ${session.accessToken}`,'Content-Type':'application/json'};
  const products=await(await fetch(`${apiBase}/products?size=100`,{headers})).json();
  const customers=await(await fetch(`${apiBase}/customers?size=100`,{headers})).json();
  const paidBody={paymentType:'PAID',lines:[{productId:products.items[0].id,quantity:1}]};const key=randomUUID();
  const paid=await(await fetch(`${apiBase}/sales`,{method:'POST',headers:{...headers,'Idempotency-Key':key},body:JSON.stringify(paidBody)})).json();
  const replay=await(await fetch(`${apiBase}/sales`,{method:'POST',headers:{...headers,'Idempotency-Key':key},body:JSON.stringify(paidBody)})).json();assert.equal(replay.id,paid.id);
  const credit=await(await fetch(`${apiBase}/sales`,{method:'POST',headers:{...headers,'Idempotency-Key':randomUUID()},body:JSON.stringify({...paidBody,paymentType:'CREDIT',customerId:customers.items[0].id})})).json();
  const list=await(await fetch(`${apiBase}/sales?page=0&size=20`,{headers})).json();assert.equal(list.totalItems,2);assert(list.items.some((sale)=>sale.id===paid.id));assert(list.items.some((sale)=>sale.id===credit.id));assert(list.items.every((sale)=>Number.isSafeInteger(sale.totalKobo) && !('customerDisplayName' in sale) && !('createdByDisplayName' in sale)));
  const filtered=await(await fetch(`${apiBase}/sales?paymentType=CREDIT&size=1`,{headers})).json();assert.equal(filtered.totalItems,1);assert.equal(filtered.items[0].customerId,customers.items[0].id);
  assert.equal((await fetch(`${apiBase}/sales?from=2026-02-30`,{headers})).status,400);assert.equal((await fetch(`${apiBase}/sales?page=-1`,{headers})).status,400);
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL});const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(`${siteBase}/sign-in`,{timeout:90000});await page.getByRole('button',{name:'Owner',exact:true}).click();await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Products',exact:true})).toBeVisible();await page.getByRole('link',{name:'Sales',exact:true}).click();
  await expect(page.getByRole('rowheader',{name:paid.reference,exact:true})).toBeVisible();await expect(page.getByRole('rowheader',{name:credit.reference,exact:true})).toBeVisible();await expect(page.locator('.history-table')).toContainText(customers.items[0].id);
  await page.getByRole('button',{name:'Credit',exact:true}).focus();await page.keyboard.press('Space');await expect(page.locator('.history-table tbody tr')).toHaveCount(1);await page.getByRole('button',{name:'Refresh',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('.history-table tbody tr')).toHaveCount(1);
  await page.getByRole('combobox',{name:'Date range'}).focus();await page.keyboard.press('Space');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'No sales match these filters'})).toBeVisible();
  console.log('PASS: actual simulation paid/credit POST, same-key replay, GET list/filters/validation, integer-kobo ID-only responses, browser sign-in/menu/history/refresh/date filters. No interception; no deployed backend/concurrency proof.');
} finally {
  if(browser)await browser.close();
  for(const child of children.reverse())if(child.exitCode===null){const done=once(child,'exit');child.kill();await done;}
}
