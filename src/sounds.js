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

function playMarimbaNote(ctx, startTime, freq, duration, volume = 0.18) {
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
  fundGain.gain.linearRampToValueAtTime(peak, startTime + 0.003);
  fundGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  overGain.gain.setValueAtTime(0.0001, startTime);
  overGain.gain.linearRampToValueAtTime(peak * 0.24, startTime + 0.0025);
  overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(duration * 0.55, 0.14));

  sparkleGain.gain.setValueAtTime(0.0001, startTime);
  sparkleGain.gain.linearRampToValueAtTime(peak * 0.09, startTime + 0.002);
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

function playWoodyNote(ctx, startTime, freq, endFreq, duration, volume = 0.21, cutoffHz = 950) {
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
  triGain.gain.linearRampToValueAtTime(peak * 0.65, startTime + 0.005);
  triGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  sineGain.gain.setValueAtTime(0.0001, startTime);
  sineGain.gain.linearRampToValueAtTime(peak * 0.55, startTime + 0.005);
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
  playMarimbaNote(ctx, now, 880.0, 0.11, 0.18);            // A5
  playMarimbaNote(ctx, now + 0.078, 1174.66, 0.38, 0.18);  // D6
}

export function playPartialSound(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playMarimbaNote(ctx, now, 783.99, 0.11, 0.17);           // G5
  playMarimbaNote(ctx, now + 0.082, 987.77, 0.32, 0.17);   // B5
}

export function playWrongSound(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playWoodyNote(ctx, now, 311.13, 305.0, 0.115, 0.21, 1100);       // Eb4
  playWoodyNote(ctx, now + 0.115, 261.63, 252.0, 0.24, 0.21, 950); // C4 gentle drop
}

export function playCompleteSound(enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playMarimbaNote(ctx, now, 698.46, 0.14, 0.17);           // F5
  playMarimbaNote(ctx, now + 0.075, 880.0, 0.14, 0.17);    // A5
  playMarimbaNote(ctx, now + 0.15, 1046.5, 0.16, 0.18);    // C6
  playMarimbaNote(ctx, now + 0.225, 1396.91, 0.45, 0.20);  // F6
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
