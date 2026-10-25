#!/usr/bin/env node
// Last-unit test against a DEPLOYED service (spec R4, plan step 12).
// One product with 1 unit in stock, N devices sell it at the same instant.
// Pass = exactly one 201, N-1 409 INSUFFICIENT_STOCK, final quantity 0.
//
//   API_URL=https://stockwise-api.onrender.com/api/v1 \
//   OWNER_EMAIL=owner@stockwise.test OWNER_PASSWORD='Stockwise-Demo-2026' node load/concurrency/last-unit.mjs
// Optional: DEVICES (default 10), ROUNDS (default 3). Needs Node 20+. Exit code 1 on any failure.
import { randomUUID } from 'node:crypto';

const API = (process.env.API_URL ?? '').replace(/\/$/, '');
const EMAIL = process.env.OWNER_EMAIL ?? 'owner@stockwise.test';
const PASSWORD = process.env.OWNER_PASSWORD;
const DEVICES = Number(process.env.DEVICES ?? 10);
const ROUNDS = Number(process.env.ROUNDS ?? 3);
if (!API || !PASSWORD) { console.error('Set API_URL (ending /api/v1) and OWNER_PASSWORD.'); process.exit(2); }

const json = (token, extra = {}) => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra });
async function call(method, path, { token, body, headers } = {}) {
  const res = await fetch(API + path, { method, headers: json(token, headers), body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(90_000) });
  let data = null; try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

async function round(token, n) {
  const ref = `LASTUNIT-${Date.now()}-${n}`;
  const made = await call('POST', '/products', { token, body: { reference: ref, name: `Last unit test ${n}`, category: 'Test', priceKobo: 100000, quantity: 1, lowStockThreshold: 0 } });
  if (made.status !== 201) throw new Error(`could not create the test product (HTTP ${made.status}): ${JSON.stringify(made.data)}`);
  const raceId = made.data.id;
  const gate = Promise.withResolvers();
  const racers = Array.from({ length: DEVICES }, () => gate.promise.then(() =>
    call('POST', '/sales', { token, headers: { 'Idempotency-Key': randomUUID() }, body: { paymentType: 'PAID', lines: [{ productId: raceId, quantity: 1 }] } })));
  gate.resolve();
  const results = await Promise.all(racers);
  const count = (s) => results.filter((r) => r.status === s).length;
  const other = results.filter((r) => r.status !== 201 && r.status !== 409);
  const after = await call('GET', `/products/${raceId}`, { token });
  const ok201 = count(201), ok409 = count(409);
  const qty = after.data?.quantity;
  const pass = ok201 === 1 && ok409 === DEVICES - 1 && other.length === 0 && qty === 0;
  console.log(`round ${n}: 201 x${ok201}, 409 x${ok409}, other x${other.length}, final quantity ${qty} -> ${pass ? 'PASS' : 'FAIL'}`);
  if (other.length) console.log('  unexpected:', other.map((r) => r.status).join(','));
  return pass;
}

const login = await call('POST', '/auth/sessions', { body: { email: EMAIL, password: PASSWORD } });
if (login.status !== 201) { console.error(`login failed (HTTP ${login.status})`); process.exit(2); }
const token = login.data.accessToken;
console.log(`last-unit test: ${DEVICES} devices, ${ROUNDS} rounds, ${API}`);
let allPass = true;
for (let i = 1; i <= ROUNDS; i++) { try { allPass = (await round(token, i)) && allPass; } catch (e) { console.error(`round ${i} error: ${e.message}`); allPass = false; } }
console.log(allPass ? 'LAST-UNIT TEST PASSED: stock never went below zero' : 'LAST-UNIT TEST FAILED');
process.exit(allPass ? 0 : 1);
