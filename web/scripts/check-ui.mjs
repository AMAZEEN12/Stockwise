// Warm only the owned development server; the original browser tests stay unchanged.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from '@playwright/test';

const port=Number(process.env.PLAYWRIGHT_PORT || 5186);
if(!Number.isInteger(port) || port<1024 || port>65535)throw new Error('Invalid PLAYWRIGHT_PORT');
const baseURL=`http://127.0.0.1:${port}`;
const env={...process.env,PLAYWRIGHT_PORT:String(port)};
let server;let browser;let runner;
async function stop(child) {
  if(child && child.exitCode===null && child.signalCode===null){const done=once(child,'exit');child.kill();await done;}
}
try {
  let occupied=false;
  try {await fetch(baseURL);occupied=true;}catch { /* Start only a free port. */ }
  if(occupied)throw new Error(`QA port ${port} is already occupied; choose another PLAYWRIGHT_PORT.`);
  server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let failure='';server.stdout.on('data',()=>{});server.stderr.on('data',(data)=>{failure+=String(data).slice(-1000);});
  server.on('error',(error)=>{failure=error.message;});
  let ready=false;
  for(let attempt=0;attempt<200;attempt++){
    if(server.exitCode!==null)throw new Error(`Owned Vite server exited: ${failure.slice(-1000)}`);
    try {const response=await fetch(baseURL);if(response.ok){ready=true;break;}}catch { /* Wait for this server. */ }
    await new Promise((resolve)=>setTimeout(resolve,200));
  }
  if(!ready)throw new Error('Owned Vite server did not become ready.');
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL});
  const page=await browser.newPage();
  await page.goto(baseURL,{waitUntil:'networkidle',timeout:120000});
  await page.evaluate(async()=>{await globalThis.document.fonts.ready;});
  await page.evaluate(async(paths)=>{
    for(const path of paths)await import(path);
  },['/src/features/products/ProductsPage.tsx','/src/features/products/AddProductPage.tsx','/src/features/customers/CustomersPage.tsx','/src/features/sales/NewSalePage.tsx']);
  await page.reload({waitUntil:'networkidle',timeout:120000});
  await browser.close();browser=undefined;
  console.log('Owned Vite modules/fonts warmed. Running unchanged Playwright tests.');
  runner=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','--workers=1',...process.argv.slice(2)],{env,windowsHide:true,stdio:'inherit'});
  const [code]=await once(runner,'exit');
  process.exitCode=code ?? 1;
} finally {
  if(browser)await browser.close();
  await stop(runner);
  await stop(server);
}
