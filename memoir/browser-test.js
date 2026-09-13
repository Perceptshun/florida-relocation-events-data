/* End-to-end check of the whole app in a real browser, with a stand-in for the
   speech engine so no microphone is needed.

     npm install playwright && npx playwright install chromium
     node memoir/browser-test.js

   Set CHROME_PATH if Chromium lives somewhere unusual. Screenshots land in /tmp. */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
                '.webmanifest':'application/manifest+json', '.png':'image/png' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

// A stand-in for the browser's speech engine so we can test without a microphone.
const FAKE_SR = `
  class FakeSR {
    constructor(){ this.running = false; }
    start(){ if (this.running) throw new Error('already started'); this.running = true; window.__sr = this; }
    stop(){ if (!this.running) return; this.running = false; this.onend && this.onend(); }
    abort(){ this.stop(); }
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
  window.__say = function (text, isFinal) {
    const r = { 0: { transcript: text }, isFinal: isFinal !== false, length: 1 };
    const results = { 0: r, length: 1 };
    window.__sr.onresult({ resultIndex: 0, results: results });
  };
  window.speechSynthesis = { speak(){}, cancel(){} };
`;


// ---- a stand-in for Google, so the Drive path can be tested offline -------
const FAKE_GOOGLE = `
  window.__drive = { creates: [], updates: [], folders: 0 };
  window.google = { accounts: { oauth2: {
    initTokenClient(opts) {
      const c = { requestAccessToken() {
        setTimeout(() => c.callback({ access_token: 'fake-token', expires_in: 3600 }), 5);
      }, callback: null, error_callback: null };
      return c;
    },
    revoke() {}
  }}};
  const realFetch = window.fetch;
  window.fetch = function (url, opts) {
    url = String(url); opts = opts || {};
    const json = (o) => Promise.resolve(new Response(JSON.stringify(o),
      { status: 200, headers: { 'Content-Type': 'application/json' } }));
    if (url.indexOf('googleapis.com') === -1) return realFetch(url, opts);

    if (url.indexOf('/upload/drive/v3/files/') === 0 || /\\/upload\\/drive\\/v3\\/files\\/[^?]+\\?uploadType=media/.test(url)) {
      window.__drive.updates.push({ url, body: opts.body });
      return json({ id: 'doc' });
    }
    if (url.indexOf('uploadType=multipart') !== -1) {
      const n = 'doc' + (window.__drive.creates.length + 1);
      window.__drive.creates.push({ body: opts.body, id: n });
      return json({ id: n });
    }
    if (opts.method === 'POST') { window.__drive.folders++; return json({ id: 'folder1' }); }
    if (/files\\/[A-Za-z0-9_-]+\\?fields=id,trashed/.test(url)) return json({ id: 'x', trashed: false });
    return json({ files: [] });   // the "does a folder already exist" search
  };
`;

async function driveChecks(browser, origin) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  page.on('pageerror', e => { console.log('DRIVE PAGE ERROR:', e.message); fail++; });
  await page.addInitScript(FAKE_SR);
  await page.addInitScript(FAKE_GOOGLE);
  // Seed a client id the way the in-app settings field would, plus one passage.
  await page.addInitScript(() => {
    localStorage.setItem('mls.v1', JSON.stringify({
      entries: [{ id: 'seed1', ts: Date.now(), cat: 'self', text: 'I was born in a cold winter.' }],
      settings: { scale: 1, theme: 'day', speak: false },
      drive: { on: false, clientId: 'test.apps.googleusercontent.com', folderId: null, docs: {}, lastSync: 0 }
    }));
  });

  await page.goto(origin + '/index.html');
  await page.click('nav.bottom button[data-view="help"]');
  await page.waitForTimeout(200);

  check('Drive starts switched off',
        await page.textContent('#driveBlurb'), /^Off\./, true);
  check('privacy line promises nothing is uploaded while Drive is off',
        /nothing is uploaded/.test(await page.textContent('#privacyNote')), 'true');

  await page.click('#driveConnect');
  await page.waitForTimeout(1200);

  const d = await page.evaluate(() => window.__drive);
  check('a Drive folder is made', d.folders, 1);
  check('one document per book is made', d.creates.length, 3);
  check('the document carries his writing',
        /I was born in a cold winter\./.test(d.creates.map(c => c.body).join('\n')), 'true');
  check('the document is created as a Google Doc',
        /application\/vnd\.google-apps\.document/.test(d.creates[0].body), 'true');
  check('privacy line now admits a copy goes to Drive',
        /goes to\s+your own Drive/.test(await page.textContent('#privacyNote')), 'true');

  // A new passage should update the existing document rather than make another.
  await page.click('nav.bottom button[data-view="talk"]');
  await page.click('#talkBtn');
  await page.evaluate(() => window.__say('and my mother sang to me every night'));
  await page.click('#talkBtn');
  await page.click('#saveBtn');
  await page.waitForTimeout(3400);

  const d2 = await page.evaluate(() => window.__drive);
  check('no second set of documents is made', d2.creates.length, 3);
  check('the existing document is rewritten', d2.updates.length >= 1, 'true');
  check('the rewrite contains the new passage',
        /sang to me every night/.test(d2.updates.map(u => u.body).join('\n')), 'true');

  // Turning it off must stop sending, and must not touch what is already there.
  await page.click('nav.bottom button[data-view="help"]');
  await page.click('#driveDisconnect');
  await page.waitForTimeout(200);
  const before = (await page.evaluate(() => window.__drive)).updates.length;
  await page.click('nav.bottom button[data-view="talk"]');
  await page.click('#talkBtn');
  await page.evaluate(() => window.__say('this one should stay here on the device'));
  await page.click('#talkBtn');
  await page.click('#saveBtn');
  await page.waitForTimeout(3400);
  check('nothing more is sent once Drive saving is turned off',
        (await page.evaluate(() => window.__drive)).updates.length, before);

  await page.screenshot({ path: '/tmp/shot-drive.png' });
  await page.click('nav.bottom button[data-view="help"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: '/tmp/shot-help.png', fullPage: true });
  await ctx.close();
}

let pass = 0, fail = 0;
function check(name, got, want, isRegex) {
  const ok = isRegex ? want.test(String(got)) : String(got) === String(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        wanted: ${JSON.stringify(want)}\n        got:    ${JSON.stringify(got)}`);
}

(async () => {
  await new Promise(r => server.listen(8099, r));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  await page.addInitScript(FAKE_SR);
  page.on('pageerror', e => { console.log('PAGE ERROR:', e.message); fail++; });
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });
  await page.goto('http://localhost:8099/index.html');
  await page.waitForTimeout(300);

  // ---- dictate a passage and see how it is written down and sorted --------
  async function dictate(text) {
    await page.click('#talkBtn');
    await page.evaluate(t => window.__say(t), text);
    await page.click('#talkBtn');
    await page.waitForTimeout(80);
  }

  await dictate('when I was a boy I worked at my fathers bakery on fulton street period we opened at four in the morning');
  check('transcript is punctuated and capitalised',
        await page.textContent('#live'),
        'When I was a boy I worked at my fathers bakery on fulton street. We opened at four in the morning.');
  check('his own memory goes to About My Life',
        await page.getAttribute('.chip[data-cat="self"]', 'aria-pressed'), 'true');
  await page.click('#saveBtn');
  await page.waitForTimeout(80);

  await dictate('my father was a quiet man he was born in nineteen twenty two and he never once complained about the work');
  check('a passage about another person goes to About Someone Real',
        await page.getAttribute('.chip[data-cat="other"]', 'aria-pressed'), 'true');
  await page.click('#saveBtn');
  await page.waitForTimeout(80);

  await dictate('once upon a time there was a fisherman who caught a talking fish');
  check('a fiction cue goes to Made-Up Stories',
        await page.getAttribute('.chip[data-cat="story"]', 'aria-pressed'), 'true');
  await page.click('#saveBtn');
  await page.waitForTimeout(80);

  // ---- spoken punctuation commands ---------------------------------------
  await dictate('this is the first thought new paragraph and here is the second one question mark');
  check('spoken "new paragraph" and "question mark" become real punctuation',
        await page.textContent('#live'),
        'This is the first thought\n\nAnd here is the second one?');
  await page.click('#clearBtn'); // confirm() is auto-accepted below

  // ---- the three books ----------------------------------------------------
  await page.click('nav.bottom button[data-view="writing"]');
  await page.waitForTimeout(120);
  check('About My Life holds one piece', await page.locator('#entryList .entry').count(), 1);
  await page.click('.tabs button[data-tab="other"]');
  check('About Someone Real holds one piece', await page.locator('#entryList .entry').count(), 1);
  await page.click('.tabs button[data-tab="story"]');
  check('Made-Up Stories holds one piece', await page.locator('#entryList .entry').count(), 1);

  // ---- the streak ---------------------------------------------------------
  await page.click('nav.bottom button[data-view="streak"]');
  await page.waitForTimeout(120);
  check('streak shows one day in a row', await page.textContent('#statCurrent'), '1');
  check('streak shows one day total',   await page.textContent('#statTotal'),   '1');
  check('today has a check mark',       await page.locator('.day.today.done').count(), 1);

  // ---- editing a piece ----------------------------------------------------
  await page.click('nav.bottom button[data-view="writing"]');
  await page.click('.tabs button[data-tab="self"]');
  await page.click('.entry-tools button:has-text("Fix Words")');
  await page.fill('.entry textarea', 'Corrected by hand.');
  await page.click('button:has-text("Keep Changes")');
  await page.waitForTimeout(80);
  check('hand edits are kept', await page.textContent('.entry .text'), 'Corrected by hand.');

  // ---- it survives closing the app ---------------------------------------
  await page.reload();
  await page.waitForTimeout(300);
  await page.click('nav.bottom button[data-view="writing"]');
  await page.waitForTimeout(120);
  check('writing is still there after closing and reopening',
        await page.textContent('.entry .text'), 'Corrected by hand.');

  // ---- bigger text --------------------------------------------------------
  const before = await page.evaluate(() => getComputedStyle(document.body).fontSize);
  await page.click('#textBigger');
  await page.click('#textBigger');
  const after = await page.evaluate(() => getComputedStyle(document.body).fontSize);
  check('the A+ button really makes the type bigger', parseFloat(after) > parseFloat(before), 'true');

  // ---- offline ------------------------------------------------------------
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.context().setOffline(true);
  await page.reload();
  await page.waitForTimeout(400);
  check('the app opens with no internet at all',
        await page.textContent('#pageTitle'), 'My Life Stories');
  await page.click('nav.bottom button[data-view="writing"]');
  await page.waitForTimeout(150);
  check('writing is readable with no internet',
        await page.textContent('.entry .text'), 'Corrected by hand.');
  await page.context().setOffline(false);

  // ---- moving a piece into a different book -------------------------------
  await page.click('nav.bottom button[data-view="writing"]');
  await page.click('.tabs button[data-tab="self"]');
  await page.click('.entry-tools button:has-text("Move")');
  check('the move row offers the two other books',
        await page.locator('.move-row button').count(), 3); // two books + never mind
  await page.click('.move-row button:has-text("Made-Up Stories")');
  await page.waitForTimeout(100);
  check('the piece left About My Life', await page.locator('#entryList .entry').count(), 0);
  await page.click('.tabs button[data-tab="story"]');
  check('the piece arrived in Made-Up Stories', await page.locator('#entryList .entry').count(), 2);

  await page.screenshot({ path: '/tmp/shot-writing.png' });
  await page.click('nav.bottom button[data-view="talk"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: '/tmp/shot-talk.png' });
  await page.click('nav.bottom button[data-view="streak"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: '/tmp/shot-streak.png' });

  await driveChecks(browser, 'http://localhost:8099');

  await browser.close();
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
