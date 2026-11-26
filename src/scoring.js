export function roundDetScore(value) {
  const clamped = Math.max(10, Math.min(160, Number(value) || 10));
  return Math.round(clamped / 5) * 5;
}

export const DIFFICULTY_THETA = {
  1: 65,
  2: 90,
  3: 115,
  4: 135,
  5: 152
};

export const TASK_WEIGHTS = {
  read_select: 0.6,
  fill_blanks: 1.0,
  read_complete: 2.5,
  interactive_reading: 4.0,
  listen_type: 1.5,
  interactive_listening: 3.5,
  write_photo: 2.0,
  interactive_writing: 3.5,
  writing_sample: 3.0,
  speak_photo: 2.5,
  read_then_speak: 3.0,
  speaking_sample: 3.5,
  read_aloud: 1.5
};

export const GUESSING_FLOOR = {
  read_select: 0.46,
  interactive_reading: 0.15,
  interactive_listening: 0.18
};

export function estimateAbilityIRT(responses = []) {
  if (!Array.isArray(responses) || responses.length === 0) return 10;
  if (responses.every((r) => (Number(r.pctScore) || 0) <= 0)) return 15;

  const a = 0.09;
  const priorMean = 85;
  const priorSd = 70;
  let bestTheta = 85;
  let bestObj = -Infinity;

  for (let theta = 10; theta <= 160; theta += 1) {
    let logLik = -Math.pow(theta - priorMean, 2) / (2 * priorSd * priorSd);

    for (const r of responses) {
      const diff = Math.max(1, Math.min(5, Math.round(Number(r.difficulty || 3))));
      const b = DIFFICULTY_THETA[diff] || 115;
      const c = GUESSING_FLOOR[r.type] || 0;
      const w = Number.isFinite(r.weight) ? r.weight : (TASK_WEIGHTS[r.type] || 1.0);
      const y = Math.max(0.01, Math.min(0.99, (Number(r.pctScore) || 0) / 100));

      const logistic = 1 / (1 + Math.exp(-a * (theta - b)));
      const p = Math.max(0.001, Math.min(0.999, c + (1 - c) * logistic));
      logLik += w * (y * Math.log(p) + (1 - y) * Math.log(1 - p));
    }

    if (logLik > bestObj) {
      bestObj = logLik;
      bestTheta = theta;
    }
  }

  return roundDetScore(bestTheta);
}

export function pctToDetScore(pct, difficulty = 3, type = 'fill_blanks') {
  return estimateAbilityIRT([{ pctScore: pct, difficulty, type, weight: 2.5 }]);
}

// Official DET 6-dimension Open-Response Rubric (Writing & Speaking)
export const DET_SCORING_RUBRIC = [
  {
    key: 'content',
    scope: 'both',
    titleEn: 'Content',
    titleUz: 'Content (Mazmun)',
    descEn: 'Relevance, style, development, and effect on the reader/listener.',
    descUz: 'Mavzuga moslik, uslub, fikrni rivojlantirish va o‘quvchi/tinglovchiga ta’siri.'
  },
  {
    key: 'discourseCoherence',
    scope: 'writing',
    titleEn: 'Discourse Coherence',
    titleUz: 'Discourse Coherence (Izchillik)',
    descEn: 'Clarity, cohesion, progression of ideas, and structure (for writing questions only).',
    descUz: 'Aniqlik, bog‘liqlik, fikrlar rivoji va tuzilma (faqat Writing savollari uchun).'
  },
  {
    key: 'lexis',
    scope: 'both',
    titleEn: 'Lexis (Vocabulary)',
    titleUz: 'Lexis (Lug‘at boyligi)',
    descEn: 'Lexical diversity, lexical sophistication, choice of words, formation of words, and spelling (spelling: writing questions only).',
    descUz: 'So‘z xilma-xilligi, akademik daraja, so‘z tanlash, so‘z yasalishi va imlo (imlo: faqat Writing savollari uchun).'
  },
  {
    key: 'grammar',
    scope: 'both',
    titleEn: 'Grammar',
    titleUz: 'Grammar (Grammatika)',
    descEn: 'Grammatical complexity, grammatical accuracy, and punctuation (punctuation: writing questions only).',
    descUz: 'Grammatik murakkablik, grammatik aniqlik va tinish belgilari (tinish belgilari: faqat Writing savollari uchun).'
  },
  {
    key: 'fluency',
    scope: 'speaking',
    titleEn: 'Fluency',
    titleUz: 'Fluency (Ravonlik)',
    descEn: 'Speed; natural use of pauses; and reliance on filler words, repetition, and starting/stopping (speaking questions only).',
    descUz: 'Nutq tezligi, tabiiy pauzalar, to‘ldiruvchi so‘zlar (um/uh/like), takrorlanish va to‘xtab-boshlash (faqat Speaking savollari uchun).'
  },
  {
    key: 'pronunciation',
    scope: 'speaking',
    titleEn: 'Pronunciation',
    titleUz: 'Pronunciation (Talaffuz)',
    descEn: 'Intelligibility, individual sounds, word stress, sentence stress, and intonation (speaking questions only).',
    descUz: 'Tushunarlilik, alohida tovushlar, so‘z urg‘usi, gap urg‘usi va intonatsiya (faqat Speaking savollari uchun).'
  }
];

export const DET_FREQUENCY_TABLE = [
  { id: 'read_select', name: 'Read and Select', frequency: '15–18', inMock: true },
  { id: 'fill_blanks', name: 'Fill in the Blanks', frequency: '6–9', inMock: true },
  { id: 'read_complete', name: 'Read and Complete', frequency: '3–6', inMock: true },
  { id: 'listen_type', name: 'Listen and Type', frequency: '6–9', inMock: true },
  { id: 'interactive_reading', name: 'Interactive Reading', frequency: '2 sets of 6 questions', inMock: true },
  { id: 'interactive_listening', name: 'Interactive Listening', frequency: '2 sets of 8–10 questions', inMock: true },
  { id: 'write_photo', name: 'Write About the Photo', frequency: '3', inMock: true },
  { id: 'interactive_writing', name: 'Interactive Writing', frequency: '1 set of 2 questions', inMock: true },
  { id: 'speak_photo', name: 'Speak About the Photo', frequency: '1', inMock: true },
  { id: 'read_then_speak', name: 'Read, Then Speak', frequency: '1', inMock: true },
  { id: 'interactive_speaking', name: 'Interactive Speaking', frequency: '1 set of 6–8 questions', inMock: false },
  { id: 'writing_sample', name: 'Writing Sample', frequency: '1', inMock: true },
  { id: 'speaking_sample', name: 'Speaking Sample', frequency: '1', inMock: true }
];

// Official July 2024 – 2026 DET Individual Subscore mapping
export const SKILL_MAP = {
  read_select: ['reading'],
  fill_blanks: ['reading'],
  read_complete: ['reading'],
  interactive_reading: ['reading'],
  listen_type: ['listening'],
  interactive_listening: ['listening', 'writing'],
  write_photo: ['writing'],
  interactive_writing: ['writing'],
  writing_sample: ['writing'],
  speak_photo: ['speaking'],
  read_then_speak: ['speaking'],
  speaking_sample: ['speaking'],
  read_aloud: ['speaking']
};

export function computeSubscores(itemResults = []) {
  const objectiveBuckets = {
    reading: [],
    listening: []
  };
  const rubricBuckets = {
    writing: [],
    speaking: []
  };

  for (const res of itemResults) {
    const type = res.type;
    const diff = res.difficulty || 3;
    const w = TASK_WEIGHTS[type] || 1.5;

    if (type === 'interactive_listening') {
      const mcPct = Number.isFinite(res.mcPct) ? res.mcPct : (res.pctScore || 0);
      objectiveBuckets.listening.push({ type, difficulty: diff, pctScore: mcPct, weight: w });
      if (Number.isFinite(res.writingScore)) {
        rubricBuckets.writing.push({ score: roundDetScore(res.writingScore), weight: 2.0 });
      }
      continue;
    }

    const skills = SKILL_MAP[type] || ['reading'];
    for (const sk of skills) {
      if (objectiveBuckets[sk]) {
        objectiveBuckets[sk].push({
          type,
          difficulty: diff,
          pctScore: res.pctScore ?? 0,
          weight: w
        });
      } else if (rubricBuckets[sk]) {
        const det = roundDetScore(res.detScore ?? pctToDetScore(res.pctScore || 0, diff, type));
        rubricBuckets[sk].push({ score: det, weight: w });
      }
    }
  }

  const weightedAvg = (arr) => {
    if (!arr.length) return null;
    const num = arr.reduce((sum, x) => sum + x.score * x.weight, 0);
    const den = arr.reduce((sum, x) => sum + x.weight, 0);
    return roundDetScore(den > 0 ? num / den : 10);
  };

  const rawSkills = {
    reading: objectiveBuckets.reading.length ? estimateAbilityIRT(objectiveBuckets.reading) : null,
    listening: objectiveBuckets.listening.length ? estimateAbilityIRT(objectiveBuckets.listening) : null,
    writing: weightedAvg(rubricBuckets.writing),
    speaking: weightedAvg(rubricBuckets.speaking)
  };

  const present = Object.values(rawSkills).filter((v) => v != null);
  const fallback = present.length ? roundDetScore(present.reduce((a, b) => a + b, 0) / present.length) : 10;

  const reading = rawSkills.reading ?? fallback;
  const writing = rawSkills.writing ?? fallback;
  const listening = rawSkills.listening ?? fallback;
  const speaking = rawSkills.speaking ?? fallback;

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

// Official Duolingo English Test Concordance Table (2024-2026)
export function scoreToIelts(det) {
  const s = Number(det) || 10;
  if (s >= 155) return '8.5–9.0';
  if (s >= 150) return '8.0';
  if (s >= 140) return '7.5';
  if (s >= 130) return '7.0';
  if (s >= 120) return '6.5';
  if (s >= 105) return '6.0';
  if (s >= 95) return '5.5';
  if (s >= 80) return '5.0';
  if (s >= 65) return '4.5';
  if (s >= 60) return '4.0';
  return '<4.0';
}

export function scoreToCefr(det) {
  const s = Number(det) || 10;
  if (s >= 155) return 'C2';
  if (s >= 130) return 'C1';
  if (s >= 95) return 'B2';
  if (s >= 60) return 'B1';
  return 'A1–A2';
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
    detScore: pctToDetScore(pctScore, item.difficulty || 3, 'read_select'),
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
    detScore: pctToDetScore(pctScore, item.difficulty || 3, 'fill_blanks'),
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
    detScore: pctToDetScore(pctScore, item.difficulty || 3, 'read_complete'),
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
    detScore: pctToDetScore(pctScore, item.difficulty || 3, 'listen_type'),
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
    detScore: pctToDetScore(pctScore, item.difficulty || 3, 'interactive_reading'),
    expected: `${checks.length} stages`,
    userSummary: `${passed}/${checks.length} correct`
  };
}

export function gradeInteractiveListening(item, turnChoices = [], summaryDetScore = null) {
  const turns = item.turns || [];
  let hits = 0;
  const turnDetails = turns.map((turn, idx) => {
    const chosen = turnChoices[idx];
    const ok = chosen === turn.correct;
    if (ok) hits += 1;
    return { prompt: turn.audioText, expected: turn.correct, got: chosen || '(none)', ok };
  });
  const mcPct = turns.length ? Math.round((hits / turns.length) * 100) : 0;
  const listeningScore = estimateAbilityIRT([{
    type: 'interactive_listening',
    difficulty: item.difficulty || 3,
    pctScore: mcPct,
    weight: 3.5
  }]);
  const writingScore = summaryDetScore !== null && Number.isFinite(summaryDetScore)
    ? roundDetScore(summaryDetScore)
    : null;
  const detScore = writingScore !== null
    ? roundDetScore(listeningScore * 0.6 + writingScore * 0.4)
    : listeningScore;
  const combinedPct = writingScore !== null
    ? Math.round(mcPct * 0.6 + ((writingScore - 10) / 150) * 100 * 0.4)
    : mcPct;

  return {
    type: 'interactive_listening',
    correct: hits === turns.length,
    hits,
    totalTurns: turns.length,
    turnDetails,
    mcPct,
    listeningScore,
    writingScore,
    pctScore: combinedPct,
    detScore,
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
      criteria: { content: 20, discourseCoherence: 20, lexis: 20, grammar: 20 },
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
      content: roundDetScore(words >= minWords ? sub : sub * 0.8),
      discourseCoherence: roundDetScore(sub),
      lexis: roundDetScore(sub * (0.85 + lexicalRatio * 0.25)),
      grammar: roundDetScore(sub * 0.95)
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
      criteria: { content: 20, lexis: 20, grammar: 20, fluency: 20, pronunciation: 20 },
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
      content: estimatedScore,
      lexis: estimatedScore,
      grammar: estimatedScore,
      fluency: roundDetScore(estimatedScore * (0.85 + timeFactor * 0.15)),
      pronunciation: estimatedScore
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
