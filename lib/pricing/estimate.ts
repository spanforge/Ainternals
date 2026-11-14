import type { ModelPrice } from './normalize.ts';
import { priceStatus } from './freshness.ts';
import type { BillingTier } from './official-parsers.ts';
export type Workload = { input: number; output: number; requests: number; processing: 'standard' | 'batch'; region: 'singapore' | 'us' | 'eu'; period: 'peak' | 'off-peak'; kimiTtl: '5m' | '1h' };
export const defaultWorkload: Workload = { input: 4000, output: 1000, requests: 10000, processing: 'standard', region: 'singapore', period: 'peak', kimiTtl: '5m' };
export type Estimate = { monthly: number | null; perRequest: number | null; inputCost: number | null; outputCost: number | null; writeCost: number | null; tier: BillingTier | null; reason: string | null; notes: string[] };
export function workloadError(w: Workload): string | null {
  if (!Number.isSafeInteger(w.input) || w.input < 1 || w.input > 10000000) return 'Input tokens must be a whole number between 1 and 10,000,000.';
  if (!Number.isSafeInteger(w.output) || w.output < 0 || w.output > 10000000) return 'Output tokens must be a whole number between 0 and 10,000,000.';
  if (!Number.isSafeInteger(w.requests) || w.requests < 0 || w.requests > 1000000000) return 'Monthly requests must be a whole number between 0 and 1,000,000,000.';
  if (!['standard', 'batch'].includes(w.processing) || !['singapore', 'us', 'eu'].includes(w.region) || !['peak', 'off-peak'].includes(w.period) || !['5m', '1h'].includes(w.kimiTtl)) return 'Choose valid billing options.';
  return null;
}
export function estimateModel(model: ModelPrice, w: Workload, now = Date.now()): Estimate {
  const unavailable = (reason: string): Estimate => ({ monthly: null, perRequest: null, inputCost: null, outputCost: null, writeCost: null, tier: null, reason, notes: [] });
  const error = workloadError(w);
  if (error) return unavailable(error);
  if (priceStatus(model,now) !== 'fresh') return unavailable('Fresh official pricing is required. Refresh prices to estimate.');
  if (model.validUntil && now >= Date.parse(model.validUntil)) return unavailable('Published pricing has expired. Refresh prices.');
  if (model.contextWindow && w.input + w.output > model.contextWindow) return unavailable(`Input plus output exceeds the reviewed ${model.contextWindow.toLocaleString('en-US')}-token context window.`);
  if (model.maxOutput && w.output > model.maxOutput) return unavailable(`Output exceeds the reviewed ${model.maxOutput.toLocaleString('en-US')}-token limit.`);
  const choices = model.tiers.filter(t => t.processing === w.processing && w.input >= t.minInput && (t.maxInput === null || w.input <= t.maxInput) && (t.region === 'default' || t.region === w.region) && (t.period === 'any' || t.period === w.period));
  if (choices.length !== 1) return unavailable(w.processing === 'batch' ? 'No validated batch price for this workload.' : model.provider === 'Alibaba Cloud' ? 'No validated price for this deployment and request size.' : 'No unique published tier for this request size.');
  const tier = choices[0];
  const inputCost = w.input * tier.input / 1e6 * w.requests;
  const outputCost = w.output * tier.output / 1e6 * w.requests;
  let writeCost = 0;
  if (model.provider === 'Moonshot AI') {
    const writeRate = w.kimiTtl === '5m' ? tier.cacheWrite5m : tier.cacheWrite1h;
    if (writeRate === undefined) return unavailable('Cache-write pricing for this Kimi billing option has not been validated.');
    writeCost = w.input * writeRate / 1e6 * w.requests;
  }
  const monthly = inputCost + outputCost + writeCost;
  if (![inputCost, outputCost, writeCost, monthly].every(Number.isFinite)) return unavailable('This workload exceeds the supported calculation range.');
  const notes = ['Uncached text input and billed output tokens. Taxes, tools, retries and subscription plans excluded.'];
  if (!model.contextWindow) notes.push('Context capacity is unknown here; confirm the total request limit with the provider.');
  if (!model.maxOutput) notes.push('Output capacity is unknown here; confirm the output limit with the provider.');
  if (model.provider === 'Moonshot AI') notes.push(`Includes ${w.kimiTtl} cache writes for all uncached input tokens; no cache-hit savings assumed.`);
  if (model.provider === 'DeepSeek') notes.push(`${w.period} scenario for every request; scheduling and Chinese holiday eligibility are your responsibility.`);
  return { monthly, perRequest: w.requests ? monthly / w.requests : (w.input * (tier.input + (model.provider === 'Moonshot AI' ? (w.kimiTtl === '5m' ? tier.cacheWrite5m! : tier.cacheWrite1h!) : 0)) + w.output * tier.output) / 1e6, inputCost, outputCost, writeCost, tier, reason: null, notes };
}
