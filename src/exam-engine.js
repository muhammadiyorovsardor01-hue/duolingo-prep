import { getQuestionTypeMeta, getBankCapacity, pickQuestionFromBank } from './questions-bank.js';
import { mountQuestionRenderer, gradeAnyItem, renderFeedbackCard, renderScoringGuideHtml, escapeHtml } from './renderers.js';
import { computeSubscores, nextAdaptiveDifficulty, scoreToIelts, scoreToCefr } from './scoring.js';
import { speakText, stopSpeaking, unlockSpeech, AudioRecorder, WebcamMonitor } from './speech.js';
import { generateQuestion } from './gemini.js';
import {
  recordExamReport,
  addMistake,
  getSeenIds,
  markSeenIds,
  getRecentReadSelectWords,
  recordRecentReadSelectWords
} from './storage.js';
import { t } from './i18n.js';

export const EXPRESS_BLUEPRINT = [
  'read_select',
  'fill_blanks',
  'read_select',
  'listen_type',
  'read_complete',
  'read_select',
  'fill_blanks',
  'listen_type',
  'read_then_speak',
  'write_photo',
  'speak_photo'
];

export const FULL_BLUEPRINT = [
  'read_select',
  'fill_blanks',
  'listen_type',
  'read_select',
  'write_photo',
  'read_select',
  'fill_blanks',
  'listen_type',
  'read_select',
  'read_complete',
  'read_select',
  'fill_blanks',
  'listen_type',
  'read_select',
  'write_photo',
  'read_select',
  'fill_blanks',
  'read_complete',
  'read_select',
  'listen_type',
  'read_select',
  'fill_blanks',
  'read_select',
  'listen_type',
  'read_select',
  'write_photo',
  'read_select',
  'fill_blanks',
  'read_select',
  'read_complete',
  'read_select',
  'listen_type',
  'read_select',
  'interactive_reading',
  'interactive_reading',
  'interactive_listening',
  'interactive_listening',
  'interactive_writing',
  'speak_photo',
  'read_then_speak',
  'writing_sample',
  'speaking_sample'
];

function formatClock(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function formatDurationBadge(totalSec) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m} min`;
}

function createExamTimer({ durationSec, onTick, onExpire }) {
  let total = Math.max(1, Number(durationSec) || 1);
  let deadline = performance.now() + total * 1000;
  let lastShown = -1;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    const remMs = Math.max(0, deadline - performance.now());
    const remSec = Math.ceil(remMs / 1000);
    if (remSec !== lastShown) {
      lastShown = remSec;
      onTick?.(remSec, total);
    }
    if (remMs <= 0) {
      stopped = true;
      clearInterval(id);
      onExpire?.();
    }
  };

  const id = setInterval(tick, 100);
  tick();

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(id);
    },
    reset(newDurationSec) {
      if (stopped) return;
      total = Math.max(1, Number(newDurationSec) || 1);
      deadline = performance.now() + total * 1000;
      lastShown = -1;
      tick();
    }
  };
}

function buildMistakePrompt(item) {
  if (!item) return 'Mock Question';
  if (item.type === 'fill_blanks') {
    const gap = '_'.repeat(Math.max(1, String(item.missing || '').length));
    return `${item.before || ''}${item.prefix || ''}${gap}${item.after || ''}`.trim();
  }
  return item.word || item.sentence || item.title || item.prompt || 'Mock Question';
}

export function renderScoreReport(container, report, { lang = 'uz', onDone }) {
  const proctorDisabled = report.proctorEnabled === false;
  const isClean = (report.proctorFlags || 0) === 0;
  const bannerClass = proctorDisabled ? 'banner-info' : (isClean ? 'banner-success' : 'banner-warn');
  const integrityText = proctorDisabled
    ? t(lang, 'reportIntegrityOff')
    : (isClean ? t(lang, 'reportIntegrityClean') : t(lang, 'reportIntegrityWarn'));
  const sub = report.subscores || { reading: 10, writing: 10, listening: 10, speaking: 10 };
  const integ = report.integrated || { literacy: 10, comprehension: 10, conversation: 10, production: 10 };

  const renderBar = (label, val, colorClass = '') => `
    <div class="subscore-row">
      <div class="subscore-name">${escapeHtml(label)}</div>
      <div class="progress-track">
        <div class="progress-fill ${colorClass}" style="width:${Math.round(((val - 10) / 150) * 100)}%"></div>
      </div>
      <div class="subscore-num">${val}</div>
    </div>
  `;

  container.innerHTML = `
    <div style="max-width:980px;margin:0 auto;">
      <div class="report-card">
        <div class="report-header">
          <div>
            <span class="tag tag-ai">${report.mode === 'full' ? 'Full Mock Exam' : 'Express Mock Exam'}</span>
            <h1 style="margin:8px 0 4px;font-size:24px;font-weight:800;">${escapeHtml(t(lang, 'reportTitle'))}</h1>
            <div style="color:var(--ink-muted);font-size:13px;">
              ${new Date(report.date).toLocaleString()} · IELTS ≈ <strong>${scoreToIelts(report.overall)}</strong> · CEFR <strong>${scoreToCefr(report.overall)}</strong>
            </div>
          </div>
          <div class="report-overall-box">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--accent-hover);">Overall</div>
            <div class="report-overall-num">${report.overall}</div>
            <div style="font-size:12px;color:var(--ink-muted);font-weight:700;">out of 160</div>
          </div>
        </div>

        <div class="banner ${bannerClass}" style="margin-bottom:22px;">
          <div>
            <strong>${escapeHtml(integrityText)}</strong>
            ${!proctorDisabled && !isClean ? ` (${report.proctorFlags} ${escapeHtml(t(lang, 'proctorFlagCount'))})` : ''}
          </div>
          <span class="tag">${formatDurationBadge(report.totalDurationSec)}</span>
        </div>

        <div class="grid-2" style="margin-bottom:24px;">
          <div class="card" style="background:var(--bg);box-shadow:none;">
            <h3 class="card-title" style="margin-bottom:14px;">${escapeHtml(t(lang, 'coreSkills'))}</h3>
            <div class="subscore-list">
              ${renderBar('Reading', sub.reading, 'blue')}
              ${renderBar('Writing', sub.writing, 'amber')}
              ${renderBar('Listening', sub.listening, '')}
              ${renderBar('Speaking', sub.speaking, 'green')}
            </div>
          </div>
          <div class="card" style="background:var(--bg);box-shadow:none;">
            <h3 class="card-title" style="margin-bottom:14px;">${escapeHtml(t(lang, 'integratedSkills'))}</h3>
            <div class="subscore-list">
              ${renderBar('Production (W+S)', integ.production, 'amber')}
              ${renderBar('Literacy (R+W)', integ.literacy, 'blue')}
              ${renderBar('Comprehension (L+R)', integ.comprehension, '')}
              ${renderBar('Conversation (S+L)', integ.conversation, 'green')}
            </div>
          </div>
        </div>

        <details class="det-guide-details no-print" style="margin-bottom:22px;">
          <summary style="cursor:pointer;font-weight:800;font-size:14px;">ℹ️ ${escapeHtml(lang === 'uz' ? 'Baholash tizimi va rasmiy DET mezonlari' : 'Understand scoring & official DET rules')}</summary>
          <div style="margin-top:14px;">
            ${renderScoringGuideHtml(lang, { showFrequency: false })}
          </div>
        </details>

        <div class="no-print" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:26px;">
          <button type="button" id="rep-back" class="btn btn-primary">${escapeHtml(t(lang, 'backToDash'))}</button>
          <button type="button" id="rep-print" class="btn btn-secondary">🖨️ ${escapeHtml(t(lang, 'printReport'))}</button>
        </div>

        <h3 style="margin:0 0 14px;font-size:18px;font-weight:800;">${escapeHtml(t(lang, 'itemBreakdown'))}</h3>
        <div id="rep-items"></div>
      </div>
    </div>
  `;

  container.querySelector('#rep-print')?.addEventListener('click', () => window.print());
  container.querySelector('#rep-back')?.addEventListener('click', () => onDone?.());

  const itemsHost = container.querySelector('#rep-items');
  (report.items || []).forEach((entry, idx) => {
    const meta = getQuestionTypeMeta(entry.item.type);
    const detailsEl = document.createElement('details');
    detailsEl.style.cssText = 'border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:10px;background:var(--bg);';
    if (entry.result.aiFeedback || !entry.result.correct) {
      detailsEl.open = idx < 3;
    }
    detailsEl.innerHTML = `
      <summary style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:700;">
        <span>#${idx + 1} ${meta.icon} ${escapeHtml(meta.name)}</span>
        <span class="tag ${entry.result.detScore >= 120 ? 'tag-speaking' : entry.result.detScore >= 90 ? 'tag-writing' : 'tag-danger'}">${entry.result.detScore} / 160</span>
      </summary>
      <div class="det-item-fb-slot" style="margin-top:10px;"></div>
    `;
    const slot = detailsEl.querySelector('.det-item-fb-slot');
    slot.appendChild(renderFeedbackCard({ item: entry.item, result: entry.result, lang }));
    itemsHost.appendChild(detailsEl);
  });
}

export function launchMockExamFlow({ container, mainEl, topNavEl, mode = 'express', settings, onExit }) {
  const lang = settings.uiLang || 'uz';
  const blueprint = mode === 'full' ? FULL_BLUEPRINT : EXPRESS_BLUEPRINT;
  const webcam = new WebcamMonitor();
  let testMicRec = null;
  let enableCam = Boolean(settings.enableWebcam);
  let enableProctor = Boolean(settings.enableProctor);

  const cleanupSetupHardware = () => {
    stopSpeaking();
    if (testMicRec?.isRecording) {
      testMicRec.abort();
      testMicRec = null;
    }
    webcam.stop();
  };
  let activeCleanup = () => cleanupSetupHardware();
  let enteredFullscreen = Boolean(document.fullscreenElement);

  // STEP 1: Pre-Exam Hardware & Rules Check
  container.innerHTML = `
    <div style="max-width:780px;margin:0 auto;">
      <div class="card" style="padding:28px;">
        <span class="tag tag-ai">${mode === 'full' ? t(lang, 'fullTitle') : t(lang, 'expressTitle')}</span>
        <h2 style="margin:10px 0 6px;font-size:24px;font-weight:800;">${escapeHtml(t(lang, 'preCheckTitle'))}</h2>
        <p class="page-subtitle" style="margin-bottom:20px;">${escapeHtml(mode === 'full' ? t(lang, 'fullDesc') : t(lang, 'expressDesc'))}</p>

        <div class="grid-2" style="margin-bottom:20px;">
          <div class="card" style="background:var(--bg);box-shadow:none;">
            <div style="font-weight:800;margin-bottom:10px;">1. Audio &amp; Microphone</div>
            <div style="display:flex;flex-direction:column;gap:10px;">
              <button type="button" id="chk-speaker" class="btn btn-secondary btn-sm">🔊 ${escapeHtml(t(lang, 'testSpeaker'))}</button>
              <div id="chk-speaker-msg" style="font-size:12px;color:var(--ink-muted);"></div>
              <button type="button" id="chk-mic" class="btn btn-secondary btn-sm">🎙️ ${escapeHtml(t(lang, 'testMic'))}</button>
              <div class="mic-meter-wrap" style="margin:2px 0;"><div id="chk-mic-fill" class="mic-meter-fill"></div></div>
              <div id="chk-mic-msg" style="font-size:12px;color:var(--ink-muted);"></div>
            </div>
          </div>

          <div class="card" style="background:var(--bg);box-shadow:none;">
            <div style="font-weight:800;margin-bottom:10px;">2. ${escapeHtml(t(lang, 'webcamCheck'))}</div>
            <video id="chk-video" muted playsinline style="width:100%;height:110px;border-radius:10px;background:#10151F;object-fit:cover;transform:scaleX(-1);"></video>
            <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px;font-weight:600;cursor:pointer;">
              <input type="checkbox" id="chk-cam-toggle" ${enableCam ? 'checked' : ''} />
              <span>${escapeHtml(t(lang, 'enableWebcamMock'))}</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13px;font-weight:600;cursor:pointer;">
              <input type="checkbox" id="chk-proctor-toggle" ${enableProctor ? 'checked' : ''} />
              <span>${escapeHtml(t(lang, 'enableProctorMock'))}</span>
            </label>
          </div>
        </div>

        <div class="banner banner-info" style="display:block;margin-bottom:22px;">
          <div style="font-weight:800;margin-bottom:6px;">DET Proctor Guidelines:</div>
          <ul style="margin:0;padding-left:18px;font-size:13px;">
            ${t(lang, 'proctorRulesList').map((r) => `<li style="margin-bottom:3px;">${escapeHtml(r)}</li>`).join('')}
          </ul>
        </div>

        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <button type="button" id="chk-cancel" class="btn btn-secondary">${escapeHtml(t(lang, 'cancel'))}</button>
          <button type="button" id="chk-start" class="btn btn-primary btn-lg">🚀 ${escapeHtml(t(lang, 'launchExam'))}</button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#chk-speaker').addEventListener('click', () => {
    const spkMsg = container.querySelector('#chk-speaker-msg');
    unlockSpeech();
    if (spkMsg) {
      spkMsg.style.color = 'var(--ink-muted)';
      spkMsg.textContent = lang === 'uz' ? '⏳ Ovoz tekshirilmoqda...' : '⏳ Playing test clip...';
    }
    speakText('Audio check complete. Good luck on your Duolingo English Test simulation.', {
      rate: settings.ttsRate || 1.0,
      voiceName: settings.ttsVoice || '',
      onStart: () => {
        if (spkMsg) {
          spkMsg.style.color = '#187A38';
          spkMsg.textContent = lang === 'uz' ? '🔊 Ovoz eshitilmoqda...' : '🔊 Playing...';
        }
      },
      onEnd: () => {
        if (spkMsg) {
          spkMsg.style.color = '#187A38';
          spkMsg.textContent = lang === 'uz' ? '✓ Dinamik ishlayapti!' : '✓ Speaker OK!';
        }
      },
      onError: () => {
        if (spkMsg) {
          spkMsg.style.color = 'var(--red)';
          spkMsg.textContent = lang === 'uz' ? '✕ Brauzer ovozini yoqib bo‘lmadi.' : '✕ Browser audio blocked/unavailable.';
        }
      }
    });
  });

  container.querySelector('#chk-mic').addEventListener('click', async () => {
    const msgEl = container.querySelector('#chk-mic-msg');
    const fillEl = container.querySelector('#chk-mic-fill');
    if (testMicRec?.isRecording) {
      testMicRec.abort();
      testMicRec = null;
      fillEl.style.width = '0%';
      return;
    }
    try {
      testMicRec = new AudioRecorder();
      await testMicRec.start({
        onLevel: (lvl) => { fillEl.style.width = `${lvl}%`; }
      });
      msgEl.style.color = '#187A38';
      msgEl.textContent = t(lang, 'micWorking');
    } catch (err) {
      msgEl.style.color = 'var(--red)';
      msgEl.textContent = `${t(lang, 'micBlocked')} (${err?.message || ''})`;
    }
  });

  const videoEl = container.querySelector('#chk-video');
  const camToggle = container.querySelector('#chk-cam-toggle');
  const syncCam = async () => {
    enableCam = camToggle.checked;
    if (enableCam) {
      try {
        await webcam.attach(videoEl);
      } catch {
        enableCam = false;
        camToggle.checked = false;
      }
    } else {
      webcam.stop();
      videoEl.srcObject = null;
    }
  };
  camToggle.addEventListener('change', syncCam);
  if (enableCam) syncCam();

  container.querySelector('#chk-proctor-toggle').addEventListener('change', (e) => {
    enableProctor = e.target.checked;
  });

  container.querySelector('#chk-cancel').addEventListener('click', () => {
    cleanupSetupHardware();
    onExit?.();
  });

  container.querySelector('#chk-start').addEventListener('click', () => {
    stopSpeaking();
    unlockSpeech();
    if (testMicRec?.isRecording) {
      testMicRec.abort();
      testMicRec = null;
    }
    enableProctor = container.querySelector('#chk-proctor-toggle').checked;
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().then(() => {
        enteredFullscreen = true;
      }).catch(() => {});
    }
    startExamSession();
  });

  // STEP 2: Active Exam Arena
  function startExamSession() {
    topNavEl?.classList.add('hidden');
    mainEl?.classList.add('arena-mode');

    const examStartedAt = Date.now();
    const usedIds = new Set();
    const collectedResponses = [];
    const rsCount = blueprint.filter((typeId) => typeId === 'read_select').length;
    const realTarget = Math.random() < 0.5 ? Math.floor(rsCount / 2) : Math.ceil(rsCount / 2);
    const readSelectPolarities = [
      ...new Array(realTarget).fill(true),
      ...new Array(Math.max(0, rsCount - realTarget)).fill(false)
    ];
    for (let i = readSelectPolarities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [readSelectPolarities[i], readSelectPolarities[j]] = [readSelectPolarities[j], readSelectPolarities[i]];
    }
    let rsCursor = 0;

    let currentIndex = 0;
    let currentDifficulty = 3;
    let proctorFlags = 0;
    let activeRenderer = null;
    let examTimer = null;
    let immediateSubmitTimer = null;
    let prefetchedNext = null;
    let sessionEnded = false;
    let tornDown = false;
    let lastFlagAt = 0;

    container.innerHTML = `
      <div class="arena-shell">
        <div class="arena-topbar">
          <div class="arena-progress-group">
            <span id="ar-step" class="arena-step-text">1 / ${blueprint.length}</span>
            <div class="arena-progress-bar"><div id="ar-prog" class="arena-progress-fill" style="width:0%"></div></div>
          </div>
          <div class="arena-controls">
            <div id="ar-proctor" class="proctor-badge ${enableProctor ? '' : 'off'}">${escapeHtml(t(lang, enableProctor ? 'proctorClean' : 'proctorOff'))}</div>
            <div id="ar-timer" class="timer-pill">⏱ 00:00</div>
            <button type="button" id="ar-quit" class="btn btn-secondary btn-sm">✕ ${escapeHtml(t(lang, 'cancel'))}</button>
          </div>
        </div>
        <div id="ar-proctor-alert" class="banner banner-danger hidden" style="margin:14px 24px 0;">
          <strong>⚠️ ${escapeHtml(t(lang, 'proctorWarning'))}</strong>
          <span id="ar-flag-num"></span>
        </div>
        <div class="arena-stage">
          <div id="ar-card" class="det-card"></div>
        </div>
      </div>
      ${enableCam ? `
        <div class="webcam-pip">
          <video id="ar-webcam" muted playsinline></video>
          <div class="webcam-pip-label"><span>PROCTOR CAM</span><span>● REC</span></div>
        </div>
      ` : ''}
    `;

    if (enableCam) {
      const arVid = container.querySelector('#ar-webcam');
      if (arVid && webcam.stream) {
        arVid.srcObject = webcam.stream;
        arVid.play().catch(() => {});
      }
    }

    const recordProctorFlag = () => {
      if (sessionEnded || !enableProctor) return;
      const now = Date.now();
      if (now - lastFlagAt < 1500) return;
      lastFlagAt = now;
      proctorFlags += 1;
      const badge = container.querySelector('#ar-proctor');
      const alertBox = container.querySelector('#ar-proctor-alert');
      const flagNum = container.querySelector('#ar-flag-num');
      if (badge) {
        badge.classList.add('flagged');
        badge.textContent = `${t(lang, 'proctorFlagCount')}: ${proctorFlags}`;
      }
      if (alertBox) alertBox.classList.remove('hidden');
      if (flagNum) flagNum.textContent = `${t(lang, 'proctorFlagCount')}: ${proctorFlags}`;
    };

    const onVisibilityChange = () => {
      if (document.hidden) recordProctorFlag();
    };
    const onWindowBlur = () => {
      recordProctorFlag();
    };
    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        enteredFullscreen = true;
      } else if (enteredFullscreen) {
        recordProctorFlag();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    const tearDownArena = () => {
      if (tornDown) return;
      tornDown = true;
      sessionEnded = true;
      examTimer?.stop();
      examTimer = null;
      if (immediateSubmitTimer) {
        clearTimeout(immediateSubmitTimer);
        immediateSubmitTimer = null;
      }
      stopSpeaking();
      activeRenderer?.cleanup();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      webcam.stop();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      topNavEl?.classList.remove('hidden');
      mainEl?.classList.remove('arena-mode');
    };
    activeCleanup = tearDownArena;

    container.querySelector('#ar-quit').addEventListener('click', () => {
      tearDownArena();
      onExit?.();
    });

    const prefetchItem = (nextIdx, diff) => {
      if (nextIdx >= blueprint.length) return;
      const nextType = blueprint[nextIdx];
      const meta = getQuestionTypeMeta(nextType);
      if (settings.apiKey && settings.useAiGeneration && meta.aiGeneratable) {
        prefetchedNext = {
          index: nextIdx,
          difficulty: diff,
          promise: generateQuestion({
            apiKey: settings.apiKey,
            model: settings.model,
            type: nextType,
            difficulty: diff,
            recentPrompts: nextType === 'read_select' ? getRecentReadSelectWords().slice(-30) : []
          }).catch(() => null)
        };
      } else {
        prefetchedNext = null;
      }
    };

    const loadCurrentQuestion = async () => {
      if (sessionEnded) return;
      if (currentIndex >= blueprint.length) {
        finishAndGradeExam();
        return;
      }

      const qType = blueprint[currentIndex];
      const meta = getQuestionTypeMeta(qType);
      let item = null;

      if (prefetchedNext && prefetchedNext.index === currentIndex && prefetchedNext.difficulty === currentDifficulty) {
        item = await prefetchedNext.promise;
      }
      if (!item) {
        const seenIds = getSeenIds(qType);
        const pickOpts = qType === 'read_select'
          ? { seenIds, preferReal: readSelectPolarities[rsCursor] }
          : { seenIds };
        item = pickQuestionFromBank(qType, currentDifficulty, usedIds, pickOpts);
      }
      if (qType === 'read_select') {
        rsCursor += 1;
      }
      usedIds.add(item.id);
      if (!item.isAiGenerated) {
        const maxKeep = Math.max(1, getBankCapacity(qType) - 1);
        markSeenIds(qType, [item.id], maxKeep);
      }
      if (qType === 'read_select' && item.word) {
        recordRecentReadSelectWords([item.word]);
      }

      // Update header progress
      const stepEl = container.querySelector('#ar-step');
      const progEl = container.querySelector('#ar-prog');
      if (stepEl) stepEl.textContent = `${currentIndex + 1} / ${blueprint.length}`;
      if (progEl) progEl.style.width = `${Math.round((currentIndex / blueprint.length) * 100)}%`;

      const card = container.querySelector('#ar-card');
      card.className = qType === 'interactive_reading' ? 'det-card wide' : 'det-card';
      card.innerHTML = `
        <div class="det-q-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="tag">${meta.icon} ${escapeHtml(meta.name)}</span>
            <span class="tag">Level ${currentDifficulty}/5</span>
            ${item.isAiGenerated ? '<span class="tag tag-ai">AI Generated</span>' : ''}
          </div>
        </div>
        <div id="ar-mount"></div>
        <div class="det-footer">
          <span style="font-size:12.5px;color:var(--ink-muted);">${meta.skills.map((s) => s.toUpperCase()).join(' · ')}</span>
          ${qType === 'read_select'
            ? `<span style="font-size:12.5px;font-weight:700;color:var(--ink-muted);">${lang === 'uz' ? 'Yes yoki No tanlang' : 'Select Yes or No'}</span>`
            : `<button type="button" id="ar-next-btn" class="btn btn-primary">${currentIndex === blueprint.length - 1 ? 'Finish Exam ✓' : 'Next →'}</button>`}
        </div>
      `;

      const mountEl = card.querySelector('#ar-mount');
      let submitting = false;

      const submitCurrent = async (overrideAns = undefined) => {
        if (submitting || sessionEnded) return;
        submitting = true;
        if (immediateSubmitTimer) {
          clearTimeout(immediateSubmitTimer);
          immediateSubmitTimer = null;
        }
        examTimer?.stop();
        examTimer = null;

        const answer = overrideAns !== undefined ? overrideAns : await activeRenderer.getAnswer();
        activeRenderer.cleanup();

        // Quick adaptive difficulty update on objective questions
        if (['read_select', 'fill_blanks', 'read_complete', 'listen_type', 'interactive_reading'].includes(item.type)) {
          const quickRes = await gradeAnyItem({ item, answer, settings });
          currentDifficulty = nextAdaptiveDifficulty(currentDifficulty, quickRes.pctScore);
          collectedResponses.push({ item, answer, preGraded: quickRes });
        } else {
          collectedResponses.push({ item, answer, preGraded: null });
        }

        currentIndex += 1;
        loadCurrentQuestion();
      };

      const prepSec = item.prepSec || meta.prepSec || 0;
      const speakDurationSec = meta.durationSec || 60;
      const totalSec = prepSec + speakDurationSec;

      activeRenderer = mountQuestionRenderer(mountEl, item, {
        settings,
        lang,
        onImmediateSubmit: qType === 'read_select'
          ? (val) => {
              examTimer?.stop();
              if (immediateSubmitTimer) clearTimeout(immediateSubmitTimer);
              immediateSubmitTimer = setTimeout(() => {
                immediateSubmitTimer = null;
                submitCurrent(val);
              }, 180);
            }
          : undefined,
        onEnterSubmit: qType === 'fill_blanks' ? () => submitCurrent() : undefined,
        onRecordingStart: prepSec > 0 ? () => { examTimer?.reset(speakDurationSec); } : undefined
      });

      card.querySelector('#ar-next-btn')?.addEventListener('click', () => {
        unlockSpeech();
        submitCurrent();
      });

      // Start drift-free countdown timer (prep + speaking time for speaking tasks)
      const timerEl = container.querySelector('#ar-timer');
      examTimer = createExamTimer({
        durationSec: totalSec,
        onTick: (leftSec, activeTotal) => {
          if (!timerEl) return;
          timerEl.textContent = `⏱ ${formatClock(leftSec)}`;
          timerEl.classList.remove('warn', 'danger');
          if (leftSec <= 10) timerEl.classList.add('danger');
          else if (leftSec <= activeTotal * 0.25) timerEl.classList.add('warn');
        },
        onExpire: () => submitCurrent()
      });

      // Prefetch next item in background
      prefetchItem(currentIndex + 1, currentDifficulty);
    };

    const finishAndGradeExam = async () => {
      tearDownArena();
      const totalDurationSec = Math.round((Date.now() - examStartedAt) / 1000);
      const hasApi = Boolean(String(settings.apiKey || '').trim());

      container.innerHTML = `
        <div style="max-width:620px;margin:40px auto;">
          <div class="card" style="text-align:center;padding:36px;">
            <div style="font-size:38px;margin-bottom:10px;">🧠</div>
            <h2 style="margin:0 0 8px;">${escapeHtml(t(lang, 'gradingTitle'))}</h2>
            <p class="page-subtitle" style="margin-bottom:20px;">${escapeHtml(t(lang, hasApi ? 'gradingSub' : 'gradingSubFree'))}</p>
            <div class="progress-track" style="height:12px;margin-bottom:10px;">
              <div id="gr-prog" class="progress-fill" style="width:15%"></div>
            </div>
            <div id="gr-label" style="font-size:13px;font-weight:700;color:var(--ink-muted);">0 / ${collectedResponses.length}</div>
          </div>
        </div>
      `;

      const gradedItems = [];
      for (let i = 0; i < collectedResponses.length; i++) {
        const entry = collectedResponses[i];
        const res = entry.preGraded || (await gradeAnyItem({ item: entry.item, answer: entry.answer, settings }));
        gradedItems.push({ item: entry.item, result: res });

        if (!res.correct && ['read_select', 'fill_blanks', 'read_complete', 'listen_type'].includes(entry.item.type)) {
          addMistake({
            type: entry.item.type,
            prompt: buildMistakePrompt(entry.item),
            userAnswer: res.userSummary,
            correctAnswer: res.expected,
            note: `Mock Exam (${mode})`
          });
        }

        const pct = Math.round(((i + 1) / collectedResponses.length) * 100);
        const progBar = container.querySelector('#gr-prog');
        const label = container.querySelector('#gr-label');
        if (progBar) progBar.style.width = `${pct}%`;
        if (label) label.textContent = `${i + 1} / ${collectedResponses.length}`;
      }

      const scored = computeSubscores(gradedItems.map((g) => ({ ...g.result, difficulty: g.item.difficulty || 3 })));
      const report = {
        id: `exam_${Date.now()}`,
        date: new Date().toISOString(),
        mode,
        totalDurationSec,
        proctorEnabled: enableProctor,
        proctorFlags,
        overall: scored.overall,
        subscores: scored.subscores,
        integrated: scored.integrated,
        items: gradedItems.map((g) => ({
          item: {
            id: g.item.id,
            type: g.item.type,
            word: g.item.word,
            sentence: g.item.sentence,
            before: g.item.before,
            prefix: g.item.prefix,
            missing: g.item.missing,
            after: g.item.after,
            fullWord: g.item.fullWord,
            title: g.item.title,
            prompt: g.item.prompt,
            isReal: g.item.isReal
          },
          result: g.result
        }))
      };

      const storageReport = {
        ...report,
        items: report.items.map((entry) => ({
          item: entry.item,
          result: entry.result.audioUrl ? { ...entry.result, audioUrl: '' } : entry.result
        }))
      };

      recordExamReport(storageReport);
      renderScoreReport(container, report, { lang, onDone: onExit });
    };

    loadCurrentQuestion();
  }

  return () => activeCleanup();
}
