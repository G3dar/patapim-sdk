# Writing PATAPIM plugins

PATAPIM plugins are folders in `~/.patapim/plugins/<name>/` that run **out-of-process** with a permission-scoped token. They can call the Local API, subscribe to events, and register **MCP tools that appear automatically in every AI CLI session** (Claude Code, Codex, …) running inside PATAPIM.

## Anatomy

```
~/.patapim/plugins/
  my-plugin/
    plugin.json      # manifest
    index.js         # entry module (CommonJS)
```

`plugin.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What it does",
  "main": "index.js",
  "permissions": ["terminals:read", "notifications"]
}
```

- `name` must equal the folder name (lowercase letters, digits, `-`, `_`).
- `permissions` are [Local API scopes](authentication.md) — exactly what the plugin's token will carry. The user approves them when enabling the plugin (browser-extension style). If an update requests new scopes, the plugin won't start until the user re-grants.

## Contributions (`contributes`)

Declarative entries in `plugin.json` that PATAPIM applies on your behalf — no code needed for these:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "main": "index.js",
  "permissions": ["terminals:read"],
  "contributes": {
    "instructionBlocks": [
      { "text": "This project uses pnpm, not npm." },
      { "file": "context.md" }
    ],
    "commands": [
      { "id": "sync", "title": "Sync now" }
    ],
    "toolbarButtons": [
      { "command": "sync", "tooltip": "Sync now", "icon": "🔄" }
    ]
  }
}
```

- **`instructionBlocks`** — text injected into every AI CLI's memory file (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.gemini/GEMINI.md`) inside a per-plugin marker while the plugin is enabled, and stripped cleanly when disabled. Use `{ text }` for inline content or `{ file }` for a path relative to the plugin folder. This is how a plugin adds standing context or skills to every Claude/Codex/Gemini session — no tokens spent per call, and the user sees exactly what's injected in the enable prompt.
- **`commands`** — named actions (`{ id, title }`) shown as buttons on the plugin's card in **Preferences → Local API**. Clicking one dispatches to the handler you register in `activate` (see `registerCommand` below).
- **`toolbarButtons`** — put a command one click away in the main terminal toolbar, next to the built-in AI buttons. Each `{ command, tooltip, icon }` references a `commands` entry; `icon` is a single emoji. Buttons appear only while the plugin is running.

## Entry module

```js
module.exports.activate = async (patapim) => {
  // Register an MCP tool — visible to Claude Code as `plugin_my-plugin_summarize_terminals`
  patapim.registerMcpTool({
    name: 'summarize_terminals',
    description: 'Summarize the state of all open terminals',
    inputSchema: { type: 'object', properties: {} },
  }, async () => {
    const { terminals } = await patapim.get('/terminals');
    return terminals.map(t => ({ id: t.terminalId, busy: t.isProcessing }));
  });

  // React to events (requires the "events" permission + per-topic scopes)
  const events = await patapim.events(['notifications']);
  events.on('notifications', (e) => {
    patapim.notify(`Terminal ${e.terminalId} needs you!`);
  });
};

module.exports.deactivate = async () => { /* optional cleanup */ };
```

## The `patapim` object

| Member | Description |
|--------|-------------|
| `get/post/patch/delete(path, …)` | Local API request, path relative to `/api/v1` (e.g. `'/terminals'`) — same surface as the [SDK/OpenAPI spec](../openapi/openapi.json) |
| `notify(text, terminalId?)` | Send a notification (scope: `notifications`) |
| `registerMcpTool(def, handler)` | Register an MCP tool (call during `activate`) — `def = { name, description, inputSchema }` |
| `registerCommand(id, handler)` | Register the handler for a `contributes.commands` entry — invoked when the user clicks its button. `handler(args)` may be async; its return value is shown to the user |
| `events(topics)` | WebSocket event stream → `{ on(topic, cb), close() }` |
| `name`, `dir`, `log(…)` | Plugin identity + logging (shows in PATAPIM's main log as `[PluginHost] [name]`) |

## Runtime & security model

- Each enabled plugin runs in its own **utility process** — crash-isolated, no Electron/renderer/app-internals access.
- Its only capability is the Local API with an **ephemeral token scoped to the granted permissions**. Plugins work even when the general "Enable Local API" toggle is off — enabling the plugin is its own grant.
- Plugins that crash after a successful start are auto-restarted up to 3 times.
- Enable/disable in **Preferences → Local API → PATAPIM plugins**. Everything lives under `~/.patapim`, so plugins survive app updates.

## MCP tools in AI sessions

Tools you register are namespaced `plugin_<plugin>_<tool>` and merged into the `patapim-browser` MCP server that PATAPIM auto-registers in Claude Code/Codex. Live sessions pick up changes within ~60s (`tools/list_changed`); new sessions see them immediately.

## Reference

The host bootstrap that loads your plugin is published at [`reference/host-entry.js`](../reference/host-entry.js) — it is the exact contract your plugin runs against.
