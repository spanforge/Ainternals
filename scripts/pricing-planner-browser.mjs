import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {estimateWorkload,defaultPlanner} from '../lib/pricing/planner.ts';
import {defaultWorkload} from '../lib/pricing/estimate.ts';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const origin='http://127.0.0.1:3000';
const catalog=await(await fetch(origin+'/tools/ai-tco-calculator/pricing')).json();
assert.ok(catalog.models.some(m=>m.sourceStatus==='fresh'));
const model=catalog.models.find(m=>m.modelId==='gpt-6.1-sol');
const target=await(await fetch('http://127.0.0.1:9223/json/new?'+origin+'/prices',{method:'PUT'})).json();
async function connect(target){
  const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP websocket open timeout: '+target.id)),10000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});ws.addEventListener('error',()=>reject(new Error('CDP websocket failed')),{once:true});});let seq=0;const pending=new Map(),requests=[],errors=[];
  function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method))},12000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});ws.send(JSON.stringify({id,method,params}));});}
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p){if(m.error)p.reject(m.error);else p.resolve(m.result);}}if(m.method==='Network.requestWillBeSent')requests.push(m.params.request);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Page.javascriptDialogOpening')void send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});});
  async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
  async function wait(expression){for(let i=0;i<150;i++){if(await evaluate(`Boolean(${expression})`))return;await delay(100);}throw new Error('Timed out: '+expression);}
  void send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});
  await Promise.all([send('Page.enable'),send('Runtime.enable'),send('Network.enable')]);
  return {send,evaluate,wait,requests,errors,ws};
}
const c=await connect(target);
const {send,evaluate,wait}=c;
async function edit(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(100);}
async function select(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(100);}
async function clickText(text){await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent===${JSON.stringify(text)}).click()`);await delay(150);}
async function file(selector,path){const doc=await send('DOM.getDocument');const el=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector});await send('DOM.setFileInputFiles',{nodeId:el.nodeId,files:[new URL('../'+path,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')]});await delay(200);}
await wait("document.getElementById('pricing-baseline') && document.readyState==='complete'");await delay(700);
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
const initialUrl=await evaluate('location.href');
await edit('#workload-requests',987654);
assert.equal(await evaluate('location.href'),initialUrl,'Editing must not serialize workload into the URL.');
await edit('#workload-requests',10000);await select('#pricing-baseline',model.modelId);await edit('#pricing-budget',1000);
assert.ok(await evaluate("document.body.innerText.includes('lower than baseline')"));
await evaluate("document.getElementById('pricing-mixed').click()");await delay(100);
assert.equal(await evaluate("getComputedStyle(document.querySelector('[class*=workloadGrid]')).display"),'none');
await edit('input[aria-label="Group 1 name"]','Short');await edit('input[aria-label="Group 1 input"]',1000);await edit('input[aria-label="Group 1 output"]',100);await edit('input[aria-label="Group 1 requests"]',9000);
await clickText('Add request group');await edit('input[aria-label="Group 2 name"]','Long');await edit('input[aria-label="Group 2 input"]',300000);await edit('input[aria-label="Group 2 output"]',1000);await edit('input[aria-label="Group 2 requests"]',1000);
const plan={...defaultPlanner,mixed:true,baseline:model.modelId,budget:1000,groups:[{name:'Short',input:1000,output:100,requests:9000},{name:'Long',input:300000,output:1000,requests:1000}]};
const expected=estimateWorkload(model,defaultWorkload,plan,Date.now());assert.notEqual(expected.monthly,null);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:6}).format(n);
assert.ok(await evaluate(`document.querySelector('.'+Array.from(document.querySelectorAll('div')).find(e=>e.className.includes('desktopTable')).className.split(' ')[0]).innerText.includes(${JSON.stringify(money(expected.monthly))})`));
await evaluate("document.getElementById('pricing-structured').click()");await delay(150);
assert.equal(await evaluate("document.querySelectorAll('[class*=desktopTable] tbody tr').length"),4);
await edit('#pricing-min-context',2000000);assert.equal(await evaluate("document.querySelectorAll('[class*=desktopTable] tbody tr').length"),0);await edit('#pricing-min-context',0);
await evaluate("document.getElementById('pricing-structured').click()");await delay(100);
assert.equal(await evaluate("document.querySelectorAll('[class*=desktopTable] tbody tr').length"),23);
await evaluate("Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__shared=text}},configurable:true});window.__originalCreateObjectURL=URL.createObjectURL;URL.createObjectURL=blob=>{window.__blob=blob;return window.__originalCreateObjectURL(blob)};HTMLAnchorElement.prototype.click=function(){window.__download=this.download};");
await clickText('Copy comparison link');const publicLink=new URL(await evaluate('window.__shared'));assert.equal(publicLink.searchParams.has('input'),false);assert.equal(publicLink.searchParams.has('plan'),false);assert.equal(publicLink.searchParams.get('baseline'),model.modelId);
await evaluate("Array.from(document.querySelectorAll('label')).find(e=>e.textContent.includes('Include workload, budget')).querySelector('input').click()");await clickText('Copy comparison link');const privateLink=new URL(await evaluate('window.__shared'));assert.ok(privateLink.searchParams.has('plan'));
await evaluate(`document.querySelector('input[aria-label="Compare ${model.displayName}"]').click()`);await delay(100);
await clickText('Save comparison JSON');const json=await evaluate('window.__blob.text()');const snapshot=JSON.parse(json);assert.equal(snapshot.planner.groups.length,2);assert.equal(snapshot.planner.budget,1000);writeFileSync('.browser-qa/pricing-planner-snapshot.json',json);
await evaluate("document.getElementById('pricing-mixed').click()");await delay(100);
await file('input[accept=".json,application/json"]','.browser-qa/pricing-planner-snapshot.json');await wait("document.body.innerText.includes('Historical snapshot')");assert.equal(await evaluate("document.getElementById('pricing-mixed').checked"),true);
await send('Emulation.setEmulatedMedia',{media:'print'});
assert.equal(await evaluate("getComputedStyle(document.querySelector('[class*=interactiveBoard]')).display"),'none');assert.equal(await evaluate("getComputedStyle(document.querySelector('[class*=printReport]')).display"),'block');
assert.ok(await evaluate("document.querySelector('[class*=printReport]').innerText.includes('Long')"));
await send('Page.printToPDF',{printBackground:true}).then(r=>writeFileSync('.browser-qa/pricing-planner-report.pdf',Buffer.from(r.data,'base64')));
await send('Emulation.setEmulatedMedia',{media:''});await clickText('Return to current prices');
writeFileSync('.browser-qa/pricing-usage.csv','name,input_tokens,output_tokens,requests\nLocal usage,2001,501,10\n');await file('input[accept=".csv,text/csv"]','.browser-qa/pricing-usage.csv');await wait("document.querySelector('input[aria-label=\"Group 1 name\"]').value==='Local usage'");
writeFileSync('.browser-qa/pricing-usage-invalid.csv','wrong,headers\nx,y\n');await file('input[accept=".csv,text/csv"]','.browser-qa/pricing-usage-invalid.csv');assert.equal(await evaluate("document.querySelector('input[aria-label=\"Group 1 name\"]').value"),'Local usage');
await evaluate('window.scrollTo(0,0)');await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(r=>writeFileSync('.browser-qa/pricing-planner-desktop.png',Buffer.from(r.data,'base64')));
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await delay(200);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(r=>writeFileSync('.browser-qa/pricing-planner-mobile.png',Buffer.from(r.data,'base64')));
// Use a trusted model's carry action. Confirmation is handled through CDP, never by sending real email or uploading files.
await evaluate(`Array.from(document.querySelectorAll('[class*=mobileCard]')).find(e=>e.querySelector('code')?.textContent===${JSON.stringify(model.modelId)}).querySelectorAll('button')[1].click()`);await delay(500);
let childTarget;
for(let i=0;i<100;i++){const targets=await(await fetch('http://127.0.0.1:9223/json')).json();childTarget=targets.find(t=>t.id!==target.id&&t.url.includes('/tools/ai-tco-calculator?')&&t.url.includes('receive-workload'));if(childTarget)break;await delay(100);}
assert.ok(childTarget,'Carry action must open a local calculator tab.');
const child=await connect(childTarget);await child.send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});
await child.wait("document.getElementById('tco-monthlyAttempts')?.value==='10'");assert.equal(await child.evaluate("document.getElementById('tco-inputTokensPerAttempt').value"),'2001');assert.equal(await child.evaluate("document.getElementById('tco-outputTokensPerAttempt').value"),'501');
assert.ok(await child.evaluate("document.body.innerText.includes('received locally')"));
assert.equal(c.requests.some(r=>['POST','PUT','PATCH'].includes(r.method)&&!r.url.includes('__nextjs')),false);
assert.equal(c.requests.some(r=>/[?&](input|output|requests|plan|budget)=/.test(r.url)),false);
assert.equal(c.errors.length+child.errors.length,0,JSON.stringify([...c.errors,...child.errors]));
const report={status:'PASS',checkedAt:new Date().toISOString(),checks:['editing does not change URL','baseline differences','mixed group pricing','verified capability and capacity filters','sharing excludes workload by default','explicit opt-in shares full assumptions','comparison JSON snapshot round-trip','historical mode labeling','printable assumptions and PDF','local CSV import and malformed-file preservation','390px mobile without overflow','same-origin confirmed workload transfer into TCO','no financial assumption network requests','no browser exceptions']};writeFileSync('docs/pricing-planner-browser-qa.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));child.ws.close();c.ws.close();
