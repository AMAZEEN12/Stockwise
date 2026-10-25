// k6 load test: read paths the shop uses all day (product list, sales list). N7.
//   k6 run -e API_URL=... -e OWNER_PASSWORD=... load/k6/dashboard.js
// Replace the dashboard path with GET /dashboard once that endpoint is in the contract.
import http from 'k6/http';
import { check, sleep } from 'k6';

const API = (__ENV.API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const P95 = Number(__ENV.P95_MS || 800); // DM12: dashboard p95 <= 800 ms (warm)
const PEAK = Number(__ENV.PEAK_VUS || 100);

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: Math.round(PEAK / 4) },
        { duration: '1m', target: Math.round(PEAK / 2) },
        { duration: '1m', target: PEAK },
        { duration: '30s', target: 0 },
      ],
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    http_req_duration: [{ threshold: `p(95)<${P95}`, abortOnFail: true, delayAbortEval: '20s' }],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const login = http.post(`${API}/auth/sessions`, JSON.stringify({ email: __ENV.OWNER_EMAIL || 'owner@stockwise.test', password: __ENV.OWNER_PASSWORD }), { headers: { 'Content-Type': 'application/json' } });
  if (login.status !== 201) throw new Error(`login failed: HTTP ${login.status}`);
  return { token: login.json('accessToken') };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };
  const r1 = http.get(`${API}/products?size=20`, { headers, tags: { name: 'GET /products' } });
  const r2 = http.get(`${API}/sales?size=20`, { headers, tags: { name: 'GET /sales' } });
  check(r1, { 'products 200': (r) => r.status === 200 });
  check(r2, { 'sales 200': (r) => r.status === 200 });
  sleep(Math.random());
}
