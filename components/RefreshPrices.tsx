'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { refreshPrices } from '@/app/prices/actions';
import styles from './Prices.module.css';
import type { PricingChange } from '@/lib/pricing/changes';
export default function RefreshPrices() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('Check official provider prices. Recent checks are shared for 60 seconds.');
  const router = useRouter();
  const [changes, setChanges] = useState<PricingChange[]>([]);
  function refresh() {
    startTransition(async () => {
      try {
        const result = await refreshPrices();
        if (!result.ok) { setMessage(result.message); return; }
        setChanges(result.changes);
        const time = result.fetchedAt ? new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' }).format(new Date(result.fetchedAt)) : null;
        setMessage(result.failedProviders.length ? `Official checks succeeded for ${result.checkedProviders} providers. Could not check ${result.failedProviders.join(', ')}; their previous rates are retained where available. Try those sources again in five minutes.` : result.outcome === 'recent' ? `Sources checked recently at ${time}. Another official check is available after 60 seconds.` : result.changed ? `Sources checked at ${time}. Published rates or billing notes changed; the board has been updated.` : `Sources checked at ${time}. No changes in published pricing.`);
        router.refresh();
      } catch { setMessage('Refresh could not complete. Your displayed prices are unchanged. Please try again.'); }
    });
  }
  return <><div className={styles.refreshControls}><button disabled={pending} onClick={refresh} aria-busy={pending}>{pending ? '↻ Checking source…' : '↻ Refresh prices'}</button><p role="status" aria-live="polite">{pending ? 'Checking the pricing source…' : message}</p></div>{changes.length > 0 && <details className={styles.changeList} open><summary>{changes.length} observed changes since the previous source check</summary><ul>{changes.map((change, index) => <li key={`${change.modelId}-${index}`}><strong>{change.model} · {change.field}</strong><span>{change.before || 'No note'} → {change.after || 'No note'}</span></li>)}</ul></details>}</>;
}
