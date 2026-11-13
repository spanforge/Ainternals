// Uses an already running, isolated Chromium instance on port 9222.
import assert from 'node:assert/strict';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await until(`document.querySelector('button[class*="pause"]')`);
  await delay(1000);
  const button = await evaluate(`(()=>{const r=document.querySelector('button[class*="pause"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  async function clickControl() {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...button });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...button });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...button });
    await delay(100);
  }
  const transform = () => evaluate(`getComputedStyle(document.querySelector('[class*="tickerTrack"]')).transform`);
  let a = await transform(); await delay(300); let b = await transform();
  assert.notEqual(a, b, 'Ticker must initially move');
  await clickControl();
  assert.equal(await evaluate(`document.querySelector('button[class*="pause"]').textContent`), 'Resume ticker');
  a = await transform(); await delay(300); b = await transform();
  assert.equal(a, b, 'Pause must stop the animation');
  await clickControl();
  assert.equal(await evaluate(`document.querySelector('button[class*="pause"]').textContent`), 'Pause ticker');
  a = await transform(); await delay(300); b = await transform();
  assert.notEqual(a, b, 'Resume must move even while the control stays focused and hovered');
  console.log('PASS: ticker moves, pauses and resumes with pointer and focus on the control.');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[class*="tickerTrack"]')).animationName`), 'none');
  console.log('PASS: reduced motion disables automatic animation.');
  await send('Page.navigate', { url: 'http://localhost:3000/prices' });
  await until(`document.querySelector('[class*="refreshControls"] button')`);
  await delay(1000);
  await evaluate(`document.querySelector('[class*="refreshControls"] button').click()`);
  await until(`document.querySelector('[class*="refreshControls"] [role="status"]').textContent.includes('Sources checked')`);
  console.log('PASS: refresh action returns source status.');
  for (const [provider, count] of [['Alibaba Cloud', 2], ['Moonshot AI', 1], ['MiniMax', 2], ['Z.ai', 2]]) {
    await evaluate(`document.querySelector('button[data-provider=${JSON.stringify(provider)}]').click()`);
    await until(`document.querySelectorAll('tbody tr').length === ${count} && Array.from(document.querySelectorAll('tbody tr')).every(row => row.cells[1].textContent.trim() === ${JSON.stringify(provider)})`);
    console.log(`PASS: ${provider} filter shows its ${count} selected model(s).`);
  }
  await evaluate(`document.querySelector('button[data-provider="All providers"]').click()`);
  await until(`document.querySelectorAll('tbody tr').length === 23`);
  async function fill(id, value) {
    await evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(String(value))});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await delay(100);
  }
  await evaluate(`document.querySelector('[class*="billingOptions"]').open=true;document.getElementById('workload-period').value='off-peak';document.getElementById('workload-period').dispatchEvent(new Event('change',{bubbles:true}))`);
  await evaluate(`Array.from(document.querySelectorAll('[aria-label="Example workload presets"] button')).find(b=>b.textContent==='Short chat').click()`);
  await until(`document.getElementById('workload-input').value==='800' && document.getElementById('workload-output').value==='300' && document.getElementById('workload-requests').value==='10000'`);
  await evaluate(`Array.from(document.querySelectorAll('[aria-label="Example workload presets"] button')).find(b=>b.textContent==='Document summary').click()`);
  await until(`document.getElementById('workload-input').value==='8000' && document.getElementById('workload-requests').value==='1000'`);
  assert.equal(await evaluate(`document.getElementById('workload-period').value`), 'off-peak');
  await fill('workload-input', 1234);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('[aria-label="Example workload presets"] button')).find(b=>b.textContent==='Custom').getAttribute('aria-pressed')`), 'true');
  for (const [href, id] of [['#price-results','price-results'], ['#shortlist','shortlist'], ['#calculator-title','calculator-title']]) {
    await evaluate(`document.querySelector('a[href=${JSON.stringify(href)}]').click()`);
    await until(`document.activeElement.id === ${JSON.stringify(id)}`);
  }
  console.log('PASS: presets set explicit counts, retain billing options, and shortcuts transfer keyboard focus.');
  await evaluate(`document.getElementById('workload-period').value='peak';document.getElementById('workload-period').dispatchEvent(new Event('change',{bubbles:true}))`);
  await evaluate(`document.querySelector('input[aria-label="Compare GPT-6.1 Sol"]').click()`);
  await fill('workload-input', 272001); await fill('workload-output', 1000); await fill('workload-requests', 1);
  await until(`document.querySelector('[class*="compareCard"] [class*="appliedTier"]').textContent.includes('above 272K')`);
  const calculated = await evaluate(`(()=>{const card=document.querySelector('[class*="compareCard"]');const n=s=>Number(s.replace(/[^0-9.]/g,''));const rows=Array.from(card.querySelectorAll('dl>div'));const price=label=>n(rows.find(r=>r.querySelector('dt').textContent===label).querySelector('dd').textContent);return {monthly:n(card.querySelector('[class*="monthly"]').firstChild.textContent),expected:(272001*price('Input / 1M')+1000*price('Output / 1M'))/1000000}})()`);
  assert.ok(Math.abs(calculated.monthly - calculated.expected) < 0.000001);
  console.log('PASS: changing request size applies the long-context tier and computes the monthly total.');
  for (const name of ['Claude Haiku 5.5', 'Gemini 4 Carbon', 'Grok 4.7']) await evaluate(`document.querySelector('input[aria-label=${JSON.stringify('Compare ' + name)}]').click()`);
  await until(`document.querySelectorAll('[class*="compareCard"]').length === 4`);
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Compare GLM 5.3"]').disabled`), true);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Copy comparison link').click()`);
  await until(`document.querySelector('[class*="shareField"] input')`);
  const shared = await evaluate(`document.querySelector('[class*="shareField"] input').value`);
  assert.ok(shared.includes('input=272001') && shared.includes('compare='));
  await send('Page.navigate', { url: shared }); await delay(900);
  await until(`document.querySelectorAll('[class*="compareCard"]').length === 4 && document.getElementById('workload-input').value === '272001'`);
  console.log('PASS: share URL restores workload and four-model selection; fifth selection is disabled.');
  const downloadDir = resolve('.next/browser-downloads'); await mkdir(downloadDir, { recursive: true });
  const csvPath = resolve(downloadDir, 'ainternals-ai-cost-comparison.csv');
  await unlink(csvPath).catch(() => {});
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir });
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Export visible models CSV').click()`);
  let csv = '';
  for (let attempt=0; attempt<30; attempt++) { try { csv=await readFile(csvPath,'utf8');break; } catch { await delay(100); } }
  assert.ok(csv.includes('Monthly estimate USD') && csv.includes('Source SHA256') && csv.includes('GPT-6.1 Sol'));
  assert.equal(csv.split('\r\n').length, 24);
  console.log('PASS: CSV download contains all visible models, costs, assumptions and source evidence hashes.');
  await fill('workload-input', -1);
  await until(`document.querySelector('[role="alert"]')`);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Export visible models CSV').disabled`), true);
  await fill('workload-input', 4000);
  await evaluate(`document.querySelector('[class*="billingOptions"]').open=true;document.getElementById('workload-processing').value='batch';document.getElementById('workload-processing').dispatchEvent(new Event('change',{bubbles:true}))`);
  await until(`Array.from(document.querySelectorAll('tbody tr')).find(r=>r.textContent.includes('GLM 5.3')).textContent.includes('Not estimated')`);
  await evaluate(`document.getElementById('workload-processing').value='standard';document.getElementById('workload-processing').dispatchEvent(new Event('change',{bubbles:true}))`);
  console.log('PASS: invalid inputs disable export; unsupported batch models are not assigned fabricated costs.');
  const desktop = await send('Page.captureScreenshot', { format: 'png' }); await writeFile('.next/pricing-desktop.png', Buffer.from(desktop.data, 'base64'));
  if (process.argv.includes('--full-refresh')) {
    console.log('Waiting for the 60-second source-check cooldown to expire…');
    await delay(61000);
    const previous = await evaluate(`document.querySelector('time').dateTime`);
    await evaluate(`document.querySelector('[class*="refreshControls"] button').click()`);
    await until(`document.querySelector('[class*="refreshControls"] [role="status"]').textContent.includes('No changes') || document.querySelector('[class*="refreshControls"] [role="status"]').textContent.includes('has been updated')`);
    await until(`document.querySelector('time').dateTime !== ${JSON.stringify(previous)}`);
    console.log('PASS: manual refresh fetches again and updates the persisted retrieval timestamp.');
    await evaluate(`document.querySelector('[class*="refreshControls"] button').click()`);
    await until(`document.querySelector('[class*="refreshControls"] [role="status"]').textContent.includes('recently')`);
    console.log('PASS: repeated refresh reuses the recent source check.');
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), 'Mobile page must not overflow');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[class*="desktopTable"]')).display`), 'none');
  assert.equal(await evaluate(`document.querySelectorAll('article[class*="mobileCard"]').length`), 23);
  const mobile = await send('Page.captureScreenshot', { format: 'png' }); await writeFile('.next/pricing-mobile.png', Buffer.from(mobile.data, 'base64'));
  console.log('PASS: mobile page fits the viewport.');
  for (const width of [320,375,430,768,820,1024,1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height:900, deviceScaleFactor:1, mobile:width<768 });
    await delay(100);
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), `No overflow at ${width}px`);
    if (width <= 1199) {
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('[class*="desktopTable"]')).display`), 'none');
      assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('[class*="compactComparison"]')).display`), 'none');
      assert.equal(await evaluate(`document.querySelector('[class*="compactComparison"] tbody').rows.length`), 4);
      const touch = await evaluate(`(()=>{const box=e=>e.getBoundingClientRect().height;const visible=e=>e.getClientRects().length;const presets=Array.from(document.querySelectorAll('[class*="presetButtons"] button,[class*="presetSelect"] select')).filter(visible);return {compare:box(document.querySelector('[class*="compareCheck"]')),details:box(document.querySelector('[class*="mobileCards"] summary')),remove:box(document.querySelector('[class*="removeShortlist"]')),presets:presets.length>0&&presets.every(e=>box(e)>=44),search:parseFloat(getComputedStyle(document.querySelector('input[type=search]')).fontSize)}})()`);
      assert.ok(touch.compare>=44 && touch.details>=44 && touch.remove>=44 && touch.presets && touch.search>=16, `Touch targets and readable inputs at ${width}px`);
    }
  }
  await send('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:1, mobile:true });
  await evaluate(`document.querySelector('a[href="#shortlist"]').click()`);
  await delay(150);
  const shortlist = await send('Page.captureScreenshot', { format:'png' }); await writeFile('.next/shortlist-mobile.png', Buffer.from(shortlist.data,'base64'));
  await evaluate(`document.querySelector('select[aria-label="Workload preset"]').value='short-chat';document.querySelector('select[aria-label="Workload preset"]').dispatchEvent(new Event('change',{bubbles:true}))`);
  await until(`document.getElementById('workload-input').value==='800' && document.getElementById('workload-output').value==='300' && document.getElementById('workload-requests').value==='10000'`);
  await evaluate(`document.querySelector('[class*="removeShortlist"]').click()`);
  await until(`document.querySelector('[class*="compactComparison"] tbody').rows.length===3`);
  await evaluate(`document.querySelector('[class*="shortlistBreakdown"]').open=true;document.querySelector('[class*="shortlistBreakdown"] [class*="billingDetails"]').open=true`);
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), 'Expanded mobile evidence must wrap');
  console.log('PASS: mobile preset dropdown, shortlist removal and expanded source evidence.');
  console.log('PASS: 320–1440px layouts, tablet cards, compact shortlist and 44px touch controls.');
} finally { socket.close(); await fetch(`http://localhost:9222/json/close/${target.id}`); }
