// k6: POST /sales spread across many products (a shop sells many different items).
// Same ramp and abort rule as sales.js, but each sale picks a random product, so sales do not queue on one stock row.
//   k6 run -e API_URL=https://<service>/api/v1 -e OWNER_PASSWORD=... load/k6/sales-spread.js
// Optional: -e PRODUCTS=20, -e PEAK_VUS=50, -e P95_MS=500
import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const API = (__ENV.API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const P95 = Number(__ENV.P95_MS || 500);
const PEAK = Number(__ENV.PEAK_VUS || 50);
const PRODUCTS = Number(__ENV.PRODUCTS || 20);

export const options = {
    scenarios: {
        ramp: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '30s', target: Math.max(2, Math.round(PEAK / 5)) },
                { duration: '1m', target: Math.round(PEAK / 2) },
                { duration: '1m', target: PEAK },
                { duration: '30s', target: 0 },
            ],
        },
    },
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    thresholds: {
        http_req_duration: [{ threshold: `p(95)<${P95}`, abortOnFail: true, delayAbortEval: '20s' }],
        'http_req_failed{expected_response:true}': ['rate<0.01'],
        checks: ['rate>0.99'],
    },
};

export function setup() {
    const login = http.post(`${API}/auth/sessions`, JSON.stringify({ email: __ENV.OWNER_EMAIL || 'owner@stockwise.test', password: __ENV.OWNER_PASSWORD }), { headers: { 'Content-Type': 'application/json' } });
    if (login.status !== 201) throw new Error(`login failed: HTTP ${login.status}`);
    const token = login.json('accessToken');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const stamp = Date.now();
    const ids = [];
    for (let i = 0; i < PRODUCTS; i++) {
        const made = http.post(`${API}/products`, JSON.stringify({ reference: `SPREAD-${stamp}-${i}`, name: `Spread load product ${i}`, category: 'Test', priceKobo: 50000, quantity: 1000000, lowStockThreshold: 0 }), { headers });
        if (made.status !== 201) throw new Error(`could not create load product ${i}: HTTP ${made.status}`);
        ids.push(made.json('id'));
    }
    return { token, ids };
}

export default function (data) {
    const productId = data.ids[Math.floor(Math.random() * data.ids.length)];
    const headers = { Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json', 'Idempotency-Key': uuidv4() };
    const res = http.post(`${API}/sales`, JSON.stringify({ paymentType: 'PAID', lines: [{ productId, quantity: 1 }] }), { headers, tags: { name: 'POST /sales' } });
    check(res, { 'sale recorded (201)': (r) => r.status === 201 });
    sleep(Math.random() * 0.5);
}