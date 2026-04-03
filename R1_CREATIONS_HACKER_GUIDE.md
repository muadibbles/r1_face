# Rabbit R1 Creations — Unofficial Hacker Guide

> Reverse-engineered by probing the R1 WebView from a running Creation.
> Last updated: 2026-04-02. Firmware: Android 13 (r1 Build/TP1A.220624.014).

## What is a Creation?

A Creation is a web app that runs inside the R1's embedded WebView. You build it as a standard HTML/JS/CSS page, host it somewhere (GitHub Pages works), and the R1 loads it as a full-screen app. The R1 injects several JavaScript bridge objects into `window` that give you access to hardware buttons, the LLM, storage, sensors, and more.

## Device Specs

| Property | Value |
|----------|-------|
| OS | Android 13 (AOSP-based, no Google Play Services) |
| WebView | Chrome 101.0.4951.61 (May 2022) |
| Screen | 240x320 CSS pixels, `devicePixelRatio = 2` (480x640 physical) |
| Usable canvas | 240x282 (status bar takes ~38px) |
| User Agent | `Mozilla/5.0 (Linux; Android 13; r1 Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Mobile Safari/537.36` |

### Chrome 101 Limitations

This is a 2022 WebView. Some modern APIs may be missing or buggy:
- `AbortController` exists but may not reliably abort fetches — use `Promise.race` with a timeout instead
- `webkitSpeechRecognition` object exists but **does not work** (no Google speech backend on AOSP)
- `MediaRecorder` works with `audio/webm;codecs=opus`
- `navigator.mediaDevices.getUserMedia` works (mic access)
- Canvas 2D performs well at 60fps for simple animations
- No Web Bluetooth, no Web USB

## JavaScript Bridge Objects

The R1 native shell injects 11 globals into `window`. Every handler is an object with a single `postMessage(string)` method — they're Flutter-to-JS bridges.

### Input Events

The R1 dispatches custom DOM events for hardware buttons. Listen with `addEventListener`:

```js
// Push-to-talk button
window.addEventListener('longPressStart', () => { /* PTT pressed */ });
window.addEventListener('longPressEnd',   () => { /* PTT released */ });

// Scroll wheel (the orange dial)
window.addEventListener('scrollUp',   () => { /* wheel up */ });
window.addEventListener('scrollDown', () => { /* wheel down */ });

// Side button
window.addEventListener('sideClick', () => { /* side tap */ });
```

These are dispatched by `FlutterButtonHandler` on the native side. You don't need to interact with `FlutterButtonHandler` directly.

### TouchEventHandler

```js
window.TouchEventHandler  // object, own keys: postMessage(function)
```

Exists as a bridge but touch events also come through as standard DOM touch/pointer events on the canvas. You probably don't need to use this directly.

### LLM — PluginMessageHandler

Send a message to the R1's built-in LLM and get a response:

```js
// Send
PluginMessageHandler.postMessage(JSON.stringify({
  message:         "Your prompt here",
  useLLM:          true,
  wantsR1Response: true,   // R1 will also speak the response aloud
}));

// Receive
window.onPluginMessage = function(evt) {
  const parsed = JSON.parse(evt.data);
  const reply  = parsed.response || parsed.message || '';
  console.log('LLM said:', reply);
};
```

**Important notes:**
- `message` is the full prompt string (system + user combined)
- `useLLM: true` routes to the LLM (without it, unclear what happens)
- `wantsR1Response: true` — the R1 speaks the response through its speaker AND sends it back to `onPluginMessage`. If set to `false`, the R1 may still speak but the JS callback behavior is unconfirmed.
- Response arrives as `JSON.parse(evt.data).response` — always try `.response` first, then `.message`
- **Set a timeout guard** (20s recommended) — if the LLM call fails, `onPluginMessage` never fires
- `onPluginMessage` is a **property assignment**, not `addEventListener` — only one handler at a time

### Storage — creationStorage

Persistent key-value storage with two namespaces:

```js
// Unencrypted storage
creationStorage.plain.setItem('key', 'value');
creationStorage.plain.getItem('key');
creationStorage.plain.removeItem('key');
creationStorage.plain.clear();

// Encrypted storage (for sensitive data)
creationStorage.secure.setItem('key', 'value');
creationStorage.secure.getItem('key');
creationStorage.secure.removeItem('key');
creationStorage.secure.clear();
```

**Caution:** These may be async/callback-based internally (the bridge uses `_creationStorageCallbacks` and `_creationStorageCallbackId`). Test whether `getItem` returns synchronously or needs a callback/promise. `CreationStorageHandler.postMessage()` is the underlying native bridge — `creationStorage` is the JS wrapper.

### Sensors — creationSensors

```js
// Accelerometer
creationSensors.accelerometer.isAvailable();  // check support
creationSensors.accelerometer.start();         // begin streaming
creationSensors.accelerometer.stop();          // stop streaming
```

After calling `start()`, accelerometer data likely becomes available as properties on the accelerometer object or via events. Further probing needed to determine the exact data format (x/y/z properties or callback).

### CreationVoiceHandler — DEAD STUB

```js
window.CreationVoiceHandler  // object, postMessage(function)
```

**Do not use.** We sent 16 different message formats (TTS speak/say, STT listen/record/recognize, ping, getCapabilities, help, status). Every message was silently accepted, zero callbacks fired, no audio produced, no native UI appeared. It exists in the bridge but is not connected to anything on the native side.

### AccelerometerHandler

```js
window.AccelerometerHandler  // object, postMessage(function)
```

The native bridge backing `creationSensors.accelerometer`. Use the `creationSensors` wrapper instead.

### CreationStorageHandler

```js
window.CreationStorageHandler  // object, postMessage(function)
```

The native bridge backing `creationStorage`. Use the `creationStorage` wrapper instead.

## All Window Globals Injected by R1

```
AccelerometerHandler          — native bridge (use creationSensors instead)
CreationStorageHandler        — native bridge (use creationStorage instead)
CreationVoiceHandler          — DEAD STUB, do not use
FlutterButtonHandler          — dispatches button events, no direct use needed
PluginMessageHandler          — LLM bridge, use postMessage directly
TouchEventHandler             — touch bridge, standard DOM events work too
onPluginMessage               — LLM response callback (you overwrite this)
_creationStorageCallbacks     — internal async plumbing
_creationStorageCallbackId    — internal async plumbing
creationStorage               — persistent storage API (.plain / .secure)
creationSensors               — sensor access (.accelerometer)
```

## Speech / Voice

### Speech Recognition (STT)

`webkitSpeechRecognition` exists in the WebView but **does not function** — the R1 runs AOSP without Google Play Services, so there's no speech recognition backend. The object is there, `new webkitSpeechRecognition()` succeeds, but `recognition.start()` enters a state where `onend` never fires.

**Workaround:** Use `MediaRecorder` to capture audio, then send it to an external STT API:

```js
// Record audio
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
const chunks = [];
recorder.ondataavailable = e => chunks.push(e.data);
recorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  // Send to Whisper API, Deepgram, etc.
  const fd = new FormData();
  fd.append('audio_file', blob, 'audio.webm');
  const resp = await fetch('https://your-whisper-endpoint/asr?output=txt&language=en', {
    method: 'POST', body: fd
  });
  const transcript = await resp.text();
};
recorder.start();
// ... later:
recorder.stop();
stream.getTracks().forEach(t => t.stop());
```

**Supported MIME types** (tested on device): `audio/webm;codecs=opus` works. Use `MediaRecorder.isTypeSupported()` to check.

### Text-to-Speech (TTS)

The R1 will speak LLM responses aloud when `wantsR1Response: true` is set in the PluginMessageHandler message. There is no standalone TTS API available to Creations — `CreationVoiceHandler` is non-functional.

For visual speech animation without audio, you can animate a mouth shape based on the text content (vowel detection, word timing, etc.).

## Deployment

1. Host your Creation as a static website (GitHub Pages, Netlify, etc.)
2. In the Rabbit Hole (hole.rabbit.tech), create a new Creation and point it to your URL
3. On the R1, open the Creation — it loads in the WebView
4. To update: push changes to your host, then reopen the Creation on the R1 (it reloads)

**Cache busting:** Append `?v=X` to your script tags to force the WebView to load new versions:
```html
<script src="app.js?v=1.2"></script>
```

## Debugging

### ADB (recommended)

```bash
# macOS
brew install android-platform-tools

# Connect R1 via USB, accept debugging prompt on device
adb devices

# Capture WebView logs
adb logcat | grep -iE "chromium|webview|console|speech|plugin|creation"
```

### chrome://inspect

With the R1 connected via USB, open `chrome://inspect` in Chrome on your computer. If the WebView is debuggable, you get full DevTools (console, network, DOM inspector) on your running Creation.

### On-device debugging

Since you may not always have ADB access, render debug info directly on your canvas:

```js
// Guard for R1 vs desktop
const ON_R1 = typeof PluginMessageHandler !== 'undefined';

// Show state info on canvas
ctx.font = '10px monospace';
ctx.fillText('state: ' + myState, 4, canvasHeight - 4);
```

## Gotchas

1. **`onPluginMessage` is a property, not an event** — only one handler. If something overwrites it, your handler is gone.

2. **No error events from LLM** — if `PluginMessageHandler.postMessage` fails silently, `onPluginMessage` never fires. Always set a timeout guard.

3. **HuggingFace free Spaces sleep** after ~5 min idle. Send periodic warmup pings (every 4 min) if you depend on them for STT.

4. **Canvas strokes at `lineWidth = 0`** still render a hairline. Check and early-return before `ctx.stroke()`.

5. **`creationStorage` may be async** — the internal `_creationStorageCallbacks` mechanism suggests `getItem` might not return synchronously. Test on device.

6. **Screen size is fixed** — 240x320 at dpr=2. Design for this exact resolution. The status bar eats ~38px from the top.

7. **No `fetch` AbortController reliability** — use `Promise.race` with a timeout:
   ```js
   const result = await Promise.race([
     fetch(url).then(r => r.text()),
     new Promise(resolve => setTimeout(() => resolve(null), 20000))
   ]);
   ```

8. **All native bridges use the same pattern** — `Handler.postMessage(JSON.stringify({...}))`. Messages are always stringified JSON (or plain strings). Responses come through assigned window callbacks, not return values.

## Example: Minimal Creation

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=240, initial-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; }
    canvas { display: block; }
  </style>
</head>
<body>
<canvas id="c" width="240" height="282"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const ON_R1 = typeof PluginMessageHandler !== 'undefined';

  // Draw something
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 240, 282);
  ctx.fillStyle = '#eee';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hello R1!', 120, 141);

  // Listen for hardware events
  window.addEventListener('scrollUp',   () => console.log('scroll up'));
  window.addEventListener('scrollDown', () => console.log('scroll down'));
  window.addEventListener('sideClick',  () => console.log('side click'));

  // Talk to LLM
  if (ON_R1) {
    window.addEventListener('longPressStart', () => {
      PluginMessageHandler.postMessage(JSON.stringify({
        message: 'Tell me a joke',
        useLLM: true,
        wantsR1Response: true,
      }));
    });

    window.onPluginMessage = function(evt) {
      try {
        const reply = JSON.parse(evt.data).response;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 240, 282);
        ctx.fillStyle = '#eee';
        ctx.fillText(reply.slice(0, 30), 120, 141);
      } catch(e) {}
    };
  }
</script>
</body>
</html>
```

## What We Don't Know Yet

- Exact `creationStorage.getItem` return behavior (sync value? callback? promise?)
- Accelerometer data format after calling `start()` (properties? events? polling?)
- Whether `wantsR1Response: false` still triggers `onPluginMessage` (or gives silent LLM with no audio)
- Full list of valid `PluginMessageHandler` message fields beyond `message`, `useLLM`, `wantsR1Response`
- Whether `TouchEventHandler.postMessage` can simulate touch events
- Camera access (likely blocked in Creations WebView, untested)

---

*Contributions welcome. If you discover more about the R1 Creations API, please share your findings.*
