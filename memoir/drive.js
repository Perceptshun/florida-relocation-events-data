/* ==========================================================================
   Saving to Google Drive — entirely optional.

   When it is switched on, each of the three books is kept as a Google Doc in
   a "My Life Stories" folder in the person's own Drive, rewritten a couple of
   seconds after anything changes. They own the documents and can share, print
   or edit them like any other.

   It is off until somebody turns it on, it asks for the narrowest scope
   Google offers (drive.file — only files this app itself creates), and it
   never gets in the way: if Drive is unreachable the writing is still saved
   on the device and the upload is retried later.
   ========================================================================== */
window.MLSDrive = (function () {
'use strict';

var SCOPE  = 'https://www.googleapis.com/auth/drive.file';
var GIS    = 'https://accounts.google.com/gsi/client';
var FOLDER = 'My Life Stories';
var DOC_MIME    = 'application/vnd.google-apps.document';
var FOLDER_MIME = 'application/vnd.google-apps.folder';

var cfg = {};          // { getBookText, getBookName, getState, saveState, onStatus }
var tokenClient = null;
var token = null;      // { value, expiresAt } — kept in memory only, never stored
var gisReady = false;
var dirty = {};        // book keys waiting to be uploaded
var timer = null;
var busy = false;
var status = { state: 'off', detail: '' };

/* ---------- status reporting ---------------------------------------------- */

function setStatus(state, detail) {
  status = { state: state, detail: detail || '' };
  if (cfg.onStatus) cfg.onStatus(status);
}

function getStatus() { return status; }

/* ---------- configuration -------------------------------------------------- */

/** A client id pasted into Settings wins over the one baked into config.js,
    so somebody testing a shared copy can point it at their own Google project. */
function clientId() {
  var st = cfg.getState ? cfg.getState() : {};
  return (st.clientId || (window.MLS_CONFIG && window.MLS_CONFIG.googleClientId) || '').trim();
}

function isConfigured() { return !!clientId(); }
function isOn() { var st = cfg.getState ? cfg.getState() : {}; return !!st.on; }

/* ---------- loading Google's sign-in library ------------------------------- */

function loadGis() {
  if (gisReady) return Promise.resolve();
  if (window.google && window.google.accounts && window.google.accounts.oauth2) {
    gisReady = true;
    return Promise.resolve();
  }
  return new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = GIS;
    s.async = true;
    s.onload = function () { gisReady = true; resolve(); };
    s.onerror = function () { reject(new Error('offline')); };
    document.head.appendChild(s);
  });
}

function ensureTokenClient() {
  if (tokenClient) return;
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId(),
    scope: SCOPE,
    callback: function () { /* replaced per request below */ }
  });
}

/** interactive=false asks Google for a token without showing anything, which
    works once permission has been given. Only the first time needs a prompt. */
function getToken(interactive) {
  if (token && token.expiresAt > Date.now() + 60000) return Promise.resolve(token.value);

  return loadGis().then(function () {
    ensureTokenClient();
    return new Promise(function (resolve, reject) {
      var settled = false;
      var giveUp = setTimeout(function () {
        if (!settled) { settled = true; reject(new Error('needs-permission')); }
      }, interactive ? 120000 : 8000);

      tokenClient.callback = function (resp) {
        if (settled) return;
        settled = true;
        clearTimeout(giveUp);
        if (resp && resp.access_token) {
          token = { value: resp.access_token,
                    expiresAt: Date.now() + ((resp.expires_in || 3600) * 1000) };
          resolve(token.value);
        } else {
          reject(new Error(resp && resp.error === 'access_denied' ? 'declined' : 'needs-permission'));
        }
      };
      tokenClient.error_callback = function () {
        if (settled) return;
        settled = true;
        clearTimeout(giveUp);
        reject(new Error('needs-permission'));
      };

      try {
        tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
      } catch (e) {
        if (!settled) { settled = true; clearTimeout(giveUp); reject(e); }
      }
    });
  });
}

/* ---------- talking to Drive ----------------------------------------------- */

function api(url, opts, accessToken) {
  opts = opts || {};
  opts.headers = opts.headers || {};
  opts.headers.Authorization = 'Bearer ' + accessToken;
  return fetch(url, opts).then(function (res) {
    if (res.status === 401) { token = null; throw new Error('needs-permission'); }
    if (!res.ok) throw new Error('drive-' + res.status);
    return res.status === 204 ? null : res.json();
  });
}

function stillThere(id, accessToken) {
  return api('https://www.googleapis.com/drive/v3/files/' + id + '?fields=id,trashed',
             { method: 'GET' }, accessToken)
    .then(function (f) { return f && !f.trashed; })
    .catch(function (e) { if (e.message === 'needs-permission') throw e; return false; });
}

function findOrCreateFolder(accessToken, state) {
  if (state.folderId) {
    return stillThere(state.folderId, accessToken).then(function (ok) {
      if (ok) return state.folderId;
      state.folderId = null;
      return findOrCreateFolder(accessToken, state);
    });
  }
  var q = encodeURIComponent(
    "mimeType='" + FOLDER_MIME + "' and name='" + FOLDER + "' and trashed=false");
  return api('https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id)&pageSize=1',
             { method: 'GET' }, accessToken)
    .then(function (r) {
      if (r.files && r.files.length) return r.files[0].id;
      return api('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: FOLDER, mimeType: FOLDER_MIME })
      }, accessToken).then(function (f) { return f.id; });
    })
    .then(function (id) { state.folderId = id; return id; });
}

/** A multipart create: the metadata says "make this a Google Doc", the second
    part is the plain text, and Drive converts it on the way in. */
function createDoc(name, text, folderId, accessToken) {
  var b = '-------mls' + Date.now();
  var body =
    '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify({ name: name, mimeType: DOC_MIME, parents: [folderId] }) + '\r\n' +
    '--' + b + '\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n' +
    text + '\r\n' +
    '--' + b + '--';
  return api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/related; boundary=' + b },
    body: body
  }, accessToken).then(function (f) { return f.id; });
}

/** Replacing the contents of an existing Doc with the current text. Rewriting
    the whole thing is simpler than patching, and repeating it is harmless. */
function replaceDoc(id, text, accessToken) {
  return api('https://www.googleapis.com/upload/drive/v3/files/' + id + '?uploadType=media&fields=id', {
    method: 'PATCH',
    headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
    body: text
  }, accessToken);
}

function pushBook(cat, accessToken, state) {
  var text = cfg.getBookText(cat);
  var name = cfg.getBookName(cat);
  state.docs = state.docs || {};

  var existing = state.docs[cat];
  var ready = existing
    ? stillThere(existing, accessToken).then(function (ok) { return ok ? existing : null; })
    : Promise.resolve(null);

  return ready.then(function (id) {
    if (id) return replaceDoc(id, text, accessToken).then(function () { return id; });
    return findOrCreateFolder(accessToken, state).then(function (folderId) {
      return createDoc(name, text, folderId, accessToken);
    });
  }).then(function (id) {
    state.docs[cat] = id;
  });
}

/* ---------- the sync loop --------------------------------------------------- */

function markDirty(cat) {
  if (!isOn() || !isConfigured()) return;
  dirty[cat] = true;
  setStatus('pending', 'Waiting to save to Drive…');
  clearTimeout(timer);
  timer = setTimeout(function () { syncNow(false); }, 2500);
}

function syncNow(interactive) {
  if (!isOn() || !isConfigured()) return Promise.resolve();

  var pending = Object.keys(dirty);
  if (!pending.length) { setStatus('synced', 'Everything is saved to Drive.'); return Promise.resolve(); }
  if (busy) return Promise.resolve();

  if (navigator.onLine === false) {
    setStatus('waiting', 'No internet — it will go to Drive when you are back online.');
    return Promise.resolve();
  }

  busy = true;
  setStatus('syncing', 'Saving to Drive…');
  var state = cfg.getState();

  return getToken(!!interactive).then(function (accessToken) {
    return pending.reduce(function (chain, cat) {
      return chain.then(function () {
        return pushBook(cat, accessToken, state).then(function () { delete dirty[cat]; });
      });
    }, Promise.resolve());
  }).then(function () {
    state.lastSync = Date.now();
    cfg.saveState(state);
    setStatus('synced', 'Saved to Drive just now.');
  }).catch(function (e) {
    cfg.saveState(state); // keep any ids we did manage to create
    if (e.message === 'needs-permission') {
      setStatus('reconnect', 'Google needs you to sign in again. Your writing is safe here.');
    } else if (e.message === 'declined') {
      setStatus('reconnect', 'Permission was not given. Your writing is safe here.');
    } else if (e.message === 'offline' || /NetworkError|Failed to fetch/i.test(e.message)) {
      setStatus('waiting', 'Could not reach Drive — it will try again shortly.');
    } else {
      setStatus('error', 'Drive said no (' + e.message + '). Your writing is safe here.');
    }
  }).then(function () {
    busy = false;
  });
}

/* ---------- switching it on and off ----------------------------------------- */

/** The one place a permission box is allowed to appear: the person has just
    tapped "Save my writing to Google Drive". */
function connect(allCats) {
  if (!isConfigured()) {
    setStatus('unconfigured', 'This copy of the app has no Google set-up yet.');
    return Promise.reject(new Error('unconfigured'));
  }
  setStatus('syncing', 'Asking Google for permission…');
  return getToken(true).then(function () {
    var state = cfg.getState();
    state.on = true;
    cfg.saveState(state);
    allCats.forEach(function (c) { dirty[c] = true; });
    return syncNow(true);
  }).catch(function (e) {
    setStatus('reconnect', e.message === 'declined'
      ? 'Permission was not given, so nothing was sent.'
      : 'Could not connect to Google. Nothing was sent.');
    throw e;
  });
}

function disconnect() {
  var state = cfg.getState();
  state.on = false;
  cfg.saveState(state);
  dirty = {};
  clearTimeout(timer);
  if (token && window.google && window.google.accounts && window.google.accounts.oauth2 &&
      window.google.accounts.oauth2.revoke) {
    try { window.google.accounts.oauth2.revoke(token.value); } catch (e) {}
  }
  token = null;
  setStatus('off', 'Turned off. Nothing more will be sent to Drive.');
}

function docLink(cat) {
  var state = cfg.getState();
  var id = state.docs && state.docs[cat];
  return id ? 'https://docs.google.com/document/d/' + id + '/edit' : null;
}

function folderLink() {
  var state = cfg.getState();
  return state.folderId ? 'https://drive.google.com/drive/folders/' + state.folderId : null;
}

/* ---------- start-up ---------------------------------------------------------- */

function init(options) {
  cfg = options;
  if (!isConfigured()) { setStatus('unconfigured', ''); return; }
  if (!isOn()) { setStatus('off', ''); return; }
  setStatus('idle', 'Connected to Google Drive.');

  // Anything that changed while the app was closed goes up now.
  options.catKeys.forEach(function (c) { dirty[c] = true; });
  setTimeout(function () { syncNow(false); }, 1500);

  window.addEventListener('online', function () { syncNow(false); });
}

return {
  init: init,
  connect: connect,
  disconnect: disconnect,
  markDirty: markDirty,
  syncNow: syncNow,
  getStatus: getStatus,
  isOn: isOn,
  isConfigured: isConfigured,
  docLink: docLink,
  folderLink: folderLink
};

})();
