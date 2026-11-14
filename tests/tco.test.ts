import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {calculateTco,chartComponents,costLines,defaults,inputKeys,projectWorkbook,validateInputs,type TcoInputs} from '../lib/tco/model.ts';
import {exportScenario,importScenario} from '../lib/tco/scenario.ts';
import {referenceWorkbook,type Workbook} from './tco-reference.ts';
const workbook:Workbook=JSON.parse(readFileSync(new URL('./fixtures/tco-workbook.json',import.meta.url),'utf8'));
const golden=JSON.parse(readFileSync(new URL('./fixtures/tco-golden-defaults.json',import.meta.url),'utf8'));
function sourceInputs(x:TcoInputs){return Object.fromEntries(inputKeys.map((k,i)=>['B'+(i+5),typeof x[k]==='boolean'?(x[k]?'Yes':'No'):x[k]])) as Record<string,number|string>;}
let checks=0;
const scenarios:{name:string;inputs:TcoInputs}[]=[{name:'defaults',inputs:{...defaults}}];
for(let mask=0;mask<16;mask++)scenarios.push({name:`scaling-${mask}`,inputs:{...defaults,cloudScales:!!(mask&1),monitoringScales:!!(mask&2),licensesScale:!!(mask&4),supportScales:!!(mask&8),manualMinutesPerTask:8,manualOverheadPerTask:.15,annualTokenPriceChange:-.2}});
for(const firstPassRate of [0,1])for(const recoveryRate of [0,1])scenarios.push({name:`success-${firstPassRate}-${recoveryRate}`,inputs:{...defaults,firstPassRate,recoveryRate}});
scenarios.push({name:'zero-volume',inputs:{...defaults,monthlyAttempts:0}}, {name:'zero-success',inputs:{...defaults,firstPassRate:0,recoveryRate:0}}, {name:'zero-discount-inflation-growth',inputs:{...defaults,discountRate:0,annualOperatingInflation:0,annualVolumeGrowth:0}}, {name:'positive-token-change',inputs:{...defaults,annualTokenPriceChange:.4}});
inputKeys.forEach(k=>{const value=defaults[k];const next=typeof value==='number'?(k==='annualTokenPriceChange'?-.3:value===0?.1:value*.5):typeof value==='boolean'?!value:k==='currency'?'INR':'Observed / test';if(['monthlyAttempts','inputTokensPerAttempt','outputTokensPerAttempt'].includes(k)&&typeof next==='number'&&!Number.isInteger(next))throw new Error('Invalid test');scenarios.push({name:`input-isolation-${k}`,inputs:{...defaults,[k]:next}});});
test('all 33 defaults and source cell mappings match the actual workbook',()=>{assert.equal(inputKeys.length,33);for(const [cell,v] of Object.entries(sourceInputs(defaults)))assert.equal(v,workbook.sheets.Inputs[cell].value,cell);});
test('retained full-precision default fixtures remain identical to source formulas',()=>{assert.equal(golden.workbookSha256,workbook.sha256);assert.deepEqual(golden.outputs,referenceWorkbook(workbook,sourceInputs(defaults)));});
test('every model input has complete public guidance without spreadsheet or formula disclosures',()=>{
  const fields:Record<string,string>[]=JSON.parse(readFileSync(new URL('../lib/tco/field-guide.json',import.meta.url),'utf8'));
  assert.equal(fields.length,inputKeys.length);
  assert.deepEqual(fields.map(f=>f.key).sort(),[...inputKeys].sort());
  for(const field of fields){
    for(const part of ['label','hint','meaning','why','entry','source','example','influence','mistake','zero','unit'])assert.ok(typeof field[part]==='string'&&field[part].trim().length>0,`${field.key}: missing ${part}`);
    assert.doesNotMatch(Object.values(field).join(' '),/blue cells|worksheet|workbook|Inputs!|Dashboard![A-Z]|=SUM\(|=IF\(/i);
  }
});
for(const scenario of scenarios)test(`174 source-formula outputs match independent workbook interpreter: ${scenario.name}`,()=>{
  const expected=referenceWorkbook(workbook,sourceInputs(scenario.inputs));
  const actual=projectWorkbook(calculateTco(scenario.inputs));
  for(const sheet of ['3-Year TCO','Dashboard'] as const)for(const [cell,value] of Object.entries(expected[sheet])){
    const observed=actual[sheet][cell];
    assert.notEqual(observed,undefined,`${sheet}!${cell} missing`);
    if(typeof value==='number'){assert.equal(typeof observed,'number');assert.ok(Math.abs((observed as number)-value)<=Math.max(1e-9,Math.abs(value)*1e-9),`${sheet}!${cell}: ${observed} != ${value}`);}else assert.equal(observed,value,`${sheet}!${cell}`);
    checks++;
  }
});
test('independent default worked example anchors',()=>{const r=calculateTco(defaults),y=r.years[0];assert.equal(y.attempts,120000);assert.equal(y.successful,117600);assert.equal(y.rework,18000);assert.equal(y.recurringSubtotal,104280);assert.equal(y.operatingTco,114708);assert.equal(y.totalTco,139708);assert.ok(Math.abs(r.dashboard.total3Year-452066.86)<1e-7);});
test('cost chart and shares reconcile for every scenario',()=>{for(const {inputs} of scenarios){const r=calculateTco(inputs);for(const y of r.years)assert.ok(Math.abs(chartComponents(y).reduce((a,b)=>a+b,0)-y.operatingTco)<1e-6);const y=r.years[0];if(y.operatingTco)assert.ok(Math.abs(costLines.reduce((a,[k])=>a+y[k]/y.operatingTco,0)-1)<1e-12);}});
test('currency is label-only; baseline does not change AI costs; token change only affects tokens',()=>{const a=calculateTco(defaults);assert.deepEqual(calculateTco({...defaults,currency:'JPY'}).years,a.years);const b=calculateTco({...defaults,manualMinutesPerTask:10});assert.equal(b.dashboard.total3Year,a.dashboard.total3Year);const c=calculateTco({...defaults,annualTokenPriceChange:-.2});for(let i=0;i<3;i++)for(const k of ['otherApi','cloud','monitoring','licenses','review','rework','support'] as const)assert.equal(c.years[i][k],a.years[i][k]);});
test('scenario round-trip, supported versions, required fields and limits',()=>{assert.deepEqual(importScenario(exportScenario(defaults)),defaults);for(const input of ['bad','null','{}',exportScenario(defaults).replace('"1.0"','"2.0"'),'x'.repeat(65537)])assert.throws(()=>importScenario(input));const d=JSON.parse(exportScenario(defaults));delete d.inputs.recoveryRate;assert.throws(()=>importScenario(JSON.stringify(d)));});
test('reject invalid, nonfinite, fractional count and out-of-range values',()=>{for(const patch of [{monthlyAttempts:-1},{monthlyAttempts:.5},{inputTokensPerAttempt:.5},{inputPricePerMillion:Infinity},{annualVolumeGrowth:1.01},{recoveryRate:-.1},{annualTokenPriceChange:-1},{currency:'XXX'},{cloudScales:'Yes'},{reviewerHourlyCost:NaN}])assert.throws(()=>validateInputs({...defaults,...patch}));assert.throws(()=>calculateTco({...defaults,inputPricePerMillion:Number.MAX_VALUE}));});
test('retain auditable parity report',()=>{
  const formulaCount=Object.values(workbook.sheets).flatMap(s=>Object.values(s)).filter(c=>c.formula).length;
  assert.equal(formulaCount,174);assert.equal(checks,scenarios.length*174);
  mkdirSync('docs/tco',{recursive:true});
  writeFileSync('docs/tco/parity-report.json',JSON.stringify({generatedAt:new Date().toISOString(),workbookVersion:workbook.modelVersion,workbookSha256:workbook.sha256,fixtureProvenance:'OOXML source formulas executed by an independent limited Excel formula interpreter; no cached values used. Interpreter anchored to published Year 1 worked examples.',mappedFormulas:formulaCount,coveredFormulas:174,coveragePercent:100,scenarios:scenarios.length,assertions:checks,unexplainedDifferences:0,automatedParity:'PASS',publicReleaseGate:'OWNER_APPROVED_WITH_DEFERRED_CHECKS',reviewerSignoff:'DEFERRED_BY_OWNER',remainingChecks:['Independent reviewer verification of reference interpreter and fixtures','Browser accessibility, responsive layout and network privacy review'],sourceDiscrepancy:'BRD says 31 populated annual model lines; actual workbook has 33, all included.'},null,2)+'\n');
});
