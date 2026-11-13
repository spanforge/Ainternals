import assert from 'node:assert/strict';
import { test } from 'node:test';
import { featuredModels } from '../config/featured-models.ts';
import { normalizeOfficial } from '../lib/pricing/normalize.ts';
import { makeTickerItem, selectTickerModels, tickerDuration, tickerStatus } from '../lib/pricing/ticker.ts';
import { parseBoardState } from '../lib/pricing/share.ts';
import { defaultWorkload } from '../lib/pricing/estimate.ts';
const now = Date.now();
const models = featuredModels.map(model => normalizeOfficial(model, { input: 0, output: 2, scope: 'Standard', notes: [] }, 'https://example.com', new Date(now).toISOString()));
test('ticker features exactly one model for each of the ten providers', () => {
  const selected = selectTickerModels(models);
  assert.equal(selected.length, 10);
  assert.equal(new Set(selected.map(m => m.provider)).size, 10);
  assert.deepEqual(selectTickerModels([]), []);
});
test('ticker links restore the selected model and the displayed billing scope', () => {
  for (const model of selectTickerModels(models)) {
    const item = makeTickerItem(model);
    const url = new URL(item.href, 'https://example.com');
    const state = parseBoardState(url.searchParams, models.map(m => m.modelId), models.map(m => m.provider));
    assert.deepEqual(state.workload, defaultWorkload);
    assert.deepEqual(state.selected, [model.modelId]);
    assert.equal(state.query, model.modelId);
    assert.equal(state.provider, model.provider);
    assert.equal(url.hash, '#shortlist');
    assert.equal(item.input, 0, 'a free rate must remain zero');
  }
});
test('ticker freshness is evaluated per item and expires promotional rates', () => {
  const item = makeTickerItem(models[0]);
  assert.equal(tickerStatus(item, now), 'fresh');
  assert.equal(tickerStatus(item, now + 3600000), 'stale');
  assert.equal(tickerStatus({ ...item, sourceStatus: 'stale' }, now), 'stale');
  assert.equal(tickerStatus({ ...item, fetchedAt: null }, now), 'unavailable');
  assert.equal(tickerStatus({ ...item, fetchedAt: 'invalid' }, now), 'unavailable');
  assert.equal(tickerStatus({ ...item, validUntil: new Date(now).toISOString() }, now), 'unavailable');
});
test('ticker duration preserves forty pixels per second at every rail width', () => {
  assert.equal(tickerDuration(3400), 85);
  assert.equal(tickerDuration(6800), 170);
  assert.equal(tickerDuration(0), 1);
});
