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
  const EYE_RX  = 68;  // sclera horizontal radius
  const EYE_RY  = 60;  // sclera vertical radius
  const IRIS_R  = 40;  // iris radius
  const PUPIL_R = 24;  // pupil radius
  const LOOK_R  = EYE_RX - IRIS_R - 5;  // max pupil travel

  // ── Colors ──────────────────────────────────────────────────────────
  const C = {
    bg:     '#0d0d14',
    sclera: '#e8e8f2',
    iris0:  '#90c8ff',  // iris center highlight
    iris1:  '#4a88e0',  // iris mid
    iris2:  '#1f5aaa',  // iris edge
    pupil0: '#1a1a2e',
    pupil1: '#07070f',
    lid:    '#0d0d14',
    rimGlow:'rgba(70, 110, 200, 0.35)',
  };

  // ── State ────────────────────────────────────────────────────────────
  const state = {
    // Pupil offset shared by both eyes (they track the same point)
    px: 0, py: 0,
    targetX: 0, targetY: 0,

    // Blink  — 0 = fully open, 1 = fully closed
    blink: 0,
    blinkPhase: 'idle',   // 'idle' | 'closing' | 'hold' | 'opening'
    blinkWait: randBetween(2500, 5000),
    blinkHold: 0,
  };

  let lookTimer = randBetween(600, 1800);

  // ── Helpers ──────────────────────────────────────────────────────────
  function randBetween(lo, hi) { return lo + Math.random() * (hi - lo); }

  function randomLookTarget() {
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.random() * LOOK_R;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist * 0.55,  // squish vertical range a bit
    };
  }

  // Frame-rate-independent lerp factor
  function lerpFactor(speed, dt) {
    return 1 - Math.pow(1 - speed, dt / 16.667);
  }

  // ── Update ───────────────────────────────────────────────────────────
  function update(dt) {

    // Smooth pupil movement toward target
    const t = lerpFactor(0.10, dt);
    state.px += (state.targetX - state.px) * t;
    state.py += (state.targetY - state.py) * t;

    // Look-around timer
    lookTimer -= dt;
    if (lookTimer <= 0) {
      const tgt = randomLookTarget();
      state.targetX = tgt.x;
      state.targetY = tgt.y;
      lookTimer = randBetween(700, 2400);
    }

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

    // Ambient glow behind eyes
    const glow = ctx.createRadialGradient(CX, CY, 40, CX, CY, 280);
    glow.addColorStop(0, 'rgba(25, 45, 100, 0.38)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  function drawEye(eye) {
    const { cx, cy } = eye;
    const px = state.px;
    const py = state.py;
    const blink = state.blink;

    // ── Outer rim glow (drawn before clip) ──────────────────
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.ellipse(0, 0, EYE_RX + 6, EYE_RY + 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.rimGlow;
    ctx.fill();
    ctx.restore();

    // ── Clipped eye layers ───────────────────────────────────
    ctx.save();
    ctx.translate(cx, cy);

    // Clip everything to the eye ellipse
    ctx.beginPath();
    ctx.ellipse(0, 0, EYE_RX, EYE_RY, 0, 0, Math.PI * 2);
    ctx.clip();

    // Sclera
    ctx.fillStyle = C.sclera;
    ctx.beginPath();
    ctx.ellipse(0, 0, EYE_RX, EYE_RY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris — radial gradient gives depth
    const irisGrad = ctx.createRadialGradient(
      px - 5, py - 7, 2,
      px,     py,     IRIS_R
    );
    irisGrad.addColorStop(0,   C.iris0);
    irisGrad.addColorStop(0.4, C.iris1);
    irisGrad.addColorStop(1,   C.iris2);

    ctx.beginPath();
    ctx.arc(px, py, IRIS_R, 0, Math.PI * 2);
    ctx.fillStyle = irisGrad;
    ctx.fill();

    // Iris limbal ring (subtle dark edge)
    ctx.beginPath();
    ctx.arc(px, py, IRIS_R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 50, 130, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Pupil
    const pupilGrad = ctx.createRadialGradient(px, py, 0, px, py, PUPIL_R);
    pupilGrad.addColorStop(0, C.pupil0);
    pupilGrad.addColorStop(1, C.pupil1);

    ctx.beginPath();
    ctx.arc(px, py, PUPIL_R, 0, Math.PI * 2);
    ctx.fillStyle = pupilGrad;
    ctx.fill();

    // Specular highlights (two: main + secondary)
    ctx.beginPath();
    ctx.arc(px - 9, py - 10, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px + 6, py - 7, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.fill();

    // ── Eyelids (clipped, so edges follow ellipse curve) ─────
    // Upper lid slides down from -EYE_RY
    if (blink > 0) {
      const upperH = blink * (EYE_RY * 2.15);
      ctx.fillStyle = C.lid;
      ctx.fillRect(-EYE_RX, -EYE_RY - 1, EYE_RX * 2, upperH);

      // Lower lid rises slightly (more natural than just upper)
      const lowerH = blink * (EYE_RY * 0.40);
      ctx.fillStyle = C.lid;
      ctx.fillRect(-EYE_RX, EYE_RY - lowerH, EYE_RX * 2, lowerH + 2);
    }

    ctx.restore();  // end clip

    // ── Eye outline ring (outside clip) ─────────────────────
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.ellipse(0, 0, EYE_RX, EYE_RY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(60, 90, 180, 0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();
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
