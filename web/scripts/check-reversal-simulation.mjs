import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const port = 4717;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['scripts/development-api.mjs'], {env:{...process.env,DEVELOPMENT_API_PORT:String(port)},stdio:['ignore','pipe','pipe']});
try {
  await new Promise((resolve,reject) => {
    const timer = setTimeout(() => reject(new Error('Simulation did not start')),15000);
    child.once('exit', (code) => {clearTimeout(timer); reject(new Error(`Simulation exited: ${code}`));});
    child.stdout.on('data', (data) => {if (String(data).includes('listening')) {clearTimeout(timer); resolve();}});
  });
  const login = await fetch(`${base}/auth/sessions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'owner@stockwise.test',password:'Stockwise-Demo-2026'})});
  assert.equal(login.status,201);
  const {accessToken} = await login.json();
  const headers = {Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'};
  const customerId = '22222222-2222-4222-8222-222222222221';
  const productId = '11111111-1111-4111-8111-000000000005';
  const saleId = '33333333-3333-4333-8333-000000000002';
  const beforeProduct = await (await fetch(`${base}/products/${productId}`,{headers})).json();
  const key = randomUUID();
  const body = JSON.stringify({reason:'CUSTOMER_RETURN'});
  const submit = () => fetch(`${base}/sales/${saleId}/reversal`,{method:'POST',headers:{...headers,'Idempotency-Key':key},body});
  const first = await submit(); assert.equal(first.status,200); const result = await first.json();
  assert.equal(result.debtRemovedKobo,340000); assert.equal(result.storeCreditAddedKobo,55000);
  const replay = await submit(); assert.equal(replay.status,200); assert.deepEqual(await replay.json(),result);
  const duplicate = await fetch(`${base}/sales/${saleId}/reversal`,{method:'POST',headers:{...headers,'Idempotency-Key':randomUUID()},body}); assert.equal(duplicate.status,409);
  const product = await (await fetch(`${base}/products/${productId}`,{headers})).json(); assert.equal(product.quantity,beforeProduct.quantity+1);
  const customerPage = await (await fetch(`${base}/customers`,{headers})).json(); const customer = customerPage.items.find((item) => item.id === customerId);
  assert.equal(customer.balanceKobo,110000); assert.equal(customer.storeCreditKobo,55000);
  console.log('PASS: simulated reversal restores stock, preserves other debt, adds store credit and replays once.');
} finally { child.kill(); }
