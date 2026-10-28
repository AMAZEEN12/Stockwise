// k6: POST /sales spread across products at a steady shop-sized load, after a warm-up.
//   k6 run -e API_URL=https://<service>/api/v1 -e OWNER_PASSWORD=... load/k6/sales-spread-steady.js
// Optional: -e VUS=3 (tills), -e THINK_S=2, -e PRODUCTS=20, -e P95_MS=500
import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const API = (__ENV.API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const VUS = Number(__ENV.VUS || 3);
const THINK = Number(__ENV.THINK_S || 2);
const PRODUCTS = Number(__ENV.PRODUCTS || 20);
const P95 = Number(__ENV.P95_MS || 500);

export const options = {
    scenarios: {
        warmup: { executor: 'constant-vus', vus: 2, duration: '20s', tags: { phase: 'warmup' } },
        steady: { executor: 'constant-vus', vus: VUS, duration: '120s', startTime: '25s', tags: { phase: 'steady' } },
    },
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    thresholds: {
        'http_req_duration{phase:steady}': [`p(95)<${P95}`],
        'http_req_failed{phase:steady}': ['rate<0.01'],
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
        const made = http.post(`${API}/products`, JSON.stringify({ reference: `STEADY-${stamp}-${i}`, name: `Steady spread product ${i}`, category: 'Test', priceKobo: 50000, quantity: 1000000, lowStockThreshold: 0 }), { headers });
        if (made.status !== 201) throw new Error(`could not create product ${i}: HTTP ${made.status}`);
        ids.push(made.json('id'));
    }
    return { token, ids };
}

export default function (data) {
    const productId = data.ids[Math.floor(Math.random() * data.ids.length)];
    const headers = { Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json', 'Idempotency-Key': uuidv4() };
    const res = http.post(`${API}/sales`, JSON.stringify({ paymentType: 'PAID', lines: [{ productId, quantity: 1 }] }), { headers, tags: { name: 'POST /sales' } });
    check(res, { 'sale recorded (201)': (r) => r.status === 201 });
    sleep(THINK * (0.5 + Math.random()));
}