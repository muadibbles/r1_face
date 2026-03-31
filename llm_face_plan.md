# R1 Face — Voice Integration Plan

## Overview

Wire the animated face character to the R1's native LLM using `PluginMessageHandler`,
`MediaRecorder`, and the free Whisper STT endpoint. No backend server, no API keys,
no LiveKit required. The result: hold PTT → face listens → face thinks → R1 speaks
while the mouth animates → face returns to idle.

---

## Architecture

```
User holds PTT (longPressStart)
  → face: attentive expression
  → MediaRecorder starts capturing mic audio

User releases PTT (longPressEnd)
  → face: thinking expression
  → MediaRecorder stops → audio blob sent to Whisper STT (free, no key)
  → transcript returned

Transcript sent to PluginMessageHandler (useLLM: true, wantsR1Response: true)
  → R1 processes with its native LLM
  → R1 begins speaking through its speaker

onPluginMessage fires with response text
  → face: speaking expression
  → mouth animation driven by text timing (word-rate scheduling)
  → when animation completes → face: neutral

Scroll wheel (scrollUp / scrollDown)
  → cycle through emotions manually
  → or control volume (TBD)

sideClick (tap, not hold)
  → toggle some secondary UI / debug mode (TBD)
```

---

## Phase 1 — Mouth (prerequisite, no voice needed)

Build the mouth as a standalone face feature before wiring any voice logic.
The mouth must exist before it can animate.

### 1a. Mouth rendering in face.js
- Add mouth draw function: quadratic bezier arc (same approach as brows)
- Mouth params per emotion (stored in `cfg.emotions[name]`):
  - `mouthY`        — vertical offset from face center (px)
  - `mouthWidth`    — half-span of arc (px)
  - `mouthCurve`    — arc peak height (pos = smile, neg = frown)
  - `mouthOpen`     — 0–1, how far mouth opens vertically (for speaking)
  - `mouthThickness`— stroke width (px); 0 = hidden
- Mouth follows look X and tilt X/Y (same as brows)
- `mouthOpen` is a separate animated state (not part of emotion interpolation)
  driven by the voice system; emotion sets resting shape only

### 1b. Default mouth values per emotion
- neutral:   closed, slight curve (subtle), hidden or thin
- attentive: slightly open, neutral curve
- happy:     wide smile, mouthOpen = 0 at rest
- surprised: round/open, mouthOpen = 0.4
- thinking:  slight asymmetric purse (mouthCurve slightly off-center via angle?)
- tired:     slight frown, mouthOpen = 0
- speaking:  driven dynamically; base shape from current emotion

### 1c. Designer controls
- Add Mouth accordion to right panel (closed by default)
- Per-emotion mouth sliders: Y, Width, Curve, Thickness
  (same pattern as Brow accordion with emotion switcher)
- Global `mouthOpen` live slider for preview/testing
- mouthThickness min = 0 (hidden, same fix as brows)

### 1d. Speaking animation state in face.js
- `state.mouthOpen` — 0–1, animates independently of emotion system
- `state.mouthPhase` — 'idle' | 'speaking'
- Text-timing driver function: `speakText(text)`
  - Splits text into words
  - Schedules open/close per word at ~140 wpm (~430ms per word)
  - Vowel-heavy words → wider open (simple heuristic: count vowels)
  - Runs via existing `update(dt)` loop
- `stopSpeaking()` — ramp mouth closed

---

## Phase 2 — PTT + STT

Wire the physical PTT button to mic recording and transcription.
No LLM yet — just confirm audio capture and transcription work.

### 2a. PTT event handlers
```javascript
window.addEventListener('longPressStart', onPTTStart);
window.addEventListener('longPressEnd',   onPTTEnd);
```

### 2b. Mic recording
```javascript
// On longPressStart:
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
recorder.start();
window.__faceDebug.setEmotion('attentive');

// On longPressEnd:
recorder.stop();  // triggers ondataavailable
window.__faceDebug.setEmotion('thinking');
```

### 2c. Whisper STT
```javascript
// Free endpoint — no API key required
const fd = new FormData();
fd.append('audio_file', audioBlob, 'audio.webm');
const transcript = await fetch(
  'https://masatrad-whisper.hf.space/asr?output=txt&language=en',
  { method: 'POST', body: fd }
).then(r => r.text());
```

### 2d. HTTPS requirement
- `navigator.mediaDevices` is undefined over HTTP
- Deployment must be via `rabbit.tech/creations` (HTTPS) or another HTTPS host
- Designer runs on localhost (no mic) — PTT/voice code only runs on R1

### 2e. Guard for desktop (designer safety)
```javascript
const ON_R1 = typeof PluginMessageHandler !== 'undefined';
// Only init voice pipeline if ON_R1
```

---

## Phase 3 — LLM integration

Send transcript to the R1's native LLM and get a spoken response.

### 3a. PluginMessageHandler call
```javascript
PluginMessageHandler.postMessage(JSON.stringify({
  message: transcript,
  useLLM: true,
  wantsR1Response: true   // R1 speaks through its speaker
}));
```

### 3b. Response handler
```javascript
window.onPluginMessage = function(data) {
  const reply = data.message || data.data;
  if (!reply) return;
  window.__faceDebug.setEmotion('neutral');  // or speaking-specific emotion
  speakText(reply);   // drive mouth animation from text timing
};
```

### 3c. State machine
```
idle
  → longPressStart → listening (attentive)
  → longPressEnd   → processing (thinking) [STT running]
  → STT done       → waiting (thinking) [LLM running]
  → onPluginMessage → speaking [mouth animating]
  → animation done  → idle (neutral)
```

### 3d. Error handling
- STT timeout (Whisper endpoint down) → back to neutral, no LLM call
- Empty transcript → back to neutral
- No onPluginMessage within 15s → back to neutral (timeout guard)

---

## Phase 4 — Scroll wheel

Now that scroll events are confirmed available, wire them to something useful.

### Option A — Emotion select (consistent with current sideClick behavior)
```javascript
window.addEventListener('scrollUp',   () => cycleEmotion(+1));
window.addEventListener('scrollDown', () => cycleEmotion(-1));
```

### Option B — Volume control
- Display a volume HUD element briefly on scroll
- Adjust `el.volume` on any playing audio elements

### Option C — Mode toggle
- First decide what modes exist (voice on/off, debug, etc.)

**Decision needed from user before implementing.**

---

## Phase 5 — Polish

### 5a. Conversation context
- Keep last N turns in memory
- Prepend to each LLM message as context:
  ```
  [Previous conversation:
  User: ...
  Assistant: ...
  ]
  Current message: ...
  ```
- Store conversation in `creationStorage` so it persists between sessions

### 5b. System prompt / personality

**Character:** Lepus
**Tone:** Deadpan — dry, matter-of-fact, not trying to be funny but often is
**Self-awareness:** Fully aware it's an AI face living on a Rabbit R1 device
**Verbosity:** Conversational — engages naturally, not clipped one-liners, not lectures

**Draft system prompt (static portion):**
```
You are Lepus, an AI assistant who lives as an animated face on a Rabbit R1 device.
You are aware that you are an AI, that you have a face with eyes and a mouth,
and that you exist on a small orange handheld device. You have a dry, deadpan
personality — you say what you mean, you don't perform enthusiasm you don't feel,
and you find the world mildly but genuinely interesting. You're conversational
and engaged, not terse. Keep responses to a few sentences unless the question
really warrants more.
```

**Dynamic context injected per message:**
```
Your face is currently expressing: {emotion}
```

Each call to PluginMessageHandler includes the current `emo.name` so Lepus can
reference or play off its own expression if relevant. Example: if `emo.name`
is "tired" and someone asks how it's doing, Lepus might acknowledge it looks
tired. If "thinking," it might note it's visibly mulling something over.

Implementation in Phase 3:
```javascript
const systemPrompt = `You are Lepus... (static)`;
const emotionContext = `Your face is currently expressing: ${window.__faceDebug.getEmotion()}`;
const fullMessage = `${systemPrompt}\n${emotionContext}\n\nUser: ${transcript}`;

PluginMessageHandler.postMessage(JSON.stringify({
  message: fullMessage,
  useLLM: true,
  wantsR1Response: true,
}));
```

- System prompt editable via designer control (Phase 5)

### 5c. Audio amplitude mouth sync (enhancement)
- If we add our own TTS instead of `wantsR1Response: true`:
  - Call an external TTS API, get audio blob
  - Play via Web Audio API
  - Connect AnalyserNode → `getByteFrequencyData()` each frame → `state.mouthOpen`
  - Real amplitude sync instead of text timing
- Requires TTS API key and internet — optional enhancement

### 5d. Camera face tracking (future)
- `getUserMedia({ video: { facingMode: 'environment' } })`
- Capture frame periodically, detect face position
- Map face X/Y to `lookTargetX` / eye shift
- Needs face detection library or periodic Whisper-style endpoint call

---

## File Changes Summary

| File | Changes |
|------|---------|
| `face.js` | Mouth draw, mouth animation state, speakText(), PTT handlers, PluginMessageHandler, ON_R1 guard |
| `designer.html` | Mouth accordion, per-emotion mouth sliders, mouthOpen preview slider, version bump |
| `index.html` | Add mouth defaults to baked config |
| `TODO.md` | Mark completed items as work progresses |
| `PLAN.md` | This file — update as decisions are made |

---

## Open Decisions

1. **Scroll wheel** — ✅ emotion cycle (scrollUp/scrollDown)
2. **sideClick** — ✅ repurpose (TBD exact function)
3. **Personality / system prompt** — ✅ decided:
   - Name: **Lepus**
   - Tone: deadpan
   - Self-aware: knows it's an AI, knows it lives on a Rabbit R1
   - Verbosity: conversational (not brief, not verbose — natural back-and-forth)
   - System prompt draft (§5b below)
4. **TTS** — ✅ `wantsR1Response: true` (R1 speaks, text-timing mouth) to start
5. **Conversation memory** — how many turns? persist across sessions?

---

## Version Targets

- v0.034 — Mouth rendering + designer controls
- v0.035 — Speaking animation (text timing) + speakText() API
- v0.036 — PTT + STT (Whisper)
- v0.037 — PluginMessageHandler LLM integration
- v0.038 — Scroll wheel
- v0.039 — Conversation context + system prompt
- v0.040 — Polish + stability
