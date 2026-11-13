import { fetchOfficialProvider, type Provider, type ProviderResult } from './official-sources.ts';
export const REFRESH_COOLDOWN_MS = 60_000;
export const FAILURE_COOLDOWN_MS = 300_000;
export class OfficialProviderLoader {
  private snapshots = new Map<Provider, ProviderResult>();
  private retryAfter = new Map<Provider, number>();
  private pending = new Map<Provider, Promise<ProviderResult>>();
  private fetchProvider: (provider: Provider) => Promise<ProviderResult>;
  private now: () => number;
  constructor(fetchProvider: (provider: Provider) => Promise<ProviderResult> = fetchOfficialProvider, now = Date.now) {
    this.fetchProvider = fetchProvider;
    this.now = now;
  }
  get(provider: Provider) { return this.snapshots.get(provider) ?? null; }
  failed(provider: Provider) { return (this.retryAfter.get(provider) ?? 0) > this.now(); }
  hydrate(snapshot: ProviderResult) {
    if (Date.parse(snapshot.fetchedAt) >= Date.parse(this.get(snapshot.provider)?.fetchedAt ?? '1970-01-01')) this.snapshots.set(snapshot.provider, snapshot);
  }
  async request(provider: Provider): Promise<ProviderResult> {
    const prior = this.get(provider);
    if (this.failed(provider)) throw new Error('Provider retry cooldown');
    const expired = prior?.rates.some(item => item.rate.validUntil && this.now() >= Date.parse(item.rate.validUntil));
    if (prior && !expired && this.now() - Date.parse(prior.fetchedAt) < REFRESH_COOLDOWN_MS) return prior;
    const pending = this.pending.get(provider);
    if (pending) return pending;
    const operation = this.fetchProvider(provider).then(snapshot => {
      this.hydrate(snapshot);
      this.retryAfter.delete(provider);
      return snapshot;
    }).catch(() => {
      console.error(JSON.stringify({ event: 'official_pricing_check_failed', provider, retainedSnapshot: Boolean(this.get(provider)), retrySeconds: FAILURE_COOLDOWN_MS / 1000 }));
      this.retryAfter.set(provider, this.now() + FAILURE_COOLDOWN_MS);
      throw new Error(`${provider} official pricing check failed`);
    }).finally(() => this.pending.delete(provider));
    this.pending.set(provider, operation);
    return operation;
  }
}
