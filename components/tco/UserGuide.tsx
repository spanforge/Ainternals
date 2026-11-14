'use client';

import Link from 'next/link';

import { useState } from 'react';
import { APP_VERSION } from '@/lib/tco/model';
import { assumptionGroups, fieldByKey } from '@/lib/tco/guidance';
import content from '@/lib/tco/presentation.json';
import FieldExplanation from './FieldExplanation';
import IssueReport from './IssueReport';
import styles from './UserGuide.module.css';

export default function UserGuide() {
  const [query,setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase();
  const matches = (key:keyof typeof fieldByKey) => !search || Object.values(fieldByKey[key]).join(' ').toLocaleLowerCase().includes(search);
  const matchedCount = assumptionGroups.flatMap(group=>group.keys).filter(matches).length;

  return <div className={styles.userGuide} data-tco-calculator data-user-guide>
    <div className={styles.topActions}><Link href="/tools/ai-tco-calculator" prefetch={false}>← Open calculator</Link><button onClick={()=>window.print()}>Print guide / Save PDF ↗</button></div>
    <header className={styles.intro}><p className={styles.eyebrow}>AINTERNALS · AI TCO CALCULATOR</p><h1>Every input, explained.</h1><p>Understand what to enter, why it matters, and where to find reliable assumptions. A practical guide to all 33 fields, with examples and common mistakes.</p><span>Calculator {APP_VERSION} · Cost model 1.0 · Examples are illustrative</span></header>
    <div className={styles.guideLayout}>
      <aside className={styles.guideNavigation} aria-label="User guide navigation">
        <label htmlFor="guide-search">Find a field or topic</label>
        <input id="guide-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try review, tokens, or setup"/>
        <p role="status">{matchedCount} of 33 fields shown</p>
        {query&&<button onClick={()=>setQuery('')}>Clear search</button>}
        <nav aria-label="Guide sections">{assumptionGroups.map((group,index)=><a key={group.id} href={`#guide-${group.id}`} hidden={!group.keys.some(matches)}><span>0{index+1}</span>{group.title}<small>{group.keys.filter(matches).length}</small></a>)}<a href="#guide-results">Reading your results</a><a href="#guide-checklist">Before you decide</a></nav>
        <p className={styles.navigationNote}>Printing always includes all 33 fields, even when search is active.</p>
      </aside>
      <div className={styles.guideBody}>
        <section className={styles.quickStart}><h2>A consistent scenario starts here.</h2><p>Define one workflow task and use that definition throughout. Enter all money in one currency. Replace illustrative defaults with measured usage, verified prices and realistic budgets. Start with General & success, then work through the remaining sections.</p><p>To use Price Watch, choose a model and billing options in the calculator, confirm a single-request task and apply the rates. Linked pricing requires USD for every cost. Matching uses your token counts locally; it does not send assumptions to the pricing service. For multi-call tasks or mixed request sizes, use a verified blended manual rate.</p><p>The human-only comparison is optional. Saving or printing results does not require an account. Your scenario stays in browser memory until you export it; refreshing resets it.</p></section>
        {matchedCount===0&&<p className={styles.emptyState} role="status">No matching fields. Try a field name, cost category, or a shorter search.</p>}
        {assumptionGroups.map((group,index)=><section key={group.id} id={`guide-${group.id}`} className={styles.guideSection} hidden={!group.keys.some(matches)}>
          <div className={styles.sectionHeading}><span>0{index+1}</span><div><h2>{group.title}</h2><p>{group.subtitle}</p></div><small>{group.keys.length} fields</small></div>
          {group.keys.map(key=>{const field=fieldByKey[key];return <article key={key} id={`field-${key}`} data-field-guide={key} className={styles.fieldCard} hidden={!matches(key)}><div className={styles.fieldHeading}><h3>{field.label}</h3><span>{field.unit}</span></div><FieldExplanation field={field}/></article>;})}
        </section>)}
        <section id="guide-results" className={styles.resultGuide}><h2>Reading your results</h2>
          <h3>Setup, ongoing costs and totals</h3><p>Upfront investment is the one-time setup budget, included in Year 1 only. Operating costs cover running the workflow. Annual totals include the costs for that year; cumulative totals include all years up to that point.</p>
          <h3>Present value</h3><p>Present value expresses future expenses in today&apos;s terms. It helps compare costs occurring at different times. It is separate from the undiscounted amount you expect to spend, and a lower present-value figure does not mean the bill has been reduced.</p>
          <h3>Successful-task costs</h3><p>These describe the cost of useful outcomes, including recovered tasks. Unresolved failures are excluded from successful-task counts. A zero unit cost alongside zero attempts or successes is not a meaningful cost estimate.</p>
          <h3>Positive and negative cost advantage</h3><p>A positive advantage means modeled AI costs are lower than the human-only alternative. A negative advantage means modeled AI costs are higher. Compare equivalent scope, quality and outcomes. Neither result establishes ROI or guarantees cash savings.</p>
          <h3>Annual versus three-year comparison</h3><p>Annual advantages describe a single year. Three-year advantages describe the full period. The three-year present-value comparison includes initial setup and discounts future operating expenses for both alternatives consistently.</p>
        </section>
        <section id="guide-checklist" className={styles.resultGuide}><h2>Before you decide</h2>{content.guide.filter(g=>['What is excluded','Check before deciding','Privacy'].includes(g.title)).map(g=><div key={g.title}><h3>{g.title}</h3><p>{g.text}</p></div>)}<h3>Save the assumptions behind the result</h3><p>Use Export scenario to keep a JSON file you can import later. Print the calculator to share the assumptions and results; print this guide separately for the full field reference. Files can contain sensitive business assumptions, so store and share them carefully.</p></section>
      </div>
    </div>
    <IssueReport />
    <footer className={styles.guideFooter}>AInternals · The Economics of Intelligence. Educational scenario planning; not a vendor quote, ROI calculation or savings guarantee.</footer>
  </div>;
}
