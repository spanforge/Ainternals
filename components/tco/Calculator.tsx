'use client';

import Link from 'next/link';

import { useEffect, useRef, useState } from 'react';
import content from '@/lib/tco/presentation.json';
import { APP_VERSION, calculateTco, chartComponents, costLines, currencies, defaults, inputKeys, percentages, type InputKey, type TcoInputs, type TcoYear } from '@/lib/tco/model';
import { exportScenario, importScenario, MAX_SCENARIO_BYTES } from '@/lib/tco/scenario';
import { assumptionGroups, fieldByKey, readableError } from '@/lib/tco/guidance';
import FieldExplanation from './FieldExplanation';
import IssueReport from './IssueReport';
import ModelPricing from './ModelPricing';
import { resolveTcoPricing, type PricingBinding } from '@/lib/tco/pricing';
import styles from './Calculator.module.css';

const groups = assumptionGroups;
const chartLabels = ['API & tools','Infrastructure','Monitoring','Licenses','Human review','Rework','Support','Contingency'];
const colors = ['#42d9ed','#7298ff','#a99cff','#cfadf1','#438cdd','#f0b86b','#77c6a3','#61708f'];
const tabs = ['Dashboard','3-Year TCO','Cost Mix','Guide'] as const;
type Tab = typeof tabs[number];
export default function Calculator() {
  const [baseInputs,setInputs] = useState<TcoInputs>({...defaults});
  const [pricingBinding,setPricingBinding] = useState<PricingBinding|null>(null);
  const [pricingNow,setPricingNow] = useState(0);
  useEffect(()=>{const tick=()=>setPricingNow(Date.now());tick();const timer=window.setInterval(tick,30000);return ()=>window.clearInterval(timer);},[]);
  const linkedPricing = pricingBinding?resolveTcoPricing(pricingBinding.model,baseInputs,pricingBinding.options,pricingNow):null;
  const inputs = linkedPricing?.ok?{...baseInputs,...linkedPricing.patch}:baseInputs;
  const pricingBlocked = linkedPricing!==null&&!linkedPricing.ok;
  const [drafts,setDrafts] = useState<Partial<Record<InputKey,string>>>({});
  const [errors,setErrors] = useState<Partial<Record<InputKey,string>>>({});
  const [tab,setTab] = useState<Tab>('Dashboard');
  const [notice,setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const result = calculateTco(inputs), d = result.dashboard;
  const dirty = Boolean(pricingBinding) || JSON.stringify(inputs) !== JSON.stringify(defaults) || Object.keys(drafts).length > 0;
  const inputPending = Object.values(errors).some(Boolean);
  const pending = inputPending || pricingBlocked;
  useEffect(()=>{
    if(window.location.hash!=='#receive-workload'||!window.opener)return;
    const opener=window.opener,origin=window.location.origin;
    let received=false;
    const receive=(event:MessageEvent)=>{
      if(received||event.origin!==origin||event.source!==opener||event.data?.type!=='ainternals-tco-workload'||typeof event.data.scenario!=='string')return;
      received=true;
      try{
        const next=importScenario(event.data.scenario);
        if(!window.confirm('Import this Price Watch workload and rate snapshot? One request maps to one attempted task. Other operating assumptions remain illustrative defaults. Mixed workloads use adjusted effective rates to preserve the token bill.'))return;
        setInputs(next);setPricingBinding(null);setDrafts({});setErrors({});
        setNotice('Price Watch workload received locally. The token bill is preserved in a manual rate snapshot; review the other operating defaults before relying on the TCO estimate. Applying a current model replaces these effective rates.');
        opener.postMessage({type:'ainternals-tco-received'},origin);
        window.history.replaceState(null,'',window.location.pathname+window.location.search);
      }catch(e){setNotice(readableError(e));}
    };
    window.addEventListener('message',receive);
    opener.postMessage({type:'ainternals-tco-ready'},origin);
    return ()=>window.removeEventListener('message',receive);
  },[]);
  const money = (v:number|null,unit=false) => v === null ? 'n/a' : new Intl.NumberFormat('en-US',{style:'currency',currency:inputs.currency,minimumFractionDigits:unit?4:2,maximumFractionDigits:unit?4:2}).format(v);
  const count = (v:number) => new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v);
  const resultNotes = [
    ['Setup and ongoing costs','Upfront investment is included in Year 1 only. Operating costs cover running the workflow. Annual figures describe one year; cumulative figures include all years up to that point.'],
    ['Present value','This expresses future operating expenses in today’s terms. It is separate from the undiscounted amount you expect to spend; a lower present value does not reduce the actual bill.'],
    ['Successful outcomes','Successful-task costs reflect first-pass and recovered outcomes. Unresolved failures are excluded from successful-task counts.'],
    ['Cost advantage','A positive advantage means modeled AI costs are lower than the comparable human-only alternative. A negative advantage means they are higher. Neither result establishes ROI or guarantees cash savings.'],
  ];
  function change(key:InputKey, raw:string|boolean) {
    const numeric = typeof defaults[key] === 'number';
    const value = numeric ? Number(raw)/(percentages.includes(key)?100:1) : raw;
    setDrafts(prev=>({...prev,[key]:String(raw)}));
    const next = {...inputs,[key]:value};
    try {
      if (numeric && (raw === '' || !Number.isFinite(Number(raw)))) throw new Error('Enter a complete number.');
      calculateTco(next);
      setInputs(next);setErrors(prev=>({...prev,[key]:undefined}));
    } catch(e) {setErrors(prev=>({...prev,[key]:readableError(e)}));}
  }
  function download() {
    const url=URL.createObjectURL(new Blob([exportScenario(inputs)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='ainternals-tco-scenario.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    setNotice('Scenario downloaded. This file contains your assumptions; store and share it carefully.');
  }
  async function upload(file?:File) {
    if(!file)return;
    try {
      if(file.size>MAX_SCENARIO_BYTES)throw new Error('Scenario files must be 64 KB or smaller.');
      const next=importScenario(await file.text());
      if(dirty&&!window.confirm('Replace your current assumptions with this scenario?'))return;
      setInputs(next);setPricingBinding(null);setDrafts({});setErrors({});setNotice('Scenario imported locally. Saved rates and pricing reference are preserved. Select a Price Watch model only if you want to replace them.');
    }catch(e){setNotice(readableError(e));}
    finally {if(fileRef.current)fileRef.current.value='';}
  }
  function reset() {
    if(dirty&&!window.confirm('Reset all edits to the illustrative defaults?'))return;
    setInputs({...defaults});setPricingBinding(null);setDrafts({});setErrors({});setNotice('Default assumptions restored.');
  }
  function applyPricing(binding:PricingBinding) {
    setPricingBinding(binding);setPricingNow(Date.now());
    setDrafts(prev=>{const next={...prev};delete next.inputPricePerMillion;delete next.outputPricePerMillion;delete next.priceProvenance;return next;});
    setErrors(prev=>{const next={...prev};delete next.inputPricePerMillion;delete next.outputPricePerMillion;delete next.priceProvenance;return next;});
    setNotice(`Using ${binding.model.displayName} pricing from Price Watch. Other costs must also be entered in USD.`);
  }
  function manualPricing() {setInputs({...inputs});setPricingBinding(null);setNotice('Manual pricing is in use. The last rates and source reference are retained as a snapshot and will not update automatically.');}
  const annualRows: [string,keyof TcoYear,boolean?][] = [['Total AI TCO','totalTco'],['Operating AI TCO','operatingTco'],['Cost per successful task, including setup','costPerSuccessfulIncludingUpfront',true],['Operating cost / successful task','operatingCostPerSuccessful',true],['Human-only baseline','manualBaseline'],['Net cost advantage','netAdvantage'],['Successful tasks','successful']];
  const metricCards = [
    {label:'3-year total cost',value:money(d.total3Year),hint:'Undiscounted · includes upfront',hero:true},
    {label:'Cost / successful task',value:money(d.blendedPerSuccessful,true),hint:'Blended across all three years'},
    {label:'Present value of AI costs',value:money(d.presentValue),hint:`Year-end discounting · ${inputs.discountRate*100}% rate`},
    {label:'Successful tasks',value:count(d.successful3Year),hint:'First-pass successes + recovered'},
    {label:'Year 1 operating cost',value:money(d.year1Operating),hint:'Recurring costs + contingency'},
    {label:'Upfront investment',value:money(d.upfrontInvestment),hint:'One-time · paid at project start'},
  ];
  return <div className={styles.calculator} data-tco-calculator>
    <div className={styles.breadcrumb}><Link href="/" prefetch={false}>AInternals</Link><span>/</span><span>Tools</span><span>/</span><strong>AI TCO Calculator</strong></div>
    <div className={styles.heading}><div><div className={styles.eyebrow}>THE ECONOMICS OF INTELLIGENCE <span>FREE TOOL</span></div><h1>The full cost of your<br/><em>AI workflow.</em></h1><p>Go beyond the token bill. Model three years of technology,<br className={styles.desktopBreak}/> people, and operational costs in one transparent view.</p></div><div className={styles.horizon}><span>PLANNING HORIZON</span><div className={styles.horizonValue}><strong>3</strong><span>years</span></div><span>Three-year cost outlook</span></div></div>
    <div className={styles.warning}><span aria-hidden="true">ⓘ</span><p><strong>{pricingBinding?'Model rates are a fetched pricing snapshot.':'Illustrative assumptions. Real decisions need verified data.'}</strong> This is a cost model, not ROI, a vendor quote, or a savings guarantee. {pricingBinding?'Other costs and future price changes remain your scenario assumptions.':'Default prices are unverified until you replace them or apply a Price Watch model.'}</p></div>
    <div className={styles.toolbar}><div><span className={styles.dot}/> Browser-local calculations <span className={styles.toolbarSep}>/</span> No login. No fees.</div><div className={styles.actions}><button onClick={reset}>↺ Reset defaults</button><button onClick={()=>fileRef.current?.click()}>↑ Import JSON</button><button onClick={download} disabled={pending}>↓ Export scenario</button><button className={styles.primaryButton} onClick={()=>window.print()} disabled={pending}>Print / Save PDF ↗</button><input ref={fileRef} type="file" accept=".json,application/json" aria-label="Import scenario JSON file" hidden onChange={e=>void upload(e.target.files?.[0])}/></div></div>
    {notice&&<p role="status" className={styles.notice}>{notice}</p>}
    <ModelPricing inputs={inputs} binding={pricingBinding} active={linkedPricing} now={pricingNow} onApply={applyPricing} onManual={manualPricing}/>
    <nav className={styles.jumpLinks} aria-label="Calculator jump links"><a href="#tco-assumptions">↓ Assumptions</a><a href="#tco-results">↓ Live results</a></nav>
    <div className={styles.workspace}>
      <aside id="tco-assumptions" className={styles.assumptions} aria-label="Scenario assumptions"><div className={styles.asideTitle}><div><h2>Your assumptions</h2><p>Adjust the inputs. See the impact.</p><a className={styles.guideLink} href="/tools/ai-tco-calculator/user-guide" target="_blank" rel="noopener">User Guide: all 33 fields</a></div><span>33 INPUTS</span></div>
        <form onSubmit={e=>e.preventDefault()}>{groups.map((group,g)=><details key={group.title} className={styles.inputGroup} open={g===0||g===1}><summary><span className={styles.groupNumber}>0{g+1}</span><span>{group.title}<small>{group.subtitle}</small></span><span className={styles.chevron}>+</span></summary><div className={styles.fields}>{group.keys.map(key=>{
          const source=fieldByKey[key], isPercent=percentages.includes(key), isBool=typeof defaults[key]==='boolean';
          const managed=Boolean(pricingBinding)&&['inputPricePerMillion','outputPricePerMillion','priceProvenance'].includes(key);
          const formatted=String(typeof inputs[key]==='number'?(inputs[key] as number)*(isPercent?100:1):inputs[key]);
          const val=managed?formatted:drafts[key]??formatted;
          return <div key={key} className={styles.field}><label htmlFor={`tco-${key}`}>{source.label}<span>{isPercent?'%':isBool?'YES / NO':key==='currency'?'LABEL ONLY':''}</span></label>
          {key==='currency'?<select id={`tco-${key}`} value={inputs.currency} disabled={Boolean(pricingBinding)} onChange={e=>change(key,e.target.value)} aria-describedby={`help-${key}`}>{currencies.map(c=><option key={c}>{c}</option>)}</select>:isBool?<select id={`tco-${key}`} value={String(inputs[key])} onChange={e=>change(key,e.target.value==='true')} aria-describedby={`help-${key}`}><option value="true">Yes — inflation + volume</option><option value="false">No — inflation only</option></select>:<input id={`tco-${key}`} readOnly={managed} type={typeof defaults[key]==='number'?'number':'text'} step={['monthlyAttempts','inputTokensPerAttempt','outputTokensPerAttempt'].includes(key)?'1':'any'} min={key==='annualTokenPriceChange'?undefined:0} max={isPercent&&key!=='annualTokenPriceChange'?100:undefined} value={val} maxLength={typeof defaults[key]==='string'?2000:undefined} onChange={e=>change(key,e.target.value)} aria-invalid={!!errors[key]} aria-describedby={`help-${key}${errors[key]?` error-${key}`:''}`}/>}
          <small id={`help-${key}`}>{managed?'From the selected Price Watch model and matching billing tier. Switch to manual pricing to edit.':key==='currency'&&pricingBinding?'Linked Price Watch rates require USD. Switch to manual pricing to change currency.':source.hint}</small>{errors[key]&&<small id={`error-${key}`} role="alert" className={styles.error}>{errors[key]}</small>}<details className={styles.fieldHelp} data-field-help={key}><summary>About this field</summary><FieldExplanation field={source}/><a href={`/tools/ai-tco-calculator/user-guide#field-${key}`} target="_blank" rel="noopener">Open in User Guide (new tab)</a></details></div>;
        })}{g===2&&<p className={styles.formNote}>{content.notes[1]}</p>}{g===4&&<p className={styles.formNote}>{content.notes[0]}</p>}</div></details>)}</form>
        <div className={styles.privacyCard}><strong>◈ Your scenario stays with you.</strong><p>Inputs stay in browser memory. Export a JSON file to keep your work. Refreshing resets the scenario.</p><a href="#guide" onClick={()=>setTab('Guide')}>Privacy & guidance ↗</a></div>
      </aside>
      <div id="tco-results" className={styles.results}>
        <div className={styles.resultHeader}><div className={styles.tabs} role="tablist" aria-label="Calculator results">{tabs.map(t=><button key={t} id={`tab-${t.replaceAll(' ','-')}`} role="tab" aria-selected={tab===t} aria-controls={`panel-${t.replaceAll(' ','-')}`} tabIndex={tab===t?0:-1} onClick={()=>setTab(t)} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=tabs[(tabs.indexOf(t)+(e.key==='ArrowRight'?1:3))%4];setTab(next);document.getElementById(`tab-${next.replaceAll(' ','-')}`)?.focus();}}}>{t}</button>)}</div><span className={styles.live}><span className={styles.dot}/>{pending?'Last valid scenario':'Live results'}</span></div>
        {inputPending&&<p role="alert" className={styles.warning}>Fix the highlighted input errors. Results below use your last valid assumptions; export and print are paused.</p>}
        {pricingBlocked&&<p role="alert" className={styles.warning}>Results, export and print are paused because the linked pricing does not match this scenario. {linkedPricing&&!linkedPricing.ok?linkedPricing.reason:''} Reload and apply fresh matching prices, correct the request size, or switch to manual pricing.</p>}
        <div hidden={pricingBlocked} data-priced-results>
        {result.years.some(y=>!y.successful||!y.attempts)&&<p role="alert" className={styles.warning}>Zero attempted or successful tasks: affected unit costs return 0 and are not meaningful estimates.</p>}
        <section id="panel-Dashboard" role="tabpanel" aria-labelledby="tab-Dashboard" hidden={tab!=='Dashboard'} className={styles.tabPanel}>
          <div className={styles.sectionLabel}><span>YOUR THREE-YEAR OUTLOOK</span><span>{inputs.currency} · label only, no FX</span></div>
          <div className={styles.metrics} aria-live="polite" aria-atomic="true">{metricCards.map(c=><article key={c.label} className={`${styles.metric} ${c.hero?styles.heroMetric:''}`}><h3>{c.label}</h3><strong>{c.value}</strong><p>{c.hint}</p></article>)}</div>
          <section className={styles.resultNotes} aria-label="Understanding your results"><h2>Reading your results</h2>{resultNotes.map(([title,text])=><p key={title}><strong>{title}.</strong> {text}</p>)}</section>
          <section className={styles.panel}><div className={styles.panelHeading}><div><h2>Where the operating cost goes</h2><p>Eight cost components. Three years. Upfront investment excluded.</p></div><span>ANNUAL COST MIX</span></div>
            <div className={styles.chart} role="img" aria-label="Annual operating costs by component. Exact values available in the table below.">{result.years.map(y=><div className={styles.chartRow} key={y.year}><span>Year {y.year}</span><div className={styles.barTrack} style={{width:`${Math.max(...result.years.map(a=>a.operatingTco))?y.operatingTco/Math.max(...result.years.map(a=>a.operatingTco))*100:0}%`}}>{chartComponents(y).map((v,i)=><span key={i} style={{width:`${y.operatingTco?v/y.operatingTco*100:0}%`,background:colors[i]}} title={`${chartLabels[i]}: ${money(v)}`}/>)}</div><strong>{money(y.operatingTco)}</strong></div>)}</div>
            <div className={styles.legend}>{chartLabels.map((l,i)=><span key={l}><i style={{background:colors[i]}}/>{l}</span>)}</div>
            <details className={styles.chartTable}><summary>View cost breakdown</summary><div className={styles.tableScroll}><table><caption>Annual operating cost components</caption><thead><tr><th scope="col">Component</th>{result.years.map(y=><th scope="col" key={y.year}>Year {y.year}</th>)}</tr></thead><tbody>{chartLabels.map((l,i)=><tr key={l}><th scope="row">{l}</th>{result.years.map(y=><td key={y.year}>{money(chartComponents(y)[i])}</td>)}</tr>)}</tbody></table></div></details>
          </section>
          <section className={styles.panel}><div className={styles.panelHeading}><div><h2>Year by year</h2><p>Compare annual totals, unit economics, and successful outcomes.</p></div><span>UNDISCOUNTED</span></div><div className={styles.tableScroll}><table><caption>Annual comparison in {inputs.currency}</caption><thead><tr><th scope="col">Metric</th>{result.years.map(y=><th scope="col" key={y.year}>Year {y.year}</th>)}</tr></thead><tbody>{annualRows.map(([label,key,unit])=><tr key={key}><th scope="row">{label}</th>{result.years.map(y=><td key={y.year}>{key==='successful'?count(y.successful):key==='manualBaseline'&&!result.manualEnabled?'n/a':money(y[key],unit)}</td>)}</tr>)}</tbody></table></div></section>
          <section className={styles.baseline}><div><span className={styles.eyebrow}>OPTIONAL HUMAN-ONLY COMPARISON</span><h2>{result.manualEnabled?'Compare equivalent outcomes.':'A fair comparison starts with equal outcomes.'}</h2><p>{result.manualEnabled?'Validate matching scope, quality, and outcomes. A positive advantage is not a guaranteed cash saving.':'Enter validated human-only minutes per task under Human-only comparison to enable this comparison.'}</p></div><span className={styles.badge}>{result.manualEnabled?'ENABLED':'OFF BY DEFAULT'}</span><div className={styles.baselineMetrics}>{[['3-year human-only baseline',d.baseline3Year],['Net cost advantage',d.netAdvantage3Year],['Present-value cost advantage',d.pvAdvantage3Year]].map(([label,value])=><div key={String(label)}><span>{label}</span><strong>{money(value as number|null)}</strong></div>)}</div></section>
        </section>
        <section id="panel-3-Year-TCO" role="tabpanel" aria-labelledby="tab-3-Year-TCO" hidden={tab!=='3-Year TCO'} className={styles.tabPanel}><div className={styles.panel}><div className={styles.panelHeading}><div><h2>Your annual results</h2><p>A detailed view of workload, operating costs, investment and unit economics.</p></div><span>THREE-YEAR OUTLOOK</span></div><div className={styles.tableScroll}><table><caption>Annual results in {inputs.currency}</caption><thead><tr><th scope="col">Metric</th>{result.years.map(y=><th scope="col" key={y.year}>Year {y.year}</th>)}</tr></thead><tbody>{content.annualResults.map(item=>{const key=item.key as keyof TcoYear;return <tr key={key}><th scope="row">{item.label}</th>{result.years.map(y=><td key={y.year}>{key==='manualBaseline'||key==='pvManual'?(!result.manualEnabled?'n/a':money(y[key])):y[key]===null?'n/a':['attempts','firstPass','recovered','successful','unresolved'].includes(key)?count(y[key] as number):money(y[key],['costPerAttempt','costPerSuccessfulIncludingUpfront','operatingCostPerSuccessful'].includes(key))}</td>)}</tr>;})}</tbody></table></div></div></section>
        <section id="panel-Cost-Mix" role="tabpanel" aria-labelledby="tab-Cost-Mix" hidden={tab!=='Cost Mix'} className={styles.tabPanel}><div className={styles.panel}><div className={styles.panelHeading}><div><h2>Year 1, broken down</h2><p>Ten cost lines. Shares of {money(d.year1Operating)} operating TCO.</p></div><span>UPFRONT EXCLUDED</span></div><div className={styles.tableScroll}><table><caption>Year 1 operating cost amounts and shares</caption><thead><tr><th scope="col">Cost component</th><th scope="col">Amount</th><th scope="col">Share</th></tr></thead><tbody>{costLines.map(([key,label])=>{const share=d.year1Operating?result.years[0][key]/d.year1Operating:0;return <tr key={key}><th scope="row">{label}<div className={styles.shareBar}><span style={{width:`${share*100}%`}}/></div></th><td>{money(result.years[0][key])}</td><td>{(share*100).toFixed(2)}%</td></tr>;})}<tr><th scope="row">Total operating cost</th><td>{money(d.year1Operating)}</td><td>{d.year1Operating?'100.00':'0.00'}%</td></tr></tbody></table></div></div></section>
        <section id="panel-Guide" role="tabpanel" aria-labelledby="tab-Guide" hidden={tab!=='Guide'} className={styles.tabPanel}><div className={styles.panel} id="guide"><div className={styles.guideCallout}><h2>A guide to every input.</h2><p>What it means, why it matters, what to enter, examples and mistakes to avoid. Search all 33 fields or print the complete reference.</p><a href="/tools/ai-tco-calculator/user-guide" target="_blank" rel="noopener">Open the full User Guide (new tab)</a></div><div className={styles.panelHeading}><div><h2>Understand the economics.</h2><p>Practical guidance, privacy, and limitations.</p></div><span>USING THE CALCULATOR</span></div>{content.guide.map(g=>[g.title,g.text]).map(([title,text])=><article className={styles.guideTopic} key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></section>
        </div>
        <IssueReport />
        <p className={styles.resultFootnote}>Educational scenario planning. Provider rates are fetched snapshots, not price guarantees. No currency conversion. Calculator {APP_VERSION} · Cost model 1.0 · All capabilities free.<br/><a href="/tools/ai-tco-calculator/user-guide" target="_blank" rel="noopener">User Guide</a> · <Link href="/tools/ai-tco-calculator/methodology" prefetch={false}>About these estimates</Link> · <Link href="/tools/ai-tco-calculator/privacy" prefetch={false}>Privacy</Link> · <Link href="/tools/ai-tco-calculator/changelog" prefetch={false}>Changelog</Link></p>
      </div>
    </div>
    <div className={styles.printAssumptions}><h2>Scenario assumptions</h2>{inputKeys.map(k=><p key={k}><b>{fieldByKey[k].label}: </b>{typeof inputs[k]==='boolean'?(inputs[k]?'Yes':'No'):percentages.includes(k)?`${(inputs[k] as number)*100}%`:String(inputs[k])}</p>)}</div>
  </div>;
}
