# HANDOVER — r1_face

## 1. Project Overview
Animated character face ("Lepus") for the Rabbit R1 device, deployed as a Creations web app.

**Stack:** Vanilla JS, HTML5 Canvas 2D, no dependencies. `face.js` + `index.html`. Hosted on GitHub Pages from branch `claude/rabbit-r1-character-bW1I9`.

**URL:** `https://muadibbles.github.io/r1_face/`  
**Current version:** `v0.041`  
**Deploy:** Push to `claude/rabbit-r1-character-bW1I9` → GitHub Pages serves it automatically. R1 reloads on Creation reopen.

---

## 2. Architecture Summary

### face.js structure (top to bottom)
1. `EMOTION_DEFAULTS` — 6 emotions with all per-emotion params
2. `faceConfig` (from `window.faceConfig`) — global shape params + per-emotion overrides
3. `cfg` — merged live config
4. Migration block — upgrades old single-key params to new L/R split keys
5. `state` — live animation state (lookX/Y, blinkPhase, tiltX/Y, mouthOpen, etc.)
6. `emo` — current emotion with live interpolated values
7. `mouth` — speaking animation state `{ open, target, queue, holdTimer }`
8. `update(dt)` — per-frame logic: blink, look, mouth, speaking→idle detection
9. `drawBackground`, `drawEye`, `drawBrow`, `drawMouth`, `drawHUD`
10. `__faceDebug` — public API: `setEmotion`, `getEmotion`, `speakText`, `stopSpeaking`
11. Scroll wheel emotion cycling (`scrollUp` / `scrollDown`)
12. `LEPUS_PROMPT` — personality system prompt
13. `ON_R1` guard — voice pipeline only runs when `PluginMessageHandler` is defined
14. Voice pipeline (see §4 below)
15. Main `loop()` via `requestAnimationFrame`

### Emotions
`neutral`, `happy`, `attentive`, `thinking`, `tired`, `surprised`

Each has these per-emotion params:
- **Brows:** `browYOffsetL/R` (px above eye center, negative = higher), `browCurveL/R`, `browSpacing`, `browAngle`, `browXSpan`, `browThickness`
- **Mouth:** `mouthY`, `mouthWidth`, `mouthCurve`, `mouthAngle`, `mouthThickness`, `mouthOpenMax`

### Global config params (set once in faceConfig)
```
eyeRx, eyeRy, eyeOffsetY, eyeSpacing, eyeColor, eyeTilt
eyeRxOffsetL/R, eyeRyOffsetL/R   ← per-eye delta offsets
mouthColor, mouthInteriorColor
lookWaitMin/Max, lookSpeed, blinkIntervalMin/Max
```

---

## 3. What Was Built (since previous HANDOVER)

### Phase 1 — Eyebrow rework
- Brows now positioned in **eye-local space** then rotated by `eyeTilt` into canvas space — they follow eye rotation/position automatically
- **Per-side Y offset and curve:** `browYOffsetL/R`, `browCurveL/R` — independent per brow
- `browThickness: 0` hides brows entirely (early-return guard prevents canvas hairline artifact)
- Migration: old single `browYOffset`/`browCurve` keys auto-promoted to `L/R` on load

### Phase 2 — Per-eye shape offsets
- `eyeRxOffsetL/R`, `eyeRyOffsetL/R` — delta sliders in designer add on top of global `eyeRx/Ry`
- Allows independent eye sizing (e.g. lazy eye, asymmetric designs)

### Phase 3 — Mouth system
- `drawMouth()`: quadratic bezier arc; filled interior when `openH >= 0.5`
- `mouthThickness: 0` hides mouth (early-return guard, same pattern as brows)
- `mouthAngle` rotates the whole mouth
- `mouth` state object: `{ open, target, queue, holdTimer }`
- `speakText(text)`: splits words, schedules open/close at ~140wpm (430ms/word), vowel heuristic drives open amount
- `stopSpeaking()`: clears queue, target → 0
- Speaking → idle detection: when `mouth.queue` empty + `target === 0` + `open < 0.02`

### Phase 4 — Look suspension during speaking
- While `voiceState === 'speaking'`: eyes drift back to X=0 center, look state machine paused
- Normal look resumes when speaking ends

### Phase 5 — Personality: Lepus
```
Dry, deadpan, self-aware. Knows it's an AI on a Rabbit R1.
Conversational, not terse. Says what it means.
```
- `LEPUS_PROMPT` constant injected with current `emo.name` in every LLM call

### Phase 6 — LLM voice pipeline (ON_R1 only)
Full pipeline: PTT hold → record → STT → LLM → speak + animate

**voiceState:** `'idle'` | `'listening'` | `'processing'` | `'speaking'`  
**voiceStep:** `''` | `'webSpeech'` | `'stt'` | `'llm'` — sub-state shown in HUD

**Shared (both STT paths):**
- `sendToLLM(transcript)`: builds full message with LEPUS_PROMPT + emotion context, calls `PluginMessageHandler.postMessage({message, useLLM:true, wantsR1Response:true})`, sets 20s timeout guard
- `window.onPluginMessage(evt)`: parses `JSON.parse(evt.data).response || .message` → calls `speakText(reply)`, sets voiceState → `'speaking'`

**Primary STT — Web Speech API** (if `window.SpeechRecognition || window.webkitSpeechRecognition` exists):
- `longPressStart` → `recognition.start()` → `voiceState = 'listening'`
- `longPressEnd` → `recognition.stop()` → `voiceState = 'processing', voiceStep = 'webSpeech'`
- `recognition.onend` → sends transcript to `sendToLLM` or resets to idle
- **8s hard reset timer** set on `longPressEnd` — clears on `onend`/`onerror` — guards against recognition service being unreachable (R1 AOSP may not have Google speech servers)

**Fallback STT — MediaRecorder + Whisper** (if Web Speech API unavailable):
- `navigator.mediaDevices.getUserMedia({ audio: true })` → `MediaRecorder` → `audio/webm;codecs=opus`
- POSTs blob to `https://masatrad-whisper.hf.space/asr?output=txt&language=en`
- **Timeout:** `Promise.race([fetchP, 20s dead promise])` — more reliable than AbortController on some WebViews
- Warmup ping (GET, no-cors) to HuggingFace Space on page load

### Phase 7 — HUD improvements
- Version in lower-left: `v0.041`
- Emotion name + voiceTag in lower-right: e.g. `thinking · processing:llm`
- Status dot **upper-right** `(W-10, 10)` r=4: red = listening, amber = processing

### Phase 8 — Designer (designer.html)
- **Mouth accordion** (open by default): mouthY, mouthWidth, mouthCurve, mouthAngle, mouthThickness, mouthOpenMax
- **Per-emotion mouth switching** with buttons at top of accordion
- **"Speak test" button** calls `__faceDebug.speakText("Hello there, how are you?")`
- **Brow section:** browYOffsetL/R, browCurveL/R, browSpacing, browAngle, browXSpan, browThickness
- **Per-eye offsets section:** eyeRxOffsetL/R, eyeRyOffsetL/R delta sliders (±30px)
- **Export fix:** strips existing `faceConfig` blocks before injecting, so exports don't stack

---

## 4. Current Status

### Working on device
- Face renders, animates, blinks, looks around
- Scroll wheel (scrollUp/scrollDown) cycles emotions
- PTT (longPressStart/End) triggers voice pipeline
- voiceState transitions: idle → listening → processing → (speaking or idle)
- Status dot position correct (upper right)
- HUD sub-state labels working (`processing:webSpeech`, `processing:llm`, etc.)

### Active bug being debugged
**`processing:webSpeech` hangs** — Web Speech API is available in the R1 WebView (object exists) but `recognition.onend` never fires. Root cause likely: AOSP-based R1 doesn't have Google Play Services / Google speech recognition backend.

**Mitigation in place:** 8s hard reset timer prevents permanent hang. Face resets to neutral after 8s.

**Next debugging step:** ADB logcat to see console errors from the WebView. User has R1 plugged in. Need to install ADB:
```bash
sudo apt install adb        # Linux
brew install android-platform-tools  # Mac
```
Then:
```bash
adb devices                          # confirm device visible, accept prompt on R1
adb logcat | grep -i "chromium\|webview\|console\|speechrecog"
```

### Outstanding question
Does `wantsR1Response: true` in `PluginMessageHandler.postMessage` cause the LLM to call `window.onPluginMessage`, or does it only speak through the R1 speaker with no JS callback? Not yet confirmed because STT hasn't successfully produced a transcript yet.

---

## 5. Key API Facts

### R1 Creations API
| API | Notes |
|-----|-------|
| `PluginMessageHandler.postMessage(JSON.stringify({message, useLLM, wantsR1Response}))` | Sends to native R1 LLM |
| `window.onPluginMessage(evt)` | Callback — `JSON.parse(evt.data).response` or `.message` has the text |
| `window.addEventListener('longPressStart', fn)` | PTT press |
| `window.addEventListener('longPressEnd', fn)` | PTT release |
| `window.addEventListener('scrollUp', fn)` | Scroll wheel up |
| `window.addEventListener('scrollDown', fn)` | Scroll wheel down |
| `window.addEventListener('sideClick', fn)` | Side button (currently unused) |
| `window.creationSensors.accelerometer` | Tilt data |
| `creationStorage` | Persistent on-device storage (not yet used) |
| `const ON_R1 = typeof PluginMessageHandler !== 'undefined'` | Guard for desktop designer |

### Deployment
- Branch: `claude/rabbit-r1-character-bW1I9`
- GitHub Pages serves this branch automatically
- R1 loads from the Pages URL — no manual upload needed
- To update: push to branch → reload Creation on R1

---

## 6. File Map

| File | Purpose |
|------|---------|
| `face.js` | All animation + voice pipeline. Self-contained. |
| `index.html` | Shell: canvas + baked `window.faceConfig` block + `<script src="face.js?v=0.041">` |
| `designer.html` | Local design tool. Opens face in iframe, live sliders, export button. Never deployed to R1. |
| `llm_face_plan.md` | Original architecture plan (Phases 1–5). Partially executed. |
| `TODO.md` | Feature backlog |
| `HANDOVER.md` | This file |

---

## 7. Known Pitfalls

- **`clearTimeout` before `res.text()`** was a bug (now fixed) — timeout must stay active through the full body read, not just the headers
- **`onPluginMessage` data format** — argument is a MessageEvent-like object; text is in `JSON.parse(evt.data).response`, NOT `evt.message` or `evt.data` directly
- **`browThickness: 0` / `mouthThickness: 0`** — Canvas strokes at lineWidth=0 still render a hairline. Must early-return before calling `ctx.stroke()`.
- **Duplicate faceConfig blocks** — export used to append rather than replace. Fixed with regex strip before inject.
- **HuggingFace free tier Spaces sleep** after ~5 min idle. Warmup ping on load helps but doesn't fully solve it.
- **Web Speech API on R1 AOSP** — object exists in WebView but backend may be unreachable. Always add a hard reset timer.
- **GitHub Pages only serves one branch** — confirm Pages is configured for `claude/rabbit-r1-character-bW1I9` in repo Settings → Pages.

---

## 8. TODO (priority order)

1. **Fix STT** — ADB logcat to confirm Web Speech API error; if AOSP has no backend, detect and skip directly to Whisper fallback
2. **Confirm PluginMessageHandler LLM callback** — once STT works, verify `onPluginMessage` fires with the expected data format
3. **Brows dip ~10px during blink** — feels connected to same skin as eyes
4. **Single-file export** — inline `face.js` into `index.html` so no second fetch needed
5. **sideClick repurpose** — tap side button for something (voice mode toggle? debug?)
6. **Pupils** — dark iris/pupil inside each eye
7. **Eyelids** — visible lid shapes
8. **Conversation memory** — pass prior turns in LLM prompt
9. **System prompt designer control** — editable LEPUS_PROMPT in designer
10. **creationStorage** — persist conversation history across sessions

---

## 9. Session Log — 2026-04-02 (Mac, hotel WiFi)

### Context
Cloned repo to Mac (`/Users/sfillat/projects/r1_face`). R1 device connected via USB. Code was at v0.047 on remote (commits v0.043–v0.047 happened between the v0.041 HANDOVER above and this session — those added a diagnostic probe, R1 Creations Hacker Guide, and Whisper STT fixes).

### What we did
1. **Attempted USB debugging** — R1 has no accessible developer mode. Tried tapping r1OS version, model, IMEI 7 times — none triggered dev mode. `adb devices` and `fastboot devices` both empty. USB debugging appears locked down on R1.
2. **Removed Web Speech API path (v0.042 commit, rebased on v0.047)** — Web Speech API exists in the R1 WebView but `recognition.onend` never fires (AOSP has no Google speech backend). This left `voiceState` stuck in `'processing'` permanently, blocking all subsequent PTT presses. Deleted the entire Web Speech code path; STT now always uses MediaRecorder + HuggingFace Whisper.
3. **Pushed, regenerated QR, installed on R1.**
4. **New bug: `processing:stt` hangs forever** — Whisper endpoint (`masatrad-whisper.hf.space`) unreachable or extremely slow on hotel WiFi. The `Promise.race` 20s timeout doesn't appear to work in the R1 WebView either, so the state never resets to idle and PTT becomes permanently unresponsive.

### New pitfalls discovered
- **R1 has no accessible developer mode** — tapping build number / version / IMEI 7 times does nothing. ADB/fastboot not available without it.
- **Promise.race timeout unreliable on R1 WebView** — may not cancel/resolve properly. Need hard `setTimeout` reset as backup.
- **Hotel/restricted WiFi** — may block HuggingFace endpoints entirely. External STT is fragile dependency.

### Unresolved
- STT needs a hard `setTimeout` safety reset (like the old Web Speech 8s timer) so PTT never gets permanently stuck
- Need a more reliable STT approach — either a paid endpoint, R1-native capability, or skip STT entirely for testing the LLM pipeline
- `PluginMessageHandler` LLM callback still unconfirmed — STT has never successfully produced a transcript on-device
