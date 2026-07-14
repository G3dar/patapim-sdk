# WebSocket event stream

Connect to `ws://127.0.0.1:31415?token=ppat_...` (token needs the `events` scope), then subscribe:

```json
{ "type": "subscribe", "topics": ["tasks", "notifications", "terminal-output:term-3"] }
```

The server replies with what it accepted (each topic also requires its resource scope):

```json
{ "type": "subscribed", "topics": ["tasks", "notifications"], "rejected": [{ "topic": "terminal-output:term-3", "reason": "missing_scope", "requiredScope": "terminals:read" }] }
```

Each `subscribe` message **replaces** the previous topic set. Events look like:

```json
{ "type": "event", "topic": "notifications", "ts": "2026-07-14T12:00:00.000Z", "event": "terminal_attention", "terminalId": "term-3", "aiTool": "claude" }
```

## Topics

| Topic | Scope | Events |
|-------|-------|--------|
| `terminals` | `terminals:read` | `terminal_created`, `terminal_closed`, `terminal_renamed` |
| `terminal-output:<id>` | `terminals:read` | raw PTY output chunks (`data` field, ANSI included) |
| `tasks` | `tasks` | `task_created`, `task_updated`, `task_deleted` (with `projectPath` + `task`) |
| `notifications` | `notifications` | `terminal_attention` (AI finished / needs input), `terminal_awaiting_response` |

`notifications` fires at exactly the moments PATAPIM raises its own bell/toast notifications — it's the topic to build custom notification routers on. See [examples/notification-router](../examples/notification-router).

## With the SDK

```ts
const events = await patapim.events(['notifications', 'terminal-output:term-3']);
events.on('notifications', (e) => console.log(e.event, e.terminalId));
events.on('terminal-output:*', (e) => process.stdout.write(e.data ?? ''));
```

Keep-alive: the server pings every 15s at the protocol level; you can also send `{ "type": "ping" }` and get `{ "type": "pong" }`.
