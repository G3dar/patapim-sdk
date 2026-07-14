# hello-world plugin

Minimal PATAPIM plugin: two MCP tools + a command. See [docs/plugins.md](../../docs/plugins.md).

Install:

```bash
cp -r . ~/.patapim/plugins/hello-world
```

Then in PATAPIM: **Preferences → Local API → PATAPIM plugins → enable "hello-world"**. Any Claude Code session inside PATAPIM now has `plugin_hello_world_echo` and `plugin_hello_world_count_terminals` tools.
