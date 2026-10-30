// Local-only stateful demonstration. Not a service implementation or concurrency proof.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mockUser, makeProducts, stockState } from './mock-data.mjs';
import {loadEnv} from 'vite';

const products = makeProducts();
const forcedRole=process.argv.find((arg)=>arg.startsWith('--role='))?.slice(7);
if(forcedRole && !['OWNER','ASSISTANT','ADMIN'].includes(forcedRole))throw new Error('Unknown mock role');
const demoEnv=loadEnv('development',process.cwd(),'VITE_DEMO_');
const accounts=['OWNER','ASSISTANT','ADMIN'].map((role,index)=>({...mockUser,
  id:index===0 ? mockUser.id : `a2222222-2222-4222-8222-${String(222222222222+index)}`,
  role,displayName:`Demo ${role[0]+role.slice(1).toLowerCase()}`,
  email:demoEnv[`VITE_DEMO_${role}_EMAIL`] || `${role.toLowerCase()}@stockwise.test`,
}));
const sessions=new Map();
const customers = [
  {id:'22222222-2222-4222-8222-222222222221',displayName:'Mama Chidi',balanceKobo:450000,storeCreditKobo:0,hasDebtActivity:true,hasStoreCreditActivity:false,createdAt:'2026-10-24T08:41:00Z'},
  {id:'22222222-2222-4222-8222-222222222222',displayName:'Bolu Adeyemi',balanceKobo:0,storeCreditKobo:600000,hasDebtActivity:false,hasStoreCreditActivity:true,createdAt:'2026-10-24T08:41:00Z'},
  {id:'22222222-2222-4222-8222-222222222223',displayName:'Ngozi Okoro',balanceKobo:85000,storeCreditKobo:0,hasDebtActivity:true,hasStoreCreditActivity:false,createdAt:'2026-10-24T08:41:00Z'},
  {id:'22222222-2222-4222-8222-222222222224',displayName:'Tunde Bakare',balanceKobo:0,storeCreditKobo:0,hasDebtActivity:false,hasStoreCreditActivity:false,createdAt:'2026-10-24T08:41:00Z'},
];
const sales = [
  {
    id: '33333333-3333-4333-8333-000000000003',
    reference: 'S-000003',
    paymentType: 'PAID',
    totalKobo: 196000,
    lines: [
      {
        productId: '11111111-1111-4111-8111-000000000004',
        productName: 'Golden Penny Spaghetti 500g',
        quantity: 2,
        unitPriceKobo: 98000,
        lineTotalKobo: 196000,
      },
    ],
    createdBy: 'a2222222-2222-4222-8222-222222222223',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    id: '33333333-3333-4333-8333-000000000002',
    reference: 'S-000002',
    paymentType: 'CREDIT',
    customerId: '22222222-2222-4222-8222-222222222221',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    totalKobo: 395000,
    lines: [
      {
        productId: '11111111-1111-4111-8111-000000000005',
        productName: 'Cadbury Bournvita Chocolate Malt Drink Refill Pouch 900g',
        quantity: 1,
        unitPriceKobo: 395000,
        lineTotalKobo: 395000,
      },
    ],
    createdBy: 'a2222222-2222-4222-8222-222222222223',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: '33333333-3333-4333-8333-000000000001',
    reference: 'S-000001',
    paymentType: 'PAID',
    totalKobo: 225000,
    lines: [
      {
        productId: '11111111-1111-4111-8111-000000000001',
        productName: 'Indomie Chicken 70g',
        quantity: 1,
        unitPriceKobo: 45000,
        lineTotalKobo: 45000,
      },
      {
        productId: '11111111-1111-4111-8111-000000000003',
        productName: 'Dettol 250ml',
        quantity: 1,
        unitPriceKobo: 180000,
        lineTotalKobo: 180000,
      },
    ],
    createdBy: 'a2222222-2222-4222-8222-222222222222',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
];
const submissions = new Map();
// Demonstration-only allocations: the seeded credit sale has received ₦550 and the
// remaining ₦1,100 of this customer's debt is an unrelated opening balance.
const saleSettlements = new Map([
  ['33333333-3333-4333-8333-000000000002', { debt: 340000, repaid: 55000, creditUsed: 0 }],
]);
const reversalSubmissions = new Map();
const restocks = [];
const restockSubmissions = new Map();
const stockMovements = [
  { id: '44444444-4444-4444-8444-000000000001', productId: '11111111-1111-4111-8111-000000000001', delta: 49, sourceType: 'OPENING', createdAt: '2026-10-24T08:41:00Z' },
  { id: '44444444-4444-4444-8444-000000000002', productId: '11111111-1111-4111-8111-000000000001', delta: -1, sourceType: 'SALE', sourceId: '33333333-3333-4333-8333-000000000001', createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },

  { id: '44444444-4444-4444-8444-000000000003', productId: '11111111-1111-4111-8111-000000000002', delta: 10, sourceType: 'OPENING', createdAt: '2026-10-24T08:41:00Z' },
  { id: '44444444-4444-4444-8444-000000000004', productId: '11111111-1111-4111-8111-000000000002', delta: -10, sourceType: 'SALE', createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },

  { id: '44444444-4444-4444-8444-000000000005', productId: '11111111-1111-4111-8111-000000000003', delta: 6, sourceType: 'OPENING', createdAt: '2026-10-24T08:41:00Z' },
  { id: '44444444-4444-4444-8444-000000000006', productId: '11111111-1111-4111-8111-000000000003', delta: -1, sourceType: 'SALE', sourceId: '33333333-3333-4333-8333-000000000001', createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },

  { id: '44444444-4444-4444-8444-000000000007', productId: '11111111-1111-4111-8111-000000000004', delta: 5, sourceType: 'OPENING', createdAt: '2026-10-24T08:41:00Z' },
  { id: '44444444-4444-4444-8444-000000000008', productId: '11111111-1111-4111-8111-000000000004', delta: -2, sourceType: 'SALE', sourceId: '33333333-3333-4333-8333-000000000003', createdAt: new Date(Date.now() - 3600 * 1000).toISOString() },

  { id: '44444444-4444-4444-8444-000000000009', productId: '11111111-1111-4111-8111-000000000005', delta: 13, sourceType: 'OPENING', createdAt: '2026-10-24T08:41:00Z' },
  { id: '44444444-4444-4444-8444-000000000010', productId: '11111111-1111-4111-8111-000000000005', delta: -1, sourceType: 'SALE', sourceId: '33333333-3333-4333-8333-000000000002', createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },

  { id: '44444444-4444-4444-8444-000000000011', productId: '11111111-1111-4111-8111-000000000006', delta: 30, sourceType: 'OPENING', createdAt: '2026-10-24T08:41:00Z' },

  { id: '44444444-4444-4444-8444-000000000012', productId: '11111111-1111-4111-8111-000000000007', delta: 5, sourceType: 'OPENING', createdAt: '2026-10-20T08:00:00Z' },
  { id: '44444444-4444-4444-8444-000000000013', productId: '11111111-1111-4111-8111-000000000007', delta: -5, sourceType: 'SALE', createdAt: '2026-10-21T08:00:00Z' },

  { id: '44444444-4444-4444-8444-000000000014', productId: '11111111-1111-4111-8111-000000000008', delta: 18, sourceType: 'OPENING', createdAt: '2026-10-24T08:41:00Z' },
];
const reversalAuthorizations = new Map([
  [
    '839201',
    {
      code: '839201',
      saleId: '33333333-3333-4333-8333-000000000002',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      generatedBy: 'Demo Owner',
      generatedByRole: 'OWNER',
      redeemedAt: null,
      createdAt: new Date().toISOString(),
    },
  ],
]);
const isUuid = (text) => typeof text === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text);
const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
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
    const user=forcedRole ? accounts.find((account)=>account.role===forcedRole) : accounts.find((account)=>account.email.toLowerCase()===body.email.trim().toLowerCase()) || accounts[0];
    const token=`stockwise-simulation-${randomUUID()}`;const expiresAt=new Date(Date.now()+8*60*60*1000).toISOString();
    sessions.set(token,{user,expiresAt});
    send(201,{accessToken:token,tokenType:'Bearer',expiresAt,user}); return;
  }
  if (url.pathname === '/health') {send(200,{status:'UP',service:'stockwise',version:'development-simulation'}); return;}

  const portalCustomerMatch = url.pathname.match(/^\/portal\/customer\/([^/]+)$/);
  if (portalCustomerMatch && request.method === 'GET') {
    const rawToken = decodeURIComponent(portalCustomerMatch[1]);
    if (rawToken === 'expired-token') {
      problem(410, 'TOKEN_EXPIRED', 'This customer portal link has expired. Request a new link from the shop.');
      return;
    }
    if (rawToken === 'invalid-token') {
      problem(404, 'NOT_FOUND', 'Customer portal link is invalid.');
      return;
    }
    const customer = rawToken === 'chidi-demo-token' ? customers[0] : customers[1];
    send(200, {
      shop: {
        name: 'Ngozi Provisions Store',
        address: 'Shop 4, TeSA Commercial Hub, Lagos',
        currency: 'NGN',
        whatsappPhone: '+2348021234567',
      },
      customer: {
        id: customer.id,
        displayName: customer.displayName,
        balanceKobo: customer.balanceKobo,
        storeCreditKobo: customer.storeCreditKobo,
        hasDebtActivity: customer.hasDebtActivity,
        hasStoreCreditActivity: customer.hasStoreCreditActivity,
      },
      tokenExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    return;
  }

  const portalProductsMatch = url.pathname.match(/^\/portal\/customer\/([^/]+)\/products$/);
  if (portalProductsMatch && request.method === 'GET') {
    const rawToken = decodeURIComponent(portalProductsMatch[1]);
    if (rawToken === 'expired-token') {
      problem(410, 'TOKEN_EXPIRED', 'This customer portal link has expired.');
      return;
    }
    if (rawToken === 'invalid-token') {
      problem(404, 'NOT_FOUND', 'Customer portal link is invalid.');
      return;
    }
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const activeProducts = products
      .filter((p) => p.active && p.quantity > 0 && (!q || p.name.toLowerCase().includes(q)))
      .map((p) => ({
        id: p.id,
        name: p.name,
        priceKobo: p.priceKobo,
        quantity: p.quantity,
        active: p.active,
      }));
    send(200, {
      items: activeProducts,
      totalItems: activeProducts.length,
    });
    return;
  }

  const portalOrdersMatch = url.pathname.match(/^\/portal\/customer\/([^/]+)\/orders$/);
  if (portalOrdersMatch && request.method === 'POST') {
    const rawToken = decodeURIComponent(portalOrdersMatch[1]);
    if (rawToken === 'expired-token') {
      problem(410, 'TOKEN_EXPIRED', 'This customer portal link has expired.');
      return;
    }
    if (rawToken === 'invalid-token') {
      problem(404, 'NOT_FOUND', 'Customer portal link is invalid.');
      return;
    }
    const customer = rawToken === 'chidi-demo-token' ? customers[0] : customers[1];
    if (!body || !Array.isArray(body.lines) || body.lines.length === 0) {
      problem(400, 'VALIDATION_FAILED', 'Order must contain at least one product.');
      return;
    }
    let totalKobo = 0;
    let itemsCount = 0;
    for (const line of body.lines) {
      const product = products.find((p) => p.id === line.productId);
      if (!product) {
        problem(404, 'NOT_FOUND', 'One or more products were not found.');
        return;
      }
      if (product.quantity < line.quantity) {
        problem(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${product.name}. Available: ${product.quantity}.`);
        return;
      }
      totalKobo += product.priceKobo * line.quantity;
      itemsCount += line.quantity;
    }
    let storeCreditAppliedKobo = 0;
    if (body.paymentPreference === 'USE_STORE_CREDIT') {
      storeCreditAppliedKobo = Math.min(customer.storeCreditKobo, totalKobo);
      customer.storeCreditKobo -= storeCreditAppliedKobo;
      customer.hasStoreCreditActivity = true;
    } else if (body.paymentPreference === 'ON_ACCOUNT') {
      customer.balanceKobo += totalKobo;
      customer.hasDebtActivity = true;
    }
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const formattedAmount = `₦${(totalKobo / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const whatsappMsg = `Hello Ngozi Provisions Store, I placed pre-order ${orderNumber} for ${itemsCount} items (${formattedAmount}). ${body.pickupNote ? `Pickup note: ${body.pickupNote}` : ''}`;
    const whatsappUrl = `https://wa.me/2348021234567?text=${encodeURIComponent(whatsappMsg)}`;

    send(201, {
      orderNumber,
      customerName: customer.displayName,
      itemsCount,
      totalKobo,
      storeCreditAppliedKobo,
      paymentPreference: body.paymentPreference || 'PAY_ON_PICKUP',
      pickupNote: body.pickupNote || '',
      createdAt: new Date().toISOString(),
      whatsappUrl,
    });
    return;
  }
  const session=sessions.get(request.headers.authorization?.replace(/^Bearer /,''));
  if(!session || Date.parse(session.expiresAt)<=Date.now()){problem(401,'UNAUTHENTICATED','Sign in again.');return;}
  const user=session.user;
  if (url.pathname === '/me' && request.method === 'GET') {send(200,user); return;}
  if (url.pathname === '/product-categories' && request.method === 'GET') {
    const cats = [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    send(200, cats); return;
  }
  if (url.pathname === '/products' && request.method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const activeParam = url.searchParams.get('active');
    const items = products.filter((product) => `${product.name} ${product.reference}`.toLowerCase().includes(q) && (!url.searchParams.get('category') || product.category === url.searchParams.get('category')) && (!url.searchParams.get('stockState') || stockState(product) === url.searchParams.get('stockState')) && (activeParam === null || product.active === (activeParam === 'true')))
      .sort((a,b)=>{const first=a.name.toLowerCase();const second=b.name.toLowerCase();return first<second ? -1 : first>second ? 1 : a.id<b.id ? -1 : a.id>b.id ? 1 : 0;});
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
    product.stockState = stockState(product); products.unshift(product);
    if (product.quantity > 0) stockMovements.push({ id: randomUUID(), productId: product.id, delta: product.quantity, sourceType: 'OPENING', createdAt: product.createdAt });
    response.setHeader('Location',`/products/${product.id}`); send(201,product); return;
  }
  const movementsMatch = url.pathname.match(/^\/products\/([^/]+)\/movements$/);
  if (movementsMatch && request.method === 'GET') {
    const productId = decodeURIComponent(movementsMatch[1]);
    const product = products.find((item) => item.id === productId);
    if (!product) { problem(404, 'NOT_FOUND', 'Product not found.'); return; }
    const page = Number(url.searchParams.get('page') || 0);
    const size = Number(url.searchParams.get('size') || 20);
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) {
      problem(400, 'VALIDATION_FAILED', 'Invalid pagination.');
      return;
    }
    const productMovements = stockMovements
      .filter((m) => m.productId === productId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

    let running = 0;
    const withRunning = productMovements.map((m) => {
      running += m.delta;
      return {
        id: m.id,
        delta: m.delta,
        sourceType: m.sourceType,
        ...(m.sourceId ? { sourceId: m.sourceId } : {}),
        quantityAfter: running,
        createdAt: m.createdAt,
      };
    });

    const newestFirst = [...withRunning].reverse();
    const items = newestFirst.slice(page * size, (page + 1) * size);
    send(200, {
      productId: product.id,
      currentQuantity: product.quantity,
      items,
      page,
      size,
      totalItems: newestFirst.length,
    });
    return;
  }
  if (/^\/products\/[^/]+$/.test(url.pathname) && request.method === 'GET') {
    const product = products.find((item) => item.id === url.pathname.split('/')[2]);
    if (!product) {problem(404,'NOT_FOUND','Product not found.'); return;}
    send(200,{...product,stockState:stockState(product)}); return;
  }
  if (url.pathname === '/restocks' && request.method === 'GET') {
    const page = Number(url.searchParams.get('page') || 0); const size = Number(url.searchParams.get('size') || 20);
    const productId = url.searchParams.get('productId');
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100 || (productId && !isUuid(productId))) {problem(400,'VALIDATION_FAILED','Invalid restock filters.'); return;}
    const items = restocks.filter((restock) => !productId || restock.productId === productId)
      .sort((a,b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    send(200,{items:items.slice(page*size,(page+1)*size),page,size,totalItems:items.length}); return;
  }
  if (url.pathname === '/restocks' && request.method === 'POST') {
    if (user.role !== 'OWNER') {problem(403,'FORBIDDEN','Only the owner can record restocks.'); return;}
    const key = request.headers['idempotency-key'];
    if (!isUuid(key)) {problem(400,'VALIDATION_FAILED','A UUID Idempotency-Key is required.'); return;}
    const errors = [];
    if (!isUuid(body.productId)) errors.push({field:'productId',message:'Choose a valid product.'});
    if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 2147483647) errors.push({field:'quantity',message:'Enter a supported positive whole number.'});
    if (!isDate(body.receivedOn)) errors.push({field:'receivedOn',message:'Choose a valid date.'});
    if (body.note !== undefined && (typeof body.note !== 'string' || [...body.note].length > 500)) errors.push({field:'note',message:'Use at most 500 characters.'});
    if (Object.keys(body).some((property) => !['productId','quantity','receivedOn','note'].includes(property))) errors.push({field:'body',message:'Unexpected property.'});
    if (errors.length) {problem(400,'VALIDATION_FAILED','Check restock fields.',errors); return;}
    const canonical = JSON.stringify({productId:body.productId,quantity:body.quantity,receivedOn:body.receivedOn,note:typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null});
    const submissionKey = key;
    if (restockSubmissions.has(submissionKey)) {
      const saved = restockSubmissions.get(submissionKey);
      if (saved.userId !== user.id || saved.body !== canonical) {problem(422,'IDEMPOTENCY_KEY_REUSED','This key was already used with a different request.'); return;}
      send(201,saved.restock); return;
    }
    const product = products.find((item) => item.id === body.productId);
    if (!product) {problem(404,'NOT_FOUND','Product not found.'); return;}
    if (body.quantity > 2147483647 - product.quantity) {problem(409,'STOCK_LIMIT_EXCEEDED','The resulting stock quantity is too large.',[{field:'quantity',message:'Choose a smaller quantity.'}]); return;}
    const createdAt = new Date().toISOString();
    const restock = {id:randomUUID(),productId:product.id,quantity:body.quantity,receivedOn:body.receivedOn,...(body.note?.trim() ? {note:body.note.trim()} : {}),createdBy:user.id,createdAt};
    product.quantity += body.quantity; product.version++; product.updatedAt = createdAt; product.stockState = stockState(product);
    restocks.unshift(restock); stockMovements.push({ id: randomUUID(), productId: product.id, delta: body.quantity, sourceType: 'RESTOCK', sourceId: restock.id, createdAt }); restockSubmissions.set(submissionKey,{userId:user.id,body:canonical,restock}); response.setHeader('Location',`/restocks/${restock.id}`); send(201,restock); return;
  }
  if (/^\/restocks\/[^/]+$/.test(url.pathname) && request.method === 'GET') {
    const restock = restocks.find((item) => item.id === url.pathname.split('/')[2]);
    if (!restock) {problem(404,'NOT_FOUND','Restock not found.'); return;}
    send(200,restock); return;
  }
  if (url.pathname === '/customers' && request.method === 'GET') {
    const page = Number(url.searchParams.get('page') || 0); const size = Number(url.searchParams.get('size') || 20);
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) {problem(400,'VALIDATION_FAILED','Invalid pagination.'); return;}
    const q = (url.searchParams.get('q') || '').toLowerCase(); const items = customers.filter((person) => person.displayName.toLowerCase().includes(q));
    send(200,{items:items.slice(page*size,(page+1)*size),page,size,totalItems:items.length,asOf:new Date().toISOString()}); return;
  }
  if (url.pathname === '/customers' && request.method === 'POST') {
    if (!['OWNER','ASSISTANT'].includes(user.role)) {problem(403,'FORBIDDEN','Admins cannot add customers.'); return;}
    const errors = [];
    if (typeof body.displayName !== 'string' || !body.displayName.trim() || [...body.displayName.trim()].length > 120) errors.push({field:'displayName',message:'Enter a display name, up to 120 characters.'});
    if (body.contactPlaceholder !== undefined && (typeof body.contactPlaceholder !== 'string' || [...body.contactPlaceholder].length > 60)) errors.push({field:'contactPlaceholder',message:'Use at most 60 characters.'});
    if (Object.keys(body).some((key) => !['displayName','contactPlaceholder'].includes(key))) errors.push({field:'body',message:'Unexpected property.'});
    if (errors.length) {problem(400,'VALIDATION_FAILED','Check customer fields.',errors); return;}
    const customer = {...body,displayName:body.displayName.trim(),id:randomUUID(),balanceKobo:0,storeCreditKobo:0,hasDebtActivity:false,hasStoreCreditActivity:false,createdAt:new Date().toISOString()};
    customers.push(customer);send(201,customer);return;
  }
  if (url.pathname.startsWith('/customers/') && url.pathname.endsWith('/store-credit') && request.method === 'POST') {
    if (!['OWNER','ADMIN'].includes(user.role)) {problem(403,'FORBIDDEN','Only Owner and Admin can issue store credit.'); return;}
    const customerId = url.pathname.split('/')[2];
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {problem(404,'NOT_FOUND','Customer not found.'); return;}
    const amountKobo = Number(body.amountKobo);
    if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) {
      problem(400,'VALIDATION_FAILED','Check fields.',[{field:'amountKobo',message:'Amount must be a positive integer.'}]);
      return;
    }
    customer.storeCreditKobo += amountKobo;
    customer.hasStoreCreditActivity = true;
    send(201, customer);
    return;
  }
  if (url.pathname === '/sales' && request.method === 'GET') {
    const page=Number(url.searchParams.get('page') || 0);const size=Number(url.searchParams.get('size') || 20);
    const from=url.searchParams.get('from');const to=url.searchParams.get('to');const paymentType=url.searchParams.get('paymentType');const customerId=url.searchParams.get('customerId');
    const validDate=(value)=>!value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value);
    if(!Number.isInteger(page) || page<0 || !Number.isInteger(size) || size<1 || size>100 || !validDate(from) || !validDate(to) || (from && to && from>to) || (paymentType && !['PAID','CREDIT'].includes(paymentType)) || (customerId && !isUuid(customerId))) {problem(400,'VALIDATION_FAILED','Check sale filters and pagination.');return;}
    const start=from ? Date.parse(`${from}T00:00:00+01:00`) : -Infinity;
    const end=to ? Date.parse(`${to}T00:00:00+01:00`)+86400000 : Infinity;
    const items=sales.filter((sale)=>Date.parse(sale.createdAt)>=start && Date.parse(sale.createdAt)<end && (!paymentType || sale.paymentType===paymentType) && (!customerId || sale.customerId===customerId)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    send(200,{items:items.slice(page*size,(page+1)*size),page,size,totalItems:items.length});return;
  }
  if (url.pathname === '/sales' && request.method === 'POST') {
    if (user.role === 'ADMIN') {problem(403,'FORBIDDEN','Admins cannot record sales.'); return;}
    const key = request.headers['idempotency-key'];
    if (!isUuid(key)) {problem(400,'VALIDATION_FAILED','A UUID Idempotency-Key is required.'); return;}
    const serialized = JSON.stringify(body);
    const submissionKey=`${user.id}:${key}`;
    if (submissions.has(submissionKey)) {
      const saved = submissions.get(submissionKey);
      if (saved.body !== serialized) {problem(422,'IDEMPOTENCY_KEY_REUSED','This key was already used with a different request.'); return;}
      send(201,saved.sale); return;
    }
    if (!['PAID','CREDIT'].includes(body.paymentType) || !Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 50 || body.lines.some((line) => !line || typeof line !== 'object' || !isUuid(line.productId) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10000 || Object.keys(line).some((key) => !['productId','quantity'].includes(key))) || Object.keys(body).some((key) => !['paymentType','lines','customerId','dueDate','useStoreCredit'].includes(key)) || (body.paymentType === 'CREDIT' && !body.customerId) || (body.dueDate && (body.paymentType !== 'CREDIT' || !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) || Number.isNaN(Date.parse(body.dueDate))))) {problem(400,'VALIDATION_FAILED','Check sale quantities, payment type and customer.'); return;}
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
    const totalKobo = Number(total); const applied = customer && (body.useStoreCredit || body.useStoreCredit === undefined) ? Math.min(customer.storeCreditKobo,totalKobo) : 0;
    if (customer && body.paymentType === 'CREDIT' && BigInt(customer.balanceKobo)+total-BigInt(applied) > BigInt(Number.MAX_SAFE_INTEGER)) {problem(400,'VALIDATION_FAILED','Customer balance would exceed the supported amount.'); return;}
    for (const line of lines) {const product = products.find((item) => item.id === line.productId); product.quantity -= line.quantity; product.version++; product.updatedAt = new Date().toISOString();}
    if (customer) {customer.storeCreditKobo -= applied; if (body.paymentType === 'CREDIT') {customer.balanceKobo += totalKobo-applied; if (totalKobo-applied > 0) customer.hasDebtActivity=true;}}
    const sale = {id:randomUUID(),reference:`S-${String(sales.length+1).padStart(6,'0')}`,paymentType:body.paymentType,...(body.customerId ? {customerId:body.customerId} : {}),...(body.dueDate ? {dueDate:body.dueDate} : {}),totalKobo,lines,createdBy:user.id,createdAt:new Date().toISOString()};
    saleSettlements.set(sale.id,{debt:body.paymentType === 'CREDIT' ? totalKobo-applied : 0,repaid:0,creditUsed:applied});
    sales.unshift(sale); for (const line of lines) stockMovements.push({ id: randomUUID(), productId: line.productId, delta: -line.quantity, sourceType: 'SALE', sourceId: sale.id, createdAt: sale.createdAt }); submissions.set(submissionKey,{body:serialized,sale}); response.setHeader('Location',`/sales/${sale.id}`); send(201,sale); return;
  }
  if (/^\/sales\/[^/]+$/.test(url.pathname) && request.method === 'GET') {
    const sale = sales.find((item) => item.id === url.pathname.split('/')[2]); if (!sale) {problem(404,'NOT_FOUND','Sale not found.'); return;} send(200,sale); return;
  }
  if (url.pathname === '/reversals/authorizations' && request.method === 'POST') {
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      problem(403, 'FORBIDDEN', 'Only Owners and Admins can generate reversal codes.');
      return;
    }
    if (!body || !isUuid(body.saleId)) {
      problem(400, 'VALIDATION_FAILED', 'A valid saleId is required.');
      return;
    }
    const sale = sales.find((item) => item.id === body.saleId);
    if (!sale) {
      problem(404, 'NOT_FOUND', 'Sale not found.');
      return;
    }
    if (sale.reversed) {
      problem(409, 'SALE_ALREADY_REVERSED', 'This sale has already been reversed.');
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const validMinutes = typeof body.validMinutes === 'number' && body.validMinutes > 0 && body.validMinutes <= 60 ? body.validMinutes : 15;
    const expiresAt = new Date(Date.now() + validMinutes * 60 * 1000).toISOString();
    const auth = {
      code,
      saleId: body.saleId,
      expiresAt,
      generatedBy: user.displayName,
      generatedByRole: user.role,
      redeemedAt: null,
      createdAt: new Date().toISOString(),
    };
    reversalAuthorizations.set(code, auth);
    send(201, auth);
    return;
  }
  if (/^\/sales\/[^/]+\/reversal$/.test(url.pathname) && request.method === 'POST') {
    const saleId = url.pathname.split('/')[2];
    const key = request.headers['idempotency-key'];
    if (!isUuid(key)) {
      problem(400, 'VALIDATION_FAILED', 'A UUID Idempotency-Key is required.');
      return;
    }
    const serialized = JSON.stringify({saleId,reason:body.reason,note:body.note || null,authorizationCode:body.authorizationCode || null});
    const prior = reversalSubmissions.get(key);
    if (prior) {
      if (prior.userId !== user.id || prior.body !== serialized) {problem(422,'IDEMPOTENCY_KEY_REUSED','This key was already used for a different request.'); return;}
      send(200,prior.result); return;
    }
    const sale = sales.find((item) => item.id === saleId);
    if (!sale) {
      problem(404, 'NOT_FOUND', 'Sale not found.');
      return;
    }
    if (sale.reversed) {
      problem(409, 'SALE_ALREADY_REVERSED', 'This sale has already been reversed.');
      return;
    }
    const settlement = saleSettlements.get(sale.id);
    const customer = sale.customerId ? customers.find((item) => item.id === sale.customerId) : null;
    if (sale.paymentType === 'CREDIT' && (!settlement || !customer || customer.balanceKobo < settlement.debt)) {
      problem(409,'SIMULATION_DATA_UNAVAILABLE','This demonstration sale has no reconciled settlement details.'); return;
    }
    if (settlement?.creditUsed && !customer) {problem(409,'SIMULATION_DATA_UNAVAILABLE','Customer settlement details are unavailable.'); return;}
    const creditReturned = (settlement?.repaid || 0) + (settlement?.creditUsed || 0);
    if (customer && !Number.isSafeInteger(customer.storeCreditKobo + creditReturned)) {problem(409,'SIMULATION_DATA_UNAVAILABLE','Store credit exceeds the supported amount.'); return;}
    if (sale.lines.some((line) => {const product = products.find((item) => item.id === line.productId); return !product || product.quantity > 2147483647 - line.quantity;})) {problem(409,'SIMULATION_DATA_UNAVAILABLE','Stock cannot be restored for this demonstration sale.'); return;}
    if (user.role === 'ASSISTANT') {
      if (!body?.authorizationCode || typeof body.authorizationCode !== 'string') {
        problem(403, 'SUPERVISOR_CODE_REQUIRED', 'Supervisor authorization code is required for assistants to reverse sales.');
        return;
      }
      const auth = reversalAuthorizations.get(body.authorizationCode.trim());
      if (!auth || Date.parse(auth.expiresAt) <= Date.now()) {
        problem(422, 'INVALID_AUTHORIZATION_CODE', 'The authorization code is invalid or has expired.');
        return;
      }
      if (auth.saleId !== sale.id) {
        problem(422, 'AUTHORIZATION_SALE_MISMATCH', 'This authorization code was not issued for this sale.');
        return;
      }
      if (auth.redeemedAt) {
        problem(409, 'AUTHORIZATION_ALREADY_USED', 'This authorization code has already been redeemed.');
        return;
      }
      auth.redeemedAt = new Date().toISOString();
      auth.redeemedBy = user.displayName;
    }
    sale.reversed = true;
    sale.reversedAt = new Date().toISOString();
    sale.reversedBy = user.displayName;
    sale.reversalReason = body?.reason || 'CUSTOMER_RETURN';
    sale.reversalNote = body?.note;
    if (customer && settlement) {
      customer.balanceKobo -= settlement.debt;
      customer.storeCreditKobo += creditReturned;
      if (settlement.debt) customer.hasDebtActivity = true;
      if (creditReturned) customer.hasStoreCreditActivity = true;
    }
    for (const line of sale.lines) {
      const product = products.find((item) => item.id === line.productId);
      if (product) {
        product.quantity += line.quantity;
        product.version++;
        product.updatedAt = new Date().toISOString();
        stockMovements.push({ id: randomUUID(), productId: line.productId, delta: line.quantity, sourceType: 'SALE_REVERSAL', sourceId: sale.id, createdAt: sale.reversedAt });
      }
    }
    const result = {
      reversalId: randomUUID(),
      saleId: sale.id,
      reversedAt: sale.reversedAt,
      reversedBy: user.displayName,
      reason: sale.reversalReason,
      note: sale.reversalNote,
      stockRestored: true,
      debtRemovedKobo: settlement?.debt || 0,
      storeCreditAddedKobo: creditReturned,
    };
    reversalSubmissions.set(key,{userId:user.id,body:serialized,result});
    send(200, result);
    return;
  }
  problem(404,'NOT_FOUND','This operation is not available in this simulation.');
});
const port=Number(process.env.DEVELOPMENT_API_PORT || 4710);
if(!Number.isInteger(port) || port<1024 || port>65535)throw new Error('Invalid DEVELOPMENT_API_PORT');
server.listen(port,'127.0.0.1',() => console.log(`Development simulation listening on http://127.0.0.1:${port} (${forcedRole || 'per-account demo roles'}). In-memory demonstration data only; no credential or backend-rule proof.`));
