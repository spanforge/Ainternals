import assert from 'node:assert/strict';
import { providers, featuredModels } from '../config/featured-models.ts';
import { fetchOfficialProvider, type Provider } from '../lib/pricing/official-sources.ts';
import { normalizeOfficial } from '../lib/pricing/normalize.ts';
import { estimateModel, defaultWorkload } from '../lib/pricing/estimate.ts';
const results = await Promise.allSettled((Object.keys(providers) as Provider[]).map(provider => fetchOfficialProvider(provider)));
let verified = 0;
for (const [index, result] of results.entries()) {
  const provider = Object.keys(providers)[index];
  if (result.status === 'rejected') { console.error(provider, result.reason.message); continue; }
  for (const { model, rate, sourceUrl, evidence } of result.value.rates) {
    assert.ok(Number.isFinite(rate.input) && rate.input >= 0 && Number.isFinite(rate.output) && rate.output >= 0);
    assert.ok(evidence?.excerpt && /^[a-f0-9]{64}$/.test(evidence.documentSha256));
    assert.ok(rate.tiers?.length);
    if (model.modelId === 'qwen3.8-flash') for (const region of ['singapore', 'us', 'eu']) assert.ok(rate.tiers.some(t => t.region === region), `Missing reviewed Alibaba region: ${region}`);
    const normalized = normalizeOfficial(model, rate, sourceUrl, result.value.fetchedAt, false, evidence);
    const estimate = estimateModel(normalized, defaultWorkload);
    assert.notEqual(estimate.monthly, null, `${model.displayName}: default workload not estimated`);
    console.log(`${model.displayName}: $${rate.input} / $${rate.output} per 1M; ${rate.tiers.length} tiers; default monthly $${estimate.monthly} — ${sourceUrl}`);
    verified++;
  }
}
assert.equal(verified, featuredModels.length, `Only ${verified}/${featuredModels.length} models verified from official sources`);
console.log(`Verified ${verified} models directly from ${results.length} official providers.`);
