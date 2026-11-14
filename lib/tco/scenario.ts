import { APP_VERSION, MODEL_VERSION, calculateTco, type TcoInputs, validateInputs } from './model.ts';
export const MAX_SCENARIO_BYTES = 64 * 1024;
export function exportScenario(inputs: TcoInputs) {
  validateInputs(inputs);
  return JSON.stringify({schemaVersion:'1.0',modelVersion:MODEL_VERSION,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),provenance:inputs.priceProvenance,inputs},null,2);
}
export function importScenario(text: string): TcoInputs {
  if (new TextEncoder().encode(text).length > MAX_SCENARIO_BYTES) throw new Error('Scenario files must be 64 KB or smaller.');
  let data;
  try {data = JSON.parse(text);} catch {throw new Error('This file is not valid JSON.');}
  if (!data || data.schemaVersion !== '1.0' || data.modelVersion !== MODEL_VERSION) throw new Error('Unsupported scenario schema or financial model version.');
  if (typeof data.appVersion !== 'string' || typeof data.exportedAt !== 'string' || !Number.isFinite(Date.parse(data.exportedAt)) || typeof data.provenance !== 'string') throw new Error('Scenario version, export date and provenance are required.');
  validateInputs(data.inputs);
  if (data.provenance !== data.inputs.priceProvenance) throw new Error('Scenario provenance does not match the input source.');
  calculateTco(data.inputs);
  return {...data.inputs};
}
