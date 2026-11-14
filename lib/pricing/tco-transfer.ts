import {defaults,type TcoInputs} from '../tco/model.ts';
import {exportScenario,importScenario} from '../tco/scenario.ts';
import type {ModelPrice} from './normalize.ts';
import {estimateWorkload,type PlannerState} from './planner.ts';
import type {Workload} from './estimate.ts';
import {tcoModelLink} from '../tco/pricing.ts';

export function workloadTcoScenario(model:ModelPrice,w:Workload,p:PlannerState,now:number):TcoInputs {
  const e=estimateWorkload(model,w,p,now);if(e.monthly===null||e.totalRequests<1)throw new Error('Choose a currently estimated model and a positive request volume before transferring.');
  const inputTokensPerAttempt=Math.ceil(e.totalInput/e.totalRequests),outputTokensPerAttempt=Math.ceil(e.totalOutput/e.totalRequests);
  const x={...defaults,monthlyAttempts:e.totalRequests,inputTokensPerAttempt,outputTokensPerAttempt,
    inputPricePerMillion:inputTokensPerAttempt?(e.inputCost!+e.writeCost!)/e.totalRequests/inputTokensPerAttempt*1e6:0,
    outputPricePerMillion:outputTokensPerAttempt?e.outputCost!/e.totalRequests/outputTokensPerAttempt*1e6:0,
    priceProvenance:`Price Watch workload snapshot | ${model.provider} ${model.displayName} (${model.modelId}) | ${w.processing}; ${w.region}; ${w.period}; ${w.kimiTtl} cache TTL | ${p.mixed?'Workload-weighted effective rates; average token counts rounded up and rates adjusted to preserve the monthly modeled token bill.':'One request per task; effective input includes any mandatory cache writes.'} | fetched ${model.fetchedAt} | ${model.sourceUrl}`};
  return importScenario(exportScenario(x));
}

export function carryWorkloadToTco(model:ModelPrice,w:Workload,p:PlannerState,now:number,onStatus:(message:string)=>void):()=>void {
  const scenario=exportScenario(workloadTcoScenario(model,w,p,now));
  if(!window.confirm('Carry this workload and rate snapshot into the TCO calculator? One request will map to one attempted task. Other operating assumptions remain illustrative defaults. Mixed workloads use average token counts and adjusted effective rates to preserve the token bill. Transfer stays between these browser tabs.'))return ()=>{};
  const target=window.open(`${tcoModelLink(model.modelId,w)}#receive-workload`,'_blank');
  if(!target){onStatus('The calculator tab was blocked. Allow this popup and try again, or save your comparison instead.');return ()=>{};}
  const origin=window.location.origin;
  const cleanup=()=>{window.removeEventListener('message',receive);window.clearTimeout(timer);};
  function receive(event:MessageEvent){if(event.origin!==origin||event.source!==target)return;if(event.data?.type==='ainternals-tco-ready')target!.postMessage({type:'ainternals-tco-workload',scenario},origin);if(event.data?.type==='ainternals-tco-received'){onStatus('Workload transferred locally. Review the imported assumptions in the calculator.');cleanup();}}
  window.addEventListener('message',receive);
  const timer=window.setTimeout(()=>{cleanup();onStatus('Transfer timed out. Keep both tabs open and try the carry-workload action again.');},60000);
  onStatus('The calculator is opening. Confirm the import in its tab to complete the local transfer.');return cleanup;
}
