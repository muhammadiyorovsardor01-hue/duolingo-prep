let sharedAudioCtx = null;
let sharedMasterOut = null;

function ensureMasterBus(ctx) {
  if (sharedMasterOut && sharedMasterOut.context === ctx) {
    return sharedMasterOut;
  }
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-12, ctx.currentTime);
  limiter.knee.setValueAtTime(16, ctx.currentTime);
  limiter.ratio.setValueAtTime(6, ctx.currentTime);
  limiter.attack.setValueAtTime(0.002, ctx.currentTime);
  limiter.release.setValueAtTime(0.12, ctx.currentTime);

  const warmth = ctx.createBiquadFilter();
  warmth.type = 'lowpass';
  warmth.frequency.setValueAtTime(5200, ctx.currentTime);
  warmth.Q.setValueAtTime(0.5, ctx.currentTime);

  warmth.connect(limiter);
  limiter.connect(ctx.destination);
  sharedMasterOut = warmth;
  return sharedMasterOut;
}

function withAudioContext(fn) {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtx();
      sharedMasterOut = null;
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

/** Synthesizes Duolingo's glassy marimba/celesta chime note with warm sub-octave body. */
function playDuoChimeNote(ctx, dest, startTime, freq, duration, volume = 0.22, opts = {}) {
  const { bodyOctave = true, fifthHz = 0 } = opts;
  const peak = Math.max(0.005, volume);

  const fundOsc = ctx.createOscillator();
  const fundGain = ctx.createGain();
  fundOsc.type = 'sine';
  fundOsc.frequency.setValueAtTime(freq, startTime);
  fundGain.gain.setValueAtTime(0.0001, startTime);
  fundGain.gain.linearRampToValueAtTime(peak, startTime + 0.003);
  fundGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  fundOsc.connect(fundGain);
  fundGain.connect(dest);

  // Bell/celesta 2x mallet transient
  const overOsc = ctx.createOscillator();
  const overGain = ctx.createGain();
  overOsc.type = 'triangle';
  overOsc.frequency.setValueAtTime(freq * 2, startTime);
  overGain.gain.setValueAtTime(0.0001, startTime);
  overGain.gain.linearRampToValueAtTime(peak * 0.22, startTime + 0.002);
  overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(duration * 0.45, 0.075));
  overOsc.connect(overGain);
  overGain.connect(dest);

  // Crisp upper sparkle 3x
  const sparkleOsc = ctx.createOscillator();
  const sparkleGain = ctx.createGain();
  sparkleOsc.type = 'sine';
  sparkleOsc.frequency.setValueAtTime(freq * 3, startTime);
  sparkleGain.gain.setValueAtTime(0.0001, startTime);
  sparkleGain.gain.linearRampToValueAtTime(peak * 0.07, startTime + 0.002);
  sparkleGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.04);
  sparkleOsc.connect(sparkleGain);
  sparkleGain.connect(dest);

  const stopAt = startTime + duration + 0.03;
  fundOsc.start(startTime);
  overOsc.start(startTime);
  sparkleOsc.start(startTime);
  fundOsc.stop(stopAt);
  overOsc.stop(startTime + 0.09);
  sparkleOsc.stop(startTime + 0.055);

  if (bodyOctave) {
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    const bodyDur = Math.min(duration * 0.75, 0.22);
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(freq * 0.5, startTime);
    bodyGain.gain.setValueAtTime(0.0001, startTime);
    bodyGain.gain.linearRampToValueAtTime(peak * 0.28, startTime + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startTime + bodyDur);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(dest);
    bodyOsc.start(startTime);
    bodyOsc.stop(startTime + bodyDur + 0.03);
  }

  if (fifthHz > 0) {
    const fifthOsc = ctx.createOscillator();
    const fifthGain = ctx.createGain();
    fifthOsc.type = 'sine';
    fifthOsc.frequency.setValueAtTime(fifthHz, startTime);
    fifthGain.gain.setValueAtTime(0.0001, startTime);
    fifthGain.gain.linearRampToValueAtTime(peak * 0.14, startTime + 0.008);
    fifthGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.85);
    fifthOsc.connect(fifthGain);
    fifthGain.connect(dest);
    fifthOsc.start(startTime);
    fifthOsc.stop(stopAt);
  }
}

/** Synthesizes Duolingo's muted-brass/rubbery descending wrong note with subtle tritone bite. */
function playDuoWrongNote(ctx, dest, startTime, startFreq, endFreq, duration, volume = 0.22, opts = {}) {
  const { tritoneHz = 0, filterStart = 1550, filterEnd = 420 } = opts;
  const peak = Math.max(0.005, volume);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.setValueAtTime(1.4, startTime);
  filter.frequency.setValueAtTime(filterStart, startTime);
  filter.frequency.exponentialRampToValueAtTime(Math.max(120, filterEnd), startTime + duration);
  filter.connect(dest);

  const sawOsc = ctx.createOscillator();
  const sawGain = ctx.createGain();
  sawOsc.type = 'sawtooth';
  sawOsc.frequency.setValueAtTime(startFreq, startTime);
  if (endFreq && endFreq !== startFreq) {
    sawOsc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), startTime + duration);
  }
  sawGain.gain.setValueAtTime(0.0001, startTime);
  sawGain.gain.linearRampToValueAtTime(peak * 0.34, startTime + 0.005);
  sawGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  sawOsc.connect(sawGain);
  sawGain.connect(filter);

  const triOsc = ctx.createOscillator();
  const triGain = ctx.createGain();
  triOsc.type = 'triangle';
  triOsc.frequency.setValueAtTime(startFreq, startTime);
  if (endFreq && endFreq !== startFreq) {
    triOsc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), startTime + duration);
  }
  triGain.gain.setValueAtTime(0.0001, startTime);
  triGain.gain.linearRampToValueAtTime(peak * 0.56, startTime + 0.004);
  triGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  triOsc.connect(triGain);
  triGain.connect(filter);

  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(startFreq * 0.5, startTime);
  if (endFreq && endFreq !== startFreq) {
    subOsc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq * 0.5), startTime + duration);
  }
  subGain.gain.setValueAtTime(0.0001, startTime);
  subGain.gain.linearRampToValueAtTime(peak * 0.28, startTime + 0.005);
  subGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.9);
  subOsc.connect(subGain);
  subGain.connect(filter);

  const stopAt = startTime + duration + 0.03;
  sawOsc.start(startTime);
  triOsc.start(startTime);
  subOsc.start(startTime);
  sawOsc.stop(stopAt);
  triOsc.stop(stopAt);
  subOsc.stop(stopAt);

  if (tritoneHz > 0) {
    const tritoneOsc = ctx.createOscillator();
    const tritoneGain = ctx.createGain();
    const triDur = Math.min(duration * 0.72, 0.16);
    tritoneOsc.type = 'triangle';
    tritoneOsc.frequency.setValueAtTime(tritoneHz, startTime);
    tritoneGain.gain.setValueAtTime(0.0001, startTime);
    tritoneGain.gain.linearRampToValueAtTime(peak * 0.15, startTime + 0.004);
    tritoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + triDur);
    tritoneOsc.connect(tritoneGain);
    tritoneGain.connect(filter);
    tritoneOsc.start(startTime);
    tritoneOsc.stop(startTime + triDur + 0.02);
  }
}

export function playCorrectSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    // Authentic Duolingo ascending major 3rd in F# major: F#5 -> A#5 ("ba-DING!")
    playDuoChimeNote(ctx, dest, now, 739.99, 0.13, 0.21, { bodyOctave: true });
    playDuoChimeNote(ctx, dest, now + 0.092, 932.33, 0.42, 0.24, {
      bodyOctave: true,
      fifthHz: 1108.73 // Soft C#6 shimmer
    });
  });
}

export function playPartialSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    // Soft F#5 -> G#5 major-second chime
    playDuoChimeNote(ctx, dest, now, 739.99, 0.12, 0.18, { bodyOctave: true });
    playDuoChimeNote(ctx, dest, now + 0.095, 830.61, 0.32, 0.19, { bodyOctave: true });
  });
}

export function playWrongSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    // Authentic Duolingo descending muted-brass/synth drop ("bwuh-bwomp")
    playDuoWrongNote(ctx, dest, now, 329.63, 322.0, 0.115, 0.22, {
      tritoneHz: 466.16,
      filterStart: 1600,
      filterEnd: 520
    });
    playDuoWrongNote(ctx, dest, now + 0.112, 261.63, 233.08, 0.27, 0.24, {
      tritoneHz: 369.99,
      filterStart: 1250,
      filterEnd: 340
    });
  });
}

export function playCompleteSound(enabled = true) {
  if (!enabled) return;
  withAudioContext((ctx, dest, now) => {
    // Celebratory F# major arpeggio: F#5 -> A#5 -> C#6 -> F#6 + chord glow
    playDuoChimeNote(ctx, dest, now, 739.99, 0.15, 0.19, { bodyOctave: true });
    playDuoChimeNote(ctx, dest, now + 0.085, 932.33, 0.15, 0.19, { bodyOctave: true });
    playDuoChimeNote(ctx, dest, now + 0.17, 1108.73, 0.18, 0.20, { bodyOctave: true });
    playDuoChimeNote(ctx, dest, now + 0.255, 1479.98, 0.52, 0.22, {
      bodyOctave: true,
      fifthHz: 1108.73
    });
    playDuoChimeNote(ctx, dest, now + 0.255, 932.33, 0.44, 0.09, { bodyOctave: false });
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
