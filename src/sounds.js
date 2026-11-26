let sharedAudioCtx = null;
let sharedMasterOut = null;
let sharedNoiseBuf = null;
let warmListenersBound = false;

function ensureMasterBus(ctx) {
  if (sharedMasterOut && sharedMasterOut.context === ctx) {
    return sharedMasterOut;
  }
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-10, ctx.currentTime);
  limiter.knee.setValueAtTime(12, ctx.currentTime);
  limiter.ratio.setValueAtTime(4, ctx.currentTime);
  limiter.attack.setValueAtTime(0.002, ctx.currentTime);
  limiter.release.setValueAtTime(0.10, ctx.currentTime);

  const warmth = ctx.createBiquadFilter();
  warmth.type = 'lowpass';
  warmth.frequency.setValueAtTime(9500, ctx.currentTime);
  warmth.Q.setValueAtTime(0.5, ctx.currentTime);

  warmth.connect(limiter);
  limiter.connect(ctx.destination);
  sharedMasterOut = warmth;
  return sharedMasterOut;
}

function getMalletNoiseBuffer(ctx) {
  if (sharedNoiseBuf && sharedNoiseBuf.sampleRate === ctx.sampleRate) {
    return sharedNoiseBuf;
  }
  const length = Math.max(1, Math.round(ctx.sampleRate * 0.015));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  sharedNoiseBuf = buffer;
  return sharedNoiseBuf;
}

function getOrCreateAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtx();
      sharedMasterOut = null;
      sharedNoiseBuf = null;
    } catch {
      return null;
    }
  }
  return sharedAudioCtx;
}

/** Pre-warms and resumes the shared AudioContext so answer chimes play with zero lag. */
export function warmAudioContext() {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;
  try {
    ensureMasterBus(ctx);
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {}
}

function bindAutoWarmListeners() {
  if (warmListenersBound || typeof window === 'undefined') return;
  warmListenersBound = true;
  const events = ['pointerdown', 'touchstart', 'keydown'];
  const cleanup = () => {
    events.forEach((evt) => window.removeEventListener(evt, onFirstGesture, true));
  };
  const onFirstGesture = () => {
    warmAudioContext();
    if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
      cleanup();
    }
  };
  events.forEach((evt) => window.addEventListener(evt, onFirstGesture, { capture: true, passive: true }));
}

bindAutoWarmListeners();

function withAudioContext(fn) {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  const run = () => {
    try {
      const dest = ensureMasterBus(ctx);
      fn(ctx, dest, ctx.currentTime);
    } catch {}
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(run).catch(() => {});
  } else {
    run();
  }
}

/** Synthesizes a subtle physical woody micro-transient without white-noise hiss. */
function playMalletClick(ctx, dest, startTime, centerHz, volume, duration = 0.008) {
  const src = ctx.createBufferSource();
  src.buffer = getMalletNoiseBuffer(ctx);

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(centerHz, startTime);
  bp.Q.setValueAtTime(2.6, startTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(Math.min(0.024, Math.max(0.002, volume)), startTime + 0.0012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  src.connect(bp);
  bp.connect(gain);
  gain.connect(dest);

  src.start(startTime);
  src.stop(startTime + duration + 0.004);
}

/** Shapes a struck-bar partial with crisp attack, brief strike dip, optional bloom, and smooth decay. */
function playResonatorPartial(ctx, dest, startTime, freq, env, type = 'sine') {
  const {
    peak,
    attack = 0.0025,
    dip = null,
    dipAt = null,
    bloom = null,
    bloomAt = null,
    dur = 0.25
  } = env;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(Math.max(0.001, peak), startTime + attack);

  if (dip != null && dipAt != null && dipAt > attack && dipAt < dur) {
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0005, dip), startTime + dipAt);
  }
  if (bloom != null && bloomAt != null && bloomAt > (dipAt || attack) && bloomAt < dur) {
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0005, bloom), startTime + bloomAt);
  }

  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + dur + 0.02);
}

export function playCorrectSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    // DET "Great job!" ascending struck-bar bell chime (+128ms spacing, ~360ms tail)
    // Note 1 (t = 0.000s): F#6 primary + 2.075x chime transient + F#5/F#4 warmth
    const t1 = now;
    playResonatorPartial(ctx, dest, t1, 1484.5, {
      peak: 0.26, attack: 0.003, dip: 0.13, dipAt: 0.016, bloom: 0.19, bloomAt: 0.042, dur: 0.34
    });
    playResonatorPartial(ctx, dest, t1, 3080.0, { peak: 0.032, attack: 0.002, dur: 0.085 });
    playResonatorPartial(ctx, dest, t1, 740.0, {
      peak: 0.022, attack: 0.004, bloom: 0.036, bloomAt: 0.024, dur: 0.35
    });
    playResonatorPartial(ctx, dest, t1, 370.0, {
      peak: 0.018, attack: 0.004, bloom: 0.032, bloomAt: 0.018, dur: 0.34
    });

    // Note 2 (t = +0.128s): A#6 primary + 2.072x sparkle + F#7 shimmer + A#5 body
    const t2 = now + 0.128;
    playResonatorPartial(ctx, dest, t2, 1871.5, {
      peak: 0.22, attack: 0.004, dip: 0.16, dipAt: 0.014, bloom: 0.23, bloomAt: 0.030, dur: 0.24
    });
    playResonatorPartial(ctx, dest, t2, 3878.0, { peak: 0.038, attack: 0.003, dur: 0.065 });
    playResonatorPartial(ctx, dest, t2, 2976.0, {
      peak: 0.018, attack: 0.004, bloom: 0.030, bloomAt: 0.032, dur: 0.22
    });
    playResonatorPartial(ctx, dest, t2, 932.3, {
      peak: 0.018, attack: 0.004, bloom: 0.030, bloomAt: 0.022, dur: 0.24
    });
  });
}

export function playPartialSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    // Clean two-step bell cue in F# (F#6 -> G#6) sharing the same noise-free resonator timbre
    const t1 = now;
    playResonatorPartial(ctx, dest, t1, 1484.5, {
      peak: 0.21, attack: 0.003, dip: 0.11, dipAt: 0.016, bloom: 0.15, bloomAt: 0.040, dur: 0.28
    });
    playResonatorPartial(ctx, dest, t1, 3080.0, { peak: 0.026, attack: 0.002, dur: 0.075 });
    playResonatorPartial(ctx, dest, t1, 740.0, {
      peak: 0.018, attack: 0.004, bloom: 0.028, bloomAt: 0.022, dur: 0.28
    });

    const t2 = now + 0.128;
    playResonatorPartial(ctx, dest, t2, 1661.2, {
      peak: 0.20, attack: 0.004, dip: 0.14, dipAt: 0.014, bloom: 0.19, bloomAt: 0.030, dur: 0.24
    });
    playResonatorPartial(ctx, dest, t2, 3440.0, { peak: 0.028, attack: 0.003, dur: 0.060 });
    playResonatorPartial(ctx, dest, t2, 830.6, {
      peak: 0.016, attack: 0.004, bloom: 0.026, bloomAt: 0.022, dur: 0.24
    });
  });
}

export function playWrongSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    // DET "Incorrect" woody tritone marimba drop (+130ms spacing, heavier 2nd strike)
    // Note 1 (t = 0.000s, softer): F#5 + 2.065x woody overtone + F#4 warmth + short wood knock
    const t1 = now;
    playMalletClick(ctx, dest, t1, 2600, 0.018, 0.008);
    playResonatorPartial(ctx, dest, t1, 740.0, {
      peak: 0.068, attack: 0.003, dip: 0.056, dipAt: 0.035, dur: 0.22
    });
    playResonatorPartial(ctx, dest, t1, 1528.0, { peak: 0.058, attack: 0.003, dur: 0.11 });
    playResonatorPartial(ctx, dest, t1, 369.5, {
      peak: 0.020, attack: 0.004, bloom: 0.030, bloomAt: 0.018, dur: 0.24
    });
    playResonatorPartial(ctx, dest, t1, 4250.0, { peak: 0.034, attack: 0.002, dur: 0.026 });

    // Note 2 (t = +0.130s, ~3x heavier & punchy): C5 primary + 2.055x mode + wood knocks + sub-thump
    const t2 = now + 0.130;
    playMalletClick(ctx, dest, t2, 2200, 0.024, 0.009);
    playResonatorPartial(ctx, dest, t2, 522.5, {
      peak: 0.26, attack: 0.004, dip: 0.15, dipAt: 0.018, bloom: 0.17, bloomAt: 0.032, dur: 0.25
    });
    playResonatorPartial(ctx, dest, t2, 1074.0, { peak: 0.074, attack: 0.004, dur: 0.16 });
    playResonatorPartial(ctx, dest, t2, 2975.0, { peak: 0.044, attack: 0.002, dur: 0.055 });
    playResonatorPartial(ctx, dest, t2, 4439.0, { peak: 0.056, attack: 0.002, dur: 0.040 });
    playResonatorPartial(ctx, dest, t2, 369.5, { peak: 0.020, attack: 0.010, dur: 0.22 });
    playResonatorPartial(ctx, dest, t2, 131.0, { peak: 0.016, attack: 0.006, dur: 0.090 });
  });
}

export function playCompleteSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    // Celebratory F# major resonator arpeggio in matching clean DET instrument
    const notes = [
      { dt: 0.0, hz: 740.0, dur: 0.24, vol: 0.16 },
      { dt: 0.095, hz: 932.3, dur: 0.24, vol: 0.17 },
      { dt: 0.19, hz: 1108.7, dur: 0.26, vol: 0.18 },
      { dt: 0.285, hz: 1484.5, dur: 0.42, vol: 0.23 }
    ];
    for (const n of notes) {
      const t = now + n.dt;
      playResonatorPartial(ctx, dest, t, n.hz, {
        peak: n.vol, attack: 0.003, dip: n.vol * 0.62, dipAt: 0.015, bloom: n.vol * 0.85, bloomAt: 0.036, dur: n.dur
      });
      playResonatorPartial(ctx, dest, t, n.hz * 0.5, {
        peak: n.vol * 0.16, attack: 0.004, dur: n.dur
      });
      playResonatorPartial(ctx, dest, t, n.hz * 2.075, {
        peak: n.vol * 0.16, attack: 0.002, dur: 0.075
      });
    }
    playResonatorPartial(ctx, dest, now + 0.285, 1871.5, {
      peak: 0.11, attack: 0.004, bloom: 0.12, bloomAt: 0.030, dur: 0.36
    });
  });
}

export function playTimeoutSound(enabled = true) {
  if (!enabled) return;
  playWrongSound(enabled);
}

export function playTapSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.018);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.025);
  });
}
