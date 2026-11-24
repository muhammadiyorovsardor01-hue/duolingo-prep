let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playMarimbaNote(ctx, startTime, freq, duration, volume = 0.2) {
  const fundOsc = ctx.createOscillator();
  const fundGain = ctx.createGain();
  fundOsc.type = 'sine';
  fundOsc.frequency.setValueAtTime(freq, startTime);

  const overOsc = ctx.createOscillator();
  const overGain = ctx.createGain();
  overOsc.type = 'triangle';
  overOsc.frequency.setValueAtTime(freq * 2, startTime);

  const sparkleOsc = ctx.createOscillator();
  const sparkleGain = ctx.createGain();
  sparkleOsc.type = 'sine';
  sparkleOsc.frequency.setValueAtTime(freq * 3, startTime);

  const peak = Math.max(0.005, volume);
  fundGain.gain.setValueAtTime(0.0001, startTime);
  fundGain.gain.linearRampToValueAtTime(peak, startTime + 0.004);
  fundGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  overGain.gain.setValueAtTime(0.0001, startTime);
  overGain.gain.linearRampToValueAtTime(peak * 0.26, startTime + 0.003);
  overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(duration * 0.55, 0.14));

  sparkleGain.gain.setValueAtTime(0.0001, startTime);
  sparkleGain.gain.linearRampToValueAtTime(peak * 0.08, startTime + 0.002);
  sparkleGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.06);

  fundOsc.connect(fundGain);
  overOsc.connect(overGain);
  sparkleOsc.connect(sparkleGain);

  fundGain.connect(ctx.destination);
  overGain.connect(ctx.destination);
  sparkleGain.connect(ctx.destination);

  const stopAt = startTime + duration + 0.025;
  fundOsc.start(startTime);
  overOsc.start(startTime);
  sparkleOsc.start(startTime);
  fundOsc.stop(stopAt);
  overOsc.stop(stopAt);
  sparkleOsc.stop(startTime + 0.08);
}

function playWoodyNote(ctx, startTime, freq, endFreq, duration, volume = 0.22, cutoffHz = 560) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoffHz, startTime);
  filter.Q.setValueAtTime(0.7, startTime);
  filter.connect(ctx.destination);

  const triOsc = ctx.createOscillator();
  const triGain = ctx.createGain();
  triOsc.type = 'triangle';
  triOsc.frequency.setValueAtTime(freq, startTime);
  if (endFreq && endFreq !== freq) {
    triOsc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), startTime + duration);
  }

  const sineOsc = ctx.createOscillator();
  const sineGain = ctx.createGain();
  sineOsc.type = 'sine';
  sineOsc.frequency.setValueAtTime(freq, startTime);
  if (endFreq && endFreq !== freq) {
    sineOsc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), startTime + duration);
  }

  const peak = Math.max(0.005, volume);
  triGain.gain.setValueAtTime(0.0001, startTime);
  triGain.gain.linearRampToValueAtTime(peak * 0.65, startTime + 0.006);
  triGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  sineGain.gain.setValueAtTime(0.0001, startTime);
  sineGain.gain.linearRampToValueAtTime(peak * 0.55, startTime + 0.006);
  sineGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  triOsc.connect(triGain);
  sineOsc.connect(sineGain);
  triGain.connect(filter);
  sineGain.connect(filter);

  const stopAt = startTime + duration + 0.025;
  triOsc.start(startTime);
  sineOsc.start(startTime);
  triOsc.stop(stopAt);
  sineOsc.stop(stopAt);
}

export function playCorrectSound(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playMarimbaNote(ctx, now, 587.33, 0.13, 0.20);           // D5
  playMarimbaNote(ctx, now + 0.092, 783.99, 0.36, 0.20);   // G5
}

export function playWrongSound(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playWoodyNote(ctx, now, 246.94, 240.0, 0.11, 0.22, 620);         // B3
  playWoodyNote(ctx, now + 0.115, 185.0, 170.0, 0.22, 0.22, 500);  // F#3 bend down
}

export function playCompleteSound(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playMarimbaNote(ctx, now, 587.33, 0.16, 0.19);            // D5
  playMarimbaNote(ctx, now + 0.085, 739.99, 0.16, 0.19);    // F#5
  playMarimbaNote(ctx, now + 0.17, 880.0, 0.18, 0.19);      // A5
  playMarimbaNote(ctx, now + 0.255, 1174.66, 0.45, 0.22);   // D6
}

export function playTimeoutSound(enabled = true) {
  if (!enabled) return;
  playWrongSound(enabled);
}

export function playTapSound(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(560, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.018);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.035, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.025);
}
