import {test} from 'node:test';
import assert from 'node:assert/strict';
import {featuredModels} from '../config/featured-models.ts';
import {normalizeOfficial,type ModelPrice} from '../lib/pricing/normalize.ts';
import type {BillingTier,OfficialRate} from '../lib/pricing/official-parsers.ts';
import {estimateModel} from '../lib/pricing/estimate.ts';
import {calculateTco,defaults} from '../lib/tco/model.ts';
import {exportScenario,importScenario} from '../lib/tco/scenario.ts';
import {defaultPricingOptions,resolveTcoPricing,tcoModelLink} from '../lib/tco/pricing.ts';

const now=Date.now();
const options={...defaultPricingOptions,singleRequest:true};
const tier=(id:string,input:number,output:number,extra:Partial<BillingTier>={}):BillingTier=>({id,label:id,input,output,minInput:0,maxInput:null,processing:'standard',region:'default',period:'any',...extra});
function model(id:string,tiers:BillingTier[],extra:Partial<OfficialRate>={}):ModelPrice {
  return normalizeOfficial(featuredModels.find(m=>m.modelId===id)!,{input:tiers[0].input,output:tiers[0].output,scope:'Test fixture only',notes:[],tiers,...extra},'https://example.com/official-pricing',new Date(now).toISOString());
}

test('TCO receives the exact matching Price Watch input/output rates and provenance',()=>{
  const m=model('gpt-6.1-sol',[tier('standard',1.25,6)]);
  const r=resolveTcoPricing(m,defaults,options,now);assert.ok(r.ok);
  assert.equal(r.patch.inputPricePerMillion,1.25);assert.equal(r.patch.outputPricePerMillion,6);
  assert.ok(r.patch.priceProvenance.includes(m.sourceUrl));assert.ok(r.patch.priceProvenance.includes(m.fetchedAt!));assert.ok(r.patch.priceProvenance.includes(m.modelId));
  const effective={...defaults,...r.patch};
  const tco=calculateTco(effective);
  assert.equal(tco.years[0].inputApi,300);assert.equal(tco.years[0].outputApi,360);
  assert.equal(tco.years[0].review,calculateTco(defaults).years[0].review);
  assert.equal(defaults.inputPricePerMillion,2);
});
test('zero provider prices remain valid and are not replaced by defaults',()=>{
  const r=resolveTcoPricing(model('gpt-6.1-sol',[tier('free',0,0)]),defaults,options,now);assert.ok(r.ok);assert.equal(r.patch.inputPricePerMillion,0);assert.equal(r.patch.outputPricePerMillion,0);
});
test('USD-only matching cannot silently relabel or convert a scenario',()=>{
  const m=model('gpt-6.1-sol',[tier('standard',1,5)]);
  for(const currency of ['EUR','INR','JPY']){const inputs={...defaults,currency};const r=resolveTcoPricing(m,inputs,options,now);assert.equal(r.ok,false);assert.equal(inputs.currency,currency);assert.equal(inputs.inputPricePerMillion,2);}
});
test('one-request acknowledgement is required; zero-input or invalid request sizes fail closed',()=>{
  const m=model('gpt-6.1-sol',[tier('standard',1,5)]);
  assert.equal(resolveTcoPricing(m,defaults,defaultPricingOptions,now).ok,false);
  for(const inputTokensPerAttempt of [0,-1,NaN,Infinity,1.5])assert.equal(resolveTcoPricing(m,{...defaults,inputTokensPerAttempt},options,now).ok,false);
});
test('context thresholds select the whole-request tier on both sides of the boundary',()=>{
  const m=model('gpt-6.1-sol',[tier('short',1,5,{maxInput:200000}),tier('long',2,10,{minInput:200001})]);
  const a=resolveTcoPricing(m,{...defaults,inputTokensPerAttempt:200000},options,now),b=resolveTcoPricing(m,{...defaults,inputTokensPerAttempt:200001},options,now);
  assert.ok(a.ok&&b.ok);assert.equal(a.patch.inputPricePerMillion,1);assert.equal(b.patch.inputPricePerMillion,2);
});
test('batch is applied only when there is a published validated matching tier',()=>{
  const m=model('gpt-6.1-sol',[tier('standard',2,10),tier('batch',1,5,{processing:'batch'})]);
  const r=resolveTcoPricing(m,defaults,{...options,processing:'batch'},now);assert.ok(r.ok);assert.equal(r.patch.inputPricePerMillion,1);
  assert.equal(resolveTcoPricing(model('gpt-6.1-sol',[tier('standard',2,10)]),defaults,{...options,processing:'batch'},now).ok,false);
});
test('regional and peak/off-peak choices use the same published matching logic as Price Watch',()=>{
  const q=model('qwen3.8-max',[tier('sg',1,5,{region:'singapore'}),tier('us',2,6,{region:'us'})]);
  const r=resolveTcoPricing(q,defaults,{...options,region:'us'},now);assert.ok(r.ok);assert.equal(r.patch.inputPricePerMillion,2);
  assert.equal(resolveTcoPricing(q,defaults,{...options,region:'eu'},now).ok,false);
  const d=model('deepseek-flash',[tier('peak',1,5,{period:'peak'}),tier('off',.5,2.5,{period:'off-peak'})]);
  const off=resolveTcoPricing(d,defaults,{...options,period:'off-peak'},now);assert.ok(off.ok);assert.equal(off.patch.inputPricePerMillion,.5);
});
test('required Kimi cache writes are included once in effective input pricing and reconcile to Price Watch',()=>{
  const m=model('kimi-k3.1-pro',[tier('standard',2,10,{cacheWrite5m:2,cacheWrite1h:4})]);
  for(const kimiTtl of ['5m','1h'] as const){
    const selected={...options,kimiTtl};const r=resolveTcoPricing(m,defaults,selected,now);assert.ok(r.ok);
    assert.equal(r.patch.inputPricePerMillion,kimiTtl==='5m'?4:6);
    assert.match(r.patch.priceProvenance,/required cache-write/);
    const year=calculateTco({...defaults,...r.patch}).years[0];
    const watch=estimateModel(m,{input:defaults.inputTokensPerAttempt,output:defaults.outputTokensPerAttempt,requests:defaults.monthlyAttempts,...selected},now);
    assert.ok(Math.abs((year.inputApi+year.outputApi)/12-watch.monthly!)<1e-9);
    assert.equal(year.otherApi,calculateTco(defaults).years[0].otherApi);
  }
  assert.equal(resolveTcoPricing(model('kimi-k3.1-pro',[tier('standard',2,10)]),defaults,options,now).ok,false);
});
test('stale, missing, invalid, future, expired and ambiguous snapshots cannot be linked',()=>{
  const m=model('gpt-6.1-sol',[tier('standard',1,5)]);
  for(const patch of [{sourceStatus:'stale' as const},{sourceStatus:'unavailable' as const},{fetchedAt:null},{fetchedAt:'invalid'},{fetchedAt:new Date(now+120000).toISOString()},{validUntil:new Date(now-1).toISOString()},{validUntil:'invalid'},{tiers:[tier('a',1,5),tier('b',2,6)]},{tiers:[tier('bad',NaN,5)]}])assert.equal(resolveTcoPricing({...m,...patch},defaults,options,now).ok,false);
  assert.equal(resolveTcoPricing(m,defaults,options,now+3600001).ok,false);
});
test('context-window and output-capacity limits prevent incompatible model estimates',()=>{
  const m=model('gpt-6.1-sol',[tier('standard',1,5)],{contextWindow:2400,maxOutput:450});
  assert.equal(resolveTcoPricing(m,defaults,options,now).ok,false);
  assert.equal(resolveTcoPricing(m,{...defaults,inputTokensPerAttempt:2000,outputTokensPerAttempt:400},options,now).ok,true);
});
test('export/import freezes chosen rates and source reference without needing current provider data',()=>{
  const r=resolveTcoPricing(model('gpt-6.1-sol',[tier('standard',1,5)]),defaults,options,now);assert.ok(r.ok);
  const snapshot={...defaults,...r.patch};assert.deepEqual(importScenario(exportScenario(snapshot)),snapshot);
  assert.deepEqual(calculateTco(importScenario(exportScenario(snapshot))).years,calculateTco(snapshot).years);
});
test('Price Watch handoff includes model/billing choices but no financial workload assumptions',()=>{
  const url=new URL(tcoModelLink('gpt-6.1-sol',options),'https://example.com');
  assert.equal(url.searchParams.get('model'),'gpt-6.1-sol');
  assert.deepEqual([...url.searchParams.keys()].sort(),['model','processing','region','period','kimiTtl'].sort());
  assert.equal(url.searchParams.has('input'),false);assert.equal(url.searchParams.has('requests'),false);
});
