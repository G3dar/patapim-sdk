module.exports.activate = async (patapim) => {
  patapim.registerMcpTool({
    name: 'count_terminals',
    description: 'Count the open PATAPIM terminals',
    inputSchema: { type: 'object', properties: {} },
  }, async () => {
    const { terminals } = await patapim.get('/terminals');
    return { count: terminals.length, names: terminals.map(t => t.customName || t.name || t.terminalId) };
  });

  patapim.registerMcpTool({
    name: 'echo',
    description: 'Echo back the provided text (plugin smoke test)',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  }, async ({ text }) => ({ echoed: text, from: patapim.name }));

  patapim.registerCommand('hello', () => 'hello from the hello-world plugin');
  patapim.log('hello-world plugin activated');
};

module.exports.deactivate = () => console.log('hello-world plugin deactivated');
