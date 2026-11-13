import assert from 'node:assert/strict';
import { test } from 'node:test';
import { featuredModels } from '../config/featured-models.ts';
import { normalizeOfficial } from '../lib/pricing/normalize.ts';
import { defaultWorkload, estimateModel, workloadError } from '../lib/pricing/estimate.ts';
import { parseBoardState, serializeBoardState, csvCell, makeCsv } from '../lib/pricing/share.ts';
import { pricingChanges } from '../lib/pricing/changes.ts';
import type { BillingTier, OfficialRate } from '../lib/pricing/official-parsers.ts';
import type { ProviderResult } from '../lib/pricing/official-sources.ts';
import { applyPreset, matchingPreset } from '../lib/pricing/presets.ts';
const now = Date.now();
const tier = (id: string, input: number, output: number, extra: Partial<BillingTier> = {}): BillingTier => ({ id, input, output, label: id, minInput: 0, maxInput: null, processing: 'standard', region: 'default', period: 'any', ...extra });
function model(id: string, tiers: BillingTier[], extra: Partial<OfficialRate> = {}) {
  return normalizeOfficial(featuredModels.find(m => m.modelId === id)!, { input: tiers[0].input, output: tiers[0].output, scope: 'Standard', notes: [], tiers, ...extra }, 'https://example.com/pricing', new Date(now).toISOString());
}
test('monthly estimate uses request-level token counts and separates input/output', () => {
  const e = estimateModel(model('gpt-6.1-sol', [tier('standard', 2, 10)]), defaultWorkload, now);
  assert.equal(e.inputCost, 80); assert.equal(e.outputCost, 100); assert.equal(e.monthly, 180);
  assert.equal(e.perRequest, .018);
});
test('whole-request context pricing switches at exact integer boundaries', () => {
  for (const [id, threshold] of [['gpt-6.1-sol', 272000], ['claude-haiku-5-5', 100000], ['MiniMax-M3', 512000]] as const) {
    const m = model(id, [tier('short', 1, 5, { maxInput: threshold }), tier('long', 2, 10, { minInput: threshold + 1 })]);
    assert.equal(estimateModel(m, { ...defaultWorkload, input: threshold }, now).tier?.id, 'short');
    const e = estimateModel(m, { ...defaultWorkload, input: threshold + 1, requests: 1, output: 100 }, now);
    assert.equal(e.tier?.id, 'long'); assert.equal(e.monthly, (threshold + 1) * 2 / 1e6 + .001);
  }
  const grok = model('grok-4.7', [tier('short', 2, 6, { maxInput: 199999 }), tier('long', 4, 12, { minInput: 200000 })]);
  assert.equal(estimateModel(grok, { ...defaultWorkload, input: 200000 }, now).tier?.id, 'long');
});
test('period and region select only a matching published tier', () => {
  const deepseek = model('deepseek-flash', [tier('peak', .3, 1.2, { period: 'peak' }), tier('off-peak', .15, .6, { period: 'off-peak' })]);
  assert.equal(estimateModel(deepseek, { ...defaultWorkload, period: 'off-peak' }, now).monthly, estimateModel(deepseek, defaultWorkload, now).monthly! / 2);
  const qwen = model('qwen3.8-max', [tier('singapore', 2, 6, { region: 'singapore' }), tier('us', 3, 9, { region: 'us' })]);
  assert.equal(estimateModel(qwen, { ...defaultWorkload, region: 'us' }, now).tier?.input, 3);
  assert.equal(estimateModel(qwen, { ...defaultWorkload, region: 'eu' }, now).monthly, null);
});
test('Kimi required cache writes are included and missing write prices block estimates', () => {
  const kimi = model('kimi-k3.1-pro', [tier('standard', 2, 10, { cacheWrite5m: 2, cacheWrite1h: 4 })]);
  const e = estimateModel(kimi, defaultWorkload, now);
  assert.equal(e.writeCost, 80); assert.equal(e.monthly, 260);
  assert.equal(estimateModel(kimi, { ...defaultWorkload, kimiTtl: '1h' }, now).writeCost, 160);
  assert.equal(estimateModel(model('kimi-k3.1-pro', [tier('standard', 2, 10)]), defaultWorkload, now).monthly, null);
});
test('batch uses validated rates and never applies an assumed discount', () => {
  const m = model('gpt-6.1-sol', [tier('standard', 2, 10), tier('batch', 1, 5, { processing: 'batch' })]);
  assert.equal(estimateModel(m, { ...defaultWorkload, processing: 'batch' }, now).monthly, 90);
  assert.equal(estimateModel(model('glm-5.3', [tier('standard', 2, 6)]), { ...defaultWorkload, processing: 'batch' }, now).monthly, null);
});
test('stale, expired, over-capacity and ambiguous data cannot be ranked as estimates', () => {
  const m = model('gpt-6.1-sol', [tier('standard', 2, 10)], { contextWindow: 10000, maxOutput: 2000 });
  assert.equal(estimateModel(m, { ...defaultWorkload, input: 9500, output: 1000 }, now).monthly, null);
  assert.equal(estimateModel(m, { ...defaultWorkload, output: 2001 }, now).monthly, null);
  assert.equal(estimateModel({ ...m, sourceStatus: 'stale' }, defaultWorkload, now).monthly, null);
  assert.equal(estimateModel(m, defaultWorkload, now + 3600001).monthly, null);
  assert.equal(estimateModel({ ...m, validUntil: new Date(now - 1).toISOString() }, defaultWorkload, now).monthly, null);
  assert.equal(estimateModel(model('gpt-6.1-sol', [tier('a', 2, 10), tier('b', 3, 12)]), defaultWorkload, now).monthly, null);
});
test('invalid user inputs are rejected; a zero-volume workload is explicit', () => {
  for (const patch of [{ input: -1 }, { input: NaN }, { output: Infinity }, { requests: 1.5 }, { requests: -1 }]) assert.ok(workloadError({ ...defaultWorkload, ...patch }));
  const e = estimateModel(model('gpt-6.1-sol', [tier('standard', 2, 10)]), { ...defaultWorkload, requests: 0 }, now);
  assert.equal(e.monthly, 0); assert.equal(e.perRequest, .018);
});
test('shared URLs restore workload, filters, ordering and a maximum of four known models', () => {
  const ids = featuredModels.map(m => m.modelId), providers = featuredModels.map(m => m.provider);
  const state = { workload: { ...defaultWorkload, input: 300000, period: 'off-peak' as const }, query: 'Qwen & GLM', provider: 'Alibaba Cloud', selected: ids.slice(0, 4), sort: 'monthly' as const, ascending: false };
  assert.deepEqual(parseBoardState(new URLSearchParams(serializeBoardState(state)), ids, providers), state);
  const dirty = parseBoardState(new URLSearchParams(`input=Infinity&requests=-1&provider=Unknown&compare=${[...ids, '<script>'].join(',')}`), ids, providers);
  assert.equal(dirty.selected.length, 4); assert.equal(dirty.workload.input, 4000); assert.equal(dirty.provider, 'All providers');
});
test('example presets change only counts and preserve billing assumptions', () => {
  const custom = { ...defaultWorkload, processing: 'batch' as const, period: 'off-peak' as const, region: 'eu' as const, kimiTtl: '1h' as const };
  const chat = applyPreset(custom, 'short-chat');
  assert.deepEqual([chat.input, chat.output, chat.requests], [800, 300, 10000]);
  assert.equal(chat.processing, 'batch'); assert.equal(chat.period, 'off-peak'); assert.equal(chat.region, 'eu'); assert.equal(chat.kimiTtl, '1h');
  assert.equal(matchingPreset(chat), 'short-chat');
  const summary = applyPreset(chat, 'document-summary');
  assert.deepEqual([summary.input, summary.output, summary.requests], [8000, 600, 1000]);
  assert.equal(applyPreset(summary, 'custom'), summary);
});
test('CSV escapes quotes, line breaks and spreadsheet formulas', () => {
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(csvCell('=SUM(A1)'), '"\'=SUM(A1)"');
  assert.equal(csvCell(null), '""');
  assert.ok(makeCsv([['Model', 'Cost'], ['Sample', 2]]).includes('\r\n"Sample","2"'));
});
test('refresh changes identify actual tier fields and ignore source page hash churn', () => {
  const m = featuredModels[0];
  const snapshot: ProviderResult = { provider: m.provider, fetchedAt: '2026-11-13T00:00:00Z', rates: [{ model: m, rate: { input: 2, output: 10, scope: 'Standard', notes: [], tiers: [tier('standard', 2, 10)] }, sourceUrl: 'https://example.com', evidence: { excerpt: 'Example', sourceUrl: 'https://example.com', documentSha256: 'a' } }] };
  const next = structuredClone(snapshot); next.fetchedAt = '2026-11-13T01:00:00Z'; next.rates[0].evidence!.documentSha256 = 'b';
  assert.deepEqual(pricingChanges(snapshot, next), []);
  next.rates[0].rate.tiers![0].input = 3;
  const changes = pricingChanges(snapshot, next);
  assert.equal(changes.length, 1); assert.equal(changes[0].before, '$2'); assert.equal(changes[0].after, '$3');
  assert.match(changes[0].field, /input/);
});
