# HANDOVER — r1_face

## 1. Project Overview
Animated character face (two blinking, looking eyes) for the Rabbit R1 device, deployed as a Creations web app.

**Stack:** Vanilla JS, HTML5 Canvas 2D, no dependencies. Single-file animation loop (`face.js`) + `index.html`. Hosted on GitHub Pages.

---

## 2. What We Did This Session

- Cloned `muadibbles/r1_face` (branch `claude/rabbit-r1-character-bW1I9`) into `C:/Users/filla/projects/r1_face`
- **Eye geometry:** Made eyes taller than wide (`EYE_RX=24`, `EYE_RY=27` at 240×282 scale)
- **3 blink types** added: quick snap (45/30/70ms), normal (72/52/115ms), slow lazy (130/100/180ms) — picked randomly each blink
- **Look-around state machine:** Both eyes shift together on X axis; idle wander with random targets from `LOOK_POSITIONS = [0,0,0,-10,10,-20,20]` (weighted center)
- **Removed iris/pupil** — replaced dart-within-eye with whole-eye translation
- **Slowed look transitions** 50% (`lookSpeed` range `0.2–0.9 px/ms`)
- **Resized canvas** from 640×480 → 240×282 for R1 Creations screen, scaled all geometry proportionally
- **GitHub Pages** enabled on `claude/rabbit-r1-character-bW1I9` branch → `https://muadibbles.github.io/r1_face/`
- **QR code** generated (`r1_face_qr.png`) with correct Creations JSON payload format: `{title, url, description, iconUrl, themeColor}` — NOT a plain URL
- **Accelerometer tilt:** Eyes shift in direction device is tilted using `window.creationSensors.accelerometer` API. Tiltx/Y blended additively on top of idle look. Retry loop added (polls every 100ms up to 5s) because API may not be injected at page load.
- **Version display:** Small `v0.022` in lower-left corner (`11px monospace`, color `#4a4a6a`)
- **Cache-busting:** `face.js?v=0.022` in script tag; QR URL uses `?v=022` param to force R1 fresh install
- **TODO.md** created with all planned features

**Files modified:** `face.js`, `index.html`, `TODO.md`, `r1_face_qr.png`

---

## 3. Current State

**Working:**
- Blinking (3 random profiles), look-around idle, accelerometer tilt — all confirmed working on device at v0.022
- GitHub Pages live at `https://muadibbles.github.io/r1_face/`
- Cache-busting via QR URL versioning (`?v=022`) confirmed to force fresh install

**Known issues / incomplete:**
- Accelerometer tilt field names assumed to be `data.tiltX` / `data.tiltY` based on SDK docs — confirmed working but worth noting if behavior breaks after an OS update
- No vertical component in idle look-around (only X wander); tiltY handles vertical only via accelerometer

---

## 4. Key Decisions & Rationale

- **Whole-eye translation vs iris/pupil:** Removed iris/pupil — the R1 face is stylized/minimal; moving the whole eye looks cleaner at small scale
- **Additive tilt + idle look:** Tilt offset (`state.tiltX/Y`) adds on top of idle look (`state.lookX`) rather than replacing it — keeps character feeling alive even when held still
- **Retry loop for accelerometer init:** `window.creationSensors` is injected by the R1 WebView after page load, not synchronously — a plain `if (!window.creationSensors) return` silently failed
- **QR code format:** R1 Creations requires `JSON.stringify({title,url,description,iconUrl,themeColor})` as QR data — plain URL QR codes are rejected by the device
- **Cache busting via QR URL versioning:** R1 caches at the creation install level; cache-control meta tags and script query strings alone don't help — the install URL itself must change

---

## 5. Pitfalls & Lessons Learned

- **Plain URL QR = invalid** on R1. Always use the JSON payload format.
- **R1 caches aggressively** — reinstalling doesn't help unless the QR URL itself is different. Always bump `?v=` in both the script tag and the QR install URL together.
- **`window.creationSensors` is async-injected** — always use the retry loop pattern, not a synchronous check.
- **GitHub Pages serves the right content** but the R1 may still show old version — check Pages with `curl` before debugging the device.
- **Write tool was blocked** early in session (user permission mode) — use `Edit` for targeted changes to existing files instead of full rewrites.

---

## 6. Next Steps (from TODO.md, in priority order)

1. **PTT button** (`window.addEventListener('sideClick', ...)`) — trigger attentive/listening expression on press
2. **Smooth ease-in/out** on look transitions — replace linear `Math.sign(dx) * step` with an easing curve
3. **Squint** — compress `EYE_RY` slightly on a timer for suspicion/thinking idle variation
4. **Eyebrows** — arc shapes above eyes that raise/furrow/angle; adds a lot of expressiveness
5. **Double-blink** — two quick blinks back to back (occasional)
6. **Asymmetric blinks** — right eye delayed ~20ms behind left for organic feel
7. **Wide eyes** — brief `EYE_RY` expansion when startled (could hook to PTT long press)
8. **Eyelash fringe** — short lines along ellipse curve at lid edge
9. **Eye gloss** — small white arc highlight inside eye
10. **R1 state reactivity** — respond to thinking/speaking/idle states (requires Rabbit API research)

**To deploy any update:**
1. Edit `face.js` and bump version string in comment + `VERSION` constant
2. Update `?v=` query string in `index.html` script tag to match
3. `git add . && git commit && git push`
4. Regenerate `r1_face_qr.png` with new `?v=` in the URL using the Python snippet in this session
5. Scan new QR on R1 to install fresh
