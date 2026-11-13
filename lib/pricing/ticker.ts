import { tickerModelIds } from '../../config/ticker-models.ts';
import type { ModelPrice } from './normalize.ts';
import { defaultWorkload } from './estimate.ts';
import { serializeBoardState } from './share.ts';
export const TICKER_PIXELS_PER_SECOND = 40;
export type TickerItem = {
  modelId: string; provider: string; displayName: string; input: number | null; output: number | null;
  qualifier: string; href: string; fetchedAt: string | null; sourceStatus: ModelPrice['sourceStatus']; validUntil?: string;
};
export function selectTickerModels(models: ModelPrice[]): ModelPrice[] {
  const selected = tickerModelIds.map(id => models.find(model => model.modelId === id)).filter((model): model is ModelPrice => Boolean(model));
  return selected.filter((model, index) => selected.findIndex(other => other.provider === model.provider) === index);
}
export function tickerDuration(width: number): number { return Math.max(1, width / TICKER_PIXELS_PER_SECOND); }
export function tickerStatus(item: TickerItem, now: number): ModelPrice['sourceStatus'] {
  if (item.validUntil && now >= Date.parse(item.validUntil)) return 'unavailable';
  if (item.sourceStatus === 'unavailable' || item.fetchedAt === null || !Number.isFinite(Date.parse(item.fetchedAt))) return 'unavailable';
  return item.sourceStatus === 'stale' || now - Date.parse(item.fetchedAt) >= 3600000 ? 'stale' : 'fresh';
}
export function makeTickerItem(model: ModelPrice): TickerItem {
  const base = model.tiers.find(t => t.processing === 'standard' && defaultWorkload.input >= t.minInput && (t.maxInput === null || defaultWorkload.input <= t.maxInput) && (t.region === 'default' || t.region === defaultWorkload.region) && (t.period === 'any' || t.period === defaultWorkload.period));
  let qualifier = 'Standard · uncached';
  if (base?.maxInput !== null && base?.maxInput !== undefined) {
    const max = base.maxInput;
    const strict = (max + 1) % 1000 === 0;
    qualifier = `${strict ? '<' : '≤'}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format((strict ? max + 1 : max) / 1000)}K input`;
  }
  if (model.provider === 'Google') qualifier = model.validUntil ? `Promo to ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.parse(model.validUntil) - 1))}` : 'Paid tier · uncached';
  if (model.provider === 'DeepSeek') qualifier = 'Peak · uncached';
  if (model.provider === 'Alibaba Cloud') qualifier = 'Singapore · International';
  if (model.provider === 'Moonshot AI') qualifier = 'Base rate + cache writes';
  if (!base) qualifier = 'See billing details';
  const href = `/prices?${serializeBoardState({ workload: { ...defaultWorkload }, query: model.modelId, provider: model.provider, selected: [model.modelId], sort: 'monthly', ascending: true })}#shortlist`;
  return { modelId: model.modelId, provider: model.provider, displayName: model.displayName, input: base?.input ?? model.inputUsdPerMillion, output: base?.output ?? model.outputUsdPerMillion, qualifier, href, fetchedAt: model.fetchedAt, sourceStatus: model.sourceStatus, validUntil: model.validUntil };
}
