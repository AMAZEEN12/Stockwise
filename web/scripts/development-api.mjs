// Local-only stateful demonstration. Not a service implementation or concurrency proof.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mockUser, makeProducts, stockState } from './mock-data.mjs';

const products = makeProducts();
const user = {...mockUser, role: process.argv.find((arg) => arg.startsWith('--role='))?.slice(7) || 'OWNER'};
if (!['OWNER','ASSISTANT','ADMIN'].includes(user.role)) throw new Error('Unknown mock role');
const token = 'stockwise-contract-mock-token';
const customers = [
  {id:'22222222-2222-4222-8222-222222222221',displayName:'Mama Chidi',balanceKobo:450000,storeCreditKobo:0,createdAt:'2026-10-24T08:41:00Z'},
  {id:'22222222-2222-4222-8222-222222222222',displayName:'Bolu Adeyemi',balanceKobo:0,storeCreditKobo:600000,createdAt:'2026-10-24T08:41:00Z'},
];
const sales = [];
const submissions = new Map();
const isUuid = (text) => typeof text === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text);
const server = createServer(async (request,response) => {
  const origin = request.headers.origin;
  if (origin && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {response.writeHead(403); response.end(); return;}
  response.setHeader('Access-Control-Allow-Origin', origin || 'http://127.0.0.1:5173');
  response.setHeader('Vary','Origin');
  response.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, Idempotency-Key, X-Request-Id');
  response.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  response.setHeader('Access-Control-Expose-Headers','X-Request-Id, Location');
  const requestId = isUuid(request.headers['x-request-id']) ? request.headers['x-request-id'] : randomUUID();
  response.setHeader('X-Request-Id',requestId);
  const send = (status,body) => {response.writeHead(status,{'Content-Type':status >= 400 ? 'application/problem+json' : 'application/json'}); response.end(JSON.stringify(body));};
  const problem = (status,code,detail,errors) => send(status,{type:`https://stockwise.example/problems/${code.toLowerCase().replaceAll('_','-')}`,title:detail,status,code,detail,requestId,...(errors ? {errors}: {})});
  if (request.method === 'OPTIONS') {response.writeHead(204); response.end(); return;}
  const url = new URL(request.url,'http://127.0.0.1:4710');
  let body;
  try {
    if (request.method === 'POST') {
      let raw = ''; for await (const chunk of request) {raw += chunk; if (raw.length > 65536) throw new Error('Too large');}
      body = JSON.parse(raw);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid object');
    }
  } catch {problem(400,'VALIDATION_FAILED','Invalid JSON request.'); return;}
  if (url.pathname === '/auth/sessions' && request.method === 'POST') {
    if (typeof body.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email) || typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) {problem(400,'VALIDATION_FAILED','Check email and password.'); return;}
    send(201,{accessToken:token,tokenType:'Bearer',expiresAt:new Date(Date.now()+8*60*60*1000).toISOString(),user}); return;
  }
  if (url.pathname === '/health') {send(200,{status:'UP',service:'stockwise',version:'development-simulation'}); return;}
  if (request.headers.authorization !== `Bearer ${token}`) {problem(401,'UNAUTHENTICATED','Sign in again.'); return;}
  if (url.pathname === '/me' && request.method === 'GET') {send(200,user); return;}
  if (url.pathname === '/products' && request.method === 'GET') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const items = products.filter((product) => `${product.name} ${product.reference}`.toLowerCase().includes(q) && (!url.searchParams.get('category') || product.category === url.searchParams.get('category')) && (!url.searchParams.get('stockState') || stockState(product) === url.searchParams.get('stockState')));
    const page = Number(url.searchParams.get('page') || 0); const size = Number(url.searchParams.get('size') || 20);
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) {problem(400,'VALIDATION_FAILED','Invalid pagination.'); return;}
    send(200,{items:items.slice(page*size,(page+1)*size).map((product) => ({...product,stockState:stockState(product)})),page,size,totalItems:items.length}); return;
  }
  if (url.pathname === '/products' && request.method === 'POST') {
    if (user.role !== 'OWNER') {problem(403,'FORBIDDEN','Only the owner can add products.'); return;}
    const errors = [];
    for (const [key,max] of [['name',200],['reference',40],['category',60]]) if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > max) errors.push({field:key,message:`Enter a valid ${key}.`});
    for (const key of ['priceKobo','quantity','lowStockThreshold']) if (!Number.isSafeInteger(body[key]) || body[key] < 0 || (key !== 'priceKobo' && body[key] > 2147483647)) errors.push({field:key,message:'Enter a supported non-negative integer.'});
    if (Object.keys(body).some((key) => !['name','reference','category','priceKobo','quantity','lowStockThreshold'].includes(key))) errors.push({field:'body',message:'Unexpected property.'});
    if (errors.length) {problem(400,'VALIDATION_FAILED','Check product fields.',errors); return;}
    if (products.some((product) => product.reference === body.reference)) {problem(409,'DUPLICATE_REFERENCE','A product with this reference already exists'); return;}
    const product = {...body,id:randomUUID(),active:true,version:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    product.stockState = stockState(product); products.unshift(product); response.setHeader('Location',`/products/${product.id}`); send(201,product); return;
  }
  if (/^\/products\/[^/]+$/.test(url.pathname) && request.method === 'GET') {
    const product = products.find((item) => item.id === url.pathname.split('/')[2]);
    if (!product) {problem(404,'NOT_FOUND','Product not found.'); return;}
    send(200,{...product,stockState:stockState(product)}); return;
  }
  if (url.pathname === '/customers' && request.method === 'GET') {
    const page = Number(url.searchParams.get('page') || 0); const size = Number(url.searchParams.get('size') || 20);
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) {problem(400,'VALIDATION_FAILED','Invalid pagination.'); return;}
    const q = (url.searchParams.get('q') || '').toLowerCase(); const items = customers.filter((person) => person.displayName.toLowerCase().includes(q));
    send(200,{items:items.slice(page*size,(page+1)*size),page,size,totalItems:items.length}); return;
  }
  if (url.pathname === '/sales' && request.method === 'POST') {
    if (user.role === 'ADMIN') {problem(403,'FORBIDDEN','Admins cannot record sales.'); return;}
    const key = request.headers['idempotency-key'];
    if (!isUuid(key)) {problem(400,'VALIDATION_FAILED','A UUID Idempotency-Key is required.'); return;}
    const serialized = JSON.stringify(body);
    if (submissions.has(key)) {
      const saved = submissions.get(key);
      if (saved.body !== serialized) {problem(422,'IDEMPOTENCY_KEY_REUSED','This key was already used with a different request.'); return;}
      send(201,saved.sale); return;
    }
    if (!['PAID','CREDIT'].includes(body.paymentType) || !Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 50 || body.lines.some((line) => !line || typeof line !== 'object' || !isUuid(line.productId) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10000 || Object.keys(line).some((key) => !['productId','quantity'].includes(key))) || Object.keys(body).some((key) => !['paymentType','lines','customerId','dueDate'].includes(key)) || (body.paymentType === 'CREDIT' && !body.customerId) || (body.dueDate && (body.paymentType !== 'CREDIT' || !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) || Number.isNaN(Date.parse(body.dueDate))))) {problem(400,'VALIDATION_FAILED','Check sale quantities, payment type and customer.'); return;}
    const customer = customers.find((person) => person.id === body.customerId);
    if (body.customerId && !customer) {problem(404,'NOT_FOUND','Customer not found.'); return;}
    const grouped = new Map();
    for (const line of body.lines) grouped.set(line.productId,(grouped.get(line.productId) || 0)+line.quantity);
    const lines = [];
    for (const [productId,quantity] of grouped) {
      const product = products.find((item) => item.id === productId);
      if (!product) {problem(404,'NOT_FOUND','Product not found.'); return;}
      if (!product.active || product.quantity < quantity) {problem(409,'INSUFFICIENT_STOCK',`Only ${product.active ? product.quantity : 0} of ${product.name} left. Nothing was recorded.`,[{field:`lines[${body.lines.findIndex((line) => line.productId === productId)}].quantity`,message:`availableQuantity: ${product.active ? product.quantity : 0}`}]); return;}
      const amount = BigInt(product.priceKobo)*BigInt(quantity);
      if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {problem(400,'VALIDATION_FAILED','Amount is too large.'); return;}
      lines.push({productId,productName:product.name,quantity,unitPriceKobo:product.priceKobo,lineTotalKobo:Number(amount)});
    }
    const total = lines.reduce((sum,line) => sum+BigInt(line.lineTotalKobo),0n);
    if (total > BigInt(Number.MAX_SAFE_INTEGER)) {problem(400,'VALIDATION_FAILED','Amount is too large.'); return;}
    const totalKobo = Number(total); const applied = customer ? Math.min(customer.storeCreditKobo,totalKobo) : 0;
    if (customer && body.paymentType === 'CREDIT' && BigInt(customer.balanceKobo)+total-BigInt(applied) > BigInt(Number.MAX_SAFE_INTEGER)) {problem(400,'VALIDATION_FAILED','Customer balance would exceed the supported amount.'); return;}
    for (const line of lines) {const product = products.find((item) => item.id === line.productId); product.quantity -= line.quantity; product.version++; product.updatedAt = new Date().toISOString();}
    if (customer) {customer.storeCreditKobo -= applied; if (body.paymentType === 'CREDIT') customer.balanceKobo += totalKobo-applied;}
    const sale = {id:randomUUID(),reference:`S-${String(sales.length+1).padStart(6,'0')}`,paymentType:body.paymentType,...(body.customerId ? {customerId:body.customerId} : {}),...(body.dueDate ? {dueDate:body.dueDate} : {}),totalKobo,lines,createdBy:user.id,createdAt:new Date().toISOString()};
    sales.unshift(sale); submissions.set(key,{body:serialized,sale}); response.setHeader('Location',`/sales/${sale.id}`); send(201,sale); return;
  }
  if (/^\/sales\/[^/]+$/.test(url.pathname) && request.method === 'GET') {
    const sale = sales.find((item) => item.id === url.pathname.split('/')[2]); if (!sale) {problem(404,'NOT_FOUND','Sale not found.'); return;} send(200,sale); return;
  }
  problem(404,'NOT_FOUND','This operation is not available in this simulation.');
});
server.listen(4710,'127.0.0.1',() => console.log(`Development simulation listening on http://127.0.0.1:4710 (${user.role}). In-memory demonstration data only; no credential or backend-rule proof.`));
