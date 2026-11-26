import { SKILL_MAP, roundDetScore } from './scoring.js';

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
  soundEnabled: true,
  ttsRate: 1.0,
  ttsVoice: ''
};

function createDefaultState() {
  return {
    settings: { ...DEFAULT_SETTINGS },
    examHistory: [],
    practiceStats: {},
    dailyActivity: {},
    mistakes: [],
    seenIds: {},
    recentWords: []
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
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      seenIds: parsed.seenIds && typeof parsed.seenIds === 'object' ? parsed.seenIds : {},
      recentWords: Array.isArray(parsed.recentWords) ? parsed.recentWords : []
    };
  } catch {
    return createDefaultState();
  }
}

const saveListeners = new Set();

export function onStateSaved(fn) {
  if (typeof fn !== 'function') return () => {};
  saveListeners.add(fn);
  return () => saveListeners.delete(fn);
}

export function saveState(state, { silent = false } = {}) {
  const store = getStorage();
  if (!store) return;
  store.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!silent) {
    saveListeners.forEach((fn) => {
      try { fn(state); } catch {}
    });
  }
}

export function sanitizeStateForCloud(state = loadState()) {
  const src = state && typeof state === 'object' ? state : createDefaultState();
  const safeSettings = {
    ...DEFAULT_SETTINGS,
    ...(src.settings || {}),
    apiKey: ''
  };
  safeSettings.model = normalizeGeminiModel(safeSettings.model);
  return {
    settings: safeSettings,
    examHistory: Array.isArray(src.examHistory) ? src.examHistory.slice(0, 30) : [],
    practiceStats: src.practiceStats && typeof src.practiceStats === 'object' ? src.practiceStats : {},
    dailyActivity: src.dailyActivity && typeof src.dailyActivity === 'object' ? src.dailyActivity : {},
    mistakes: Array.isArray(src.mistakes) ? src.mistakes.slice(0, 200) : [],
    seenIds: src.seenIds && typeof src.seenIds === 'object' ? src.seenIds : {},
    recentWords: Array.isArray(src.recentWords) ? src.recentWords.slice(-120) : []
  };
}

export function mergeStates(localState, cloudState) {
  const local = sanitizeStateForCloud(localState || createDefaultState());
  const localApiKey = String(localState?.settings?.apiKey || '');
  if (!cloudState || typeof cloudState !== 'object') {
    local.settings.apiKey = localApiKey;
    return local;
  }
  const cloud = sanitizeStateForCloud(cloudState);

  // Merge examHistory uniquely by id, newest first
  const examMap = new Map();
  [...(cloud.examHistory || []), ...(local.examHistory || [])].forEach((ex) => {
    if (!ex || !ex.id) return;
    if (!examMap.has(ex.id)) examMap.set(ex.id, ex);
  });
  const examHistory = Array.from(examMap.values())
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 30);

  // Merge practiceStats per type
  const practiceStats = { ...cloud.practiceStats };
  for (const [typeId, lStat] of Object.entries(local.practiceStats || {})) {
    const cStat = practiceStats[typeId];
    if (!cStat) {
      practiceStats[typeId] = lStat;
    } else if ((lStat?.attempts || 0) > (cStat.attempts || 0)) {
      practiceStats[typeId] = lStat;
    } else if ((lStat?.totalTimeSec || 0) > (cStat.totalTimeSec || 0)) {
      practiceStats[typeId] = {
        ...cStat,
        totalTimeSec: Math.max(cStat.totalTimeSec || 0, lStat.totalTimeSec || 0)
      };
    }
  }

  // Merge dailyActivity per date
  const dailyActivity = { ...cloud.dailyActivity };
  for (const [day, lDay] of Object.entries(local.dailyActivity || {})) {
    const cDay = dailyActivity[day];
    if (!cDay) {
      dailyActivity[day] = lDay;
    } else {
      dailyActivity[day] = {
        count: Math.max(cDay.count || 0, lDay.count || 0),
        minutes: Math.max(cDay.minutes || 0, lDay.minutes || 0)
      };
    }
  }

  // Merge mistakes cleanly, keeping mastered: true if mastered on either device
  const mistakeMap = new Map();
  [...(cloud.mistakes || []), ...(local.mistakes || [])].forEach((m) => {
    if (!m) return;
    const key = `${m.type}|${m.prompt}|${m.correctAnswer}`;
    const prev = mistakeMap.get(key);
    if (!prev) {
      mistakeMap.set(key, { ...m });
    } else {
      const prevTime = new Date(prev.createdAt || 0).getTime();
      const curTime = new Date(m.createdAt || 0).getTime();
      const newer = curTime >= prevTime ? m : prev;
      mistakeMap.set(key, {
        ...newer,
        mastered: Boolean(prev.mastered || m.mastered)
      });
    }
  });
  const mistakes = Array.from(mistakeMap.values())
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 200);

  // Merge seenIds sets
  const seenIds = {};
  const seenKeys = new Set([...Object.keys(cloud.seenIds || {}), ...Object.keys(local.seenIds || {})]);
  for (const k of seenKeys) {
    const combined = [...(cloud.seenIds?.[k] || []), ...(local.seenIds?.[k] || [])];
    const uniq = Array.from(new Set(combined.filter(Boolean)));
    seenIds[k] = uniq.slice(-400);
  }

  const recentWords = Array.from(new Set([...(cloud.recentWords || []), ...(local.recentWords || [])])).slice(-120);

  const settings = {
    ...DEFAULT_SETTINGS,
    ...cloud.settings,
    ...local.settings,
    apiKey: localApiKey
  };
  settings.model = normalizeGeminiModel(settings.model);

  return {
    settings,
    examHistory,
    practiceStats,
    dailyActivity,
    mistakes,
    seenIds,
    recentWords
  };
}

export function applyMergedState(nextState) {
  saveState(nextState, { silent: true });
  return nextState;
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
  bumpDailyActivity(state, Math.max(0.5, (report.totalDurationSec || 60) / 60));
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
  const buckets = {
    reading: [],
    writing: [],
    listening: [],
    speaking: []
  };

  const hasExam = Array.isArray(state.examHistory) && state.examHistory.length > 0;
  if (hasExam) {
    const latest = state.examHistory[0];
    for (const sk of ['reading', 'writing', 'listening', 'speaking']) {
      const val = latest?.subscores?.[sk];
      if (Number.isFinite(val) && val > 0) {
        buckets[sk].push(val);
      }
    }
  }

  for (const [typeId, stat] of Object.entries(state.practiceStats || {})) {
    if (!stat || !stat.attempts || !Number.isFinite(stat.avgScore)) continue;
    const skills = SKILL_MAP[typeId] || [];
    for (const sk of skills) {
      if (buckets[sk]) {
        buckets[sk].push(stat.avgScore);
      }
    }
  }

  const subscores = {};
  for (const sk of ['reading', 'writing', 'listening', 'speaking']) {
    const arr = buckets[sk];
    subscores[sk] = arr.length > 0
      ? roundDetScore(arr.reduce((a, b) => a + b, 0) / arr.length)
      : null;
  }

  const integrated = {
    literacy: subscores.reading != null && subscores.writing != null
      ? roundDetScore((subscores.reading + subscores.writing) / 2)
      : null,
    comprehension: subscores.reading != null && subscores.listening != null
      ? roundDetScore((subscores.reading + subscores.listening) / 2)
      : null,
    conversation: subscores.listening != null && subscores.speaking != null
      ? roundDetScore((subscores.listening + subscores.speaking) / 2)
      : null,
    production: subscores.writing != null && subscores.speaking != null
      ? roundDetScore((subscores.writing + subscores.speaking) / 2)
      : null
  };

  const testedSkills = ['reading', 'writing', 'listening', 'speaking'].filter((sk) => subscores[sk] != null);
  const untestedSkills = ['reading', 'writing', 'listening', 'speaking'].filter((sk) => subscores[sk] == null);

  const overall = testedSkills.length > 0
    ? roundDetScore(testedSkills.reduce((sum, sk) => sum + subscores[sk], 0) / testedSkills.length)
    : null;

  return {
    hasData: testedSkills.length > 0,
    isPartial: testedSkills.length > 0 && testedSkills.length < 4,
    source: hasExam ? 'exam' : (testedSkills.length > 0 ? 'practice' : 'none'),
    overall,
    testedSkills,
    untestedSkills,
    subscores,
    integrated
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
    mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : current.mistakes,
    seenIds: parsed.seenIds && typeof parsed.seenIds === 'object' ? parsed.seenIds : current.seenIds,
    recentWords: Array.isArray(parsed.recentWords) ? parsed.recentWords : current.recentWords
  };
  saveState(next);
  return next;
}

export function getSeenIds(typeId, state = loadState()) {
  const list = state.seenIds?.[typeId];
  return new Set(Array.isArray(list) ? list : []);
}

export function markSeenIds(typeId, ids = [], maxKeep = 0) {
  if (!typeId || !Array.isArray(ids) || ids.length === 0) return;
  const state = loadState();
  const prev = Array.isArray(state.seenIds?.[typeId]) ? state.seenIds[typeId] : [];
  const merged = [...prev];
  for (const id of ids) {
    if (!id) continue;
    const idx = merged.indexOf(id);
    if (idx !== -1) merged.splice(idx, 1);
    merged.push(id);
  }
  const trimmed = maxKeep > 0 && merged.length > maxKeep
    ? merged.slice(merged.length - maxKeep)
    : merged;
  state.seenIds = { ...(state.seenIds || {}), [typeId]: trimmed };
  saveState(state);
}

export function getRecentReadSelectWords(state = loadState()) {
  return Array.isArray(state.recentWords) ? [...state.recentWords] : [];
}

export function recordRecentReadSelectWords(words = []) {
  if (!Array.isArray(words) || words.length === 0) return;
  const state = loadState();
  const merged = Array.isArray(state.recentWords) ? [...state.recentWords] : [];
  for (const raw of words) {
    const clean = String(raw || '').trim().toLowerCase();
    if (!clean) continue;
    const idx = merged.indexOf(clean);
    if (idx !== -1) merged.splice(idx, 1);
    merged.push(clean);
  }
  state.recentWords = merged.length > 150 ? merged.slice(merged.length - 150) : merged;
  saveState(state);
}

export function resetAllData() {
  const current = loadState();
  const fresh = createDefaultState();
  fresh.settings.uiLang = current.settings.uiLang;
  saveState(fresh);
  return fresh;
}
