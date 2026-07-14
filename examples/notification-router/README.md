# Notification router

Subscribe to PATAPIM's notification events over WebSocket and forward them anywhere — this example posts to a Slack/Discord-compatible webhook whenever an AI terminal needs your attention.

Token scopes needed: `events`, `notifications`, `terminals:read`.

```bash
PATAPIM_TOKEN=ppat_... WEBHOOK_URL=https://hooks.slack.com/services/... node router.mjs
```

Events you receive:

- `terminal_attention` — the AI finished a turn or hit something that needs you
- `terminal_awaiting_response` — the AI is explicitly waiting for your input
- plus anything else you subscribe to (`tasks`, `terminals`, `terminal-output:<id>`)
