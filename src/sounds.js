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

function playToneSequence(notes, { volume = 0.14, type = 'sine' } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  for (const { freq, delay = 0, duration = 0.12, wave = type, gainScale = 1 } of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, now + delay);

    const peak = Math.max(0.01, volume * gainScale);
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(peak, now + delay + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + duration + 0.02);
  }
}

export function playCorrectSound(enabled = true) {
  if (!enabled) return;
  playToneSequence([
    { freq: 523.25, delay: 0, duration: 0.1, wave: 'triangle' },      // C5
    { freq: 783.99, delay: 0.085, duration: 0.16, wave: 'triangle' }   // G5
  ], { volume: 0.15 });
}

export function playWrongSound(enabled = true) {
  if (!enabled) return;
  playToneSequence([
    { freq: 196.0, delay: 0, duration: 0.11, wave: 'sawtooth', gainScale: 0.55 },     // G3
    { freq: 146.83, delay: 0.09, duration: 0.16, wave: 'sawtooth', gainScale: 0.55 }  // D3
  ], { volume: 0.13 });
}

export function playCompleteSound(enabled = true) {
  if (!enabled) return;
  playToneSequence([
    { freq: 523.25, delay: 0, duration: 0.1, wave: 'triangle' },       // C5
    { freq: 659.25, delay: 0.08, duration: 0.1, wave: 'triangle' },    // E5
    { freq: 783.99, delay: 0.16, duration: 0.1, wave: 'triangle' },    // G5
    { freq: 1046.5, delay: 0.24, duration: 0.24, wave: 'triangle' }    // C6
  ], { volume: 0.16 });
}

export function playTimeoutSound(enabled = true) {
  if (!enabled) return;
  playToneSequence([
    { freq: 440, delay: 0, duration: 0.08, wave: 'sine', gainScale: 0.7 },
    { freq: 440, delay: 0.12, duration: 0.1, wave: 'sine', gainScale: 0.7 }
  ], { volume: 0.11 });
}
