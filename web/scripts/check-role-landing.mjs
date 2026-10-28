// Independent local demonstration only: no intercepted HTTP or backend-auth claims.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
const api='http://127.0.0.1:4713';const site='http://127.0.0.1:5189';
const demo=loadEnv('development',process.cwd(),'VITE_DEMO_');
const children=[];let browser;
async function start(args,env,url) {
  let occupied=false;try{await fetch(url);occupied=true;}catch{/* Only start a free port. */}
  if(occupied)throw new Error(`QA port occupied: ${url}`);
  const child=spawn(process.execPath,args,{env:{...process.env,...env},windowsHide:true,stdio:['ignore','pipe','pipe']});children.push(child);
  let failure='';child.stdout.on('data',()=>{});child.stderr.on('data',(data)=>{failure+=String(data).slice(-500);});
  for(let i=0;i<150;i++){if(child.exitCode!==null)throw new Error(`Owned preview exited: ${failure}`);try{if((await fetch(url)).ok)return;}catch{/* Await owned server. */}await new Promise((resolve)=>setTimeout(resolve,200));}
  throw new Error('Owned preview did not become ready.');
}
const email=(role)=>demo[`VITE_DEMO_${role}_EMAIL`] || `${role.toLowerCase()}@stockwise.test`;
const password=demo.VITE_DEMO_PASSWORD || 'Stockwise-Demo-2026';
async function login(base,role){const response=await fetch(`${base}/auth/sessions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email(role),password})});assert.equal(response.status,201);return response.json();}
const headers=(session)=>({Authorization:`Bearer ${session.accessToken}`,'Content-Type':'application/json'});
try {
  await start(['scripts/development-api.mjs'],{DEVELOPMENT_API_PORT:'4713'},`${api}/health`);
  await start(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5189','--strictPort'],{VITE_API_BASE_URL:api},site);
  const sessions=[];
  for(const role of ['OWNER','ASSISTANT','ADMIN']){const session=await login(api,role);assert.equal(session.user.role,role);sessions.push(session);}
  assert.equal(new Set(sessions.map((session)=>session.accessToken)).size,3);assert.equal(new Set(sessions.map((session)=>session.user.id)).size,3);
  for(const session of sessions){const me=await(await fetch(`${api}/me`,{headers:headers(session)})).json();assert.equal(me.role,session.user.role);assert.equal(me.id,session.user.id);}
  const product=(await(await fetch(`${api}/products?size=100`,{headers:headers(sessions[0])})).json()).items.find((item)=>item.quantity>=2);
  const key=randomUUID();const body=JSON.stringify({paymentType:'PAID',lines:[{productId:product.id,quantity:1}]});
  const record=async(session)=>{const response=await fetch(`${api}/sales`,{method:'POST',headers:{...headers(session),'Idempotency-Key':key},body});return {status:response.status,sale:await response.json()};};
  const first=await record(sessions[0]);const second=await record(sessions[1]);assert.equal(first.status,201);assert.equal(second.status,201);assert.notEqual(first.sale.id,second.sale.id);assert.notEqual(first.sale.createdBy,second.sale.createdBy);assert.equal((await record(sessions[0])).sale.id,first.sale.id);assert.equal((await record(sessions[2])).status,403);
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL});
  for(const [role,label,path,heading] of [['OWNER','Owner','/app/products','Products'],['ASSISTANT','Assistant','/app/sell','New sale'],['ADMIN','Admin','/app/sales','Sales']]) {
    const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();let posts=0;
    page.on('request',(request)=>{if(request.method()==='POST' && request.url().endsWith('/auth/sessions'))posts++;});
    await page.goto(`${site}/sign-in`,{timeout:90000});await page.getByRole('button',{name:label,exact:true}).click();await expect(page.getByLabel('Email',{exact:true})).toHaveValue(email(role));assert.equal(posts,0);await expect(page).toHaveURL(`${site}/sign-in`);
    await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(`${site}${path}`);await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();assert.equal(posts,1);
    await page.reload();await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();await page.goto(`${site}/workspace`);await expect(page).toHaveURL(`${site}${path}`);await expect(page.getByText(`Welcome, Demo ${label}.`,{exact:true})).toHaveCount(0);await context.close();
  }
  await start(['scripts/development-api.mjs','--role=ADMIN'],{DEVELOPMENT_API_PORT:'4714'},'http://127.0.0.1:4714/health');assert.equal((await login('http://127.0.0.1:4714','OWNER')).user.role,'ADMIN');
  console.log('PASS: unintercepted three-role credential-fill/explicit-login/landing/refresh/bookmark journeys; separate identities/tokens remain isolated; simulation permissions and per-user idempotency replay hold; explicit CLI role override retained. Local simulation, not backend authentication/concurrency proof.');
} finally {
  if(browser)await browser.close();
  for(const child of children.reverse())if(child.exitCode===null){const done=once(child,'exit');child.kill();await done;}
}
