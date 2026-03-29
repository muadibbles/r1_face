// face.js — R1 Face Character
// Designed for 240x282 display (Rabbit R1 Creations).
// v0.025

// ── Easing functions (exposed globally so designer.html can enumerate them) ──
window.FACE_EASINGS = {
  'Linear':            t => t,
  'Ease In':           t => t * t,
  'Ease Out':          t => t * (2 - t),
  'Ease In-Out':       t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t,
  'Ease In Cubic':     t => t * t * t,
  'Ease Out Cubic':    t => 1 - Math.pow(1 - t, 3),
  'Ease In-Out Cubic': t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2,
  'Ease Out Back':     t => { const c1 = 1.70158, c2 = c1 + 1; return 1 + c2 * Math.pow(t-1, 3) + c1 * Math.pow(t-1, 2); },
  'Bounce':            t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1/d1)   return n1 * t * t;
    if (t < 2/d1)   return n1 * (t -= 1.5/d1)  * t + 0.75;
    if (t < 2.5/d1) return n1 * (t -= 2.25/d1) * t + 0.9375;
    return                 n1 * (t -= 2.625/d1) * t + 0.984375;
  },
};

(function () {
  const E = window.FACE_EASINGS;

  const canvas = document.getElementById('face');
  const ctx    = canvas.getContext('2d');
  const W = 240, H = 282;
  const CX = W / 2, CY = H / 2 - 3;

  // ── Config ───────────────────────────────────────────────────────────
  const cfg = window.faceConfig = Object.assign({
    // Eyes
    eyeRx:      24,
    eyeRy:      27,
    eyeSpacing: 40,
    eyeOffsetY: 0,
    eyeTilt:    10,

    // Blink timing + easing
    blinkWaitMin:     2500,
    blinkWaitMax:     5500,
    blinkCloseEasing: 'Ease In',       // accelerates into closed
    blinkOpenEasing:  'Ease Out',      // decelerates as eye opens

    // Look timing + easing
    lookMax:         20,    // max px offset
    lookDurationMin: 150,   // ms for a glance move
    lookDurationMax: 600,
    lookWaitMin:     800,
    lookWaitMax:     3000,
    lookHoldMin:     400,
    lookHoldMax:     2200,
    lookEasing:      'Ease Out Cubic',

    // Accelerometer tilt
    tiltMaxX:   28,
    tiltMaxY:   18,
    tiltSmooth: 0.25,

    // Colors
    bgColor:  '#0d0d14',
    eyeColor: '#ffffff',
  }, window.faceConfig || {});

  // ── Blink profiles ───────────────────────────────────────────────────
  const BLINK_TYPES = [
    { close: 45,  hold: 30,  open: 70  },  // quick snap
    { close: 72,  hold: 52,  open: 115 },  // normal
    { close: 130, hold: 100, open: 180 },  // slow lazy
  ];

  // ── State ────────────────────────────────────────────────────────────
  const state = {
    // Blink — blinkRaw is raw linear 0→1; blink is the eased display value
    blinkRaw:   0,
    blink:      0,
    blinkPhase: 'idle',
    blinkWait:  rand(cfg.blinkWaitMin, cfg.blinkWaitMax),
    blinkHold:  0,
    blinkType:  null,

    // Look — time-based so easing is meaningful
    lookX:        0,
    lookStartX:   0,
    lookTargetX:  0,
    lookT:        0,   // normalized 0→1 progress through the current move
    lookDuration: 0,
    lookPhase:   'idle',
    lookWait:    rand(cfg.lookWaitMin, cfg.lookWaitMax),
    lookHold:    0,

    // Accelerometer
    tiltX: 0,
    tiltY: 0,
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  function rand(lo, hi)    { return lo + Math.random() * (hi - lo); }
  function randInt(lo, hi) { return Math.floor(rand(lo, hi + 1)); }
  function lerp(a, b, t)   { return a + (b - a) * t; }

  // Safe easing call — clamps t, falls back to linear
  function applyEase(name, t) {
    return (E[name] || E['Linear'])(Math.max(0, Math.min(1, t)));
  }

  function newLookTarget() {
    const m = cfg.lookMax;
    const positions = [0, 0, 0, -m * 0.5, m * 0.5, -m, m];
    let t;
    do { t = positions[randInt(0, positions.length - 1)]; }
    while (t === state.lookTargetX);
    state.lookStartX   = state.lookX;
    state.lookTargetX  = t;
    state.lookDuration = rand(cfg.lookDurationMin, cfg.lookDurationMax);
    state.lookT        = 0;
  }

  // ── Accelerometer ────────────────────────────────────────────────────
  async function initAccelerometer() {
    let attempts = 0;
    while (!window.creationSensors?.accelerometer) {
      if (++attempts > 50) return;
      await new Promise(r => setTimeout(r, 100));
    }
    const available = await window.creationSensors.accelerometer.isAvailable();
    if (!available) return;
    window.creationSensors.accelerometer.start((data) => {
      if (!data) return;
      state.tiltX += (data.tiltX * cfg.tiltMaxX - state.tiltX) * cfg.tiltSmooth;
      state.tiltY += (data.tiltY * cfg.tiltMaxY - state.tiltY) * cfg.tiltSmooth;
    }, { frequency: 30 });
  }

  initAccelerometer();

  // ── Update ───────────────────────────────────────────────────────────
  function update(dt) {

    // ── Blink ──────────────────────────────────────────────────────────
    switch (state.blinkPhase) {
      case 'idle':
        state.blinkWait -= dt;
        if (state.blinkWait <= 0) {
          state.blinkType  = BLINK_TYPES[randInt(0, BLINK_TYPES.length - 1)];
          state.blinkRaw   = 0;
          state.blinkPhase = 'closing';
        }
        break;

      case 'closing':
        state.blinkRaw = Math.min(1, state.blinkRaw + dt / state.blinkType.close);
        state.blink    = applyEase(cfg.blinkCloseEasing, state.blinkRaw);
        if (state.blinkRaw >= 1) {
          state.blink      = 1;
          state.blinkPhase = 'hold';
          state.blinkHold  = state.blinkType.hold;
        }
        break;

      case 'hold':
        state.blinkHold -= dt;
        if (state.blinkHold <= 0) {
          state.blinkRaw   = 0;
          state.blinkPhase = 'opening';
        }
        break;

      case 'opening':
        // blinkRaw 0→1 = opening progress; invert for display
        state.blinkRaw = Math.min(1, state.blinkRaw + dt / state.blinkType.open);
        state.blink    = 1 - applyEase(cfg.blinkOpenEasing, state.blinkRaw);
        if (state.blinkRaw >= 1) {
          state.blink      = 0;
          state.blinkPhase = 'idle';
          state.blinkWait  = rand(cfg.blinkWaitMin, cfg.blinkWaitMax);
        }
        break;
    }

    // ── Look ───────────────────────────────────────────────────────────
    switch (state.lookPhase) {
      case 'idle':
        state.lookWait -= dt;
        if (state.lookWait <= 0) { newLookTarget(); state.lookPhase = 'moving'; }
        break;

      case 'moving':
        state.lookT = Math.min(1, state.lookT + dt / state.lookDuration);
        state.lookX = lerp(state.lookStartX, state.lookTargetX, applyEase(cfg.lookEasing, state.lookT));
        if (state.lookT >= 1) {
          state.lookX     = state.lookTargetX;
          state.lookPhase = 'hold';
          state.lookHold  = rand(cfg.lookHoldMin, cfg.lookHoldMax);
        }
        break;

      case 'hold':
        state.lookHold -= dt;
        if (state.lookHold <= 0) {
          state.lookPhase = 'idle';
          state.lookWait  = rand(cfg.lookWaitMin, cfg.lookWaitMax);
        }
        break;
    }
  }

  // ── Render ───────────────────────────────────────────────────────────
  function drawBackground() {
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(0, 0, W, H);
  }

  function drawEye(side) {
    const ex   = CX + side * cfg.eyeSpacing;
    const ey   = CY + cfg.eyeOffsetY;
    const tilt = side * cfg.eyeTilt * Math.PI / 180;
    const ry   = cfg.eyeRy * (1 - state.blink);
    if (ry <= 0) return;

    ctx.save();
    ctx.translate(ex + state.lookX + state.tiltX, ey + state.tiltY);
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, cfg.eyeRx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = cfg.eyeColor;
    ctx.fill();
    ctx.restore();
  }

  const VERSION = 'v0.025';
  function drawVersion() {
    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = '#4a4a6a';
    ctx.fillText(VERSION, 4, H - 4);
    ctx.restore();
  }

  // ── Debug hooks (used by designer.html) ──────────────────────────────
  window.__faceDebug = {
    blink() {
      state.blinkType  = BLINK_TYPES[1];
      state.blinkRaw   = 0;
      state.blinkPhase = 'closing';
      state.blink      = 0;
    },
    look(x) {
      state.lookStartX   = state.lookX;
      state.lookTargetX  = x;
      state.lookDuration = 300;
      state.lookT        = 0;
      state.lookPhase    = 'moving';
    },
  };

  // ── Main loop ────────────────────────────────────────────────────────
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;
    update(dt);
    drawBackground();
    drawEye(-1);
    drawEye(1);
    drawVersion();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
