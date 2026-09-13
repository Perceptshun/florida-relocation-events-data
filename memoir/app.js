/* ==========================================================================
   My Life Stories
   A talk-into-a-book app. Everything lives on this device: no account,
   no server, no upload. Written to be readable by whoever maintains it next.
   ========================================================================== */
(function () {
'use strict';

/* --------------------------------------------------------------------------
   1. Storage
   One JSON blob in localStorage. It is small (text only) and survives
   reloads and offline use. Backups are the safety net, see makeBackup().
   -------------------------------------------------------------------------- */

var KEY = 'mls.v1';

var CATS = {
  self:  { label: 'About My Life',      book: 'About My Life',            icon: '👤' },
  other: { label: 'About Someone Real', book: 'True Stories About Others', icon: '👥' },
  story: { label: 'A Made-Up Story',    book: 'Made-Up Stories',          icon: '📖' }
};

var db = load();

function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.entries)) return normalize(parsed);
    }
  } catch (e) {
    console.warn('Could not read saved work:', e);
  }
  return { entries: [], settings: { scale: 1, theme: 'day', speak: true },
           drive: { on: false, clientId: '', folderId: null, docs: {}, lastSync: 0 } };
}

function normalize(d) {
  d.settings = d.settings || {};
  if (typeof d.settings.scale !== 'number') d.settings.scale = 1;
  if (!d.settings.theme) d.settings.theme = 'day';
  if (typeof d.settings.speak !== 'boolean') d.settings.speak = true;
  d.drive = d.drive || { on: false, clientId: '', folderId: null, docs: {}, lastSync: 0 };
  d.entries.forEach(function (e) { if (!CATS[e.cat]) e.cat = 'self'; });
  return d;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    alert('This device would not let me save. Your writing is still on the screen — ' +
          'please go to Help and make a backup right away.');
    console.error(e);
    return false;
  }
}

/* --------------------------------------------------------------------------
   2. Small helpers
   -------------------------------------------------------------------------- */

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

/** Local-time day key, e.g. "2026-09-13". Never use toISOString here: it is UTC
    and would tick a day early or late depending on the time zone. */
function dayKey(d) {
  return d.getFullYear() + '-' +
         String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

function prettyDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function countWords(s) {
  var m = String(s).trim().match(/\S+/g);
  return m ? m.length : 0;
}

function speak(text) {
  if (!db.settings.speak || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    speechSynthesis.speak(u);
  } catch (e) { /* speaking is a nicety; never let it break a save */ }
}

/* --------------------------------------------------------------------------
   3. Tidying dictated speech
   Browsers hand back a bare run of words. We add the punctuation he asks for
   out loud, capitalise sentences, and fix the lone "i".
   -------------------------------------------------------------------------- */

var SPOKEN_MARKS = [
  [/\b(new paragraph|next paragraph)\b/gi, '\n\n'],
  [/\b(new line|next line)\b/gi, '\n'],
  [/\b(full stop|period)\b/gi, '.'],
  [/\bcomma\b/gi, ','],
  [/\bquestion mark\b/gi, '?'],
  [/\bexclamation (point|mark)\b/gi, '!'],
  [/\bsemicolon\b/gi, ';'],
  [/\bcolon\b/gi, ':'],
  [/\b(dash|hyphen)\b/gi, '—'],
  [/\bopen quote(s)?\b/gi, '“'],
  [/\b(close quote(s)?|end quote(s)?|unquote)\b/gi, '”']
];

function applySpokenPunctuation(text) {
  var out = ' ' + text + ' ';
  SPOKEN_MARKS.forEach(function (pair) { out = out.replace(pair[0], pair[1]); });
  // Pull marks back against the word before them, and keep one space after.
  out = out.replace(/\s+([.,;:!?”])/g, '$1');
  out = out.replace(/([“])\s+/g, '$1');
  out = out.replace(/([.,;:!?])(?=[^\s\n])/g, '$1 ');
  out = out.replace(/[ \t]+/g, ' ');
  out = out.replace(/[ \t]*\n[ \t]*/g, '\n');
  return out.trim();
}

function capitalize(text) {
  var out = text.replace(/\bi\b/g, 'I');
  // First letter of the text, and the first letter after . ! ? or a line break.
  out = out.replace(/(^|[.!?]\s+|\n\s*)([a-z])/g, function (_, lead, ch) {
    return lead + ch.toUpperCase();
  });
  return out;
}

function tidy(text) {
  var out = capitalize(applySpokenPunctuation(text));
  // A sentence with no ending mark reads as unfinished on the page.
  if (out && !/[.!?…”]$/.test(out)) out += '.';
  return out;
}

/* --------------------------------------------------------------------------
   4. Sorting a passage into one of the three books
   Heuristics, not magic. It guesses, shows him the guess, and he can change
   it with one tap. Ambiguous passages default to "About My Life" because
   that is what a memoir mostly is.
   -------------------------------------------------------------------------- */

var FICTION_CUES = /\b(once upon a time|made[- ]up story|make[- ]believe|this is fiction|a fictional|imaginary|i made (this|it|that) up|let'?s pretend|a story about a|tall tale|fairy tale)\b/;
var SELF_CUES    = /\b(when i was|i remember|i grew up|my life|i was born|back when i|in my day|i used to|the way i)\b/;
var OTHER_CUES   = /\b(my (father|mother|dad|mom|wife|husband|brother|sister|son|daughter|grandfather|grandmother|uncle|aunt|cousin|friend|neighbou?r|boss|teacher)|a man (named|called)|a woman (named|called)|he was|she was|they were|his name|her name)\b/;

var SELF_PRON  = /\b(i|me|my|mine|myself)\b/g;
var THIRD_PRON = /\b(he|him|his|she|her|hers|they|them|their|theirs)\b/g;

function hits(re, s) { var m = s.match(re); return m ? m.length : 0; }

/** Returns { cat: 'self'|'other'|'story', sure: true|false } */
function classify(text) {
  var t = ' ' + text.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ') + ' ';

  // Said out loud, a fiction cue settles it.
  if (FICTION_CUES.test(t)) return { cat: 'story', sure: true };

  var me = hits(SELF_PRON, t);
  var them = hits(THIRD_PRON, t);
  if (SELF_CUES.test(t)) me += 3;
  if (OTHER_CUES.test(t)) them += 3;

  if (me === 0 && them === 0) return { cat: 'self', sure: false };

  // Somebody else has to clearly carry the passage to pull it out of the memoir.
  if (them > me) return { cat: 'other', sure: them >= me * 2 };
  return { cat: 'self', sure: me >= them * 2 };
}

/* --------------------------------------------------------------------------
   5. Speech recognition
   Chrome/Edge/Safari expose this as (webkit)SpeechRecognition. Newer Chrome
   can run the model on the device itself, which is what we ask for first;
   when that is unavailable the browser's own service is used instead.
   -------------------------------------------------------------------------- */

var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
var recognition = null;
var listening = false;     // true between "start talking" and "stop"
var wantListening = false; // what HE asked for; used to restart after a timeout
var committed = '';        // finished text for this session
var interim = '';          // the browser's live guess, not yet final
var onDevice = false;

var talkBtn = $('#talkBtn'), talkLabel = $('#talkLabel'), statusEl = $('#status'),
    liveEl = $('#live'), catPick = $('#catPick'), catExplain = $('#catExplain'),
    saveBtn = $('#saveBtn'), clearBtn = $('#clearBtn'), micWarning = $('#micWarning');

var chosenCat = null;

function setStatus(msg) { statusEl.textContent = msg; }

function renderLive() {
  liveEl.textContent = '';
  if (committed) liveEl.appendChild(document.createTextNode(committed));
  if (interim) {
    var span = document.createElement('span');
    span.className = 'interim';
    span.textContent = (committed ? ' ' : '') + interim;
    liveEl.appendChild(span);
  }
  liveEl.scrollTop = liveEl.scrollHeight;
  var has = committed.trim().length > 0;
  saveBtn.disabled = !has;
  clearBtn.disabled = !has;
  document.body.classList.toggle('has-draft', has);
  if (has) suggestCategory();
}

function suggestCategory() {
  var guess = classify(committed);
  chosenCat = guess.cat;
  catPick.classList.remove('hide');
  catExplain.textContent = guess.sure
    ? 'I put this in — tap a different box if I got it wrong:'
    : 'Which one is this? Tap the right box:';
  paintChips();
}

function paintChips() {
  $$('.chip').forEach(function (c) {
    c.setAttribute('aria-pressed', String(c.dataset.cat === chosenCat));
  });
}

/** Ask the browser for a model that runs entirely on this device. Chrome 139+
    only; everywhere else this quietly does nothing and we use the default. */
function tryOnDevice(rec) {
  if (!SR || typeof SR.available !== 'function') return;
  try {
    SR.available({ langs: ['en-US'], processLocally: true }).then(function (state) {
      if (state === 'available') {
        rec.processLocally = true;
        onDevice = true;
        updateEngineNote();
      } else if (state === 'downloadable' && typeof SR.install === 'function') {
        SR.install({ langs: ['en-US'], processLocally: true }).then(function (ok) {
          if (ok) { rec.processLocally = true; onDevice = true; updateEngineNote(); }
        }).catch(function () {});
      }
    }).catch(function () {});
  } catch (e) { /* older browser, nothing to do */ }
}

function buildRecognition() {
  var rec = new SR();
  rec.lang = navigator.language && /^en/.test(navigator.language) ? navigator.language : 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  tryOnDevice(rec);

  rec.onresult = function (ev) {
    var fresh = '';
    interim = '';
    for (var i = ev.resultIndex; i < ev.results.length; i++) {
      var r = ev.results[i];
      if (r.isFinal) fresh += r[0].transcript + ' ';
      else interim += r[0].transcript;
    }
    if (fresh.trim()) {
      var piece = tidy(fresh);
      if (!committed) committed = piece;
      else if (/\n$/.test(committed) || /^\n/.test(piece)) committed += piece;
      else committed += ' ' + piece;
      committed = committed.replace(/\n{3,}/g, '\n\n');
    }
    renderLive();
  };

  rec.onerror = function (ev) {
    if (ev.error === 'no-speech' || ev.error === 'aborted') return; // normal, onend restarts
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
      wantListening = false;
      stopUI();
      showMicWarning('This device has not given permission to use the microphone. ' +
        'Look for a microphone icon in the address bar and choose “Allow”, then try again.');
    } else if (ev.error === 'network') {
      wantListening = false;
      stopUI();
      showMicWarning('This browser needed the internet to understand speech and could not reach it. ' +
        'Your saved writing is safe and still works offline.');
    } else {
      setStatus('Something interrupted the microphone. Press the circle to start again.');
    }
  };

  // Browsers cut the microphone off after a pause. If he never pressed stop,
  // start it straight back up so he can keep thinking out loud.
  rec.onend = function () {
    if (wantListening) {
      try { rec.start(); return; } catch (e) { /* fall through to stopping */ }
    }
    stopUI();
  };

  return rec;
}

function startListening() {
  if (!SR) return;
  if (!recognition) recognition = buildRecognition();
  wantListening = true;
  try {
    recognition.start();
  } catch (e) {
    // start() throws if it is already running; that is harmless.
  }
  listening = true;
  talkBtn.classList.add('recording');
  talkBtn.setAttribute('aria-pressed', 'true');
  talkLabel.innerHTML = 'I am listening…<br>Press to Stop';
  setStatus('Go ahead — I am writing it down.');
}

function stopListening() {
  wantListening = false;
  if (recognition) { try { recognition.stop(); } catch (e) {} }
  stopUI();
}

function stopUI() {
  listening = false;
  talkBtn.classList.remove('recording');
  talkBtn.setAttribute('aria-pressed', 'false');
  talkLabel.innerHTML = 'Press to<br>Start Talking';
  interim = '';
  renderLive();
  setStatus(committed.trim()
    ? 'All done? Check the box below, then press Save It.'
    : 'Press the green circle, then just talk.');
}

talkBtn.addEventListener('click', function () {
  if (listening) stopListening(); else startListening();
});

$$('.chip').forEach(function (chip) {
  chip.addEventListener('click', function () {
    chosenCat = chip.dataset.cat;
    paintChips();
    catExplain.textContent = 'Saving this under:';
  });
});

function showMicWarning(msg) {
  micWarning.textContent = msg;
  micWarning.classList.remove('hide');
}

/* --------------------------------------------------------------------------
   6. Saving a passage
   -------------------------------------------------------------------------- */

saveBtn.addEventListener('click', function () {
  var text = committed.trim();
  if (!text) return;
  if (listening) stopListening();

  var cat = chosenCat || classify(text).cat;
  db.entries.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
                    ts: Date.now(), cat: cat, text: text });
  if (!save()) return;

  committed = ''; interim = ''; chosenCat = null;
  catPick.classList.add('hide');
  renderLive();
  setStatus('Saved in “' + CATS[cat].book + '”. ' + streakSentence());
  speak('Saved in ' + CATS[cat].book + '.');
  refreshStreak();
  driveChanged(cat);
});

clearBtn.addEventListener('click', function () {
  if (!committed.trim()) return;
  if (!confirm('Throw away what you just said? It cannot be brought back.')) return;
  committed = ''; interim = ''; chosenCat = null;
  catPick.classList.add('hide');
  renderLive();
  setStatus('Gone. Press the green circle to start again.');
});

function streakSentence() {
  var s = streakStats();
  if (s.current <= 1) return 'That is today taken care of.';
  return 'That is ' + s.current + ' days in a row.';
}

/* --------------------------------------------------------------------------
   7. My Writing — the three books
   -------------------------------------------------------------------------- */

var currentTab = 'self';
var listEl = $('#entryList');

$$('.tabs button').forEach(function (b) {
  b.addEventListener('click', function () {
    currentTab = b.dataset.tab;
    $$('.tabs button').forEach(function (x) {
      x.setAttribute('aria-selected', String(x.dataset.tab === currentTab));
    });
    renderEntries();
  });
});

function entriesFor(cat) {
  return db.entries.filter(function (e) { return e.cat === cat; })
                   .sort(function (a, b) { return b.ts - a.ts; });
}

function renderEntries() {
  var rows = entriesFor(currentTab);
  listEl.textContent = '';

  if (!rows.length) {
    var p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Nothing here yet. Go to the Talk page and say something.';
    listEl.appendChild(p);
    return;
  }

  rows.forEach(function (entry) { listEl.appendChild(entryCard(entry)); });
}

function entryCard(entry) {
  var card = document.createElement('div');
  card.className = 'entry';
  card.dataset.cat = entry.cat;

  var when = document.createElement('div');
  when.className = 'when';
  when.textContent = prettyDate(entry.ts) + ' · ' + countWords(entry.text) + ' words';
  card.appendChild(when);

  var body = document.createElement('div');
  body.className = 'text';
  body.textContent = entry.text;
  card.appendChild(body);

  var tools = document.createElement('div');
  tools.className = 'entry-tools no-print';

  tools.appendChild(button('🔊 Read to Me', function () {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(entry.text);
      u.rate = 0.92;
      speechSynthesis.speak(u);
    }
  }));

  tools.appendChild(button('✏️ Fix Words', function () {
    startEdit(card, body, tools, entry);
  }));

  tools.appendChild(button('↔️ Move', function () {
    openMoveRow(card, entry);
  }));

  tools.appendChild(button('🗑️ Delete', function () {
    if (!confirm('Delete this piece of writing for good?')) return;
    db.entries = db.entries.filter(function (e) { return e.id !== entry.id; });
    save();
    renderEntries();
    refreshStreak();
    driveChanged(entry.cat);
  }));

  card.appendChild(tools);
  return card;
}

/** Show a row of "put this in ..." buttons under an entry. A prompt box is
    hard to use one-handed on a phone; big buttons are not. */
function openMoveRow(card, entry) {
  var existing = card.querySelector('.move-row');
  if (existing) { existing.remove(); return; }

  var row = document.createElement('div');
  row.className = 'move-row no-print';

  var label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'Put this in:';
  row.appendChild(label);

  Object.keys(CATS).forEach(function (cat) {
    if (cat === entry.cat) return;
    row.appendChild(button(CATS[cat].icon + ' ' + CATS[cat].book, function () {
      var from = entry.cat;
      entry.cat = cat;
      save();
      renderEntries();
      refreshStreak();
      driveChanged(from);
      driveChanged(cat);
    }));
  });

  row.appendChild(button('✗ Never mind', function () { row.remove(); }));
  card.appendChild(row);
}

function button(label, fn) {
  var b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', fn);
  return b;
}

function startEdit(card, body, tools, entry) {
  if (card.querySelector('textarea')) return;
  var ta = document.createElement('textarea');
  ta.value = entry.text;
  body.classList.add('hide');
  tools.classList.add('hide');
  card.insertBefore(ta, tools);

  var bar = document.createElement('div');
  bar.className = 'entry-tools no-print';
  bar.appendChild(button('✓ Keep Changes', function () {
    entry.text = ta.value.trim() || entry.text;
    save();
    renderEntries();
    driveChanged(entry.cat);
  }));
  bar.appendChild(button('✗ Cancel', function () { renderEntries(); }));
  card.appendChild(bar);
  ta.focus();
}

/* --------------------------------------------------------------------------
   8. Printing and downloading a book
   -------------------------------------------------------------------------- */

function bookText(cat) {
  var rows = entriesFor(cat).slice().reverse(); // oldest first reads like a book
  var out = CATS[cat].book.toUpperCase() + '\n' +
            new Array(CATS[cat].book.length + 1).join('=') + '\n\n';
  rows.forEach(function (e) {
    out += prettyDate(e.ts) + '\n\n' + e.text + '\n\n\n';
  });
  return out;
}

$('#printBtn').addEventListener('click', function () {
  if (!entriesFor(currentTab).length) { alert('There is nothing in this book to print yet.'); return; }
  $('#pageTitle').textContent = CATS[currentTab].book;
  window.print();
  setTimeout(function () { $('#pageTitle').textContent = 'My Life Stories'; }, 800);
});

$('#downloadBtn').addEventListener('click', function () {
  if (!entriesFor(currentTab).length) { alert('There is nothing in this book to save yet.'); return; }
  downloadFile(CATS[currentTab].book.replace(/\s+/g, '-') + '.txt',
               bookText(currentTab), 'text/plain');
});

function downloadFile(name, contents, type) {
  var blob = new Blob([contents], { type: type + ';charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
}

/* --------------------------------------------------------------------------
   9. The streak
   A day earns its check mark by having something saved on it — the marks are
   worked out from the writing itself, so they can never drift out of step.
   -------------------------------------------------------------------------- */

var calCursor = new Date();

function daysWritten() {
  var set = {};
  db.entries.forEach(function (e) { set[dayKey(new Date(e.ts))] = true; });
  return set;
}

function streakStats() {
  var set = daysWritten();
  var keys = Object.keys(set).sort();
  var total = keys.length;

  // Current run: count backwards from today. Yesterday still counts as alive,
  // so a streak is not lost simply because he has not written yet this morning.
  var cur = 0;
  var probe = new Date();
  if (!set[dayKey(probe)]) probe.setDate(probe.getDate() - 1);
  while (set[dayKey(probe)]) { cur++; probe.setDate(probe.getDate() - 1); }

  // Longest run ever.
  var best = 0, run = 0, prev = null;
  keys.forEach(function (k) {
    var d = new Date(k + 'T12:00:00');
    if (prev && Math.round((d - prev) / 86400000) === 1) run++; else run = 1;
    if (run > best) best = run;
    prev = d;
  });

  return { current: cur, total: total, best: best, set: set };
}

function refreshStreak() {
  var s = streakStats();
  $('#statCurrent').textContent = s.current;
  $('#statTotal').textContent = s.total;
  $('#statBest').textContent = s.best;
  renderCalendar(s.set);

  var counts = Object.keys(CATS).map(function (c) {
    var words = db.entries.filter(function (e) { return e.cat === c; })
                          .reduce(function (n, e) { return n + countWords(e.text); }, 0);
    return CATS[c].icon + ' ' + CATS[c].book + ': ' + words.toLocaleString() + ' words';
  });
  $('#wordCounts').textContent = counts.join('   ·   ');
}

function renderCalendar(set) {
  var grid = $('#calGrid');
  grid.textContent = '';

  var year = calCursor.getFullYear(), month = calCursor.getMonth();
  $('#calTitle').textContent = calCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (d, i) {
    var el = document.createElement('div');
    el.className = 'dow';
    el.textContent = d;
    el.setAttribute('aria-hidden', 'true');
    el.id = 'dow' + i;
    grid.appendChild(el);
  });

  var first = new Date(year, month, 1);
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var todayKey = dayKey(new Date());

  for (var b = 0; b < first.getDay(); b++) {
    var blank = document.createElement('div');
    blank.className = 'day blank';
    grid.appendChild(blank);
  }

  for (var n = 1; n <= daysInMonth; n++) {
    var key = dayKey(new Date(year, month, n));
    var cell = document.createElement('div');
    cell.className = 'day' + (set[key] ? ' done' : '') + (key === todayKey ? ' today' : '');
    var num = document.createElement('span');
    num.className = 'num';
    num.textContent = n;
    cell.appendChild(num);
    cell.setAttribute('aria-label', n + (set[key] ? ': wrote something' : ': nothing written'));
    grid.appendChild(cell);
  }
}

$('#calPrev').addEventListener('click', function () {
  calCursor.setMonth(calCursor.getMonth() - 1);
  renderCalendar(streakStats().set);
});
$('#calNext').addEventListener('click', function () {
  calCursor.setMonth(calCursor.getMonth() + 1);
  renderCalendar(streakStats().set);
});

/* --------------------------------------------------------------------------
   10. Settings, backup, restore
   -------------------------------------------------------------------------- */

function applySettings() {
  document.documentElement.style.setProperty('--scale', db.settings.scale);
  document.documentElement.setAttribute('data-theme', db.settings.theme);
  $('#themeBtn').textContent = db.settings.theme === 'night' ? '☀️ Daytime Colors' : '🌙 Night Colors';
  $('#readBackBtn').textContent = '🔊 Spoken Replies: ' + (db.settings.speak ? 'On' : 'Off');
}

$('#textBigger').addEventListener('click', function () {
  db.settings.scale = Math.min(1.8, +(db.settings.scale + 0.1).toFixed(2));
  save(); applySettings();
});
$('#textSmaller').addEventListener('click', function () {
  db.settings.scale = Math.max(0.8, +(db.settings.scale - 0.1).toFixed(2));
  save(); applySettings();
});
$('#themeBtn').addEventListener('click', function () {
  db.settings.theme = db.settings.theme === 'night' ? 'day' : 'night';
  save(); applySettings();
});
$('#readBackBtn').addEventListener('click', function () {
  db.settings.speak = !db.settings.speak;
  save(); applySettings();
});

$('#backupBtn').addEventListener('click', function () {
  var stamp = dayKey(new Date());
  downloadFile('my-life-stories-backup-' + stamp + '.json',
               JSON.stringify(db, null, 2), 'application/json');
  alert('Backup saved to your downloads. Keep it somewhere safe — email it to yourself, ' +
        'or copy it onto a memory stick.');
});

$('#restoreBtn').addEventListener('click', function () { $('#restoreFile').click(); });

$('#restoreFile').addEventListener('change', function (ev) {
  var file = ev.target.files && ev.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    var incoming;
    try {
      incoming = JSON.parse(reader.result);
    } catch (e) {
      alert('That file is not a backup from this app.');
      return;
    }
    if (!incoming || !Array.isArray(incoming.entries)) {
      alert('That file is not a backup from this app.');
      return;
    }
    // Merge rather than replace: a restore should never lose newer writing.
    var seen = {};
    db.entries.forEach(function (e) { seen[e.id] = true; });
    var added = 0;
    incoming.entries.forEach(function (e) {
      if (e && e.id && !seen[e.id] && typeof e.text === 'string') {
        if (!CATS[e.cat]) e.cat = 'self';
        db.entries.push(e);
        added++;
      }
    });
    save();
    renderEntries();
    refreshStreak();
    Object.keys(CATS).forEach(driveChanged);
    alert(added
      ? 'Restored ' + added + ' piece' + (added === 1 ? '' : 's') + ' of writing.'
      : 'That backup was already here — nothing new to add.');
  };
  reader.readAsText(file);
  ev.target.value = '';
});

/* --------------------------------------------------------------------------
   10b. Google Drive
   Optional, and off until somebody turns it on. Each book becomes a Google
   Doc in their own Drive, rewritten a few seconds after anything changes,
   so they can share or print it however they like.
   -------------------------------------------------------------------------- */

var driveOn = typeof MLSDrive !== 'undefined';

function driveChanged(cat) {
  if (driveOn) MLSDrive.markDirty(cat);
}

function paintDrive() {
  if (!driveOn) return;
  var card = $('#driveCard');
  if (!card) return;

  var configured = MLSDrive.isConfigured();
  var on = MLSDrive.isOn();
  var st = MLSDrive.getStatus();

  $('#driveOffRow').classList.toggle('hide', on);
  $('#driveOnRow').classList.toggle('hide', !on);
  $('#driveConnect').disabled = !configured;

  $('#driveBlurb').textContent = on
    ? 'On. Each of your three books is kept as a document in your own Google Drive, ' +
      'updated a few seconds after you write something. You own those documents — ' +
      'share, print or edit them however you like.'
    : configured
      ? 'Off. Your writing stays on this device only. Turn this on to keep a copy ' +
        'of each book as a document in your own Google Drive.'
      : 'This copy of the app has not been set up with Google yet. Open ' +
        '“Use my own Google set-up” below, or ask whoever shared it with you.';

  var when = db.drive.lastSync
    ? ' Last saved to Drive ' + new Date(db.drive.lastSync).toLocaleString() + '.'
    : '';
  $('#driveStatus').textContent = on ? (st.detail || 'Connected.') + when : (st.detail || '');

  $('#driveOpen').disabled = !MLSDrive.folderLink();
  updatePrivacyNote();
}

function initDrive() {
  if (!driveOn) return;

  MLSDrive.init({
    catKeys: Object.keys(CATS),
    getBookText: function (cat) { return bookText(cat); },
    getBookName: function (cat) { return CATS[cat].book; },
    getState: function () { return db.drive; },
    saveState: function (state) { db.drive = state; save(); },
    onStatus: function () { paintDrive(); }
  });

  $('#driveConnect').addEventListener('click', function () {
    if (!confirm('This sends your writing to your own Google Drive so you can keep ' +
                 'and share it as documents.\n\nNothing is sent anywhere else. ' +
                 'You can turn this off again at any time.\n\nCarry on?')) return;
    MLSDrive.connect(Object.keys(CATS)).then(paintDrive).catch(paintDrive);
  });

  $('#driveDisconnect').addEventListener('click', function () {
    if (!confirm('Stop saving to Google Drive?\n\nThe documents already in your Drive ' +
                 'stay exactly where they are — they simply stop being updated.')) return;
    MLSDrive.disconnect();
    paintDrive();
  });

  $('#driveOpen').addEventListener('click', function () {
    var link = MLSDrive.folderLink();
    if (link) window.open(link, '_blank', 'noopener');
  });

  $('#driveClientId').value = db.drive.clientId || '';
  $('#driveSaveId').addEventListener('click', function () {
    db.drive.clientId = $('#driveClientId').value.trim();
    save();
    alert(db.drive.clientId
      ? 'Saved. Now tap “Turn On Drive Saving”.'
      : 'Cleared. Drive saving is switched off.');
    location.reload();
  });

  paintDrive();
}

/* --------------------------------------------------------------------------
   11. Moving between pages
   -------------------------------------------------------------------------- */

var TITLES = { talk: 'My Life Stories', writing: 'My Writing', streak: 'My Streak', help: 'Help' };

function show(view) {
  ['talk', 'writing', 'streak', 'help'].forEach(function (v) {
    $('#view-' + v).classList.toggle('hide', v !== view);
  });
  $$('nav.bottom button').forEach(function (b) {
    if (b.dataset.view === view) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  $('#pageTitle').textContent = TITLES[view];
  if (view === 'writing') renderEntries();
  if (view === 'streak') refreshStreak();
  window.scrollTo(0, 0);
}

$$('nav.bottom button').forEach(function (b) {
  b.addEventListener('click', function () { show(b.dataset.view); });
});

/* --------------------------------------------------------------------------
   12. Start up
   -------------------------------------------------------------------------- */

/** The privacy line has to follow the truth: once Drive saving is on, "nothing
    is uploaded" is no longer true, so the wording changes with it. */
function updatePrivacyNote() {
  var el = $('#privacyNote');
  if (!el) return;
  el.textContent = (driveOn && MLSDrive.isOn())
    ? 'You have switched on saving to Google Drive, so a copy of each book goes to ' +
      'your own Drive. Nothing goes anywhere else, and there is still no account here.'
    : 'Your words never leave this device — there is no account and nothing is uploaded.';
}

function updateEngineNote() {
  var note = $('#engineNote');
  if (!note) return;
  note.textContent = onDevice
    ? 'Speech is being turned into writing by this device itself, with no internet at all.'
    : 'Note: on some browsers the speech-to-writing step asks the browser maker for help ' +
      'and needs internet for that one moment. Everything you have already written stays ' +
      'here and opens without internet.';
}

function boot() {
  applySettings();
  renderLive();
  refreshStreak();
  updateEngineNote();
  updatePrivacyNote();
  initDrive();

  if (!SR) {
    talkBtn.disabled = true;
    showMicWarning('This browser cannot listen to speech. Please open this app in ' +
      'Google Chrome, Microsoft Edge, or Safari — then it will work.');
    setStatus('Speech is not available in this browser.');
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function (e) {
      console.warn('Offline support could not be switched on:', e);
    });
  }
}

boot();

})();
