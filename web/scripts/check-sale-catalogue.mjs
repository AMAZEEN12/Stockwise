// Real browser/API requests against an owned local simulation; not backend proof.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
const api='http://127.0.0.1:4715';const site='http://127.0.0.1:5192';
const demo=loadEnv('development',process.cwd(),'VITE_DEMO_');
const email=demo.VITE_DEMO_OWNER_EMAIL || 'owner@stockwise.test';
const password=demo.VITE_DEMO_PASSWORD || 'Stockwise-Demo-2026';
const children=[];let browser;
async function start(args,env,url){
  let occupied=false;try{await fetch(url);occupied=true;}catch{/* Own free ports only. */}
  if(occupied)throw new Error(`QA port occupied: ${url}`);
  const child=spawn(process.execPath,args,{env:{...process.env,...env},windowsHide:true,stdio:['ignore','pipe','pipe']});children.push(child);
  let failure='';child.stdout.on('data',()=>{});child.stderr.on('data',(data)=>{failure+=String(data).slice(-500);});
  for(let i=0;i<150;i++){if(child.exitCode!==null)throw new Error(`Owned preview exited: ${failure}`);try{if((await fetch(url)).ok)return;}catch{/* Wait for owned server. */}await new Promise((resolve)=>setTimeout(resolve,200));}
  throw new Error('Owned preview did not become ready.');
}
function ordered(names){return [...names].sort((a,b)=>a.toLowerCase()<b.toLowerCase() ? -1 : a.toLowerCase()>b.toLowerCase() ? 1 : 0);}
try {
  await start(['scripts/development-api.mjs'],{DEVELOPMENT_API_PORT:'4715'},`${api}/health`);
  const login=await fetch(`${api}/auth/sessions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(login.status,201);
  const session=await login.json();const headers={Authorization:`Bearer ${session.accessToken}`,'Content-Type':'application/json'};
  for(let i=1;i<=26;i++){
    const response=await fetch(`${api}/products`,{method:'POST',headers,body:JSON.stringify({name:`Catalogue QA ${String(i).padStart(3,'0')}`,reference:`CAT-QA-${i}`,category:'Demo QA',priceKobo:45000,quantity:4,lowStockThreshold:1})});assert.equal(response.status,201);
  }
  const source=await(await fetch(`${api}/products?page=0&size=100`,{headers})).json();assert.deepEqual(source.items.map((p)=>p.name),ordered(source.items.map((p)=>p.name)));
  const active=source.items.filter((p)=>p.active);
  await start(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5192','--strictPort'],{VITE_API_BASE_URL:api},site);
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL});
  for(const width of [1440,360]){
    const context=await browser.newContext({viewport:{width,height:900},isMobile:width===360,hasTouch:width===360,reducedMotion:'reduce'});const page=await context.newPage();
    await page.goto(`${site}/sign-in`,{timeout:90000});await page.getByRole('button',{name:'Owner',exact:true}).click();
    await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(`${site}/app/products`);
    if(width===360){await page.getByRole('button',{name:'Open menu',exact:true}).click();}
    await page.getByRole('link',{name:'Sell',exact:true}).click();
    const list=page.getByRole('list',{name:'Products available for this sale'});
    await expect(list.getByRole('button')).toHaveCount(20);await expect(page.getByRole('textbox',{name:'Search products to add'})).toHaveValue('');
    await page.getByRole('button',{name:'Load more products',exact:true}).click();await expect(list.getByRole('button')).toHaveCount(active.length);
    assert.deepEqual(await list.locator('strong').allTextContents(),active.map((p)=>p.name));
    await expect(list.getByRole('button',{name:/Peak Milk Tin/})).toBeDisabled();assert.equal(await list.getByText('Old Bread Mix 1kg',{exact:true}).count(),0);
    await page.getByRole('textbox',{name:'Search products to add'}).fill('CAT-QA-26');await expect(list.getByRole('button')).toHaveCount(1);
    if(width===360)await list.getByRole('button').tap();else {await list.getByRole('button').focus();await page.keyboard.press('Enter');}
    await expect(page.getByRole('textbox',{name:'Quantity for Catalogue QA 026'})).toHaveValue('1');
    assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);
    const bounds=await list.boundingBox();assert(bounds.x>=0 && bounds.x+bounds.width<=width);
    await page.getByRole('button',{name:'Confirm sale',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Receipt',exact:true})).toBeVisible();await expect(page.getByText('Catalogue QA 026',{exact:true})).toBeVisible();
    await context.close();
  }
  console.log('PASS: unintercepted desktop/mobile login, immediate alphabetical catalogue, paging, archived/zero-stock rules, reference search, keyboard/touch add and paid sale receipt. Local simulation only.');
} finally {
  if(browser)await browser.close();
  for(const child of children.reverse())if(child.exitCode===null){const done=once(child,'exit');child.kill();await done;}
}
