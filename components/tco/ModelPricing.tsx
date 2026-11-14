'use client';

import { useEffect, useRef, useState } from 'react';
import type { ModelPrice } from '@/lib/pricing/normalize';
import { formatPrice } from '@/lib/pricing/normalize';
import { defaultPricingOptions, resolveTcoPricing, type PricingBinding, type PricingOptions, type PricingResolution } from '@/lib/tco/pricing';
import type { TcoInputs } from '@/lib/tco/model';
import styles from './ModelPricing.module.css';

type Props={inputs:TcoInputs;binding:PricingBinding|null;active:PricingResolution|null;now:number;onApply:(binding:PricingBinding)=>void;onManual:()=>void};
export default function ModelPricing({inputs,binding,active,now,onApply,onManual}:Props) {
  const [models,setModels]=useState<ModelPrice[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [selected,setSelected]=useState('');
  const [options,setOptions]=useState<PricingOptions>({...defaultPricingOptions});
  const [reload,setReload]=useState(0);
  const handoffLoaded=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/tools/ai-tco-calculator/pricing',{signal:controller.signal,cache:'no-store',credentials:'omit'})
      .then(async response=>{if(!response.ok)throw new Error('Price Watch is temporarily unavailable. You can continue with manual rates.');const data=await response.json();if(!Array.isArray(data.models))throw new Error('Pricing data could not be read.');if(controller.signal.aborted)return;
        if(!handoffLoaded.current){
          const params=new URLSearchParams(window.location.search);
          const id=params.get('model');if(id)setSelected(id);
          setOptions(prev=>({...prev,processing:params.get('processing')==='batch'?'batch':'standard',region:params.get('region')==='us'?'us':params.get('region')==='eu'?'eu':'singapore',period:params.get('period')==='off-peak'?'off-peak':'peak',kimiTtl:params.get('kimiTtl')==='1h'?'1h':'5m'}));
          handoffLoaded.current=true;
        }
        setModels(data.models);if(data.status!=='available')setMessage('Some official sources are unavailable or stale. Only fresh, matching rates can be applied.');})
      .catch(error=>{if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Pricing could not be loaded.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[reload]);
  const model=models.find(m=>m.modelId===selected);
  const preview=model?resolveTcoPricing(model,inputs,options,now):null;
  const providers=[...new Set(models.map(m=>m.provider))];
  function update<K extends keyof PricingOptions>(key:K,value:PricingOptions[K]){setOptions(prev=>({...prev,[key]:value}));}
  return <section className={styles.modelPricing} aria-label="Model pricing from Price Watch">
    <div className={styles.heading}><div><span>CONNECTED TO PRICE WATCH</span><h2>Choose your model pricing.</h2></div><a href="/prices" target="_blank" rel="noopener">Compare models ↗</a></div>
    <p>Use the same published rates as our pricing feature. Matching happens in your browser; your assumptions are not sent to Price Watch or providers.</p>
    <div className={styles.controls}>
      <label htmlFor="tco-price-model">Provider & model<select id="tco-price-model" value={selected} onChange={e=>setSelected(e.target.value)} disabled={loading}><option value="">Choose a model</option>{selected&&!model&&<option value={selected}>{selected} — awaiting pricing</option>}{providers.map(provider=><optgroup key={provider} label={provider}>{models.filter(m=>m.provider===provider).map(m=><option key={m.modelId} value={m.modelId}>{m.displayName}{m.sourceStatus!=='fresh'?' — pricing unavailable/stale':''}</option>)}</optgroup>)}</select></label>
      <label htmlFor="tco-price-processing">Processing<select id="tco-price-processing" value={options.processing} onChange={e=>update('processing',e.target.value as PricingOptions['processing'])}><option value="standard">Standard</option><option value="batch">Batch — if published</option></select></label>
      {model?.provider==='Alibaba Cloud'&&<label htmlFor="tco-price-region">Deployment region<select id="tco-price-region" value={options.region} onChange={e=>update('region',e.target.value as PricingOptions['region'])}><option value="singapore">Singapore / International</option><option value="us">US</option><option value="eu">EU</option></select></label>}
      {model?.provider==='DeepSeek'&&<label htmlFor="tco-price-period">Billing period<select id="tco-price-period" value={options.period} onChange={e=>update('period',e.target.value as PricingOptions['period'])}><option value="peak">Peak</option><option value="off-peak">Off-peak — eligible requests only</option></select></label>}
      {model?.provider==='Moonshot AI'&&<label htmlFor="tco-price-cache">Required cache-write duration<select id="tco-price-cache" value={options.kimiTtl} onChange={e=>update('kimiTtl',e.target.value as PricingOptions['kimiTtl'])}><option value="5m">5 minutes</option><option value="1h">1 hour</option></select></label>}
    </div>
    <label className={styles.confirmation}><input type="checkbox" checked={options.singleRequest} onChange={e=>update('singleRequest',e.target.checked)} id="tco-price-single-request"/><span>My input/output tokens per attempt represent one billed model request. For multi-call tasks or mixed request sizes, I will use verified blended manual rates.</span></label>
    {loading&&<p role="status">Loading shared Price Watch data…</p>}
    {message&&<p role="status" className={styles.caution}>{message}</p>}
    {selected&&!loading&&!model&&<p role="status" className={styles.caution}>This model is not in the current pricing catalog. Choose another model or use manual rates.</p>}
    {preview&&!preview.ok&&<p role="status" className={styles.caution}>{preview.reason}</p>}
    {preview?.ok&&model&&<div className={styles.preview}><strong>{model.provider} · {model.displayName}</strong><p>{preview.tierLabel}</p><p>Input {formatPrice(preview.patch.inputPricePerMillion)} · Output {formatPrice(preview.patch.outputPricePerMillion)} per 1M tokens, USD</p>{preview.cacheWriteRate>0&&<p>Effective input rate includes required cache writes of {formatPrice(preview.cacheWriteRate)} per 1M input tokens.</p>}<p>Fetched <time dateTime={model.fetchedAt!}>{model.fetchedAt}</time> · <a href={model.sourceUrl} target="_blank" rel="noopener">Official pricing source ↗</a></p><details><summary>Billing notes & exclusions</summary>{preview.notes.map((note,i)=><p key={i}>{note}</p>)}</details></div>}
    <div className={styles.actions}><button type="button" disabled={loading||!model||!preview?.ok} onClick={()=>model&&preview?.ok&&onApply({model,options:{...options}})}>Use these prices</button><button type="button" onClick={()=>{setLoading(true);setMessage('');setReload(n=>n+1);}} disabled={loading}>Reload Price Watch</button>{binding&&<button type="button" onClick={onManual}>Use manual pricing</button>}</div>
    {binding?<p className={styles.inUse} role="status">{active?.ok?`In use: ${binding.model.provider} · ${binding.model.displayName}. The matching tier updates when token counts change.`:`Linked model needs attention: ${active&&!active.ok?active.reason:'Recheck pricing.'}`} <span>Future token-price changes remain your scenario assumption.</span></p>:<p className={styles.inUse}>Manual pricing is in use until you apply a model. Imported scenarios retain their saved rates and reference; applying a model replaces those rates.</p>}
    <p className={styles.footnote}>USD rates only; no currency conversion. Rates are fetched snapshots, not a three-year price guarantee. Other API/tool charges and all operating assumptions remain yours to enter.</p>
  </section>;
}
