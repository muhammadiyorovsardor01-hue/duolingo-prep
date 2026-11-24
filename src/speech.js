let activeUtterance = null;
let speakToken = 0;
let pendingSpeakTimer = null;
let startWatchdogTimer = null;

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

export function getEnglishVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices() || [];
  return voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
}

export function unlockSpeech() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.getVoices();
    if (synth.paused) {
      synth.resume();
    }
    // Silent warm-up utterance inside user gesture so subsequent async turns stay unlocked
    if (!synth.speaking && !synth.pending) {
      const warm = new SpeechSynthesisUtterance(' ');
      warm.lang = 'en-US';
      warm.volume = 0;
      warm.rate = 2;
      synth.speak(warm);
    }
  } catch {}
}

export function stopSpeaking() {
  speakToken += 1;
  clearTimers();
  activeUtterance = null;
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
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.('Speech synthesis is not supported in this browser.');
    return;
  }
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    onError?.('Empty audio text');
    return;
  }

  const synth = window.speechSynthesis;
  const wasBusy = synth.speaking || synth.pending;

  speakToken += 1;
  const myToken = speakToken;
  clearTimers();
  activeUtterance = null;

  if (wasBusy) {
    try {
      synth.cancel();
    } catch {}
  }

  const launchUtterance = (useSystemDefault = false) => {
    if (myToken !== speakToken) return;
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = 'en-US';
    utter.rate = Math.max(0.7, Math.min(1.4, Number(rate) || 1.0));
    utter.volume = 1.0;

    if (!useSystemDefault) {
      const chosen = selectReliableVoice(voiceName);
      if (chosen) utter.voice = chosen;
    }

    let started = false;
    activeUtterance = utter;

    utter.onstart = () => {
      if (myToken !== speakToken) return;
      started = true;
      if (startWatchdogTimer) {
        clearTimeout(startWatchdogTimer);
        startWatchdogTimer = null;
      }
      onStart?.();
    };

    utter.onend = () => {
      if (myToken !== speakToken) return;
      clearTimers();
      activeUtterance = null;
      onEnd?.();
    };

    utter.onerror = (ev) => {
      if (myToken !== speakToken) return;
      if (ev?.error === 'interrupted' || ev?.error === 'canceled') return;
      clearTimers();
      activeUtterance = null;
      if (!useSystemDefault && !started) {
        launchUtterance(true);
        return;
      }
      onError?.(ev?.error || 'Audio playback error');
    };

    try {
      if (synth.paused) synth.resume();
      synth.speak(utter);
      if (synth.paused) synth.resume();
    } catch (err) {
      activeUtterance = null;
      onError?.(err?.message || 'Speech playback failed');
      return;
    }

    // Watchdog: if onstart never fires within 1200ms, retry once with default OS voice then report blocked
    startWatchdogTimer = setTimeout(() => {
      if (myToken !== speakToken || started) return;
      try {
        synth.cancel();
      } catch {}
      activeUtterance = null;
      if (!useSystemDefault) {
        pendingSpeakTimer = setTimeout(() => launchUtterance(true), 60);
      } else {
        onError?.('playback_blocked');
      }
    }, 1200);
  };

  if (wasBusy) {
    // 60ms delay prevents Chromium cancel() from dropping the newly queued utterance
    pendingSpeakTimer = setTimeout(() => launchUtterance(false), 60);
  } else {
    launchUtterance(false);
  }
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
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch {}
    }
    if (this.stream) {
      this.stream.getTracks().forEach((tr) => tr.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
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
