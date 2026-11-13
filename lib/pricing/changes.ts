import type { ProviderResult } from './official-sources.ts';
export type PricingChange = { provider: string; modelId: string; model: string; field: string; before: string; after: string; previousFetchedAt: string | null; fetchedAt: string };
export function pricingChanges(previous: ProviderResult | null, next: ProviderResult): PricingChange[] {
  const changes: PricingChange[] = [];
  for (const item of next.rates) {
    const old = previous?.rates.find(row => row.model.modelId === item.model.modelId);
    const add = (field: string, before: string, after: string) => { if (before !== after) changes.push({ provider: next.provider, modelId: item.model.modelId, model: item.model.displayName, field, before, after, previousFetchedAt: previous?.fetchedAt ?? null, fetchedAt: next.fetchedAt }); };
    if (!old) { add('Snapshot', 'No prior official snapshot', 'Official rates retrieved'); continue; }
    const before = old.rate.tiers ?? [{ id: 'base', label: old.rate.scope, input: old.rate.input, output: old.rate.output }];
    const after = item.rate.tiers ?? [{ id: 'base', label: item.rate.scope, input: item.rate.input, output: item.rate.output }];
    for (const tier of after) {
      const prior = before.find(t => t.id === tier.id);
      if (!prior) { add(tier.label, 'Tier unavailable', `Input $${tier.input} / output $${tier.output} per 1M`); continue; }
      for (const field of ['input', 'output', 'cacheWrite5m', 'cacheWrite1h'] as const) {
        const a = field in prior ? (prior as unknown as Record<string, unknown>)[field] : undefined;
        const b = field in tier ? (tier as unknown as Record<string, unknown>)[field] : undefined;
        if (a !== b) add(`${tier.label} · ${field} / 1M`, a === undefined ? 'Not published' : `$${a}`, b === undefined ? 'Not published' : `$${b}`);
      }
      const conditions = (value: object) => JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key]) => !['input', 'output', 'cacheWrite5m', 'cacheWrite1h'].includes(key))));
      const describe = (value: object) => {
        const t = value as Record<string, unknown>;
        return [t.label, t.processing === 'batch' ? 'Batch processing' : 'Standard processing', t.region && t.region !== 'default' ? `${t.region} deployment` : 'Default deployment', t.period && t.period !== 'any' ? `${t.period} period` : '', typeof t.minInput === 'number' ? `Input range ${t.minInput.toLocaleString('en-US')}–${typeof t.maxInput === 'number' ? t.maxInput.toLocaleString('en-US') : 'no listed upper bound'}` : ''].filter(Boolean).join('; ');
      };
      if (conditions(prior) !== conditions(tier)) add(`${tier.label} · conditions`, describe(prior), describe(tier));
    }
    for (const tier of before) if (!after.some(t => t.id === tier.id)) add(tier.label, 'Published tier', 'Tier no longer parsed; review provider');
    add('Billing scope', old.rate.scope, item.rate.scope);
    add('Billing notes', old.rate.notes.join(' '), item.rate.notes.join(' '));
  }
  return changes;
}
