# Cold start evidence, 2026-10-30

Produced by the `Cold start` workflow (Actions → Cold start) against https://stockwise-yc54.onrender.com/api/v1 from a GitHub-hosted runner. Service: Render free plan (0.1 CPU), which sleeps after 15 minutes idle. Database: Neon free.

The service was left untouched for 20 minutes, then `load/concurrency/cold-start.mjs` requested `/` until it answered 200, then called `/api/v1/health` three times.

| Measure | Result |
|----|----|
| Time to first 200 after idle | **62.3 s** (1 attempt) |
| Warm `/health`, three calls | 330 ms, 161 ms, 174 ms |

Raw output (`cold-start.txt`):

```
Cold start: first 200 after 62.3 s (1 attempt(s)). Warm /health: 330, 161, 174 ms.
README row: 2026-10-30 | cold start 62 s | warm health 161-330 ms
```

Notes:
- One run only. Cold start varies with how busy Render's free hosts are, so another run may differ.
- Reported separately from the p95 targets (DM12). It is not counted against `POST /sales` or the dashboard.
- The earlier attempt on 2026-10-28 answered in 0.3 s because the service had not gone to sleep. It was excluded.
- Effect on a demo: a visitor who arrives after the service has slept waits about a minute. Open the service address about 2 minutes before presenting.