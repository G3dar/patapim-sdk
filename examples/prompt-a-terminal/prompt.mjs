#!/usr/bin/env node
// Usage: PATAPIM_TOKEN=ppat_... node prompt.mjs <terminalId> <prompt...>
const BASE = 'http://127.0.0.1:31415';
const TOKEN = process.env.PATAPIM_TOKEN;
const [terminalId, ...promptParts] = process.argv.slice(2);
const prompt = promptParts.join(' ');
if (!terminalId || !prompt) {
  console.error('Usage: node prompt.mjs <terminalId> <prompt...>');
  process.exit(1);
}

const api = (method, path, body) =>
  fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { 'x-patapim-token': TOKEN, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    return d;
  });

// 1. Send the prompt
await api('POST', `/terminals/${terminalId}/write`, { data: prompt, pressEnter: true });
console.log(`Prompt sent to terminal ${terminalId}. Waiting for it to finish...`);

// 2. Poll live state until the AI stops processing (simple + robust)
let wasProcessing = false;
for (;;) {
  await new Promise((r) => setTimeout(r, 2000));
  const { terminals } = await api('GET', '/terminals');
  const t = terminals.find((t) => t.terminalId === terminalId || t.terminalId === `term-${terminalId}`);
  if (!t) throw new Error('Terminal disappeared');
  if (t.isProcessing) wasProcessing = true;
  else if (wasProcessing) break; // processed and now idle → done
}

// 3. Print the tail of the buffer
const { buffer } = await api('GET', `/terminals/${terminalId}/buffer?lastLines=40`);
console.log('\n───── terminal tail ─────\n');
console.log(buffer);
