# Load test evidence, 2026-10-28
Produced by the `Load test` workflow (Actions → Load test) against https://stockwise-yc54.onrender.com/api/v1 from a GitHub-hosted runner. Order: last-unit, dashboard, catalogue, sales. The service was warm.

Files: `last-unit.txt`, `sales.txt`/`.json`, `dashboard.txt`/`.json`, `catalogue.txt`/`.json`.
Not run: cold start.
Each k6 script aborts itself when p95 passes its target; the virtual users shown at the abort is the saturation point.