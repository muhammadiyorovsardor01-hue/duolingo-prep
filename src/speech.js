let activeUtterance = null;
let speakToken = 0;
let pendingSpeakTimer = null;
let startWatchdogTimer = null;

let sharedAudio = null;
let activeAbortController = null;
const ttsBlobCache = new Map();
const MAX_TTS_CACHE = 40;
const SERVER_TTS_TIMEOUT_MS = 6000;
const SILENT_WAV_DATA_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

function clearTimers() {
  if (pendingSpeakTimer) {
    clearTimeout(pendingSpeakTimer);
    pendingSpeakTimer = null;
  }
  if (startWatchdogTimer) {
    clearTimeout(startWatchdogTimer);
    startWatchdogTimer = null;
  }
}

function detachAudioHandlers(audioEl) {
  if (!audioEl) return;
  audioEl.onplaying = null;
  audioEl.onended = null;
  audioEl.onerror = null;
}

function cacheBlobUrl(textKey, blobUrl) {
  if (ttsBlobCache.has(textKey)) {
    const oldUrl = ttsBlobCache.get(textKey);
    ttsBlobCache.delete(textKey);
    if (oldUrl && oldUrl !== blobUrl) {
      try { URL.revokeObjectURL(oldUrl); } catch {}
    }
  }
  while (ttsBlobCache.size >= MAX_TTS_CACHE) {
    const oldestKey = ttsBlobCache.keys().next().value;
    const oldestUrl = ttsBlobCache.get(oldestKey);
    ttsBlobCache.delete(oldestKey);
    if (oldestUrl) {
      try { URL.revokeObjectURL(oldestUrl); } catch {}
    }
  }
  ttsBlobCache.set(textKey, blobUrl);
}

export function getEnglishVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices() || [];
  return voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
}

export function unlockSpeech() {
  if (typeof window === 'undefined') return;
  try {
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      synth.getVoices();
      if (synth.paused) {
        synth.resume();
      }
    }
  } catch {}

  try {
    if (typeof Audio !== 'undefined') {
      sharedAudio = sharedAudio || new Audio();
      if (sharedAudio.paused && !sharedAudio.currentSrc) {
        sharedAudio.volume = 0;
        sharedAudio.src = SILENT_WAV_DATA_URI;
        const p = sharedAudio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      }
    }
  } catch {}
}

export function stopSpeaking() {
  speakToken += 1;
  clearTimers();
  activeUtterance = null;

  if (activeAbortController) {
    try { activeAbortController.abort(); } catch {}
    activeAbortController = null;
  }

  if (sharedAudio) {
    detachAudioHandlers(sharedAudio);
    try { sharedAudio.pause(); } catch {}
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

function selectReliableVoice(voiceName) {
  const voices = getEnglishVoices();
  if (!voices.length) return null;
  if (voiceName) {
    const exact = voices.find((v) => v.name === voiceName);
    if (exact) return exact;
  }
  // Prefer reliable local OS voices over network-dependent Google voices
  const localEnUs = voices.find((v) => v.localService && /en[-_]?us/i.test(v.lang));
  if (localEnUs) return localEnUs;
  const localEn = voices.find((v) => v.localService);
  if (localEn) return localEn;
  const anyEnUs = voices.find((v) => /en[-_]?us/i.test(v.lang));
  return anyEnUs || voices[0];
}

export function speakText(text, { rate = 1.0, voiceName = '', onStart, onEnd, onError } = {}) {
  if (typeof window === 'undefined') {
    onError?.('Audio playback requires a browser environment.');
    return;
  }

  const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleanText) {
    onError?.('Empty audio text');
    return;
  }

  stopSpeaking();
  const myToken = speakToken;
  const clampedRate = Math.max(0.7, Math.min(1.4, Number(rate) || 1.0));

  const playViaSpeechSynthesis = () => {
    if (myToken !== speakToken) return;
    if (!('speechSynthesis' in window)) {
      onError?.('Audio playback is unavailable in this browser.');
      return;
    }

    const synth = window.speechSynthesis;
    const wasBusy = synth.speaking || synth.pending;
    if (wasBusy) {
      try { synth.cancel(); } catch {}
    }

    const launchUtterance = (useSystemDefault = false) => {
      if (myToken !== speakToken) return;
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.lang = 'en-US';
      utter.rate = clampedRate;
      utter.volume = 1.0;

      if (!useSystemDefault) {
        const chosen = selectReliableVoice(voiceName);
        if (chosen) utter.voice = chosen;
      }

      let started = false;
      let settled = false;
      activeUtterance = utter;

      utter.onstart = () => {
        if (myToken !== speakToken || settled) return;
        started = true;
        if (startWatchdogTimer) {
          clearTimeout(startWatchdogTimer);
          startWatchdogTimer = null;
        }
        onStart?.();
      };

      utter.onend = () => {
        if (myToken !== speakToken || settled) return;
        settled = true;
        clearTimers();
        activeUtterance = null;
        onEnd?.();
      };

      utter.onerror = (ev) => {
        if (myToken !== speakToken || settled) return;
        settled = true;
        clearTimers();
        activeUtterance = null;
        if (!useSystemDefault && !started) {
          pendingSpeakTimer = setTimeout(() => launchUtterance(true), 60);
          return;
        }
        onError?.(ev?.error || 'Audio playback error');
      };

      try {
        if (synth.paused) synth.resume();
        synth.speak(utter);
        if (synth.paused) synth.resume();
      } catch (err) {
        settled = true;
        activeUtterance = null;
        onError?.(err?.message || 'Speech playback failed');
        return;
      }

      // Watchdog: if onstart never fires within 1500ms, retry once with default OS voice then report blocked
      startWatchdogTimer = setTimeout(() => {
        if (myToken !== speakToken || started || settled) return;
        settled = true;
        try { synth.cancel(); } catch {}
        activeUtterance = null;
        if (!useSystemDefault) {
          pendingSpeakTimer = setTimeout(() => launchUtterance(true), 60);
        } else {
          onError?.('playback_blocked');
        }
      }, 1500);
    };

    if (wasBusy) {
      pendingSpeakTimer = setTimeout(() => launchUtterance(false), 60);
    } else {
      launchUtterance(false);
    }
  };

  const playViaServerTts = async () => {
    if (typeof Audio === 'undefined' || typeof fetch === 'undefined') {
      playViaSpeechSynthesis();
      return;
    }

    let blobUrl = ttsBlobCache.get(cleanText) || '';

    if (!blobUrl) {
      const controller = new AbortController();
      activeAbortController = controller;
      const fetchTimer = setTimeout(() => controller.abort(), SERVER_TTS_TIMEOUT_MS);

      try {
        const res = await fetch(`/api/tts?q=${encodeURIComponent(cleanText)}`, {
          method: 'GET',
          signal: controller.signal
        });
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (!res.ok || !contentType.includes('audio')) {
          throw new Error(`Invalid TTS response (${res.status} ${contentType})`);
        }
        const blob = await res.blob();
        if (!blob || blob.size <= 100) {
          throw new Error('TTS returned empty audio blob');
        }
        blobUrl = URL.createObjectURL(blob);
        cacheBlobUrl(cleanText, blobUrl);
      } catch {
        clearTimeout(fetchTimer);
        if (activeAbortController === controller) {
          activeAbortController = null;
        }
        if (myToken !== speakToken) return;
        playViaSpeechSynthesis();
        return;
      } finally {
        clearTimeout(fetchTimer);
        if (activeAbortController === controller) {
          activeAbortController = null;
        }
      }
    }

    if (myToken !== speakToken) return;

    sharedAudio = sharedAudio || new Audio();
    detachAudioHandlers(sharedAudio);

    let started = false;
    let finished = false;

    sharedAudio.volume = 1.0;
    sharedAudio.src = blobUrl;
    sharedAudio.playbackRate = clampedRate;

    sharedAudio.onplaying = () => {
      if (myToken !== speakToken || started || finished) return;
      started = true;
      sharedAudio.playbackRate = clampedRate;
      onStart?.();
    };

    sharedAudio.onended = () => {
      if (myToken !== speakToken || finished) return;
      finished = true;
      detachAudioHandlers(sharedAudio);
      onEnd?.();
    };

    sharedAudio.onerror = () => {
      if (myToken !== speakToken || finished) return;
      finished = true;
      detachAudioHandlers(sharedAudio);
      if (!started) {
        playViaSpeechSynthesis();
      } else {
        onError?.('audio_error');
      }
    };

    try {
      const playPromise = sharedAudio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise;
      }
    } catch (err) {
      if (myToken !== speakToken || finished) return;
      finished = true;
      detachAudioHandlers(sharedAudio);
      if (err?.name === 'NotAllowedError') {
        onError?.('autoplay_blocked');
        return;
      }
      playViaSpeechSynthesis();
    }
  };

  playViaServerTts();
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export class AudioRecorder {
  constructor() {
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.audioCtx = null;
    this.analyser = null;
    this.rafId = null;
    this.recognition = null;
    this.liveTranscript = '';
    this.startedAt = 0;
    this.mimeType = 'audio/webm';
    this.isRecording = false;
  }

  async start({ onLevel, onTranscript } = {}) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone API is unavailable in this browser.');
    }

    this.chunks = [];
    this.liveTranscript = '';
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    let chosenType = '';
    if (typeof MediaRecorder !== 'undefined') {
      for (const t of preferredTypes) {
        if (MediaRecorder.isTypeSupported(t)) {
          chosenType = t;
          break;
        }
      }
      this.mediaRecorder = chosenType
        ? new MediaRecorder(this.stream, { mimeType: chosenType })
        : new MediaRecorder(this.stream);
      this.mimeType = this.mediaRecorder.mimeType || chosenType || 'audio/webm';
      this.mediaRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          this.chunks.push(ev.data);
        }
      };
      this.mediaRecorder.start(250);
    }

    // Real-time volume meter
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const tick = () => {
        if (!this.isRecording || !this.analyser) return;
        this.analyser.getByteTimeDomainData(dataArray);
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = Math.abs(dataArray[i] - 128) / 128;
          if (val > peak) peak = val;
        }
        onLevel?.(Math.min(100, Math.round(peak * 220)));
        this.rafId = requestAnimationFrame(tick);
      };
      this.isRecording = true;
      this.rafId = requestAnimationFrame(tick);
    } else {
      this.isRecording = true;
    }

    // Optional SpeechRecognition for live preview & offline transcript
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.recognition = new SpeechRec();
        this.recognition.lang = 'en-US';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        let finalSeg = '';
        this.recognition.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalSeg += text + ' ';
            } else {
              interim += text;
            }
          }
          this.liveTranscript = (finalSeg + interim).trim();
          onTranscript?.(this.liveTranscript);
        };
        this.recognition.onerror = () => {};
        this.recognition.start();
      } catch {
        this.recognition = null;
      }
    }

    this.startedAt = Date.now();
  }

  async stop() {
    this.isRecording = false;
    const durationSec = this.startedAt ? Math.max(0.5, (Date.now() - this.startedAt) / 1000) : 0;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    let blob = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      blob = await new Promise((resolve) => {
        this.mediaRecorder.onstop = () => {
          resolve(new Blob(this.chunks, { type: this.mimeType || 'audio/webm' }));
        };
        this.mediaRecorder.stop();
      });
    } else if (this.chunks.length > 0) {
      blob = new Blob(this.chunks, { type: this.mimeType || 'audio/webm' });
    }

    if (this.stream) {
      this.stream.getTracks().forEach((tr) => tr.stop());
      this.stream = null;
    }

    if (this.audioCtx) {
      try {
        await this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
      this.analyser = null;
    }

    let base64 = '';
    let objectUrl = '';
    if (blob && blob.size > 0) {
      objectUrl = URL.createObjectURL(blob);
      // Strip codecs parameter for Gemini inlineData compatibility
      const cleanMime = (blob.type || 'audio/webm').split(';')[0];
      this.mimeType = cleanMime;
      try {
        base64 = await blobToBase64(blob);
      } catch {
        base64 = '';
      }
    }

    return {
      blob,
      objectUrl,
      base64,
      mimeType: this.mimeType,
      durationSec: Math.round(durationSec * 10) / 10,
      liveTranscript: this.liveTranscript.trim()
    };
  }

  abort() {
    this.isRecording = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
      this.recognition = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch {}
    }
    this.mediaRecorder = null;
    if (this.stream) {
      this.stream.getTracks().forEach((tr) => tr.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
    this.analyser = null;
  }
}

export class WebcamMonitor {
  constructor() {
    this.stream = null;
  }

  async attach(videoEl) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Webcam API unavailable.');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
    if (videoEl) {
      videoEl.srcObject = this.stream;
      await videoEl.play().catch(() => {});
    }
    return this.stream;
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((tr) => tr.stop());
      this.stream = null;
    }
  }
}
