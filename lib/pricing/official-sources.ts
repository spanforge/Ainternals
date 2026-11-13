import { featuredModels, providers, type FeaturedModel } from '../../config/featured-models.ts';
import { parseOfficialRate, type OfficialRate } from './official-parsers.ts';
import { createHash } from 'node:crypto';
export type Provider = keyof typeof providers;
export const officialSources: Record<Provider, string[]> = {
  OpenAI: ['https://developers.openai.com/api/docs/pricing.md'],
  Anthropic: ['https://platform.claude.com/docs/en/about-claude/pricing.md'],
  Google: ['https://ai.google.dev/gemini-api/docs/pricing'],
  xAI: ['https://docs.x.ai/developers/models/grok-4.7.md'],
  DeepSeek: ['https://api-docs.deepseek.com/quick_start/pricing/'],
  Mistral: ['https://docs.mistral.ai/models/mistral-large-4-0.md', 'https://docs.mistral.ai/models/mistral-small-4-0-26-03.md'],
  'Alibaba Cloud': ['https://www.alibabacloud.com/help/en/model-studio/model-pricing'],
  'Moonshot AI': ['https://platform.kimi.ai/docs/pricing/chat'],
  MiniMax: ['https://platform.minimax.io/docs/pricing/overview.md'],
  'Z.ai': ['https://docs.z.ai/guides/overview/pricing.md'],
};
export type SourceEvidence = { excerpt: string; documentSha256: string; sourceUrl: string };
export type ProviderResult = { provider: Provider; fetchedAt: string; rates: { model: FeaturedModel; rate: OfficialRate; sourceUrl: string; evidence?: SourceEvidence }[] };
export async function fetchOfficialDocument(url: string, fetcher: typeof fetch = fetch): Promise<string> {
  const response = await fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Official pricing HTTP ${response.status}`);
  // Reject cross-owner redirects; Google officially redirects to AI Studio.
  const approvedHosts = new Set([new URL(url).hostname, ...(new URL(url).hostname === 'ai.google.dev' ? ['aistudio.google.com'] : [])]);
  if (response.url && !approvedHosts.has(new URL(response.url).hostname)) throw new Error('Unexpected pricing redirect');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty official response');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 3_000_000) throw new Error('Official response exceeds limit');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString('utf8');
}
export async function fetchOfficialProvider(provider: Provider, fetcher: typeof fetch = fetch, now = new Date()): Promise<ProviderResult> {
  const urls = officialSources[provider];
  const documents = await Promise.all(urls.map(url => fetchOfficialDocument(url, fetcher)));
  const rates = featuredModels.filter(model => model.provider === provider).map(model => {
    const index = provider === 'Mistral' && model.displayName === 'Mistral Small 4' ? 1 : 0;
    const rate = parseOfficialRate(model, documents[index], now);
    if (!rate.tiers) rate.tiers = [{ id: 'standard', label: rate.scope, input: rate.input, output: rate.output, minInput: 0, maxInput: null, processing: 'standard', region: 'default', period: 'any' }];
    for (const tier of rate.tiers) {
      if (![tier.input, tier.output, tier.minInput].every(value => Number.isFinite(value) && value >= 0) || tier.maxInput !== null && tier.maxInput < tier.minInput) throw new Error('Invalid published billing tier');
    }
    return { model, rate, sourceUrl: urls[index], evidence: { excerpt: (rate.evidenceText ?? rate.scope).slice(0, 2400), documentSha256: createHash('sha256').update(documents[index]).digest('hex'), sourceUrl: urls[index] } };
  });
  if (!rates.length) throw new Error('No configured models for provider');
  return { provider, rates, fetchedAt: new Date().toISOString() };
}
