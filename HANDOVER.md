# HANDOVER — r1_face

## Session Date
2026-04-02 through 2026-04-04 (v0.042 → v0.053, 16 commits)

## What We Worked On

### 1. R1 Creations API Reverse Engineering (COMPLETE)
Built and iterated an on-device diagnostic probe overlay that enumerated all JavaScript bridge objects injected by the R1 native shell. Photographed the R1 screen to read results (no ADB access — device can't be put in dev mode).

**Discovered the complete R1 Creations API surface:**
- 6 native bridge handlers (all objects with `postMessage(function)`)
- `PluginMessageHandler` — LLM messaging (works)
- `CreationVoiceHandler` — dead stub (tested 16 payloads, zero response)
- `FlutterButtonHandler`, `TouchEventHandler`, `AccelerometerHandler`, `CreationStorageHandler`
- `creationStorage.plain` / `.secure` — localStorage-like API with `setItem/getItem/removeItem/clear`
- `creationSensors.accelerometer` — `start()/stop()/isAvailable()`
- Hardware events: `longPressStart/End`, `scrollUp/Down`, `sideClick`
- Device: Android 13, Chrome 101 WebView, 240x320 @ dpr=2

Published findings in `R1_API_FINDINGS.md` and `R1_CREATIONS_HACKER_GUIDE.md`.

### 2. Voice Pipeline Debugging (BLOCKED)
Attempted to build STT pipeline: MediaRecorder → Whisper API. Went through multiple iterations (v0.043–v0.052) fixing issues one by one:

- v0.043: Initial probe overlay
- v0.045: Robust Whisper pipeline with endpoint failover
- v0.046: Shorter timeouts, safety guard
- v0.047: Fixed recorder race condition (longPressEnd before getUserMedia resolved)
- v0.048: Pre-acquire mic on page load
- v0.049: Acquire mic on first PTT (user gesture required)
- v0.050: Handle PTT release during mic acquisition
- v0.051: Slimmed diagnostic overlay to pipeline log only
- v0.052: 8s timeout on getUserMedia

**Final finding: `getUserMedia` is permanently blocked on the R1 Creation WebView.** It hangs forever — never resolves, never rejects, no permission prompt shown. The R1 does not grant mic access to Creations.

### 3. Direct LLM Mode (v0.053, CURRENT)
Pivoted: PTT now sends a canned text prompt directly to `PluginMessageHandler` (bypassing mic entirely). This tests whether the LLM + TTS response pipeline works. **Not yet tested on device.**

### 4. Other Tasks
- Installed `ralph-claude-code` tooling and enabled it in the project
- Discussed Raspberry Pi Zero viability (too slow for 60fps Canvas)
- Started setting up Ralph Wiggum personality prompt (interrupted, not committed)

## What Worked and What Didn't

### Worked
- **On-device diagnostic probe**: Side button toggles overlay, scroll pages through data. Extremely effective for reverse engineering without ADB.
- **Photo-based debugging loop**: Slow but functional. Pipeline log with timestamps gave enough info to diagnose issues.
- **R1 API enumeration**: Successfully mapped the entire Creations JS bridge surface.
- **Canvas animation**: Runs at 60fps on the R1 with no issues.
- **Safety guards**: 30s/20s processing timeout prevents permanent hangs.

### Didn't Work
- **`getUserMedia`**: Permanently blocked. No permission prompt, hangs forever.
- **`webkitSpeechRecognition`**: Object exists but backend unreachable (AOSP, no Google Play Services).
- **`CreationVoiceHandler`**: Dead stub. 16 different message formats tested, zero response.
- **ADB debugging**: R1 can't be put in dev mode, so no real-time console access.
- **Pre-acquiring mic on page load**: Chrome 101 requires user gesture for `getUserMedia`.

## Key Decisions Made and Why

1. **Photo-based debugging over ADB**: Forced choice — R1 can't enter dev mode. Built diagnostic overlay that renders to canvas instead.

2. **Removed all mic/recording/Whisper code (v0.053)**: After confirming `getUserMedia` hangs forever, stripped 237 lines of dead code. Clean state to build from.

3. **Pivoted to canned prompts**: Fastest way to verify the LLM response pipeline works without mic access. Once confirmed, can explore alternative audio input methods.

4. **Published R1 Hacker Guide**: Community value — no one has documented the Creations API surface this thoroughly. Includes working code examples.

## Lessons Learned and Gotchas

1. **R1 Creation WebView does NOT grant mic permission.** `getUserMedia` hangs silently — no reject, no error, no prompt. This is the single biggest blocker.

2. **`getUserMedia` on Chrome 101 requires a user gesture.** Calling it at page load (v0.048) silently hung. Must be called from within a click/touch/button handler.

3. **All R1 native bridges use the same pattern**: `Handler.postMessage(JSON.stringify({...}))`. Fire-and-forget. Responses (if any) come through `window.onPluginMessage`.

4. **`onPluginMessage` is a property, not addEventListener.** Only one handler at a time. Easy to accidentally overwrite.

5. **`CreationVoiceHandler` is completely non-functional.** Don't waste time on it.

6. **The R1 WebView is Chrome 101 (May 2022).** Many modern APIs are missing or buggy. Use `Promise.race` instead of `AbortController` for timeouts.

7. **`creationStorage` is NOT synchronous localStorage.** It has `.plain` and `.secure` sub-objects with `setItem/getItem/removeItem/clear`. Internally uses async callbacks (`_creationStorageCallbacks`).

8. **Photo Booth on macOS uses non-breaking spaces in filenames.** `cp` commands fail with normal quoting. Use `find -exec cp` to work around it.

## Clear Next Steps (Prioritized)

### P0: Test LLM Pipeline (v0.053)
- [ ] Reload Creation on R1, press PTT, check if `PluginMessageHandler` delivers a response via `onPluginMessage`
- [ ] Check if `wantsR1Response: true` makes the R1 speak the response aloud
- [ ] Check pipeline log for `onPM fired!` and LLM response text

### P1: Solve Audio Input
Once LLM pipeline is confirmed working, explore alternatives to `getUserMedia`:
- [ ] **Local proxy server on Mac**: R1 hits `http://mac-ip:port/record` via WiFi, Mac captures audio, transcribes via Whisper, returns text. R1 sends to LLM.
- [ ] **Explore `PluginMessageHandler` message fields**: Maybe there's a field that tells the R1 to capture audio natively and return the transcript
- [ ] **Test if `CreationVoiceHandler` needs a specific firmware version** — check for R1 firmware updates

### P2: Features
- [ ] `creationStorage` for conversation persistence
- [ ] Accelerometer for tilt-reactive face
- [ ] Scroll wheel prompt selection UI (visual indicator)
- [ ] Ralph Wiggum personality (prompt was started but not committed)

### P3: Documentation
- [ ] Update `R1_CREATIONS_HACKER_GUIDE.md` with `getUserMedia` blocked finding
- [ ] Share guide with R1 community (Reddit, Discord)

## Key Files Touched

| File | Status | Description |
|------|--------|-------------|
| `face.js` | Modified (heavily) | Main app — diagnostic probe, voice pipeline iterations, direct LLM mode |
| `index.html` | Modified | Cache-bust version bumps (v0.042 → v0.053) |
| `R1_CREATIONS_HACKER_GUIDE.md` | **Created** | Community-facing reverse-engineered API reference |
| `R1_API_FINDINGS.md` | **Created** | Raw research data from on-device probing |
| `R1_RESEARCH_PLAN.md` | **Created** | 5-step ecosystem research strategy |
| `scripts/adb_capture.sh` | **Created** | ADB logcat capture script (unused — no dev mode) |
| `HANDOVER-2026-04-02.md` | Renamed | Previous handover archived |
| `.ralph/` | **Created** | Ralph autonomous dev tool config |
| `.ralphrc` | **Created** | Ralph project config |

## Current State
- **Version**: v0.053
- **Branch**: `claude/rabbit-r1-character-bW1I9`
- **Face animation**: Working perfectly at 60fps
- **LLM pipeline**: Code in place, untested on device (just deployed)
- **Voice input**: Removed. `getUserMedia` blocked on R1.
- **Diagnostic overlay**: Side button toggles. Shows status + pipeline log only.
- **Deployment**: GitHub Pages, auto-deploys on push
