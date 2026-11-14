'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { formatPrice, type ModelPrice } from '@/lib/pricing/normalize';
import { workloadError, type Workload } from '@/lib/pricing/estimate';
import { makeCsv, parseBoardState, serializeBoardState, type BoardState } from '@/lib/pricing/share';
import { applyPreset, matchingPreset, workloadPresets, type PresetId } from '@/lib/pricing/presets';
import { tcoModelLink } from '@/lib/tco/pricing';
import {priceStatus} from '@/lib/pricing/freshness';
import {defaultPlanner,plannerError,parsePlanner,estimateWorkload,baselineDifference,capacityBudget,fitsRequirements,recoveryAction,type PlannerState} from '@/lib/pricing/planner';
import {exportComparisonSnapshot,parseComparisonSnapshot,type ComparisonSnapshot} from '@/lib/pricing/snapshot';
import {carryWorkloadToTco} from '@/lib/pricing/tco-transfer';
import {modelCapabilities} from '@/config/model-capabilities';
import PricingPlannerControls from './PricingPlannerControls';
import PricingComparisonReport from './PricingComparisonReport';
import styles from './Prices.module.css';

function fetchedLabel(model: ModelPrice) {
  return model.fetchedAt ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(model.fetchedAt)) + ' UTC' : 'No successful fetch';
}
function BillingDetails({ model, now, historical=false }: { model: ModelPrice; now:number;historical?:boolean }) {
  return <details className={styles.billingDetails}><summary>Billing & source details</summary>
    <p>{model.pricingNote}</p>{model.warnings.map(note => <p key={note}>{note}</p>)}
    <p>Fetched: <time dateTime={model.fetchedAt ?? undefined}>{fetchedLabel(model)}</time> · {historical?'Saved snapshot, not current':priceStatus(model,now)==='fresh'?'Current snapshot':priceStatus(model,now)==='stale'?'Data may be stale':'Source unavailable'}</p>
    <a className={styles.providerLink} href={model.sourceUrl} target="_blank" rel="noopener">Official source ↗</a>
    <p>Context capacity: {model.contextWindow?.toLocaleString('en-US')??'unknown'}. Output capacity: {model.maxOutput?.toLocaleString('en-US')??'unknown'}.</p>
    {modelCapabilities[model.modelId]&&<p>Structured output and image input supported. <a href={modelCapabilities[model.modelId].sourceUrl} target="_blank" rel="noopener">Official capability review</a> ({modelCapabilities[model.modelId].reviewedOn}). Image charges are not estimated here.</p>}
    {model.evidence && <details><summary>Technical source evidence</summary><p>Extracted source evidence:</p><pre>{model.evidence.excerpt}</pre><p>Source document SHA-256:</p><code className={styles.hash}>{model.evidence.documentSha256}</code></details>}
  </details>;
}

export default function ModelPriceTable({ models:liveModels, initialState, initialNow, sourceControls, initialPlanner, initialPlannerError }: { models: ModelPrice[]; initialState?: BoardState; initialNow?: number; sourceControls?: ReactNode;initialPlanner?:PlannerState;initialPlannerError?:string }) {
  const [snapshot,setSnapshot]=useState<ComparisonSnapshot|null>(null);
  const models=snapshot?.models??liveModels;
  const [plan,setPlan]=useState<PlannerState>(()=>initialPlanner??{...defaultPlanner,groups:[]});
  const [includeWorkload,setIncludeWorkload]=useState(false);
  const snapshotFile=useRef<HTMLInputElement>(null);
  const transferCleanup=useRef<(()=>void)|null>(null);
  useEffect(()=>()=>{transferCleanup.current?.();},[]);
  const initial = initialState ?? parseBoardState(new URLSearchParams(), models.map(m => m.modelId), models.map(m => m.provider));
  const [workload, setWorkload] = useState<Workload>(initial.workload);
  const [presetId, setPresetId] = useState<PresetId>(() => matchingPreset(initial.workload));
  const [query, setQuery] = useState(initial.query);
  const [provider, setProvider] = useState(initial.provider);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [sort, setSort] = useState<BoardState['sort']>(initial.sort);
  const [ascending, setAscending] = useState(initial.ascending);
  const [notice, setNotice] = useState(initialPlannerError??'');
  const [shareUrl, setShareUrl] = useState('');
  const [shareFingerprint,setShareFingerprint]=useState('');
  const [clock, setClock] = useState(() => initialNow ?? Date.now());
  const error = plannerError(plan) || (!plan.mixed?workloadError(workload):null);
  const asOf=snapshot?Date.parse(snapshot.createdAt):clock;
  const serializableWorkload=plan.mixed&&plan.groups[0]?{...workload,input:plan.groups[0].input,output:plan.groups[0].output,requests:plan.groups[0].requests}:workload;
  const state: BoardState = { workload:serializableWorkload, query, provider, selected, sort, ascending };
  const stateQuery = serializeBoardState(state);
  useEffect(() => {
    const restore = () => {
      const state = parseBoardState(new URLSearchParams(window.location.search), models.map(m => m.modelId), models.map(m => m.provider));
      const params=new URLSearchParams(window.location.search);try{setPlan(params.has('plan')?parsePlanner(JSON.parse(params.get('plan')!),models.map(m=>m.modelId)):{...defaultPlanner,groups:[]});}catch{setNotice('The shared planner options were invalid and were not applied.');}
      setWorkload(state.workload); setPresetId(matchingPreset(state.workload)); setQuery(state.query); setProvider(state.provider); setSelected(state.selected); setSort(state.sort); setAscending(state.ascending);
    };
    window.addEventListener('popstate', restore);
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => { window.removeEventListener('popstate', restore); window.clearInterval(timer); };
  }, [models]);
  const estimates = useMemo(() => new Map(models.map(model => [model.modelId, estimateWorkload(model, workload, plan, asOf)])), [models, workload, plan, asOf]);
  const value = (model: ModelPrice, key: BoardState['sort']): string | number | null => {
    const estimate = estimates.get(model.modelId)!;
    if (key === 'input') return estimate.tier?.input ?? null;
    if (key === 'output') return estimate.tier?.output ?? null;
    if (key === 'monthly') return estimate.monthly;
    return model[key];
  };
  const visible = models.filter(model => (provider === 'All providers' || model.provider === provider) && `${model.displayName} ${model.modelId} ${model.provider}`.toLowerCase().includes(query.toLowerCase()) && fitsRequirements(model,plan)).sort((a, b) => {
    const left = value(a, sort), right = value(b, sort);
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right))) * (ascending ? 1 : -1);
  });
  const compared = selected.map(id => models.find(model => model.modelId === id)).filter((m): m is ModelPrice => Boolean(m));
  const baselineEstimate=plan.baseline?estimates.get(plan.baseline)?.monthly??null:null;
  const reportModels=selected.length?[...new Set([...selected,...(plan.baseline?[plan.baseline]:[])])].map(id=>models.find(m=>m.modelId===id)).filter((m):m is ModelPrice=>Boolean(m)):visible;
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
    if(snapshot){setNotice('This is a historical snapshot. Save its JSON or print the report to share the exact rates. Shared links would load current pricing.');return;}
    if(includeWorkload&&!window.confirm('Include workload sizes, volumes, budget and planner settings in this link? Anyone with the link can read them, and loading it sends the URL to the host.'))return;
    const params=includeWorkload?new URLSearchParams(stateQuery):new URLSearchParams();
    if(includeWorkload)params.set('plan',JSON.stringify(plan));
    else {if(plan.baseline)params.set('baseline',plan.baseline);if(query)params.set('q',query);if(provider!=='All providers')params.set('provider',provider);if(selected.length)params.set('compare',selected.join(','));params.set('sort',sort);params.set('order',ascending?'asc':'desc');}
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    setShareUrl(url);setShareFingerprint(JSON.stringify({state,plan,includeWorkload}));
    try { await navigator.clipboard.writeText(url); setNotice('Comparison link copied. Only explicitly selected sharing information is included; prices are checked again when opened.'); }
    catch { setNotice('Your comparison link is ready below. Select and copy it.'); }
  }
  function exportCsv() {
    const rows:unknown[][]=[['Provider','Model','API ID','Request groups JSON','Requests per month','Processing','Region','Period','Kimi TTL','Rate basis','Input USD per 1M','Output USD per 1M','Monthly estimate USD','Baseline model','Baseline minus model USD per month','Annualized difference USD','Difference percent','Monthly budget USD','Budget headroom USD','Low-demand monthly USD','High-demand monthly USD','Context capacity','Output capacity','Source fetched UTC','Official source','Historical snapshot','Exclusions']];
    for(const model of visible){const e=estimates.get(model.modelId)!,diff=baselineDifference(e.monthly,baselineEstimate),budget=capacityBudget(plan.budget,e);rows.push([model.provider,model.displayName,model.modelId,JSON.stringify(e.groups.map(r=>r.group)),e.totalRequests,workload.processing,workload.region,workload.period,workload.kimiTtl,e.reason??e.tier?.label,e.tier?.input,e.tier?.output,e.monthly,plan.baseline,diff?.monthly,diff?.annual,diff?.percent,plan.budget,budget?.headroom,estimateWorkload(model,workload,plan,asOf,plan.lowPercent).monthly,estimateWorkload(model,workload,plan,asOf,plan.highPercent).monthly,model.contextWindow,model.maxOutput,model.fetchedAt,model.sourceUrl,Boolean(snapshot),[...e.notes,...model.warnings].join(' ')]);}
    downloadFile(makeCsv(rows),'ainternals-ai-cost-comparison.csv','text/csv;charset=utf-8');setNotice(`Exported ${visible.length} visible models with request mixes, comparisons, budget assumptions and pricing sources.`);
  }
  function downloadFile(text:string,name:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function saveSnapshot(){try{const data:ComparisonSnapshot={schemaVersion:'price-watch-1.1',createdAt:new Date(asOf).toISOString(),workload:serializableWorkload,planner:plan,selected,query,provider,sort,ascending,models};downloadFile(exportComparisonSnapshot(data),'ainternals-price-comparison.json','application/json');setNotice('Comparison saved locally with its rate snapshots and assumptions. Store and share the file carefully.');}catch(e){setNotice(e instanceof Error?e.message:'Could not save comparison.');}}
  async function loadSnapshot(file?:File){if(!file)return;try{if(file.size>1000000)throw new Error('Comparison snapshots must be 1 MB or smaller.');const data=parseComparisonSnapshot(await file.text());if(!window.confirm('Replace this comparison with the saved snapshot? Rates will be historical and are not independently verified by importing the file.'))return;setSnapshot(data);setWorkload(data.workload);setPlan(data.planner);setSelected(data.selected);setQuery(data.query);setProvider(data.provider);setSort(data.sort as BoardState['sort']);setAscending(data.ascending);setShareUrl('');setPresetId('custom');setNotice('Historical comparison imported locally. Saved rates are not current quotes.');}catch(e){setNotice(e instanceof Error?e.message:'Could not import comparison.');}finally{if(snapshotFile.current)snapshotFile.current.value='';}}
  function transfer(model:ModelPrice){if(snapshot){setNotice('Return to current prices before transferring a workload to TCO.');return;}try{transferCleanup.current?.();transferCleanup.current=carryWorkloadToTco(model,workload,plan,asOf,setNotice);}catch(e){setNotice(e instanceof Error?e.message:'Could not transfer workload.');}}
  function DecisionDetails({model}:{model:ModelPrice}){const e=estimates.get(model.modelId)!,difference=baselineDifference(e.monthly,baselineEstimate),budget=capacityBudget(plan.budget,e);return <div className={styles.decisionDetails}>
    {plan.baseline&&<p>{model.modelId===plan.baseline?'Current baseline':difference?`${formatPrice(Math.abs(difference.monthly))} / month ${difference.monthly>=0?'lower':'higher'} than baseline; ${formatPrice(Math.abs(difference.annual))} annualized${difference.percent===null?' (zero baseline: percentage not meaningful)':`; ${Math.abs(difference.percent).toFixed(1)}% ${difference.percent>=0?'lower':'higher'}`}`:'Baseline difference unavailable for this workload.'}</p>}
    <p>Low / expected / high demand: {formatPrice(estimateWorkload(model,workload,plan,asOf,plan.lowPercent).monthly)} / {formatPrice(e.monthly)} / {formatPrice(estimateWorkload(model,workload,plan,asOf,plan.highPercent).monthly)} per month.</p>
    {budget&&<p>{budget.fits?'Within':'Over'} budget. Headroom: {formatPrice(budget.headroom)}. {budget.requests===null?'No meaningful request-capacity bound at a zero modeled charge.':`About ${budget.requests.toLocaleString('en-US')} requests/month at the same request mix.`}</p>}
    {e.reason&&<p className={styles.special}>{recoveryAction(e.reason)}</p>}
    {plan.mixed&&<details><summary>Request-group breakdown</summary>{e.groups.map((r,i)=><p key={i}>{r.group.name}: {r.estimate.reason??`${formatPrice(r.estimate.monthly)} / month; ${r.estimate.tier?.label}`}</p>)}</details>}
    <p>Context: {model.contextWindow?.toLocaleString('en-US')??'unknown'} ? Output capacity: {model.maxOutput?.toLocaleString('en-US')??'unknown'}.</p>
    <button type="button" className={styles.textButton} onClick={()=>setPlan(p=>({...p,baseline:model.modelId}))}>Use as baseline</button>
    <button type="button" className={styles.textButton} disabled={Boolean(error)||snapshot!==null||e.monthly===null||e.totalRequests<1} onClick={()=>transfer(model)}>Carry my workload into TCO</button>
  </div>;}
  const columns: [BoardState['sort'], string][] = [['provider', 'Provider'], ['displayName', 'Model'], ['input', 'Input / 1M'], ['output', 'Output / 1M'], ['monthly', 'Est. / month']];
  return <><div className={styles.interactiveBoard}>
    <nav className={styles.jumpNav} aria-label="Price Watch shortcuts">
      <a href="#price-results" onClick={e => jumpTo(e, 'price-results')}>View cost results</a>
      <a href="#shortlist" onClick={e => jumpTo(e, 'shortlist')}>View shortlist ({selected.length})</a>
      <a href="#calculator-title" onClick={e => jumpTo(e, 'calculator-title')}>Edit workload</a>
    </nav>
    {snapshot&&<section role="status" className={styles.snapshotBanner}><strong>Historical snapshot ? not current pricing.</strong> File assumptions and saved prices are evaluated at {snapshot.createdAt}. Imported contents are not independently verified.<button onClick={()=>{setSnapshot(null);setPlan(p=>({...p,baseline:liveModels.some(m=>m.modelId===p.baseline)?p.baseline:''}));setSelected(ids=>ids.filter(id=>liveModels.some(m=>m.modelId===id)));setNotice('Current provider prices restored; workload assumptions retained.');}}>Return to current prices</button></section>}
    <section className={styles.calculator} aria-labelledby="calculator-title">
      <div className={styles.calculatorHeading}><div><p className="eyebrow">Plan your API budget</p><h2 id="calculator-title" tabIndex={-1} className={styles.jumpTarget}>What would your workload cost?</h2></div><span>USD · text tokens · no login</span></div>
      <div hidden={plan.mixed} className={styles.presetButtons} role="group" aria-label="Example workload presets">
        {workloadPresets.map(preset => <button key={preset.id} type="button" aria-pressed={presetId === preset.id} onClick={() => choosePreset(preset.id)}>{preset.label}</button>)}
        <button type="button" aria-pressed={presetId === 'custom'} onClick={() => choosePreset('custom')}>Custom</button>
      </div>
      <label hidden={plan.mixed} className={styles.presetSelect}>Starting workload<select aria-label="Workload preset" value={presetId} onChange={e => choosePreset(e.target.value as PresetId)}><option value="custom">Custom values</option>{workloadPresets.map(preset => <option key={preset.id} value={preset.id}>{preset.label} example</option>)}</select></label>
      <div hidden={plan.mixed} className={styles.workloadGrid}>
        {([['input', 'Input tokens / request'], ['output', 'Billed output tokens / request'], ['requests', 'Requests / month']] as const).map(([key, label]) => <label key={key}>{label}<input id={`workload-${key}`} type="number" min={key === 'input' ? 1 : 0} max={key === 'requests' ? 1000000000 : 10000000} step="1" value={Number.isFinite(workload[key]) ? workload[key] : ''} onChange={e => update(key, e.target.value === '' ? NaN : Number(e.target.value))} aria-invalid={Boolean(error)} aria-describedby={error ? 'workload-error' : 'preset-assumptions workload-help'} /></label>)}
      </div>
      <p hidden={plan.mixed} id="preset-assumptions" className={styles.presetHelp} role="status">{workloadPresets.find(p => p.id === presetId)?.description ?? 'Custom assumptions: edit the token counts and monthly volume above.'} Billing options stay unchanged.</p>
      <details className={styles.billingOptions}><summary>Billing options: {workload.processing === 'standard' ? 'Standard API' : 'Batch API'} · {workload.period === 'peak' ? 'peak' : 'off-peak'} scenario</summary><div className={styles.optionGrid}>
        <label>Processing<select id="workload-processing" value={workload.processing} onChange={e => update('processing', e.target.value as Workload['processing'])}><option value="standard">Standard API</option><option value="batch">Batch (validated providers only)</option></select></label>
        <label>Alibaba deployment<select id="workload-region" value={workload.region} onChange={e => update('region', e.target.value as Workload['region'])}><option value="singapore">Singapore / International</option><option value="us">Virginia / US</option><option value="eu">Frankfurt / EU</option></select></label>
        <label>DeepSeek billing period<select id="workload-period" value={workload.period} onChange={e => update('period', e.target.value as Workload['period'])}><option value="peak">Peak (conservative)</option><option value="off-peak">Off-peak (if eligible)</option></select></label>
        <label>Kimi cache-write TTL<select id="workload-kimiTtl" value={workload.kimiTtl} onChange={e => update('kimiTtl', e.target.value as Workload['kimiTtl'])}><option value="5m">5 minutes (default)</option><option value="1h">1 hour</option></select></label>
      </div><p>Region applies to Alibaba only; DeepSeek period is a scenario, not automatic scheduling. Other providers use their published default deployment. Regional uplifts, where applicable, are excluded.</p></details>
      <PricingPlannerControls plan={plan} workload={workload} models={models} onChange={setPlan} onStatus={setNotice}/>
      {error && <p id="workload-error" role="alert" className={styles.special}>{error}</p>}
      <p id="workload-help" className={styles.calcHelp}>Estimates assume all input is uncached and output includes billed reasoning tokens. Kimi estimates include the selected cache-write charges. Taxes, tools, retries, cache-hit savings, regional uplifts and subscriptions are excluded. Check model capacity where no reviewed limit is shown.</p>
      <label className={styles.sharingConsent}><input type="checkbox" checked={includeWorkload} onChange={e=>setIncludeWorkload(e.target.checked)}/>Include workload, budget and planner assumptions in a shared link (optional)</label><p className={styles.calcHelp}>Editing does not write assumptions into the address bar. Sharing is explicit. Shared links fetch current prices; use a saved snapshot to preserve exact rates.</p>
      <div className={styles.actionBar}><span role="status">{error ? 'Fix workload inputs to estimate' : `${estimateCount} of ${models.length} models estimated for this workload`}</span><button onClick={share} disabled={Boolean(error)}>Copy comparison link</button><button onClick={exportCsv} disabled={Boolean(error)}>Export visible models CSV</button><button onClick={saveSnapshot} disabled={Boolean(error)}>Save comparison JSON</button><button onClick={()=>snapshotFile.current?.click()}>Import comparison JSON</button><button onClick={()=>window.print()} disabled={Boolean(error)}>Print comparison / Save PDF</button><input ref={snapshotFile} type="file" accept=".json,application/json" hidden onChange={e=>void loadSnapshot(e.target.files?.[0])}/></div>
      <p role="status" className={styles.notice}>{notice}</p>
      {shareUrl && shareFingerprint===JSON.stringify({state,plan,includeWorkload}) && <label className={styles.shareField}>Last generated comparison link<input readOnly value={shareUrl} onFocus={e => e.target.select()} /></label>}
    </section>
    {!snapshot&&sourceControls}
    <section id="shortlist" tabIndex={-1} className={`${styles.comparison} ${styles.jumpTarget}`} aria-labelledby="compare-title">
      <div className={styles.marketHeading}><h2 id="compare-title">Your shortlist <span>{selected.length}/4</span></h2>{selected.length > 0 && <button className={styles.textButton} onClick={() => setSelected([])}>Clear selection</button>}</div>
      {compared.length ? <><p className={styles.calcHelp}>{compared.length === 1 ? 'Add another model for a side-by-side comparison.' : 'Same workload and billing options, with model-specific tiers applied. Price alone does not measure model quality.'}</p><div className={styles.compareGrid}>{compared.map(model => {
        const e = estimates.get(model.modelId)!;
        return <article key={model.modelId} className={styles.compareCard} data-provider={model.provider}>
          <div className={styles.cardTop}><span className={styles.provider}>{model.provider}</span><button className={styles.textButton} onClick={() => toggle(model)} aria-label={`Remove ${model.displayName} from comparison`}>Remove</button></div><h3>{model.displayName}</h3><code>{model.modelId}</code><strong className={styles.monthly}>{e.monthly === null ? 'Not estimated' : formatPrice(e.monthly)}<small>{e.monthly === null ? '' : '/ month'}</small></strong>
          <p className={styles.appliedTier}>{e.reason ?? e.tier?.label}</p><dl><div><dt>Per request</dt><dd>{formatPrice(e.perRequest)}</dd></div><div><dt>Input / 1M</dt><dd>{formatPrice(e.tier?.input ?? null)}</dd></div><div><dt>Output / 1M</dt><dd>{formatPrice(e.tier?.output ?? null)}</dd></div><div><dt>Monthly input</dt><dd>{formatPrice(e.inputCost)}</dd></div><div><dt>Monthly output</dt><dd>{formatPrice(e.outputCost)}</dd></div>{model.provider === 'Moonshot AI' && <div><dt>Monthly cache writes</dt><dd>{formatPrice(e.writeCost)}</dd></div>}<div><dt>Reviewed context window</dt><dd>{model.contextWindow?.toLocaleString('en-US') ?? 'See provider'}</dd></div></dl>
          {e.notes.map(note => <p className={styles.calcHelp} key={note}>{note}</p>)}<a className={styles.providerLink} href={tcoModelLink(model.modelId,workload)} target="_blank" rel="noopener">Open TCO with model only</a><DecisionDetails model={model}/><BillingDetails model={model} now={asOf} historical={Boolean(snapshot)}/>
        </article>;
      })}</div>
      <div className={styles.compactComparison}>
        <table className={styles.shortlistTable}><caption>Monthly estimates for the same workload · USD</caption><thead><tr><th scope="col">Model</th><th scope="col">Est. / month</th><th scope="col"><span className={styles.visuallyHidden}>Remove from shortlist</span></th></tr></thead><tbody>{compared.map(model => {
          const e = estimates.get(model.modelId)!;
          return <tr key={model.modelId} data-provider={model.provider}><th scope="row">{model.displayName}<small>{model.provider}</small></th><td>{e.monthly === null ? 'Not estimated' : formatPrice(e.monthly)}</td><td><button className={styles.removeShortlist} onClick={() => toggle(model)} aria-label={`Remove ${model.displayName} from mobile shortlist`}><span aria-hidden="true">×</span></button></td></tr>;
        })}</tbody></table>
        <div className={styles.shortlistDetails}>{compared.map(model => {
          const e = estimates.get(model.modelId)!;
          return <details className={styles.shortlistBreakdown} key={model.modelId}><summary>{model.displayName}: breakdown & source</summary><p className={styles.appliedTier}>{e.reason ?? e.tier?.label}</p><dl><div><dt>Per request</dt><dd>{formatPrice(e.perRequest)}</dd></div><div><dt>Input / 1M</dt><dd>{formatPrice(e.tier?.input ?? null)}</dd></div><div><dt>Output / 1M</dt><dd>{formatPrice(e.tier?.output ?? null)}</dd></div><div><dt>Monthly input</dt><dd>{formatPrice(e.inputCost)}</dd></div><div><dt>Monthly output</dt><dd>{formatPrice(e.outputCost)}</dd></div>{model.provider === 'Moonshot AI' && <div><dt>Monthly cache writes</dt><dd>{formatPrice(e.writeCost)}</dd></div>}<div><dt>Reviewed context window</dt><dd>{model.contextWindow?.toLocaleString('en-US') ?? 'See provider'}</dd></div></dl>{e.notes.map(note => <p className={styles.calcHelp} key={note}>{note}</p>)}<a className={styles.providerLink} href={tcoModelLink(model.modelId,workload)} target="_blank" rel="noopener">Open TCO with model only</a><DecisionDetails model={model}/><BillingDetails model={model} now={asOf} historical={Boolean(snapshot)}/></details>;
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
          return <tr key={model.modelId} data-provider={model.provider}><td><label className={styles.checkboxTarget}><span className={styles.visuallyHidden}>Compare {model.displayName}</span><input type="checkbox" aria-label={`Compare ${model.displayName}`} checked={selected.includes(model.modelId)} disabled={selected.length >= 4 && !selected.includes(model.modelId)} onChange={() => toggle(model)} /></label></td><td><span className={styles.provider}>{model.provider}</span></td><th scope="row"><strong>{model.displayName}</strong><code>{model.modelId}</code></th><td className={styles.price}>{formatPrice(e.tier?.input ?? null)}</td><td className={`${styles.price} ${styles.outputPrice}`}>{formatPrice(e.tier?.output ?? null)}</td><td className={styles.price}>{e.monthly === null ? 'Not estimated' : formatPrice(e.monthly)}</td><td className={styles.notes}><p className={e.reason ? styles.special : ''}>{e.reason ?? e.tier?.label}</p>{model.provider === 'Moonshot AI' && <small>Monthly estimate includes cache writes.</small>}<a className={styles.providerLink} href={tcoModelLink(model.modelId,workload)} target="_blank" rel="noopener">Open TCO with model only</a><DecisionDetails model={model}/><BillingDetails model={model} now={asOf} historical={Boolean(snapshot)}/></td></tr>;
        })}</tbody></table>
      </div></div>
      <div className={styles.mobileCards}>{visible.map(model => {
        const e = estimates.get(model.modelId)!;
        return <article className={styles.mobileCard} data-provider={model.provider} key={model.modelId}><div className={styles.cardTop}><span className={styles.provider}>{model.provider}</span><label className={styles.compareCheck}><input type="checkbox" aria-label={`Compare ${model.displayName} on mobile`} checked={selected.includes(model.modelId)} disabled={selected.length >= 4 && !selected.includes(model.modelId)} onChange={() => toggle(model)} /> Compare</label></div><h3>{model.displayName}</h3><code>{model.modelId}</code><strong className={styles.monthly}>{e.monthly === null ? 'Not estimated' : formatPrice(e.monthly)}<small>{e.monthly === null ? '' : '/ month'}</small></strong><p className={styles.appliedTier}>{e.reason ?? e.tier?.label}</p><p className={styles.mobileRates}>Input {formatPrice(e.tier?.input ?? null)} · Output {formatPrice(e.tier?.output ?? null)} / 1M</p><a className={styles.providerLink} href={tcoModelLink(model.modelId,workload)} target="_blank" rel="noopener">Open TCO with model only</a><DecisionDetails model={model}/><BillingDetails model={model} now={asOf} historical={Boolean(snapshot)}/></article>;
      })}</div>
      {!visible.length && <p className={styles.empty}>No models match your filters. Try another search or provider.</p>}
      <p className={styles.calcHelp}>“Not estimated” means the selected tier, model capacity or fresh price is unavailable; it never means free. Compare up to four models. Shared links restore assumptions, not a guaranteed historical price.</p>
    </section>
    <section className={styles.feedback}><h2>Help improve Price Watch</h2><p>Report an unclear estimate, missing model or pricing issue to <a href="mailto:sriram@sriramadvisory.com?subject=AInternals%20Price%20Watch%20feedback">sriram@sriramadvisory.com</a>. Include the model and issue; avoid sharing sensitive usage or private files.</p></section>
    </div><PricingComparisonReport models={reportModels} workload={workload} plan={plan} now={asOf} historical={Boolean(snapshot)}/></>;
}
