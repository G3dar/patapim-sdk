# Getting started

## 1. Enable the Local API

In PATAPIM: **Preferences → Local API → Enable Local API**.

The API listens on `http://127.0.0.1:31415` (`/api/v1/*`). If you run a second dev instance of PATAPIM, it uses port `31416`.

## 2. Create a token

**Preferences → Local API → Create token.** Pick a name and check only the scopes your tool needs (least privilege). The token (`ppat_...`) is shown **once** — store it like a password (env var, secret manager; never commit it).

## 3. Call the API

```bash
# who am I / what can this token do
curl http://127.0.0.1:31415/api/v1/meta -H "x-patapim-token: $PATAPIM_TOKEN"

# list terminals (scope: terminals:read)
curl http://127.0.0.1:31415/api/v1/terminals -H "x-patapim-token: $PATAPIM_TOKEN"

# send a prompt to terminal 3 (scope: terminals:write)
curl -X POST http://127.0.0.1:31415/api/v1/terminals/3/write \
  -H "x-patapim-token: $PATAPIM_TOKEN" -H "Content-Type: application/json" \
  -d '{"data": "Summarize the failing tests", "pressEnter": true}'
```

`Authorization: Bearer ppat_...` works too.

## 4. Or use the SDK

```bash
npm install @patapim/sdk
```

```ts
import { PatapimClient } from '@patapim/sdk';
const patapim = new PatapimClient({ token: process.env.PATAPIM_TOKEN! });
console.log(await patapim.meta());
```

## Error shape

Errors are JSON with a stable `code`:

| HTTP | code | meaning |
|------|------|---------|
| 401 | `API_DISABLED` | Local API toggle is off |
| 401 | `INVALID_TOKEN` | bad/missing token |
| 403 | `MISSING_SCOPE` | token lacks `requiredScope` (included in the body) |
| 404 | `UNKNOWN_ROUTE` | not a v1 route |

Domain errors (e.g. "Terminal limit reached") come through with the underlying handler's status and message.

## Full API reference

See [`openapi/openapi.json`](../openapi/openapi.json) — generated from the app's route table on every release, so it is always in sync.
