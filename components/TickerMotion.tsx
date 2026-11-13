'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type FocusEvent, type PointerEvent } from 'react';
import { formatPrice } from '@/lib/pricing/normalize';
import { tickerDuration, tickerStatus, type TickerItem } from '@/lib/pricing/ticker';
import styles from './Prices.module.css';

const PAUSE_KEY = 'ainternals-price-ticker-paused';
const PAUSE_EVENT = 'ainternals-ticker-pause-change';
let fallbackPause = false;
let fallbackCollapsed = false;
const COLLAPSE_KEY = 'ainternals-price-ticker-collapsed';
function collapseSnapshot() {
  try { const value = sessionStorage.getItem(COLLAPSE_KEY); return value === null ? fallbackCollapsed : value === 'true'; } catch { return fallbackCollapsed; }
}
function saveCollapsed(value: boolean) {
  fallbackCollapsed = value;
  try { sessionStorage.setItem(COLLAPSE_KEY, String(value)); } catch { /* Still works without storage. */ }
  window.dispatchEvent(new Event(PAUSE_EVENT));
}
function pauseSnapshot() {
  try { const value = sessionStorage.getItem(PAUSE_KEY); return value === null ? fallbackPause : value === 'true'; } catch { return fallbackPause; }
}
function subscribePause(callback: () => void) {
  window.addEventListener(PAUSE_EVENT, callback); window.addEventListener('storage', callback);
  return () => { window.removeEventListener(PAUSE_EVENT, callback); window.removeEventListener('storage', callback); };
}
function savePause(value: boolean) {
  fallbackPause = value;
  try { sessionStorage.setItem(PAUSE_KEY, String(value)); } catch { /* Controls remain usable when storage is blocked. */ }
  window.dispatchEvent(new Event(PAUSE_EVENT));
}
function useMedia(query: string) {
  return useSyncExternalStore(callback => {
    const media = window.matchMedia(query); media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
  }, () => window.matchMedia(query).matches, () => false);
}
export default function TickerMotion({ items, initialNow }: { items: TickerItem[]; initialNow: number }) {
  const paused = useSyncExternalStore(subscribePause, pauseSnapshot, () => false);
  const collapsed = useSyncExternalStore(subscribePause, collapseSnapshot, () => false);
  const compact = useMedia('(max-width: 1023px)');
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const [mobilePlaying, setMobilePlaying] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [duration, setDuration] = useState(72);
  const [clock, setClock] = useState(initialNow);
  const [active, setActive] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const manual = reducedMotion || focused || browsing || (compact && !mobilePlaying);
  const stopped = collapsed || paused || !visible || !pageVisible || hovered || manual;
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .01 });
    observer.observe(element);
    const resize = new ResizeObserver(() => { if (group.current) setDuration(tickerDuration(group.current.scrollWidth)); });
    if (group.current) resize.observe(group.current);
    const visibility = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', visibility);
    const timer = window.setInterval(() => setClock(Date.now()), 60000);
    return () => { observer.disconnect(); resize.disconnect(); document.removeEventListener('visibilitychange', visibility); window.clearInterval(timer); };
  }, []);
  function browse(index: number) {
    const next = Math.max(0, Math.min(items.length - 1, index));
    setMobilePlaying(false); setBrowsing(true); setActive(next);
    requestAnimationFrame(() => {
      const element = group.current?.children[next] as HTMLElement | undefined;
      if (element && viewport.current) viewport.current.scrollTo({ left: element.offsetLeft - group.current!.offsetLeft, behavior: 'auto' });
    });
  }
  function nearest() {
    const rail = viewport.current;
    if (!rail || !group.current) return 0;
    const edge = rail.getBoundingClientRect().left;
    const cards = Array.from(group.current.children);
    let best = 0, distance = Infinity;
    cards.forEach((card, index) => { const delta = Math.abs(card.getBoundingClientRect().left - edge); if (delta < distance) { distance = delta; best = index; } });
    return best;
  }
  function onFocus(event: FocusEvent<HTMLDivElement>) {
    setFocused(true);
    const target = event.target as HTMLElement;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' }));
  }
  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setFocused(false); if (!browsing && (!compact || mobilePlaying) && viewport.current) viewport.current.scrollLeft = 0; }
  }
  function onPointerDown(event: PointerEvent<HTMLDivElement>) { if (compact && mobilePlaying && event.pointerType !== 'mouse') browse(nearest()); }
  function toggleMotion() {
    if (browsing || (compact && !mobilePlaying)) { if (viewport.current) viewport.current.scrollLeft = 0; setBrowsing(false); setMobilePlaying(true); savePause(false); }
    else savePause(!paused);
  }
  const motionLabel = browsing || (compact && !mobilePlaying) ? 'Play ticker' : paused ? 'Resume ticker' : 'Pause ticker';
  return <div className={styles.tickerMotion}>
    <div className={`container ${styles.tickerControls}`}>
      <div className={styles.tickerButtons}>
        <div className={styles.tickerButtons} hidden={collapsed}>
        <button type="button" className={styles.browseTicker} aria-label="Previous featured model" onClick={() => browse(active - 1)} disabled={manual && active === 0}>←</button>
        {!reducedMotion && <button type="button" className={styles.pause} aria-pressed={compact && !mobilePlaying ? false : paused} onClick={toggleMotion}>{motionLabel}</button>}
        <button type="button" className={styles.browseTicker} aria-label="Next featured model" onClick={() => browse(manual ? active + 1 : nearest() + 1)} disabled={manual && active === items.length - 1}>→</button>
        </div>
        <button type="button" className={styles.collapseTicker} aria-expanded={!collapsed} aria-controls="site-price-ticker" onClick={() => saveCollapsed(!collapsed)}>{collapsed ? 'Show price ticker' : 'Hide ticker'}</button>
      </div>
    </div>
    <div id="site-price-ticker" hidden={collapsed} ref={viewport} className={styles.tickerViewport} data-manual={manual} data-mobile-play={mobilePlaying} role="region" aria-label="Featured AI model rates in USD per million text tokens; horizontally scrollable" tabIndex={0}
      onFocusCapture={onFocus} onBlurCapture={onBlur} onPointerDown={onPointerDown}
      onMouseEnter={() => { if (!compact) setHovered(true); }} onMouseLeave={() => setHovered(false)}
      onScroll={() => { if (manual) setActive(nearest()); }}>
      <div className={styles.tickerTrack} style={{ '--ticker-duration': `${duration}s`, animationPlayState: stopped ? 'paused' : 'running' } as CSSProperties}>
        {[0, 1].map(copy => <div key={copy} ref={copy === 0 ? group : undefined} className={styles.tickerGroup} aria-hidden={copy === 1 ? true : undefined}>
          {items.map(item => {
            const status = tickerStatus(item, clock);
            const unavailable = status === 'unavailable';
            return <Link key={item.modelId} href={item.href} prefetch={false} tabIndex={copy === 1 ? -1 : 0} className={styles.quote} data-provider={item.provider} data-model={item.modelId} data-status={status}
              title={`${item.displayName}: USD per million text tokens. ${item.qualifier}. ${item.fetchedAt ? `Fetched ${item.fetchedAt}` : 'No successful source fetch'}.`}>
              <b><i aria-hidden="true" />{item.provider} · {item.displayName}<span aria-hidden="true">↗</span></b>
              <span className={styles.tickerRates}>{unavailable ? 'Rates unavailable' : <>IN <em>{formatPrice(item.input)}</em> <span className={styles.quoteDivider}>/</span> OUT <em className={styles.quoteOutput}>{formatPrice(item.output)}</em></>}</span>
              <span className={styles.quoteMeta}><small>{unavailable ? 'Check official source' : item.qualifier}</small><span className={styles.quoteStatus}>{status === 'fresh' ? 'Current' : status === 'stale' ? 'Stale' : 'Unavailable'}</span></span>
            </Link>;
          })}
        </div>)}
      </div>
    </div>
  </div>;
}
