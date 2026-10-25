// k6 load test: record sales (N7). Ramps virtual users until p95 breaks the DM12 target,
// so the report shows the saturation point. Run (k6 >= 0.50):
//   k6 run -e API_URL=https://stockwise-api.onrender.com/api/v1 -e OWNER_PASSWORD=... load/k6/sales.js
// Optional: -e P95_MS=800 (DM12: 500 ms), -e PEAK_VUS=50.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const API = (__ENV.API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const P95 = Number(__ENV.P95_MS || 500); // DM12: POST /sales p95 <= 500 ms
const PEAK = Number(__ENV.PEAK_VUS || 50);

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
    // abortOnFail stops the ramp once the target breaks: the VU count at that moment is the saturation point.
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
  // A big-stock product so the test measures speed, not stock-outs.
  const made = http.post(`${API}/products`, JSON.stringify({ reference: `LOAD-${Date.now()}`, name: 'Load test product', category: 'Test', priceKobo: 50000, quantity: 1000000, lowStockThreshold: 0 }), { headers });
  if (made.status !== 201) throw new Error(`could not create load product: HTTP ${made.status}`);
  return { token, productId: made.json('id') };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json', 'Idempotency-Key': uuidv4() };
  const res = http.post(`${API}/sales`, JSON.stringify({ paymentType: 'PAID', lines: [{ productId: data.productId, quantity: 1 }] }), { headers, tags: { name: 'POST /sales' } });
  check(res, { 'sale recorded (201)': (r) => r.status === 201 });
  sleep(Math.random() * 0.5);
}
