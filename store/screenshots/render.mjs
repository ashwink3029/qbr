// App Store screenshots at the 6.9" size: 440x956 CSS px at 3x = 1320x2868.
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = '/Users/ashwink/workspace/qbr/.claude/worktrees/gwent-layer/store/screenshots/6.9/';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(3000);
const tabs = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (pending.has(d.id)) { pending.get(d.id)(d.result); pending.delete(d.id); }
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
const shot = async (f) => {
  const d = (await send('Page.captureScreenshot', { format: 'png' })).data;
  writeFileSync(OUT + f, Buffer.from(d, 'base64'));
};
const click = (sel) => ev(`(() => { const e = document.querySelector('${sel}'); if (e) e.click(); return !!e; })()`);

await send('Page.enable');
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 440, height: 956, deviceScaleFactor: 3, mobile: true });
const TIPS = JSON.stringify(['place', 'cost', 'lanes', 'lives', 'closeout-ahead', 'closeout-behind', 'takeover', 'boss:micromanager', 'boss:legacy', 'boss:auditor', 'boss:freeze', 'boss:replyall']);
const RECORD = JSON.stringify({ runs: 6, promotions: 2, bestMeetings: 5, stakeCleared: 3, wins: 5, losses: 2, last: 'W L W', lastOutcome: 'win', daily: { day: '2020-01-01', beaten: 3, promoted: false, streak: 4 } });
async function fresh(record = RECORD) {
  await send('Page.navigate', { url: 'http://localhost:5188/' });
  await sleep(1000);
  await ev(`localStorage.clear(); localStorage.setItem('qbr.tips.v1', ${JSON.stringify(TIPS)}); localStorage.setItem('qbr.record.v1', ${JSON.stringify(record)}); location.reload()`);
  await sleep(1200);
}

// 1. Home (kept)
if (process.env.ALL) {
await fresh();
await shot('1-home.png');

// 2. Org chart with the VP's boss (a career on Restructuring)
await click('[data-stake-next]');
await click('[data-stake-next]');
await sleep(100);
await click('[data-start-run]');
await sleep(500);
await shot('2-org-chart.png');
}

// 3. Mid-game: play a few turns in one year, then preview a play that claims + flips
let best = null;
for (let tries = 0; tries < 8 && !(best && best.score >= 12); tries++) {
best = null;
await fresh();
await click('[data-start]');
await sleep(900);
for (let t = 0; t < 7; t++) {
  const human = await ev(`!document.querySelector('[data-pass]').disabled`);
  if (!human) { await sleep(700); continue; }
  // Find the playable (card, cell) preview that flips the most, else claims the most.
  best = await ev(`(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const cards = Array.from(document.querySelectorAll('.hand [data-card][data-playable="true"]')).map(c => c.dataset.card);
    let best = null;
    for (const id of cards) {
      document.querySelector('.hand [data-card="' + id + '"]').click();
      await sleep(40);
      const cells = Array.from(document.querySelectorAll('.cell.legal')).map(c => c.dataset.cell);
      for (const cid of cells) {
        document.querySelector('[data-cell="' + cid + '"]').click(); // first tap = preview
        await sleep(30);
        const score = document.querySelectorAll('.cell.flip').length * 10 + document.querySelectorAll('.cell.reach').length;
        if (!best || score > best.score) best = { card: id, cell: cid, score };
        document.querySelector('.hand [data-card="' + id + '"]').click(); // re-select resets the preview
        await sleep(20);
      }
    }
    return best;
  })()`);
  if (!best) break;
  if (best.score >= 12 && t >= 2) break; // a flip plus claims: the shot we want
  await click(`.hand [data-card="${best.card}"]`);
  await click(`[data-cell="${best.cell}"]`);
  await click(`[data-cell="${best.cell}"]`);
  await sleep(1600);
}
}
if (best) {
  await click(`.hand [data-card="${best.card}"]`);
  await sleep(80);
  await click(`[data-cell="${best.cell}"]`);
  await sleep(250);
}
console.log('preview', JSON.stringify(best));
await shot('3-play-preview.png');

if (!process.env.ONLY3) {
// 4. A won quarter: keep playing greedily, close out when ahead, until a result dialog shows APPROVED
let approved = false;
for (let attempt = 0; attempt < 6 && !approved; attempt++) {
  await fresh();
  await click('[data-start-run]');
  await sleep(400);
  await click('[data-chart-go]');
  await sleep(300);
  await click('[data-offer]');
  await sleep(900);
  for (let k = 0; k < 120 && !approved; k++) {
    if (await ev(`!!document.querySelector('[data-dialog]')`)) {
      await sleep(900);
      approved = await ev(`document.querySelector('[data-stamp]')?.dataset.stamp === 'approved'`);
      if (approved) break;
      if (!(await click('[data-dialog-button]'))) break;
      await sleep(600);
      continue;
    }
    if (await ev(`!!document.querySelector('[data-run-end]') || !!document.querySelector('[data-chart]')`)) break;
    const human = await ev(`!!document.querySelector('[data-pass]') && !document.querySelector('[data-pass]').disabled`);
    if (!human) { await sleep(600); continue; }
    const played = await ev(`(async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const cards = Array.from(document.querySelectorAll('.hand [data-card][data-playable="true"]'));
      if (!cards.length) return false;
      cards.sort((a, b) => Number(b.querySelector('.cval').textContent) - Number(a.querySelector('.cval').textContent));
      cards[0].click();
      await sleep(60);
      const cell = document.querySelector('.cell.legal');
      if (!cell) return false;
      cell.click();
      await sleep(60);
      document.querySelector('[data-cell="' + cell.dataset.cell + '"]').click();
      return true;
    })()`);
    if (!played) await click('[data-pass]');
    await sleep(900);
  }
}
console.log('approved', approved);
await shot('4-result-stamp.png');
}

// 5. Deck view with specials, one benched (kept)
if (process.env.ALL) {
await fresh();
await ev(`localStorage.setItem('qbr.bench.v1', JSON.stringify(['gossip']))`);
await send('Page.reload');
await sleep(1200);
await click('[data-deck]');
await sleep(400);
await shot('5-deck.png');
}

ws.close();
process.exit(0);
