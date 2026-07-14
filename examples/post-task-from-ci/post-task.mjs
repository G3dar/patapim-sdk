#!/usr/bin/env node
// Usage: PATAPIM_TOKEN=ppat_... node post-task.mjs <projectPath> <task text>
const [projectPath, ...textParts] = process.argv.slice(2);
const text = textParts.join(' ');
if (!projectPath || !text) {
  console.error('Usage: node post-task.mjs <projectPath> <task text>');
  process.exit(1);
}

const res = await fetch('http://127.0.0.1:31415/api/v1/tasks', {
  method: 'POST',
  headers: { 'x-patapim-token': process.env.PATAPIM_TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ projectPath, text }),
});
const data = await res.json();
if (!res.ok) {
  console.error('Failed:', data.error);
  process.exit(1);
}
console.log('Task created:', data.task.id, '—', data.task.text);
