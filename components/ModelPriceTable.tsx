'use client';
import { useEffect, useMemo, useState, type ReactNode, type MouseEvent } from 'react';
import { formatPrice, type ModelPrice } from '@/lib/pricing/normalize';
import { estimateModel, workloadError, type Workload } from '@/lib/pricing/estimate';
import { makeCsv, parseBoardState, serializeBoardState, type BoardState } from '@/lib/pricing/share';
import { applyPreset, matchingPreset, workloadPresets, type PresetId } from '@/lib/pricing/presets';
import { tcoModelLink } from '@/lib/tco/pricing';
import styles from './Prices.module.css';

function fetchedLabel(model: ModelPrice) {
  return model.fetchedAt ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(model.fetchedAt)) + ' UTC' : 'No successful fetch';
}
function BillingDetails({ model }: { model: ModelPrice }) {
  return <details className={styles.billingDetails}><summary>Billing & source details</summary>
    <p>{model.pricingNote}</p>{model.warnings.map(note => <p key={note}>{note}</p>)}
    <p>Fetched: <time dateTime={model.fetchedAt ?? undefined}>{fetchedLabel(model)}</time> · {model.sourceStatus === 'fresh' ? 'Current snapshot' : model.sourceStatus === 'stale' ? 'Data may be stale' : 'Source unavailable'}</p>
    <a className={styles.providerLink} href={model.sourceUrl}>Official source ↗</a>
    {model.evidence && <><p>Extracted source evidence:</p><pre>{model.evidence.excerpt}</pre><p>Source document SHA-256:</p><code className={styles.hash}>{model.evidence.documentSha256}</code></>}
  </details>;
}

export default function ModelPriceTable({ models, initialState, initialNow, sourceControls }: { models: ModelPrice[]; initialState?: BoardState; initialNow?: number; sourceControls?: ReactNode }) {
  const initial = initialState ?? parseBoardState(new URLSearchParams(), models.map(m => m.modelId), models.map(m => m.provider));
  const [workload, setWorkload] = useState<Workload>(initial.workload);
  const [presetId, setPresetId] = useState<PresetId>(() => matchingPreset(initial.workload));
  const [query, setQuery] = useState(initial.query);
  const [provider, setProvider] = useState(initial.provider);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [sort, setSort] = useState<BoardState['sort']>(initial.sort);
  const [ascending, setAscending] = useState(initial.ascending);
  const [notice, setNotice] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [clock, setClock] = useState(() => initialNow ?? Date.now());
  const error = workloadError(workload);
  const state: BoardState = { workload, query, provider, selected, sort, ascending };
  const stateQuery = serializeBoardState(state);
  useEffect(() => {
    if (!error) window.history.replaceState(null, '', `${window.location.pathname}?${stateQuery}`);
  }, [stateQuery, error]);
  useEffect(() => {
    const restore = () => {
      const state = parseBoardState(new URLSearchParams(window.location.search), models.map(m => m.modelId), models.map(m => m.provider));
      setWorkload(state.workload); setPresetId(matchingPreset(state.workload)); setQuery(state.query); setProvider(state.provider); setSelected(state.selected); setSort(state.sort); setAscending(state.ascending);
    };
    window.addEventListener('popstate', restore);
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => { window.removeEventListener('popstate', restore); window.clearInterval(timer); };
  }, [models]);
  const estimates = useMemo(() => new Map(models.map(model => [model.modelId, estimateModel(model, workload, clock)])), [models, workload, clock]);
  const value = (model: ModelPrice, key: BoardState['sort']): string | number | null => {
    const estimate = estimates.get(model.modelId)!;
    if (key === 'input') return estimate.tier?.input ?? null;
    if (key === 'output') return estimate.tier?.output ?? null;
    if (key === 'monthly') return estimate.monthly;
    return model[key];
  };
  const visible = models.filter(model => (provider === 'All providers' || model.provider === provider) && `${model.displayName} ${model.modelId} ${model.provider}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
    const left = value(a, sort), right = value(b, sort);
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right))) * (ascending ? 1 : -1);
  });
  const compared = selected.map(id => models.find(model => model.modelId === id)).filter((m): m is ModelPrice => Boolean(m));
  const estimateCount = models.filter(m => estimates.get(m.modelId)?.monthly !== null).length;
  function changeSort(key: BoardState['sort']) { if (sort === key) setAscending(!ascending); else { setSort(key); setAscending(true); } }
  function toggle(model: ModelPrice) {
    if (selected.includes(model.modelId)) setSelected(selected.filter(id => id !== model.modelId));
    else if (selected.length < 4) setSelected([...selected, model.modelId]);
    else setNotice('Compare up to four models. Remove one to choose another.');
  }
  function update<K extends keyof Workload>(key: K, next: Workload[K]) {
    setWorkload(w => ({ ...w, [key]: next }));
    if (['input', 'output', 'requests'].includes(key)) setPresetId('custom');
  }
  function choosePreset(id: PresetId) {
    setWorkload(w => applyPreset(w, id)); setPresetId(id);
    if (id === 'custom') document.getElementById('workload-input')?.focus();
  }
  function jumpTo(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const target = document.getElementById(id);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  async function share() {
    const url = `${window.location.origin}${window.location.pathname}?${stateQuery}`;
    setShareUrl(url);
    try { await navigator.clipboard.writeText(url); setNotice('Comparison link copied. It restores your workload, filters and selected models; prices are checked again when opened.'); }
    catch { setNotice('Your comparison link is ready below. Select and copy it.'); }
  }
  function exportCsv() {
    const dollars = (value: number | null) => value === null ? null : Number(value.toFixed(6));
    const rows: unknown[][] = [['Provider', 'Model', 'API ID', 'Input tokens/request', 'Output tokens/request', 'Requests/month', 'Processing', 'Alibaba region', 'DeepSeek period', 'Kimi cache TTL', 'Applied tier', 'Input USD/1M', 'Output USD/1M', 'Monthly input USD', 'Monthly output USD', 'Monthly cache writes USD', 'Monthly estimate USD', 'Estimate status', 'Context window', 'Fetched UTC', 'Official source', 'Source SHA256', 'Exclusions']];
    for (const model of visible) {
      const e = estimates.get(model.modelId)!;
      rows.push([model.provider, model.displayName, model.modelId, workload.input, workload.output, workload.requests, workload.processing, workload.region, workload.period, workload.kimiTtl, e.tier?.label, e.tier?.input, e.tier?.output, dollars(e.inputCost), dollars(e.outputCost), dollars(e.writeCost), dollars(e.monthly), e.reason ?? 'Estimated', model.contextWindow, model.fetchedAt, model.sourceUrl, model.evidence?.documentSha256, [...e.notes, ...model.warnings].join(' ')]);
    }
    const url = URL.createObjectURL(new Blob([makeCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'ainternals-ai-cost-comparison.csv'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${visible.length} visible models with workload assumptions and source timestamps.`);
  }
  const columns: [BoardState['sort'], string][] = [['provider', 'Provider'], ['displayName', 'Model'], ['input', 'Input / 1M'], ['output', 'Output / 1M'], ['monthly', 'Est. / month']];
  return <>
    <nav className={styles.jumpNav} aria-label="Price Watch shortcuts">
      <a href="#price-results" onClick={e => jumpTo(e, 'price-results')}>View cost results</a>
      <a href="#shortlist" onClick={e => jumpTo(e, 'shortlist')}>View shortlist ({selected.length})</a>
      <a href="#calculator-title" onClick={e => jumpTo(e, 'calculator-title')}>Edit workload</a>
    </nav>
    <section className={styles.calculator} aria-labelledby="calculator-title">
      <div className={styles.calculatorHeading}><div><p className="eyebrow">Plan your API budget</p><h2 id="calculator-title" tabIndex={-1} className={styles.jumpTarget}>What would your workload cost?</h2></div><span>USD · text tokens · no login</span></div>
      <div className={styles.presetButtons} role="group" aria-label="Example workload presets">
        {workloadPresets.map(preset => <button key={preset.id} type="button" aria-pressed={presetId === preset.id} onClick={() => choosePreset(preset.id)}>{preset.label}</button>)}
        <button type="button" aria-pressed={presetId === 'custom'} onClick={() => choosePreset('custom')}>Custom</button>
      </div>
      <label className={styles.presetSelect}>Starting workload<select aria-label="Workload preset" value={presetId} onChange={e => choosePreset(e.target.value as PresetId)}><option value="custom">Custom values</option>{workloadPresets.map(preset => <option key={preset.id} value={preset.id}>{preset.label} example</option>)}</select></label>
      <div className={styles.workloadGrid}>
        {([['input', 'Input tokens / request'], ['output', 'Billed output tokens / request'], ['requests', 'Requests / month']] as const).map(([key, label]) => <label key={key}>{label}<input id={`workload-${key}`} type="number" min={key === 'input' ? 1 : 0} max={key === 'requests' ? 1000000000 : 10000000} step="1" value={Number.isFinite(workload[key]) ? workload[key] : ''} onChange={e => update(key, e.target.value === '' ? NaN : Number(e.target.value))} aria-invalid={Boolean(error)} aria-describedby={error ? 'workload-error' : 'preset-assumptions workload-help'} /></label>)}
      </div>
      <p id="preset-assumptions" className={styles.presetHelp} role="status">{workloadPresets.find(p => p.id === presetId)?.description ?? 'Custom assumptions: edit the token counts and monthly volume above.'} Billing options stay unchanged.</p>
      <details className={styles.billingOptions}><summary>Billing options: {workload.processing === 'standard' ? 'Standard API' : 'Batch API'} · {workload.period === 'peak' ? 'peak' : 'off-peak'} scenario</summary><div className={styles.optionGrid}>
        <label>Processing<select id="workload-processing" value={workload.processing} onChange={e => update('processing', e.target.value as Workload['processing'])}><option value="standard">Standard API</option><option value="batch">Batch (validated providers only)</option></select></label>
        <label>Alibaba deployment<select id="workload-region" value={workload.region} onChange={e => update('region', e.target.value as Workload['region'])}><option value="singapore">Singapore / International</option><option value="us">Virginia / US</option><option value="eu">Frankfurt / EU</option></select></label>
        <label>DeepSeek billing period<select id="workload-period" value={workload.period} onChange={e => update('period', e.target.value as Workload['period'])}><option value="peak">Peak (conservative)</option><option value="off-peak">Off-peak (if eligible)</option></select></label>
        <label>Kimi cache-write TTL<select id="workload-kimiTtl" value={workload.kimiTtl} onChange={e => update('kimiTtl', e.target.value as Workload['kimiTtl'])}><option value="5m">5 minutes (default)</option><option value="1h">1 hour</option></select></label>
      </div><p>Region applies to Alibaba only; DeepSeek period is a scenario, not automatic scheduling. Other providers use their published default deployment. Regional uplifts, where applicable, are excluded.</p></details>
      {error && <p id="workload-error" role="alert" className={styles.special}>{error}</p>}
      <p id="workload-help" className={styles.calcHelp}>Estimates assume all input is uncached and output includes billed reasoning tokens. Kimi estimates include the selected cache-write charges. Taxes, tools, retries, cache-hit savings, regional uplifts and subscriptions are excluded. Check model capacity where no reviewed limit is shown.</p>
      <div className={styles.actionBar}><span role="status">{error ? 'Fix workload inputs to estimate' : `${estimateCount} of ${models.length} models estimated for this workload`}</span><button onClick={share} disabled={Boolean(error)}>Copy comparison link</button><button onClick={exportCsv} disabled={Boolean(error)}>Export visible models CSV</button></div>
      <p role="status" className={styles.notice}>{notice}</p>
      {shareUrl && <label className={styles.shareField}>Share this comparison<input readOnly value={shareUrl} onFocus={e => e.target.select()} /></label>}
    </section>
    {sourceControls}
    <section id="shortlist" tabIndex={-1} className={`${styles.comparison} ${styles.jumpTarget}`} aria-labelledby="compare-title">
      <div className={styles.marketHeading}><h2 id="compare-title">Your shortlist <span>{selected.length}/4</span></h2>{selected.length > 0 && <button className={styles.textButton} onClick={() => setSelected([])}>Clear selection</button>}</div>
      {compared.length ? <><p className={styles.calcHelp}>{compared.length === 1 ? 'Add another model for a side-by-side comparison.' : 'Same workload and billing options, with model-specific tiers applied. Price alone does not measure model quality.'}</p><div className={styles.compareGrid}>{compared.map(model => {
        const e = estimates.get(model.modelId)!;
        return <article key={model.modelId} className={styles.compareCard} data-provider={model.provider}>
          <div className={styles.cardTop}><span className={styles.provider}>{model.provider}</span><button className={styles.textButton} onClick={() => toggle(model)} aria-label={`Remove ${model.displayName} from comparison`}>Remove</button></div><h3>{model.displayName}</h3><code>{model.modelId}</code><strong className={styles.monthly}>{e.monthly === null ? 'Not estimated' : formatPrice(e.monthly)}<small>{e.monthly === null ? '' : '/ month'}</small></strong>
          <p className={styles.appliedTier}>{e.reason ?? e.tier?.label}</p><dl><div><dt>Per request</dt><dd>{formatPrice(e.perRequest)}</dd></div><div><dt>Input / 1M</dt><dd>{formatPrice(e.tier?.input ?? null)}</dd></div><div><dt>Output / 1M</dt><dd>{formatPrice(e.tier?.output ?? null)}</dd></div><div><dt>Monthly input</dt><dd>{formatPrice(e.inputCost)}</dd></div><div><dt>Monthly output</dt><dd>{formatPrice(e.outputCost)}</dd></div>{model.provider === 'Moonshot AI' && <div><dt>Monthly cache writes</dt><dd>{formatPrice(e.writeCost)}</dd></div>}<div><dt>Reviewed context window</dt><dd>{model.contextWindow?.toLocaleString('en-US') ?? 'See provider'}</dd></div></dl>
          {e.notes.map(note => <p className={styles.calcHelp} key={note}>{note}</p>)}<a className={styles.providerLink} href={tcoModelLink(model.modelId,workload)}>Use model in TCO calculator</a><BillingDetails model={model} />
        </article>;
      })}</div>
      <div className={styles.compactComparison}>
        <table className={styles.shortlistTable}><caption>Monthly estimates for the same workload · USD</caption><thead><tr><th scope="col">Model</th><th scope="col">Est. / month</th><th scope="col"><span className={styles.visuallyHidden}>Remove from shortlist</span></th></tr></thead><tbody>{compared.map(model => {
          const e = estimates.get(model.modelId)!;
          return <tr key={model.modelId} data-provider={model.provider}><th scope="row">{model.displayName}<small>{model.provider}</small></th><td>{e.monthly === null ? 'Not estimated' : formatPrice(e.monthly)}</td><td><button className={styles.removeShortlist} onClick={() => toggle(model)} aria-label={`Remove ${model.displayName} from mobile shortlist`}><span aria-hidden="true">×</span></button></td></tr>;
        })}</tbody></table>
        <div className={styles.shortlistDetails}>{compared.map(model => {
          const e = estimates.get(model.modelId)!;
          return <details className={styles.shortlistBreakdown} key={model.modelId}><summary>{model.displayName}: breakdown & source</summary><p className={styles.appliedTier}>{e.reason ?? e.tier?.label}</p><dl><div><dt>Per request</dt><dd>{formatPrice(e.perRequest)}</dd></div><div><dt>Input / 1M</dt><dd>{formatPrice(e.tier?.input ?? null)}</dd></div><div><dt>Output / 1M</dt><dd>{formatPrice(e.tier?.output ?? null)}</dd></div><div><dt>Monthly input</dt><dd>{formatPrice(e.inputCost)}</dd></div><div><dt>Monthly output</dt><dd>{formatPrice(e.outputCost)}</dd></div>{model.provider === 'Moonshot AI' && <div><dt>Monthly cache writes</dt><dd>{formatPrice(e.writeCost)}</dd></div>}<div><dt>Reviewed context window</dt><dd>{model.contextWindow?.toLocaleString('en-US') ?? 'See provider'}</dd></div></dl>{e.notes.map(note => <p className={styles.calcHelp} key={note}>{note}</p>)}<a className={styles.providerLink} href={tcoModelLink(model.modelId,workload)}>Use model in TCO calculator</a><BillingDetails model={model} /></details>;
        })}</div>
      </div></> : <p className={styles.shortlistEmpty}>Choose two to four models below to compare estimated costs, tiers and sources. Your selection stays when you filter providers.</p>}
    </section>
    <section id="price-results" tabIndex={-1} aria-label="Compare model prices" className={`${styles.market} ${styles.jumpTarget}`}>
      <div className={styles.marketHeading}><h2>Model price board</h2><span>Rates below follow your workload’s billing tier.</span></div>
      <div className={styles.providerFilters} role="group" aria-label="Quick provider filters">{['All providers', ...new Set(models.map(m => m.provider))].map(p => <button key={p} data-provider={p} aria-pressed={provider === p} onClick={() => setProvider(p)}>{p}<span>{p === 'All providers' ? models.length : models.filter(m => m.provider === p).length}</span></button>)}</div>
      <div className={styles.controls}><label>Search models<input type="search" placeholder="Search name or API identifier…" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Provider<select value={provider} onChange={e => setProvider(e.target.value)}>{['All providers', ...new Set(models.map(m => m.provider))].map(p => <option key={p}>{p}</option>)}</select></label><label>Sort by<select aria-label="Sort models" value={sort} onChange={e => { setSort(e.target.value as BoardState['sort']); setAscending(true); }}>{columns.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><p role="status">{visible.length} of {models.length} models</p></div>
      <div className={styles.desktopTable}><div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Model pricing table">
        <table className={styles.table}><caption>USD per 1 million text tokens · Monthly token-cost estimates for your workload</caption><thead><tr><th scope="col">Compare</th>{columns.map(([key, label]) => <th key={key} scope="col" aria-sort={sort === key ? ascending ? 'ascending' : 'descending' : 'none'}><button onClick={() => changeSort(key)}>{label} <span aria-hidden="true">{sort === key ? ascending ? '↑' : '↓' : '↕'}</span></button></th>)}<th scope="col">Tier & source</th></tr></thead><tbody>{visible.map(model => {
          const e = estimates.get(model.modelId)!;
          return <tr key={model.modelId} data-provider={model.provider}><td><label className={styles.checkboxTarget}><span className={styles.visuallyHidden}>Compare {model.displayName}</span><input type="checkbox" aria-label={`Compare ${model.displayName}`} checked={selected.includes(model.modelId)} disabled={selected.length >= 4 && !selected.includes(model.modelId)} onChange={() => toggle(model)} /></label></td><td><span className={styles.provider}>{model.provider}</span></td><th scope="row"><strong>{model.displayName}</strong><code>{model.modelId}</code></th><td className={styles.price}>{formatPrice(e.tier?.input ?? null)}</td><td className={`${styles.price} ${styles.outputPrice}`}>{formatPrice(e.tier?.output ?? null)}</td><td className={styles.price}>{e.monthly === null ? 'Not estimated' : formatPrice(e.monthly)}</td><td className={styles.notes}><p className={e.reason ? styles.special : ''}>{e.reason ?? e.tier?.label}</p>{model.provider === 'Moonshot AI' && <small>Monthly estimate includes cache writes.</small>}<a className={styles.providerLink} href={tcoModelLink(model.modelId,workload)}>Use model in TCO calculator</a><BillingDetails model={model} /></td></tr>;
        })}</tbody></table>
      </div></div>
      <div className={styles.mobileCards}>{visible.map(model => {
        const e = estimates.get(model.modelId)!;
        return <article className={styles.mobileCard} data-provider={model.provider} key={model.modelId}><div className={styles.cardTop}><span className={styles.provider}>{model.provider}</span><label className={styles.compareCheck}><input type="checkbox" aria-label={`Compare ${model.displayName} on mobile`} checked={selected.includes(model.modelId)} disabled={selected.length >= 4 && !selected.includes(model.modelId)} onChange={() => toggle(model)} /> Compare</label></div><h3>{model.displayName}</h3><code>{model.modelId}</code><strong className={styles.monthly}>{e.monthly === null ? 'Not estimated' : formatPrice(e.monthly)}<small>{e.monthly === null ? '' : '/ month'}</small></strong><p className={styles.appliedTier}>{e.reason ?? e.tier?.label}</p><p className={styles.mobileRates}>Input {formatPrice(e.tier?.input ?? null)} · Output {formatPrice(e.tier?.output ?? null)} / 1M</p><a className={styles.providerLink} href={tcoModelLink(model.modelId,workload)}>Use model in TCO calculator</a><BillingDetails model={model} /></article>;
      })}</div>
      {!visible.length && <p className={styles.empty}>No models match your filters. Try another search or provider.</p>}
      <p className={styles.calcHelp}>“Not estimated” means the selected tier, model capacity or fresh price is unavailable; it never means free. Compare up to four models. Shared links restore assumptions, not a guaranteed historical price.</p>
    </section>
  </>;
}
