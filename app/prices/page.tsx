import type { Metadata } from 'next';
import { connection } from 'next/server';
import { providers, providerCatalogs, selectionReviewedOn } from '@/config/featured-models';
import { getModelPrices } from '@/lib/pricing/fetch-official';
import ModelPriceTable from '@/components/ModelPriceTable';
import RefreshPrices from '@/components/RefreshPrices';
import { parseBoardState } from '@/lib/pricing/share';
import styles from '@/components/Prices.module.css';
export const metadata: Metadata = {
  title: 'AI Model Price Watch | AInternals',
  description: 'Compare selected current AI API models using official provider pricing. USD per million text tokens, with billing tiers and source timestamps.',
  alternates: { canonical: '/prices' },
  openGraph: { title: 'AI Model Price Watch | AInternals', url: '/prices', description: 'Published API prices, not live market quotes.' },
};
export default async function PricesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const data = await getModelPrices();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) if (value !== undefined) params.set(key, Array.isArray(value) ? value[0] : value);
  // Server request time seeds client freshness checks without hydration drift.
  // eslint-disable-next-line react-hooks/purity
  const requestTime = Date.now();
  const initialState = parseBoardState(params, data.models.map(m => m.modelId), Object.keys(providers));
  const sourceControls = <>
    <div className={styles.statusBar}><span>USD / 1 million text tokens</span><span>{data.models.length} curated models · {Object.keys(providers).length} providers</span><span>Official sources · 1-hour cache</span></div>
    <RefreshPrices />
    <p className={styles.sourceSummary}>{data.freshProviders} of {Object.keys(providers).length} official sources current · {data.issues.length ? `${data.issues.length} need attention` : 'All selected providers available'}</p>
    {data.status === 'stale' && <p role="status" className={styles.warning}>Data may be stale or unavailable for: {data.issues.join(', ')}. Each row shows its official source and last successful fetch.</p>}
  </>;
  return <div className={`container ${styles.page}`}>
    <header className={styles.hero}>
      <p className="eyebrow">The economics of intelligence / Price watch</p>
      <h1>AI Model <em>Price Watch.</em></h1>
      <p className={styles.subtitle}>Official API prices. Practical cost comparisons.</p>
      <p className={styles.intro}>Calculate your token budget, shortlist current models, and share a comparison. No login.</p>
    </header>
    {data.status === 'unavailable' && <section className={styles.empty}><h2>Pricing is temporarily unavailable.</h2><p>We could not retrieve usable pricing data. Use the official provider links below to check current rates.</p></section>}
    <ModelPriceTable models={data.models} initialState={initialState} initialNow={requestTime} sourceControls={sourceControls} />
    <section className={styles.method} aria-labelledby="source-title">
      <div><p className="eyebrow">Source & freshness</p><h2 id="source-title">Direct from the providers.</h2><p>Rates are fetched from each provider’s official pricing documentation. Each model links to the document used and records its successful fetch time.</p>
      {data.fetchedAt && <p>Oldest successful provider fetch: <time dateTime={data.fetchedAt}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(data.fetchedAt))} UTC</time></p>}
      <p>Sources refresh on request after one hour, or with Refresh prices. A failed source keeps its last validated rates where available and is marked stale; missing rates show N/A.</p><p>Model selection reviewed against official catalogs: <time dateTime={selectionReviewedOn}>13 Nov 2026</time>. {data.selectionReviewDue ? 'Selection review due; check official catalogs for new releases.' : 'Selected current-generation models; not an exhaustive catalog.'}</p></div>
      <div><h3>Billing scope matters.</h3><p>Displayed rates apply to the context tier, region, peak period or promotion stated in each row. Cached input, cache writes, batch, priority and tool fees are separate unless stated. Final charges follow the provider’s current terms and your actual usage.</p><p>Model names and API identifiers are shown separately. Prices are published list rates, periodically retrieved from official sources.</p></div>
    </section>
    <section className={styles.official} aria-label="Official provider pricing"><h3>Official provider pricing</h3><div>{Object.entries(providers).map(([name, url]) => <a href={url} key={name}>{name} pricing ↗</a>)}</div><h3>Official model catalogs</h3><div>{Object.entries(providerCatalogs).map(([name, url]) => <a href={url} key={name}>{name} models ↗</a>)}</div></section>
  </div>;
}
