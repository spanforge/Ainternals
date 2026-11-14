import entries from './field-guide.json';
import type { InputKey } from './model';

export type FieldGuide = {
  key: InputKey;
  label: string;
  hint: string;
  meaning: string;
  why: string;
  entry: string;
  source: string;
  example: string;
  influence: string;
  mistake: string;
  zero: string;
  unit: string;
};

export const fieldGuide = entries as FieldGuide[];
export const fieldByKey = Object.fromEntries(fieldGuide.map(field => [field.key, field])) as Record<InputKey, FieldGuide>;
export const assumptionGroups: {id:string;title:string;subtitle:string;keys:InputKey[]}[] = [
  {id:'workload', title:'General & success', subtitle:'Define the workload and its outcomes.', keys:['currency','annualVolumeGrowth','annualOperatingInflation','monthlyAttempts','firstPassRate','recoveryRate']},
  {id:'pricing', title:'Model & pricing', subtitle:'Usage, rates and the pricing reference.', keys:['inputTokensPerAttempt','outputTokensPerAttempt','inputPricePerMillion','outputPricePerMillion','otherApiCostPerAttempt','annualTokenPriceChange','priceProvenance']},
  {id:'operations', title:'Operating & scaling', subtitle:'People and systems behind every task.', keys:['cloudPerMonth','cloudScales','monitoringPerMonth','monitoringScales','licensesPerMonth','licensesScale','reviewMinutesPerAttempt','reviewerHourlyCost','reworkCostPerInitialFailure','supportPerMonth','supportScales']},
  {id:'investment', title:'Upfront & financial', subtitle:'Setup costs and financial assumptions.', keys:['implementationUpfront','dataPrepUpfront','trainingUpfront','complianceUpfront','contingencyRate','discountRate']},
  {id:'comparison', title:'Human-only comparison', subtitle:'Optional costs for equivalent manual work.', keys:['manualMinutesPerTask','manualHourlyCost','manualOverheadPerTask']},
];

export const explanationParts = [
  ['meaning','What it means'], ['why','Why it is included'], ['entry','What to enter'],
  ['source','Where to find it'], ['example','Illustrative example'],
  ['influence','What it influences'], ['mistake','Common mistake'], ['zero','When zero or off is appropriate'],
] as const;

export function readableError(error: unknown): string {
  let message = error instanceof Error ? error.message : 'Check this value and try again.';
  // Field names are stable model identifiers; only the displayed message is translated.
  for (const field of fieldGuide) message = message.replace(new RegExp(`\\b${field.key}\\b`, 'g'), field.label);
  return message;
}
