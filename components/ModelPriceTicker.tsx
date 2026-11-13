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
    {items.length > 0 && <TickerMotion items={items} initialNow={requestTime} />}
  </section>;
}
