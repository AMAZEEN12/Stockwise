# Stockwise contract

`openapi.yaml` is the single source of truth for the API between `web/` and `service/`. The service implements no path that isn't here, and the interface calls none.

## Commands
```bash
# Validate (must pass in CI)
npx @redocly/cli@2 lint contract/openapi.yaml --config contract/redocly.yaml

# Mock server for the interface (port 4710)
npx @stoplight/prism-cli@5 mock contract/openapi.yaml --port 4710
```
Run them from the repository root.

**Base URLs:** the mock serves paths at the root, so point the web app at `VITE_API_BASE_URL=http://127.0.0.1:4710`. The real service serves them under `/api/v1` (`http://localhost:8080/api/v1` locally).

**Port 4710, not Prism's default 4010:** on some Windows machines Hyper-V/WSL reserves 3965-4064. Check with `netsh interface ipv4 show excludedportrange protocol=tcp` and pick a free port if 4710 is also taken.

**Mock versus real service:** Prism rejects invalid requests (missing `Idempotency-Key`, a non-integer quantity) with **422** in its own error format. The real service returns **400 `VALIDATION_FAILED`** as the contract says. Interface code should handle both 400 and 422 as validation errors while building against the mock.

To get a specific error from the mock, send `Prefer: code=409` (for example, to see `INSUFFICIENT_STOCK`) or `Prefer: example=credit`.

## Changing the contract
1. Edit `openapi.yaml` on a branch and bump `info.version`.
2. Add a dated line to `decisions.md` §3: what changed, why, and **the two engineers who agreed it**.
3. Lint must pass. The PR needs Isaac Bassey (API and access) plus one other engineer.

## Versions
| Version | Scope |
|----|----|
| 0.1.0 | Monday 26 Oct MVP paths: health, login, me, products (list, create, get), customers (list, create), sales (list, create, get) |
