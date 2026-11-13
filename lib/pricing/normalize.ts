import { providers, type FeaturedModel } from '../../config/featured-models.ts';
import type { OfficialRate, BillingTier } from './official-parsers.ts';
import type { SourceEvidence } from './official-sources.ts';
export type ModelPrice = FeaturedModel & {
  inputUsdPerMillion: number | null; outputUsdPerMillion: number | null;
  pricingStatus: 'standard' | 'special' | 'unavailable'; pricingNote: string;
  source: string; sourceUrl: string; providerPricingUrl: string; warnings: string[];
  rateScope?: string;
  fetchedAt: string | null; sourceStatus: 'fresh' | 'stale' | 'unavailable';
  tiers: BillingTier[]; contextWindow?: number; maxOutput?: number; validUntil?: string; evidence?: SourceEvidence;
};
export function formatPrice(value: number | null): string {
  return value === null ? 'N/A' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(value);
}
export function normalizeOfficial(model: FeaturedModel, rate: OfficialRate | null, sourceUrl: string, fetchedAt: string | null, stale = false, evidence?: SourceEvidence): ModelPrice {
  if (rate && (![rate.input, rate.output].every(value => Number.isFinite(value) && value >= 0) || !rate.scope)) throw new Error('Invalid official rate');
  const expired = Boolean(rate?.validUntil && Date.now() >= Date.parse(rate.validUntil));
  if (expired) rate = null;
  return { ...model, inputUsdPerMillion: rate?.input ?? null, outputUsdPerMillion: rate?.output ?? null,
    pricingStatus: rate ? 'special' : 'unavailable', pricingNote: rate ? `Qualified rate — ${rate.scope}` : 'Official pricing unavailable — see provider',
    source: `${model.provider} official pricing`, sourceUrl, providerPricingUrl: providers[model.provider], rateScope: rate?.scope,
    warnings: [...(rate?.notes ?? []), ...(expired ? ['The published pricing period has ended; a fresh official rate is required.'] : []), ...(stale ? ['Data may be stale. The latest official source check did not produce a fresh validated snapshot.'] : [])],
    tiers: rate?.tiers ?? (rate ? [{ id: 'standard', label: rate.scope, input: rate.input, output: rate.output, minInput: 0, maxInput: null, processing: 'standard', region: 'default', period: 'any' }] : []), contextWindow: rate?.contextWindow, maxOutput: rate?.maxOutput, validUntil: rate?.validUntil, evidence,
    fetchedAt, sourceStatus: rate ? stale ? 'stale' : 'fresh' : 'unavailable' };
}
