export const APP_VERSION = '0.4.0';
export const MODEL_VERSION = 'workbook-v1.0';
export const currencies = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY'];
export const defaults = {
  currency: 'USD', annualVolumeGrowth: .2, annualOperatingInflation: .05,
  monthlyAttempts: 10000, firstPassRate: .9, recoveryRate: .8,
  inputTokensPerAttempt: 2000, outputTokensPerAttempt: 500,
  inputPricePerMillion: 2, outputPricePerMillion: 10, otherApiCostPerAttempt: .01,
  cloudPerMonth: 500, cloudScales: true, monitoringPerMonth: 200, monitoringScales: false,
  licensesPerMonth: 300, licensesScale: false, reviewMinutesPerAttempt: 1,
  reviewerHourlyCost: 30, reworkCostPerInitialFailure: 1.5,
  supportPerMonth: 1000, supportScales: false, implementationUpfront: 15000,
  dataPrepUpfront: 5000, trainingUpfront: 3000, complianceUpfront: 2000,
  contingencyRate: .1, discountRate: .1, manualMinutesPerTask: 0,
  manualHourlyCost: 30, manualOverheadPerTask: 0, annualTokenPriceChange: 0,
  priceProvenance: 'Illustrative / not verified',
};
export type TcoInputs = typeof defaults;
export type InputKey = keyof TcoInputs;
export const inputKeys = Object.keys(defaults) as InputKey[];
export const percentages: InputKey[] = ['annualVolumeGrowth', 'annualOperatingInflation', 'firstPassRate', 'recoveryRate', 'contingencyRate', 'discountRate', 'annualTokenPriceChange'];
const integers: InputKey[] = ['monthlyAttempts', 'inputTokensPerAttempt', 'outputTokensPerAttempt'];
export function validateInputs(value: unknown): asserts value is TcoInputs {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Scenario inputs must be an object.');
  const x = value as Record<string, unknown>;
  if (Object.keys(x).length !== inputKeys.length || Object.keys(x).some(k => !inputKeys.includes(k as InputKey))) throw new Error('A scenario must contain exactly all 33 supported inputs.');
  for (const k of inputKeys) {
    const v = x[k];
    if (typeof v !== typeof defaults[k]) throw new Error(`Invalid value type for ${k}.`);
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw new Error(`${k}: enter a finite number.`);
      if (k === 'annualTokenPriceChange' ? v <= -1 : v < 0) throw new Error(k === 'annualTokenPriceChange' ? 'Token price change must be greater than -100%.' : `${k}: enter zero or a positive number.`);
      if (percentages.includes(k) && k !== 'annualTokenPriceChange' && v > 1) throw new Error(`${k}: enter a percentage between 0 and 100.`);
      if (integers.includes(k) && !Number.isInteger(v)) throw new Error(`${k}: enter a whole number.`);
    }
  }
  if (!currencies.includes(x.currency as string)) throw new Error('Select a supported currency.');
  if ((x.priceProvenance as string).length > 2000) throw new Error('Price provenance must be 2,000 characters or fewer.');
}
export const costLines = [
  ['inputApi', 'Model input'], ['outputApi', 'Model output'], ['otherApi', 'Other tools'],
  ['cloud', 'Infrastructure'], ['monitoring', 'Monitoring'], ['licenses', 'Licenses'],
  ['review', 'Human review'], ['rework', 'Rework'], ['support', 'Support'], ['contingency', 'Contingency'],
] as const;
export function calculateTco(x: TcoInputs) {
  validateInputs(x);
  const upfront = x.implementationUpfront + x.dataPrepUpfront + x.trainingUpfront + x.complianceUpfront;
  let cumulativeTco = 0, cumulativePv = 0;
  const manualEnabled = x.manualMinutesPerTask > 0;
  const years = [1, 2, 3].map(year => {
    const n = year - 1, v = (1 + x.annualVolumeGrowth) ** n, i = (1 + x.annualOperatingInflation) ** n, p = (1 + x.annualTokenPriceChange) ** n;
    const attempts = x.monthlyAttempts * 12 * v;
    const firstPass = attempts * x.firstPassRate;
    const recovered = (attempts - firstPass) * x.recoveryRate;
    const successful = firstPass + recovered, unresolved = attempts - successful;
    const inputApi = attempts * x.inputTokensPerAttempt * x.inputPricePerMillion / 1e6 * p;
    const outputApi = attempts * x.outputTokensPerAttempt * x.outputPricePerMillion / 1e6 * p;
    const otherApi = attempts * x.otherApiCostPerAttempt;
    const fixed = (amount: number, scale: boolean) => amount * 12 * i * (scale ? v : 1);
    const cloud = fixed(x.cloudPerMonth, x.cloudScales), monitoring = fixed(x.monitoringPerMonth, x.monitoringScales), licenses = fixed(x.licensesPerMonth, x.licensesScale), support = fixed(x.supportPerMonth, x.supportScales);
    const review = attempts * x.reviewMinutesPerAttempt / 60 * x.reviewerHourlyCost * i;
    const rework = (attempts - firstPass) * x.reworkCostPerInitialFailure * i;
    const recurringSubtotal = inputApi + outputApi + otherApi + cloud + monitoring + licenses + review + rework + support;
    const contingency = recurringSubtotal * x.contingencyRate, operatingTco = recurringSubtotal + contingency;
    const yearUpfront = year === 1 ? upfront : 0, totalTco = operatingTco + yearUpfront;
    cumulativeTco += totalTco;
    const manualBaseline = manualEnabled ? attempts * (x.manualMinutesPerTask / 60 * x.manualHourlyCost * i + x.manualOverheadPerTask * i) : 0;
    const pvOperating = operatingTco / (1 + x.discountRate) ** year;
    cumulativePv += pvOperating;
    const pvManual = manualEnabled ? manualBaseline / (1 + x.discountRate) ** year : 0;
    return { year, attempts, firstPass, recovered, successful, unresolved, inputApi, outputApi, otherApi, cloud, monitoring, licenses, review, rework, support, recurringSubtotal, contingency, operatingTco,
      implementation: year === 1 ? x.implementationUpfront : 0, dataPrep: year === 1 ? x.dataPrepUpfront : 0, training: year === 1 ? x.trainingUpfront : 0, compliance: year === 1 ? x.complianceUpfront : 0,
      yearUpfront, totalTco, cumulativeTco, costPerAttempt: attempts ? totalTco / attempts : 0,
      costPerSuccessfulIncludingUpfront: successful ? totalTco / successful : 0,
      operatingCostPerSuccessful: successful ? operatingTco / successful : 0,
      manualBaseline, netAdvantage: manualEnabled ? manualBaseline - totalTco : null,
      pvOperating, pvCumulativeIncludingUpfront: upfront + cumulativePv, pvManual,
      pvAdvantageYear: manualEnabled ? pvManual - pvOperating - yearUpfront : null };
  });
  const sum = (key: 'totalTco' | 'successful' | 'manualBaseline' | 'pvManual') => years.reduce((a, y) => a + y[key], 0);
  const total3Year = sum('totalTco'), successful3Year = sum('successful'), presentValue = years[2].pvCumulativeIncludingUpfront;
  const dashboard = {total3Year, successful3Year, blendedPerSuccessful: successful3Year ? total3Year / successful3Year : 0, year1Operating: years[0].operatingTco, upfrontInvestment: upfront, presentValue,
    baseline3Year: manualEnabled ? sum('manualBaseline') : null, netAdvantage3Year: manualEnabled ? sum('manualBaseline') - total3Year : null, currency: x.currency, pvAdvantage3Year: manualEnabled ? sum('pvManual') - presentValue : null};
  if (years.some(y => Object.values(y).some(v => typeof v === 'number' && !Number.isFinite(v))) || Object.values(dashboard).some(v => typeof v === 'number' && !Number.isFinite(v))) throw new Error('These assumptions exceed the supported numerical range. Reduce the values.');
  return { inputs: {...x}, years, dashboard, manualEnabled };
}
export type TcoResult = ReturnType<typeof calculateTco>;
export type TcoYear = TcoResult['years'][number];
export const rowKeys: Record<number, keyof TcoYear> = {5:'attempts',6:'firstPass',7:'recovered',8:'successful',9:'unresolved',11:'inputApi',12:'outputApi',13:'otherApi',14:'cloud',15:'monitoring',16:'licenses',17:'review',18:'rework',19:'support',20:'recurringSubtotal',21:'contingency',22:'operatingTco',24:'implementation',25:'dataPrep',26:'training',27:'compliance',28:'yearUpfront',29:'totalTco',30:'cumulativeTco',32:'costPerAttempt',33:'costPerSuccessfulIncludingUpfront',34:'operatingCostPerSuccessful',35:'manualBaseline',36:'netAdvantage',37:'pvOperating',38:'pvCumulativeIncludingUpfront',39:'pvManual',40:'pvAdvantageYear'};
export function chartComponents(y: TcoYear) {
  return [y.inputApi + y.outputApi + y.otherApi, y.cloud, y.monitoring, y.licenses, y.review, y.rework, y.support, y.contingency];
}
export function projectWorkbook(r: TcoResult) {
  const model: Record<string, number | string> = {}, dashboard: Record<string, number | string> = {};
  r.years.forEach((y, index) => {
    const col = 'BCD'[index];
    Object.entries(rowKeys).forEach(([row, key]) => { model[col + row] = y[key] ?? ''; });
    chartComponents(y).forEach((v, i) => {model['GHI'[index] + (i + 5)] = v;});
    [y.totalTco, y.operatingTco, y.costPerSuccessfulIncludingUpfront, y.operatingCostPerSuccessful, r.manualEnabled ? y.manualBaseline : 'n/a', y.netAdvantage ?? 'n/a', y.successful].forEach((v,i) => {dashboard[col + (16+i)] = v;});
  });
  Object.values(r.dashboard).forEach((v,i) => { dashboard['B'+(4+i)] = v ?? 'n/a'; });
  costLines.forEach(([key], i) => {const amount = r.years[0][key]; dashboard['B'+(26+i)] = amount; dashboard['C'+(26+i)] = r.years[0].operatingTco ? amount/r.years[0].operatingTco : 0;});
  return {'3-Year TCO': model, Dashboard: dashboard};
}
