// Local-only stateful demonstration. Not a service implementation or concurrency proof.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mockUser, makeProducts, stockState } from './mock-data.mjs';

const products = makeProducts();
const user = {...mockUser, role: process.argv.find((arg) => arg.startsWith('--role='))?.slice(7) || 'OWNER'};
if (!['OWNER','ASSISTANT','ADMIN'].includes(user.role)) throw new Error('Unknown mock role');
const token = 'stockwise-contract-mock-token';
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
  problem(404,'NOT_FOUND','This operation is not available in this simulation.');
});
server.listen(4710,'127.0.0.1',() => console.log(`Development simulation listening on http://127.0.0.1:4710 (${user.role}). In-memory demonstration data only; no credential or backend-rule proof.`));
