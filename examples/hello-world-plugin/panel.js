const out = document.getElementById('out');

window.patapimPlugin.info().then(i => {
  document.getElementById('info').textContent = i
    ? `plugin: ${i.pluginName} · scopes: ${i.scopes.join(', ') || 'none'}`
    : 'no panel info';
});

document.getElementById('count').addEventListener('click', async () => {
  out.textContent = 'loading…';
  try {
    const r = await window.patapimPlugin.get('/terminals');
    out.textContent = `${r.terminals.length} terminal(s):\n` +
      r.terminals.map(t => '• ' + (t.customName || t.name || t.terminalId)).join('\n');
  } catch (e) { out.textContent = 'error: ' + e.message; }
});

document.getElementById('notify').addEventListener('click', async () => {
  try { await window.patapimPlugin.notify('Hello from the hello-world panel 👋'); out.textContent = 'notification sent.'; }
  catch (e) { out.textContent = 'error: ' + e.message; }
});

document.getElementById('close').addEventListener('click', () => window.patapimPlugin.close());
