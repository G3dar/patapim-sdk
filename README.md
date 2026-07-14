# PATAPIM SDK

Extend and automate [PATAPIM](https://patapim.ai) — the desktop cockpit for AI coding CLIs — from your own scripts, tools and services.

PATAPIM runs a **local HTTP + WebSocket API** on `http://127.0.0.1:31415` (the same API its built-in MCP server uses). This repo contains everything you need to build on it:

- [`openapi/openapi.json`](openapi/openapi.json) — the full API spec, generated from the app's route table on every release
- [`packages/sdk`](packages/sdk) — `@patapim/sdk`, a zero-dependency TypeScript client (HTTP + event stream)
- [`examples/`](examples) — ready-to-run scripts: post tasks from CI, prompt a terminal, build your own notification router
- [`docs/`](docs) — getting started, authentication & scopes, events, versioning policy

## Quick start

1. In PATAPIM: **Preferences → Local API → Enable Local API**, then **Create token** with the scopes you need. Copy the token (shown once).
2. Talk to the API:

```bash
curl http://127.0.0.1:31415/api/v1/terminals \
  -H "x-patapim-token: ppat_..."
```

Or with the SDK:

```ts
import { PatapimClient } from '@patapim/sdk';

const patapim = new PatapimClient({ token: process.env.PATAPIM_TOKEN! });

// Send a prompt to terminal 3
await patapim.terminals.write('3', 'Fix the failing tests\n');

// React to events
const events = await patapim.events(['notifications', 'tasks']);
events.on('notifications', (e) => console.log('terminal needs attention:', e.terminalId));
```

## What can you build?

- **CI / automation hooks** — create tasks, kick off prompts, read terminal output from any script
- **Custom notification routing** — subscribe to the WS event stream and forward "Claude needs attention" to Slack, Discord, ntfy, a lightbulb…
- **Dashboards & monitors** — live terminal state (processing / plan mode / attention) over HTTP
- **Browser automation** — drive PATAPIM's embedded browser (navigate, click, fill, screenshot)

A full in-app **plugin system** (manifest + permissions + UI contributions + custom MCP tools) is the next phase — the token scopes you see here are its permission model. Watch this repo.

## Versioning promise

`/api/v1` is **additive-only**: routes, parameters and response fields are never removed or renamed. Breaking changes would ship as `/api/v2` with a long overlap. Details in [docs/versioning.md](docs/versioning.md).

## License

MIT — see [LICENSE](LICENSE). The PATAPIM application itself is proprietary; see [PLUGIN_TERMS.md](PLUGIN_TERMS.md) for the API terms.
