// Uses an already running, isolated Chromium instance on port 9222.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const target = await (await fetch('http://localhost:9222/json/new?http://localhost:3000/', { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const waiting = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const pending = waiting.get(message.id);
  waiting.delete(message.id);
  if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result);
};
function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => { waiting.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await evaluate(`Boolean(${expression})`)) return; await delay(200); }
  throw new Error(`Timed out: ${expression}`);
}
try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await until(`document.querySelector('[class*="tickerTrack"]')`);
  await delay(1000);
  await evaluate(`document.querySelector('button[aria-controls="site-price-ticker"]').click()`);
  assert.equal(await evaluate(`document.getElementById('site-price-ticker').hidden`),true);
  await send('Page.reload');
  await until(`document.querySelector('button[aria-controls="site-price-ticker"]')?.textContent==='Show price ticker'`);
  await send('Page.navigate',{url:'http://localhost:3000/prices'});
  await until(`document.querySelector('#workload-input')`);
  assert.equal(await evaluate(`Boolean(document.querySelector('[aria-label="AI API price watch"]'))`),false);
  await send('Page.navigate',{url:'http://localhost:3000/'});
  await until(`document.querySelector('button[aria-controls="site-price-ticker"]')?.textContent==='Show price ticker'`);
  await evaluate(`document.querySelector('button[aria-controls="site-price-ticker"]').click()`);
  await delay(500);
  assert.equal(await evaluate(`document.getElementById('site-price-ticker').hidden`),false);
  console.log('PASS: collapse survives reload and navigation; dashboard has no ticker; expand restores cards.');
  assert.equal(await evaluate(`document.querySelectorAll('[class*="tickerGroup"]:first-child a').length`),10);
  const speed=await evaluate(`(()=>{const g=document.querySelector('[class*="tickerGroup"]');const t=document.querySelector('[class*="tickerTrack"]');return g.scrollWidth/parseFloat(getComputedStyle(t).animationDuration)})()`);
  assert.equal(speed,40);
  await evaluate(`document.querySelector('button[class*="pause"]').click()`);
  await send('Page.reload');
  await until(`document.querySelector('button[class*="pause"]')?.textContent==='Resume ticker'`);
  await evaluate(`document.querySelector('button[class*="pause"]').click();window.scrollTo(0,document.body.scrollHeight)`);
  await delay(500);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[class*="tickerTrack"]')).animationPlayState`),'paused');
  await evaluate(`window.scrollTo(0,0)`); await delay(500);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[class*="tickerTrack"]')).animationPlayState`),'running');
  console.log('PASS: ten providers, constant speed, pause survives reload, off-screen pause/resume.');
  for(const width of [320,390,768,1023]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    await delay(300);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[class*="tickerTrack"]')).animationName`),'none');
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
    await evaluate(`document.querySelector('[aria-label="Next featured model"]').click()`); await delay(200);
    assert.ok(await evaluate(`document.querySelector('[class*="tickerViewport"]').scrollLeft>0`));
  }
  await evaluate(`document.querySelector('button[class*="pause"]').click()`); await delay(300);
  assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('[class*="tickerTrack"]')).animationName`),'none');
  await evaluate(`document.querySelector('button[class*="pause"]').click()`);
  assert.equal(await evaluate(`document.querySelector('button[class*="pause"]').textContent`),'Resume ticker');
  await evaluate(`document.querySelector('button[class*="pause"]').click()`);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]}); await delay(300);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[class*="tickerTrack"]')).animationName`),'none');
  console.log('PASS: manual mobile browsing, optional play/pause/resume, reduced motion, no overflow at 320?1023px.');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:false});
  await delay(300);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>writeFile('.browser-qa/ticker-mobile.png',Buffer.from(r.data,'base64')));
  const href=await evaluate(`document.querySelector('[class*="tickerGroup"] a').href`);
  await send('Page.navigate',{url:href});
  await until(`document.querySelector('#workload-input')`); await delay(800);
  assert.equal(await evaluate(`new URL(location.href).searchParams.get('compare')`),'gpt-6.1-sol');
  assert.ok(await evaluate(`document.querySelector('#shortlist').textContent.includes('GPT-6.1 Sol')`));
  console.log('PASS: ticker link opens selected model in the dashboard shortlist.');
} finally { socket.close(); }
