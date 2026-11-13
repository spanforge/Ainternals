import assert from 'node:assert/strict';
for (const path of ['/prices', '/', '/prices']) {
  const response = await fetch(`http://localhost:3000${path}`);
  const html = await response.text();
  assert.equal(response.status, 200);
  for (const name of ['GPT-6.1 Sol', ...(path === '/prices' ? ['Claude Fable 5.2'] : ['Claude Opus 5.5']), 'Gemini 4 Carbon', 'Grok 4.7', 'DeepSeek V4.1 Flash', 'Mistral Large 4']) assert.ok(html.includes(name), `${path}: missing current model ${name}`);
  for (const name of ['GPT-4.1 mini', 'Gemini 2.5', 'Grok Code Fast 1', 'Claude Sonnet 4.6']) assert.ok(!html.includes(name), `${path}: obsolete model remains ${name}`);
  for (const name of ['Qwen 3.8 Max', ...(path === '/prices' ? ['Qwen 3.8 Flash'] : []), 'Kimi K3.1 Pro', 'MiniMax M3', 'MiniMax M3.1 Flash', 'GLM 5.3', ...(path === '/prices' ? ['GLM 5.3 Flash'] : [])]) assert.ok(html.includes(name), `${path}: missing added model ${name}`);
  assert.ok(html.includes(path === '/prices' ? 'Official source' : 'USD per million text tokens'));
  assert.ok(!/litellm|community-maintained|third-party estimates/i.test(html));
  assert.ok(!html.includes('Pricing is temporarily unavailable.'));
  if (path === '/prices') {
    assert.ok(html.includes('Qualified rate'));
    assert.ok(html.includes('Oldest successful provider fetch:'));
    assert.ok(html.includes('aria-sort='));
  } else assert.ok(html.includes('Pause ticker'));
  console.log(`${path}: HTTP 200, fetched pricing and attribution present (${Buffer.byteLength(html)} bytes)`);
}
