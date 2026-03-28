// face.js — R1 Face Character
// Designed for 640x480 display.
// Phase 1: blink + look-around idle animation.

(function () {
  const canvas = document.getElementById('face');
  const ctx    = canvas.getContext('2d');
  const W = 640, H = 480;

  // ── Layout ──────────────────────────────────────────────────────────
  const CX = W / 2;
  const CY = H / 2 - 8;

  const EYES = [
    { cx: CX - 108, cy: CY },  // left
    { cx: CX + 108, cy: CY },  // right
  ];

  // Eye geometry
  const EYE_RX = 68;  // eye horizontal radius
  const EYE_RY = 60;  // eye vertical radius

  // ── Colors ──────────────────────────────────────────────────────────
  const C = {
    bg:  '#0d0d14',
    eye: '#ffffff',
    lid: '#0d0d14',
  };

  // ── State ────────────────────────────────────────────────────────────
  const state = {
    // Blink  — 0 = fully open, 1 = fully closed
    blink: 0,
    blinkPhase: 'idle',   // 'idle' | 'closing' | 'hold' | 'opening'
    blinkWait: randBetween(2500, 5000),
    blinkHold: 0,
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  function randBetween(lo, hi) { return lo + Math.random() * (hi - lo); }

  // ── Update ───────────────────────────────────────────────────────────
  function update(dt) {

    // Blink state machine
    const CLOSE_MS = 72;
    const OPEN_MS  = 115;
    const HOLD_MS  = 52;

    switch (state.blinkPhase) {
      case 'idle':
        state.blinkWait -= dt;
        if (state.blinkWait <= 0) state.blinkPhase = 'closing';
        break;

      case 'closing':
        state.blink = Math.min(1, state.blink + dt / CLOSE_MS);
        if (state.blink >= 1) {
          state.blinkPhase = 'hold';
          state.blinkHold  = HOLD_MS;
        }
        break;

      case 'hold':
        state.blinkHold -= dt;
        if (state.blinkHold <= 0) state.blinkPhase = 'opening';
        break;

      case 'opening':
        state.blink = Math.max(0, state.blink - dt / OPEN_MS);
        if (state.blink <= 0) {
          state.blinkPhase = 'idle';
          state.blinkWait  = randBetween(2500, 5500);
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
    ctx.translate(cx, cy);

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

  // ── Main loop ────────────────────────────────────────────────────────
  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min(now - lastTime, 50);  // cap at 50ms to avoid jumps on tab resume
    lastTime = now;

    update(dt);
    drawBackground();
    EYES.forEach(drawEye);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
