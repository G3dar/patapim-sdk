# Versioning policy

- The public surface is everything under **`/api/v1`** plus the WebSocket subscribe/event protocol documented here. Unversioned paths on the same port are internal and may change without notice.
- **v1 is additive-only.** We may add routes, optional parameters, response fields, scopes and event topics. We will never remove or rename existing ones, change types, or repurpose a scope within v1.
- Breaking changes would ship as `/api/v2`, with `/api/v1` kept working during a long overlap. Deprecations are announced in release notes and via a `Deprecation` response header.
- `GET /api/v1/meta` returns `apiVersion` and the app version — use it for feature detection rather than sniffing.
- `openapi/openapi.json` in this repo is regenerated from the application's route table on every PATAPIM release; the spec is the contract.
