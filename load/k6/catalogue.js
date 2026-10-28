// k6 load test for GET /products with search and filter (N7 companion to sales.js).
// DM12 has no target for this; the 500 ms line is only a yardstick. Read-only, so no data to reset.
//   k6 run -e API_URL=https://<service>/api/v1 -e OWNER_PASSWORD=... load/k6/catalogue.js
// Optional: -e P95_MS=500, -e PEAK_VUS=50
import http from 'k6/http';
import { check, sleep } from 'k6';

const API = (__ENV.API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const P95 = Number(__ENV.P95_MS || 500);
const PEAK = Number(__ENV.PEAK_VUS || 50);
const QUERIES = ['', '?q=milk', '?category=Groceries', '?stockState=LOW', '?q=rice&size=50', '?size=100'];

export const options = {
    scenarios: {
        ramp: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '20s', target: Math.max(2, Math.round(PEAK / 5)) },
                { duration: '40s', target: Math.round(PEAK / 2) },
                { duration: '40s', target: PEAK },
                { duration: '20s', target: 0 },
            ],
        },
    },
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    thresholds: {
        'http_req_duration{name:GET /products}': [{ threshold: `p(95)<${P95}`, abortOnFail: true, delayAbortEval: '15s' }],
        'http_req_failed{name:GET /products}': ['rate<0.01'],
        checks: ['rate>0.99'],
    },
};

export function setup() {
    http.get(`${API.replace(/\/api\/v1$/, '')}/`, { timeout: '120s' }); // wake the service first
    const login = http.post(`${API}/auth/sessions`, JSON.stringify({ email: __ENV.OWNER_EMAIL || 'owner@stockwise.test', password: __ENV.OWNER_PASSWORD }), { headers: { 'Content-Type': 'application/json' }, timeout: '60s' });
    if (login.status !== 201) throw new Error(`login failed: HTTP ${login.status}`);
    return { token: login.json('accessToken') };
}

export default function (data) {
    const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];
    const res = http.get(`${API}/products${query}`, { headers: { Authorization: `Bearer ${data.token}` }, tags: { name: 'GET /products' } });
    check(res, { 'products 200': (r) => r.status === 200 });
    sleep(Math.random() * 0.5);
}