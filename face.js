// face.js — R1 Face Character
// Designed for 240x282 display (Rabbit R1 Creations).
// v0.031

// ── Easing functions ─────────────────────────────────────────────────
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

  // ── Default emotion presets ──────────────────────────────────────────
  // eyeRyScale  : multiplier on eye height (>1 = wide, <1 = squint)
  // eyeYShift   : px — shift eyes up (neg) or down (pos)
  // lidRest     : 0–1 — how far lid rests closed at idle (0 = open, 0.25 = sleepy)
  // browYOffset : px above eye center (negative = higher)
  // browCurve   : px — arc peak height (pos = arch up, neg = arch down)
  // browAngle   : degrees — inner end up (pos) or down (neg); mirrored per side
  // browXSpan   : px — half-width of brow arc
  // browThickness: px — stroke width
  // blinkRateMult: multiplier on blink wait time (>1 = slower, <1 = faster)
  const EMOTION_DEFAULTS = {
    neutral: {
      eyeRyScale: 1.0, eyeYShift: 0,  lidRest: 0,
      browYOffset: -16, browCurve: 3,  browAngle: 0,   browXSpan: 20, browSpacing: 0, browThickness: 2.5,
      blinkRateMult: 1.0,
    },
    attentive: {
      eyeRyScale: 1.15, eyeYShift: -2, lidRest: 0,
      browYOffset: -19, browCurve: 2,  browAngle: -2,  browXSpan: 20, browSpacing: 0, browThickness: 2.5,
      blinkRateMult: 0.35,
    },
    happy: {
      eyeRyScale: 0.7,  eyeYShift: -1, lidRest: 0.22,
      browYOffset: -20, browCurve: 6,  browAngle: 0,   browXSpan: 21, browSpacing: 0, browThickness: 2.5,
      blinkRateMult: 0.8,
    },
    surprised: {
      eyeRyScale: 1.35, eyeYShift: -4, lidRest: 0,
      browYOffset: -24, browCurve: 5,  browAngle: 0,   browXSpan: 22, browSpacing: 2, browThickness: 2.5,
      blinkRateMult: 0.2,
    },
    thinking: {
      eyeRyScale: 0.88, eyeYShift: 0,  lidRest: 0.08,
      browYOffset: -15, browCurve: 1,  browAngle: 4,   browXSpan: 19, browSpacing: 0, browThickness: 2.5,
      blinkRateMult: 1.6,
    },
    tired: {
      eyeRyScale: 0.75, eyeYShift: 3,  lidRest: 0.28,
      browYOffset: -12, browCurve: 2,  browAngle: 3,   browXSpan: 20, browSpacing: 0, browThickness: 2.0,
      blinkRateMult: 1.9,
    },
  };

  // Emotion names exposed for designer
  window.FACE_EMOTION_NAMES = Object.keys(EMOTION_DEFAULTS);

  // ── Config ───────────────────────────────────────────────────────────
  const cfg = window.faceConfig = Object.assign({
    eyeRx:      24,
    eyeRy:      27,
    eyeSpacing: 40,
    eyeOffsetY: 0,
    eyeTilt:    10,

    blinkWaitMin:     2500,
    blinkWaitMax:     5500,
    blinkCloseEasing: 'Ease In',
    blinkOpenEasing:  'Ease Out',

    // Three blink speed profiles — randomly selected each blink
    blinkProfiles: [
      { close: 45,  hold: 30,  open: 70  },   // quick
      { close: 72,  hold: 52,  open: 115 },   // normal
      { close: 130, hold: 100, open: 180 },   // slow
    ],

    lookMax:         20,
    lookDurationMin: 150,
    lookDurationMax: 600,
    lookWaitMin:     800,
    lookWaitMax:     3000,
    lookHoldMin:     400,
    lookHoldMax:     2200,
    lookEasing:      'Ease Out Cubic',

    tiltMaxX:   28,
    tiltMaxY:   18,
    tiltSmooth: 0.25,

    bgColor:   '#0d0d14',
    eyeColor:  '#ffffff',
    browColor: '#ffffff',

    // Emotion transition
    transitionDuration: 300,
    transitionEasing:   'Ease In-Out',

    // Emotion presets (editable at runtime)
    emotions: Object.assign({}, EMOTION_DEFAULTS),
  }, window.faceConfig || {});

  // Ensure emotions always has all presets (fill any missing from defaults)
  for (const name of window.FACE_EMOTION_NAMES) {
    cfg.emotions[name] = Object.assign({}, EMOTION_DEFAULTS[name], cfg.emotions[name] || {});
  }

  // Ensure blinkProfiles array is always present (safe after config merge)
  if (!Array.isArray(cfg.blinkProfiles) || cfg.blinkProfiles.length === 0) {
    cfg.blinkProfiles = [
      { close: 45,  hold: 30,  open: 70  },
      { close: 72,  hold: 52,  open: 115 },
      { close: 130, hold: 100, open: 180 },
    ];
  }

  // ── Emotion state ────────────────────────────────────────────────────
  const emo = {
    name: 'neutral',
    live: { ...cfg.emotions.neutral },   // interpolated values — drives rendering
    from: { ...cfg.emotions.neutral },   // snapshot when transition started
    t:    1,                             // 0→1; 1 = fully arrived
  };

  // ── Blink / look state ───────────────────────────────────────────────
  const state = {
    blinkRaw: 0, blink: 0,
    blinkPhase: 'idle',
    blinkWait:  rand(cfg.blinkWaitMin, cfg.blinkWaitMax),
    blinkHold:  0, blinkType: null,

    lookX: 0, lookStartX: 0, lookTargetX: 0,
    lookT: 0, lookDuration: 0,
    lookPhase: 'idle',
    lookWait:  rand(cfg.lookWaitMin, cfg.lookWaitMax),
    lookHold:  0,

    tiltX: 0, tiltY: 0,
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  function rand(lo, hi)    { return lo + Math.random() * (hi - lo); }
  function randInt(lo, hi) { return Math.floor(rand(lo, hi + 1)); }
  function lerp(a, b, t)   { return a + (b - a) * t; }
  function applyEase(name, t) { return (E[name] || E['Linear'])(Math.max(0, Math.min(1, t))); }

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

    // Emotion transition
    if (emo.t < 1) {
      emo.t = Math.min(1, emo.t + dt / cfg.transitionDuration);
      const t = applyEase(cfg.transitionEasing, emo.t);
      for (const key of Object.keys(emo.live)) {
        if (typeof emo.live[key] === 'number') {
          emo.live[key] = lerp(emo.from[key], cfg.emotions[emo.name][key], t);
        }
      }
    }

    // Blink
    switch (state.blinkPhase) {
      case 'idle':
        state.blinkWait -= dt;
        if (state.blinkWait <= 0) {
          state.blinkType  = cfg.blinkProfiles[randInt(0, cfg.blinkProfiles.length - 1)];
          state.blinkRaw   = 0;
          state.blinkPhase = 'closing';
        }
        break;
      case 'closing':
        state.blinkRaw = Math.min(1, state.blinkRaw + dt / state.blinkType.close);
        state.blink    = applyEase(cfg.blinkCloseEasing, state.blinkRaw);
        if (state.blinkRaw >= 1) { state.blink = 1; state.blinkPhase = 'hold'; state.blinkHold = state.blinkType.hold; }
        break;
      case 'hold':
        state.blinkHold -= dt;
        if (state.blinkHold <= 0) { state.blinkRaw = 0; state.blinkPhase = 'opening'; }
        break;
      case 'opening':
        state.blinkRaw = Math.min(1, state.blinkRaw + dt / state.blinkType.open);
        state.blink    = 1 - applyEase(cfg.blinkOpenEasing, state.blinkRaw);
        if (state.blinkRaw >= 1) {
          state.blink      = 0;
          state.blinkPhase = 'idle';
          state.blinkWait  = rand(cfg.blinkWaitMin, cfg.blinkWaitMax) * emo.live.blinkRateMult;
        }
        break;
    }

    // Look
    switch (state.lookPhase) {
      case 'idle':
        state.lookWait -= dt;
        if (state.lookWait <= 0) { newLookTarget(); state.lookPhase = 'moving'; }
        break;
      case 'moving':
        state.lookT = Math.min(1, state.lookT + dt / state.lookDuration);
        state.lookX = lerp(state.lookStartX, state.lookTargetX, applyEase(cfg.lookEasing, state.lookT));
        if (state.lookT >= 1) {
          state.lookX = state.lookTargetX;
          state.lookPhase = 'hold';
          state.lookHold  = rand(cfg.lookHoldMin, cfg.lookHoldMax);
        }
        break;
      case 'hold':
        state.lookHold -= dt;
        if (state.lookHold <= 0) { state.lookPhase = 'idle'; state.lookWait = rand(cfg.lookWaitMin, cfg.lookWaitMax); }
        break;
    }
  }

  // ── Render ───────────────────────────────────────────────────────────
  function drawBackground() {
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(0, 0, W, H);
  }

  function drawEye(side) {
    const ex = CX + side * cfg.eyeSpacing;
    const ey = CY + cfg.eyeOffsetY + emo.live.eyeYShift;

    // Eye height: scale × emotion × clamp blink on top of lidRest
    const closure = Math.max(state.blink, emo.live.lidRest);
    const ry = cfg.eyeRy * emo.live.eyeRyScale * (1 - closure);
    if (ry <= 0) return;

    const tilt = side * cfg.eyeTilt * Math.PI / 180;

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

  function drawBrow(side) {
    const ex = CX + side * cfg.eyeSpacing;
    const ey = CY + cfg.eyeOffsetY + emo.live.eyeYShift;

    // Brow travels with the eye (look + tilt); spacing pushes outward from center
    const bx = ex + side * emo.live.browSpacing + state.lookX + state.tiltX;
    const by = ey + emo.live.browYOffset + state.tiltY;

    // Angle: inner end raised (pos browAngle) or lowered (neg), mirrored per side
    // side=-1 (left): positive browAngle → left inner raised → rotate clockwise (pos)
    // side=+1 (right): positive browAngle → right inner raised → rotate counter-clockwise (neg)
    const angle = -side * emo.live.browAngle * Math.PI / 180;

    const span  = emo.live.browXSpan;
    const curve = emo.live.browCurve;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-span, 0);
    ctx.quadraticCurveTo(0, -curve, span, 0);
    ctx.strokeStyle = cfg.browColor;
    ctx.lineWidth   = emo.live.browThickness;
    ctx.lineCap     = 'round';
    ctx.stroke();
    ctx.restore();
  }

  const VERSION = 'v0.031';
  function drawHUD() {
    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = '#9090b8';

    ctx.textAlign = 'left';
    ctx.fillText(VERSION, 4, H - 4);

    ctx.textAlign = 'right';
    ctx.fillText(emo.name, W - 4, H - 4);

    ctx.restore();
  }

  // ── Debug / API hooks ────────────────────────────────────────────────
  window.__faceDebug = {
    blink() {
      state.blinkType  = cfg.blinkProfiles[1];
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
    setEmotion(name) {
      if (!cfg.emotions[name]) return;
      emo.from = { ...emo.live };
      emo.name = name;
      emo.t    = 0;
    },
    getEmotion() { return emo.name; },
  };

  // ── PTT button — tap to cycle emotions ──────────────────────────────
  window.addEventListener('sideClick', () => {
    const names  = window.FACE_EMOTION_NAMES;
    const next   = (names.indexOf(emo.name) + 1) % names.length;
    window.__faceDebug.setEmotion(names[next]);
  });

  // ── Main loop ────────────────────────────────────────────────────────
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;
    update(dt);
    drawBackground();
    drawEye(-1);  drawEye(1);
    drawBrow(-1); drawBrow(1);
    drawHUD();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
