# My Life Stories

A talk-into-a-book app. Press one big button, talk, and what you say is written
down and filed into one of three books:

| Book | What goes in it |
|---|---|
| 👤 **About My Life** | when he is talking about himself |
| 👥 **True Stories About Others** | when he is talking about a real person |
| 📖 **Made-Up Stories** | invented characters and tales |

The app guesses which book a passage belongs in and shows the guess before
saving. One tap changes it. A calendar puts a ✓ on every day he writes, with a
running "days in a row" count.

Everything is stored on the device itself. There is no account, no server, and
nothing is uploaded.

## Getting it onto his device

The app is five ordinary files. It needs to be served over `https://` once —
after that it works with no internet.

### Option A — GitHub Pages (recommended, free)

1. In this repository on github.com: **Settings → Pages**.
2. Under *Build and deployment*, set **Source** to `Deploy from a branch`,
   pick the branch holding this folder, and set the folder to `/ (root)`.
3. Wait a minute, then open `https://<user>.github.io/<repo>/memoir/` on his
   device.
4. **Install it** so it gets its own icon and opens like a normal app:
   - **Android / Chrome:** menu (⋮) → *Add to Home screen* → *Install*
   - **iPhone / iPad, Safari:** Share button → *Add to Home Screen*
   - **Windows / Mac, Chrome or Edge:** the install icon (⊕ or a screen icon)
     at the right end of the address bar
5. Open it once from the new icon while online. From then on it opens offline.

### Option B — straight off a computer

Any static file server works, as long as it is `https://` or `localhost`:

```bash
cd memoir
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` by double-clicking (a `file://` address) mostly works, but
the browser will not allow the offline installer, so use one of the options above.

## Setting it up for him

Do these once, before handing the device over:

- Open it and tap the big circle. When the browser asks for the **microphone**,
  choose **Allow** — and if offered, **Allow on every visit**, so he is never
  asked again.
- Tap **A+** in the corner a few times until the type is a comfortable size.
  It remembers.
- Put the icon on the first home screen, by itself if possible.
- Print `PRINT-THIS-GUIDE.html` and leave it next to the device.

## Backups — please do not skip this

Everything lives in this one browser's storage. Clearing browsing data, or
"reset the browser" advice from a support call, will erase it.

In **Help → Make a Backup** the app writes a single `.json` file. Email it to
yourself once a week. **Restore a Backup** merges it back in — it adds what is
missing and never overwrites newer writing, so restoring twice is harmless.

## About the offline claim, honestly

The app itself — every screen, every word he has already written, the calendar,
printing, backups — works with no internet at all, permanently, once installed.

Turning *speech into text* is done by the browser, and browsers differ:

- Newer Chrome (139+) can run the speech model on the device. The app asks for
  this first, and downloads the model if the browser offers to. **Help → About**
  says whether it got it.
- iPhone and iPad use Apple's dictation, which is on-device for common languages.
- Older desktop Chrome and Edge send the audio to the browser maker to be
  transcribed, and need internet for that moment only. Nothing he has written is
  ever sent anywhere.

If speech needs the internet and there is none, the app says so plainly and
nothing is lost.

A fully offline model in every browser would mean bundling something like
Whisper (tens of megabytes, a slow first load, and a wait after every passage
instead of words appearing as he speaks). For an everyday dictation habit the
browser's own recogniser is faster and far simpler to keep working.

## What's in here

| File | |
|---|---|
| `index.html` | the four screens |
| `app.js` | dictation, sorting, streak, backups |
| `styles.css` | large-type, high-contrast layout |
| `sw.js` | the offline cache — **bump `CACHE` after any edit** |
| `manifest.webmanifest` | makes it installable |
| `icon-192.png`, `icon-512.png` | app icon |
| `PRINT-THIS-GUIDE.html` | one page to print and leave beside the device |
| `browser-test.js` | end-to-end check of the whole app |

### Checking it still works after a change

`browser-test.js` drives the real app in a real browser with a stand-in for the
speech engine, so no microphone is needed. It covers dictation, punctuation
commands, the sorting of all three kinds of passage, saving, editing, moving,
the streak, and opening with the network switched off.

```bash
npm install playwright && npx playwright install chromium
node memoir/browser-test.js        # 19 checks
```

### If you change a file

Installed copies keep serving the old version until the cache name changes.
Edit `sw.js` and bump it:

```js
var CACHE = 'my-life-stories-v2';   // was v1
```

## Things worth knowing

- **Say the punctuation.** "period", "comma", "question mark", "new paragraph",
  "new line" all become real punctuation.
- **It keeps listening.** Browsers cut the microphone off after a pause; the app
  starts it straight back up, so he can stop and think mid-sentence.
- **The ✓ marks are worked out from the writing itself**, not kept in a separate
  tally, so they can never drift out of step with what is actually there.
- **Nothing is thrown away silently.** Delete and Throw Away both ask first.
