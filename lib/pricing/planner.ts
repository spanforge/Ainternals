import {estimateModel,workloadError,type Estimate,type Workload} from './estimate.ts';
import type {ModelPrice} from './normalize.ts';
import {modelCapabilities} from '../../config/model-capabilities.ts';

export type RequestGroup={name:string;input:number;output:number;requests:number};
export type PlannerState={mixed:boolean;groups:RequestGroup[];baseline:string;budget:number|null;lowPercent:number;highPercent:number;minContext:number;minOutput:number;structuredOnly:boolean;inputType:'any'|'text'|'image'};
export const defaultPlanner:PlannerState={mixed:false,groups:[],baseline:'',budget:null,lowPercent:50,highPercent:150,minContext:0,minOutput:0,structuredOnly:false,inputType:'any'};
export function plannerError(p:PlannerState):string|null {
  if(typeof p.mixed!=='boolean'||typeof p.structuredOnly!=='boolean'||typeof p.baseline!=='string'||!['any','text','image'].includes(p.inputType))return 'Choose valid planner options.';
  if(p.budget!==null&&(!Number.isFinite(p.budget)||p.budget<0))return 'Monthly budget must be zero or a positive USD amount.';
  if(![p.lowPercent,p.highPercent].every(v=>Number.isFinite(v)&&v>=0&&v<=1000)||p.lowPercent>100||p.highPercent<100)return 'Low demand must be 0–100% and high demand 100–1,000% of expected volume.';
  if(![p.minContext,p.minOutput].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=10000000))return 'Capacity requirements must be whole token counts from 0 to 10,000,000.';
  if(!Array.isArray(p.groups)||p.groups.length>8||p.mixed&&p.groups.length===0)return 'Use between one and eight request groups for a mixed workload.';
  for(const g of p.groups){if(!g||typeof g.name!=='string'||!g.name.trim()||g.name.length>80)return 'Give each request group a name of 1–80 characters.';const error=workloadError({...g,processing:'standard',region:'singapore',period:'peak',kimiTtl:'5m'});if(error)return `${g.name}: ${error}`;}
  return null;
}
export function parsePlanner(value:unknown,modelIds:string[]):PlannerState {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Planner options must be an object.');
  const p=value as PlannerState;
  const error=plannerError(p);if(error)throw new Error(error);
  if(p.baseline&&!modelIds.includes(p.baseline))throw new Error('The baseline model is not in this comparison.');
  return {mixed:p.mixed,groups:p.groups.map(g=>({name:g.name,input:g.input,output:g.output,requests:g.requests})),baseline:p.baseline,budget:p.budget,lowPercent:p.lowPercent,highPercent:p.highPercent,minContext:p.minContext,minOutput:p.minOutput,structuredOnly:p.structuredOnly,inputType:p.inputType};
}
export function requestGroups(w:Workload,p:PlannerState):RequestGroup[]{return p.mixed?p.groups:[{name:'Main workload',input:w.input,output:w.output,requests:w.requests}];}
export type MixEstimate=Estimate&{groups:{group:RequestGroup;estimate:Estimate}[];totalRequests:number;totalInput:number;totalOutput:number;isBlended:boolean};
export function estimateWorkload(model:ModelPrice,w:Workload,p:PlannerState,now:number,volumePercent=100):MixEstimate {
  const groups=requestGroups(w,p).map(g=>({...g,requests:Math.round(g.requests*volumePercent/100)}));
  const rows=groups.map(group=>({group,estimate:estimateModel(model,{...w,...group},now)}));
  const totalRequests=groups.reduce((s,g)=>s+g.requests,0),totalInput=groups.reduce((s,g)=>s+g.input*g.requests,0),totalOutput=groups.reduce((s,g)=>s+g.output*g.requests,0);
  const base={groups:rows,totalRequests,totalInput,totalOutput,isBlended:false};
  const invalid=plannerError(p)||(!p.mixed?workloadError(w):null);
  const failed=rows.find(row=>row.estimate.reason&&(row.group.requests>0||totalRequests===0));
  if(invalid||failed)return {...base,monthly:null,perRequest:null,inputCost:null,outputCost:null,writeCost:null,tier:null,reason:invalid??`${failed!.group.name}: ${failed!.estimate.reason}`,notes:[]};
  const active=rows.filter(row=>row.group.requests>0);
  const inputCost=active.reduce((s,r)=>s+r.estimate.inputCost!,0),outputCost=active.reduce((s,r)=>s+r.estimate.outputCost!,0),writeCost=active.reduce((s,r)=>s+r.estimate.writeCost!,0);
  const monthly=inputCost+outputCost+writeCost;
  if(!Number.isFinite(monthly))return {...base,monthly:null,perRequest:null,inputCost:null,outputCost:null,writeCost:null,tier:null,reason:'This workload exceeds the supported calculation range.',notes:[]};
  const tiers=[...new Map((active.length?active:rows).filter(r=>r.estimate.tier).map(r=>[r.estimate.tier!.id,r.estimate.tier!])).values()];
  const isBlended=tiers.length>1;
  const tier=isBlended?{...tiers[0],id:'workload-blend',label:`Workload-weighted rates across ${tiers.length} request tiers`,input:totalInput?inputCost/totalInput*1e6:0,output:totalOutput?outputCost/totalOutput*1e6:0}:tiers[0]??null;
  return {...base,isBlended,tier,monthly,inputCost,outputCost,writeCost,perRequest:totalRequests?monthly/totalRequests:rows[0]?.estimate.perRequest??0,reason:null,notes:[...new Set(rows.flatMap(r=>r.estimate.notes))]};
}
export function baselineDifference(amount:number|null,baseline:number|null){if(amount===null||baseline===null)return null;const monthly=baseline-amount;return {monthly,annual:monthly*12,percent:baseline>0?monthly/baseline*100:null};}
export function fitsRequirements(model:ModelPrice,p:PlannerState):boolean {
  const c=modelCapabilities[model.modelId];
  return (!p.minContext||Boolean(model.contextWindow&&model.contextWindow>=p.minContext))&&(!p.minOutput||Boolean(model.maxOutput&&model.maxOutput>=p.minOutput))&&(!p.structuredOnly||c?.structuredOutput===true)&&(p.inputType==='any'||(p.inputType==='image'?c?.imageInput===true:c?.textInput===true));
}
export function capacityBudget(budget:number|null,estimate:MixEstimate){
  if(budget===null||estimate.monthly===null)return null;
  return {headroom:budget-estimate.monthly,fits:estimate.monthly<=budget,requests:estimate.perRequest&&estimate.perRequest>0?Math.floor(budget/estimate.perRequest):null};
}
export function recoveryAction(reason:string|null){if(!reason)return '';if(/fresh|expired|fetch|source|timestamp/i.test(reason))return 'Refresh official prices, or load a saved snapshot for a clearly labeled historical comparison.';if(/output|context|window|capacity/i.test(reason))return 'Reduce the affected request size or choose a model with verified capacity for it.';if(/batch/i.test(reason))return 'Choose Standard processing or a model with a published Batch tier.';if(/deployment|region/i.test(reason))return 'Choose a supported deployment region or another model.';if(/tier/i.test(reason))return 'Check processing, region, billing period and request size. No substitute rate is assumed.';return 'Check the highlighted workload inputs before comparing costs.';}

export function parseUsageCsv(text:string):RequestGroup[]{
  if(new TextEncoder().encode(text).length>65536)throw new Error('Usage CSV must be 64 KB or smaller.');
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell.trim())throw new Error('Malformed CSV quoting.');else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n'||c==='\r')){row.push(cell);cell='';if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v.trim()))rows.push(row);row=[];}}else cell+=c;}
  if(quoted)throw new Error('Unclosed quote in usage CSV.');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  if(rows.shift()?.map(v=>v.replace(/^\uFEFF/,'').trim().toLowerCase()).join(',')!=='name,input_tokens,output_tokens,requests')throw new Error('CSV headers must be name,input_tokens,output_tokens,requests.');
  if(rows.length<1||rows.length>8)throw new Error('Import one to eight aggregated usage groups. No prompts or credentials are needed.');
  const groups=rows.map(r=>{if(r.length!==4||r.slice(1).some(v=>!/^\d+$/.test(v.trim())))throw new Error('Use whole-number token counts and request volumes in each CSV row.');return {name:r[0].trim(),input:Number(r[1]),output:Number(r[2]),requests:Number(r[3])};});
  const error=plannerError({...defaultPlanner,mixed:true,groups});if(error)throw new Error(error);return groups;
}
