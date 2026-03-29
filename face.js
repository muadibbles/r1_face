// face.js — R1 Face Character
// Designed for 640x480 display.
// Phase 1: blink + look-around idle animation.

(function () {
  const canvas = document.getElementById('face');
  const ctx    = canvas.getContext('2d');
  const W = 240, H = 282;

  // ── Layout ──────────────────────────────────────────────────────────
  const CX = W / 2;
  const CY = H / 2 - 3;

  const EYES = [
    { cx: CX - 40, cy: CY },  // left
    { cx: CX + 40, cy: CY },  // right
  ];

  // Eye geometry — slightly taller than wide
  const EYE_RX = 24;  // eye horizontal radius
  const EYE_RY = 27;  // eye vertical radius (taller)

  // ── Colors ──────────────────────────────────────────────────────────
  const C = {
    bg:  '#0d0d14',
    eye: '#ffffff',
    lid: '#0d0d14',
  };

  // ── Blink types ─────────────────────────────────────────────────────
  // Three distinct profiles: quick snap, normal, slow lazy
  const BLINK_TYPES = [
    { close: 45,  hold: 30,  open: 70  },   // quick snap
    { close: 72,  hold: 52,  open: 115 },   // normal
    { close: 130, hold: 100, open: 180 },   // slow lazy
  ];

  // ── State ────────────────────────────────────────────────────────────
  const state = {
    // Blink  — 0 = fully open, 1 = fully closed
    blink: 0,
    blinkPhase: 'idle',   // 'idle' | 'closing' | 'hold' | 'opening'
    blinkWait:  randBetween(2500, 5000),
    blinkHold:  0,
    blinkType:  null,     // active blink profile

    // Look-around — idle wander offset
    lookX: 0,            // current offset applied to both eye positions
    lookY: 0,
    lookTargetX: 0,
    lookSpeed: 0,        // px/ms
    lookPhase: 'idle',   // 'idle' | 'moving' | 'hold'
    lookWait:  randBetween(1500, 4000),
    lookHold:  0,

    // Tilt — accelerometer-driven offset, blended on top of look
    tiltX: 0,            // smoothed tilt contribution (px)
    tiltY: 0,
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  function randBetween(lo, hi) { return lo + Math.random() * (hi - lo); }
  function randInt(lo, hi)     { return Math.floor(randBetween(lo, hi + 1)); }

  // Possible look positions: center, slight left/right, far left/right
  const LOOK_POSITIONS = [0, 0, 0, -10, 10, -20, 20];  // weighted toward center

  function newLookTarget() {
    // Pick a target that's different from the current one
    let target;
    do { target = LOOK_POSITIONS[randInt(0, LOOK_POSITIONS.length - 1)]; }
    while (target === state.lookTargetX);
    state.lookTargetX = target;
    state.lookSpeed   = randBetween(0.2, 0.9);  // px/ms — snappy vs lazy
  }

  // ── Accelerometer ────────────────────────────────────────────────────
  // Max pixel offset the tilt can push the eyes
  const TILT_MAX_X = 18;
  const TILT_MAX_Y = 12;
  // Smoothing factor per frame — lower = smoother/slower response (0–1)
  const TILT_SMOOTH = 0.12;

  async function initAccelerometer() {
    if (!window.creationSensors?.accelerometer) return;  // not on R1, skip

    const available = await window.creationSensors.accelerometer.isAvailable();
    if (!available) return;

    window.creationSensors.accelerometer.start((data) => {
      if (!data) return;
      // tiltX: +1 = right, -1 = left  →  eyes shift right/left
      // tiltY: +1 = forward, -1 = back →  eyes shift down/up
      const targetX =  data.tiltX * TILT_MAX_X;
      const targetY =  data.tiltY * TILT_MAX_Y;

      // Smooth toward target each callback (exponential moving average)
      state.tiltX += (targetX - state.tiltX) * TILT_SMOOTH;
      state.tiltY += (targetY - state.tiltY) * TILT_SMOOTH;
    }, { frequency: 30 });
  }

  initAccelerometer();

  // ── Update ───────────────────────────────────────────────────────────
  function update(dt) {

    // ── Blink state machine ──────────────────────────────────────────
    switch (state.blinkPhase) {
      case 'idle':
        state.blinkWait -= dt;
        if (state.blinkWait <= 0) {
          state.blinkType  = BLINK_TYPES[randInt(0, BLINK_TYPES.length - 1)];
          state.blinkPhase = 'closing';
        }
        break;

      case 'closing':
        state.blink = Math.min(1, state.blink + dt / state.blinkType.close);
        if (state.blink >= 1) {
          state.blinkPhase = 'hold';
          state.blinkHold  = state.blinkType.hold;
        }
        break;

      case 'hold':
        state.blinkHold -= dt;
        if (state.blinkHold <= 0) state.blinkPhase = 'opening';
        break;

      case 'opening':
        state.blink = Math.max(0, state.blink - dt / state.blinkType.open);
        if (state.blink <= 0) {
          state.blinkPhase = 'idle';
          state.blinkWait  = randBetween(2500, 5500);
        }
        break;
    }

    // ── Look-around state machine ────────────────────────────────────
    switch (state.lookPhase) {
      case 'idle':
        state.lookWait -= dt;
        if (state.lookWait <= 0) {
          newLookTarget();
          state.lookPhase = 'moving';
        }
        break;

      case 'moving': {
        const dx   = state.lookTargetX - state.lookX;
        const step = state.lookSpeed * dt;
        if (Math.abs(dx) <= step) {
          state.lookX     = state.lookTargetX;
          state.lookPhase = 'hold';
          state.lookHold  = randBetween(400, 2200);
        } else {
          state.lookX += Math.sign(dx) * step;
        }
        // lookY stays 0 for idle wander — tilt handles vertical
        break;
      }

      case 'hold':
        state.lookHold -= dt;
        if (state.lookHold <= 0) {
          state.lookPhase = 'idle';
          state.lookWait  = randBetween(800, 3000);
        }
        break;
    }
  }

  // ── Render ───────────────────────────────────────────────────────────
  function drawBackground() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
  }

  function drawEye(eye) {
    const { cx, cy } = eye;
    const blink = state.blink;

    ctx.save();
    // Combine idle look-around with accelerometer tilt
    ctx.translate(cx + state.lookX + state.tiltX, cy + state.lookY + state.tiltY);

    // Clip to eye shape so eyelid edges follow the ellipse
    ctx.beginPath();
    ctx.ellipse(0, 0, EYE_RX, EYE_RY, 0, 0, Math.PI * 2);
    ctx.clip();

    // White fill
    ctx.fillStyle = C.eye;
    ctx.beginPath();
    ctx.ellipse(0, 0, EYE_RX, EYE_RY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyelids
    if (blink > 0) {
      const upperH = blink * (EYE_RY * 2.15);
      ctx.fillStyle = C.lid;
      ctx.fillRect(-EYE_RX, -EYE_RY - 1, EYE_RX * 2, upperH);

      const lowerH = blink * (EYE_RY * 0.40);
      ctx.fillStyle = C.lid;
      ctx.fillRect(-EYE_RX, EYE_RY - lowerH, EYE_RX * 2, lowerH + 2);
    }

    ctx.restore();
  }

  // ── Debug overlay ────────────────────────────────────────────────────
  let debugOpen = false;

  // Hit region for the toggle (x button or state text block)
  const DEBUG_X = 4, DEBUG_Y = H - 16, DEBUG_W = 10, DEBUG_H = 10;

  canvas.addEventListener('click', function (e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (!debugOpen) {
      // Check if click is on the small x
      if (mx >= DEBUG_X && mx <= DEBUG_X + DEBUG_W &&
          my >= DEBUG_Y && my <= DEBUG_Y + DEBUG_H) {
        debugOpen = true;
      }
    } else {
      // Any click while open closes it
      debugOpen = false;
    }
  });

  function drawDebug() {
    if (!debugOpen) {
      // Draw small dark x in lower left
      ctx.save();
      ctx.font = '12px monospace';
      ctx.fillStyle = '#333355';
      ctx.fillText('×', DEBUG_X, DEBUG_Y + DEBUG_H - 2);
      ctx.restore();
      return;
    }

    // Current phase only
    const lines = [
      `blink: ${state.blinkPhase}`,
      `look:  ${state.lookPhase}`,
      `tilt:  ${state.tiltX.toFixed(1)}, ${state.tiltY.toFixed(1)}`,
    ];

    const lh = 14;  // line height
    const pad = 6;
    const bw = 180, bh = lines.length * lh + pad * 2;
    const bx = 8, by = H - bh - 8;

    // Background panel
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx, by, bw, bh);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#445566';
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + pad, by + pad + (i + 1) * lh - 2);
    });
    ctx.restore();
  }

  // ── Main loop ────────────────────────────────────────────────────────
  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min(now - lastTime, 50);  // cap at 50ms to avoid jumps on tab resume
    lastTime = now;

    update(dt);
    drawBackground();
    EYES.forEach(drawEye);
    drawDebug();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
