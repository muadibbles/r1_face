// face.js — R1 Face Character
// Designed for 240x282 display (Rabbit R1 Creations).
// v0.024

(function () {
  const canvas = document.getElementById('face');
  const ctx    = canvas.getContext('2d');
  const W = 240, H = 282;
  const CX = W / 2, CY = H / 2 - 3;

  // ── Config ───────────────────────────────────────────────────────────
  // All tweakable values live here. designer.html writes to window.faceConfig
  // before this script loads; any missing keys fall back to these defaults.
  const cfg = window.faceConfig = Object.assign({
    // Eyes
    eyeRx:      24,   // horizontal radius (px)
    eyeRy:      27,   // vertical radius (px)
    eyeSpacing: 40,   // x distance from canvas center to each eye
    eyeOffsetY: 0,    // vertical offset from canvas center
    eyeTilt:    10,   // degrees — tops lean away from centerline

    // Blink timing (ms)
    blinkWaitMin: 2500,
    blinkWaitMax: 5500,

    // Look
    lookMax:      20,   // max horizontal wander (px)
    lookSpeedMin: 0.2,  // px/ms
    lookSpeedMax: 0.9,
    lookWaitMin:  800,  // ms between glances
    lookWaitMax:  3000,
    lookHoldMin:  400,  // ms to hold a glance
    lookHoldMax:  2200,

    // Accelerometer tilt
    tiltMaxX:   28,   // max px shift from tilt
    tiltMaxY:   18,
    tiltSmooth: 0.25, // 0=frozen, 1=instant

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
    blink: 0,
    blinkPhase: 'idle',
    blinkWait:  rand(cfg.blinkWaitMin, cfg.blinkWaitMax),
    blinkHold:  0,
    blinkType:  null,

    lookX:       0,
    lookTargetX: 0,
    lookSpeed:   0,
    lookPhase:  'idle',
    lookWait:    rand(cfg.lookWaitMin, cfg.lookWaitMax),
    lookHold:    0,

    tiltX: 0,
    tiltY: 0,
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  function rand(lo, hi)    { return lo + Math.random() * (hi - lo); }
  function randInt(lo, hi) { return Math.floor(rand(lo, hi + 1)); }

  function newLookTarget() {
    const m = cfg.lookMax;
    const positions = [0, 0, 0, -m * 0.5, m * 0.5, -m, m];
    let t;
    do { t = positions[randInt(0, positions.length - 1)]; }
    while (t === state.lookTargetX);
    state.lookTargetX = t;
    state.lookSpeed   = rand(cfg.lookSpeedMin, cfg.lookSpeedMax);
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
      const tx = data.tiltX * cfg.tiltMaxX;
      const ty = data.tiltY * cfg.tiltMaxY;
      state.tiltX += (tx - state.tiltX) * cfg.tiltSmooth;
      state.tiltY += (ty - state.tiltY) * cfg.tiltSmooth;
    }, { frequency: 30 });
  }

  initAccelerometer();

  // ── Update ───────────────────────────────────────────────────────────
  function update(dt) {

    // Blink
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
        if (state.blink >= 1) { state.blinkPhase = 'hold'; state.blinkHold = state.blinkType.hold; }
        break;
      case 'hold':
        state.blinkHold -= dt;
        if (state.blinkHold <= 0) state.blinkPhase = 'opening';
        break;
      case 'opening':
        state.blink = Math.max(0, state.blink - dt / state.blinkType.open);
        if (state.blink <= 0) {
          state.blinkPhase = 'idle';
          state.blinkWait  = rand(cfg.blinkWaitMin, cfg.blinkWaitMax);
        }
        break;
    }

    // Look
    switch (state.lookPhase) {
      case 'idle':
        state.lookWait -= dt;
        if (state.lookWait <= 0) { newLookTarget(); state.lookPhase = 'moving'; }
        break;
      case 'moving': {
        const dx   = state.lookTargetX - state.lookX;
        const step = state.lookSpeed * dt;
        if (Math.abs(dx) <= step) {
          state.lookX     = state.lookTargetX;
          state.lookPhase = 'hold';
          state.lookHold  = rand(cfg.lookHoldMin, cfg.lookHoldMax);
        } else {
          state.lookX += Math.sign(dx) * step;
        }
        break;
      }
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

  function drawEye(side) {  // side: -1 = left, +1 = right
    const ex   = CX + side * cfg.eyeSpacing;
    const ey   = CY + cfg.eyeOffsetY;
    const tilt = side * cfg.eyeTilt * Math.PI / 180;
    const ry   = cfg.eyeRy * (1 - state.blink);

    ctx.save();
    ctx.translate(ex + state.lookX + state.tiltX, ey + state.tiltY);
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, cfg.eyeRx, Math.max(ry, 0.5), 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = cfg.eyeColor;
    ctx.fill();
    ctx.restore();
  }

  const VERSION = 'v0.024';
  function drawVersion() {
    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = '#4a4a6a';
    ctx.fillText(VERSION, 4, H - 4);
    ctx.restore();
  }

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

  // ── Debug hooks (used by designer.html) ─────────────────────────────
  window.__faceDebug = {
    blink() {
      state.blinkType  = BLINK_TYPES[1];
      state.blinkPhase = 'closing';
      state.blink      = 0;
    },
    look(x) {
      state.lookTargetX = x;
      state.lookPhase   = 'moving';
      state.lookSpeed   = 1.5;
    },
  };

  requestAnimationFrame(loop);
})();
