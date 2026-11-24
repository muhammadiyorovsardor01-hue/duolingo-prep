import {
  loadState,
  updateSettings,
  recordPracticeAttempt,
  addMistake,
  toggleMistakeMastered,
  deleteMistake,
  getStreak,
  getEstimatedScores,
  exportBackupJSON,
  importBackupJSON,
  resetAllData,
  getSeenIds,
  markSeenIds,
  getRecentReadSelectWords,
  recordRecentReadSelectWords
} from './storage.js';
import { t } from './i18n.js';
import {
  QUESTION_TYPES,
  getQuestionTypeMeta,
  getBankCapacity,
  pickQuestionFromBank,
  shuffleArray,
  buildReadSelectRound
} from './questions-bank.js';
import { scoreToIelts, scoreToCefr, nextAdaptiveDifficulty, estimateAbilityIRT, roundDetScore } from './scoring.js';
import { GEMINI_MODELS, testConnection, generateQuestion, generateReadSelectBatch } from './gemini.js';
import { getEnglishVoices, speakText, stopSpeaking, unlockSpeech } from './speech.js';
import { playCorrectSound, playPartialSound, playWrongSound, playCompleteSound, playTimeoutSound, playTapSound } from './sounds.js';
import {
  mountQuestionRenderer,
  applyObjectiveReviewVisuals,
  gradeAnyItem,
  renderFeedbackCard,
  escapeHtml
} from './renderers.js';
import { launchMockExamFlow, renderScoreReport } from './exam-engine.js';

const mainEl = document.getElementById('main-content');
const topNavEl = document.getElementById('top-nav');
const aiPillEl = document.getElementById('ai-status-pill');
const aiStatusTextEl = document.getElementById('ai-status-text');
const navMistakesBadge = document.getElementById('nav-mistakes-badge');
const toastRoot = document.getElementById('toast-root');

let currentRoute = 'dashboard';
let practiceCleanup = null;
let practiceFilter = 'all';
let practiceDifficulty = 'adaptive';
let mistakeFilter = 'active';
let mistakeQuery = '';

function showToast(msg, type = 'info') {
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.textContent = msg;
  toastRoot.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

function syncChrome() {
  const state = loadState();
  const lang = state.settings.uiLang || 'uz';
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(lang, el.dataset.i18n);
  });

  document.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === currentRoute);
  });

  document.getElementById('lang-uz').classList.toggle('active', lang === 'uz');
  document.getElementById('lang-en').classList.toggle('active', lang === 'en');

  const hasKey = Boolean(String(state.settings.apiKey || '').trim());
  aiPillEl.classList.toggle('ready', hasKey);
  aiStatusTextEl.textContent = hasKey ? t(lang, 'aiReady') : t(lang, 'aiSetup');

  const activeMistakes = state.mistakes.filter((m) => !m.mastered).length;
  if (activeMistakes > 0) {
    navMistakesBadge.textContent = String(activeMistakes);
    navMistakesBadge.classList.remove('hidden');
  } else {
    navMistakesBadge.classList.add('hidden');
  }
}

function navigate(route) {
  if (practiceCleanup) {
    practiceCleanup();
    practiceCleanup = null;
  }
  topNavEl?.classList.remove('hidden');
  mainEl?.classList.remove('arena-mode');
  currentRoute = route;
  syncChrome();

  if (route === 'dashboard') renderDashboard();
  else if (route === 'mock') renderMockHome();
  else if (route === 'practice') renderPracticeHub();
  else if (route === 'mistakes') renderMistakesView();
  else if (route === 'settings') renderSettingsView();
}

function renderScoreTrendSvg(exams, targetScore) {
  if (!exams || exams.length === 0) return '';
  const points = [...exams].slice(0, 10).reverse();
  const width = 460;
  const height = 160;
  const padL = 34;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const yForScore = (s) => padT + plotH - ((Math.max(10, Math.min(160, s)) - 10) / 150) * plotH;
  const xForIdx = (i) => points.length === 1 ? padL + plotW / 2 : padL + (i / (points.length - 1)) * plotW;

  const coords = points.map((ex, i) => ({ x: xForIdx(i), y: yForScore(ex.overall), score: ex.overall }));
  const poly = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const targetY = yForScore(targetScore);

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;display:block;">
      <line x1="${padL}" y1="${targetY}" x2="${width - padR}" y2="${targetY}" stroke="#2BB656" stroke-dasharray="5 5" stroke-width="1.5"/>
      <text x="${padL}" y="${Math.max(12, targetY - 4)}" font-size="10" font-weight="700" fill="#187A38">Target ${targetScore}</text>
      ${[40, 80, 120, 160].map((v) => {
        const y = yForScore(v);
        return `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#E4E8F0" stroke-width="1"/>
                <text x="4" y="${y + 3}" font-size="10" fill="#8A95A8">${v}</text>`;
      }).join('')}
      ${coords.length > 1 ? `<polyline points="${poly}" fill="none" stroke="#FF7A00" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      ${coords.map((c, idx) => `
        <circle cx="${c.x}" cy="${c.y}" r="5" fill="#FF7A00" stroke="#FFFFFF" stroke-width="2"/>
        <text x="${c.x}" y="${c.y - 10}" text-anchor="middle" font-size="11" font-weight="700" fill="#18202F">${c.score}</text>
        <text x="${c.x}" y="${height - 6}" text-anchor="middle" font-size="10" fill="#8A95A8">#${idx + 1}</text>
      `).join('')}
    </svg>
  `;
}

// 1. DASHBOARD
function renderDashboard() {
  const state = loadState();
  const lang = state.settings.uiLang || 'uz';
  const est = getEstimatedScores(state);
  const streak = getStreak(state);
  const totalPractices = Object.values(state.practiceStats).reduce((s, p) => s + p.attempts, 0);
  const activeMistakes = state.mistakes.filter((m) => !m.mastered).length;

  const overallDisplay = est.hasData ? est.overall : '--';
  const ringPct = est.hasData ? Math.round(((est.overall - 10) / 150) * 100) : 0;
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ - (ringPct / 100) * circ;

  // Weakest core skill recommendation (prioritize untested skills first)
  const coreEntries = Object.entries(est.subscores || {}).filter(([, v]) => v != null);
  const weakest = coreEntries.length > 0
    ? [...coreEntries].sort((a, b) => a[1] - b[1])[0]
    : null;
  const untestedList = (est.untestedSkills || []).map((s) => s.toUpperCase()).join(', ');

  const renderBar = (label, val, color) => {
    const hasVal = val != null && val > 0;
    const widthPct = hasVal ? Math.round(((val - 10) / 150) * 100) : 0;
    const displayVal = hasVal ? val : (lang === 'uz' ? '—' : '—');
    return `
      <div class="subscore-row">
        <div class="subscore-name">${escapeHtml(label)}</div>
        <div class="progress-track"><div class="progress-fill ${color}" style="width:${widthPct}%"></div></div>
        <div class="subscore-num ${hasVal ? '' : 'untested'}">${displayVal}</div>
      </div>
    `;
  };

  mainEl.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${escapeHtml(t(lang, 'dashTitle'))}</h1>
        <p class="page-subtitle">${escapeHtml(t(lang, 'dashSub'))}</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button type="button" id="dash-express" class="btn btn-primary">⚡ ${escapeHtml(t(lang, 'startExpressMock'))}</button>
        <button type="button" id="dash-full" class="btn btn-secondary">🎯 ${escapeHtml(t(lang, 'startFullMock'))}</button>
      </div>
    </div>

    <div class="hero-dashboard">
      <div class="card score-hero-card">
        <div class="score-ring-wrap">
          <svg width="148" height="148" viewBox="0 0 148 148">
            <circle cx="74" cy="74" r="${radius}" fill="none" stroke="#EDF0F5" stroke-width="12"/>
            <circle cx="74" cy="74" r="${radius}" fill="none" stroke="#FF7A00" stroke-width="12"
              stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${dashOffset}"
              transform="rotate(-90 74 74)"/>
          </svg>
          <div class="score-ring-center">
            <div class="score-ring-value">${overallDisplay}</div>
            <div class="score-ring-label">${escapeHtml(t(lang, 'estimatedScore'))}</div>
          </div>
        </div>

        <div class="score-meta">
          <h2>${est.hasData ? `IELTS ≈ ${scoreToIelts(est.overall)} · CEFR ${scoreToCefr(est.overall)}` : escapeHtml(t(lang, 'noScoreYet'))}</h2>
          <div style="font-size:13px;color:var(--ink-muted);">
            ${escapeHtml(t(lang, 'targetScore'))}: <strong>${state.settings.targetScore}</strong> / 160
            ${est.isPartial ? ` · <span class="tag tag-warn">${lang === 'uz' ? `Qisman (${est.testedSkills.length}/4 ko‘nikma)` : `Partial (${est.testedSkills.length}/4 skills)`}</span>` : ''}
          </div>
          <div class="stat-row">
            <div class="stat-chip">🔥 <strong>${streak}</strong> ${escapeHtml(t(lang, 'streakDays'))}</div>
            <div class="stat-chip">📝 <strong>${totalPractices}</strong> ${escapeHtml(t(lang, 'practiceSessions'))}</div>
          </div>
          <button type="button" id="dash-practice-btn" class="btn btn-soft btn-sm">📚 ${escapeHtml(t(lang, 'startPractice'))}</button>
        </div>
      </div>

      <div class="card">
        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">${escapeHtml(t(lang, 'totalMocks'))}</div>
            <div class="kpi-val">${state.examHistory.length}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">${escapeHtml(t(lang, 'unmasteredMistakes'))}</div>
            <div class="kpi-val">${activeMistakes}</div>
          </div>
          <div class="kpi-box" style="grid-column:1 / -1;background:var(--accent-soft);">
            <div class="kpi-label" style="color:var(--accent-hover);">${escapeHtml(t(lang, 'weakestTipTitle'))}</div>
            <div style="font-weight:700;font-size:14px;margin-top:4px;">
              ${est.isPartial
                ? (lang === 'uz'
                  ? `Hali yechilmagan ko‘nikmalar: ${untestedList}. To‘liq ball chiqishi uchun ularni ham mashq qiling.`
                  : `Untested skills: ${untestedList}. Complete drills in those areas for a full score estimate.`)
                : est.hasData && weakest
                  ? (lang === 'uz'
                    ? `Eng past ko‘rsatkich: ${weakest[0].toUpperCase()} (${weakest[1]}). Mashqlar bo‘limida shu ko‘nikmani kuchaytiring.`
                    : `Lowest current skill: ${weakest[0].toUpperCase()} (${weakest[1]}). Focus your next drills here.`)
                  : (lang === 'uz'
                    ? 'Boshlash uchun Tezkor Mock topshiring yoki Mashqlar bo‘limidan 1 ta raund yeching!'
                    : 'Start with an Express Mock or finish 1 Practice round to calibrate your baseline!')}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:18px;">
      <div class="card">
        <div class="card-header"><h3 class="card-title">${escapeHtml(t(lang, 'coreSkills'))}</h3></div>
        <div class="subscore-list">
          ${renderBar('Reading', est.subscores.reading, 'blue')}
          ${renderBar('Writing', est.subscores.writing, 'amber')}
          ${renderBar('Listening', est.subscores.listening, '')}
          ${renderBar('Speaking', est.subscores.speaking, 'green')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title">${escapeHtml(t(lang, 'integratedSkills'))}</h3></div>
        <div class="subscore-list">
          ${renderBar('Literacy', est.integrated.literacy, 'blue')}
          ${renderBar('Comprehension', est.integrated.comprehension, '')}
          ${renderBar('Conversation', est.integrated.conversation, 'green')}
          ${renderBar('Production', est.integrated.production, 'amber')}
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3 class="card-title">${escapeHtml(t(lang, 'scoreTrend'))}</h3></div>
        ${state.examHistory.length > 0
          ? renderScoreTrendSvg(state.examHistory, state.settings.targetScore)
          : `<p style="color:var(--ink-muted);font-size:13.5px;margin:0;">${escapeHtml(t(lang, 'noExamsYetChart'))}</p>`}
      </div>

      <div class="card">
        <div class="card-header"><h3 class="card-title">${escapeHtml(t(lang, 'recentExams'))}</h3></div>
        ${state.examHistory.length === 0
          ? `<p style="color:var(--ink-muted);font-size:13.5px;margin:0;">—</p>`
          : state.examHistory.slice(0, 4).map((ex, idx) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-weight:700;">${ex.mode === 'full' ? 'Full Mock' : 'Express Mock'} · <span style="color:var(--accent-hover);">${ex.overall}/160</span></div>
                <div style="font-size:12px;color:var(--ink-muted);">${new Date(ex.date).toLocaleDateString()} · Proctor: ${ex.proctorFlags ? `${ex.proctorFlags} flags` : 'Clean'}</div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" data-open-report="${idx}">${escapeHtml(t(lang, 'viewReport'))}</button>
            </div>
          `).join('')}
      </div>
    </div>
  `;

  mainEl.querySelector('#dash-practice-btn')?.addEventListener('click', () => navigate('practice'));
  mainEl.querySelector('#dash-express')?.addEventListener('click', () => {
    launchMockExamFlow({ container: mainEl, mainEl, topNavEl, mode: 'express', settings: loadState().settings, onExit: () => navigate('dashboard') });
  });
  mainEl.querySelector('#dash-full')?.addEventListener('click', () => {
    launchMockExamFlow({ container: mainEl, mainEl, topNavEl, mode: 'full', settings: loadState().settings, onExit: () => navigate('dashboard') });
  });
  mainEl.querySelectorAll('[data-open-report]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const report = state.examHistory[Number(btn.dataset.openReport)];
      if (report) renderScoreReport(mainEl, report, { lang, onDone: () => navigate('dashboard') });
    });
  });
}

// 2. MOCK EXAM HOME
function renderMockHome() {
  const state = loadState();
  const lang = state.settings.uiLang || 'uz';

  mainEl.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${escapeHtml(t(lang, 'mockTitle'))}</h1>
        <p class="page-subtitle">${escapeHtml(t(lang, 'mockSub'))}</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:18px;">
        <div>
          <span class="tag tag-writing">~15 min · 11 Tasks</span>
          <h2 style="margin:12px 0 8px;font-size:21px;font-weight:800;">⚡ ${escapeHtml(t(lang, 'expressTitle'))}</h2>
          <p style="color:var(--ink-muted);margin:0 0 14px;">${escapeHtml(t(lang, 'expressDesc'))}</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <span class="tag">Read &amp; Select</span>
            <span class="tag">Fill in the Blanks</span>
            <span class="tag">Read &amp; Complete</span>
            <span class="tag">Listen &amp; Type</span>
            <span class="tag">Read Aloud</span>
            <span class="tag">Write Photo</span>
            <span class="tag">Speak Photo</span>
          </div>
        </div>
        <button type="button" id="start-express-btn" class="btn btn-primary btn-lg">${escapeHtml(t(lang, 'startExpressMock'))}</button>
      </div>

      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:18px;border-color:#FFD2A8;">
        <div>
          <span class="tag tag-ai">~45 min · 24 Tasks · Official Cadence</span>
          <h2 style="margin:12px 0 8px;font-size:21px;font-weight:800;">🎯 ${escapeHtml(t(lang, 'fullTitle'))}</h2>
          <p style="color:var(--ink-muted);margin:0 0 14px;">${escapeHtml(t(lang, 'fullDesc'))}</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <span class="tag">Adaptive Core</span>
            <span class="tag">Interactive Reading</span>
            <span class="tag">Interactive Listening</span>
            <span class="tag">Interactive Writing</span>
            <span class="tag">Read, Then Speak</span>
            <span class="tag">Writing Sample</span>
            <span class="tag">Speaking Sample</span>
          </div>
        </div>
        <button type="button" id="start-full-btn" class="btn btn-success btn-lg">${escapeHtml(t(lang, 'startFullMock'))}</button>
      </div>
    </div>
  `;

  mainEl.querySelector('#start-express-btn').addEventListener('click', () => {
    launchMockExamFlow({ container: mainEl, mainEl, topNavEl, mode: 'express', settings: loadState().settings, onExit: () => navigate('dashboard') });
  });
  mainEl.querySelector('#start-full-btn').addEventListener('click', () => {
    launchMockExamFlow({ container: mainEl, mainEl, topNavEl, mode: 'full', settings: loadState().settings, onExit: () => navigate('dashboard') });
  });
}

function getHeroLaptopSvg() {
  return `
    <svg width="116" height="72" viewBox="0 0 116 72" fill="none" aria-hidden="true">
      <rect x="20" y="8" width="76" height="48" rx="6" fill="#E5E9F0" stroke="#B8C4D4" stroke-width="2"/>
      <rect x="25" y="13" width="66" height="38" rx="3" fill="#FFFFFF"/>
      <rect x="33" y="21" width="34" height="14" rx="4" fill="#1CB0F6"/>
      <path d="M40 35L35 41V35H40Z" fill="#1CB0F6"/>
      <rect x="38" y="26" width="22" height="4" rx="2" fill="#FFFFFF"/>
      <circle cx="77" cy="31" r="8" fill="#FFF0E0" stroke="#FF9600" stroke-width="2.2"/>
      <path d="M77 27V31.5L80 33.5" stroke="#FF9600" stroke-width="2" stroke-linecap="round"/>
      <path d="M10 56H106L110 62C110 63.6569 108.657 65 107 65H9C7.34315 65 6 63.6569 6 62L10 56Z" fill="#D5DCE6"/>
      <rect x="46" y="58" width="24" height="3" rx="1.5" fill="#B0BAC8"/>
    </svg>
  `;
}

function getSkillIconSvg(typeId) {
  if (typeId === 'read_select') {
    return `
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <rect x="7" y="11" width="23" height="23" rx="6" transform="rotate(-8 7 11)" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="2.5"/>
        <path d="M13 21.5L17.5 25.5L25.5 16.5" stroke="#1CB0F6" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="22" y="17" width="23" height="23" rx="6" transform="rotate(8 22 17)" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="2.5"/>
        <path d="M27.5 25L35.5 33M35.5 25L27.5 33" stroke="#1CB0F6" stroke-width="3.2" stroke-linecap="round"/>
      </svg>
    `;
  }
  if (typeId === 'fill_blanks') {
    return `
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <rect x="6" y="18" width="13" height="16" rx="4" fill="#F4F5F7" stroke="#D8DCE3" stroke-width="2.2"/>
        <rect x="19" y="16" width="14" height="20" rx="4.5" fill="#DDF4FF" stroke="#1CB0F6" stroke-width="2.4"/>
        <rect x="33" y="18" width="13" height="16" rx="4" fill="#F4F5F7" stroke="#D8DCE3" stroke-width="2.2"/>
      </svg>
    `;
  }
  if (typeId === 'read_complete') {
    return `
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <rect x="7" y="10" width="38" height="32" rx="7" fill="#FFFFFF" stroke="#D8DCE3" stroke-width="2.4"/>
        <rect x="13" y="17" width="11" height="4.5" rx="2.2" fill="#D4D8DF"/>
        <rect x="27" y="16" width="12" height="6.5" rx="2.5" fill="#DDF4FF" stroke="#1CB0F6" stroke-width="1.8"/>
        <rect x="13" y="25" width="26" height="4.5" rx="2.2" fill="#D4D8DF"/>
        <rect x="13" y="32" width="13" height="6.5" rx="2.5" fill="#DDF4FF" stroke="#1CB0F6" stroke-width="1.8"/>
        <rect x="29" y="33" width="10" height="4.5" rx="2.2" fill="#D4D8DF"/>
      </svg>
    `;
  }
  if (typeId === 'interactive_reading') {
    return `
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <rect x="12" y="8" width="28" height="32" rx="6" fill="#F4F5F7" stroke="#E5E5E5" stroke-width="2.4"/>
        <rect x="8" y="13" width="28" height="31" rx="6" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="2.4"/>
        <rect x="14" y="20" width="16" height="3.5" rx="1.75" fill="#FF9600"/>
        <rect x="14" y="27" width="12" height="3.5" rx="1.75" fill="#D4D8DF"/>
        <rect x="14" y="34" width="14" height="3.5" rx="1.75" fill="#D4D8DF"/>
      </svg>
    `;
  }
  if (typeId === 'listen_type' || typeId === 'interactive_listening') {
    return `
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <rect x="8" y="10" width="32" height="28" rx="7" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="2.5"/>
        <path d="M16 21H20L26 16V32L20 27H16V21Z" fill="#1CB0F6"/>
        <path d="M29.5 19.5C31.5 21.5 31.5 26.5 29.5 28.5" stroke="#1CB0F6" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="28" y="32" width="16" height="10" rx="4" fill="#58CC02"/>
      </svg>
    `;
  }
  if (typeId === 'write_photo' || typeId === 'speak_photo') {
    const badgeColor = typeId === 'speak_photo' ? '#FF9600' : '#1CB0F6';
    return `
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <rect x="7" y="11" width="36" height="28" rx="7" fill="#DDF4FF" stroke="#E5E5E5" stroke-width="2.4"/>
        <circle cx="17" cy="20" r="3.5" fill="#FFC800"/>
        <path d="M10 35L19 25L27 32L32 27L40 35H10Z" fill="#58CC02"/>
        <circle cx="38" cy="36" r="7" fill="${badgeColor}"/>
      </svg>
    `;
  }
  if (typeId === 'writing_sample' || typeId === 'interactive_writing') {
    return `
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <rect x="7" y="11" width="38" height="30" rx="7" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="2.4"/>
        <rect x="13" y="19" width="22" height="4" rx="2" fill="#1CB0F6"/>
        <rect x="13" y="27" width="16" height="4" rx="2" fill="#D4D8DF"/>
        <circle cx="38" cy="35" r="6" fill="#58CC02"/>
      </svg>
    `;
  }
  return `
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <rect x="8" y="10" width="36" height="30" rx="8" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="2.4"/>
      <rect x="23" y="16" width="6" height="12" rx="3" fill="#1CB0F6"/>
      <path d="M18 25C18 28.866 21.134 32 25 32H27C30.866 32 34 28.866 34 25" stroke="#1CB0F6" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M26 32V36" stroke="#1CB0F6" stroke-width="2.4" stroke-linecap="round"/>
    </svg>
  `;
}

function getOwlLoaderHtml() {
  return `
    <div class="det-rs-loader">
      <div class="det-rs-owl-stage">
        <svg class="det-rs-owl" width="84" height="76" viewBox="0 0 84 76" fill="none" aria-hidden="true">
          <path d="M18 24C14 14 22 10 29 15C34 12 49 12 55 15C62 10 70 14 66 24C72 31 73 45 67 56C61 65 49 69 42 69C35 69 23 65 17 56C11 45 12 31 18 24Z" fill="#58CC02"/>
          <ellipse cx="42" cy="52" rx="17" ry="13" fill="#89E219"/>
          <circle cx="31" cy="33" r="10.5" fill="#FFFFFF"/>
          <circle cx="53" cy="33" r="10.5" fill="#FFFFFF"/>
          <circle cx="32.5" cy="33" r="5" fill="#3C3C3C"/>
          <circle cx="51.5" cy="33" r="5" fill="#3C3C3C"/>
          <circle cx="34" cy="31" r="1.8" fill="#FFFFFF"/>
          <circle cx="53" cy="31" r="1.8" fill="#FFFFFF"/>
          <path d="M37 40C37 37.5 47 37.5 47 40C47 43 43.5 46 42 46C40.5 46 37 43 37 40Z" fill="#FFC800"/>
          <rect x="27" y="66" width="11" height="5" rx="2.5" fill="#FF9600"/>
          <rect x="46" y="66" width="11" height="5" rx="2.5" fill="#FF9600"/>
        </svg>
        <svg class="det-rs-note-1" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M7 13V4L15 2.5V11" stroke="#1CB0F6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="5" cy="13.5" r="2.5" fill="#1CB0F6"/>
          <circle cx="13" cy="11.5" r="2.5" fill="#1CB0F6"/>
        </svg>
        <svg class="det-rs-note-2" width="13" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M6 10.5V3L11 2" stroke="#1CB0F6" stroke-width="2" stroke-linecap="round"/>
          <circle cx="4.5" cy="11" r="2.2" fill="#1CB0F6"/>
        </svg>
      </div>
      <div class="det-rs-loader-text">LOADING...</div>
    </div>
  `;
}

function getCompleteCardsSvg() {
  return `
    <svg width="116" height="96" viewBox="0 0 116 96" fill="none" aria-hidden="true">
      <rect x="14" y="14" width="44" height="44" rx="11" transform="rotate(-11 14 14)" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="3"/>
      <path d="M26 34.5L34.5 42.5L49 26" stroke="#1CB0F6" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="54" y="34" width="44" height="44" rx="11" transform="rotate(10 54 34)" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="3"/>
      <path d="M65.5 47.5L80.5 62.5M80.5 47.5L65.5 62.5" stroke="#1CB0F6" stroke-width="5.2" stroke-linecap="round"/>
    </svg>
  `;
}

function getFillBlanksCompleteSvg() {
  return `
    <svg width="116" height="58" viewBox="0 0 116 58" fill="none" aria-hidden="true">
      <rect x="8" y="12" width="32" height="34" rx="7" fill="#F4F5F7" stroke="#D8DCE3" stroke-width="2.8"/>
      <rect x="41" y="7" width="34" height="44" rx="9" fill="#DDF4FF" stroke="#1CB0F6" stroke-width="3.2"/>
      <rect x="76" y="12" width="32" height="34" rx="7" fill="#F4F5F7" stroke="#D8DCE3" stroke-width="2.8"/>
    </svg>
  `;
}

function getReadCompleteDoneSvg() {
  return `
    <svg width="110" height="92" viewBox="0 0 110 92" fill="none" aria-hidden="true">
      <rect x="13" y="10" width="84" height="72" rx="14" fill="#FFFFFF" stroke="#D8DCE3" stroke-width="3"/>
      <rect x="24" y="23" width="26" height="9" rx="4.5" fill="#D8DCE3"/>
      <rect x="56" y="21.5" width="29" height="12" rx="4.5" fill="#DDF4FF" stroke="#1CB0F6" stroke-width="2.8"/>
      <rect x="24" y="42" width="61" height="9" rx="4.5" fill="#D8DCE3"/>
      <rect x="24" y="58.5" width="30" height="12" rx="4.5" fill="#DDF4FF" stroke="#1CB0F6" stroke-width="2.8"/>
      <rect x="60" y="60" width="25" height="9" rx="4.5" fill="#D8DCE3"/>
    </svg>
  `;
}

function buildAnnotatedPassageHtml(item, details = []) {
  let bIdx = 0;
  return (item.segments || []).map((seg) => {
    if (seg.missing) {
      const det = details[bIdx] || { ok: false };
      bIdx += 1;
      const fullWord = `${seg.prefix || ''}${seg.missing || ''}`;
      return det.ok
        ? escapeHtml(fullWord)
        : `<span class="det-rc-missed-word">${escapeHtml(fullWord)}</span>`;
    }
    return escapeHtml(seg.text || '');
  }).join('');
}

function formatShortTimer(sec) {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// 3. SKILL PRACTICE HUB & DRILL VIEW
function renderPracticeHub() {
  const state = loadState();
  const lang = state.settings.uiLang || 'uz';
  const hasKey = Boolean(String(state.settings.apiKey || '').trim());

  const tabs = [
    { id: 'all', label: 'ALL' },
    { id: 'speaking', label: 'SPEAKING' },
    { id: 'writing', label: 'WRITING' },
    { id: 'reading', label: 'READING' },
    { id: 'listening', label: 'LISTENING' }
  ];

  const filtered = QUESTION_TYPES.filter((qt) =>
    practiceFilter === 'all' ? true : qt.skills.includes(practiceFilter)
  );

  mainEl.innerHTML = `
    <div class="det-hub-wrap">
      <div class="det-hub-hero">
        <div class="det-hub-hero-top">
          <h1 class="det-hub-hero-title">Take a full length<br/>practice test</h1>
          <div class="det-hub-hero-illus">${getHeroLaptopSvg()}</div>
        </div>
        <button type="button" id="hub-free-test" class="det-btn-blue">PRACTICE FREE</button>
      </div>

      <div class="det-hub-section-head">
        <h2 class="det-hub-section-title">Practice skills</h2>
        <select id="prac-diff" class="det-hub-diff-select" aria-label="Difficulty">
          <option value="adaptive" ${practiceDifficulty === 'adaptive' ? 'selected' : ''}>${escapeHtml(t(lang, 'adaptiveDiff'))}</option>
          <option value="1" ${practiceDifficulty === '1' ? 'selected' : ''}>Level 1 (B1)</option>
          <option value="2" ${practiceDifficulty === '2' ? 'selected' : ''}>Level 2 (B1+/B2)</option>
          <option value="3" ${practiceDifficulty === '3' ? 'selected' : ''}>Level 3 (B2)</option>
          <option value="4" ${practiceDifficulty === '4' ? 'selected' : ''}>Level 4 (C1)</option>
          <option value="5" ${practiceDifficulty === '5' ? 'selected' : ''}>Level 5 (C2)</option>
        </select>
      </div>

      <div class="det-hub-tabs" role="tablist">
        ${tabs.map((tab) => `
          <button type="button" role="tab" class="det-hub-tab ${practiceFilter === tab.id ? 'active' : ''}" data-filter="${tab.id}">
            ${tab.label}
          </button>
        `).join('')}
      </div>

      <div class="det-hub-list">
        ${filtered.map((qt) => {
          const stats = state.practiceStats[qt.id];
          const progressCount = Math.min(6, Number(stats?.attempts || 0));
          const progressPct = Math.round((progressCount / 6) * 100);
          return `
            <div class="det-skill-card" role="button" tabindex="0" data-run-bank="${qt.id}">
              <div class="det-skill-icon">${getSkillIconSvg(qt.id)}</div>
              <div class="det-skill-body">
                <div class="det-skill-title-row">
                  <div class="det-skill-title">${escapeHtml(qt.name)}</div>
                  ${qt.aiGeneratable && hasKey ? `<button type="button" class="det-skill-ai-btn" data-run-ai="${qt.id}">✨ AI</button>` : ''}
                </div>
                <div class="det-skill-prog-row">
                  <div class="det-skill-track">
                    <div class="det-skill-fill" style="width:${progressPct}%"></div>
                  </div>
                  <span class="det-skill-count">${progressCount}/6</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  mainEl.querySelector('#hub-free-test').addEventListener('click', () => navigate('mock'));

  mainEl.querySelector('#prac-diff').addEventListener('change', (e) => {
    practiceDifficulty = e.target.value;
  });

  mainEl.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      practiceFilter = btn.dataset.filter;
      renderPracticeHub();
    });
  });

  mainEl.querySelectorAll('[data-run-bank]').forEach((card) => {
    const launch = () => startPracticeSession(card.dataset.runBank, false);
    card.addEventListener('click', launch);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        launch();
      }
    });
  });

  mainEl.querySelectorAll('[data-run-ai]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!hasKey) {
        showToast(lang === 'uz' ? 'Avval Sozlamalardan Gemini API kalitini kiriting.' : 'Please add your Gemini API key in Settings first.', 'error');
        navigate('settings');
        return;
      }
      startPracticeSession(btn.dataset.runAi, true);
    });
  });
}

function getObjectiveFeedbackDetail(item, result) {
  if (item.type === 'read_select') {
    return item.isReal
      ? `"${item.word}" is a real English word.`
      : `"${item.word}" is NOT a real English word.`;
  }
  if (item.type === 'fill_blanks') {
    return `Correct word: ${item.fullWord || `${item.prefix}${item.missing}`}`;
  }
  if (item.type === 'read_complete') {
    return `${result.correctCount}/${result.totalBlanks} blanks exact (${result.pctScore}%)`;
  }
  if (item.type === 'listen_type') {
    return `Answer: ${item.sentence}`;
  }
  if (item.type === 'interactive_reading') {
    return `${result.passed}/${result.totalChecks} checks correct (${result.pctScore}%)`;
  }
  return result.expected || '';
}

function startReadSelectPractice(useAi) {
  const meta = getQuestionTypeMeta('read_select');
  const totalItems = meta.sessionLength || 15;
  const durationSec = meta.durationSec || 5;
  const sessionStartedAt = Date.now();
  const usedIds = new Set();
  const seenIds = getSeenIds('read_select');
  const maxKeep = Math.max(1, getBankCapacity('read_select') - 1);
  const sessionResults = [];

  const realCount = Math.random() < 0.5 ? Math.floor(totalItems / 2) : Math.ceil(totalItems / 2);
  const polaritySchedule = shuffleArray([
    ...new Array(realCount).fill(true),
    ...new Array(totalItems - realCount).fill(false)
  ]);

  let currentIndex = 0;
  let currentDiff = practiceDifficulty === 'adaptive' ? 3 : Number(practiceDifficulty);
  let soundOn = loadState().settings.soundEnabled !== false;
  let aborted = false;
  let loaderTimer = null;
  let itemTimerId = null;
  let finishDotsTimer = null;
  let activeRenderer = null;
  let continueKeyListener = null;
  let batchQueue = null;

  topNavEl?.classList.add('hidden');
  mainEl?.classList.add('arena-mode');

  const clearItemTimers = () => {
    if (loaderTimer) { clearTimeout(loaderTimer); loaderTimer = null; }
    if (itemTimerId) { clearInterval(itemTimerId); itemTimerId = null; }
    if (finishDotsTimer) { clearTimeout(finishDotsTimer); finishDotsTimer = null; }
    if (continueKeyListener) {
      document.removeEventListener('keydown', continueKeyListener);
      continueKeyListener = null;
    }
  };

  practiceCleanup = () => {
    aborted = true;
    clearItemTimers();
    activeRenderer?.cleanup();
    activeRenderer = null;
  };

  mainEl.innerHTML = getOwlLoaderHtml();

  const renderCompletion = () => {
    clearItemTimers();
    activeRenderer?.cleanup();
    activeRenderer = null;
    if (aborted) return;

    const totalSec = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000));
    const avgPct = sessionResults.length
      ? Math.round(sessionResults.reduce((s, r) => s + r.result.pctScore, 0) / sessionResults.length)
      : 0;
    const correctCount = sessionResults.filter((r) => r.result.correct).length;
    const sessionDetScore = estimateAbilityIRT(sessionResults.map((r) => ({
      type: 'read_select',
      difficulty: r.item.difficulty || 3,
      pctScore: r.result.pctScore
    })));
    const rangeLow = Math.max(10, sessionDetScore - 5);
    const rangeHigh = Math.min(160, sessionDetScore + 5);

    if (sessionResults.length > 0) {
      recordPracticeAttempt({
        type: 'read_select',
        detScore: sessionDetScore,
        pctScore: avgPct,
        timeSec: totalSec
      });
      syncChrome();
    }

    playCompleteSound(soundOn);
    const missedItems = sessionResults.filter((r) => !r.result.correct);

    mainEl.innerHTML = `
      <div class="det-rs-complete">
        <div class="det-rs-complete-body">
          ${getCompleteCardsSvg()}
          <h2 class="det-rs-complete-title">Practice complete! Keep it up!</h2>
          <p class="det-rs-complete-sub">${correctCount}/${sessionResults.length} correct · DET Band ${sessionDetScore} (${rangeLow}–${rangeHigh})</p>
          ${missedItems.length > 0 ? `
            <button type="button" id="dp-rs-missed-btn" class="det-rs-missed-toggle">
              Review ${missedItems.length} missed ${missedItems.length === 1 ? 'word' : 'words'}
            </button>
            <div id="dp-rs-missed-panel" class="det-rs-missed-panel hidden">
              ${missedItems.map((m) => `
                <div class="det-rs-missed-row">
                  <strong>${escapeHtml(m.item.word)}</strong>
                  <span style="color:#777777;"> — ${m.item.isReal ? 'Real English word (Yes)' : 'Not a real word (No)'}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="det-rs-complete-footer">
          <button type="button" id="dp-rs-done" class="det-btn-blue">DONE</button>
        </div>
      </div>
    `;

    const missedBtn = mainEl.querySelector('#dp-rs-missed-btn');
    const missedPanel = mainEl.querySelector('#dp-rs-missed-panel');
    missedBtn?.addEventListener('click', () => {
      missedPanel?.classList.toggle('hidden');
    });

    const finishSession = () => {
      playTapSound(soundOn);
      navigate('practice');
    };

    mainEl.querySelector('#dp-rs-done').addEventListener('click', finishSession);
    continueKeyListener = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finishSession();
      }
    };
    document.addEventListener('keydown', continueKeyListener);
  };

  const launchArena = () => {
    if (aborted) return;

    mainEl.innerHTML = `
      <div class="det-rs-shell">
        <header class="det-rs-header">
          <div class="det-rs-header-inner">
            <div class="det-rs-timer-group">
              <span class="det-rs-timer-clock" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.1"/>
                  <path d="M12 7.5V12.5L15 14.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span id="dp-rs-timer" class="det-rs-timer-val">0:05</span>
              <span class="det-rs-timer-sub"><span>for this</span><span>question</span></span>
            </div>
            <div class="det-rs-header-actions">
              <button type="button" id="dp-rs-sound" class="det-rs-icon-btn" title="Toggle Sound">${soundOn ? '🔊' : '🔇'}</button>
              <button type="button" id="dp-rs-exit" class="det-rs-icon-btn" title="Exit Practice" aria-label="Exit">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </header>
        <main class="det-rs-stage">
          <div id="dp-rs-mount" style="width:100%;"></div>
        </main>
        <div id="dp-rs-drawer" class="det-rs-drawer hidden"></div>
      </div>
    `;

    const timerEl = mainEl.querySelector('#dp-rs-timer');
    const mountEl = mainEl.querySelector('#dp-rs-mount');
    const drawerEl = mainEl.querySelector('#dp-rs-drawer');
    const soundBtn = mainEl.querySelector('#dp-rs-sound');

    mainEl.querySelector('#dp-rs-exit').addEventListener('click', () => navigate('practice'));
    soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      soundBtn.textContent = soundOn ? '🔊' : '🔇';
      updateSettings({ soundEnabled: soundOn });
    });

    const loadWord = async () => {
      if (aborted) return;
      clearItemTimers();
      activeRenderer?.cleanup();
      activeRenderer = null;

      if (currentIndex >= totalItems) {
        renderCompletion();
        return;
      }

      const settings = loadState().settings;
      const lang = settings.uiLang || 'uz';
      const item = batchQueue
        ? (batchQueue[currentIndex] || pickQuestionFromBank('read_select', currentDiff, usedIds, { seenIds, preferReal: polaritySchedule[currentIndex] }))
        : pickQuestionFromBank('read_select', currentDiff, usedIds, { seenIds, preferReal: polaritySchedule[currentIndex] });

      usedIds.add(item.id);
      if (!item.isAiGenerated) {
        seenIds.add(item.id);
        markSeenIds('read_select', [item.id], maxKeep);
      }
      if (item.word) {
        recordRecentReadSelectWords([item.word]);
      }

      drawerEl.className = 'det-rs-drawer hidden';
      drawerEl.innerHTML = '';

      let leftSec = durationSec;
      let submitted = false;

      const updateTimerUi = () => {
        if (!timerEl) return;
        timerEl.textContent = formatShortTimer(leftSec);
        timerEl.classList.toggle('urgent', leftSec <= 1);
      };
      updateTimerUi();

      const handleAnswer = async (overrideAns = undefined, timedOut = false) => {
        if (submitted || aborted) return;
        submitted = true;
        clearItemTimers();

        const answer = overrideAns !== undefined ? overrideAns : await activeRenderer.getAnswer();
        activeRenderer.cleanup();
        if (aborted) return;

        const result = await gradeAnyItem({ item, answer, settings });
        if (aborted) return;

        sessionResults.push({ item, result });

        if (!result.correct) {
          addMistake({
            type: 'read_select',
            prompt: item.word,
            userAnswer: result.userSummary,
            correctAnswer: result.expected,
            note: 'Skill Practice'
          });
          syncChrome();
        }

        if (practiceDifficulty === 'adaptive') {
          currentDiff = nextAdaptiveDifficulty(currentDiff, result.pctScore);
        }

        applyObjectiveReviewVisuals(mountEl, item, result);

        if (timedOut && answer == null) {
          playTimeoutSound(soundOn);
        } else if (result.correct) {
          playCorrectSound(soundOn);
        } else {
          playWrongSound(soundOn);
        }

        const isCorrect = Boolean(result.correct);
        const badgeSvg = isCorrect
          ? `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4.5 10.5L8.2 14.2L15.5 6.2" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/></svg>`;

        drawerEl.className = `det-rs-drawer ${isCorrect ? 'correct' : 'wrong'}`;
        drawerEl.innerHTML = `
          <div class="det-rs-drawer-inner">
            <div class="det-rs-drawer-row">
              <span class="det-rs-badge">${badgeSvg}</span>
              <span class="det-rs-heading">${isCorrect ? 'Great job!' : 'Incorrect'}</span>
            </div>
            <button type="button" id="dp-rs-cta" class="det-rs-cta">${isCorrect ? 'CONTINUE' : 'GOT IT'}</button>
          </div>
        `;

        const ctaBtn = drawerEl.querySelector('#dp-rs-cta');
        let proceeding = false;
        const proceed = () => {
          if (proceeding || aborted) return;
          proceeding = true;
          if (continueKeyListener) {
            document.removeEventListener('keydown', continueKeyListener);
            continueKeyListener = null;
          }
          playTapSound(soundOn);

          const isLast = currentIndex + 1 >= totalItems;
          if (isLast) {
            ctaBtn.disabled = true;
            ctaBtn.innerHTML = '<span class="det-loading-dots"><span></span><span></span><span></span></span>';
            finishDotsTimer = setTimeout(() => {
              finishDotsTimer = null;
              if (!aborted) renderCompletion();
            }, 420);
          } else {
            currentIndex += 1;
            loadWord();
          }
        };

        ctaBtn.addEventListener('click', proceed);
        continueKeyListener = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            proceed();
          }
        };
        document.addEventListener('keydown', continueKeyListener);
      };

      activeRenderer = mountQuestionRenderer(mountEl, item, {
        settings,
        lang,
        onImmediateSubmit: (val) => handleAnswer(val, false)
      });

      itemTimerId = setInterval(() => {
        leftSec -= 1;
        updateTimerUi();
        if (leftSec <= 0) {
          handleAnswer(null, true);
        }
      }, 1000);
    };

    loadWord();
  };

  const settings = loadState().settings;
  const minDelay = new Promise((resolve) => {
    loaderTimer = setTimeout(() => {
      loaderTimer = null;
      resolve();
    }, 550);
  });

  if (useAi && settings.apiKey) {
    Promise.all([
      minDelay,
      generateReadSelectBatch({
        apiKey: settings.apiKey,
        model: settings.model,
        count: totalItems,
        difficulty: currentDiff,
        avoidWords: getRecentReadSelectWords()
      }).then((aiWords) => {
        const list = [...aiWords];
        if (list.length < totalItems) {
          list.push(...buildReadSelectRound({
            count: totalItems - list.length,
            difficulty: currentDiff,
            seenIds,
            usedIds
          }));
        }
        batchQueue = shuffleArray(list);
      }).catch((err) => {
        const lang = loadState().settings.uiLang || 'uz';
        showToast(`${t(lang, 'aiFallbackNotice')} (${err.message})`, 'error');
        batchQueue = buildReadSelectRound({ count: totalItems, difficulty: currentDiff, seenIds, usedIds });
      })
    ]).then(() => {
      if (!aborted) launchArena();
    });
  } else {
    minDelay.then(() => {
      if (!aborted) launchArena();
    });
  }
}

function startFillBlanksPractice(useAi) {
  const meta = getQuestionTypeMeta('fill_blanks');
  const totalItems = meta.sessionLength || 5;
  const durationSec = meta.durationSec || 20;
  const sessionStartedAt = Date.now();
  const usedIds = new Set();
  const seenIds = getSeenIds('fill_blanks');
  const maxKeep = Math.max(1, getBankCapacity('fill_blanks') - 1);
  const sessionResults = [];

  let currentIndex = 0;
  let currentDiff = practiceDifficulty === 'adaptive' ? 3 : Number(practiceDifficulty);
  let soundOn = loadState().settings.soundEnabled !== false;
  let aborted = false;
  let loaderTimer = null;
  let itemTimerId = null;
  let finishDotsTimer = null;
  let drawerKeyTimer = null;
  let activeRenderer = null;
  let continueKeyListener = null;
  let prefetchedNext = null;

  topNavEl?.classList.add('hidden');
  mainEl?.classList.add('arena-mode');

  const clearItemTimers = () => {
    if (loaderTimer) { clearTimeout(loaderTimer); loaderTimer = null; }
    if (itemTimerId) { clearInterval(itemTimerId); itemTimerId = null; }
    if (finishDotsTimer) { clearTimeout(finishDotsTimer); finishDotsTimer = null; }
    if (drawerKeyTimer) { clearTimeout(drawerKeyTimer); drawerKeyTimer = null; }
    if (continueKeyListener) {
      document.removeEventListener('keydown', continueKeyListener);
      continueKeyListener = null;
    }
  };

  practiceCleanup = () => {
    aborted = true;
    clearItemTimers();
    activeRenderer?.cleanup();
    activeRenderer = null;
  };

  const prefetchAiItem = (idx, diff) => {
    const s = loadState().settings;
    if (!useAi || !s.apiKey || idx >= totalItems) {
      prefetchedNext = null;
      return;
    }
    prefetchedNext = {
      index: idx,
      promise: generateQuestion({ apiKey: s.apiKey, model: s.model, type: 'fill_blanks', difficulty: diff }).catch(() => null)
    };
  };

  mainEl.innerHTML = getOwlLoaderHtml();

  const renderCompletion = () => {
    clearItemTimers();
    activeRenderer?.cleanup();
    activeRenderer = null;
    if (aborted) return;

    const totalSec = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000));
    const avgPct = sessionResults.length
      ? Math.round(sessionResults.reduce((s, r) => s + r.result.pctScore, 0) / sessionResults.length)
      : 0;
    const correctCount = sessionResults.filter((r) => r.result.correct).length;
    const sessionDetScore = estimateAbilityIRT(sessionResults.map((r) => ({
      type: 'fill_blanks',
      difficulty: r.item.difficulty || 3,
      pctScore: r.result.pctScore
    })));
    const rangeLow = Math.max(10, sessionDetScore - 5);
    const rangeHigh = Math.min(160, sessionDetScore + 5);

    if (sessionResults.length > 0) {
      recordPracticeAttempt({
        type: 'fill_blanks',
        detScore: sessionDetScore,
        pctScore: avgPct,
        timeSec: totalSec
      });
      syncChrome();
    }

    playCompleteSound(soundOn);
    const missedItems = sessionResults.filter((r) => !r.result.correct);

    mainEl.innerHTML = `
      <div class="det-rs-complete">
        <div class="det-rs-complete-body">
          ${getFillBlanksCompleteSvg()}
          <h2 class="det-rs-complete-title">Practice complete! Keep it up!</h2>
          <p class="det-rs-complete-sub">${correctCount}/${sessionResults.length} correct · DET Band ${sessionDetScore} (${rangeLow}–${rangeHigh})</p>
          ${missedItems.length > 0 ? `
            <button type="button" id="dp-fb-missed-btn" class="det-rs-missed-toggle">
              Review ${missedItems.length} missed ${missedItems.length === 1 ? 'word' : 'words'}
            </button>
            <div id="dp-fb-missed-panel" class="det-rs-missed-panel hidden">
              ${missedItems.map((m) => `
                <div class="det-rs-missed-row">
                  <strong>${escapeHtml(m.item.fullWord || `${m.item.prefix || ''}${m.item.missing || ''}`)}</strong>
                  <span style="color:#777777;"> — ${escapeHtml(`${m.item.before || ''}${m.item.fullWord || `${m.item.prefix || ''}${m.item.missing || ''}`}${m.item.after || ''}`)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="det-rs-complete-footer">
          <button type="button" id="dp-fb-done" class="det-btn-blue">DONE</button>
        </div>
      </div>
    `;

    const missedBtn = mainEl.querySelector('#dp-fb-missed-btn');
    const missedPanel = mainEl.querySelector('#dp-fb-missed-panel');
    missedBtn?.addEventListener('click', () => {
      missedPanel?.classList.toggle('hidden');
    });

    const finishSession = () => {
      playTapSound(soundOn);
      navigate('practice');
    };

    mainEl.querySelector('#dp-fb-done').addEventListener('click', finishSession);
    continueKeyListener = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finishSession();
      }
    };
    document.addEventListener('keydown', continueKeyListener);
  };

  const launchArena = () => {
    if (aborted) return;

    mainEl.innerHTML = `
      <div class="det-rs-shell">
        <header class="det-rs-header">
          <div class="det-rs-header-inner">
            <div class="det-rs-timer-group">
              <span class="det-rs-timer-clock" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.1"/>
                  <path d="M12 7.5V12.5L15 14.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span id="dp-fb-timer" class="det-rs-timer-val">0:20</span>
              <span class="det-rs-timer-sub"><span>for this</span><span>question</span></span>
            </div>
            <div class="det-rs-header-actions">
              <button type="button" id="dp-fb-sound" class="det-rs-icon-btn" title="Toggle Sound">${soundOn ? '🔊' : '🔇'}</button>
              <button type="button" id="dp-fb-exit" class="det-rs-icon-btn" title="Exit Practice" aria-label="Exit">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </header>
        <main class="det-fb-stage">
          <div id="dp-fb-mount" style="width:100%;"></div>
        </main>
        <div id="dp-fb-submit-bar" class="det-fb-submit-bar">
          <div class="det-fb-submit-inner">
            <button type="button" id="dp-fb-submit" class="det-btn-blue" disabled>SUBMIT</button>
          </div>
        </div>
        <div id="dp-fb-drawer" class="det-rs-drawer hidden"></div>
      </div>
    `;

    const timerEl = mainEl.querySelector('#dp-fb-timer');
    const mountEl = mainEl.querySelector('#dp-fb-mount');
    const submitBarEl = mainEl.querySelector('#dp-fb-submit-bar');
    const submitBtnEl = mainEl.querySelector('#dp-fb-submit');
    const drawerEl = mainEl.querySelector('#dp-fb-drawer');
    const soundBtn = mainEl.querySelector('#dp-fb-sound');

    mainEl.querySelector('#dp-fb-exit').addEventListener('click', () => navigate('practice'));
    soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      soundBtn.textContent = soundOn ? '🔊' : '🔇';
      updateSettings({ soundEnabled: soundOn });
    });

    let activeSubmitHandler = null;
    submitBtnEl.addEventListener('click', () => {
      if (activeSubmitHandler) activeSubmitHandler();
    });

    const loadItem = async () => {
      if (aborted) return;
      clearItemTimers();
      activeRenderer?.cleanup();
      activeRenderer = null;

      if (currentIndex >= totalItems) {
        renderCompletion();
        return;
      }

      const settings = loadState().settings;
      const lang = settings.uiLang || 'uz';
      let item = null;

      if (useAi && settings.apiKey) {
        if (prefetchedNext && prefetchedNext.index === currentIndex) {
          item = await prefetchedNext.promise;
        }
        if (!item) {
          try {
            item = await generateQuestion({ apiKey: settings.apiKey, model: settings.model, type: 'fill_blanks', difficulty: currentDiff });
          } catch (err) {
            showToast(`${t(lang, 'aiFallbackNotice')} (${err.message})`, 'error');
          }
        }
      }

      if (!item) {
        item = pickQuestionFromBank('fill_blanks', currentDiff, usedIds, { seenIds });
      }
      if (aborted) return;

      usedIds.add(item.id);
      if (!item.isAiGenerated) {
        seenIds.add(item.id);
        markSeenIds('fill_blanks', [item.id], maxKeep);
      }
      prefetchAiItem(currentIndex + 1, currentDiff);

      drawerEl.className = 'det-rs-drawer hidden';
      drawerEl.innerHTML = '';
      submitBarEl.classList.remove('hidden');
      submitBtnEl.disabled = true;

      let leftSec = durationSec;
      let submitted = false;

      const updateTimerUi = () => {
        if (!timerEl) return;
        timerEl.textContent = formatShortTimer(leftSec);
        timerEl.classList.toggle('urgent', leftSec <= 3);
      };
      updateTimerUi();

      const handleAnswer = async (timedOut = false) => {
        if (submitted || aborted) return;
        submitted = true;
        activeSubmitHandler = null;
        clearItemTimers();

        const answer = await activeRenderer.getAnswer();
        activeRenderer.cleanup();
        if (aborted) return;

        const result = await gradeAnyItem({ item, answer, settings });
        if (aborted) return;

        sessionResults.push({ item, result });

        const expectedWord = item.fullWord || `${item.prefix || ''}${item.missing || ''}`;
        const fullSentence = `${item.before || ''}${expectedWord}${item.after || ''}`;

        if (!result.correct) {
          addMistake({
            type: 'fill_blanks',
            prompt: `${item.before || ''}${item.prefix || ''}___${item.after || ''}`,
            userAnswer: result.userSummary,
            correctAnswer: expectedWord,
            note: 'Fill in the Blanks'
          });
          syncChrome();
        }

        if (practiceDifficulty === 'adaptive') {
          currentDiff = nextAdaptiveDifficulty(currentDiff, result.pctScore);
        }

        applyObjectiveReviewVisuals(mountEl, item, result);
        submitBarEl.classList.add('hidden');

        if (timedOut && (!answer || !String(answer).trim())) {
          playTimeoutSound(soundOn);
        } else if (result.correct) {
          playCorrectSound(soundOn);
        } else {
          playWrongSound(soundOn);
        }

        const isCorrect = Boolean(result.correct);
        const badgeSvg = isCorrect
          ? `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4.5 10.5L8.2 14.2L15.5 6.2" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/></svg>`;

        drawerEl.className = `det-rs-drawer ${isCorrect ? 'correct' : 'wrong'}`;
        drawerEl.innerHTML = `
          <div class="det-rs-drawer-inner">
            <div class="det-rs-drawer-row">
              <span class="det-rs-badge">${badgeSvg}</span>
              <span class="det-rs-heading">${isCorrect ? 'Great job!' : 'Incorrect'}</span>
            </div>
            ${!isCorrect ? `
              <div>
                <div class="det-fb-correct-label">Correct Answer:</div>
                <p class="det-fb-correct-sentence">${escapeHtml(fullSentence)}</p>
              </div>
            ` : ''}
            <button type="button" id="dp-fb-cta" class="det-rs-cta">${isCorrect ? 'CONTINUE' : 'GOT IT'}</button>
          </div>
        `;

        const ctaBtn = drawerEl.querySelector('#dp-fb-cta');
        let proceeding = false;
        const proceed = () => {
          if (proceeding || aborted) return;
          proceeding = true;
          if (drawerKeyTimer) {
            clearTimeout(drawerKeyTimer);
            drawerKeyTimer = null;
          }
          if (continueKeyListener) {
            document.removeEventListener('keydown', continueKeyListener);
            continueKeyListener = null;
          }
          playTapSound(soundOn);

          const isLast = currentIndex + 1 >= totalItems;
          if (isLast) {
            ctaBtn.disabled = true;
            ctaBtn.innerHTML = '<span class="det-loading-dots"><span></span><span></span><span></span></span>';
            finishDotsTimer = setTimeout(() => {
              finishDotsTimer = null;
              if (!aborted) renderCompletion();
            }, 420);
          } else {
            currentIndex += 1;
            loadItem();
          }
        };

        ctaBtn.addEventListener('click', proceed);
        continueKeyListener = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            proceed();
          }
        };
        drawerKeyTimer = setTimeout(() => {
          drawerKeyTimer = null;
          if (!aborted && !proceeding && continueKeyListener) {
            document.addEventListener('keydown', continueKeyListener);
          }
        }, 0);
      };

      activeSubmitHandler = () => {
        if (!submitBtnEl.disabled) {
          handleAnswer(false);
        }
      };

      activeRenderer = mountQuestionRenderer(mountEl, item, {
        settings,
        lang,
        onSubmitReady: (allFilled) => {
          if (!submitted && !aborted) {
            submitBtnEl.disabled = !allFilled;
          }
        },
        onEnterSubmit: () => {
          if (!submitted && !aborted && !submitBtnEl.disabled) {
            handleAnswer(false);
          }
        }
      });

      itemTimerId = setInterval(() => {
        leftSec -= 1;
        updateTimerUi();
        if (leftSec <= 0) {
          handleAnswer(true);
        }
      }, 1000);
    };

    loadItem();
  };

  const settings = loadState().settings;
  const minDelay = new Promise((resolve) => {
    loaderTimer = setTimeout(() => {
      loaderTimer = null;
      resolve();
    }, 550);
  });

  if (useAi && settings.apiKey) {
    Promise.all([
      minDelay,
      prefetchAiItem(0, currentDiff) || prefetchedNext?.promise
    ]).then(() => {
      if (!aborted) launchArena();
    });
  } else {
    minDelay.then(() => {
      if (!aborted) launchArena();
    });
  }
}

function startReadCompletePractice(useAi) {
  const meta = getQuestionTypeMeta('read_complete');
  const totalItems = meta.sessionLength || 2;
  const durationSec = meta.durationSec || 180;
  const sessionStartedAt = Date.now();
  const usedIds = new Set();
  const seenIds = getSeenIds('read_complete');
  const maxKeep = Math.max(1, getBankCapacity('read_complete') - 1);
  const sessionResults = [];

  let currentIndex = 0;
  let currentDiff = practiceDifficulty === 'adaptive' ? 3 : Number(practiceDifficulty);
  let soundOn = loadState().settings.soundEnabled !== false;
  let aborted = false;
  let loaderTimer = null;
  let itemTimerId = null;
  let finishDotsTimer = null;
  let drawerKeyTimer = null;
  let activeRenderer = null;
  let continueKeyListener = null;
  let prefetchedNext = null;

  topNavEl?.classList.add('hidden');
  mainEl?.classList.add('arena-mode');

  const clearItemTimers = () => {
    if (loaderTimer) { clearTimeout(loaderTimer); loaderTimer = null; }
    if (itemTimerId) { clearInterval(itemTimerId); itemTimerId = null; }
    if (finishDotsTimer) { clearTimeout(finishDotsTimer); finishDotsTimer = null; }
    if (drawerKeyTimer) { clearTimeout(drawerKeyTimer); drawerKeyTimer = null; }
    if (continueKeyListener) {
      document.removeEventListener('keydown', continueKeyListener);
      continueKeyListener = null;
    }
  };

  practiceCleanup = () => {
    aborted = true;
    clearItemTimers();
    activeRenderer?.cleanup();
    activeRenderer = null;
  };

  const prefetchAiItem = (idx, diff) => {
    const s = loadState().settings;
    if (!useAi || !s.apiKey || idx >= totalItems) {
      prefetchedNext = null;
      return;
    }
    prefetchedNext = {
      index: idx,
      promise: generateQuestion({ apiKey: s.apiKey, model: s.model, type: 'read_complete', difficulty: diff }).catch(() => null)
    };
  };

  mainEl.innerHTML = getOwlLoaderHtml();

  const renderCompletion = () => {
    clearItemTimers();
    activeRenderer?.cleanup();
    activeRenderer = null;
    if (aborted) return;

    const totalSec = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000));
    const totalExact = sessionResults.reduce((s, r) => s + (r.result.correctCount || 0), 0);
    const totalBlanks = sessionResults.reduce((s, r) => s + (r.result.totalBlanks || 0), 0);
    const avgPct = sessionResults.length
      ? Math.round(sessionResults.reduce((s, r) => s + r.result.pctScore, 0) / sessionResults.length)
      : 0;
    const sessionDetScore = estimateAbilityIRT(sessionResults.map((r) => ({
      type: 'read_complete',
      difficulty: r.item.difficulty || 3,
      pctScore: r.result.pctScore
    })));
    const rangeLow = Math.max(10, sessionDetScore - 5);
    const rangeHigh = Math.min(160, sessionDetScore + 5);

    if (sessionResults.length > 0) {
      recordPracticeAttempt({
        type: 'read_complete',
        detScore: sessionDetScore,
        pctScore: avgPct,
        timeSec: totalSec
      });
      syncChrome();
    }

    playCompleteSound(soundOn);

    const missedWords = [];
    sessionResults.forEach((r) => {
      (r.result.details || []).forEach((d) => {
        if (!d.ok) {
          missedWords.push({
            fullWord: `${d.prefix || ''}${d.expected || ''}`,
            got: d.got ? `${d.prefix || ''}${d.got}` : '—',
            title: r.item.title || ''
          });
        }
      });
    });

    mainEl.innerHTML = `
      <div class="det-rs-complete">
        <div class="det-rs-complete-body">
          ${getReadCompleteDoneSvg()}
          <h2 class="det-rs-complete-title">Practice complete! Keep it up!</h2>
          <p class="det-rs-complete-sub">${totalExact}/${totalBlanks} blanks exact · DET Band ${sessionDetScore} (${rangeLow}–${rangeHigh})</p>
          ${missedWords.length > 0 ? `
            <button type="button" id="dp-rc-missed-btn" class="det-rs-missed-toggle">
              Review ${missedWords.length} missed ${missedWords.length === 1 ? 'word' : 'words'}
            </button>
            <div id="dp-rc-missed-panel" class="det-rs-missed-panel hidden">
              ${missedWords.slice(0, 18).map((m) => `
                <div class="det-rs-missed-row">
                  <strong>${escapeHtml(m.fullWord)}</strong>
                  <span style="color:#777777;"> · Your input: ${escapeHtml(m.got)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="det-rs-complete-footer">
          <button type="button" id="dp-rc-done" class="det-btn-blue">DONE</button>
        </div>
      </div>
    `;

    const missedBtn = mainEl.querySelector('#dp-rc-missed-btn');
    const missedPanel = mainEl.querySelector('#dp-rc-missed-panel');
    missedBtn?.addEventListener('click', () => {
      missedPanel?.classList.toggle('hidden');
    });

    const finishSession = () => {
      playTapSound(soundOn);
      navigate('practice');
    };

    mainEl.querySelector('#dp-rc-done').addEventListener('click', finishSession);
    continueKeyListener = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finishSession();
      }
    };
    document.addEventListener('keydown', continueKeyListener);
  };

  const launchArena = () => {
    if (aborted) return;

    mainEl.innerHTML = `
      <div class="det-rs-shell">
        <header class="det-rs-header">
          <div class="det-rs-header-inner">
            <div class="det-rs-timer-group">
              <span class="det-rs-timer-clock" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.1"/>
                  <path d="M12 7.5V12.5L15 14.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span id="dp-rc-timer" class="det-rs-timer-val">3:00</span>
              <span class="det-rs-timer-sub"><span>for this</span><span>question</span></span>
            </div>
            <div class="det-rs-header-actions">
              <button type="button" id="dp-rc-sound" class="det-rs-icon-btn" title="Toggle Sound">${soundOn ? '🔊' : '🔇'}</button>
              <button type="button" id="dp-rc-exit" class="det-rs-icon-btn" title="Exit Practice" aria-label="Exit">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </header>
        <main class="det-fb-stage">
          <div id="dp-rc-mount" style="width:100%;"></div>
        </main>
        <div id="dp-rc-submit-bar" class="det-fb-submit-bar">
          <div class="det-fb-submit-inner">
            <button type="button" id="dp-rc-submit" class="det-btn-blue" disabled>SUBMIT</button>
          </div>
        </div>
        <div id="dp-rc-drawer" class="det-rs-drawer hidden"></div>
      </div>
    `;

    const timerEl = mainEl.querySelector('#dp-rc-timer');
    const mountEl = mainEl.querySelector('#dp-rc-mount');
    const submitBarEl = mainEl.querySelector('#dp-rc-submit-bar');
    const submitBtnEl = mainEl.querySelector('#dp-rc-submit');
    const drawerEl = mainEl.querySelector('#dp-rc-drawer');
    const soundBtn = mainEl.querySelector('#dp-rc-sound');

    mainEl.querySelector('#dp-rc-exit').addEventListener('click', () => navigate('practice'));
    soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      soundBtn.textContent = soundOn ? '🔊' : '🔇';
      updateSettings({ soundEnabled: soundOn });
    });

    let activeSubmitHandler = null;
    submitBtnEl.addEventListener('click', () => {
      if (activeSubmitHandler) activeSubmitHandler();
    });

    const loadPassage = async () => {
      if (aborted) return;
      clearItemTimers();
      activeRenderer?.cleanup();
      activeRenderer = null;

      if (currentIndex >= totalItems) {
        renderCompletion();
        return;
      }

      const settings = loadState().settings;
      const lang = settings.uiLang || 'uz';
      let item = null;

      if (useAi && settings.apiKey) {
        if (prefetchedNext && prefetchedNext.index === currentIndex) {
          item = await prefetchedNext.promise;
        }
        if (!item) {
          try {
            item = await generateQuestion({ apiKey: settings.apiKey, model: settings.model, type: 'read_complete', difficulty: currentDiff });
          } catch (err) {
            showToast(`${t(lang, 'aiFallbackNotice')} (${err.message})`, 'error');
          }
        }
      }

      if (!item) {
        item = pickQuestionFromBank('read_complete', currentDiff, usedIds, { seenIds });
      }
      if (aborted) return;

      usedIds.add(item.id);
      if (!item.isAiGenerated) {
        seenIds.add(item.id);
        markSeenIds('read_complete', [item.id], maxKeep);
      }
      prefetchAiItem(currentIndex + 1, currentDiff);

      drawerEl.className = 'det-rs-drawer hidden';
      drawerEl.innerHTML = '';
      submitBarEl.classList.remove('hidden');
      submitBtnEl.disabled = true;

      let leftSec = durationSec;
      let submitted = false;

      const updateTimerUi = () => {
        if (!timerEl) return;
        timerEl.textContent = formatShortTimer(leftSec);
        timerEl.classList.toggle('urgent', leftSec <= 15);
      };
      updateTimerUi();

      const handleAnswer = async (timedOut = false) => {
        if (submitted || aborted) return;
        submitted = true;
        activeSubmitHandler = null;
        clearItemTimers();

        const answer = await activeRenderer.getAnswer();
        activeRenderer.cleanup();
        if (aborted) return;

        const result = await gradeAnyItem({ item, answer, settings });
        if (aborted) return;

        sessionResults.push({ item, result });

        if (!result.correct) {
          const missedSummary = (result.details || [])
            .filter((d) => !d.ok)
            .slice(0, 6)
            .map((d) => `${d.prefix || ''}${d.expected || ''}`)
            .join(', ');
          addMistake({
            type: 'read_complete',
            prompt: item.title || 'Read and Complete',
            userAnswer: result.userSummary,
            correctAnswer: missedSummary || result.expected,
            note: 'Read and Complete'
          });
          syncChrome();
        }

        if (practiceDifficulty === 'adaptive') {
          currentDiff = nextAdaptiveDifficulty(currentDiff, result.pctScore);
        }

        applyObjectiveReviewVisuals(mountEl, item, result);
        submitBarEl.classList.add('hidden');

        const outcome = result.correctCount === result.totalBlanks
          ? 'correct'
          : (result.correctCount > 0 ? 'partial' : 'wrong');

        if (outcome === 'correct') {
          playCorrectSound(soundOn);
        } else if (outcome === 'partial') {
          playPartialSound(soundOn);
        } else if (timedOut) {
          playTimeoutSound(soundOn);
        } else {
          playWrongSound(soundOn);
        }

        const checkBadgeSvg = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4.5 10.5L8.2 14.2L15.5 6.2" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const crossBadgeSvg = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/></svg>`;
        const chevronSvg = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 12.5L10 7.5L15 12.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        if (outcome === 'correct') {
          drawerEl.className = 'det-rs-drawer correct';
          drawerEl.innerHTML = `
            <div class="det-rs-drawer-inner">
              <div class="det-rs-drawer-row">
                <span class="det-rs-badge">${checkBadgeSvg}</span>
                <span class="det-rs-heading">Great job!</span>
              </div>
              <button type="button" id="dp-rc-cta" class="det-rs-cta">CONTINUE</button>
            </div>
          `;
        } else {
          const isPartial = outcome === 'partial';
          const annotatedHtml = buildAnnotatedPassageHtml(item, result.details || []);
          drawerEl.className = `det-rs-drawer ${isPartial ? 'partial' : 'wrong'}`;
          drawerEl.innerHTML = `
            <div class="det-rs-drawer-inner">
              <div class="det-rc-drawer-top">
                <div class="det-rs-drawer-row">
                  <span class="det-rs-badge">${isPartial ? checkBadgeSvg : crossBadgeSvg}</span>
                  <span class="det-rs-heading">${isPartial ? 'Partially correct' : 'Incorrect'}</span>
                </div>
                <button type="button" id="dp-rc-expand" class="det-rc-expand-btn" aria-label="Expand answer">${chevronSvg}</button>
              </div>
              <div id="dp-rc-answer-box" class="det-rc-answer-box">
                <div class="det-rc-answer-label">Correct Answer:</div>
                <div class="det-rc-answer-text">${annotatedHtml}</div>
              </div>
              <button type="button" id="dp-rc-cta" class="det-rs-cta">GOT IT</button>
            </div>
          `;

          const expandBtn = drawerEl.querySelector('#dp-rc-expand');
          const answerBox = drawerEl.querySelector('#dp-rc-answer-box');
          const toggleExpand = () => {
            expandBtn?.classList.toggle('expanded');
            answerBox?.classList.toggle('expanded');
          };
          expandBtn?.addEventListener('click', toggleExpand);
          answerBox?.addEventListener('click', toggleExpand);
        }

        const ctaBtn = drawerEl.querySelector('#dp-rc-cta');
        let proceeding = false;
        const proceed = () => {
          if (proceeding || aborted) return;
          proceeding = true;
          if (drawerKeyTimer) {
            clearTimeout(drawerKeyTimer);
            drawerKeyTimer = null;
          }
          if (continueKeyListener) {
            document.removeEventListener('keydown', continueKeyListener);
            continueKeyListener = null;
          }
          playTapSound(soundOn);

          const isLast = currentIndex + 1 >= totalItems;
          if (isLast) {
            ctaBtn.disabled = true;
            ctaBtn.innerHTML = '<span class="det-loading-dots"><span></span><span></span><span></span></span>';
            finishDotsTimer = setTimeout(() => {
              finishDotsTimer = null;
              if (!aborted) renderCompletion();
            }, 420);
          } else {
            currentIndex += 1;
            loadPassage();
          }
        };

        ctaBtn.addEventListener('click', proceed);
        continueKeyListener = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            proceed();
          }
        };
        drawerKeyTimer = setTimeout(() => {
          drawerKeyTimer = null;
          if (!aborted && !proceeding && continueKeyListener) {
            document.addEventListener('keydown', continueKeyListener);
          }
        }, 0);
      };

      activeSubmitHandler = () => {
        if (!submitBtnEl.disabled) {
          handleAnswer(false);
        }
      };

      activeRenderer = mountQuestionRenderer(mountEl, item, {
        settings,
        lang,
        onSubmitReady: (hasAny) => {
          if (!submitted && !aborted) {
            submitBtnEl.disabled = !hasAny;
          }
        }
      });

      itemTimerId = setInterval(() => {
        leftSec -= 1;
        updateTimerUi();
        if (leftSec <= 0) {
          handleAnswer(true);
        }
      }, 1000);
    };

    loadPassage();
  };

  const settings = loadState().settings;
  const minDelay = new Promise((resolve) => {
    loaderTimer = setTimeout(() => {
      loaderTimer = null;
      resolve();
    }, 550);
  });

  if (useAi && settings.apiKey) {
    Promise.all([
      minDelay,
      prefetchAiItem(0, currentDiff) || prefetchedNext?.promise
    ]).then(() => {
      if (!aborted) launchArena();
    });
  } else {
    minDelay.then(() => {
      if (!aborted) launchArena();
    });
  }
}

function startPracticeSession(typeId, useAi) {
  if (practiceCleanup) { practiceCleanup(); practiceCleanup = null; }
  if (typeId === 'read_select') {
    startReadSelectPractice(useAi);
    return;
  }
  if (typeId === 'fill_blanks') {
    startFillBlanksPractice(useAi);
    return;
  }
  if (typeId === 'read_complete') {
    startReadCompletePractice(useAi);
    return;
  }
  unlockSpeech();

  const meta = getQuestionTypeMeta(typeId);
  const totalItems = meta.sessionLength || 1;
  const sessionStartedAt = Date.now();
  const usedIds = new Set();
  const seenIds = getSeenIds(typeId);
  const maxKeep = Math.max(1, getBankCapacity(typeId) - 1);
  const sessionResults = [];
  const isObjective = ['read_select', 'fill_blanks', 'read_complete', 'listen_type', 'interactive_reading'].includes(typeId);

  const realCount = Math.random() < 0.5 ? Math.floor(totalItems / 2) : Math.ceil(totalItems / 2);
  const polaritySchedule = typeId === 'read_select'
    ? shuffleArray([...new Array(realCount).fill(true), ...new Array(totalItems - realCount).fill(false)])
    : [];

  let currentIndex = 0;
  let currentDiff = practiceDifficulty === 'adaptive' ? 3 : Number(practiceDifficulty);
  let soundOn = loadState().settings.soundEnabled !== false;
  let aborted = false;
  let itemTimerId = null;
  let autoAdvanceId = null;
  let activeRenderer = null;
  let continueKeyListener = null;
  let prefetchedNext = null;
  let batchQueue = null;

  topNavEl?.classList.add('hidden');
  mainEl?.classList.add('arena-mode');

  mainEl.innerHTML = `
    <div class="det-practice-shell">
      <div class="det-practice-topbar">
        <button type="button" id="dp-exit" class="det-exit-btn" title="Exit Practice">✕</button>
        <div class="det-prog-track"><div id="dp-prog-fill" class="det-prog-fill" style="width:0%"></div></div>
        <span id="dp-prog-count" class="det-prog-count">1 / ${totalItems}</span>
        <span id="dp-level" class="tag">Level ${currentDiff}/5</span>
        <button type="button" id="dp-sound-btn" class="det-sound-btn" title="Toggle Sound">${soundOn ? '🔊' : '🔇'}</button>
        <div id="dp-timer" class="timer-pill">⏱ 00:00</div>
      </div>
      <div class="det-practice-stage">
        <div id="dp-card" class="det-practice-card ${typeId === 'interactive_reading' ? 'wide' : ''}"></div>
      </div>
      <div id="dp-bottom-bar" class="det-feedback-bar"></div>
    </div>
  `;

  const clearItemTimers = () => {
    if (itemTimerId) { clearInterval(itemTimerId); itemTimerId = null; }
    if (autoAdvanceId) { clearTimeout(autoAdvanceId); autoAdvanceId = null; }
    if (continueKeyListener) {
      document.removeEventListener('keydown', continueKeyListener);
      continueKeyListener = null;
    }
  };

  practiceCleanup = () => {
    aborted = true;
    clearItemTimers();
    activeRenderer?.cleanup();
    activeRenderer = null;
  };

  mainEl.querySelector('#dp-exit').addEventListener('click', () => {
    navigate('practice');
  });

  const soundBtn = mainEl.querySelector('#dp-sound-btn');
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    updateSettings({ soundEnabled: soundOn });
  });

  const prefetchAiItem = (idx, diff) => {
    const s = loadState().settings;
    if (!useAi || !s.apiKey || idx >= totalItems || typeId === 'read_select') {
      prefetchedNext = null;
      return;
    }
    prefetchedNext = {
      index: idx,
      promise: generateQuestion({ apiKey: s.apiKey, model: s.model, type: typeId, difficulty: diff }).catch(() => null)
    };
  };

  const renderSessionSummary = () => {
    clearItemTimers();
    activeRenderer?.cleanup();
    activeRenderer = null;
    topNavEl?.classList.remove('hidden');
    mainEl?.classList.remove('arena-mode');
    practiceCleanup = null;

    const lang = loadState().settings.uiLang || 'uz';
    const totalSec = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000));
    const avgPct = sessionResults.length
      ? Math.round(sessionResults.reduce((s, r) => s + r.result.pctScore, 0) / sessionResults.length)
      : 0;
    const correctCount = sessionResults.filter((r) => r.result.correct).length;
    const sessionDetScore = isObjective
      ? estimateAbilityIRT(sessionResults.map((r) => ({
          type: typeId,
          difficulty: r.item.difficulty || 3,
          pctScore: r.result.pctScore
        })))
      : roundDetScore(
          sessionResults.length
            ? sessionResults.reduce((s, r) => s + r.result.detScore, 0) / sessionResults.length
            : 10
        );
    const rangeLow = Math.max(10, sessionDetScore - 5);
    const rangeHigh = Math.min(160, sessionDetScore + 5);

    if (sessionResults.length > 0) {
      recordPracticeAttempt({
        type: typeId,
        detScore: sessionDetScore,
        pctScore: avgPct,
        timeSec: totalSec
      });
      syncChrome();
    }

    playCompleteSound(soundOn);

    const missedItems = sessionResults.filter((r) => !r.result.correct);
    const minPart = Math.floor(totalSec / 60);
    const secPart = totalSec % 60;
    const timeLabel = minPart > 0 ? `${minPart}m ${secPart}s` : `${secPart}s`;

    mainEl.innerHTML = `
      <div class="det-summary-card">
        <div style="font-size:44px;margin-bottom:8px;">🏆</div>
        <span class="tag tag-ai">${meta.icon} ${escapeHtml(meta.name)}</span>
        <h2 style="margin:10px 0 4px;font-size:26px;font-weight:800;">
          ${lang === 'uz' ? 'Mashq yakunlandi!' : 'Practice Round Complete!'}
        </h2>
        <p class="page-subtitle" style="margin:0;">
          ${lang === 'uz' ? 'Natijangiz saqlandi va umumiy ko‘rsatkichlarga qo‘shildi.' : 'Your session score has been saved to your Dashboard.'}
        </p>

        <div class="det-summary-grid">
          <div class="det-summary-stat" style="background:var(--accent-soft);border-color:#FFC999;">
            <div class="det-summary-stat-val" style="color:var(--accent-hover);">${sessionDetScore}</div>
            <div class="det-summary-stat-lbl">DET Band (${rangeLow}–${rangeHigh})</div>
          </div>
          <div class="det-summary-stat">
            <div class="det-summary-stat-val">${isObjective ? `${correctCount}/${sessionResults.length}` : `${avgPct}%`}</div>
            <div class="det-summary-stat-lbl">${isObjective ? `${avgPct}% ${lang === 'uz' ? 'aniqlik' : 'accuracy'}` : (lang === 'uz' ? 'Natija' : 'Score')}</div>
          </div>
          <div class="det-summary-stat">
            <div class="det-summary-stat-val">${timeLabel}</div>
            <div class="det-summary-stat-lbl">${lang === 'uz' ? 'Sarflangan vaqt' : 'Time'}</div>
          </div>
        </div>

        ${missedItems.length > 0 ? `
          <div style="text-align:left;background:var(--bg);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:20px;">
            <div style="font-size:13px;font-weight:800;margin-bottom:8px;color:var(--ink-muted);">
              ${lang === 'uz' ? `Xato qilinganlar (${missedItems.length}) — Xatolar daftariga saqlandi:` : `Missed items (${missedItems.length}) — Saved to Mistake Bank:`}
            </div>
            ${missedItems.slice(0, 6).map((m) => `
              <div style="font-size:13px;padding:5px 0;border-bottom:1px solid var(--border);">
                <strong>${escapeHtml(m.item.word || m.item.sentence || m.item.title || meta.name)}</strong>
                <span style="color:var(--ink-muted);"> → ${escapeHtml(m.result.expected)}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="banner banner-success" style="justify-content:center;margin-bottom:20px;">
            <strong>✨ ${lang === 'uz' ? 'Ajoyib! Barcha savollarga bexato javob berdingiz.' : 'Perfect round! Zero mistakes.'}</strong>
          </div>
        `}

        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
          <button type="button" id="sum-back" class="btn btn-secondary">${escapeHtml(t(lang, 'finishAndBack'))}</button>
          <button type="button" id="sum-again" class="btn btn-primary">🔄 ${lang === 'uz' ? 'Yana 1 raund' : 'Play Again'}</button>
        </div>
      </div>
    `;

    mainEl.querySelector('#sum-back').addEventListener('click', () => navigate('practice'));
    mainEl.querySelector('#sum-again').addEventListener('click', () => startPracticeSession(typeId, useAi));
  };

  const loadItem = async () => {
    if (aborted) return;
    clearItemTimers();

    if (currentIndex >= totalItems) {
      renderSessionSummary();
      return;
    }

    const settings = loadState().settings;
    const lang = settings.uiLang || 'uz';
    const cardEl = mainEl.querySelector('#dp-card');
    const bottomBar = mainEl.querySelector('#dp-bottom-bar');
    const progFill = mainEl.querySelector('#dp-prog-fill');
    const progCount = mainEl.querySelector('#dp-prog-count');
    const levelTag = mainEl.querySelector('#dp-level');
    const timerEl = mainEl.querySelector('#dp-timer');

    if (progFill) progFill.style.width = `${Math.round((currentIndex / totalItems) * 100)}%`;
    if (progCount) progCount.textContent = `${currentIndex + 1} / ${totalItems}`;
    if (levelTag) levelTag.textContent = `Level ${currentDiff}/5`;

    let item = null;
    if (typeId === 'read_select' && useAi && settings.apiKey) {
      if (!batchQueue) {
        if (cardEl) {
          cardEl.innerHTML = `
            <div style="text-align:center;padding:32px 12px;">
              <div style="font-size:32px;margin-bottom:8px;">✨</div>
              <div style="font-weight:800;">${escapeHtml(t(lang, 'generatingAi'))}</div>
            </div>
          `;
        }
        try {
          const aiWords = await generateReadSelectBatch({
            apiKey: settings.apiKey,
            model: settings.model,
            count: totalItems,
            difficulty: currentDiff,
            avoidWords: getRecentReadSelectWords()
          });
          batchQueue = [...aiWords];
          if (batchQueue.length < totalItems) {
            const filler = buildReadSelectRound({
              count: totalItems - batchQueue.length,
              difficulty: currentDiff,
              seenIds,
              usedIds
            });
            batchQueue.push(...filler);
          }
          batchQueue = shuffleArray(batchQueue);
        } catch (err) {
          showToast(`${t(lang, 'aiFallbackNotice')} (${err.message})`, 'error');
          batchQueue = buildReadSelectRound({ count: totalItems, difficulty: currentDiff, seenIds, usedIds });
        }
      }
      item = batchQueue[currentIndex] || pickQuestionFromBank(typeId, currentDiff, usedIds, { seenIds });
    } else if (useAi && settings.apiKey) {
      if (prefetchedNext && prefetchedNext.index === currentIndex) {
        item = await prefetchedNext.promise;
      }
      if (!item) {
        if (cardEl) {
          cardEl.innerHTML = `
            <div style="text-align:center;padding:32px 12px;">
              <div style="font-size:32px;margin-bottom:8px;">✨</div>
              <div style="font-weight:800;">${escapeHtml(t(lang, 'generatingAi'))}</div>
            </div>
          `;
        }
        try {
          item = await generateQuestion({ apiKey: settings.apiKey, model: settings.model, type: typeId, difficulty: currentDiff });
        } catch (err) {
          showToast(`${t(lang, 'aiFallbackNotice')} (${err.message})`, 'error');
          item = pickQuestionFromBank(typeId, currentDiff, usedIds, { seenIds });
        }
      }
    } else {
      item = pickQuestionFromBank(typeId, currentDiff, usedIds, {
        seenIds,
        preferReal: typeId === 'read_select' ? polaritySchedule[currentIndex] : null
      });
    }

    if (aborted) return;
    usedIds.add(item.id);
    if (!item.isAiGenerated) {
      seenIds.add(item.id);
      markSeenIds(typeId, [item.id], maxKeep);
    }
    if (typeId === 'read_select' && item.word) {
      recordRecentReadSelectWords([item.word]);
    }
    prefetchAiItem(currentIndex + 1, currentDiff);

    cardEl.innerHTML = `<div id="dp-mount"></div><div id="dp-ai-fb"></div>`;
    const mountEl = cardEl.querySelector('#dp-mount');

    const totalSec = (item.prepSec || meta.prepSec || 0) + (meta.durationSec || 60);
    let leftSec = totalSec;
    let submitted = false;

    const updateTimer = () => {
      if (!timerEl) return;
      const m = Math.floor(Math.max(0, leftSec) / 60);
      const s = Math.max(0, leftSec) % 60;
      timerEl.textContent = `⏱ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      timerEl.classList.toggle('warn', leftSec <= totalSec * 0.25 && leftSec > 10);
      timerEl.classList.toggle('danger', leftSec <= 10);
    };
    updateTimer();

    bottomBar.className = 'det-feedback-bar';
    if (typeId === 'read_select') {
      bottomBar.innerHTML = `
        <div class="det-fb-inner">
          <div style="font-size:13px;font-weight:700;color:var(--ink-muted);">⌨️ Y = YES · N = NO</div>
          <div class="det-fb-actions">
            <button type="button" id="dp-submit" class="btn btn-secondary btn-sm">${lang === 'uz' ? 'O‘tkazib yuborish' : 'Skip'}</button>
          </div>
        </div>
      `;
    } else {
      bottomBar.innerHTML = `
        <div class="det-fb-inner">
          <div style="font-size:13px;font-weight:700;color:var(--ink-muted);">${meta.icon} ${escapeHtml(meta.name)}</div>
          <div class="det-fb-actions">
            <button type="button" id="dp-submit" class="btn btn-primary">${escapeHtml(t(lang, 'submitAnswer'))}</button>
          </div>
        </div>
      `;
    }

    const advanceToNext = () => {
      if (aborted) return;
      if (typeId !== 'read_select') unlockSpeech();
      clearItemTimers();
      currentIndex += 1;
      loadItem();
    };

    const handleSubmit = async (overrideAns = undefined, timedOut = false) => {
      if (submitted || aborted) return;
      submitted = true;
      clearItemTimers();

      const submitBtn = bottomBar.querySelector('#dp-submit');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '...';
      }

      const answer = overrideAns !== undefined ? overrideAns : await activeRenderer.getAnswer();
      activeRenderer.cleanup();

      if (!isObjective) {
        bottomBar.innerHTML = `
          <div class="det-fb-inner">
            <div style="font-weight:700;color:var(--ink-muted);">⏳ ${lang === 'uz' ? 'Baholanmoqda...' : 'Evaluating response...'}</div>
          </div>
        `;
      }

      const result = await gradeAnyItem({ item, answer, settings });
      if (aborted) return;

      sessionResults.push({ item, result });

      if (!result.correct && ['read_select', 'fill_blanks', 'read_complete', 'listen_type'].includes(typeId)) {
        addMistake({
          type: typeId,
          prompt: item.word || item.sentence || item.title || meta.name,
          userAnswer: result.userSummary,
          correctAnswer: result.expected,
          note: 'Skill Practice'
        });
        syncChrome();
      }

      if (practiceDifficulty === 'adaptive') {
        currentDiff = nextAdaptiveDifficulty(currentDiff, result.pctScore);
      }

      const isGood = isObjective ? result.correct : result.detScore >= 105;
      if (timedOut && answer == null) {
        playTimeoutSound(soundOn);
      } else if (isGood) {
        playCorrectSound(soundOn);
      } else {
        playWrongSound(soundOn);
      }

      if (isObjective) {
        applyObjectiveReviewVisuals(mountEl, item, result);
        const detail = getObjectiveFeedbackDetail(item, result);
        const isLast = currentIndex + 1 >= totalItems;
        const btnLabel = isLast ? (lang === 'uz' ? 'Natijani ko‘rish →' : 'See Results →') : (lang === 'uz' ? 'Davom etish →' : 'Continue →');

        bottomBar.className = `det-feedback-bar ${result.correct ? 'det-fb-correct' : 'det-fb-wrong'}`;
        bottomBar.innerHTML = `
          <div class="det-fb-inner">
            <div class="det-fb-status">
              <div class="det-fb-icon">${result.correct ? '✓' : '✕'}</div>
              <div>
                <div class="det-fb-title">${result.correct ? (lang === 'uz' ? 'To‘g‘ri!' : 'Correct!') : (timedOut && answer == null ? (lang === 'uz' ? 'Vaqt tugadi' : 'Time is up') : (lang === 'uz' ? 'Xato' : 'Incorrect'))}</div>
                <div class="det-fb-detail">${escapeHtml(detail)}</div>
              </div>
            </div>
            <div class="det-fb-actions">
              <button type="button" id="dp-continue" class="btn ${result.correct ? 'btn-success' : 'btn-danger'}">${escapeHtml(btnLabel)}</button>
            </div>
          </div>
        `;
        bottomBar.querySelector('#dp-continue').addEventListener('click', advanceToNext);

        if (typeId === 'read_select') {
          autoAdvanceId = setTimeout(advanceToNext, 950);
        }

        continueKeyListener = (e) => {
          const tag = e.target?.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            advanceToNext();
          }
        };
        document.addEventListener('keydown', continueKeyListener);
      } else {
        const aiFbSlot = cardEl.querySelector('#dp-ai-fb');
        aiFbSlot.innerHTML = '';
        aiFbSlot.appendChild(renderFeedbackCard({
          item,
          result,
          lang,
          onSaveMistake: () => {
            const firstFix = result.aiFeedback?.corrections?.[0];
            addMistake({
              type: typeId,
              prompt: item.word || item.sentence || item.prompt || item.title || meta.name,
              userAnswer: firstFix?.original || result.userSummary,
              correctAnswer: firstFix?.corrected || result.expected,
              note: firstFix?.explanation || result.aiFeedback?.summary || ''
            });
            syncChrome();
          }
        }));

        const isLast = currentIndex + 1 >= totalItems;
        const btnLabel = isLast ? (lang === 'uz' ? 'Natijani ko‘rish →' : 'See Results →') : (lang === 'uz' ? 'Keyingi savol →' : 'Continue →');
        bottomBar.className = `det-feedback-bar ${isGood ? 'det-fb-correct' : ''}`;
        bottomBar.innerHTML = `
          <div class="det-fb-inner">
            <div class="det-fb-status">
              <div class="det-fb-icon">${isGood ? '✓' : '★'}</div>
              <div>
                <div class="det-fb-title">${lang === 'uz' ? `Ball: ${result.detScore} / 160` : `Score: ${result.detScore} / 160`}</div>
              </div>
            </div>
            <div class="det-fb-actions">
              <button type="button" id="dp-continue" class="btn btn-primary">${escapeHtml(btnLabel)}</button>
            </div>
          </div>
        `;
        bottomBar.querySelector('#dp-continue').addEventListener('click', advanceToNext);
      }
    };

    activeRenderer = mountQuestionRenderer(mountEl, item, {
      settings,
      lang,
      onImmediateSubmit: typeId === 'read_select' ? (val) => handleSubmit(val, false) : undefined
    });

    bottomBar.querySelector('#dp-submit')?.addEventListener('click', () => {
      unlockSpeech();
      handleSubmit();
    });

    itemTimerId = setInterval(() => {
      leftSec -= 1;
      updateTimer();
      if (leftSec <= 0) {
        handleSubmit(undefined, true);
      }
    }, 1000);
  };

  loadItem();
}

// 4. MISTAKE BANK
function renderMistakesView() {
  const state = loadState();
  const lang = state.settings.uiLang || 'uz';
  const activeItems = state.mistakes.filter((m) => !m.mastered);

  mainEl.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${escapeHtml(t(lang, 'mistakesTitle'))}</h1>
        <p class="page-subtitle">${escapeHtml(t(lang, 'mistakesSub'))}</p>
      </div>
      ${activeItems.length > 0 ? `<button type="button" id="mk-drill-btn" class="btn btn-primary">🃏 ${escapeHtml(t(lang, 'drillFlashcards'))} (${activeItems.length})</button>` : ''}
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
      <div class="filter-pills" style="margin-bottom:0;">
        <button type="button" class="filter-pill ${mistakeFilter === 'active' ? 'active' : ''}" data-mf="active">${escapeHtml(t(lang, 'filterActive'))}</button>
        <button type="button" class="filter-pill ${mistakeFilter === 'mastered' ? 'active' : ''}" data-mf="mastered">${escapeHtml(t(lang, 'filterMastered'))}</button>
        <button type="button" class="filter-pill ${mistakeFilter === 'all' ? 'active' : ''}" data-mf="all">${escapeHtml(t(lang, 'filterAll'))}</button>
      </div>
      <input id="mk-search" class="det-input" style="max-width:280px;" placeholder="🔍 Search..." value="${escapeHtml(mistakeQuery)}" />
    </div>

    <div id="mk-list-slot"></div>
  `;

  const renderMistakeList = () => {
    const curState = loadState();
    const listSlot = mainEl.querySelector('#mk-list-slot');
    if (!listSlot) return;

    const filtered = curState.mistakes.filter((m) => {
      if (mistakeFilter === 'active' && m.mastered) return false;
      if (mistakeFilter === 'mastered' && !m.mastered) return false;
      if (mistakeQuery.trim()) {
        const q = mistakeQuery.toLowerCase();
        return (m.prompt + m.userAnswer + m.correctAnswer + m.note).toLowerCase().includes(q);
      }
      return true;
    });

    listSlot.innerHTML = filtered.length === 0
      ? `<div class="card" style="text-align:center;color:var(--ink-muted);padding:34px;">${escapeHtml(t(lang, 'noMistakes'))}</div>`
      : filtered.map((m) => `
        <div class="mistake-item ${m.mastered ? 'mastered' : ''}">
          <div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
              <span class="tag">${escapeHtml(getQuestionTypeMeta(m.type).name)}</span>
              <span style="font-size:12px;color:var(--ink-light);">${new Date(m.createdAt).toLocaleDateString()}</span>
            </div>
            <div style="font-weight:700;margin-bottom:4px;">${escapeHtml(m.prompt)}</div>
            <div style="font-size:13.5px;">
              <span class="corr-old">${escapeHtml(m.userAnswer)}</span> → <span class="corr-new">${escapeHtml(m.correctAnswer)}</span>
            </div>
            ${m.note ? `<div style="font-size:12.5px;color:var(--ink-muted);margin-top:4px;">${escapeHtml(m.note)}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button type="button" class="btn btn-secondary btn-sm" data-mk-toggle="${m.id}">${escapeHtml(m.mastered ? t(lang, 'unmarkMastered') : t(lang, 'markMastered'))}</button>
            <button type="button" class="btn btn-danger btn-sm" data-mk-del="${m.id}">✕</button>
          </div>
        </div>
      `).join('');

    listSlot.querySelectorAll('[data-mk-toggle]').forEach((b) => {
      b.addEventListener('click', () => {
        toggleMistakeMastered(b.dataset.mkToggle);
        syncChrome();
        renderMistakesView();
      });
    });

    listSlot.querySelectorAll('[data-mk-del]').forEach((b) => {
      b.addEventListener('click', () => {
        deleteMistake(b.dataset.mkDel);
        syncChrome();
        renderMistakesView();
      });
    });
  };

  renderMistakeList();

  mainEl.querySelectorAll('[data-mf]').forEach((b) => {
    b.addEventListener('click', () => {
      mistakeFilter = b.dataset.mf;
      renderMistakesView();
    });
  });

  mainEl.querySelector('#mk-search').addEventListener('input', (e) => {
    mistakeQuery = e.target.value;
    renderMistakeList();
  });

  mainEl.querySelector('#mk-drill-btn')?.addEventListener('click', () => {
    unlockSpeech();
    startMistakeDrill();
  });
}

function startMistakeDrill() {
  if (practiceCleanup) { practiceCleanup(); practiceCleanup = null; }

  const state = loadState();
  const lang = state.settings.uiLang || 'uz';
  const deck = shuffleArray(state.mistakes.filter((m) => !m.mastered));
  if (deck.length === 0) {
    renderMistakesView();
    return;
  }

  let idx = 0;
  let masteredCount = 0;
  let correctCount = 0;
  let soundOn = state.settings.soundEnabled !== false;
  let aborted = false;
  let activeKeyHandler = null;

  topNavEl?.classList.add('hidden');
  mainEl?.classList.add('arena-mode');

  mainEl.innerHTML = `
    <div class="det-practice-shell">
      <div class="det-practice-topbar">
        <button type="button" id="md-exit" class="det-exit-btn" title="Exit Drill">✕</button>
        <div class="det-prog-track"><div id="md-prog-fill" class="det-prog-fill" style="width:0%"></div></div>
        <span id="md-prog-count" class="det-prog-count">1 / ${deck.length}</span>
        <span class="tag tag-writing">🃏 Mistake Drill</span>
        <button type="button" id="md-sound-btn" class="det-sound-btn" title="Toggle Sound">${soundOn ? '🔊' : '🔇'}</button>
      </div>
      <div class="det-practice-stage">
        <div id="md-card" class="det-practice-card"></div>
      </div>
      <div id="md-bottom-bar" class="det-feedback-bar"></div>
    </div>
  `;

  const clearKey = () => {
    if (activeKeyHandler) {
      document.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }
  };

  practiceCleanup = () => {
    aborted = true;
    clearKey();
    stopSpeaking();
  };

  mainEl.querySelector('#md-exit').addEventListener('click', () => navigate('mistakes'));

  const soundBtn = mainEl.querySelector('#md-sound-btn');
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    updateSettings({ soundEnabled: soundOn });
  });

  const renderDrillSummary = () => {
    clearKey();
    stopSpeaking();
    topNavEl?.classList.remove('hidden');
    mainEl?.classList.remove('arena-mode');
    practiceCleanup = null;

    playCompleteSound(soundOn);
    const remaining = loadState().mistakes.filter((m) => !m.mastered).length;

    mainEl.innerHTML = `
      <div class="det-summary-card">
        <div style="font-size:44px;margin-bottom:8px;">🎯</div>
        <span class="tag tag-ai">🃏 Mistake Drill</span>
        <h2 style="margin:10px 0 4px;font-size:25px;font-weight:800;">
          ${lang === 'uz' ? 'Takrorlash yakunlandi!' : 'Review Session Complete!'}
        </h2>
        <p class="page-subtitle" style="margin:0;">
          ${lang === 'uz' ? 'Xato qilingan so‘z va jumlalarni mustahkamladingiz.' : 'You reviewed all active items in this deck.'}
        </p>

        <div class="det-summary-grid">
          <div class="det-summary-stat">
            <div class="det-summary-stat-val">${deck.length}</div>
            <div class="det-summary-stat-lbl">${lang === 'uz' ? 'Ko‘rib chiqildi' : 'Reviewed'}</div>
          </div>
          <div class="det-summary-stat" style="background:var(--green-soft);border-color:#B7E8C7;">
            <div class="det-summary-stat-val" style="color:#187A38;">${masteredCount}</div>
            <div class="det-summary-stat-lbl">${lang === 'uz' ? 'O‘zlashtirildi' : 'Mastered'}</div>
          </div>
          <div class="det-summary-stat">
            <div class="det-summary-stat-val">${remaining}</div>
            <div class="det-summary-stat-lbl">${lang === 'uz' ? 'Qolgan xatolar' : 'Remaining'}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
          <button type="button" id="mds-back" class="btn btn-secondary">${lang === 'uz' ? 'Xatolar daftariga qaytish' : 'Back to Mistake Bank'}</button>
          ${remaining > 0 ? `<button type="button" id="mds-again" class="btn btn-primary">🔄 ${lang === 'uz' ? 'Qolganlarini takrorlash' : 'Drill Remaining'}</button>` : ''}
        </div>
      </div>
    `;

    mainEl.querySelector('#mds-back').addEventListener('click', () => navigate('mistakes'));
    mainEl.querySelector('#mds-again')?.addEventListener('click', () => startMistakeDrill());
  };

  const renderCard = () => {
    if (aborted) return;
    clearKey();
    stopSpeaking();

    if (idx >= deck.length) {
      renderDrillSummary();
      return;
    }

    const card = deck[idx];
    const meta = getQuestionTypeMeta(card.type);
    const cardEl = mainEl.querySelector('#md-card');
    const bottomBar = mainEl.querySelector('#md-bottom-bar');
    const progFill = mainEl.querySelector('#md-prog-fill');
    const progCount = mainEl.querySelector('#md-prog-count');

    if (progFill) progFill.style.width = `${Math.round((idx / deck.length) * 100)}%`;
    if (progCount) progCount.textContent = `${idx + 1} / ${deck.length}`;

    const advance = () => {
      idx += 1;
      renderCard();
    };

    const masterAndAdvance = () => {
      if (!card.mastered) {
        toggleMistakeMastered(card.id);
        card.mastered = true;
        masteredCount += 1;
        syncChrome();
      }
      playCorrectSound(soundOn);
      advance();
    };

    // Interactive YES/NO mode for Read & Select mistakes
    if (card.type === 'read_select') {
      const lowerAns = String(card.correctAnswer || '').toLowerCase();
      const expectedReal = lowerAns.includes('real') && !lowerAns.includes('not');
      let locked = false;

      cardEl.innerHTML = `
        <div style="text-align:center;margin-bottom:8px;"><span class="tag">${meta.icon} ${escapeHtml(meta.name)}</span></div>
        <h3 class="det-q-prompt">Is this a real English word?</h3>
        <p class="det-q-hint">${lang === 'uz' ? 'Avval xato qilgan so‘zingizni qayta tekshiring (Y / N)' : 'Test yourself on this missed word (Y / N)'}</p>
        <div class="word-showcase"><div class="word-showcase-text">${escapeHtml(card.prompt)}</div></div>
        <div class="yes-no-row">
          <button type="button" class="choice-tile" data-md-rs="true">✓ YES</button>
          <button type="button" class="choice-tile" data-md-rs="false">✕ NO</button>
        </div>
      `;

      bottomBar.className = 'det-feedback-bar';
      bottomBar.innerHTML = `
        <div class="det-fb-inner">
          <div style="font-size:13px;font-weight:700;color:var(--ink-muted);">⌨️ Y = YES · N = NO</div>
          <div class="det-fb-actions">
            <button type="button" id="md-skip" class="btn btn-secondary btn-sm">${lang === 'uz' ? 'Keyingisi →' : 'Skip →'}</button>
          </div>
        </div>
      `;
      bottomBar.querySelector('#md-skip').addEventListener('click', advance);

      const handlePick = (chosenReal) => {
        if (locked || aborted) return;
        locked = true;
        clearKey();

        const isCorrect = chosenReal === expectedReal;
        if (isCorrect) {
          correctCount += 1;
          playCorrectSound(soundOn);
        } else {
          playWrongSound(soundOn);
        }

        cardEl.querySelectorAll('[data-md-rs]').forEach((b) => {
          b.disabled = true;
          const bVal = b.dataset.mdRs === 'true';
          if (bVal === expectedReal) b.classList.add('correct');
          else if (bVal === chosenReal && !isCorrect) b.classList.add('wrong');
        });

        const isLast = idx + 1 >= deck.length;
        bottomBar.className = `det-feedback-bar ${isCorrect ? 'det-fb-correct' : 'det-fb-wrong'}`;
        bottomBar.innerHTML = `
          <div class="det-fb-inner">
            <div class="det-fb-status">
              <div class="det-fb-icon">${isCorrect ? '✓' : '✕'}</div>
              <div>
                <div class="det-fb-title">${isCorrect ? (lang === 'uz' ? 'To‘g‘ri!' : 'Correct!') : (lang === 'uz' ? 'Xato' : 'Incorrect')}</div>
                <div class="det-fb-detail">${escapeHtml(card.correctAnswer)}</div>
              </div>
            </div>
            <div class="det-fb-actions">
              <button type="button" id="md-master" class="btn btn-success btn-sm">✓ ${escapeHtml(t(lang, 'markMastered'))}</button>
              <button type="button" id="md-next" class="btn btn-primary btn-sm">${isLast ? (lang === 'uz' ? 'Yakunlash →' : 'Finish →') : (lang === 'uz' ? 'Davom etish →' : 'Continue →')}</button>
            </div>
          </div>
        `;
        bottomBar.querySelector('#md-master').addEventListener('click', masterAndAdvance);
        bottomBar.querySelector('#md-next').addEventListener('click', advance);

        activeKeyHandler = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            advance();
          }
        };
        document.addEventListener('keydown', activeKeyHandler);
      };

      cardEl.querySelectorAll('[data-md-rs]').forEach((b) => {
        b.addEventListener('click', () => handlePick(b.dataset.mdRs === 'true'));
      });

      activeKeyHandler = (e) => {
        const k = e.key.toLowerCase();
        if (k === 'y' || e.key === 'ArrowLeft') { e.preventDefault(); handlePick(true); }
        else if (k === 'n' || e.key === 'ArrowRight') { e.preventDefault(); handlePick(false); }
      };
      document.addEventListener('keydown', activeKeyHandler);
      return;
    }

    // Flashcard Reveal mode for Listen & Type, Fill in the Blanks, Read & Complete, Writing/Speaking fixes
    let revealed = false;
    const isListen = card.type === 'listen_type';
    const settings = loadState().settings;
    let mdAutoTimer = null;
    let invalidateCardDraw = () => {};

    const drawRevealCard = () => {
      if (mdAutoTimer) {
        clearTimeout(mdAutoTimer);
        mdAutoTimer = null;
      }
      invalidateCardDraw();
      let drawDisposed = false;
      invalidateCardDraw = () => { drawDisposed = true; };

      cardEl.innerHTML = `
        <div style="text-align:center;margin-bottom:10px;"><span class="tag">${meta.icon} ${escapeHtml(meta.name)}</span></div>
        ${isListen ? `
          <h3 class="det-q-prompt">${lang === 'uz' ? 'Audioni tinglab eslab ko‘ring' : 'Listen and recall the sentence'}</h3>
          <div class="audio-box" style="margin:14px 0;">
            <div style="display:flex;align-items:center;gap:12px;">
              <button type="button" id="md-play-audio" class="audio-play-btn" style="width:48px;height:48px;font-size:18px;">▶</button>
              <span id="md-audio-status" style="font-weight:700;font-size:14px;">${lang === 'uz' ? 'Gapni eshitish' : 'Play Sentence Audio'}</span>
            </div>
            <div id="md-eq" class="eq-bars"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>
          </div>
        ` : `
          <h3 class="det-q-prompt" style="font-size:19px;">${escapeHtml(card.prompt)}</h3>
        `}
        ${card.userAnswer ? `
          <div style="text-align:center;font-size:13.5px;color:var(--ink-muted);margin:10px 0;">
            ${lang === 'uz' ? 'Avvalgi javobingiz:' : 'Previous answer:'} <span class="corr-old">${escapeHtml(card.userAnswer)}</span>
          </div>
        ` : ''}
        ${revealed ? `
          <div style="background:var(--green-soft);border:1px solid #B7E8C7;border-radius:14px;padding:16px 18px;margin-top:14px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#187A38;text-transform:uppercase;margin-bottom:4px;">${lang === 'uz' ? 'To‘g‘ri javob' : 'Correct Answer'}</div>
            <div style="font-weight:800;color:#166524;font-size:17px;line-height:1.5;">${escapeHtml(card.correctAnswer)}</div>
            ${card.note ? `<div style="font-size:13px;color:var(--ink-muted);margin-top:6px;">${escapeHtml(card.note)}</div>` : ''}
          </div>
        ` : `
          <div style="text-align:center;margin-top:18px;">
            <button type="button" id="md-reveal-btn" class="btn btn-primary">👁 ${lang === 'uz' ? 'To‘g‘ri javobni ko‘rish' : 'Reveal Answer'}</button>
          </div>
        `}
      `;

      if (isListen) {
        const playBtn = cardEl.querySelector('#md-play-audio');
        const statusEl = cardEl.querySelector('#md-audio-status');
        const eq = cardEl.querySelector('#md-eq');
        let isPlaying = false;
        const playSentence = () => {
          if (aborted || drawDisposed || isPlaying) return;
          isPlaying = true;
          if (playBtn) playBtn.disabled = true;
          if (statusEl) statusEl.textContent = lang === 'uz' ? '⏳ Audio yuklanmoqda...' : '⏳ Starting audio...';

          speakText(card.correctAnswer || card.prompt, {
            rate: settings.ttsRate || 1.0,
            voiceName: settings.ttsVoice || '',
            onStart: () => {
              if (aborted || drawDisposed) return;
              eq?.classList.add('playing');
              if (statusEl) statusEl.textContent = lang === 'uz' ? '🔊 Eshiting...' : '🔊 Playing audio...';
            },
            onEnd: () => {
              if (aborted || drawDisposed) return;
              isPlaying = false;
              if (playBtn) playBtn.disabled = false;
              eq?.classList.remove('playing');
              if (statusEl) statusEl.textContent = lang === 'uz' ? 'Gapni eshitish' : 'Play Sentence Audio';
            },
            onError: () => {
              if (aborted || drawDisposed) return;
              isPlaying = false;
              if (playBtn) playBtn.disabled = false;
              eq?.classList.remove('playing');
              if (statusEl) statusEl.textContent = lang === 'uz' ? '👆 Eshitish uchun ▶ tugmasini bosing' : '👆 Click ▶ to play audio';
            }
          });
        };
        playBtn?.addEventListener('click', () => {
          unlockSpeech();
          playSentence();
        });
        if (!revealed) mdAutoTimer = setTimeout(playSentence, 120);
      }

      cardEl.querySelector('#md-reveal-btn')?.addEventListener('click', () => {
        revealed = true;
        drawRevealCard();
      });

      const cleanupAndGo = (fn) => {
        if (mdAutoTimer) {
          clearTimeout(mdAutoTimer);
          mdAutoTimer = null;
        }
        invalidateCardDraw();
        fn();
      };

      const isLast = idx + 1 >= deck.length;
      bottomBar.className = 'det-feedback-bar';
      bottomBar.innerHTML = `
        <div class="det-fb-inner">
          <div style="font-size:13px;font-weight:700;color:var(--ink-muted);">${idx + 1} / ${deck.length}</div>
          <div class="det-fb-actions">
            <button type="button" id="md-master" class="btn btn-success btn-sm">✓ ${escapeHtml(t(lang, 'markMastered'))}</button>
            <button type="button" id="md-next" class="btn btn-primary btn-sm">${isLast ? (lang === 'uz' ? 'Yakunlash →' : 'Finish →') : (lang === 'uz' ? 'Keyingisi →' : 'Next →')}</button>
          </div>
        </div>
      `;
      bottomBar.querySelector('#md-master').addEventListener('click', () => cleanupAndGo(masterAndAdvance));
      bottomBar.querySelector('#md-next').addEventListener('click', () => cleanupAndGo(advance));
    };

    drawRevealCard();
  };

  renderCard();
}

// 5. SETTINGS
function renderSettingsView() {
  const state = loadState();
  const s = state.settings;
  const lang = s.uiLang || 'uz';
  const voices = getEnglishVoices();
  const isCustomModel = !GEMINI_MODELS.some((m) => m.id === s.model);

  mainEl.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${escapeHtml(t(lang, 'settingsTitle'))}</h1>
        <p class="page-subtitle">${escapeHtml(t(lang, 'settingsSub'))}</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;">
          <h3 class="card-title" style="margin:0;">🤖 ${lang === 'uz' ? 'Google Gemini AI (Ixtiyoriy Pro)' : 'Google Gemini AI (Optional Upgrade)'}</h3>
          <span class="tag tag-reading">⚡ Smart Free Mode Active</span>
        </div>
        <div class="banner banner-info" style="margin-bottom:14px;padding:10px 14px;font-size:12.5px;">
          <span>${lang === 'uz'
            ? 'Ilova API kalitsiz ham to‘liq ishlaydi (LanguageTool grammatika, WPM nutq tahlili, 320+ so‘z va dinamik C-test). Gemini AI faqat real audio talaffuz va cheksiz AI savollar uchun qo‘shimcha imkoniyatdir.'
            : 'The studio works 100% free without an API key (LanguageTool grammar, WPM speech analysis, 320+ word bank, and dynamic C-Tests). Add Gemini only if you want raw audio pronunciation grading.'}</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="set-apikey">${escapeHtml(t(lang, 'apiKeyLabel'))}</label>
          <div style="display:flex;gap:8px;">
            <input id="set-apikey" type="password" class="det-input" value="${escapeHtml(s.apiKey)}" placeholder="AQ... / AIza..." autocomplete="off" />
            <button type="button" id="set-toggle-key" class="btn btn-secondary btn-sm">👁</button>
          </div>
          <div class="form-help">${escapeHtml(t(lang, 'apiKeyHelp'))}</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="set-model">${escapeHtml(t(lang, 'modelLabel'))}</label>
          <select id="set-model" class="det-input">
            ${GEMINI_MODELS.map((m) => `<option value="${escapeHtml(m.id)}" ${s.model === m.id ? 'selected' : ''}>${escapeHtml(m.label)}</option>`).join('')}
            <option value="__custom__" ${isCustomModel ? 'selected' : ''}>Custom model ID</option>
          </select>
        </div>

        <div id="set-custom-wrap" class="form-group ${isCustomModel ? '' : 'hidden'}">
          <label class="form-label" for="set-custom-model">${escapeHtml(t(lang, 'customModelLabel'))}</label>
          <input id="set-custom-model" type="text" class="det-input" value="${isCustomModel ? escapeHtml(s.model) : ''}" placeholder="gemini-3.5-flash-lite" />
        </div>

        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <button type="button" id="set-test-ai" class="btn btn-secondary btn-sm">⚡ ${escapeHtml(t(lang, 'testConnection'))}</button>
          <span id="set-test-res" style="font-size:13px;font-weight:700;"></span>
        </div>

        <div style="margin-top:18px;border-top:1px solid var(--border);padding-top:12px;">
          <div class="toggle-row">
            <div>
              <div style="font-weight:700;font-size:13.5px;">AI Adaptive Question Generation</div>
              <div style="font-size:12px;color:var(--ink-muted);">${lang === 'uz' ? 'Mock imtihonda navbatdagi savollarni Gemini orqali yangilab borish' : 'Generate fresh items dynamically during Mock Exams'}</div>
            </div>
            <input type="checkbox" id="set-ai-gen" ${s.useAiGeneration ? 'checked' : ''} />
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title" style="margin-bottom:14px;">⚙️ ${lang === 'uz' ? 'Imtihon va Audio Sozlamalari' : 'Exam & Audio Preferences'}</h3>

        <div class="form-group">
          <label class="form-label" for="set-target">${escapeHtml(t(lang, 'targetScore'))}: <strong id="set-target-val">${s.targetScore}</strong> / 160</label>
          <input id="set-target" type="range" min="80" max="160" step="5" value="${s.targetScore}" style="width:100%;" />
        </div>

        <div class="form-group">
          <label class="form-label" for="set-voice">${escapeHtml(t(lang, 'voiceLabel'))}</label>
          <div style="display:flex;gap:8px;">
            <select id="set-voice" class="det-input">
              <option value="">Auto (Default English)</option>
              ${voices.map((v) => `<option value="${escapeHtml(v.name)}" ${s.ttsVoice === v.name ? 'selected' : ''}>${escapeHtml(v.name)} (${escapeHtml(v.lang)})</option>`).join('')}
            </select>
            <button type="button" id="set-test-voice" class="btn btn-secondary btn-sm">🔊</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="set-rate">${escapeHtml(t(lang, 'speedLabel'))}: <strong id="set-rate-val">${s.ttsRate}x</strong></label>
          <input id="set-rate" type="range" min="0.8" max="1.25" step="0.05" value="${s.ttsRate}" style="width:100%;" />
        </div>

        <div class="toggle-row">
          <span style="font-weight:700;font-size:13.5px;">${lang === 'uz' ? 'Tovushli effektlar (To‘g‘ri / Xato ovozlari)' : 'Sound Effects (Correct / Wrong chimes)'}</span>
          <input type="checkbox" id="set-sound" ${s.soundEnabled !== false ? 'checked' : ''} />
        </div>
        <div class="toggle-row">
          <span style="font-weight:700;font-size:13.5px;">${escapeHtml(t(lang, 'enableProctorMock'))}</span>
          <input type="checkbox" id="set-proctor" ${s.enableProctor ? 'checked' : ''} />
        </div>
        <div class="toggle-row">
          <span style="font-weight:700;font-size:13.5px;">${escapeHtml(t(lang, 'enableWebcamMock'))}</span>
          <input type="checkbox" id="set-webcam" ${s.enableWebcam ? 'checked' : ''} />
        </div>

        <div style="margin-top:18px;">
          <button type="button" id="set-save" class="btn btn-primary">💾 ${escapeHtml(t(lang, 'saveSettings'))}</button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:18px;">
      <h3 class="card-title" style="margin-bottom:12px;">📦 ${escapeHtml(t(lang, 'backupTitle'))}</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button type="button" id="bk-export" class="btn btn-secondary btn-sm">${escapeHtml(t(lang, 'exportJson'))}</button>
        <label class="btn btn-secondary btn-sm" style="margin:0;">
          ${escapeHtml(t(lang, 'importJson'))}
          <input id="bk-import" type="file" accept="application/json" class="hidden" />
        </label>
        <button type="button" id="bk-reset" class="btn btn-danger btn-sm">${escapeHtml(t(lang, 'resetAll'))}</button>
      </div>
    </div>
  `;

  const keyInput = mainEl.querySelector('#set-apikey');
  const modelSel = mainEl.querySelector('#set-model');
  const customWrap = mainEl.querySelector('#set-custom-wrap');
  const customInput = mainEl.querySelector('#set-custom-model');

  mainEl.querySelector('#set-toggle-key').addEventListener('click', () => {
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
  });

  modelSel.addEventListener('change', () => {
    customWrap.classList.toggle('hidden', modelSel.value !== '__custom__');
  });

  const getChosenModel = () => (modelSel.value === '__custom__' ? (customInput.value.trim() || 'gemini-3.5-flash-lite') : modelSel.value);

  mainEl.querySelector('#set-target').addEventListener('input', (e) => {
    mainEl.querySelector('#set-target-val').textContent = e.target.value;
  });
  mainEl.querySelector('#set-rate').addEventListener('input', (e) => {
    mainEl.querySelector('#set-rate-val').textContent = `${e.target.value}x`;
  });

  mainEl.querySelector('#set-test-voice').addEventListener('click', () => {
    unlockSpeech();
    speakText('Hello! This is your Duolingo English Test audio voice.', {
      rate: Number(mainEl.querySelector('#set-rate').value),
      voiceName: mainEl.querySelector('#set-voice').value
    });
  });

  mainEl.querySelector('#set-test-ai').addEventListener('click', async () => {
    const resEl = mainEl.querySelector('#set-test-res');
    resEl.style.color = 'var(--ink-muted)';
    resEl.textContent = 'Testing...';
    const res = await testConnection(keyInput.value.trim(), getChosenModel());
    resEl.style.color = res.ok ? '#187A38' : 'var(--red)';
    resEl.textContent = res.ok ? `✓ ${res.message}` : `✕ ${res.message}`;
  });

  mainEl.querySelector('#set-save').addEventListener('click', () => {
    updateSettings({
      apiKey: keyInput.value.trim(),
      model: getChosenModel(),
      useAiGeneration: mainEl.querySelector('#set-ai-gen').checked,
      targetScore: Number(mainEl.querySelector('#set-target').value),
      ttsVoice: mainEl.querySelector('#set-voice').value,
      ttsRate: Number(mainEl.querySelector('#set-rate').value),
      soundEnabled: mainEl.querySelector('#set-sound').checked,
      enableProctor: mainEl.querySelector('#set-proctor').checked,
      enableWebcam: mainEl.querySelector('#set-webcam').checked
    });
    syncChrome();
    showToast(t(lang, 'settingsSaved'), 'success');
  });

  mainEl.querySelector('#bk-export').addEventListener('click', () => {
    const blob = new Blob([exportBackupJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `det-prep-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });

  mainEl.querySelector('#bk-import').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importBackupJSON(text);
      syncChrome();
      showToast('Backup imported!', 'success');
      renderSettingsView();
    } catch (err) {
      showToast(`Import failed: ${err.message}`, 'error');
    }
  });

  mainEl.querySelector('#bk-reset').addEventListener('click', () => {
    if (confirm(lang === 'uz' ? 'Haqiqatan ham barcha natijalar va xatolarni o‘chirmoqchimisiz?' : 'Delete all scores, history, and mistakes?')) {
      resetAllData();
      syncChrome();
      showToast('Reset complete');
      renderSettingsView();
    }
  });
}

// Global Nav & Language Switch
document.querySelectorAll('[data-nav]').forEach((btn) => {
  btn.addEventListener('click', () => navigate(btn.dataset.nav));
});

document.getElementById('lang-uz').addEventListener('click', () => {
  updateSettings({ uiLang: 'uz' });
  navigate(currentRoute);
});
document.getElementById('lang-en').addEventListener('click', () => {
  updateSettings({ uiLang: 'en' });
  navigate(currentRoute);
});

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    if (currentRoute === 'settings') renderSettingsView();
  };
}

navigate('dashboard');
