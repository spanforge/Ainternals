import {test} from 'node:test';
import assert from 'node:assert/strict';
import {featuredModels} from '../config/featured-models.ts';
import {normalizeOfficial} from '../lib/pricing/normalize.ts';
import {defaultWorkload} from '../lib/pricing/estimate.ts';
import type {BillingTier} from '../lib/pricing/official-parsers.ts';
import {defaultPlanner,estimateWorkload,baselineDifference,capacityBudget,fitsRequirements,parseUsageCsv,plannerError,parsePlanner} from '../lib/pricing/planner.ts';
import {priceStatus} from '../lib/pricing/freshness.ts';
import {parseComparisonSnapshot,exportComparisonSnapshot,type ComparisonSnapshot} from '../lib/pricing/snapshot.ts';
import {workloadTcoScenario} from '../lib/pricing/tco-transfer.ts';
import {calculateTco} from '../lib/tco/model.ts';
const now=Date.now();
const t=(id:string,input:number,output:number,extra:Partial<BillingTier>={}):BillingTier=>({id,label:id,input,output,minInput:0,maxInput:null,processing:'standard',region:'default',period:'any',...extra});
const make=(tiers:BillingTier[],id='gpt-6.1-sol')=>normalizeOfficial(featuredModels.find(m=>m.modelId===id)!,{input:tiers[0].input,output:tiers[0].output,scope:'Test fixture',notes:[],tiers},'https://example.com/pricing',new Date(now).toISOString());

test('mixed request sizes price separately, avoiding an incorrect averaged context tier',()=>{
  const m=make([t('short',1,5,{maxInput:200000}),t('long',2,10,{minInput:200001})]);
  const p={...defaultPlanner,mixed:true,groups:[{name:'Short',input:1000,output:100,requests:9000},{name:'Long',input:300000,output:1000,requests:1000}]};
  const e=estimateWorkload(m,defaultWorkload,p,now);
  assert.equal(e.inputCost,609);assert.equal(e.outputCost,14.5);assert.equal(e.monthly,623.5);assert.equal(e.isBlended,true);assert.equal(e.totalRequests,10000);
});
test('one unsupported active group blocks the aggregate; an inactive group does not invent a cost',()=>{
  const m={...make([t('base',1,5)]),contextWindow:10000};
  const p={...defaultPlanner,mixed:true,groups:[{name:'Small',input:1000,output:100,requests:100},{name:'Large',input:20000,output:100,requests:1}]};
  assert.match(estimateWorkload(m,defaultWorkload,p,now).reason!,/Large/);
  p.groups[1].requests=0;assert.ok(Math.abs(estimateWorkload(m,defaultWorkload,p,now).monthly!-.15)<1e-12);
});
test('zero requests, zero prices, missing baseline and zero baseline are handled without infinities',()=>{
  const m=make([t('zero',0,0)]),e=estimateWorkload(m,{...defaultWorkload,requests:0},defaultPlanner,now);
  assert.equal(e.monthly,0);assert.equal(e.totalRequests,0);assert.equal(baselineDifference(1,null),null);assert.equal(baselineDifference(1,0)?.percent,null);assert.equal(capacityBudget(10,e)?.requests,null);
});
test('baseline differences have correct direction, annualization and budget headroom',()=>{
  assert.deepEqual(baselineDifference(80,100),{monthly:20,annual:240,percent:20});assert.equal(baselineDifference(120,100)?.monthly,-20);
  const e=estimateWorkload(make([t('base',2,10)]),defaultWorkload,defaultPlanner,now);
  assert.equal(e.monthly,180);assert.equal(capacityBudget(200,e)?.headroom,20);assert.equal(capacityBudget(100,e)?.fits,false);
});
test('demand scenarios change volumes without crossing request-size tiers',()=>{
  const m=make([t('base',2,10)]);
  assert.equal(estimateWorkload(m,defaultWorkload,defaultPlanner,now,50).monthly,90);assert.equal(estimateWorkload(m,defaultWorkload,defaultPlanner,now,150).monthly,270);
});
test('suitability filters fail closed on unknown capabilities and independent capacities',()=>{
  const m={...make([t('base',1,5)]),contextWindow:10000};
  assert.equal(fitsRequirements(m,{...defaultPlanner,structuredOnly:true,inputType:'image'}),true);
  assert.equal(fitsRequirements({...m,modelId:'unknown-model'},{...defaultPlanner,structuredOnly:true}),false);
  assert.equal(fitsRequirements(m,{...defaultPlanner,minOutput:1}),false);assert.equal(fitsRequirements(m,{...defaultPlanner,minContext:10001}),false);
});
test('shared freshness rejects missing, future, expired, invalid or aged timestamps consistently',()=>{
  const m=make([t('base',1,5)]);assert.equal(priceStatus(m,now),'fresh');assert.equal(priceStatus(m,now+3600000),'stale');
  for(const patch of [{fetchedAt:null},{fetchedAt:'bad'},{fetchedAt:new Date(now+120000).toISOString()},{validUntil:'bad'},{validUntil:new Date(now-1).toISOString()}])assert.equal(priceStatus({...m,...patch},now),'unavailable');
});
test('local CSV import handles quoted names and rejects malformed, excessive and invalid usage',()=>{
  assert.deepEqual(parseUsageCsv('name,input_tokens,output_tokens,requests\r\n"Chat, support",1000,200,100\r\n'),[{name:'Chat, support',input:1000,output:200,requests:100}]);
  for(const text of ['wrong,headers\na,b','name,input_tokens,output_tokens,requests\nTest,-1,2,3','name,input_tokens,output_tokens,requests\n"unfinished,1,2,3','name,input_tokens,output_tokens,requests\nTest,1.5,2,3','x'.repeat(65537)])assert.throws(()=>parseUsageCsv(text));
});
test('planner schema enforces bounds and known baseline identities',()=>{
  assert.ok(plannerError({...defaultPlanner,lowPercent:101}));assert.ok(plannerError({...defaultPlanner,highPercent:99}));assert.ok(plannerError({...defaultPlanner,budget:Infinity}));assert.throws(()=>parsePlanner({...defaultPlanner,baseline:'unknown'},['gpt-6.1-sol']));
});
test('comparison snapshots preserve rate assumptions and reject unsafe or invalid imported metadata',()=>{
  const m=make([t('base',1,5)]);const d:ComparisonSnapshot={schemaVersion:'price-watch-1.1',createdAt:new Date(now).toISOString(),workload:defaultWorkload,planner:defaultPlanner,selected:[m.modelId],query:'',provider:'All providers',sort:'monthly',ascending:true,models:[m]};
  const restored=parseComparisonSnapshot(exportComparisonSnapshot(d));assert.deepEqual(estimateWorkload(restored.models[0],restored.workload,restored.planner,Date.parse(restored.createdAt)),estimateWorkload(m,defaultWorkload,defaultPlanner,now));
  for(const change of [(v:ComparisonSnapshot)=>{v.models[0].sourceUrl='javascript:alert(1)';},(v:ComparisonSnapshot)=>{v.models[0].tiers[0].input=-1;},(v:ComparisonSnapshot)=>{v.models[0].pricingNote={} as string;},(v:ComparisonSnapshot)=>{v.selected=['bad'];}]){const x=structuredClone(d);change(x);assert.throws(()=>parseComparisonSnapshot(JSON.stringify(x)));}
});
test('TCO transfer preserves the monthly mixed token bill including required cache writes after average rounding',()=>{
  const m=make([t('base',2,10,{cacheWrite5m:2})],'kimi-k3.1-pro');
  const p={...defaultPlanner,mixed:true,groups:[{name:'A',input:1001,output:101,requests:3},{name:'B',input:2000,output:100,requests:2}]};
  const e=estimateWorkload(m,defaultWorkload,p,now);const x=workloadTcoScenario(m,defaultWorkload,p,now),y=calculateTco(x).years[0];
  assert.equal(x.monthlyAttempts,5);assert.ok(Number.isInteger(x.inputTokensPerAttempt));assert.ok(Math.abs((y.inputApi+y.outputApi)/12-e.monthly!)<1e-12);assert.match(x.priceProvenance,/rounded up/);
});
