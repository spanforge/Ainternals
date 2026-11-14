import { estimateModel, type Workload } from '../pricing/estimate.ts';
import type { ModelPrice } from '../pricing/normalize.ts';
import type { TcoInputs } from './model.ts';

export type PricingOptions = Pick<Workload, 'processing'|'region'|'period'|'kimiTtl'> & {singleRequest:boolean};
export const defaultPricingOptions: PricingOptions = {processing:'standard',region:'singapore',period:'peak',kimiTtl:'5m',singleRequest:false};
export type PricingBinding = {model:ModelPrice;options:PricingOptions};
export type PricingResolution =
  | {ok:false;reason:string}
  | {ok:true;patch:Pick<TcoInputs,'inputPricePerMillion'|'outputPricePerMillion'|'priceProvenance'>;tierLabel:string;tierId:string;cacheWriteRate:number;notes:string[]};

export function resolveTcoPricing(model:ModelPrice, inputs:TcoInputs, options:PricingOptions, now=Date.now()):PricingResolution {
  const fail=(reason:string):PricingResolution=>({ok:false,reason});
  if(inputs.currency!=='USD')return fail('Price Watch publishes USD rates. Convert all scenario costs to USD yourself and select USD before linking, or use manual pricing. Changing the currency label does not convert any amounts.');
  if(!options.singleRequest)return fail('Confirm that tokens per attempt describe one billed model request. For multi-call workflows or requests spanning different pricing tiers, use a verified blended rate in manual pricing.');
  const fetched=model.fetchedAt?Date.parse(model.fetchedAt):NaN;
  if(!Number.isFinite(fetched)||fetched>now+60000)return fail('A valid official source fetch time is required. Reload pricing or use manual pricing.');
  if(model.validUntil&&!Number.isFinite(Date.parse(model.validUntil)))return fail('The pricing validity period is invalid. Reload pricing or use manual pricing.');
  const estimate=estimateModel(model,{input:inputs.inputTokensPerAttempt,output:inputs.outputTokensPerAttempt,requests:1,...options},now);
  if(estimate.reason||!estimate.tier)return fail(estimate.reason??'No validated pricing tier matches these assumptions.');
  const tier=estimate.tier;
  const cacheWriteRate=model.provider==='Moonshot AI'?(options.kimiTtl==='5m'?tier.cacheWrite5m!:tier.cacheWrite1h!):0;
  const inputPricePerMillion=tier.input+cacheWriteRate;
  if(![tier.input,tier.output,cacheWriteRate,inputPricePerMillion].every(v=>Number.isFinite(v)&&v>=0))return fail('This billing tier has an invalid or incomplete rate. Reload pricing or use manual pricing.');
  const scope=[options.processing,model.provider==='Alibaba Cloud'?options.region:null,model.provider==='DeepSeek'?options.period:null,model.provider==='Moonshot AI'?`${options.kimiTtl} cache writes`:null].filter(Boolean).join('; ');
  const priceProvenance=`Price Watch snapshot | ${model.provider} | ${model.displayName} (${model.apiModelId??model.modelId}) | ${tier.label} | ${scope} | USD per 1M tokens: input ${inputPricePerMillion}, output ${tier.output}${model.provider==='Moonshot AI'?` (effective input includes ${cacheWriteRate} required cache-write charge)`:''} | fetched ${model.fetchedAt} | ${model.sourceUrl}`;
  if(priceProvenance.length>2000)return fail('The source reference is too long for this scenario. Use a shorter verified reference in manual pricing.');
  return {ok:true,patch:{inputPricePerMillion,outputPricePerMillion:tier.output,priceProvenance},tierLabel:tier.label,tierId:tier.id,cacheWriteRate,notes:[...estimate.notes,...model.warnings]};
}

// Only public model/billing choices cross from Price Watch. No workload values are included.
export function tcoModelLink(modelId:string, options:Pick<Workload,'processing'|'region'|'period'|'kimiTtl'>) {
  const params=new URLSearchParams({model:modelId,processing:options.processing,region:options.region,period:options.period,kimiTtl:options.kimiTtl});
  return `/tools/ai-tco-calculator?${params}`;
}
