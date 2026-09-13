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

Everything is stored on the device itself. There is no account and no server.
Nothing is uploaded unless the person switches on Google Drive saving, which is
off by default and puts the documents in their own Drive.

## Where it lives

The app is published from this repository to:

**https://perceptshun.github.io/florida-relocation-events-data/**

That link is all anyone needs. Send it to whoever wants to try it — each person
gets their own private copy of the writing, held in their own browser. Nobody
can see anybody else's.

### Turning publishing on (once)

`.github/workflows/deploy-memoir.yml` does the publishing, but GitHub needs to be
told to listen to it:

1. **Settings → Pages**
2. Under *Build and deployment*, set **Source** to **GitHub Actions**
3. Merge this branch into `main`

The workflow then runs on every push that touches `memoir/`, and republishes in
about a minute. Only the `memoir/` folder is uploaded — the events data in the
rest of this repository is not part of the published site.

### Installing it so it works offline

Opening the link works straight away, but installing it gives it a real icon and
lets it run with no internet:

- **Android / Chrome:** menu (⋮) → *Add to Home screen* → *Install*
- **iPhone / iPad, Safari:** Share button → *Add to Home Screen*
- **Windows / Mac, Chrome or Edge:** the install icon at the right end of the
  address bar

Open it once from the new icon while online. After that it opens offline.

### Running it on your own machine

```bash
cd memoir
python3 -m http.server 8000     # then open http://localhost:8000
```

Opening `index.html` by double-clicking (a `file://` address) mostly works, but
the browser will not allow the offline installer, so use a server.

## Setting it up for him

Do these once, before handing the device over:

- Open it and tap the big circle. When the browser asks for the **microphone**,
  choose **Allow** — and if offered, **Allow on every visit**, so he is never
  asked again.
- Tap **A+** in the corner a few times until the type is a comfortable size.
  It remembers.
- Put the icon on the first home screen, by itself if possible.
- Print `PRINT-THIS-GUIDE.html` and leave it next to the device.

## Saving into Google Drive

Switched **off** until somebody turns it on. When it is on, each of the three
books is kept as a Google Doc in a **My Life Stories** folder in that person's
own Drive, rewritten a few seconds after anything changes. They own the
documents outright — share, print, or edit them like anything else in Drive.

It asks for the `drive.file` scope, which is the narrowest Google offers: the
app can only touch files it created itself, and can see nothing else in the
Drive. Turning it off stops further updates and leaves the existing documents
untouched. If Drive is unreachable the writing is still saved on the device and
the upload is retried when the connection comes back.

### Switching it on for everyone who uses your copy

Drive saving needs a Google OAuth client id. It is free and takes about five
minutes:

1. [console.cloud.google.com](https://console.cloud.google.com) → create a project
2. **APIs & Services → Library** → enable **Google Drive API**
3. **APIs & Services → OAuth consent screen** → *External*. While the app is
   unpublished, add each person who will use it under **Test users** (up to 100).
4. **Credentials → Create credentials → OAuth client ID → Web application**
5. Under **Authorised JavaScript origins** add the origin only, no path:
   `https://perceptshun.github.io`
6. Paste the client id into `googleClientId` in `memoir/config.js` and push.

Anyone can also paste their own client id into **Help → Save to Google Drive →
Use my own Google set-up**, without touching the code. That is the quickest way
for a tester to try it against their own Google project.

Leave `googleClientId` empty and the app works exactly as it does now, with
everything kept on the device and the Drive panel explaining that it has not
been set up.

### A note on the privacy wording

With Drive saving off, the app tells the user their words never leave the
device. With it on, that sentence changes to say a copy goes to their own
Drive. Please keep that behaviour if you edit the text — it is the one claim
the app makes about their writing, and it should stay true.

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
| `drive.js` | the optional Google Drive saving |
| `config.js` | the Google client id for this copy — **edit this one** |
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
