import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {resolveTcoPricing,defaultPricingOptions} from '../lib/tco/pricing.ts';
import {defaults,calculateTco} from '../lib/tco/model.ts';

const catalog=await(await fetch('http://127.0.0.1:3000/tools/ai-tco-calculator/pricing')).json();
const options={...defaultPricingOptions,singleRequest:true};
const available=catalog.models.filter(m=>resolveTcoPricing(m,defaults,options).ok);
assert.ok(available.length>0,'Real Price Watch pricing must be available for this end-to-end check.');
const model=available.find(m=>m.modelId==='gpt-6.1-sol')??available[0];
const expected=resolveTcoPricing(model,defaults,options);assert.ok(expected.ok);
const targets=await(await fetch('http://127.0.0.1:9223/json')).json();
const socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let id=0;const calls=new Map(),requests=[],exceptions=[];
socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const call=calls.get(m.id);calls.delete(m.id);if(m.error)call.reject(m.error);else call.resolve(m.result);}if(m.method==='Network.requestWillBeSent')requests.push(m.params.request);if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails);});
function send(method,params={}){return new Promise((resolve,reject)=>{const key=++id;calls.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}));});}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(expression){for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(100);}throw new Error('Timed out: '+expression);}
async function edit(key,value){await evaluate(`(()=>{const el=document.getElementById(${JSON.stringify(key)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(String(value))});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(100);}
async function select(key,value){await evaluate(`(()=>{const el=document.getElementById(${JSON.stringify(key)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(100);}
const apply="Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Use these prices')";
await Promise.all([send('Page.enable'),send('Runtime.enable'),send('Network.enable')]);
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:`http://127.0.0.1:3000/tools/ai-tco-calculator?model=${encodeURIComponent(model.modelId)}`});
await waitFor("document.getElementById('tco-price-model')?.options.length>1 && !document.getElementById('tco-price-model').disabled");
await waitFor(`document.getElementById('tco-price-model').value===${JSON.stringify(model.modelId)}`);
assert.equal(await evaluate(`${apply}.disabled`),true);
await select('tco-currency','INR');
await evaluate("document.getElementById('tco-price-single-request').click()");await delay(100);
assert.equal(await evaluate(`${apply}.disabled`),true);
assert.ok(await evaluate("document.body.innerText.includes('Convert all scenario costs to USD')"));
assert.equal(await evaluate("document.getElementById('tco-reviewerHourlyCost').value"),'30');
await select('tco-currency','USD');await waitFor(`!${apply}.disabled`);
const start=requests.length;
await evaluate(`${apply}.click()`);await delay(200);
assert.equal(await evaluate("document.getElementById('tco-inputPricePerMillion').value"),String(expected.patch.inputPricePerMillion));
assert.equal(await evaluate("document.getElementById('tco-outputPricePerMillion').value"),String(expected.patch.outputPricePerMillion));
assert.equal(await evaluate("document.getElementById('tco-inputPricePerMillion').readOnly"),true);
assert.equal(await evaluate("document.getElementById('tco-currency').disabled"),true);
assert.ok((await evaluate("document.getElementById('tco-priceProvenance').value")).includes(model.sourceUrl));
const total=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(calculateTco({...defaults,...expected.patch}).dashboard.total3Year);
assert.ok(await evaluate(`document.querySelector('[data-priced-results]').innerText.includes(${JSON.stringify(total)})`));
const boundaryModel=available.find(m=>m.tiers.some(t=>t.processing==='standard'&&t.maxInput!==null&&m.tiers.some(next=>next.processing==='standard'&&next.minInput===t.maxInput+1)&&(!m.contextWindow||t.maxInput+1+defaults.outputTokensPerAttempt<=m.contextWindow)));
let boundaryChecked=false;
if(boundaryModel){
  await select('tco-price-model',boundaryModel.modelId);await waitFor(`!${apply}.disabled`);await evaluate(`${apply}.click()`);await delay(100);
  const boundary=boundaryModel.tiers.find(t=>t.processing==='standard'&&t.maxInput!==null&&boundaryModel.tiers.some(next=>next.processing==='standard'&&next.minInput===t.maxInput+1)&&(!boundaryModel.contextWindow||t.maxInput+1+defaults.outputTokensPerAttempt<=boundaryModel.contextWindow)).maxInput;
  await edit('tco-inputTokensPerAttempt',boundary+1);
  const next=resolveTcoPricing(boundaryModel,{...defaults,inputTokensPerAttempt:boundary+1},options);assert.ok(next.ok);
  assert.equal(await evaluate("document.getElementById('tco-inputPricePerMillion').value"),String(next.patch.inputPricePerMillion));boundaryChecked=true;
}
await edit('tco-outputTokensPerAttempt',10000001);
assert.equal(await evaluate("document.querySelector('[data-priced-results]').hidden"),true);
assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Export scenario')).disabled"),true);
await edit('tco-outputTokensPerAttempt',500);await edit('tco-inputTokensPerAttempt',2000);
assert.equal(await evaluate("document.querySelector('[data-priced-results]').hidden"),false);
await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Use manual pricing').click()");await delay(100);
assert.equal(await evaluate("document.getElementById('tco-inputPricePerMillion').readOnly"),false);
assert.equal(await evaluate("document.getElementById('tco-currency').disabled"),false);
const end=requests.slice(start).filter(r=>!r.url.includes('__nextjs')&&!r.url.includes('webpack-hmr')&&!r.url.includes('on-demand-entries'));
assert.equal(end.filter(r=>['POST','PUT','PATCH'].includes(r.method)).length,0);
assert.equal(end.filter(r=>!r.url.startsWith('http://127.0.0.1:3000')&&!r.url.startsWith('ws://127.0.0.1:3000')).length,0);
assert.equal(end.filter(r=>r.url.includes('/pricing')&&(r.url.includes('?')||r.postData)).length,0);
await evaluate('window.scrollTo(0,0)');
await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(r=>writeFileSync('.browser-qa/tco-connected-pricing.png',Buffer.from(r.data,'base64')));
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await delay(200);
assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(r=>writeFileSync('.browser-qa/tco-connected-pricing-mobile.png',Buffer.from(r.data,'base64')));
assert.equal(exceptions.length,0,JSON.stringify(exceptions));
const report={status:'PASS',checkedAt:new Date().toISOString(),fixtureProvenance:'Real existing Price Watch endpoint, using fresh official provider snapshots; no fabricated rates',catalogModels:catalog.models.length,freshModels:catalog.models.filter(m=>m.sourceStatus==='fresh').length,model:model.modelId,checks:['model/billing handoff','single-request acknowledgement','non-USD blocking without silent conversion','exact input/output rates','read-only linked fields','pricing source reference','TCO result uses selected rates',...(boundaryChecked?['real context-tier boundary recheck']:[]),'invalid linked request hides results and disables export','manual detach preserves editable snapshot','no assumptions sent to pricing or providers','390px mobile without overflow','no browser exceptions']};
writeFileSync('docs/tco/pricing-browser-qa-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));socket.close();
