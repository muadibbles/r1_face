# R1 Creations API — Confirmed Findings (v0.044)

Probed on-device 2026-04-02 via diagnostic overlay.

## Device
- **OS:** Android 13 (r1 Build/TP1A.220624.014)
- **WebView:** Chrome/101.0.4951.61 (May 2022)
- **Screen:** 240x320 physical, dpr=2, canvas 240x282

## Window Globals (11)
| Global | typeof | Own Keys | Status |
|--------|--------|----------|--------|
| `PluginMessageHandler` | object | `postMessage(fn)` | **WORKS** — sends to LLM |
| `CreationVoiceHandler` | object | `postMessage(fn)` | **DEAD STUB** — accepts anything, no response, no sound |
| `FlutterButtonHandler` | object | `postMessage(fn)` | Dispatches button events to JS |
| `TouchEventHandler` | object | `postMessage(fn)` | Touch input bridge |
| `AccelerometerHandler` | object | `postMessage(fn)` | Motion bridge |
| `CreationStorageHandler` | object | `postMessage(fn)` | Native backing for creationStorage |
| `creationStorage` | object | `.plain`, `.secure` | **WORKS** — see below |
| `creationSensors` | object | `.accelerometer` | Has start/stop/isAvailable |
| `onPluginMessage` | function | — | Callback for LLM responses |
| `_creationStorageCallbacks` | — | — | Internal async plumbing |
| `_creationStorageCallbackId` | — | — | Internal async plumbing |

## CreationVoiceHandler — DEAD
Tested 16 payloads (TTS speak/say/tts, STT listen/record/recognize, ping/help/status/getCapabilities).
- All accepted silently (`OK, no throw`)
- Zero callbacks fired (tested 15 candidate callback names)
- No sound produced, no native UI appeared
- No responses via onPluginMessage
- **Conclusion:** Stub exists but is not wired to R1 voice engine. Do not use.

## creationStorage API
```js
creationStorage.plain.setItem(key, value)   // unencrypted
creationStorage.plain.getItem(key)
creationStorage.plain.removeItem(key)
creationStorage.plain.clear()

creationStorage.secure.setItem(key, value)  // encrypted
creationStorage.secure.getItem(key)
creationStorage.secure.removeItem(key)
creationStorage.secure.clear()
```
Async/callback-based internally (`_creationStorageCallbacks`).

## creationSensors.accelerometer
```js
creationSensors.accelerometer.start()
creationSensors.accelerometer.stop()
creationSensors.accelerometer.isAvailable()
```

## Events (dispatched by native side)
| Event | Trigger |
|-------|---------|
| `longPressStart` | PTT button press |
| `longPressEnd` | PTT button release |
| `scrollUp` | Scroll wheel up |
| `scrollDown` | Scroll wheel down |
| `sideClick` | Side button tap |

## Working Voice Pipeline
Since CreationVoiceHandler is dead, the pipeline must be:
1. **STT:** MediaRecorder (webm/opus) → POST to Whisper API (HuggingFace Space)
2. **LLM:** PluginMessageHandler.postMessage({message, useLLM:true, wantsR1Response:true})
3. **Response:** window.onPluginMessage(evt) → JSON.parse(evt.data).response
4. **TTS:** Mouth animation only (speakText). R1 native TTS via wantsR1Response:true (unconfirmed).

## Speech Recognition
- `webkitSpeechRecognition` exists but backend unreachable (AOSP, no Google Play Services)
- `MediaRecorder` and `MediaDevices` confirmed working
