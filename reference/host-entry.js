/**
 * PATAPIM plugin host entry — runs inside an Electron utilityProcess, one per
 * enabled plugin. Ships as plaintext outside the ASAR (like src/mcp/**): this
 * file IS the public contract between PATAPIM and plugin code, and is also
 * published in the patapim-sdk repo.
 *
 * A plugin is a directory ~/.patapim/plugins/<name>/ with plugin.json and an
 * entry module exporting:
 *
 *   module.exports.activate = async (patapim) => { ... }   // required
 *   module.exports.deactivate = async () => { ... }        // optional
 *
 * The `patapim` object is the plugin's ONLY capability surface. Its HTTP
 * methods hit the Local API with a token scoped to exactly the permissions
 * the user granted in Preferences — a plugin can never do more than its
 * manifest declared.
 */

'use strict';

const API_BASE = process.env.PATAPIM_API_BASE;         // http://127.0.0.1:<port>
const TOKEN = process.env.PATAPIM_PLUGIN_TOKEN;        // ephemeral, scoped
const PLUGIN_NAME = process.env.PATAPIM_PLUGIN_NAME;
const PLUGIN_MAIN = process.env.PATAPIM_PLUGIN_MAIN;

const port = process.parentPort; // utilityProcess MessagePort to PATAPIM main

const mcpTools = new Map();   // toolName → { def, handler }
const commands = new Map();   // commandId → handler
let deactivateFn = null;

// ── Plugin API ───────────────────────────────────────────────────────

/** Low-level Local API request. path is relative to /api/v1 (e.g. '/terminals'). */
async function request(method, apiPath, body, query) {
  const url = new URL(API_BASE + '/api/v1' + apiPath);
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method,
    headers: {
      'x-patapim-token': TOKEN,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

const patapim = {
  name: PLUGIN_NAME,
  dir: process.env.PATAPIM_PLUGIN_DIR,

  // HTTP surface (scoped by the user's grant — see docs/authentication.md)
  get: (p, query) => request('GET', p, undefined, query),
  post: (p, body) => request('POST', p, body || {}),
  patch: (p, body) => request('PATCH', p, body || {}),
  delete: (p, query) => request('DELETE', p, undefined, query),

  /** Convenience: send a notification through the user's channel (scope: notifications). */
  notify: (text, terminalId) => request('POST', '/notifications', { text, terminalId }),

  /**
   * Register an MCP tool that becomes available to every AI CLI session in
   * PATAPIM (Claude Code, Codex, …) as `plugin_<pluginName>_<name>`.
   * Call during activate(). handler(args) may be async; return value is
   * JSON-serialized for the model.
   */
  registerMcpTool(def, handler) {
    if (!def || !def.name || typeof handler !== 'function') {
      throw new Error('registerMcpTool requires ({ name, description, inputSchema }, handler)');
    }
    mcpTools.set(String(def.name), { def, handler });
  },

  /** Register a command invocable from PATAPIM (future: toolbar buttons). Call during activate(). */
  registerCommand(id, handler) {
    if (!id || typeof handler !== 'function') throw new Error('registerCommand requires (id, handler)');
    commands.set(String(id), handler);
  },

  /**
   * Subscribe to the event stream (requires the "events" permission plus the
   * per-topic resource permission). Returns { on(topic, cb), close() }.
   */
  async events(topics) {
    const wsUrl = API_BASE.replace(/^http/, 'ws') + `?token=${encodeURIComponent(TOKEN)}`;
    const ws = new WebSocket(wsUrl);
    const listeners = new Map();
    await new Promise((resolve, reject) => {
      ws.addEventListener('error', reject);
      ws.addEventListener('message', (e) => {
        let msg; try { msg = JSON.parse(String(e.data)); } catch { return; }
        if (msg.type === 'auth_result' && msg.success) ws.send(JSON.stringify({ type: 'subscribe', topics }));
        else if (msg.type === 'auth_result') reject(new Error('event stream auth failed — missing "events" permission?'));
        else if (msg.type === 'subscribed') resolve();
        else if (msg.type === 'event') {
          for (const cb of listeners.get(msg.topic) || []) { try { cb(msg); } catch (err) { console.error(err); } }
          for (const cb of listeners.get('*') || []) { try { cb(msg); } catch (err) { console.error(err); } }
        }
      });
    });
    return {
      on(topic, cb) {
        if (!listeners.has(topic)) listeners.set(topic, new Set());
        listeners.get(topic).add(cb);
        return this;
      },
      close: () => { try { ws.close(); } catch {} },
    };
  },

  log: (...args) => console.log(...args),
};

// ── Lifecycle ────────────────────────────────────────────────────────

async function main() {
  let mod;
  try {
    mod = require(PLUGIN_MAIN);
  } catch (err) {
    port.postMessage({ type: 'activate-error', error: `failed to load ${PLUGIN_MAIN}: ${err.message}` });
    process.exit(1);
  }

  if (typeof mod.activate !== 'function') {
    port.postMessage({ type: 'activate-error', error: 'plugin entry must export an activate(patapim) function' });
    process.exit(1);
  }
  deactivateFn = typeof mod.deactivate === 'function' ? mod.deactivate : null;

  try {
    await mod.activate(patapim);
  } catch (err) {
    port.postMessage({ type: 'activate-error', error: `activate() threw: ${err.message}` });
    process.exit(1);
  }

  port.postMessage({
    type: 'register',
    tools: [...mcpTools.values()].map(({ def }) => ({
      name: def.name,
      description: def.description || '',
      inputSchema: def.inputSchema || { type: 'object', properties: {} },
    })),
    commands: [...commands.keys()],
  });
  port.postMessage({ type: 'ready' });
}

port.on('message', async (e) => {
  const msg = e.data || {};
  switch (msg.type) {
    case 'mcp-call': {
      const entry = mcpTools.get(msg.tool);
      if (!entry) {
        port.postMessage({ type: 'mcp-result', id: msg.id, error: `unknown tool: ${msg.tool}` });
        return;
      }
      try {
        const result = await entry.handler(msg.args || {});
        port.postMessage({ type: 'mcp-result', id: msg.id, result });
      } catch (err) {
        port.postMessage({ type: 'mcp-result', id: msg.id, error: err.message || String(err) });
      }
      return;
    }
    case 'command': {
      const handler = commands.get(msg.command);
      if (!handler) {
        port.postMessage({ type: 'mcp-result', id: msg.id, error: `unknown command: ${msg.command}` });
        return;
      }
      try {
        const result = await handler(msg.args || {});
        port.postMessage({ type: 'mcp-result', id: msg.id, result });
      } catch (err) {
        port.postMessage({ type: 'mcp-result', id: msg.id, error: err.message || String(err) });
      }
      return;
    }
    case 'shutdown': {
      try { if (deactivateFn) await deactivateFn(); } catch (err) { console.error('deactivate() threw:', err.message); }
      process.exit(0);
    }
  }
});

main().catch((err) => {
  port.postMessage({ type: 'activate-error', error: err.message || String(err) });
  process.exit(1);
});
