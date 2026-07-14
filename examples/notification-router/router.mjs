#!/usr/bin/env node
// Usage: PATAPIM_TOKEN=ppat_... WEBHOOK_URL=... node router.mjs
import WebSocket from 'ws'; // or use the global WebSocket on Node >= 22

const TOKEN = process.env.PATAPIM_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
if (!TOKEN) { console.error('Set PATAPIM_TOKEN'); process.exit(1); }

const ws = new WebSocket(`ws://127.0.0.1:31415?token=${encodeURIComponent(TOKEN)}`);

ws.on('message', async (raw) => {
  const msg = JSON.parse(raw.toString());

  if (msg.type === 'auth_result') {
    if (!msg.success) { console.error('Auth failed — token needs the "events" scope'); process.exit(1); }
    ws.send(JSON.stringify({ type: 'subscribe', topics: ['notifications'] }));
  }

  if (msg.type === 'subscribed') {
    console.log('Listening for PATAPIM notifications…', msg.rejected.length ? `(rejected: ${JSON.stringify(msg.rejected)})` : '');
  }

  if (msg.type === 'event' && msg.topic === 'notifications') {
    const label = msg.event === 'terminal_awaiting_response' ? 'is waiting for your input' : 'needs attention';
    const text = `PATAPIM: terminal ${msg.terminalId}${msg.aiTool ? ` (${msg.aiTool})` : ''} ${label}`;
    console.log(new Date().toLocaleTimeString(), text);
    if (WEBHOOK_URL) {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, content: text }), // Slack uses `text`, Discord uses `content`
      }).catch((e) => console.error('Webhook failed:', e.message));
    }
  }
});

ws.on('close', () => { console.error('Connection closed — is PATAPIM running?'); process.exit(1); });
ws.on('error', (e) => { console.error('WS error:', e.message); process.exit(1); });
