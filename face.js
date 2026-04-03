// face.js — R1 Face Character
// Designed for 240x282 display (Rabbit R1 Creations).
// v0.034

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
  // eyeRyScale   : multiplier on eye height (>1 = wide, <1 = squint)
  // eyeYShift    : px — shift eyes up (neg) or down (pos)
  // lidRest      : 0–1 — how far lid rests closed at idle
  // browYOffsetL/R: px above eye center in eye-local space (neg = higher)
  // browCurveL/R : px — arc peak (pos = arch up)
  // browAngle    : degrees — inner end tilt; mirrored per side
  // browXSpan    : px — brow half-width
  // browThickness: px — stroke width (0 = hidden)
  // blinkRateMult: multiplier on blink wait time (>1 = slower)
  // mouthY       : px below face center
  // mouthWidth   : px — mouth half-width
  // mouthCurve   : px — arc peak (pos = smile up, neg = frown down)
  // mouthThickness: px — stroke width (0 = hidden)
  // mouthOpenMax : px — max jaw-drop height when mouthOpen = 1
  const EMOTION_DEFAULTS = {
    neutral: {
      eyeRyScale: 1.0, eyeYShift: 0,  lidRest: 0,
      browYOffsetL: -16, browYOffsetR: -16, browCurveL: 3, browCurveR: 3,
      browAngle: 0,   browXSpan: 20, browSpacing: 0, browThickness: 2.5,
      blinkRateMult: 1.0,
      mouthY: 40, mouthWidth: 18, mouthCurve: 2, mouthAngle: 0, mouthThickness: 3, mouthOpenMax: 12,
    },
    attentive: {
      eyeRyScale: 1.15, eyeYShift: -2, lidRest: 0,
      browYOffsetL: -19, browYOffsetR: -19, browCurveL: 2, browCurveR: 2,
      browAngle: -2,  browXSpan: 20, browSpacing: 0, browThickness: 2.5,
      blinkRateMult: 0.35,
      mouthY: 40, mouthWidth: 18, mouthCurve: 1, mouthAngle: 0, mouthThickness: 3, mouthOpenMax: 12,
    },
    happy: {
      eyeRyScale: 0.7,  eyeYShift: -1, lidRest: 0.22,
      browYOffsetL: -20, browYOffsetR: -20, browCurveL: 6, browCurveR: 6,
      browAngle: 0,   browXSpan: 21, browSpacing: 0, browThickness: 2.5,
      blinkRateMult: 0.8,
      mouthY: 40, mouthWidth: 22, mouthCurve: 7, mouthAngle: 0, mouthThickness: 2.5, mouthOpenMax: 14,
    },
    surprised: {
      eyeRyScale: 1.35, eyeYShift: -4, lidRest: 0,
      browYOffsetL: -24, browYOffsetR: -24, browCurveL: 5, browCurveR: 5,
      browAngle: 0,   browXSpan: 22, browSpacing: 2, browThickness: 2.5,
      blinkRateMult: 0.2,
      mouthY: 44, mouthWidth: 14, mouthCurve: -1, mouthAngle: 0, mouthThickness: 2, mouthOpenMax: 20,
    },
    thinking: {
      eyeRyScale: 0.88, eyeYShift: 0,  lidRest: 0.08,
      browYOffsetL: -15, browYOffsetR: -15, browCurveL: 1, browCurveR: 1,
      browAngle: 4,   browXSpan: 19, browSpacing: 0, browThickness: 2.5,
      blinkRateMult: 1.6,
      mouthY: 40, mouthWidth: 14, mouthCurve: 0, mouthAngle: 0, mouthThickness: 3, mouthOpenMax: 8,
    },
    tired: {
      eyeRyScale: 0.75, eyeYShift: 3,  lidRest: 0.28,
      browYOffsetL: -12, browYOffsetR: -12, browCurveL: 2, browCurveR: 2,
      browAngle: 3,   browXSpan: 20, browSpacing: 0, browThickness: 2.0,
      blinkRateMult: 1.9,
      mouthY: 42, mouthWidth: 16, mouthCurve: -2, mouthAngle: 0, mouthThickness: 3, mouthOpenMax: 8,
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

    // Per-eye shape offsets — added on top of the global eyeRx / eyeRy
    eyeRxOffsetL: 0, eyeRxOffsetR: 0,
    eyeRyOffsetL: 0, eyeRyOffsetR: 0,

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

    bgColor:          '#0d0d14',
    eyeColor:         '#ffffff',
    browColor:        '#ffffff',
    mouthColor:       '#ffffff',
    mouthInteriorColor: '#050508',

    // Emotion transition
    transitionDuration: 300,
    transitionEasing:   'Ease In-Out',

    // Emotion presets (editable at runtime)
    emotions: Object.assign({}, EMOTION_DEFAULTS),
  }, window.faceConfig || {});

  // Ensure emotions always has all presets (fill any missing from defaults)
  for (const name of window.FACE_EMOTION_NAMES) {
    cfg.emotions[name] = Object.assign({}, EMOTION_DEFAULTS[name], cfg.emotions[name] || {});
    // Migrate old single browYOffset/browCurve to per-side L/R keys
    const e = cfg.emotions[name];
    if (e.browYOffset !== undefined && e.browYOffsetL === undefined) {
      e.browYOffsetL = e.browYOffset; e.browYOffsetR = e.browYOffset;
      delete e.browYOffset;
    }
    if (e.browCurve !== undefined && e.browCurveL === undefined) {
      e.browCurveL = e.browCurve; e.browCurveR = e.browCurve;
      delete e.browCurve;
    }
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

  // ── Blink / look / mouth state ───────────────────────────────────────
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

    mouthOpen: 0,   // 0–1, driven by mouth animation below
  };

  // ── Mouth animation ──────────────────────────────────────────────────
  // queue: [{target, hold}] — each entry animates to target and holds for `hold` ms
  const mouth = { open: 0, target: 0, holdTimer: 0, queue: [] };

  function speakText(text) {
    mouth.queue = [];
    mouth.holdTimer = 0;
    const words = text.trim().split(/\s+/);
    const msPerWord = 430;   // ~140 wpm
    words.forEach(word => {
      const vowels   = (word.match(/[aeiouAEIOU]/g) || []).length;
      const openAmt  = Math.min(1, 0.25 + vowels * 0.12);
      mouth.queue.push({ target: openAmt, hold: msPerWord * 0.55 });
      mouth.queue.push({ target: 0.05,    hold: msPerWord * 0.45 });
    });
    mouth.queue.push({ target: 0, hold: 300 });
  }

  function stopSpeaking() {
    mouth.queue   = [];
    mouth.target  = 0;
    mouth.holdTimer = 0;
  }

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

    // Mouth animation queue
    if (mouth.queue.length > 0 && mouth.holdTimer <= 0) {
      const next    = mouth.queue.shift();
      mouth.target  = next.target;
      mouth.holdTimer = next.hold;
    } else {
      mouth.holdTimer = Math.max(0, mouth.holdTimer - dt);
    }
    mouth.open    += (mouth.target - mouth.open) * Math.min(1, dt * 0.018);
    state.mouthOpen = mouth.open;

    // Speaking done → return to idle
    if (voiceState === 'speaking' && mouth.queue.length === 0 && mouth.target === 0 && mouth.open < 0.02) {
      voiceState = 'idle';
    }

    // Look — suspended while speaking (eyes drift back to center)
    if (voiceState === 'speaking') {
      state.lookX     += (0 - state.lookX) * Math.min(1, dt * 0.008);
      state.lookPhase  = 'idle';
      state.lookWait   = rand(cfg.lookWaitMin, cfg.lookWaitMax);
    } else {
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
  }

  // ── Render ───────────────────────────────────────────────────────────
  function drawBackground() {
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(0, 0, W, H);
  }

  function drawEye(side) {
    const ex = CX + side * cfg.eyeSpacing;
    const ey = CY + cfg.eyeOffsetY + emo.live.eyeYShift;

    // Per-eye shape: global + individual offset
    const rx = cfg.eyeRx + (side === -1 ? cfg.eyeRxOffsetL : cfg.eyeRxOffsetR);
    const ryBase = cfg.eyeRy + (side === -1 ? cfg.eyeRyOffsetL : cfg.eyeRyOffsetR);

    // Eye height: scale × emotion × clamp blink on top of lidRest
    const closure = Math.max(state.blink, emo.live.lidRest);
    const ry = ryBase * emo.live.eyeRyScale * (1 - closure);
    if (ry <= 0) return;

    const tilt = side * cfg.eyeTilt * Math.PI / 180;

    ctx.save();
    ctx.translate(ex + state.lookX + state.tiltX, ey + state.tiltY);
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = cfg.eyeColor;
    ctx.fill();
    ctx.restore();
  }

  function drawBrow(side) {
    if (emo.live.browThickness <= 0) return;
    const ex = CX + side * cfg.eyeSpacing;
    const ey = CY + cfg.eyeOffsetY + emo.live.eyeYShift;

    // Eye tilt angle — brow position and rotation follow this
    const tilt = side * cfg.eyeTilt * Math.PI / 180;

    // Per-side brow params
    const browYOffset = side === -1 ? emo.live.browYOffsetL : emo.live.browYOffsetR;
    const curve       = side === -1 ? emo.live.browCurveL   : emo.live.browCurveR;

    // Compute brow anchor in eye-local space, then rotate into canvas space
    // so the brow stays "above the eye" even as the eye tilts
    const localX = side * emo.live.browSpacing;
    const localY = browYOffset;
    const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
    const bx = ex + (localX * cosT - localY * sinT) + state.lookX + state.tiltX;
    const by = ey + (localX * sinT + localY * cosT) + state.tiltY;

    // Brow's own angle adds on top of the eye tilt
    const angle = tilt + (-side * emo.live.browAngle * Math.PI / 180);

    const span = emo.live.browXSpan;

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

  function drawMouth() {
    const thickness = emo.live.mouthThickness;
    const openH     = state.mouthOpen * emo.live.mouthOpenMax;
    if (thickness <= 0 && openH < 0.5) return;

    const mx    = CX + state.lookX + state.tiltX;
    const my    = CY + cfg.eyeOffsetY + emo.live.mouthY + state.tiltY;
    const span  = emo.live.mouthWidth;
    const curve = emo.live.mouthCurve;
    const angle = emo.live.mouthAngle * Math.PI / 180;

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);

    // Filled interior when mouth is open
    if (openH >= 0.5) {
      ctx.beginPath();
      ctx.moveTo(-span, 0);
      ctx.quadraticCurveTo(0, -curve, span, 0);           // upper lip arc
      ctx.quadraticCurveTo(0, openH - curve, -span, 0);   // lower lip arc
      ctx.closePath();
      ctx.fillStyle = cfg.mouthInteriorColor;
      ctx.fill();
    }

    // Lip line
    if (thickness > 0) {
      ctx.beginPath();
      ctx.moveTo(-span, 0);
      ctx.quadraticCurveTo(0, -curve, span, 0);
      ctx.strokeStyle = cfg.mouthColor;
      ctx.lineWidth   = thickness;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Voice state ──────────────────────────────────────────────────────
  // 'idle' | 'listening' | 'processing' | 'speaking'
  let voiceState = 'idle';
  let voiceStep  = '';   // 'stt' | 'llm' — visible sub-state during processing

  const VERSION = 'v0.043';

  // ── Diagnostic probe (sideClick toggles overlay) ─────────────────────
  let diagVisible = false;
  let diagLines   = null;

  // wrap text to fit canvas width at given font size
  function wrapLine(prefix, text, charsPerLine) {
    const lines = [];
    const full = prefix + text;
    for (let i = 0; i < full.length; i += charsPerLine) {
      lines.push(full.slice(i, i + charsPerLine));
    }
    return lines;
  }

  let diagPage = 0;
  const DIAG_LINES_PER_PAGE = 22;

  function probeDiag() {
    const CW = 32; // chars per line at 7px font on 240px canvas
    const lines = [];
    const w = (pfx, val) => wrapLine(pfx, val, CW);

    lines.push('-- R1 PROBE (scroll to page) --');

    // Full user agent
    w('UA: ', navigator.userAgent || '?').forEach(l => lines.push(l));

    // R1-specific globals — one per line
    const r1Keys = Object.keys(window).filter(k =>
      /plugin|creation|rabbit|handler|sensor/i.test(k)
    );
    lines.push('--- R1 GLOBALS (' + r1Keys.length + ') ---');
    r1Keys.forEach(k => lines.push('  ' + k));

    // PluginMessageHandler methods
    if (typeof PluginMessageHandler !== 'undefined') {
      const methods = [];
      for (const k in PluginMessageHandler) methods.push(k);
      try {
        const proto = Object.getPrototypeOf(PluginMessageHandler);
        if (proto) for (const k of Object.getOwnPropertyNames(proto)) methods.push(k);
      } catch(e) {}
      lines.push('--- PMH KEYS ---');
      methods.forEach(k => lines.push('  ' + k));
    } else {
      lines.push('PMH: NOT FOUND');
    }

    // creationStorage — probe its methods
    if (typeof creationStorage !== 'undefined') {
      const csKeys = [];
      for (const k in creationStorage) csKeys.push(k);
      try {
        const proto = Object.getPrototypeOf(creationStorage);
        if (proto) for (const k of Object.getOwnPropertyNames(proto)) csKeys.push(k);
      } catch(e) {}
      lines.push('--- cStorage KEYS ---');
      csKeys.forEach(k => lines.push('  ' + k));
    } else {
      lines.push('cStorage: NO');
    }

    // Deep probe helper: enumerate own + proto keys with types
    function probeObj(name, obj) {
      lines.push('--- ' + name + ' ---');
      if (typeof obj === 'undefined') { lines.push('  NOT FOUND'); return; }
      lines.push('  typeof: ' + typeof obj);
      // own keys
      const own = Object.keys(obj);
      if (own.length) {
        lines.push('  own keys:');
        own.forEach(k => {
          let t = '?';
          try { t = typeof obj[k]; } catch(e) { t = 'ERR'; }
          let v = '';
          if (t === 'string') v = ' = "' + String(obj[k]).slice(0, 20) + '"';
          else if (t === 'number' || t === 'boolean') v = ' = ' + obj[k];
          lines.push('    ' + k + ' (' + t + ')' + v);
        });
      }
      // proto keys (skip Object.prototype builtins)
      const builtins = new Set(['constructor','__defineGetter__','__defineSetter__',
        'hasOwnProperty','__lookupGetter__','__lookupSetter__','isPrototypeOf',
        'propertyIsEnumerable','toString','valueOf','__proto__','toLocaleString']);
      try {
        const proto = Object.getPrototypeOf(obj);
        if (proto && proto !== Object.prototype) {
          const pKeys = Object.getOwnPropertyNames(proto).filter(k => !builtins.has(k));
          if (pKeys.length) {
            lines.push('  proto keys:');
            pKeys.forEach(k => {
              let t = '?';
              try { t = typeof proto[k]; } catch(e) { t = 'ERR'; }
              lines.push('    ' + k + ' (' + t + ')');
            });
          }
        }
      } catch(e) {}
      // try to get string representation
      try {
        const s = String(obj);
        if (s !== '[object Object]') w('  str: ', s).forEach(l => lines.push(l));
      } catch(e) {}
    }

    // Deep probes
    probeObj('FlutterButtonHandler', window.FlutterButtonHandler);
    probeObj('touchEventHandler', window.touchEventHandler);
    probeObj('AccelerometerHandler', window.AccelerometerHandler);
    probeObj('CreationStorageHandler', window.CreationStorageHandler);
    probeObj('CreationMutexHandler', window.CreationMutexHandler);

    // creationSensors
    probeObj('creationSensors', window.creationSensors);

    // creationStorage own methods (not proto builtins)
    if (typeof creationStorage !== 'undefined') {
      lines.push('--- cStorage methods ---');
      const own = Object.keys(creationStorage);
      own.forEach(k => {
        let t = '?'; try { t = typeof creationStorage[k]; } catch(e) {}
        lines.push('  ' + k + ' (' + t + ')');
      });
      // try calling getItem/setItem/keys to see if they exist
      ['getItem','setItem','removeItem','clear','keys','length','plan'].forEach(m => {
        let exists = '?';
        try { exists = typeof creationStorage[m]; } catch(e) { exists = 'ERR'; }
        lines.push('  .' + m + ' = ' + exists);
      });
    }

    // APIs
    lines.push('--- APIS ---');
    lines.push('SpeechRec: ' + (window.SpeechRecognition ? 'native' : window.webkitSpeechRecognition ? 'webkit' : 'NO'));
    lines.push('MediaDevices: ' + (navigator.mediaDevices ? 'YES' : 'NO'));
    lines.push('MediaRec: ' + (typeof MediaRecorder !== 'undefined' ? 'YES' : 'NO'));
    lines.push('screen: ' + screen.width + 'x' + screen.height + ' dpr=' + devicePixelRatio);
    lines.push('canvas: ' + W + 'x' + H);
    lines.push('onPM set: ' + (typeof window.onPluginMessage === 'function' ? 'YES' : 'NO'));

    // Last STT/LLM
    const ls = window.__lepusState || {};
    if (ls.lastTranscript) w('lastSTT: ', ls.lastTranscript).forEach(l => lines.push(l));
    if (ls.lastReply) w('lastLLM: ', ls.lastReply).forEach(l => lines.push(l));

    return lines;
  }

  function drawDiag() {
    if (!diagVisible) return;
    if (!diagLines) diagLines = probeDiag();

    const startIdx = diagPage * DIAG_LINES_PER_PAGE;
    const pageLines = diagLines.slice(startIdx, startIdx + DIAG_LINES_PER_PAGE);
    const totalPages = Math.ceil(diagLines.length / DIAG_LINES_PER_PAGE);

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = '7px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'left';
    for (let i = 0; i < pageLines.length; i++) {
      ctx.fillText(pageLines[i], 3, 10 + i * 12);
    }
    ctx.fillStyle = '#666';
    ctx.font = '7px monospace';
    ctx.fillText('pg ' + (diagPage + 1) + '/' + totalPages + '  scroll=page  side=close', 3, H - 3);
    ctx.restore();
  }

  window.addEventListener('sideClick', () => {
    diagVisible = !diagVisible;
    diagPage = 0;
    if (diagVisible) diagLines = probeDiag();
  });

  // hijack scroll for paging when diag is open
  const _origScrollUp = window.addEventListener;
  window.addEventListener('scrollUp', (e) => {
    if (!diagVisible) return;
    const totalPages = Math.ceil((diagLines || []).length / DIAG_LINES_PER_PAGE);
    if (diagPage > 0) diagPage--;
  });
  window.addEventListener('scrollDown', (e) => {
    if (!diagVisible) return;
    const totalPages = Math.ceil((diagLines || []).length / DIAG_LINES_PER_PAGE);
    if (diagPage < totalPages - 1) diagPage++;
  });
  function drawHUD() {
    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = '#9090b8';

    ctx.textAlign = 'left';
    ctx.fillText(VERSION, 4, H - 4);

    ctx.textAlign = 'right';
    const voiceTag = voiceState !== 'idle'
      ? ' · ' + voiceState + (voiceStep ? ':' + voiceStep : '')
      : '';
    ctx.fillText(emo.name + voiceTag, W - 4, H - 4);

    // Status dot — upper right
    if (voiceState === 'listening') {
      ctx.beginPath();
      ctx.arc(W - 10, 10, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ff3333';
      ctx.fill();
    } else if (voiceState === 'processing') {
      ctx.beginPath();
      ctx.arc(W - 10, 10, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffaa22';
      ctx.fill();
    }

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
    getEmotion()      { return emo.name; },
    speakText(text)   { speakText(text); },
    stopSpeaking()    { stopSpeaking(); },
  };

  // ── Scroll wheel — cycle emotions ────────────────────────────────────
  window.addEventListener('scrollUp', () => {
    if (diagVisible) return;
    const names = window.FACE_EMOTION_NAMES;
    const next  = (names.indexOf(emo.name) + 1) % names.length;
    window.__faceDebug.setEmotion(names[next]);
  });
  window.addEventListener('scrollDown', () => {
    if (diagVisible) return;
    const names = window.FACE_EMOTION_NAMES;
    const prev  = (names.indexOf(emo.name) - 1 + names.length) % names.length;
    window.__faceDebug.setEmotion(names[prev]);
  });

  // ── Lepus personality ────────────────────────────────────────────────
  const LEPUS_PROMPT = `You are Lepus, an AI assistant who lives as an animated face on a Rabbit R1 device. You are aware that you are an AI, that you have a face with eyes and a mouth, and that you exist on a small orange handheld device. You have a dry, deadpan personality — you say what you mean, you don't perform enthusiasm you don't feel, and you find the world mildly but genuinely interesting. You're conversational and engaged, not terse. Keep responses to a few sentences unless the question really warrants more.`;

  // ── Voice pipeline (R1 only) ─────────────────────────────────────────
  const ON_R1 = typeof PluginMessageHandler !== 'undefined';

  if (ON_R1) {

    // ── Shared: LLM call + response handler ─────────────────────────────
    window.__lepusState = window.__lepusState || {};

    function sendToLLM(transcript) {
      const emotionCtx  = `Your face is currently expressing: ${emo.name}`;
      const fullMessage = `${LEPUS_PROMPT}\n${emotionCtx}\n\nUser: ${transcript}`;

      voiceStep = 'llm';

      window.__lepusState.llmTimeout = setTimeout(() => {
        if (voiceState === 'processing') {
          voiceState = 'idle';
          voiceStep  = '';
          window.__faceDebug.setEmotion('neutral');
        }
      }, 20000);

      PluginMessageHandler.postMessage(JSON.stringify({
        message:         fullMessage,
        useLLM:          true,
        wantsR1Response: true,
      }));
    }

    window.onPluginMessage = function(evt) {
      if (voiceState !== 'processing') return;
      clearTimeout(window.__lepusState.llmTimeout);
      let reply = '';
      try {
        const parsed = JSON.parse(evt.data);
        reply = (parsed.response || parsed.message || '').trim();
      } catch (e) {
        reply = (evt.message || (typeof evt.data === 'string' ? evt.data : '') || '').trim();
      }
      voiceStep = '';
      if (!reply) { voiceState = 'idle'; window.__faceDebug.setEmotion('neutral'); return; }
      window.__lepusState.lastReply = reply;
      voiceState = 'speaking';
      window.__faceDebug.setEmotion('neutral');
      speakText(reply);
    };

    // ── STT: Web Speech API (primary) or MediaRecorder+Whisper (fallback) ─
    {
      // ── MediaRecorder + Whisper STT ────────────────────────────────────
      fetch('https://masatrad-whisper.hf.space/', { method: 'GET', mode: 'no-cors' }).catch(() => {});

      let mediaStream = null, recorder = null, audioChunks = [], recordTimer = null;
      const MAX_RECORD_MS = 30000;

      window.addEventListener('longPressStart', () => {
        if (voiceState !== 'idle') return;
        voiceState = 'listening';
        window.__faceDebug.setEmotion('attentive');
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          mediaStream = stream;
          audioChunks = [];
          recorder    = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
          recorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
          recorder.onstop = async () => {
            const blob       = new Blob(audioChunks, { type: 'audio/webm' });
            const transcript = await transcribeAudio(blob);
            window.__lepusState.lastTranscript = transcript;
            if (!transcript) { voiceState = 'idle'; voiceStep = ''; window.__faceDebug.setEmotion('neutral'); return; }
            sendToLLM(transcript);
          };
          recorder.start();
          recordTimer = setTimeout(() => stopWhisperListening(), MAX_RECORD_MS);
        }).catch(e => {
          console.error('Mic error:', e);
          voiceState = 'idle'; window.__faceDebug.setEmotion('neutral');
        });
      });

      function stopWhisperListening() {
        if (voiceState !== 'listening') return;
        clearTimeout(recordTimer);
        if (recorder && recorder.state !== 'inactive') recorder.stop();
        if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
        voiceState = 'processing'; voiceStep = 'stt';
        window.__faceDebug.setEmotion('thinking');
      }

      window.addEventListener('longPressEnd', stopWhisperListening);

      async function transcribeAudio(blob) {
        // Promise.race is more reliable than AbortController on some WebViews —
        // the fetch may be orphaned but the function always returns within 20s.
        const dead = new Promise(resolve => setTimeout(() => resolve(''), 20000));
        try {
          const fd = new FormData();
          fd.append('audio_file', blob, 'audio.webm');
          const fetchP = fetch(
            'https://masatrad-whisper.hf.space/asr?output=txt&language=en',
            { method: 'POST', body: fd }
          ).then(r => r.text());
          return ((await Promise.race([fetchP, dead])) || '').trim();
        } catch (e) {
          console.error('STT error:', e);
          return '';
        }
      }
    }
  }

  // ── Main loop ────────────────────────────────────────────────────────
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;
    update(dt);
    drawBackground();
    drawEye(-1);  drawEye(1);
    drawBrow(-1); drawBrow(1);
    drawMouth();
    drawHUD();
    drawDiag();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
