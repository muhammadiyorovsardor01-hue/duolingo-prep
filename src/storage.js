const STORAGE_KEY = 'det_prep_v1';

const LEGACY_GEMINI_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-flash-lite']);

function normalizeGeminiModel(modelId) {
  const clean = String(modelId || '').trim();
  if (!clean || LEGACY_GEMINI_MODELS.has(clean)) {
    return 'gemini-3.5-flash-lite';
  }
  return clean;
}

export const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'gemini-3.5-flash-lite',
  targetScore: 125,
  uiLang: 'uz',
  enableWebcam: false,
  enableProctor: true,
  useAiGeneration: true,
  ttsRate: 1.0,
  ttsVoice: ''
};

function createDefaultState() {
  return {
    settings: { ...DEFAULT_SETTINGS },
    examHistory: [],
    practiceStats: {},
    dailyActivity: {},
    mistakes: []
  };
}

function getStorage() {
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

export function loadState() {
  const store = getStorage();
  if (!store) return createDefaultState();
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    const mergedSettings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
    mergedSettings.model = normalizeGeminiModel(mergedSettings.model);
    return {
      settings: mergedSettings,
      examHistory: Array.isArray(parsed.examHistory) ? parsed.examHistory : [],
      practiceStats: parsed.practiceStats && typeof parsed.practiceStats === 'object' ? parsed.practiceStats : {},
      dailyActivity: parsed.dailyActivity && typeof parsed.dailyActivity === 'object' ? parsed.dailyActivity : {},
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : []
    };
  } catch {
    return createDefaultState();
  }
}

export function saveState(state) {
  const store = getStorage();
  if (!store) return;
  store.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function updateSettings(partial) {
  const state = loadState();
  state.settings = { ...state.settings, ...partial };
  saveState(state);
  return state;
}

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function bumpDailyActivity(state, minutesDelta = 1) {
  const key = todayKey();
  const prev = state.dailyActivity[key] || { count: 0, minutes: 0 };
  state.dailyActivity[key] = {
    count: prev.count + 1,
    minutes: Math.round((prev.minutes + Math.max(0.5, minutesDelta)) * 10) / 10
  };
}

export function recordPracticeAttempt({ type, detScore, pctScore, timeSec = 60 }) {
  const state = loadState();
  const prev = state.practiceStats[type] || { attempts: 0, avgScore: 0, totalTimeSec: 0, lastScore: 0 };
  const attempts = prev.attempts + 1;
  const effectiveScore = Number.isFinite(detScore) ? detScore : Math.round(10 + (pctScore / 100) * 150);
  const avgScore = Math.round(((prev.avgScore * prev.attempts) + effectiveScore) / attempts);
  state.practiceStats[type] = {
    attempts,
    avgScore,
    lastScore: effectiveScore,
    totalTimeSec: prev.totalTimeSec + Math.max(1, Math.round(timeSec))
  };
  bumpDailyActivity(state, timeSec / 60);
  saveState(state);
  return state;
}

export function recordExamReport(report) {
  const state = loadState();
  state.examHistory.unshift(report);
  if (state.examHistory.length > 30) {
    state.examHistory = state.examHistory.slice(0, 30);
  }
  bumpDailyActivity(state, Math.max(5, Math.round((report.totalDurationSec || 900) / 60)));
  saveState(state);
  return state;
}

export function addMistake({ type, prompt, userAnswer, correctAnswer, note = '' }) {
  const state = loadState();
  const duplicate = state.mistakes.find(
    (m) => m.type === type && m.prompt === prompt && m.correctAnswer === correctAnswer && !m.mastered
  );
  if (duplicate) {
    duplicate.userAnswer = userAnswer;
    duplicate.note = note || duplicate.note;
    duplicate.createdAt = new Date().toISOString();
  } else {
    state.mistakes.unshift({
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      prompt: String(prompt || '').slice(0, 280),
      userAnswer: String(userAnswer || '').slice(0, 280),
      correctAnswer: String(correctAnswer || '').slice(0, 280),
      note: String(note || '').slice(0, 360),
      createdAt: new Date().toISOString(),
      mastered: false
    });
  }
  if (state.mistakes.length > 200) {
    state.mistakes = state.mistakes.slice(0, 200);
  }
  saveState(state);
  return state;
}

export function toggleMistakeMastered(id) {
  const state = loadState();
  const target = state.mistakes.find((m) => m.id === id);
  if (target) {
    target.mastered = !target.mastered;
    saveState(state);
  }
  return state;
}

export function deleteMistake(id) {
  const state = loadState();
  state.mistakes = state.mistakes.filter((m) => m.id !== id);
  saveState(state);
  return state;
}

export function getStreak(state = loadState()) {
  const activity = state.dailyActivity || {};
  let streak = 0;
  const cursor = new Date();
  // If today has no activity yet, allow streak starting from yesterday
  if (!activity[todayKey(cursor)]) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (activity[todayKey(cursor)] && activity[todayKey(cursor)].count > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getEstimatedScores(state = loadState()) {
  if (state.examHistory.length > 0) {
    const latest = state.examHistory[0];
    return {
      hasData: true,
      source: 'exam',
      overall: latest.overall,
      subscores: latest.subscores,
      integrated: latest.integrated
    };
  }
  const entries = Object.values(state.practiceStats);
  if (entries.length > 0) {
    const avg = Math.round(entries.reduce((s, e) => s + e.avgScore, 0) / entries.length / 5) * 5;
    const clamped = Math.max(10, Math.min(160, avg));
    return {
      hasData: true,
      source: 'practice',
      overall: clamped,
      subscores: { reading: clamped, writing: clamped, listening: clamped, speaking: clamped },
      integrated: { literacy: clamped, comprehension: clamped, conversation: clamped, production: clamped }
    };
  }
  return {
    hasData: false,
    source: 'none',
    overall: null,
    subscores: { reading: 0, writing: 0, listening: 0, speaking: 0 },
    integrated: { literacy: 0, comprehension: 0, conversation: 0, production: 0 }
  };
}

export function exportBackupJSON() {
  const state = loadState();
  const safeCopy = {
    ...state,
    settings: { ...state.settings, apiKey: '' }
  };
  return JSON.stringify(safeCopy, null, 2);
}

export function importBackupJSON(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup format');
  }
  const current = loadState();
  const nextSettings = {
    ...DEFAULT_SETTINGS,
    ...(parsed.settings || {}),
    apiKey: current.settings.apiKey || (parsed.settings && parsed.settings.apiKey) || ''
  };
  nextSettings.model = normalizeGeminiModel(nextSettings.model);
  const next = {
    settings: nextSettings,
    examHistory: Array.isArray(parsed.examHistory) ? parsed.examHistory : current.examHistory,
    practiceStats: parsed.practiceStats || current.practiceStats,
    dailyActivity: parsed.dailyActivity || current.dailyActivity,
    mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : current.mistakes
  };
  saveState(next);
  return next;
}

export function resetAllData() {
  const current = loadState();
  const fresh = createDefaultState();
  fresh.settings.uiLang = current.settings.uiLang;
  saveState(fresh);
  return fresh;
}
