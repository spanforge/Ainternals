import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import content from '@/lib/tco/presentation.json';
import styles from '@/components/tco/Calculator.module.css';
import IssueReport from '@/components/tco/IssueReport';

const pages: Record<string,{title:string;sections:{title:string;text:string}[]}> = {
  methodology:{title:'About these estimates',sections:content.guide.filter(s=>s.title!=='Privacy')},
  privacy:{title:'Calculator privacy notice',sections:[
    {title:'Browser-local scenarios',text:'Calculator assumptions and results are held in browser memory. We do not intentionally transmit them to application servers or analytics endpoints. Refreshing resets the scenario. There is no automatic persistence in localStorage, IndexedDB, cookies or cloud storage. No login, contact information, payment or marketing consent is required.'},
    {title:'Files and printing',text:'JSON import reads a file in your browser. Export creates a local download containing all assumptions, provenance, versions and export time. Printing uses your browser print dialog. These actions do not upload scenario files. Store exported files carefully, and check their contents before sharing.'},
    {title:'Page loading and pricing',text:'Your browser requests application assets and public Price Watch model data from the host. The pricing service retrieves official provider documents; your request sizes, costs and results are not included in those requests. Billing-tier matching and scenario calculations happen locally. The host may process ordinary connection information such as IP address. Calculator routes do not load marketing analytics, session replay or external fonts. Development preview uses Next.js development connections. Following an external link invokes that site’s privacy practices.'},
  ]},
  changelog:{title:'Calculator updates',sections:[
    {title:'Version 0.4.0',text:'Connected the calculator to Price Watch model data, with published billing-tier matching, source timestamps, automatic rate population and local request-size rechecks. Added model links from Price Watch, USD safeguards, required cache-write handling and saved-rate reproducibility. Manual pricing remains available. The three-year cost model is unchanged.'},
    {title:'Version 0.3.0',text:'Added a searchable, printable User Guide for all 33 inputs and detailed help beside every field. Improved pricing and comparison grouping, everyday financial labels, validation messages and result interpretation. Financial calculations and defaults are unchanged.'},
    {title:'Version 0.2.0',text:'A clearer online experience with a refined planning-period display, practical guidance and results-focused annual breakdowns. Financial calculations and default assumptions are unchanged.'},
    {title:'Version 0.1.0',text:'Introduced three-year cost estimates, workload assumptions, annual cost breakdowns, optional human-only comparison, scenario import and export, and printable results.'},
    {title:'Cost model 1.0',text:'The cost model version is tracked separately from interface updates so saved scenarios remain reproducible.'},
  ]},
};
export function generateStaticParams(){return Object.keys(pages).map(document=>({document}));}
export async function generateMetadata({params}:{params:Promise<{document:string}>}):Promise<Metadata>{const {document}=await params;return {title:`${pages[document]?.title ?? 'Calculator documentation'} | AInternals`,alternates:{canonical:`/tools/ai-tco-calculator/${document}`}};}
export default async function Page({params}:{params:Promise<{document:string}>}){
  const {document}=await params;const page=pages[document];if(!page)notFound();
  return <div className={styles.calculator}><div className={styles.breadcrumb}><Link href="/tools/ai-tco-calculator" prefetch={false}>← Back to AI TCO Calculator</Link></div><div className={styles.heading}><div><p className={styles.eyebrow}>AINTERNALS · THE ECONOMICS OF INTELLIGENCE</p><h1>{page.title}</h1></div></div><section className={styles.panel}>{page.sections.map(s=><article className={styles.guideTopic} key={s.title}><h2>{s.title}</h2><p>{s.text}</p></article>)}</section><IssueReport /></div>;
}
