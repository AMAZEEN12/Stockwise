#!/usr/bin/env node
// Cold-start measurement, reported separately from p95 (DM12, plan step 21). Node 20+.
// Run it after the service has been IDLE for 20 minutes (Render free sleeps after 15):
//   API_URL=https://<service>/api/v1 node load/concurrency/cold-start.mjs
const api = (process.env.API_URL ?? '').replace(/\/$/, '');
if (!api) { console.error('Set API_URL, e.g. https://stockwise-yc54.onrender.com/api/v1'); process.exit(2); }
const root = api.replace(/\/api\/v1$/, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const t0 = performance.now();
let attempts = 0;
for (;;) {
    attempts += 1;
    try {
        const res = await fetch(`${root}/`, { signal: AbortSignal.timeout(120_000) });
        if (res.status === 200) break;
    } catch { /* still waking up */ }
    if (performance.now() - t0 > 300_000) { console.error('No 200 within 5 minutes.'); process.exit(1); }
    await sleep(2000);
}
const cold = (performance.now() - t0) / 1000;

const warm = [];
for (let i = 0; i < 3; i += 1) {
    const t = performance.now();
    await fetch(`${api}/health`);
    warm.push(Math.round(performance.now() - t));
}
console.log(`Cold start: first 200 after ${cold.toFixed(1)} s (${attempts} attempt(s)). Warm /health: ${warm.join(', ')} ms.`);
console.log(`README row: ${new Date().toISOString().slice(0, 10)} | cold start ${cold.toFixed(0)} s | warm health ${Math.min(...warm)}-${Math.max(...warm)} ms`);