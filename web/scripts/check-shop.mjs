import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base='http://127.0.0.1:4710';
const login = await fetch(`${base}/auth/sessions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'owner@stockwise.demo',password:'stockwise-demo'})});
assert.equal(login.status,201); const session=await login.json();
const headers={Authorization:`Bearer ${session.accessToken}`,'Content-Type':'application/json','X-Request-Id':randomUUID()};
async function get(path) {const response=await fetch(base+path,{headers}); assert.equal(response.status,200); return response.json();}
async function post(path,body,key) {return fetch(base+path,{method:'POST',headers:{...headers,...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify(body)});}
const productBody={name:'Browser smoke product',reference:`QC-${randomUUID().slice(0,8)}`,category:'Quality checks',priceKobo:45005,quantity:1,lowStockThreshold:1};
const created=await post('/products',productBody); assert.equal(created.status,201); const product=await created.json();
assert.equal((await get(`/products/${product.id}`)).priceKobo,45005);
assert.equal((await post('/products',productBody)).status,409);
assert.equal((await post('/products',{...productBody,reference:`BAD-${randomUUID().slice(0,8)}`,priceKobo:1.5})).status,400);
const body={paymentType:'PAID',lines:[{productId:product.id,quantity:1}]}; const key=randomUUID();
const first=await post('/sales',body,key); assert.equal(first.status,201); const sale=await first.json();
const replay=await post('/sales',body,key); assert.equal(replay.status,201); assert.equal((await replay.json()).id,sale.id);
assert.equal((await get(`/products/${product.id}`)).quantity,0);
assert.equal((await post('/sales',{...body,lines:[{productId:product.id,quantity:2}]},key)).status,422);
assert.equal((await post('/sales',body,randomUUID())).status,409);
assert.equal((await get(`/sales/${sale.id}`)).totalKobo,45005);
const people=(await get('/customers?size=100')).items; const customer=people.find((person)=>person.displayName==='Bolu Adeyemi');
const catalogue=(await get('/products?size=100')).items; const dettol=catalogue.find((item)=>item.reference==='DET-250'); const milo=catalogue.find((item)=>item.reference==='MIL-020');
const creditSale=await post('/sales',{paymentType:'CREDIT',customerId:customer.id,lines:[{productId:dettol.id,quantity:3},{productId:milo.id,quantity:5}]},randomUUID());
assert.equal(creditSale.status,201); assert.equal((await creditSale.json()).totalKobo,615000);
const after=(await get('/customers?size=100')).items.find((person)=>person.id===customer.id);
const applied=Math.min(customer.storeCreditKobo,615000); assert.equal(after.storeCreditKobo,customer.storeCreditKobo-applied); assert.equal(after.balanceKobo,customer.balanceKobo+615000-applied);
console.log('PASS: actual development API product create/read/duplicate, integer validation, sale replay, unchanged stock on replay, 422 changed-body refusal, 409 last-unit refusal, receipt and automatic simulated store-credit settlement. Not backend concurrency evidence.');
