export function roundDetScore(value) {
  const clamped = Math.max(10, Math.min(160, Number(value) || 10));
  return Math.round(clamped / 5) * 5;
}

export function pctToDetScore(pct, difficulty = 3) {
  const safePct = Math.max(0, Math.min(100, Number(pct) || 0));
  // Difficulty adjusts ceiling slightly so harder items reward 140-160 while easy items cap realistically
  const diffOffset = (Number(difficulty || 3) - 3) * 6;
  const raw = 25 + (safePct / 100) * 125 + diffOffset * (safePct / 100);
  return roundDetScore(raw);
}

export const SKILL_MAP = {
  read_select: ['reading'],
  fill_blanks: ['reading', 'writing'],
  read_complete: ['reading', 'writing'],
  listen_type: ['listening', 'writing'],
  read_aloud: ['reading', 'speaking'],
  interactive_reading: ['reading'],
  interactive_listening: ['listening', 'writing'],
  write_photo: ['writing'],
  interactive_writing: ['writing'],
  speak_photo: ['speaking'],
  read_then_speak: ['reading', 'speaking'],
  writing_sample: ['writing'],
  speaking_sample: ['speaking']
};

export function computeSubscores(itemResults = []) {
  const buckets = {
    reading: [],
    writing: [],
    listening: [],
    speaking: []
  };

  for (const res of itemResults) {
    const skills = SKILL_MAP[res.type] || ['reading'];
    const score = roundDetScore(res.detScore ?? pctToDetScore(res.pctScore || 0, res.difficulty || 3));
    for (const sk of skills) {
      if (buckets[sk]) buckets[sk].push(score);
    }
  }

  const avgOrDefault = (arr, fallback) =>
    arr.length ? roundDetScore(arr.reduce((a, b) => a + b, 0) / arr.length) : fallback;

  const nonEmpty = Object.values(buckets).flat();
  const baseFallback = nonEmpty.length
    ? roundDetScore(nonEmpty.reduce((a, b) => a + b, 0) / nonEmpty.length)
    : 10;

  const reading = avgOrDefault(buckets.reading, baseFallback);
  const writing = avgOrDefault(buckets.writing, baseFallback);
  const listening = avgOrDefault(buckets.listening, baseFallback);
  const speaking = avgOrDefault(buckets.speaking, baseFallback);

  const literacy = roundDetScore((reading + writing) / 2);
  const comprehension = roundDetScore((reading + listening) / 2);
  const conversation = roundDetScore((listening + speaking) / 2);
  const production = roundDetScore((writing + speaking) / 2);
  const overall = roundDetScore((reading + writing + listening + speaking) / 4);

  return {
    overall,
    subscores: { reading, writing, listening, speaking },
    integrated: { literacy, comprehension, conversation, production }
  };
}

export function scoreToIelts(det) {
  const s = Number(det) || 10;
  if (s >= 155) return '8.5–9.0';
  if (s >= 145) return '7.5–8.0';
  if (s >= 135) return '7.0';
  if (s >= 125) return '6.5';
  if (s >= 110) return '6.0';
  if (s >= 95) return '5.5';
  if (s >= 80) return '5.0';
  if (s >= 65) return '4.5';
  return '≤4.0';
}

export function scoreToCefr(det) {
  const s = Number(det) || 10;
  if (s >= 155) return 'C2';
  if (s >= 130) return 'C1';
  if (s >= 100) return 'B2';
  if (s >= 60) return 'B1';
  return 'A2';
}

export function nextAdaptiveDifficulty(currentDiff, pctScore) {
  const curr = Math.max(1, Math.min(5, Number(currentDiff) || 3));
  if (pctScore >= 78) return Math.min(5, curr + 1);
  if (pctScore < 50) return Math.max(1, curr - 1);
  return curr;
}

function normalizeText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a, b) {
  const s = a || '';
  const t = b || '';
  const m = s.length;
  const n = t.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function gradeReadSelect(item, userIsReal) {
  const answered = userIsReal === true || userIsReal === false;
  const correct = answered && Boolean(item.isReal) === Boolean(userIsReal);
  const pctScore = correct ? 100 : 0;
  return {
    type: 'read_select',
    correct,
    pctScore,
    detScore: pctToDetScore(pctScore, item.difficulty || 3),
    expected: item.isReal ? 'Real English word' : 'Not a real English word',
    userSummary: answered ? (userIsReal ? 'Yes (Real)' : 'No (Fake)') : 'No answer'
  };
}

export function gradeFillBlanks(item, typedSuffix) {
  const target = String(item.missing || '').toLowerCase().trim();
  const actual = String(typedSuffix || '').toLowerCase().trim();
  const exact = actual === target;
  const dist = levenshtein(actual, target);
  const pctScore = exact ? 100 : Math.max(0, Math.round((1 - dist / Math.max(1, target.length)) * 100));
  return {
    type: 'fill_blanks',
    correct: exact,
    pctScore,
    detScore: pctToDetScore(pctScore, item.difficulty || 3),
    expected: item.fullWord || `${item.prefix}${item.missing}`,
    userSummary: `${item.prefix}${actual || '_'}`
  };
}

export function gradeReadComplete(item, userBlanks = []) {
  const blanks = (item.segments || []).filter((seg) => seg.missing);
  let correctCount = 0;
  const details = blanks.map((seg, idx) => {
    const expected = seg.missing.toLowerCase();
    const got = String(userBlanks[idx] || '').toLowerCase().trim();
    const ok = got === expected;
    if (ok) correctCount += 1;
    return {
      prefix: seg.prefix,
      expected: seg.missing,
      got: userBlanks[idx] || '',
      ok
    };
  });
  const pctScore = blanks.length ? Math.round((correctCount / blanks.length) * 100) : 0;
  return {
    type: 'read_complete',
    correct: correctCount === blanks.length,
    correctCount,
    totalBlanks: blanks.length,
    details,
    pctScore,
    detScore: pctToDetScore(pctScore, item.difficulty || 3),
    expected: details.map((d) => `${d.prefix}${d.expected}`).join(', '),
    userSummary: `${correctCount}/${blanks.length} blanks exact`
  };
}

export function gradeListenType(item, userText) {
  const normTarget = normalizeText(item.sentence);
  const normUser = normalizeText(userText);
  if (!normUser) {
    return {
      type: 'listen_type',
      correct: false,
      pctScore: 0,
      detScore: 25,
      wordDiff: [],
      expected: item.sentence,
      userSummary: '(empty)'
    };
  }
  const targetWords = normTarget.split(' ').filter(Boolean);
  const userWords = normUser.split(' ').filter(Boolean);
  const charDist = levenshtein(normUser, normTarget);
  const charSim = Math.max(0, 1 - charDist / Math.max(1, normTarget.length));

  let wordMatches = 0;
  const maxLen = Math.max(targetWords.length, userWords.length);
  const wordDiff = targetWords.map((w, idx) => {
    const match = userWords[idx] === w;
    if (match) wordMatches += 1;
    return { expected: w, got: userWords[idx] || '', ok: match };
  });
  const wordSim = maxLen ? wordMatches / targetWords.length : 0;
  const pctScore = Math.round((charSim * 0.65 + wordSim * 0.35) * 100);

  return {
    type: 'listen_type',
    correct: pctScore >= 95,
    pctScore,
    detScore: pctToDetScore(pctScore, item.difficulty || 3),
    wordDiff,
    expected: item.sentence,
    userSummary: userText
  };
}

export function gradeInteractiveReading(item, stageAnswers = {}) {
  const checks = [];

  // Stage 1: Complete the Sentences (5 blanks)
  const s1Answers = stageAnswers.stage1 || [];
  (item.stage1?.blanks || []).forEach((b, idx) => {
    const ok = s1Answers[idx] === b.correct;
    checks.push({ stage: 'Complete the Sentences', ok, expected: b.correct, got: s1Answers[idx] || '' });
  });

  // Stage 2: Complete the Passage (missing middle sentence)
  if (item.stage2) {
    const ok = stageAnswers.stage2 === item.stage2.correct;
    checks.push({ stage: 'Complete the Passage', ok, expected: item.stage2.correct, got: stageAnswers.stage2 || '' });
  }

  // Stage 3a & 3b: Highlight the Answer
  if (item.stage3a) {
    const ok = Number(stageAnswers.stage3a) === Number(item.stage3a.correctSentenceIndex);
    checks.push({
      stage: 'Highlight Answer 1',
      ok,
      expected: `Sentence #${item.stage3a.correctSentenceIndex + 1}`,
      got: stageAnswers.stage3a !== undefined ? `Sentence #${Number(stageAnswers.stage3a) + 1}` : '(none)'
    });
  }
  if (item.stage3b) {
    const ok = Number(stageAnswers.stage3b) === Number(item.stage3b.correctSentenceIndex);
    checks.push({
      stage: 'Highlight Answer 2',
      ok,
      expected: `Sentence #${item.stage3b.correctSentenceIndex + 1}`,
      got: stageAnswers.stage3b !== undefined ? `Sentence #${Number(stageAnswers.stage3b) + 1}` : '(none)'
    });
  }

  // Stage 4: Identify the Idea
  if (item.stage4) {
    const ok = stageAnswers.stage4 === item.stage4.correct;
    checks.push({ stage: 'Identify the Idea', ok, expected: item.stage4.correct, got: stageAnswers.stage4 || '' });
  }

  // Stage 5: Title the Passage
  if (item.stage5) {
    const ok = stageAnswers.stage5 === item.stage5.correct;
    checks.push({ stage: 'Title the Passage', ok, expected: item.stage5.correct, got: stageAnswers.stage5 || '' });
  }

  const passed = checks.filter((c) => c.ok).length;
  const pctScore = checks.length ? Math.round((passed / checks.length) * 100) : 0;

  return {
    type: 'interactive_reading',
    correct: passed === checks.length,
    passed,
    totalChecks: checks.length,
    checks,
    pctScore,
    detScore: pctToDetScore(pctScore, item.difficulty || 3),
    expected: `${checks.length} stages`,
    userSummary: `${passed}/${checks.length} correct`
  };
}

export function gradeInteractiveListening(item, turnChoices = [], summaryScorePct = null) {
  const turns = item.turns || [];
  let hits = 0;
  const turnDetails = turns.map((turn, idx) => {
    const chosen = turnChoices[idx];
    const ok = chosen === turn.correct;
    if (ok) hits += 1;
    return { prompt: turn.audioText, expected: turn.correct, got: chosen || '(none)', ok };
  });
  const mcPct = turns.length ? (hits / turns.length) * 100 : 0;
  const combinedPct = summaryScorePct !== null ? Math.round(mcPct * 0.6 + summaryScorePct * 0.4) : Math.round(mcPct);
  return {
    type: 'interactive_listening',
    correct: hits === turns.length,
    hits,
    totalTurns: turns.length,
    turnDetails,
    pctScore: combinedPct,
    detScore: pctToDetScore(combinedPct, item.difficulty || 3),
    expected: `${turns.length} turns`,
    userSummary: `${hits}/${turns.length} conversation choices`
  };
}

export function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

export function heuristicWritingScore({ text, minWords = 35, targetWords = 90, lang = 'uz' }) {
  const trimmed = String(text || '').trim();
  const words = countWords(trimmed);
  const uniqueWords = new Set(normalizeText(trimmed).split(' ').filter(Boolean)).size;
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 3).length;

  if (words < 5) {
    return {
      estimatedScore: 20,
      isOfflineEstimate: true,
      criteria: { grammar: 20, vocabulary: 20, coherence: 20, taskRelevance: 20 },
      summary: lang === 'uz'
        ? 'Javob juda qisqa. Kamida bir nechta to‘liq gap yozishga harakat qiling.'
        : 'Response is too short. Aim for complete, connected sentences.',
      corrections: [],
      upgradedVersion: '',
      keyTips: []
    };
  }

  const lengthRatio = Math.min(1.1, words / targetWords);
  const lexicalRatio = uniqueWords / Math.max(1, words);
  const avgSentenceLen = words / Math.max(1, sentences);
  const sentenceQuality = avgSentenceLen >= 8 && avgSentenceLen <= 26 ? 1 : 0.78;

  const raw = 45 + lengthRatio * 55 + lexicalRatio * 30 + sentenceQuality * 15;
  const estimatedScore = roundDetScore(Math.min(145, raw));
  const sub = estimatedScore;

  return {
    estimatedScore,
    isOfflineEstimate: true,
    criteria: {
      grammar: roundDetScore(sub * 0.95),
      vocabulary: roundDetScore(sub * (0.85 + lexicalRatio * 0.25)),
      coherence: roundDetScore(sub),
      taskRelevance: roundDetScore(words >= minWords ? sub : sub * 0.8)
    },
    summary: lang === 'uz'
      ? `Taxminiy offline tahlil: ${words} ta so‘z (${sentences} ta gap). Aniq grammatika xatolari va C1/C2 tavsiyalari uchun Sozlamalarda Gemini AI kalitini ulang.`
      : `Offline estimate based on ${words} words across ${sentences} sentences. Connect Gemini API in Settings for line-by-line grammar feedback.`,
    corrections: [],
    upgradedVersion: '',
    keyTips: [
      lang === 'uz'
        ? `Maqsad hajm: kamida ${targetWords}+ so‘z va bog‘lovchi so‘zlar (however, furthermore, consequently) ishlating.`
        : `Aim for ${targetWords}+ words using varied connectors like however, furthermore, and consequently.`
    ]
  };
}

export function heuristicSpeakingScore({ transcript, durationSec = 0, targetSec = 60, lang = 'uz' }) {
  const words = countWords(transcript);
  if (durationSec < 5 && words < 4) {
    return {
      estimatedScore: 20,
      isOfflineEstimate: true,
      transcript: transcript || '',
      criteria: { pronunciation: 20, fluency: 20, grammar: 20, vocabulary: 20, relevance: 20 },
      summary: lang === 'uz'
        ? 'Ovoz juda qisqa yozildi. Kamida 30–60 soniya uzluksiz gapirishga harakat qiling.'
        : 'Recording was too brief. Try to speak continuously for 30–60 seconds.',
      corrections: [],
      modelAnswer: '',
      keyTips: []
    };
  }

  const timeFactor = Math.min(1, durationSec / Math.max(20, targetSec * 0.85));
  const wordFactor = words > 0 ? Math.min(1, words / 85) : timeFactor;
  const raw = 48 + timeFactor * 48 + wordFactor * 36;
  const estimatedScore = roundDetScore(Math.min(140, raw));

  return {
    estimatedScore,
    isOfflineEstimate: true,
    transcript: transcript || '',
    criteria: {
      pronunciation: estimatedScore,
      fluency: roundDetScore(estimatedScore * (0.85 + timeFactor * 0.15)),
      grammar: estimatedScore,
      vocabulary: estimatedScore,
      relevance: estimatedScore
    },
    summary: lang === 'uz'
      ? `Taxminiy offline baho (${Math.round(durationSec)} soniya gapirildi). Haqiqiy talaffuz va grammatika tahlili uchun Gemini AI kalitini ulang.`
      : `Offline duration/fluency estimate (${Math.round(durationSec)}s recorded). Connect Gemini API in Settings to analyze pronunciation and grammar.`,
    corrections: [],
    modelAnswer: '',
    keyTips: [
      lang === 'uz'
        ? 'Javobni 3 qismga bo‘ling: umumiy fikr → 2 ta aniq misol → qisqa xulosa.'
        : 'Structure your speech cleanly: main point → 2 concrete details → brief conclusion.'
    ]
  };
}
