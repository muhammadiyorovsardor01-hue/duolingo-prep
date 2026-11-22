import { roundDetScore, countWords, levenshtein } from './scoring.js';

const LT_ENDPOINT = 'https://api.languagetool.org/v2/check';

const AWL_WORDS = new Set([
  'abundant', 'accelerate', 'accessible', 'accommodate', 'accomplish', 'accurate', 'achieve', 'acknowledge',
  'acquire', 'adapt', 'adequate', 'adjacent', 'adjust', 'advocate', 'affect', 'allocate', 'alter',
  'alternative', 'ambiguous', 'ambivalent', 'analyze', 'annual', 'anticipate', 'apparent', 'approach',
  'appropriate', 'approximate', 'arbitrary', 'aspect', 'assess', 'assign', 'assist', 'assume', 'assure',
  'attain', 'attitude', 'attribute', 'authority', 'automate', 'available', 'aware', 'beneficial',
  'benefit', 'benevolent', 'bias', 'capable', 'capacity', 'category', 'cease', 'challenge', 'channel',
  'circumstance', 'clarify', 'coherent', 'coincide', 'collaborate', 'collapse', 'colleague', 'combine',
  'commence', 'comment', 'commit', 'commodity', 'communicate', 'community', 'compatible', 'compensate',
  'compile', 'complement', 'complex', 'component', 'comprehensive', 'comprise', 'compromise', 'conceive',
  'concentrate', 'concept', 'conclude', 'concurrent', 'conduct', 'confer', 'confine', 'confirm',
  'conflict', 'conform', 'consent', 'consequence', 'consequent', 'considerable', 'consist', 'consistent',
  'constitute', 'constrain', 'construct', 'consult', 'consume', 'contemporary', 'context', 'contingent',
  'continue', 'contract', 'contradict', 'contrary', 'contrast', 'contribute', 'controversy', 'convene',
  'converse', 'convert', 'convince', 'cooperate', 'coordinate', 'core', 'corporate', 'correspond',
  'corroborate', 'criteria', 'crucial', 'culminate', 'culture', 'cumulative', 'currency', 'cycle',
  'debate', 'decade', 'decline', 'deduce', 'define', 'definite', 'demonstrate', 'denote', 'deny',
  'depress', 'derive', 'design', 'despite', 'detect', 'deviate', 'device', 'devote', 'differentiate',
  'dimension', 'diminish', 'discrepancy', 'discrete', 'discriminate', 'displace', 'display', 'dispose',
  'disseminate', 'distinct', 'distort', 'distribute', 'diverse', 'document', 'domain', 'domestic',
  'dominate', 'draft', 'drama', 'duration', 'dynamic', 'economy', 'efficient', 'element', 'eliminate',
  'emerge', 'emphasis', 'empirical', 'enable', 'encounter', 'energy', 'enforce', 'enhance', 'enormous',
  'ensure', 'entity', 'environment', 'equate', 'equip', 'equivalent', 'erode', 'error', 'establish',
  'estate', 'estimate', 'ethic', 'evaluate', 'eventual', 'evident', 'evolve', 'exacerbate', 'exceed',
  'exclude', 'exhibit', 'expand', 'expert', 'explicit', 'exploit', 'export', 'expose', 'external',
  'extract', 'facilitate', 'factor', 'feasible', 'feature', 'federal', 'fee', 'file', 'final',
  'finance', 'finite', 'flexible', 'fluctuate', 'focus', 'format', 'formula', 'forthcoming', 'found',
  'foundation', 'framework', 'function', 'fundamental', 'furthermore', 'gender', 'generate', 'generation',
  'globe', 'goal', 'grade', 'grant', 'guarantee', 'guideline', 'hence', 'hierarchy', 'highlight',
  'hypothesis', 'identical', 'identify', 'ideology', 'ignorance', 'illustrate', 'image', 'immigrate',
  'impact', 'implement', 'implicate', 'implicit', 'imply', 'impose', 'incentive', 'incidence', 'incline',
  'income', 'incorporate', 'index', 'indicate', 'individual', 'induce', 'inevitable', 'infer',
  'infrastructure', 'inherent', 'inhibit', 'initial', 'initiate', 'injure', 'innovate', 'input', 'insert',
  'insight', 'inspect', 'instance', 'institute', 'instruct', 'integral', 'integrate', 'integrity',
  'intelligence', 'intense', 'interact', 'intermediate', 'internal', 'interpret', 'interval', 'intervene',
  'intrinsic', 'invest', 'investigate', 'invoke', 'involve', 'isolate', 'issue', 'item', 'justify',
  'label', 'labor', 'layer', 'lecture', 'legal', 'legislate', 'levy', 'liberal', 'license', 'likewise',
  'link', 'locate', 'logic', 'maintain', 'major', 'manipulate', 'manual', 'margin', 'mature', 'maximize',
  'mechanism', 'media', 'mediate', 'medical', 'medium', 'mental', 'method', 'migrate', 'military',
  'minimal', 'minimize', 'minimum', 'ministry', 'minor', 'mitigate', 'mode', 'modify', 'monitor',
  'motive', 'mutual', 'negate', 'network', 'neutral', 'nevertheless', 'nonetheless', 'norm', 'normal',
  'notion', 'notwithstanding', 'nuclear', 'objective', 'obtain', 'obvious', 'occupy', 'occur', 'offset',
  'ongoing', 'option', 'orient', 'outcome', 'output', 'overall', 'overlap', 'overseas', 'panel',
  'paradigm', 'paragraph', 'parallel', 'parameter', 'participate', 'partner', 'passive', 'perceive',
  'percent', 'period', 'persist', 'persistent', 'perspective', 'persuade', 'phase', 'phenomenon',
  'philosophy', 'physical', 'plausible', 'plus', 'policy', 'portion', 'pose', 'positive', 'potential',
  'practitioner', 'pragmatic', 'precede', 'precise', 'preclude', 'predict', 'predominant', 'preliminary',
  'presume', 'previous', 'primary', 'prime', 'principal', 'principle', 'prior', 'priority', 'proceed',
  'process', 'professional', 'prohibit', 'project', 'proliferate', 'promote', 'proportion', 'prospect',
  'protocol', 'psychology', 'publication', 'publish', 'purchase', 'pursue', 'qualitative', 'quote',
  'radical', 'random', 'range', 'ratio', 'rational', 'react', 'recover', 'refine', 'regime', 'region',
  'register', 'regulate', 'reinforce', 'reject', 'relax', 'release', 'relevant', 'reluctance', 'reluctant',
  'rely', 'remove', 'require', 'research', 'reside', 'resilient', 'resolve', 'resource', 'respond',
  'restore', 'restrain', 'restrict', 'retain', 'reveal', 'revenue', 'reverse', 'revise', 'revolution',
  'rigid', 'role', 'route', 'scenario', 'schedule', 'scheme', 'scope', 'scrutinize', 'section', 'sector',
  'secure', 'seek', 'select', 'sequence', 'series', 'shift', 'significant', 'similar', 'simulate',
  'site', 'so-called', 'sole', 'somewhat', 'source', 'specific', 'specify', 'sphere', 'stable', 'statistic',
  'status', 'straightforward', 'strategy', 'stress', 'structure', 'style', 'submit', 'subordinate',
  'subsequent', 'subsidy', 'substantiate', 'substitute', 'successor', 'sufficient', 'sum', 'summary',
  'supplement', 'survey', 'survive', 'suspend', 'sustain', 'sustainable', 'symbol', 'target', 'task',
  'team', 'technical', 'technique', 'technology', 'temporary', 'tense', 'terminate', 'text', 'theme',
  'theory', 'thereby', 'thesis', 'topic', 'trace', 'tradition', 'transfer', 'transform', 'transit',
  'transmit', 'transport', 'trend', 'trigger', 'ultimate', 'undergo', 'underlie', 'undertake', 'uniform',
  'unify', 'unique', 'utilize', 'valid', 'vary', 'vehicle', 'version', 'via', 'violate', 'virtual',
  'visible', 'vision', 'visual', 'volume', 'voluntary', 'welfare', 'whereas', 'whereby', 'widespread'
]);

const CONNECTORS = [
  'however', 'furthermore', 'moreover', 'consequently', 'therefore', 'nevertheless', 'nonetheless',
  'although', 'though', 'even though', 'whereas', 'while', 'in addition', 'additionally',
  'on the other hand', 'for example', 'for instance', 'such as', 'as a result', 'because of',
  'due to', 'despite', 'in spite of', 'meanwhile', 'subsequently', 'overall', 'in conclusion',
  'to summarize', 'firstly', 'secondly', 'finally', 'specifically', 'in contrast'
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our',
  'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two',
  'way', 'who', 'did', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'that', 'this', 'from',
  'they', 'will', 'have', 'what', 'when', 'where', 'which', 'their', 'there', 'about', 'would', 'could',
  'should', 'into', 'than', 'then', 'them', 'these', 'those', 'some', 'been', 'being', 'more', 'most',
  'very', 'just', 'also', 'each', 'many', 'such', 'below', 'image', 'describe', 'write', 'speak', 'minute'
]);

function tokenizeWords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .match(/[a-z']+/g) || [];
}

function analyzeLinguistics(text, referenceText = '') {
  const trimmed = String(text || '').trim();
  const tokens = tokenizeWords(trimmed);
  const wordCount = tokens.length;
  const uniqueTokens = new Set(tokens);
  const lexicalDiversity = wordCount > 0 ? uniqueTokens.size / wordCount : 0;
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 2);
  const sentenceCount = Math.max(wordCount > 0 ? 1 : 0, sentences.length);
  const avgSentenceLen = sentenceCount > 0 ? wordCount / sentenceCount : 0;

  const advancedWords = [...uniqueTokens].filter((w) => AWL_WORDS.has(w) || (w.length >= 8 && !STOP_WORDS.has(w)));

  const lower = trimmed.toLowerCase();
  const connectors = CONNECTORS.filter((c) => {
    const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(lower);
  });

  // Relevance check against prompt + imageDescription
  const refTokens = [...new Set(tokenizeWords(referenceText).filter((w) => w.length >= 4 && !STOP_WORDS.has(w)))];
  let relevanceHits = 0;
  for (const rw of refTokens) {
    const stem = rw.slice(0, 5);
    if ([...uniqueTokens].some((uw) => uw.startsWith(stem) || levenshtein(uw, rw) <= 1)) {
      relevanceHits += 1;
    }
  }
  const relevanceRatio = refTokens.length > 0 ? Math.min(1, relevanceHits / Math.min(6, Math.max(2, refTokens.length * 0.35))) : 0.85;

  return {
    wordCount,
    uniqueCount: uniqueTokens.size,
    lexicalDiversity,
    sentenceCount,
    avgSentenceLen,
    advancedWords,
    connectors,
    relevanceRatio
  };
}

export async function checkGrammarLanguageTool(text) {
  const input = String(text || '').trim();
  if (input.length < 4 || typeof fetch !== 'function') {
    return { ok: false, matches: [], correctedText: input };
  }

  try {
    const body = new URLSearchParams({
      text: input,
      language: 'en-US',
      enabledOnly: 'false'
    });
    const res = await fetch(LT_ENDPOINT, {
      method: 'POST',
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!res.ok) {
      return { ok: false, matches: [], correctedText: input };
    }
    const data = await res.json();
    const rawMatches = Array.isArray(data?.matches) ? data.matches : [];

    // Filter meaningful grammar/spelling/punctuation matches (ignore minor whitespace nitpicks)
    const usable = rawMatches.filter((m) => {
      const cat = m?.rule?.category?.id || '';
      if (cat === 'STYLE' && (!m.replacements || m.replacements.length === 0)) return false;
      return typeof m.offset === 'number' && typeof m.length === 'number' && m.length > 0;
    });

    const matches = usable.slice(0, 8).map((m) => ({
      offset: m.offset,
      length: m.length,
      original: input.slice(m.offset, m.offset + m.length),
      corrected: m.replacements?.[0]?.value || '',
      explanation: m.shortMessage || m.message || 'Grammar/spelling suggestion',
      category: m?.rule?.issueType || m?.rule?.category?.name || 'grammar'
    }));

    // Build corrected text by applying non-overlapping replacements back-to-front
    let correctedText = input;
    const sortedForApply = [...usable]
      .filter((m) => m.replacements?.[0]?.value)
      .sort((a, b) => b.offset - a.offset);
    let lastStart = Infinity;
    for (const m of sortedForApply) {
      if (m.offset + m.length > lastStart) continue;
      const rep = m.replacements[0].value;
      correctedText = correctedText.slice(0, m.offset) + rep + correctedText.slice(m.offset + m.length);
      lastStart = m.offset;
    }

    return { ok: true, matches, correctedText };
  } catch {
    return { ok: false, matches: [], correctedText: input };
  }
}

function getTaskTargets(taskType) {
  if (taskType === 'write_photo') return { minWords: 25, targetWords: 48 };
  if (taskType === 'interactive_listening' || taskType === 'Interactive Listening Summary') return { minWords: 22, targetWords: 55 };
  return { minWords: 55, targetWords: 120 };
}

export async function evaluateWritingSmart({
  taskType,
  prompt = '',
  userResponse = '',
  imageDescription = '',
  lang = 'uz'
}) {
  const trimmed = String(userResponse || '').trim();
  const analysis = analyzeLinguistics(trimmed, `${prompt} ${imageDescription}`);
  const { minWords, targetWords } = getTaskTargets(taskType);

  if (analysis.wordCount < 5) {
    return {
      estimatedScore: 20,
      isOfflineEstimate: false,
      isSmartFreeEval: true,
      engineLabel: 'Smart Grammar Engine (Free)',
      criteria: { grammar: 20, vocabulary: 20, coherence: 20, taskRelevance: 20 },
      summary: lang === 'uz'
        ? 'Javob juda qisqa. Kamida bir nechta to‘liq gap yozishga harakat qiling.'
        : 'Response is too brief. Write multiple complete, connected sentences.',
      corrections: [],
      upgradedVersion: '',
      keyTips: [],
      stats: { wordCount: analysis.wordCount, errorCount: 0, advancedWords: [], connectors: [] }
    };
  }

  const lt = await checkGrammarLanguageTool(trimmed);
  const errorCount = lt.matches.length;
  const errorRatePer20Words = (errorCount / Math.max(10, analysis.wordCount)) * 20;

  const grammarBase = Math.max(35, 148 - errorRatePer20Words * 22);
  const lengthFactor = Math.min(1.08, analysis.wordCount / targetWords);
  const vocabRaw = 55 + Math.min(45, analysis.lexicalDiversity * 58) + Math.min(35, analysis.advancedWords.length * 7) + lengthFactor * 18;
  const coherenceRaw = 52 + lengthFactor * 48 + Math.min(28, analysis.connectors.length * 10) + (analysis.sentenceCount >= 3 ? 16 : 4);
  const relevanceRaw = 48 + (analysis.wordCount >= minWords ? 42 : (analysis.wordCount / minWords) * 35) + analysis.relevanceRatio * 55;

  const grammar = roundDetScore(Math.min(155, grammarBase * (0.65 + 0.35 * Math.min(1, lengthFactor))));
  const vocabulary = roundDetScore(Math.min(155, vocabRaw));
  const coherence = roundDetScore(Math.min(155, coherenceRaw));
  const taskRelevance = roundDetScore(Math.min(155, relevanceRaw));
  const estimatedScore = roundDetScore((grammar * 0.32 + vocabulary * 0.24 + coherence * 0.22 + taskRelevance * 0.22));

  const corrections = lt.matches
    .filter((m) => m.corrected)
    .slice(0, 6)
    .map((m) => ({
      original: m.original,
      corrected: m.corrected,
      explanation: m.explanation
    }));

  const upgradedVersion = lt.ok && lt.correctedText && lt.correctedText !== trimmed
    ? lt.correctedText
    : '';

  const tips = [];
  if (analysis.wordCount < targetWords) {
    tips.push(
      lang === 'uz'
        ? `Hajmni oshiring: hozir ${analysis.wordCount} ta so‘z, ${targetWords}+ so‘z yozish ballni sezilarli ko‘taradi.`
        : `Expand your answer: currently ${analysis.wordCount} words; aiming for ${targetWords}+ words boosts your score.`
    );
  }
  if (analysis.connectors.length < 2) {
    tips.push(
      lang === 'uz'
        ? 'Bog‘lovchi so‘zlardan foydalaning: however, furthermore, consequently, for instance.'
        : 'Add linking phrases such as however, furthermore, consequently, and for instance.'
    );
  }
  if (errorCount > 0) {
    tips.push(
      lang === 'uz'
        ? `${errorCount} ta grammatika/imlo xatosi aniqlandi — yuqoridagi tuzatishlarni ko‘rib chiqing.`
        : `${errorCount} grammar/spelling issue(s) found — review the corrections above.`
    );
  } else if (analysis.advancedWords.length < 3) {
    tips.push(
      lang === 'uz'
        ? 'C1/C2 darajadagi aniqroq akademik so‘zlarni qo‘shing (masalan: significant, sustainable, demonstrate).'
        : 'Include stronger academic vocabulary (e.g., significant, sustainable, demonstrate) to push past 130.'
    );
  }

  const ltBadgeText = lt.ok
    ? (lang === 'uz'
      ? `LanguageTool tekshiruvi: ${analysis.wordCount} ta so‘z, ${errorCount} ta grammatika/imlo xatosi, ${analysis.advancedWords.length} ta kuchli so‘z.`
      : `Checked ${analysis.wordCount} words via LanguageTool: ${errorCount} issue(s), ${analysis.advancedWords.length} academic/advanced words.`)
    : (lang === 'uz'
      ? `Oflayn tahlil: ${analysis.wordCount} ta so‘z, ${analysis.sentenceCount} ta gap, ${analysis.advancedWords.length} ta kuchli so‘z.`
      : `Offline linguistic analysis: ${analysis.wordCount} words across ${analysis.sentenceCount} sentences.`);

  return {
    estimatedScore,
    isOfflineEstimate: false,
    isSmartFreeEval: true,
    engineLabel: lt.ok ? 'Smart Grammar Engine (LanguageTool)' : 'Smart Linguistic Analyzer (Offline)',
    criteria: { grammar, vocabulary, coherence, taskRelevance },
    summary: ltBadgeText,
    corrections,
    upgradedVersion,
    keyTips: tips.slice(0, 3),
    stats: {
      wordCount: analysis.wordCount,
      errorCount,
      advancedWords: analysis.advancedWords.slice(0, 8),
      connectors: analysis.connectors.slice(0, 6)
    }
  };
}

function alignReadAloudWords(expectedSentence, spokenTranscript) {
  const expectedNorm = tokenizeWords(expectedSentence);
  const spokenNorm = tokenizeWords(spokenTranscript);
  const rawExpectedWords = String(expectedSentence || '').trim().split(/\s+/).filter(Boolean);

  if (expectedNorm.length === 0) return { wordDiff: [], accuracyPct: 0 };
  if (spokenNorm.length === 0) {
    return {
      wordDiff: rawExpectedWords.map((w) => ({ expected: w, got: '', ok: false })),
      accuracyPct: 0
    };
  }

  let sIdx = 0;
  let hits = 0;
  const wordDiff = expectedNorm.map((expWord, idx) => {
    const displayExp = rawExpectedWords[idx] || expWord;
    // Greedy lookahead window of 3 tokens to tolerate skipped/extra speech-recognition tokens
    let foundOffset = -1;
    for (let look = 0; look <= 2 && sIdx + look < spokenNorm.length; look++) {
      const candidate = spokenNorm[sIdx + look];
      if (candidate === expWord || (expWord.length >= 5 && levenshtein(candidate, expWord) <= 1)) {
        foundOffset = look;
        break;
      }
    }
    if (foundOffset !== -1) {
      const gotWord = spokenNorm[sIdx + foundOffset];
      sIdx += foundOffset + 1;
      hits += 1;
      return { expected: displayExp, got: gotWord, ok: true };
    }
    const missedGot = spokenNorm[sIdx] || '';
    if (sIdx < spokenNorm.length) sIdx += 1;
    return { expected: displayExp, got: missedGot, ok: false };
  });

  const accuracyPct = Math.round((hits / expectedNorm.length) * 100);
  return { wordDiff, accuracyPct };
}

export async function evaluateSpeakingSmart({
  taskType,
  prompt = '',
  transcript = '',
  targetSentence = '',
  imageDescription = '',
  durationSec = 0,
  lang = 'uz'
}) {
  const cleanTranscript = String(transcript || '').trim();
  const words = tokenizeWords(cleanTranscript);
  const wordCount = words.length;
  const wpm = durationSec >= 2 && wordCount > 0 ? Math.round((wordCount / durationSec) * 60) : 0;

  if (durationSec < 2 && wordCount < 2) {
    return {
      estimatedScore: 20,
      isOfflineEstimate: false,
      isSmartFreeEval: true,
      engineLabel: 'Smart Speech Analyzer (Free)',
      transcript: cleanTranscript,
      wpm: 0,
      criteria: { pronunciation: 20, fluency: 20, grammar: 20, vocabulary: 20, relevance: 20 },
      summary: lang === 'uz'
        ? 'Ovoz yozilmadi yoki juda qisqa. Mikrofon ruxsatini tekshirib, aniqroq gapiring.'
        : 'Audio was too short or silent. Check microphone permissions and speak clearly.',
      corrections: [],
      modelAnswer: targetSentence || '',
      keyTips: [],
      wordDiff: []
    };
  }

  // Special deterministic word-by-word grading for Read Aloud
  if (taskType === 'read_aloud' && targetSentence) {
    const { wordDiff, accuracyPct } = alignReadAloudWords(targetSentence, cleanTranscript);
    const hasTranscript = wordCount > 0;
    const paceScore = wpm >= 95 && wpm <= 175 ? 140 : wpm >= 70 ? 115 : wpm > 0 ? 85 : 80;
    const pronunciation = hasTranscript ? roundDetScore(35 + (accuracyPct / 100) * 115) : roundDetScore(Math.min(115, 55 + durationSec * 5));
    const fluency = roundDetScore((pronunciation * 0.6 + paceScore * 0.4));
    const estimatedScore = roundDetScore((pronunciation * 0.55 + fluency * 0.45));

    return {
      estimatedScore,
      isOfflineEstimate: false,
      isSmartFreeEval: true,
      engineLabel: 'Smart Speech Alignment (Free)',
      transcript: cleanTranscript,
      wpm,
      wordDiff,
      criteria: {
        pronunciation,
        fluency,
        grammar: pronunciation,
        vocabulary: pronunciation,
        relevance: hasTranscript ? roundDetScore(30 + (accuracyPct / 100) * 120) : 90
      },
      summary: hasTranscript
        ? (lang === 'uz'
          ? `So‘zlar aniqligi: ${accuracyPct}% · Gapirish tezligi: ${wpm} so‘z/daq (WPM).`
          : `Word match accuracy: ${accuracyPct}% · Speaking pace: ${wpm} WPM.`)
        : (lang === 'uz'
          ? `Audio davomiyligi: ${Math.round(durationSec)}s. (Brauzer Speech-to-Text ishlamadi — ovozingizni o‘zingiz qayta tinglab tekshirishingiz mumkin.)`
          : `Recorded ${Math.round(durationSec)}s of audio (browser live transcription unavailable).`),
      corrections: [],
      modelAnswer: targetSentence,
      keyTips: accuracyPct < 85 && hasTranscript
        ? [lang === 'uz' ? 'Qizil belgilangan so‘zlarni sekinroq va aniqroq talaffuz qilib qayta o‘qing.' : 'Enunciate the red-highlighted words clearly at a steady pace.']
        : [lang === 'uz' ? 'Ajoyib! Endi pauza va urg‘ularga e’tibor berib tabiiy ohangda o‘qing.' : 'Strong match! Keep natural phrasing and word stress.']
    };
  }

  // Open speaking tasks: speak_photo, read_then_speak, speaking_sample
  const targetSec = taskType === 'speaking_sample' ? 110 : 60;
  const analysis = analyzeLinguistics(cleanTranscript, `${prompt} ${imageDescription}`);
  const fillers = (cleanTranscript.toLowerCase().match(/\b(um+|uh+|er+|ah+)\b/g) || []).length;

  let lt = { ok: false, matches: [], correctedText: cleanTranscript };
  if (wordCount >= 6) {
    lt = await checkGrammarLanguageTool(cleanTranscript);
  }

  const timeFactor = Math.min(1.05, durationSec / Math.max(25, targetSec * 0.8));
  const paceScore = wpm === 0 ? 85 : (wpm >= 105 && wpm <= 165 ? 145 : wpm >= 80 ? 120 : 90);

  if (wordCount < 5) {
    // Browser without Web Speech API fallback — fair time-based estimate
    const base = roundDetScore(Math.min(130, 50 + timeFactor * 65));
    return {
      estimatedScore: base,
      isOfflineEstimate: true,
      isSmartFreeEval: true,
      engineLabel: 'Smart Speech Timer (Free)',
      transcript: '',
      wpm: 0,
      criteria: { pronunciation: base, fluency: base, grammar: base, vocabulary: base, relevance: base },
      summary: lang === 'uz'
        ? `${Math.round(durationSec)} soniya nutq yozildi. To‘liq so‘zma-so‘z tahlil uchun Chrome/Edge brauzeridan foydalaning yoki Gemini AI ulang.`
        : `Recorded ${Math.round(durationSec)}s of speech. Use Chrome/Edge for live transcript grammar analysis or connect Gemini AI.`,
      corrections: [],
      modelAnswer: '',
      keyTips: [lang === 'uz' ? '3 qismli reja bilan gapiring: asosiy fikr → 2 ta misol → xulosa.' : 'Follow a 3-part structure: main claim → 2 concrete details → short wrap-up.'],
      wordDiff: []
    };
  }

  const errorCount = lt.matches.length;
  const errorDensity = (errorCount / Math.max(12, wordCount)) * 20;
  const grammar = roundDetScore(Math.min(155, Math.max(40, 145 - errorDensity * 20)));
  const fluency = roundDetScore(Math.min(155, paceScore * 0.55 + (50 + timeFactor * 90) * 0.45 - fillers * 4));
  const vocabulary = roundDetScore(Math.min(155, 58 + analysis.lexicalDiversity * 52 + analysis.advancedWords.length * 8 + timeFactor * 22));
  const relevance = roundDetScore(Math.min(155, 55 + timeFactor * 45 + analysis.relevanceRatio * 52));
  const pronunciation = roundDetScore((fluency * 0.6 + grammar * 0.4));
  const estimatedScore = roundDetScore((pronunciation + fluency + grammar + vocabulary + relevance) / 5);

  const tips = [];
  if (wpm > 0 && wpm < 95) {
    tips.push(lang === 'uz' ? `Tezlik past (${wpm} WPM). Pauzalarni qisqartirib, 110–150 WPM da ravon gapirishga harakat qiling.` : `Your pace was ${wpm} WPM; aim for 110–150 WPM with fewer pauses.`);
  }
  if (fillers > 2) {
    tips.push(lang === 'uz' ? `${fillers} marta "um/uh" ishlatildi — ularning o‘rniga qisqa nafas oling yoki "actually / in fact" deng.` : `Detected ${fillers} filler sounds (um/uh); pause silently or use connectors instead.`);
  }
  if (durationSec < 35) {
    tips.push(lang === 'uz' ? 'Kamida 45–60 soniya gapirish ballni ancha oshiradi.' : 'Speaking for at least 45–60 seconds helps demonstrate fluency.');
  }

  return {
    estimatedScore,
    isOfflineEstimate: false,
    isSmartFreeEval: true,
    engineLabel: lt.ok ? 'Smart Speech + LanguageTool (Free)' : 'Smart Speech Analyzer (Free)',
    transcript: cleanTranscript,
    wpm,
    criteria: { pronunciation, fluency, grammar, vocabulary, relevance },
    summary: lang === 'uz'
      ? `${Math.round(durationSec)}s · ${wordCount} ta so‘z · ${wpm} WPM · ${errorCount} ta grammatika izohi.`
      : `${Math.round(durationSec)}s · ${wordCount} words · ${wpm} WPM · ${errorCount} grammar note(s).`,
    corrections: lt.matches.filter((m) => m.corrected).slice(0, 5).map((m) => ({
      original: m.original,
      corrected: m.corrected,
      explanation: m.explanation
    })),
    modelAnswer: lt.ok && lt.correctedText && lt.correctedText !== cleanTranscript ? lt.correctedText : '',
    keyTips: tips.slice(0, 3),
    wordDiff: []
  };
}
