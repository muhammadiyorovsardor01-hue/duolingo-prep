import { roundDetScore } from './scoring.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export const GEMINI_MODELS = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (Recommended — Fast & High Free Quota)' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Most Capable Flash)' },
  { id: 'gemini-flash-lite-latest', label: 'Gemini Flash-Lite Latest (Auto-Updated)' },
  { id: 'gemini-flash-latest', label: 'Gemini Flash Latest (Auto-Updated)' }
];

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Empty response from Gemini');
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      return JSON.parse(fenced[1].trim());
    }
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Gemini returned invalid JSON');
  }
}

async function requestModel({ cleanKey, modelId, parts, temperature }) {
  const safeModel = encodeURIComponent(String(modelId || DEFAULT_GEMINI_MODEL).trim());
  const url = `${GEMINI_BASE}/${safeModel}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': cleanKey
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      errMsg = errBody?.error?.message || errMsg;
    } catch {}
    const err = new Error(errMsg);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return extractJson(text);
}

async function callGemini({ apiKey, model = DEFAULT_GEMINI_MODEL, parts, temperature = 0.35 }) {
  const cleanKey = String(apiKey || '').trim();
  if (!cleanKey) {
    throw new Error('Missing Gemini API key');
  }
  const chosenModel = String(model || DEFAULT_GEMINI_MODEL).trim();

  try {
    return await requestModel({ cleanKey, modelId: chosenModel, parts, temperature });
  } catch (err) {
    // Auto-retry once on transient 503 capacity spikes or deprecated 404 model IDs
    if (err?.status === 503 || err?.status === 404) {
      const fallbackModel = chosenModel === 'gemini-3.5-flash-lite'
        ? 'gemini-flash-lite-latest'
        : 'gemini-3.5-flash-lite';
      return await requestModel({ cleanKey, modelId: fallbackModel, parts, temperature });
    }
    throw err;
  }
}

export async function testConnection(apiKey, model = DEFAULT_GEMINI_MODEL) {
  try {
    const res = await callGemini({
      apiKey,
      model,
      temperature: 0,
      parts: [{ text: 'Respond with JSON: {"ok": true, "status": "connected"}' }]
    });
    return {
      ok: Boolean(res?.ok),
      message: `Connected (${model})`
    };
  } catch (err) {
    return {
      ok: false,
      message: err?.message || 'Connection failed'
    };
  }
}

export async function evaluateWriting({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  taskType,
  prompt,
  userResponse,
  imageDescription = '',
  wordCount = 0,
  feedbackLang = 'uz'
}) {
  const langInstruction = feedbackLang === 'uz'
    ? 'Write "summary", correction "explanation", and "keyTips" in clear natural Uzbek (using Latin script), while keeping "original", "corrected", and "upgradedVersion" in English.'
    : 'Write all feedback in clear English.';

  const sysPrompt = `You are a certified Duolingo English Test (DET) examiner. Grade this candidate's writing response strictly on the official DET 10–160 scale (in 5-point increments) using the 4 official DET Writing rubric criteria:
- content: relevance, style, development, and effect on the reader
- discourseCoherence: clarity, cohesion, progression of ideas, and structure
- lexis: lexical diversity, lexical sophistication, choice of words, formation of words, and spelling
- grammar: grammatical complexity, grammatical accuracy, and punctuation

Task type: ${taskType}
Prompt: ${prompt}
${imageDescription ? `Visual Scene Description: ${imageDescription}` : ''}
Candidate response (${wordCount} words):
"""
${String(userResponse || '').trim()}
"""

If the response is blank, nonsensical, or completely off-topic, score between 10 and 30.
${langInstruction}

Return ONLY valid JSON with this exact schema:
{
  "estimatedScore": 115,
  "criteria": {
    "content": 120,
    "discourseCoherence": 115,
    "lexis": 110,
    "grammar": 115
  },
  "summary": "2-3 concise sentences evaluating content, discourse coherence, lexis, and grammar.",
  "corrections": [
    {
      "original": "exact weak or incorrect phrase from student",
      "corrected": "natural C1/C2 replacement",
      "explanation": "brief explanation of the fix"
    }
  ],
  "upgradedVersion": "A polished 140+ band rewrite preserving the candidate's ideas.",
  "keyTips": ["tip 1", "tip 2"]
}`;

  const raw = await callGemini({ apiKey, model, parts: [{ text: sysPrompt }], temperature: 0.25 });
  return {
    estimatedScore: roundDetScore(raw.estimatedScore || 60),
    isOfflineEstimate: false,
    criteria: {
      content: roundDetScore(raw.criteria?.content ?? raw.criteria?.taskRelevance ?? raw.estimatedScore ?? 60),
      discourseCoherence: roundDetScore(raw.criteria?.discourseCoherence ?? raw.criteria?.coherence ?? raw.estimatedScore ?? 60),
      lexis: roundDetScore(raw.criteria?.lexis ?? raw.criteria?.vocabulary ?? raw.estimatedScore ?? 60),
      grammar: roundDetScore(raw.criteria?.grammar ?? raw.estimatedScore ?? 60)
    },
    summary: String(raw.summary || ''),
    corrections: Array.isArray(raw.corrections) ? raw.corrections.slice(0, 5) : [],
    upgradedVersion: String(raw.upgradedVersion || ''),
    keyTips: Array.isArray(raw.keyTips) ? raw.keyTips.slice(0, 4) : []
  };
}

export async function evaluateSpeaking({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  taskType,
  prompt,
  audioBase64 = '',
  mimeType = 'audio/webm',
  transcript = '',
  imageDescription = '',
  durationSec = 0,
  feedbackLang = 'uz'
}) {
  const langInstruction = feedbackLang === 'uz'
    ? 'Write "summary", correction "explanation", and "keyTips" in clear Uzbek (Latin script). Keep "transcript", "original", "corrected", and "modelAnswer" in English.'
    : 'Write all feedback in clear English.';

  const parts = [];
  if (audioBase64) {
    parts.push({
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: audioBase64
      }
    });
  }

  const textPrompt = `You are a certified Duolingo English Test (DET) speaking examiner. Evaluate this candidate's spoken response on the official DET 10–160 scale (5-point increments) using the 5 official DET Speaking rubric criteria:
- content: relevance, style, development, and effect on the listener
- lexis: lexical diversity, lexical sophistication, choice of words, and formation of words
- grammar: grammatical complexity and grammatical accuracy
- fluency: speed; natural use of pauses; and reliance on filler words, repetition, and starting/stopping
- pronunciation: intelligibility, individual sounds, word stress, sentence stress, and intonation

Task type: ${taskType}
Prompt: ${prompt}
${imageDescription ? `Image Scene Description: ${imageDescription}` : ''}
Speaking duration: ${Math.round(durationSec)} seconds.
${transcript ? `Browser speech-to-text hint (may have minor errors; trust the attached audio if present): "${transcript}"` : ''}
${!audioBase64 && !transcript ? 'Note: No audio or speech was captured.' : ''}

${langInstruction}

Return ONLY valid JSON with this exact schema:
{
  "estimatedScore": 115,
  "transcript": "accurate verbatim transcription of what the candidate said",
  "criteria": {
    "content": 120,
    "lexis": 110,
    "grammar": 115,
    "fluency": 115,
    "pronunciation": 110
  },
  "summary": "2-3 concise sentences evaluating content, lexis, grammar, fluency, and pronunciation.",
  "corrections": [
    {
      "original": "spoken error or awkward phrasing",
      "corrected": "natural fluent version",
      "explanation": "why this sounds better"
    }
  ],
  "modelAnswer": "A strong 140+ band spoken sample answer for this exact prompt.",
  "keyTips": ["actionable tip 1", "actionable tip 2"]
}`;

  parts.push({ text: textPrompt });

  const raw = await callGemini({ apiKey, model, parts, temperature: 0.25 });
  return {
    estimatedScore: roundDetScore(raw.estimatedScore || 60),
    isOfflineEstimate: false,
    transcript: String(raw.transcript || transcript || ''),
    criteria: {
      content: roundDetScore(raw.criteria?.content ?? raw.criteria?.relevance ?? raw.estimatedScore ?? 60),
      lexis: roundDetScore(raw.criteria?.lexis ?? raw.criteria?.vocabulary ?? raw.estimatedScore ?? 60),
      grammar: roundDetScore(raw.criteria?.grammar ?? raw.estimatedScore ?? 60),
      fluency: roundDetScore(raw.criteria?.fluency ?? raw.estimatedScore ?? 60),
      pronunciation: roundDetScore(raw.criteria?.pronunciation ?? raw.estimatedScore ?? 60)
    },
    summary: String(raw.summary || ''),
    corrections: Array.isArray(raw.corrections) ? raw.corrections.slice(0, 5) : [],
    modelAnswer: String(raw.modelAnswer || ''),
    keyTips: Array.isArray(raw.keyTips) ? raw.keyTips.slice(0, 4) : []
  };
}

const CEFR_BY_DIFF = {
  1: 'B1 (everyday intermediate)',
  2: 'B1+/B2 (upper-intermediate)',
  3: 'B2 (college-ready)',
  4: 'C1 (advanced academic)',
  5: 'C1+/C2 (highly sophisticated academic)'
};

function validateGeneratedQuestion(type, raw, difficulty) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid generated question');
  const base = {
    id: `ai_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    difficulty,
    isAiGenerated: true
  };

  switch (type) {
    case 'read_select': {
      if (!raw.word || typeof raw.isReal !== 'boolean') throw new Error('Invalid read_select');
      return { ...base, word: String(raw.word).trim().toLowerCase(), isReal: raw.isReal };
    }
    case 'fill_blanks': {
      if (!raw.prefix || !raw.missing) throw new Error('Invalid fill_blanks');
      return {
        ...base,
        before: String(raw.before || ''),
        prefix: String(raw.prefix),
        missing: String(raw.missing).toLowerCase(),
        after: String(raw.after || ''),
        fullWord: `${raw.prefix}${raw.missing}`
      };
    }
    case 'read_complete': {
      if (!Array.isArray(raw.segments) || raw.segments.filter((s) => s.missing).length < 4) {
        throw new Error('Invalid read_complete');
      }
      return {
        ...base,
        title: String(raw.title || 'Academic Passage'),
        segments: raw.segments.map((s) => ({
          text: s.text ? String(s.text) : undefined,
          prefix: s.prefix ? String(s.prefix) : undefined,
          missing: s.missing ? String(s.missing).toLowerCase() : undefined
        }))
      };
    }
    case 'listen_type':
    case 'read_aloud': {
      if (!raw.sentence || String(raw.sentence).split(/\s+/).length < 5) throw new Error('Invalid sentence');
      return { ...base, sentence: String(raw.sentence).trim() };
    }
    case 'interactive_reading': {
      if (!raw.stage1?.blanks?.length || !raw.stage2?.options?.length || !raw.stage4?.options?.length || !raw.stage5?.options?.length) {
        throw new Error('Invalid interactive_reading');
      }
      return { ...base, ...raw };
    }
    case 'interactive_listening': {
      if (!raw.scenario || !Array.isArray(raw.turns) || raw.turns.length < 3) {
        throw new Error('Invalid interactive_listening');
      }
      return { ...base, ...raw };
    }
    case 'interactive_writing': {
      if (!raw.part1Prompt || !raw.part2Prompt) throw new Error('Invalid interactive_writing');
      return { ...base, part1Prompt: String(raw.part1Prompt), part2Prompt: String(raw.part2Prompt) };
    }
    case 'read_then_speak': {
      if (!raw.prompt || !Array.isArray(raw.bullets) || raw.bullets.length < 2) throw new Error('Invalid read_then_speak');
      return { ...base, prompt: String(raw.prompt), bullets: raw.bullets.map(String) };
    }
    case 'writing_sample':
    case 'speaking_sample': {
      if (!raw.prompt) throw new Error('Invalid sample prompt');
      return { ...base, prompt: String(raw.prompt) };
    }
    default:
      throw new Error(`Unsupported AI question type: ${type}`);
  }
}

export async function generateQuestion({ apiKey, model = DEFAULT_GEMINI_MODEL, type, difficulty = 3, recentPrompts = [] }) {
  const cefr = CEFR_BY_DIFF[difficulty] || CEFR_BY_DIFF[3];
  const avoidNote = recentPrompts.length
    ? `Avoid repeating these recent topics/words: ${recentPrompts.slice(-6).join(' | ')}`
    : '';

  const schemas = {
    read_select: `Create 1 DET "Read and Select" item at ${cefr}. Decide randomly (50/50) whether to generate a real English word or a plausible English-looking non-word (like "prevalate" or "untrastive"). Return JSON: {"word": "string", "isReal": true}`,
    fill_blanks: `Create 1 DET "Fill in the Blanks" sentence at ${cefr} with ONE masked word in the middle/end where the first half (prefix) is shown and the second half (missing, 3-6 letters, letters only) must be typed. Return JSON: {"before": "text before the blank including trailing space ", "prefix": "first 2-4 letters", "missing": "remaining letters only", "after": " remaining text with leading space."}`,
    read_complete: `Create 1 DET "Read and Complete" C-test passage (65-85 words) at ${cefr}. Keep the FIRST sentence and LAST sentence completely intact (only "text" entries). Inside middle sentences, put 7 to 9 word blanks where "prefix" is the first half of the word and "missing" is the second half (letters only, lowercase). Interleave {"text": "... "} and {"prefix": "...", "missing": "..."} segments cleanly so joining them reconstructs a grammatically perfect passage. Return JSON: {"title": "Short Topic", "segments": [{"text": "Full first sentence. "}, {"text": "Next words "}, {"prefix": "ex", "missing": "ample"}, {"text": " ..."}, {"text": " Full final sentence."}]}`,
    listen_type: `Create 1 natural academic or campus English sentence (10-18 words) for DET "Listen and Type" at ${cefr}. Return JSON: {"sentence": "..."}`,
    read_aloud: `Create 1 clear English sentence (12-20 words) for DET "Read Aloud" at ${cefr}. Return JSON: {"sentence": "..."}`,
    interactive_reading: `Create 1 full DET "Interactive Reading" passage at ${cefr} about science, culture, history, or technology. Structure JSON exactly as:
{
  "title": "Short topic",
  "stage1": {
    "paragraphParts": ["Sentence 1 before ", " between ", " and ", " then ", " and ", " end."],
    "blanks": [
      {"options": ["w1","w2","w3","w4"], "correct": "w2"},
      {"options": ["w1","w2","w3","w4"], "correct": "w1"},
      {"options": ["w1","w2","w3","w4"], "correct": "w4"},
      {"options": ["w1","w2","w3","w4"], "correct": "w3"},
      {"options": ["w1","w2","w3","w4"], "correct": "w2"}
    ]
  },
  "stage2": {
    "before": "Completed stage1 text...",
    "after": "Final 2 sentences of passage...",
    "options": ["candidate sentence 1", "candidate sentence 2", "candidate sentence 3", "candidate sentence 4"],
    "correct": "candidate sentence 2"
  },
  "fullSentences": ["Sentence 1.", "Sentence 2.", "Sentence 3.", "Sentence 4.", "Sentence 5.", "Sentence 6.", "Sentence 7."],
  "stage3a": {"question": "Detail question 1?", "correctSentenceIndex": 2},
  "stage3b": {"question": "Detail question 2?", "correctSentenceIndex": 4},
  "stage4": {"question": "What is the main idea of the passage?", "options": ["opt1","opt2","opt3","opt4"], "correct": "opt2"},
  "stage5": {"options": ["Title 1","Title 2","Title 3","Title 4"], "correct": "Title 3"}
}`,
    interactive_listening: `Create 1 DET "Interactive Listening" university campus conversation at ${cefr} with 4 turns and a summary prompt. Return JSON:
{
  "scenario": "Brief 1-sentence setup explaining your role and who you are talking to.",
  "peerName": "Professor Lin",
  "turns": [
    {"audioText": "What the peer says", "options": ["Natural reply 1", "Wrong reply 2", "Wrong reply 3", "Wrong reply 4"], "correct": "Natural reply 1"}
  ],
  "summaryPrompt": "Summarize the conversation you just had and explain what was decided."
}`,
    interactive_writing: `Create 1 DET "Interactive Writing" 2-part prompt at ${cefr}. Return JSON: {"part1Prompt": "Main opinion/argument prompt (5 min)", "part2Prompt": "Follow-up prompt asking for counterargument or consequence (3 min)"}`,
    read_then_speak: `Create 1 DET "Read, Then Speak" prompt at ${cefr} with 3 bullet points to cover. Return JSON: {"prompt": "Topic question or instruction", "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"]}`,
    writing_sample: `Create 1 DET "Writing Sample" argumentative/reflective prompt at ${cefr}. Return JSON: {"prompt": "..."}`,
    speaking_sample: `Create 1 DET "Speaking Sample" open-ended prompt at ${cefr}. Return JSON: {"prompt": "..."}`
  };

  const taskSpec = schemas[type];
  if (!taskSpec) {
    throw new Error(`AI generation not configured for ${type}`);
  }

  const prompt = `${taskSpec}\n${avoidNote}\nReturn ONLY valid JSON.`;
  const raw = await callGemini({ apiKey, model, parts: [{ text: prompt }], temperature: 0.85 });
  return validateGeneratedQuestion(type, raw, difficulty);
}

export async function generateReadSelectBatch({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  count = 15,
  difficulty = 3,
  avoidWords = []
}) {
  const cefr = CEFR_BY_DIFF[difficulty] || CEFR_BY_DIFF[3];
  const realCount = Math.floor(count / 2);
  const fakeCount = count - realCount;
  const avoidSet = new Set((avoidWords || []).map((w) => String(w || '').trim().toLowerCase()).filter(Boolean));
  const avoidSnippet = avoidWords.length
    ? `Strictly DO NOT use any of these previously seen words: ${avoidWords.slice(-60).join(', ')}.`
    : '';

  const prompt = `Create a batch of ${count} unique Duolingo English Test "Read and Select" vocabulary items at level ${cefr}.
Include ${realCount} genuine, unmistakable standard English words (single lowercase words, no hyphens/spaces) and ${fakeCount} plausible English-looking fake non-words (invented pseudowords that do not exist in any English dictionary, like "prevalate" or "untrastive").
${avoidSnippet}
Return ONLY valid JSON with this exact schema:
{
  "items": [
    { "word": "example", "isReal": true },
    { "word": "prevalate", "isReal": false }
  ]
}`;

  const raw = await callGemini({ apiKey, model, parts: [{ text: prompt }], temperature: 0.95 });
  const list = Array.isArray(raw?.items) ? raw.items : [];
  const seenBatch = new Set();
  const validated = [];

  for (const entry of list) {
    const word = String(entry?.word || '').trim().toLowerCase();
    if (!word || !/^[a-z]{3,20}$/.test(word)) continue;
    if (typeof entry?.isReal !== 'boolean') continue;
    if (avoidSet.has(word) || seenBatch.has(word)) continue;
    seenBatch.add(word);
    validated.push({
      id: `ai_rs_${Date.now()}_${validated.length}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'read_select',
      word,
      isReal: entry.isReal,
      difficulty,
      isAiGenerated: true
    });
    if (validated.length >= count) break;
  }

  return validated;
}
