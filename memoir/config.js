/* Settings for whoever hosts this copy of the app.
   Saving to Google Drive is optional. Leave the client id empty and the app
   works exactly as before, with everything kept on the device.

   To switch Drive saving on for everyone who uses your copy:
     1. console.cloud.google.com → create a project
     2. APIs & Services → Library → enable "Google Drive API"
     3. APIs & Services → OAuth consent screen → External → add yourself
        (and anyone testing) under "Test users"
     4. Credentials → Create credentials → OAuth client ID → Web application
     5. Under "Authorised JavaScript origins" add the address the app is served
        from — the origin only, with no path. For the copy published from this
        repository that is exactly:
            https://perceptshun.github.io
     6. Paste the client id below.

   Anyone can also paste their own client id into Help → Save to Google Drive,
   without editing this file. */

window.MLS_CONFIG = {
  googleClientId: ''
};
