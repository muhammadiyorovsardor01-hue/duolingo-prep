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
  getBankForType,
  pickQuestionFromBank,
  shuffleArray,
  buildReadSelectRound
} from './questions-bank.js';
import { scoreToIelts, scoreToCefr, nextAdaptiveDifficulty, pctToDetScore, roundDetScore } from './scoring.js';
import { GEMINI_MODELS, testConnection, generateQuestion, generateReadSelectBatch } from './gemini.js';
import { getEnglishVoices, speakText } from './speech.js';
import { playCorrectSound, playWrongSound, playCompleteSound, playTimeoutSound } from './sounds.js';
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
  const hasKey = Boolean(String(state.settings.apiKey || '').trim());

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

    ${!hasKey ? `
      <div class="banner banner-info">
        <div>
          <strong>${escapeHtml(t(lang, 'setupBannerTitle'))}</strong>
          <div style="font-size:13px;margin-top:2px;">${escapeHtml(t(lang, 'setupBannerDesc'))}</div>
        </div>
        <button type="button" id="dash-open-settings" class="btn btn-primary btn-sm">${escapeHtml(t(lang, 'setupBannerBtn'))}</button>
      </div>
    ` : ''}

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

  mainEl.querySelector('#dash-open-settings')?.addEventListener('click', () => navigate('settings'));
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

// 3. SKILL PRACTICE HUB & DRILL VIEW
function renderPracticeHub() {
  const state = loadState();
  const lang = state.settings.uiLang || 'uz';
  const hasKey = Boolean(String(state.settings.apiKey || '').trim());

  const filtered = QUESTION_TYPES.filter((qt) =>
    practiceFilter === 'all' ? true : qt.skills.includes(practiceFilter)
  );

  mainEl.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${escapeHtml(t(lang, 'practiceTitle'))}</h1>
        <p class="page-subtitle">${escapeHtml(t(lang, 'practiceSub'))}</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:13px;font-weight:700;color:var(--ink-muted);">${escapeHtml(t(lang, 'difficultyLabel'))}</span>
        <select id="prac-diff" class="det-input" style="width:auto;padding:7px 12px;">
          <option value="adaptive" ${practiceDifficulty === 'adaptive' ? 'selected' : ''}>${escapeHtml(t(lang, 'adaptiveDiff'))}</option>
          <option value="1" ${practiceDifficulty === '1' ? 'selected' : ''}>Level 1 (B1)</option>
          <option value="2" ${practiceDifficulty === '2' ? 'selected' : ''}>Level 2 (B1+/B2)</option>
          <option value="3" ${practiceDifficulty === '3' ? 'selected' : ''}>Level 3 (B2)</option>
          <option value="4" ${practiceDifficulty === '4' ? 'selected' : ''}>Level 4 (C1)</option>
          <option value="5" ${practiceDifficulty === '5' ? 'selected' : ''}>Level 5 (C2)</option>
        </select>
      </div>
    </div>

    <div class="filter-pills">
      ${['all', 'reading', 'writing', 'listening', 'speaking'].map((f) => `
        <button type="button" class="filter-pill ${practiceFilter === f ? 'active' : ''}" data-filter="${f}">
          ${f === 'all' ? t(lang, 'filterAll') : f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      `).join('')}
    </div>

    <div class="grid-3">
      ${filtered.map((qt) => {
        const stats = state.practiceStats[qt.id];
        const durLabel = qt.durationSec >= 60 ? `${Math.round(qt.durationSec / 60)} min` : `${qt.durationSec}s`;
        return `
          <div class="card practice-card">
            <div>
              <div class="practice-card-top">
                <div class="practice-icon">${qt.icon}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">
                  ${qt.skills.map((s) => `<span class="tag tag-${s}">${s}</span>`).join('')}
                </div>
              </div>
              <h3 class="practice-title">${escapeHtml(qt.name)}</h3>
              <p class="practice-desc">${escapeHtml(lang === 'uz' ? qt.descUz : qt.descEn)}</p>
            </div>
            <div>
              <div class="practice-meta">
                <span>⏱ ${qt.prepSec ? `${qt.prepSec}s + ` : ''}${durLabel} · ${qt.sessionLength || 1} ${lang === 'uz' ? 'savol' : ((qt.sessionLength || 1) === 1 ? 'task' : 'items')}</span>
                <span>${stats ? `${stats.attempts} runs · avg ${stats.avgScore}` : (lang === 'uz' ? 'Yechilmagan' : 'Not practiced')}</span>
              </div>
              <div class="practice-actions" style="margin-top:12px;">
                <button type="button" class="btn btn-primary btn-sm" data-run-bank="${qt.id}">${escapeHtml(t(lang, 'btnPracticeBank'))}</button>
                ${qt.aiGeneratable ? `<button type="button" class="btn btn-soft btn-sm" data-run-ai="${qt.id}" ${!hasKey ? 'title="Add Gemini API key in Settings"' : ''}>✨ ${escapeHtml(t(lang, 'btnPracticeAi'))}</button>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  mainEl.querySelector('#prac-diff').addEventListener('change', (e) => {
    practiceDifficulty = e.target.value;
  });

  mainEl.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      practiceFilter = btn.dataset.filter;
      renderPracticeHub();
    });
  });

  mainEl.querySelectorAll('[data-run-bank]').forEach((btn) => {
    btn.addEventListener('click', () => startPracticeSession(btn.dataset.runBank, false));
  });

  mainEl.querySelectorAll('[data-run-ai]').forEach((btn) => {
    btn.addEventListener('click', () => {
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

function startPracticeSession(typeId, useAi) {
  if (practiceCleanup) { practiceCleanup(); practiceCleanup = null; }

  const meta = getQuestionTypeMeta(typeId);
  const totalItems = meta.sessionLength || 1;
  const sessionStartedAt = Date.now();
  const usedIds = new Set();
  const seenIds = getSeenIds(typeId);
  const maxKeep = Math.max(1, getBankForType(typeId).length - 1);
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
    const avgDiff = sessionResults.length
      ? sessionResults.reduce((s, r) => s + (r.item.difficulty || 3), 0) / sessionResults.length
      : currentDiff;
    const correctCount = sessionResults.filter((r) => r.result.correct).length;
    const sessionDetScore = isObjective
      ? pctToDetScore(avgPct, avgDiff)
      : roundDetScore(
          sessionResults.length
            ? sessionResults.reduce((s, r) => s + r.result.detScore, 0) / sessionResults.length
            : 10
        );

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
            <div class="det-summary-stat-lbl">DET Band / 160</div>
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

    bottomBar.querySelector('#dp-submit')?.addEventListener('click', () => handleSubmit());

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

  const items = state.mistakes.filter((m) => {
    if (mistakeFilter === 'active' && m.mastered) return false;
    if (mistakeFilter === 'mastered' && !m.mastered) return false;
    if (mistakeQuery.trim()) {
      const q = mistakeQuery.toLowerCase();
      return (m.prompt + m.userAnswer + m.correctAnswer + m.note).toLowerCase().includes(q);
    }
    return true;
  });

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

    <div id="mk-drill-slot"></div>

    <div>
      ${items.length === 0 ? `<div class="card" style="text-align:center;color:var(--ink-muted);padding:34px;">${escapeHtml(t(lang, 'noMistakes'))}</div>` : items.map((m) => `
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
      `).join('')}
    </div>
  `;

  mainEl.querySelectorAll('[data-mf]').forEach((b) => {
    b.addEventListener('click', () => {
      mistakeFilter = b.dataset.mf;
      renderMistakesView();
    });
  });

  mainEl.querySelector('#mk-search').addEventListener('input', (e) => {
    mistakeQuery = e.target.value;
    renderMistakesView();
  });

  mainEl.querySelectorAll('[data-mk-toggle]').forEach((b) => {
    b.addEventListener('click', () => {
      toggleMistakeMastered(b.dataset.mkToggle);
      syncChrome();
      renderMistakesView();
    });
  });

  mainEl.querySelectorAll('[data-mk-del]').forEach((b) => {
    b.addEventListener('click', () => {
      deleteMistake(b.dataset.mkDel);
      syncChrome();
      renderMistakesView();
    });
  });

  mainEl.querySelector('#mk-drill-btn')?.addEventListener('click', () => {
    let idx = 0;
    let revealed = false;
    const slot = mainEl.querySelector('#mk-drill-slot');
    const drawCard = () => {
      const card = activeItems[idx];
      if (!card) {
        slot.innerHTML = '';
        return;
      }
      slot.innerHTML = `
        <div class="card" style="margin-bottom:18px;border:2px solid var(--accent);text-align:center;padding:28px;">
          <div class="tag" style="margin-bottom:10px;">Card ${idx + 1} / ${activeItems.length} · ${escapeHtml(getQuestionTypeMeta(card.type).name)}</div>
          <h3 style="margin:6px 0 12px;font-size:20px;">${escapeHtml(card.prompt)}</h3>
          ${revealed ? `
            <div style="background:var(--green-soft);border-radius:12px;padding:14px;margin-bottom:14px;">
              <div style="font-weight:800;color:#187A38;font-size:17px;">${escapeHtml(card.correctAnswer)}</div>
              ${card.note ? `<div style="font-size:13px;color:var(--ink-muted);margin-top:4px;">${escapeHtml(card.note)}</div>` : ''}
            </div>
            <div style="display:flex;justify-content:center;gap:10px;">
              <button type="button" id="fc-master" class="btn btn-success btn-sm">✓ ${escapeHtml(t(lang, 'markMastered'))}</button>
              <button type="button" id="fc-next" class="btn btn-primary btn-sm">${escapeHtml(t(lang, 'nextQuestion'))} →</button>
            </div>
          ` : `
            <button type="button" id="fc-reveal" class="btn btn-primary">${lang === 'uz' ? 'To‘g‘ri javobni ko‘rish' : 'Reveal Answer'}</button>
          `}
        </div>
      `;
      slot.querySelector('#fc-reveal')?.addEventListener('click', () => { revealed = true; drawCard(); });
      slot.querySelector('#fc-next')?.addEventListener('click', () => {
        idx = (idx + 1) % activeItems.length;
        revealed = false;
        drawCard();
      });
      slot.querySelector('#fc-master')?.addEventListener('click', () => {
        toggleMistakeMastered(card.id);
        syncChrome();
        renderMistakesView();
      });
    };
    drawCard();
  });
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
        <h3 class="card-title" style="margin-bottom:14px;">🤖 Google Gemini AI</h3>
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
