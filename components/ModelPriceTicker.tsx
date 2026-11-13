import Link from 'next/link';
import { getModelPrices } from '@/lib/pricing/fetch-official';
import { makeTickerItem, selectTickerModels } from '@/lib/pricing/ticker';
import styles from './Prices.module.css';
import TickerMotion from './TickerMotion';
export default async function ModelPriceTicker() {
  const data = await getModelPrices();
  const items = selectTickerModels(data.models).map(makeTickerItem);
  // This async Server Component captures request time for the client's initial freshness labels.
  // eslint-disable-next-line react-hooks/purity
  const requestTime = Date.now();
  return <section className={styles.ticker} aria-label="AI API price watch">
    <div className={`container ${styles.tickerHeader}`}><Link href="/prices">AI Model Price Watch ↗</Link><span>{items.length} featured providers · {data.status === 'stale' ? 'Some sources need attention' : data.status === 'unavailable' ? 'Pricing temporarily unavailable' : 'Official published API prices'}</span></div>
    {items.length > 0 && <TickerMotion items={items} initialNow={requestTime} />}
    <p className={`container ${styles.tickerFoot}`}>Official provider list prices · USD per 1M text tokens · Rates apply to the stated scope. <Link href="/prices">Compare all {data.models.length} models →</Link></p>
  </section>;
}
