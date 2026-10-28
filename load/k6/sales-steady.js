// k6: POST /sales at a steady shop-sized load, after a warm-up (DM12: warm service).
//   k6 run -e API_URL=https://<service>/api/v1 -e OWNER_PASSWORD=... load/k6/sales-steady.js
// Optional: -e VUS=5 (tills), -e THINK_S=3 (seconds between sales per till), -e P95_MS=500
import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const API = (__ENV.API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const VUS = Number(__ENV.VUS || 5);
const THINK = Number(__ENV.THINK_S || 3);
const P95 = Number(__ENV.P95_MS || 500);

export const options = {
    scenarios: {
        warmup: { executor: 'constant-vus', vus: 2, duration: '20s', tags: { phase: 'warmup' } },
        steady: { executor: 'constant-vus', vus: VUS, duration: '60s', startTime: '25s', tags: { phase: 'steady' } },
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
    const made = http.post(`${API}/products`, JSON.stringify({ reference: `STEADY-${Date.now()}`, name: 'Steady load product', category: 'Test', priceKobo: 50000, quantity: 1000000, lowStockThreshold: 0 }), { headers });
    if (made.status !== 201) throw new Error(`could not create load product: HTTP ${made.status}`);
    return { token, productId: made.json('id') };
}

export default function (data) {
    const headers = { Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json', 'Idempotency-Key': uuidv4() };
    const res = http.post(`${API}/sales`, JSON.stringify({ paymentType: 'PAID', lines: [{ productId: data.productId, quantity: 1 }] }), { headers, tags: { name: 'POST /sales' } });
    check(res, { 'sale recorded (201)': (r) => r.status === 201 });
    sleep(THINK * (0.5 + Math.random()));
}