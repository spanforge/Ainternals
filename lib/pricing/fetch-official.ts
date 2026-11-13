import 'server-only';
import { createHash } from 'node:crypto';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { featuredModels, providers, selectionReviewedOn } from '@/config/featured-models';
import { officialSources, type Provider } from './official-sources';
import { OfficialProviderLoader } from './official-loader';
import { normalizeOfficial } from './normalize';
import { pricingChanges, type PricingChange } from './changes';

export const TTL_SECONDS = 3_600;
const loader = new OfficialProviderLoader();
const providerNames = Object.keys(providers) as Provider[];
let reviewAlertLogged = false;
export const providerCacheTag = (provider: Provider) => `official-prices:${provider}`;
const selectionHash = createHash('sha256').update(JSON.stringify({ featuredModels, officialSources, adapterVersion: 3 })).digest('hex');
const cachedProviders = Object.fromEntries(providerNames.map(provider => [provider, unstable_cache(() => loader.request(provider), ['official-prices-v1', provider, selectionHash], { revalidate: TTL_SECONDS, tags: [providerCacheTag(provider)] })])) as Record<Provider, () => ReturnType<OfficialProviderLoader['request']>>;

async function readProvider(provider: Provider) {
  try {
    const snapshot = await cachedProviders[provider]();
    loader.hydrate(snapshot);
    if (snapshot.rates.some(item => item.rate.validUntil && Date.now() >= Date.parse(item.rate.validUntil))) return await loader.request(provider);
    return snapshot;
  } catch {
    // Never fall back to another provider or an unrelated pricing feed.
    return loader.get(provider);
  }
}
export const getModelPrices = cache(async () => {
  const selectionReviewDue = Date.now() - Date.parse(selectionReviewedOn) >= 30 * 86400000;
  if (selectionReviewDue && !reviewAlertLogged) {
    console.warn(JSON.stringify({ event: 'model_selection_review_due', reviewedOn: selectionReviewedOn }));
    reviewAlertLogged = true;
  }
  const snapshots = await Promise.all(providerNames.map(readProvider));
  const issues: Provider[] = [];
  const models = providerNames.flatMap((provider, index) => {
    const snapshot = snapshots[index];
    const stale = Boolean(snapshot && (Date.now() - Date.parse(snapshot.fetchedAt) >= TTL_SECONDS * 1000 || loader.failed(provider) || snapshot.rates.some(item => item.rate.validUntil && Date.now() >= Date.parse(item.rate.validUntil))));
    if (!snapshot || stale) issues.push(provider);
    return featuredModels.filter(model => model.provider === provider).map(model => {
      const item = snapshot?.rates.find(item => item.model.modelId === model.modelId);
      return normalizeOfficial(model, item?.rate ?? null, item?.sourceUrl ?? providers[provider], item ? snapshot!.fetchedAt : null, stale, item?.evidence);
    });
  });
  const timestamps = snapshots.flatMap(s => s ? [s.fetchedAt] : []).sort();
  return { models, fetchedAt: timestamps[0] ?? null, issues, freshProviders: providerNames.length - issues.length, selectionReviewDue,
    status: timestamps.length === 0 ? 'unavailable' as const : issues.length ? 'stale' as const : 'available' as const };
});

export async function refreshModelPrices() {
  const previous = await Promise.all(providerNames.map(readProvider));
  const results = await Promise.allSettled(providerNames.map(provider => loader.request(provider)));
  const updatedProviders: Provider[] = [];
  const failedProviders: Provider[] = [];
  const changes: PricingChange[] = [];
  const timestamps: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') { failedProviders.push(providerNames[index]); return; }
    const next = result.value;
    timestamps.push(next.fetchedAt);
    if (next.fetchedAt !== previous[index]?.fetchedAt) updatedProviders.push(providerNames[index]);
    changes.push(...pricingChanges(previous[index], next));
  });
  return { outcome: updatedProviders.length ? 'checked' as const : 'recent' as const, changed: changes.length > 0, changes: changes.slice(0, 100), totalChanges: changes.length, fetchedAt: timestamps.sort()[0] ?? null, updatedProviders, failedProviders, checkedProviders: results.length - failedProviders.length };
}
