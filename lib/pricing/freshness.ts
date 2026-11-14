import type {ModelPrice} from './normalize.ts';
export function priceStatus(model:Pick<ModelPrice,'sourceStatus'|'fetchedAt'|'validUntil'>,now:number):ModelPrice['sourceStatus'] {
  const fetched=model.fetchedAt?Date.parse(model.fetchedAt):NaN;
  if(model.sourceStatus==='unavailable'||!Number.isFinite(fetched)||fetched>now+60000)return 'unavailable';
  if(model.validUntil&&(!Number.isFinite(Date.parse(model.validUntil))||now>=Date.parse(model.validUntil)))return 'unavailable';
  return model.sourceStatus==='stale'||now-fetched>=3600000?'stale':'fresh';
}
