# Grey Red shared preset API

`functions/api/grey-red-presets.js` is a Cloudflare Pages Function for the synth's shared online preset vault.

To make presets global, bind a Cloudflare KV namespace named `GREY_RED_PRESETS` to the Pages project. The browser will call `/api/grey-red-presets` to read and share presets. If that API is unavailable, the synth falls back to browser-local saves.
