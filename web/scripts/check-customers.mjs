// Unintercepted, isolated local simulation/browser journey. Not backend evidence.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {chromium,expect} from '@playwright/test';
const apiBase='http://127.0.0.1:4711';const siteBase='http://127.0.0.1:5185';
const children=[];let browser;
async function start(args,env,url) {
  const child=spawn(process.execPath,args,{env:{...process.env,...env},windowsHide:true,stdio:['ignore','pipe','pipe']});children.push(child);
  let exited=false;let failure='';child.on('exit',()=>{exited=true;});child.on('error',(error)=>{exited=true;failure=error.message;});
  child.stderr.on('data',(data)=>{failure+=String(data).slice(-500);});child.stdout.on('data',()=>{});
  for(let attempt=0;attempt<100;attempt++) {
    await new Promise((resolve)=>setTimeout(resolve,200));
    if(exited)throw new Error(`Owned preview exited: ${failure.slice(-500)}`);
    try {const response=await fetch(url);if(response.ok)return;}catch { /* Wait for this owned server. */ }
  }
  throw new Error('Owned local preview did not become ready');
}
try {
  await start(['scripts/development-api.mjs'],{DEVELOPMENT_API_PORT:'4711'},`${apiBase}/health`);
  await start(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5185','--strictPort'],{VITE_API_BASE_URL:apiBase},siteBase);
  const session=await (await fetch(`${apiBase}/auth/sessions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'owner@stockwise.demo',password:'stockwise-demo'})})).json();
  const headers={Authorization:`Bearer ${session.accessToken}`,'Content-Type':'application/json','X-Request-Id':randomUUID()};
  const invalid=await fetch(`${apiBase}/customers`,{method:'POST',headers,body:JSON.stringify({displayName:'  '})});assert.equal(invalid.status,400);
  const oversized=await fetch(`${apiBase}/customers`,{method:'POST',headers,body:JSON.stringify({displayName:'x'.repeat(121)})});assert.equal(oversized.status,400);
  browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:900}});const label=`QC Customer ${randomUUID().slice(0,8)}`;
  await page.goto(`${siteBase}/sign-in`);await page.getByRole('button',{name:'Owner',exact:true}).click();await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Products',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Customers',exact:true}).click();await page.getByRole('button',{name:'Add customer',exact:false}).click();await page.getByRole('textbox',{name:'Display name (required)'}).fill(label);await page.getByRole('textbox',{name:'Contact (optional)'}).fill('Fictional smoke-check note');await page.getByRole('button',{name:'Save customer',exact:true}).click();
  await expect(page.getByText(`Customer added. ${label} is in the list.`,{exact:true})).toBeVisible();await page.reload();await page.getByRole('textbox',{name:'Search customers by name'}).fill(label);await expect(page.getByRole('rowheader',{name:label,exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Sell',exact:true}).click();await page.getByRole('textbox',{name:'Search products to add'}).fill('Indomie');await page.getByRole('button',{name:/Indomie Chicken 70g/}).click();await page.getByRole('button',{name:'On credit',exact:true}).click();await page.getByRole('button',{name:'Choose customer (required)',exact:true}).click();await page.getByRole('textbox',{name:'Search customers by name'}).fill(label);await page.getByRole('button',{name:`${label} Balance owed — Store credit —`,exact:true}).click();await page.getByRole('button',{name:'Back to sale',exact:true}).click();
  await page.getByRole('button',{name:'Confirm sale',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('heading',{name:'Sale recorded',exact:true})).toBeVisible();
  const result=await (await fetch(`${apiBase}/customers?size=100`,{headers})).json();const customer=result.items.find((item)=>item.displayName===label);assert.equal(customer.balanceKobo,45000);assert.equal(customer.hasDebtActivity,true);assert.equal(customer.storeCreditKobo,0);assert.equal(customer.hasStoreCreditActivity,false);assert.equal(customer.contactPlaceholder,'Fictional smoke-check note');
  console.log('PASS: actual local API rejects invalid names; browser sign-in, customer creation/contact, directory search/refresh, picker UUID selection, credit sale and resulting integer-kobo customer balance. No request interception. Development simulation only.');
} finally {
  if(browser)await browser.close();
  for(const child of children.reverse())if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}
}
