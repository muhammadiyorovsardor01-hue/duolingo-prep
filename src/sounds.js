let sharedAudioCtx = null;
let sharedMasterOut = null;
let sharedNoiseBuf = null;

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
  const length = Math.max(1, Math.round(ctx.sampleRate * 0.02));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  sharedNoiseBuf = buffer;
  return sharedNoiseBuf;
}

function withAudioContext(fn) {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtx();
      sharedMasterOut = null;
      sharedNoiseBuf = null;
    } catch {
      return;
    }
  }

  const ctx = sharedAudioCtx;
  const run = () => {
    try {
      const dest = ensureMasterBus(ctx);
      fn(ctx, dest, ctx.currentTime + 0.004);
    } catch {}
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(run).catch(() => {});
  } else {
    run();
  }
}

/** Synthesizes the crisp physical mallet-on-bar transient spike. */
function playMalletClick(ctx, dest, startTime, centerHz, volume, duration = 0.014) {
  const src = ctx.createBufferSource();
  src.buffer = getMalletNoiseBuffer(ctx);

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(centerHz, startTime);
  bp.Q.setValueAtTime(2.2, startTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(Math.max(0.005, volume), startTime + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  src.connect(bp);
  bp.connect(gain);
  gain.connect(dest);

  src.start(startTime);
  src.stop(startTime + duration + 0.006);
}

/** Schedules a clean single partial oscillator with percussive attack and exponential decay. */
function playPartial(ctx, dest, startTime, freq, duration, gainPeak, type = 'sine', attack = 0.0025) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(Math.max(0.002, gainPeak), startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.025);
}

export function playCorrectSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    // Exact DET Read & Select "Great job!" bell chime (FFT-measured from official DET):
    // Note 1 (t=0ms): F#6 (1484 Hz) + 2.075x stretched partial (3080 Hz) + F#5/F#4 body
    const t1 = now;
    playMalletClick(ctx, dest, t1, 3600, 0.14, 0.014);
    playPartial(ctx, dest, t1, 1484.0, 0.46, 0.24, 'sine', 0.0025);
    playPartial(ctx, dest, t1, 1487.5, 0.24, 0.04, 'sine', 0.003);
    playPartial(ctx, dest, t1, 740.0, 0.48, 0.036, 'sine', 0.004);
    playPartial(ctx, dest, t1, 370.0, 0.46, 0.022, 'sine', 0.005);
    playPartial(ctx, dest, t1, 3080.0, 0.095, 0.042, 'sine', 0.0018);

    // Note 2 (t=+125ms): A#6 (1871 Hz) + F#7 bloom (2978 Hz) + 2.073x stretched partial (3878 Hz)
    const t2 = now + 0.125;
    playMalletClick(ctx, dest, t2, 4200, 0.16, 0.014);
    playPartial(ctx, dest, t2, 1871.0, 0.42, 0.27, 'sine', 0.0025);
    playPartial(ctx, dest, t2, 1874.5, 0.22, 0.045, 'sine', 0.003);
    playPartial(ctx, dest, t2, 935.0, 0.44, 0.052, 'sine', 0.004);
    playPartial(ctx, dest, t2, 2978.0, 0.36, 0.048, 'sine', 0.0025);
    playPartial(ctx, dest, t2, 3878.0, 0.08, 0.044, 'sine', 0.0018);
  });
}

export function playPartialSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    // Soft crystalline bell interval in F# (F#6 -> G#6)
    const t1 = now;
    playMalletClick(ctx, dest, t1, 3500, 0.11, 0.013);
    playPartial(ctx, dest, t1, 1484.0, 0.34, 0.20, 'sine', 0.0025);
    playPartial(ctx, dest, t1, 740.0, 0.36, 0.032, 'sine', 0.004);
    playPartial(ctx, dest, t1, 3080.0, 0.085, 0.034, 'sine', 0.0018);

    const t2 = now + 0.125;
    playMalletClick(ctx, dest, t2, 3800, 0.12, 0.013);
    playPartial(ctx, dest, t2, 1661.2, 0.38, 0.22, 'sine', 0.0025);
    playPartial(ctx, dest, t2, 830.6, 0.38, 0.04, 'sine', 0.004);
    playPartial(ctx, dest, t2, 3440.0, 0.075, 0.032, 'sine', 0.0018);
  });
}

export function playWrongSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    // Exact DET Read & Select "Incorrect" tritone marimba/bell drop (FFT-measured from official DET):
    // Note 1 (t=0ms, softer): F#5 (742 Hz) + 2.06x woody mode (1528 Hz), ringing into Note 2
    const t1 = now;
    playMalletClick(ctx, dest, t1, 3200, 0.09, 0.013);
    playPartial(ctx, dest, t1, 742.0, 0.36, 0.13, 'sine', 0.0025);
    playPartial(ctx, dest, t1, 1528.0, 0.12, 0.105, 'sine', 0.002);
    playPartial(ctx, dest, t1, 370.0, 0.38, 0.054, 'triangle', 0.004);
    playPartial(ctx, dest, t1, 4253.0, 0.055, 0.052, 'sine', 0.0015);

    // Note 2 (t=+125ms, heavier): C5 (523.5 Hz) + 2.05x mode (1074 Hz) + crisp knock transients
    const t2 = now + 0.125;
    playMalletClick(ctx, dest, t2, 2800, 0.15, 0.015);
    playPartial(ctx, dest, t2, 523.5, 0.38, 0.27, 'sine', 0.0025);
    playPartial(ctx, dest, t2, 523.5, 0.18, 0.06, 'triangle', 0.003);
    playPartial(ctx, dest, t2, 1074.0, 0.30, 0.085, 'sine', 0.0025);
    playPartial(ctx, dest, t2, 261.75, 0.24, 0.045, 'sine', 0.004);
    playPartial(ctx, dest, t2, 2972.0, 0.08, 0.042, 'sine', 0.0018);
    playPartial(ctx, dest, t2, 4436.0, 0.055, 0.048, 'sine', 0.0015);
  });
}

export function playCompleteSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    // Celebratory F# major bell arpeggio in matching crystalline 2.07x instrument
    const notes = [
      { dt: 0.0, hz: 740.0, dur: 0.24, vol: 0.18, mallet: 2800 },
      { dt: 0.095, hz: 932.3, dur: 0.24, vol: 0.19, mallet: 3200 },
      { dt: 0.19, hz: 1108.7, dur: 0.26, vol: 0.20, mallet: 3600 },
      { dt: 0.285, hz: 1484.0, dur: 0.50, vol: 0.25, mallet: 4000 }
    ];
    for (const n of notes) {
      const t = now + n.dt;
      playMalletClick(ctx, dest, t, n.mallet, n.vol * 0.55, 0.013);
      playPartial(ctx, dest, t, n.hz, n.dur, n.vol, 'sine', 0.0025);
      playPartial(ctx, dest, t, n.hz * 0.5, n.dur, n.vol * 0.18, 'sine', 0.004);
      playPartial(ctx, dest, t, n.hz * 2.073, 0.085, n.vol * 0.18, 'sine', 0.0018);
    }
    // Chord glow on resolution
    playPartial(ctx, dest, now + 0.285, 1871.0, 0.44, 0.10, 'sine', 0.004);
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
