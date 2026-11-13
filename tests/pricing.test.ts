import assert from 'node:assert/strict';
import { test } from 'node:test';
import { featuredModels } from '../config/featured-models.ts';
import { datedPrice, htmlTables, money, parseOfficialRate } from '../lib/pricing/official-parsers.ts';
import { formatPrice, normalizeOfficial } from '../lib/pricing/normalize.ts';
import { OfficialProviderLoader } from '../lib/pricing/official-loader.ts';
import { fetchOfficialDocument, type ProviderResult } from '../lib/pricing/official-sources.ts';
const getModel = (id: string) => featuredModels.find(m => m.modelId === id)!;
const openai = '### Standard pricing data\n| Model | Short context input | Short context output | Cached | Write | Write | Long input | Long output |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| gpt-6-astra | $12 | $60 | $1 | $2 | $3 | $24 | $90 |\n### Batch pricing data\n| gpt-6-astra | $6 | $30 |';
test('official USD parsing preserves zero and decimals, rejects missing/ambiguous prices', () => {
  assert.equal(money('$0'), 0);
  assert.equal(money('$1,000.25 / MTok'), 1000.25);
  assert.equal(money('$0.000015 / MTok'), 0.000015);
  assert.equal(money('~~$6~~ \\$3'), 3);
  for (const value of ['N/A', '', '€2', '$2 or $4', '$-2', '$1e3', '$1,20', 'Infinity']) assert.throws(() => money(value));
  assert.equal(formatPrice(null), 'N/A');
});
test('OpenAI picks Standard columns, never Batch, cache, or long-context rates', () => {
  const result = parseOfficialRate(getModel('gpt-6-astra'), openai);
  assert.equal(result.input, 12); assert.equal(result.output, 60);
  assert.match(result.notes.join(), /24.*90/);
  assert.throws(() => parseOfficialRate(getModel('gpt-6-astra'), openai.replace('Short context input', 'Unknown column')));
  assert.throws(() => parseOfficialRate(getModel('gpt-6-astra'), openai.replace('### Batch pricing data', '| gpt-6-astra | $7 | $8 |')));
});
test('Anthropic uses base input and output, excluding four cache columns', () => {
  const doc = '## Model pricing\n| Model | Base input tokens | 5m writes | 1h writes | Hits | Output tokens |\n| Claude Opus 5.5 | $7 / MTok | $8 | $9 | $1 | $35 / MTok |\n## Other';
  const result = parseOfficialRate(getModel('claude-opus-5-5'), doc);
  assert.equal(result.input, 7); assert.equal(result.output, 35);
});
test('Google uses paid-tier cells, and switches scheduled pricing at UTC boundary', () => {
  const doc = '## Gemini 4 Carbon {% id="gemini-4-carbon" %}\n{% tab title="Standard" %}\nPaid Tier, per 1M tokens in USD\n---\n* Input price\n* Free of charge\n* $2 through November 30, 2026.\n$4 starting December 1, 2026.\n---\n* Output price (including thinking tokens)\n* Free of charge\n* $10 through November 30, 2026.\n$20 starting December 1, 2026.\n---\n{% /tab %}';
  assert.equal(parseOfficialRate(getModel('gemini-4-carbon'), doc, new Date('2026-11-30T23:59:59Z')).input, 2);
  assert.equal(parseOfficialRate(getModel('gemini-4-carbon'), doc, new Date('2026-12-01T00:00:00Z')).input, 4);
  assert.throws(() => datedPrice('$2 through November 29, 2026. $4 starting December 1, 2026.', new Date()));
});
test('xAI preserves the strict below-200K boundary and reads both tiers', () => {
  const doc = '`grok-4.7`\n## Pricing\n| Type | < 200k prompt tokens (per 1M tokens) | ≥ 200k prompt tokens |\n| Input | $3 | $6 |\n| Cached input | $0.5 | $1 |\n| Output | $9 | $18 |\n## Rate limits';
  const result = parseOfficialRate(getModel('grok-4.7'), doc);
  assert.equal(result.input, 3); assert.equal(result.output, 9);
  assert.match(result.scope, /fewer than/);
});
test('DeepSeek expands rowspans and distinguishes cache misses from cache hits and off-peak', () => {
  const doc = '<table><tr><td colspan="3">MODEL</td><td>deepseek-flash<sup>(1)</sup></td><td>deepseek-v4-pro</td></tr><tr><td rowspan="6">PRICING</td><td rowspan="2">1M INPUT TOKENS (CACHE HIT)</td><td>OFF-PEAK</td><td>$0.01</td><td>$0.02</td></tr><tr><td>PEAK</td><td>$0.02</td><td>$0.04</td></tr><tr><td rowspan="2">1M INPUT TOKENS (CACHE MISS)</td><td>OFF-PEAK</td><td>$1</td><td>$2</td></tr><tr><td>PEAK</td><td>$2</td><td>$4</td></tr><tr><td rowspan="2">1M OUTPUT TOKENS</td><td>OFF-PEAK</td><td>$3</td><td>$6</td></tr><tr><td>PEAK</td><td>$6</td><td>$12</td></tr></table>';
  assert.equal(htmlTables(doc)[0].rows[4][1], '1M INPUT TOKENS (CACHE MISS)');
  const result = parseOfficialRate(getModel('deepseek-v4-pro'), doc);
  assert.equal(result.input, 4); assert.equal(result.output, 12);
});
test('Mistral requires GA API identity and explicit pricing labels', () => {
  const doc = '- API names: `mistral-large-4`\n- Status: GA\n- Pricing: Input $1 /M Tokens; Cached input $0.1 /M Tokens; Output $3 /M Tokens';
  assert.equal(parseOfficialRate(getModel('mistral-large-4'), doc).output, 3);
  assert.throws(() => parseOfficialRate(getModel('mistral-large-4'), doc.replace('Status: GA', 'Status: Retired')));
});
test('Alibaba selects Singapore International, not cheaper regional rates', () => {
  const table = (price: number) => `<table><tr><th>Model ID</th><th>Deployment scope</th><th>Input tokens per request</th><th>Input price (per 1 million tokens)</th><th>Output price (per 1 million tokens)</th></tr><tr><td>qwen3.8-max</td><td>International</td><td>0&lt;Token≤1M</td><td>$${price}</td><td>$6</td></tr></table>`;
  const doc = `<h3>Qwen-Max</h3><h4>Singapore</h4>${table(2)}<h4>China</h4>${table(1)}`;
  assert.equal(parseOfficialRate(getModel('qwen3.8-max'), doc).input, 2);
});
test('Kimi reads literal official component data without evaluating JavaScript', () => {
  const doc = 'groups:[{title:`Base tokens` columns:[{title:`Input`},{title:`Output`}] rows:[[_jsx(_components.a,{children:`kimi-k3.1-pro`}),`$3 / MTok`,`$15 / MTok`,`$0.3 / MTok`,`$3 / MTok`,`$6 / MTok`]]';
  const result = parseOfficialRate(getModel('kimi-k3.1-pro'), doc);
  assert.equal(result.input, 3); assert.equal(result.output, 15);
  assert.match(result.notes.join(), /Cache writes.*3.*6/);
  assert.throws(() => parseOfficialRate(getModel('kimi-k3.1-pro'), '<script>throw Error("do not run")</script>'));
});
test('MiniMax ignores struck-out and priority prices', () => {
  const doc = '## LLM\n> [tab] Standard\n> | Model | Input $ / M tokens | Output $ / M tokens | Cache |\n> | **MiniMax-M3** ≤ 512k input tokens | ~~$1~~ $0.5 | ~~$4~~ $2 | $0.1 |\n> | **MiniMax-M3** > 512k input tokens | $1 | $4 | $0.2 |\n> [tab] Priority\n> | MiniMax-M3 ≤ 512k | $2 | $8 |\n## Video';
  const result = parseOfficialRate(getModel('MiniMax-M3'), doc);
  assert.equal(result.input, 0.5); assert.equal(result.output, 2);
});
test('Z.ai ignores cached input and storage columns', () => {
  const doc = '### Latest Models\n| Model | Input | Cached Input | Storage | Output |\n| GLM-5.3 | \\$2 | \\$0.2 | Free | \\$6 |\n### Text Models';
  assert.equal(parseOfficialRate(getModel('glm-5.3'), doc).output, 6);
});
test('unknown source structure fails closed for every provider', () => {
  for (const model of featuredModels) assert.throws(() => parseOfficialRate(model, '<html>Service temporarily unavailable $0</html>'));
  const unavailable = normalizeOfficial(featuredModels[0], null, 'https://example.com', null);
  assert.equal(unavailable.inputUsdPerMillion, null);
  assert.equal(unavailable.sourceStatus, 'unavailable');
  assert.throws(() => normalizeOfficial(featuredModels[0], { input: NaN, output: 2, scope: 'Standard', notes: [] }, 'https://example.com', null));
});
test('official HTTP errors and unexpected redirects are rejected', async () => {
  const failing = (async () => new Response('Unavailable', { status: 503 })) as typeof fetch;
  await assert.rejects(fetchOfficialDocument('https://example.com/pricing', failing));
  const redirected = (async () => { const response = new Response('Prices'); Object.defineProperty(response, 'url', { value: 'https://unrelated.example/pricing' }); return response; }) as typeof fetch;
  await assert.rejects(fetchOfficialDocument('https://example.com/pricing', redirected), /redirect/);
});
test('stale official snapshots are labeled and expired promotional prices are suppressed', () => {
  const rate = { input: 2, output: 10, scope: 'Standard paid tier', notes: [] };
  const stale = normalizeOfficial(featuredModels[0], rate, 'https://example.com/pricing', '2020-01-01T00:00:00Z', true);
  assert.equal(stale.inputUsdPerMillion, 2);
  assert.equal(stale.sourceStatus, 'stale');
  assert.match(stale.warnings.join(), /stale/);
  const expired = normalizeOfficial(featuredModels[0], { ...rate, validUntil: '2020-01-01T00:00:00Z' }, 'https://example.com/pricing', '2019-12-31T00:00:00Z', true);
  assert.equal(expired.inputUsdPerMillion, null);
  assert.equal(expired.sourceStatus, 'unavailable');
  assert.match(expired.warnings.join(), /pricing period has ended/);
});
test('provider failures retain their prior snapshot without affecting other providers', async () => {
  let clock = Date.parse('2026-11-13T00:00:00Z'), calls = 0, fail = false;
  const snapshot = (provider: ProviderResult['provider']): ProviderResult => ({ provider, fetchedAt: new Date(clock).toISOString(), rates: [] });
  const loader = new OfficialProviderLoader(async provider => { calls++; if (fail && provider === 'OpenAI') throw new Error('upstream'); return snapshot(provider); }, () => clock);
  const prior = await loader.request('OpenAI');
  assert.equal(await loader.request('OpenAI'), prior); assert.equal(calls, 1);
  clock += 61_000; fail = true;
  await assert.rejects(loader.request('OpenAI'));
  assert.equal(loader.get('OpenAI'), prior);
  assert.equal(loader.failed('OpenAI'), true);
  await loader.request('Google');
  assert.equal(loader.failed('Google'), false);
  const count = calls;
  await assert.rejects(loader.request('OpenAI')); assert.equal(calls, count);
  clock += 301_000; fail = false;
  assert.notEqual((await loader.request('OpenAI')).fetchedAt, prior.fetchedAt);
});
test('concurrent source refreshes coalesce within a provider', async () => {
  let finish!: (value: ProviderResult) => void, calls = 0;
  const loader = new OfficialProviderLoader(async () => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const a = loader.request('OpenAI'), b = loader.request('OpenAI');
  finish({ provider: 'OpenAI', fetchedAt: new Date().toISOString(), rates: [] });
  assert.equal(await a, await b); assert.equal(calls, 1);
});
