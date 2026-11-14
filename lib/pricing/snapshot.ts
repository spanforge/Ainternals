import type {ModelPrice} from './normalize.ts';
import {workloadError,type Workload} from './estimate.ts';
import {parsePlanner,type PlannerState} from './planner.ts';
import {providers} from '../../config/featured-models.ts';

export type ComparisonSnapshot={schemaVersion:'price-watch-1.1';createdAt:string;workload:Workload;planner:PlannerState;selected:string[];query:string;provider:string;sort:string;ascending:boolean;models:ModelPrice[]};
export function parseComparisonSnapshot(text:string):ComparisonSnapshot {
  if(new TextEncoder().encode(text).length>1000000)throw new Error('Comparison snapshots must be 1 MB or smaller.');
  let d:ComparisonSnapshot;try{d=JSON.parse(text);}catch{throw new Error('This file is not valid comparison JSON.');}
  if(!d||d.schemaVersion!=='price-watch-1.1'||typeof d.createdAt!=='string'||!Number.isFinite(Date.parse(d.createdAt))||!Array.isArray(d.models)||d.models.length<1||d.models.length>100)throw new Error('Unsupported or incomplete comparison snapshot.');
  if(!d.workload||workloadError(d.workload))throw new Error('The snapshot workload is invalid.');
  const isNumber=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
  for(const m of d.models){
    if(!m||typeof m.modelId!=='string'||m.modelId.length>200||typeof m.displayName!=='string'||m.displayName.length>200||!Object.hasOwn(providers,m.provider)||!Array.isArray(m.tiers)||m.tiers.length>100||!['fresh','stale','unavailable'].includes(m.sourceStatus)||!Array.isArray(m.warnings)||m.warnings.some(w=>typeof w!=='string'||w.length>3000))throw new Error('The snapshot has invalid model metadata.');
    for(const url of [m.sourceUrl,m.providerPricingUrl]){let u:URL;try{u=new URL(url);}catch{throw new Error('Invalid pricing source URL.');}if(u.protocol!=='https:'||u.username||u.password)throw new Error('Pricing source links must be HTTPS.');}
    if(typeof m.pricingNote!=='string'||m.pricingNote.length>5000||typeof m.source!=='string'||m.source.length>500||m.rateScope!==undefined&&(typeof m.rateScope!=='string'||m.rateScope.length>3000)||m.apiModelId!==undefined&&(typeof m.apiModelId!=='string'||m.apiModelId.length>200)||![m.inputUsdPerMillion,m.outputUsdPerMillion].every(v=>v===null||isNumber(v)))throw new Error('Invalid snapshot display fields.');
    if(m.fetchedAt!==null&&!Number.isFinite(Date.parse(m.fetchedAt)))throw new Error('Invalid source timestamp.');
    if(m.validUntil!==undefined&&!Number.isFinite(Date.parse(m.validUntil)))throw new Error('Invalid pricing expiry.');
    if([m.contextWindow,m.maxOutput].some(v=>v!==undefined&&(!Number.isSafeInteger(v)||v<1)))throw new Error('Invalid model capacity.');
    for(const t of m.tiers){if(!t||typeof t.id!=='string'||typeof t.label!=='string'||t.label.length>1000||![t.input,t.output,t.minInput].every(isNumber)||!Number.isSafeInteger(t.minInput)||t.maxInput!==null&&(!Number.isSafeInteger(t.maxInput)||t.maxInput<t.minInput)||!['standard','batch'].includes(t.processing)||!['default','singapore','us','eu'].includes(t.region)||!['any','peak','off-peak'].includes(t.period)||[t.cacheWrite5m,t.cacheWrite1h].some(v=>v!==undefined&&!isNumber(v)))throw new Error('Invalid snapshot billing tier.');}
    // Imported evidence is not executed or needed for a cost snapshot.
    delete m.evidence;
  }
  const ids=d.models.map(m=>m.modelId);if(new Set(ids).size!==ids.length)throw new Error('Duplicate snapshot model identities.');
  d.planner=parsePlanner(d.planner,ids);
  if(!Array.isArray(d.selected)||d.selected.length>4||d.selected.some(id=>!ids.includes(id))||new Set(d.selected).size!==d.selected.length||typeof d.query!=='string'||d.query.length>100||typeof d.provider!=='string'||!['All providers',...Object.keys(providers)].includes(d.provider)||!['provider','displayName','input','output','monthly'].includes(d.sort)||typeof d.ascending!=='boolean')throw new Error('Invalid comparison selections.');
  return d;
}
export function exportComparisonSnapshot(d:ComparisonSnapshot){
  const models=d.models.map(m=>{const copy={...m};delete copy.evidence;return copy;});
  const json=JSON.stringify({...d,models},null,2);parseComparisonSnapshot(json);return json;
}
