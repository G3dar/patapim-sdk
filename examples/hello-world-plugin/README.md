# hello-world plugin

Minimal PATAPIM plugin: two MCP tools + a command. See [docs/plugins.md](../../docs/plugins.md).

Install:

```bash
cp -r . ~/.patapim/plugins/hello-world
```

Then in PATAPIM: **Preferences → Local API → PATAPIM plugins → enable "hello-world"**.

What it demonstrates:
- **MCP tools** — any Claude Code session inside PATAPIM gets `plugin_hello_world_echo` and `plugin_hello_world_count_terminals`.
- **`commands`** — the plugin card shows "Say hello" and "Count terminals" buttons that dispatch to the plugin process.
- **`instructionBlocks`** — a note about the plugin is injected into your AI memory files while it's enabled, and removed when you disable it.
- **`panels`** — a "Hello Panel" button opens a sandboxed window (`panel.html` + `panel.js`) that calls the scoped Local API through `window.patapimPlugin`.
