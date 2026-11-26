import { getSceneById } from './scenes.js';
import { speakText, stopSpeaking, unlockSpeech, AudioRecorder } from './speech.js';
import {
  countWords,
  gradeReadSelect,
  gradeFillBlanks,
  gradeReadComplete,
  gradeListenType,
  gradeInteractiveReading,
  gradeInteractiveListening,
  heuristicWritingScore,
  heuristicSpeakingScore,
  pctToDetScore,
  DET_SCORING_RUBRIC,
  DET_FREQUENCY_TABLE
} from './scoring.js';
import { evaluateWriting, evaluateSpeaking } from './gemini.js';
import { evaluateWritingSmart, evaluateSpeakingSmart } from './smart-eval.js';
import { t } from './i18n.js';

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wires contiguous character input strips with auto-advance, backspace jumping, and readiness checks. */
function wireSegmentedInputs(container, { requireAll = true, onSubmitReady, onEnterSubmit, registerCleanup } = {}) {
  const boxes = Array.from(container.querySelectorAll('.det-fb-cell-input'));
  const syncReady = () => {
    boxes.forEach((b) => b.classList.toggle('filled', b.value.length > 0));
    const ready = requireAll
      ? boxes.length > 0 && boxes.every((b) => b.value.length === 1)
      : boxes.some((b) => b.value.length > 0);
    onSubmitReady?.(ready);
  };

  container.querySelectorAll('.det-fb-cell.prefix').forEach((cell) => {
    cell.addEventListener('click', () => {
      const strip = cell.closest('.det-fb-word-strip');
      const stripInputs = Array.from(strip?.querySelectorAll('.det-fb-cell-input') || []);
      const target = stripInputs.find((x) => !x.value && !x.readOnly) || stripInputs.find((x) => !x.readOnly);
      target?.focus();
    });
  });

  boxes.forEach((box, idx) => {
    box.dataset.prevVal = '';
    box.addEventListener('input', () => {
      if (box.readOnly) return;
      const prev = box.dataset.prevVal || '';
      const letters = (box.value || '').replace(/[^a-zA-Z]/g, '');
      if (!prev && letters.length > 1) {
        let cursor = idx;
        for (const ch of letters) {
          if (cursor >= boxes.length) break;
          boxes[cursor].value = ch;
          boxes[cursor].dataset.prevVal = ch;
          cursor += 1;
        }
        const nextFocus = boxes[Math.min(cursor, boxes.length - 1)];
        nextFocus?.focus();
      } else {
        const single = prev && letters.length > 1 ? letters.slice(-1) : letters.slice(0, 1);
        box.value = single;
        box.dataset.prevVal = single;
        if (single && idx < boxes.length - 1) {
          boxes[idx + 1].focus();
        }
      }
      syncReady();
    });

    box.addEventListener('beforeinput', (e) => {
      if (box.readOnly) return;
      if (e.inputType === 'deleteContentBackward' && !box.value && idx > 0) {
        e.preventDefault();
        boxes[idx - 1].value = '';
        boxes[idx - 1].dataset.prevVal = '';
        boxes[idx - 1].focus();
        syncReady();
      }
    });

    box.addEventListener('keydown', (e) => {
      if (box.readOnly) return;
      if (e.key === 'Backspace') {
        if (!box.value && idx > 0) {
          e.preventDefault();
          boxes[idx - 1].value = '';
          boxes[idx - 1].dataset.prevVal = '';
          boxes[idx - 1].focus();
          syncReady();
        }
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault();
        boxes[idx - 1].focus();
      } else if (e.key === 'ArrowRight' && idx < boxes.length - 1) {
        e.preventDefault();
        boxes[idx + 1].focus();
      } else if (e.key === 'Enter' && onEnterSubmit) {
        if (boxes.length > 0 && boxes.every((b) => b.value.length === 1)) {
          e.preventDefault();
          onEnterSubmit();
        }
      }
    });
  });

  syncReady();
  const focusTimer = setTimeout(() => {
    if (boxes[0] && !boxes[0].readOnly) boxes[0].focus();
  }, 40);
  registerCleanup?.(() => clearTimeout(focusTimer));
  return boxes;
}

export function applyObjectiveReviewVisuals(container, item, result) {
  if (!container || !item || !result) return;

  if (item.type === 'read_select') {
    const btns = Array.from(container.querySelectorAll('[data-rs]'));
    btns.forEach((btn) => {
      btn.disabled = true;
    });
  } else if (item.type === 'fill_blanks' || item.type === 'read_complete') {
    const boxes = Array.from(container.querySelectorAll('.det-fb-cell-input, .char-box'));
    boxes.forEach((box) => {
      box.readOnly = true;
      box.blur();
    });
  }
}

export function mountQuestionRenderer(container, item, options = {}) {
  const { settings = {}, onSubmitReady, onImmediateSubmit, onEnterSubmit, onRecordingStart, lang = 'uz' } = options;
  let cleanupFns = [];
  const registerCleanup = (fn) => cleanupFns.push(fn);

  let getAnswer = () => null;
  const type = item.type;

  // 1. READ AND SELECT
  if (type === 'read_select') {
    let selected = null;
    let locked = false;
    container.innerHTML = `
      <div class="det-rs-wrap">
        <h3 class="det-rs-prompt">Is this a real English word?</h3>
        <div class="det-rs-word">${escapeHtml(item.word)}</div>
        <div class="det-rs-grid">
          <button type="button" class="det-rs-card" data-rs="true" aria-label="Yes">
            <svg width="38" height="38" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <path d="M7.5 18.5L14.5 25.5L28.5 10.5" stroke="#1CB0F6" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="det-rs-label">Yes</span>
          </button>
          <button type="button" class="det-rs-card" data-rs="false" aria-label="No">
            <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <path d="M9.5 9.5L26.5 26.5M26.5 9.5L9.5 26.5" stroke="#1CB0F6" stroke-width="4.8" stroke-linecap="round"/>
            </svg>
            <span class="det-rs-label">No</span>
          </button>
        </div>
      </div>
    `;
    const btns = Array.from(container.querySelectorAll('[data-rs]'));
    const choose = (val) => {
      if (locked) return;
      locked = true;
      selected = val;
      btns.forEach((b) => b.classList.toggle('selected', (b.dataset.rs === 'true') === val));
      onSubmitReady?.(true);
      if (onImmediateSubmit) {
        onImmediateSubmit(selected);
      }
    };
    btns.forEach((btn) => {
      btn.addEventListener('click', () => choose(btn.dataset.rs === 'true'));
    });
    const onKey = (e) => {
      if (locked) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = e.key.toLowerCase();
      if (k === 'y' || e.key === 'ArrowLeft') {
        e.preventDefault();
        choose(true);
      } else if (k === 'n' || e.key === 'ArrowRight') {
        e.preventDefault();
        choose(false);
      }
    };
    document.addEventListener('keydown', onKey);
    registerCleanup(() => document.removeEventListener('keydown', onKey));
    getAnswer = () => selected;
  }

  // 2. FILL IN THE BLANKS
  else if (type === 'fill_blanks') {
    const prefixStr = String(item.prefix || '');
    const missingLen = String(item.missing || '').length;
    const prefixCellsHtml = Array.from(prefixStr, (ch) =>
      `<span class="det-fb-cell prefix">${escapeHtml(ch)}</span>`
    ).join('');
    const blankCellsHtml = Array.from({ length: missingLen }, (_, i) =>
      `<input type="text" maxlength="2" class="det-fb-cell-input" data-fb-idx="${i}" inputmode="text" autocapitalize="none" autocorrect="off" autocomplete="off" spellcheck="false" aria-label="Letter ${i + 1}" />`
    ).join('');

    container.innerHTML = `
      <div class="det-fb-wrap">
        <h3 class="det-fb-prompt">Complete the sentence with the correct word</h3>
        <div class="det-fb-sentence">
          <span>${escapeHtml(item.before)}</span><span class="det-fb-word-strip">${prefixCellsHtml}${blankCellsHtml}</span><span>${escapeHtml(item.after)}</span>
        </div>
      </div>
    `;

    const boxes = wireSegmentedInputs(container, {
      requireAll: true,
      onSubmitReady,
      onEnterSubmit,
      registerCleanup
    });
    getAnswer = () => boxes.map((b) => b.value || '').join('');
  }

  // 3. READ AND COMPLETE
  else if (type === 'read_complete') {
    let blankIdx = 0;
    const htmlParts = (item.segments || []).map((seg) => {
      if (seg.missing) {
        const currentBlank = blankIdx++;
        const prefixCellsHtml = Array.from(String(seg.prefix || ''), (ch) =>
          `<span class="det-fb-cell prefix" data-rc-prefix="${currentBlank}">${escapeHtml(ch)}</span>`
        ).join('');
        const blankCellsHtml = Array.from({ length: seg.missing.length }, (_, i) =>
          `<input type="text" maxlength="2" class="det-fb-cell-input" data-rc-blank="${currentBlank}" data-rc-char="${i}" inputmode="text" autocapitalize="none" autocorrect="off" autocomplete="off" spellcheck="false" aria-label="Blank ${currentBlank + 1} letter ${i + 1}" />`
        ).join('');
        return `<span class="det-fb-word-strip">${prefixCellsHtml}${blankCellsHtml}</span>`;
      }
      return `<span>${escapeHtml(seg.text || '')}</span>`;
    }).join('');

    container.innerHTML = `
      <div class="det-fb-wrap">
        <h3 class="det-fb-prompt">Complete the text with the correct words</h3>
        ${item.title ? `<h4 class="det-rc-title">${escapeHtml(item.title)}</h4>` : ''}
        <div class="det-rc-passage">${htmlParts}</div>
      </div>
    `;

    wireSegmentedInputs(container, {
      requireAll: false,
      onSubmitReady,
      registerCleanup
    });

    getAnswer = () => {
      const blanksCount = blankIdx;
      const results = [];
      for (let b = 0; b < blanksCount; b++) {
        const chars = Array.from(container.querySelectorAll(`[data-rc-blank="${b}"]`)).map((el) => el.value || '');
        results.push(chars.join(''));
      }
      return results;
    };
  }

  // 4. LISTEN AND TYPE
  else if (type === 'listen_type') {
    let playsLeft = 3;
    let isPlaying = false;
    let disposed = false;
    container.innerHTML = `
      <h3 class="det-q-prompt">Type the statement that you hear</h3>
      <p class="det-q-hint">You can play the audio up to 3 times.</p>
      <div class="audio-box">
        <div style="display:flex;align-items:center;gap:14px;">
          <button type="button" id="lt-play-btn" class="audio-play-btn" title="Play audio">▶</button>
          <div>
            <div id="lt-status" style="font-weight:800;font-size:15px;">Play Sentence Audio</div>
            <div id="lt-plays-left" style="font-size:13px;color:var(--ink-muted);">Replays remaining: <strong>${playsLeft}</strong></div>
          </div>
        </div>
        <div id="lt-eq" class="eq-bars">
          <div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div>
        </div>
      </div>
      <textarea id="lt-input" class="det-textarea" style="min-height:110px;" placeholder="Type what you hear here..."></textarea>
    `;

    const playBtn = container.querySelector('#lt-play-btn');
    const statusLabel = container.querySelector('#lt-status');
    const playsLabel = container.querySelector('#lt-plays-left');
    const eq = container.querySelector('#lt-eq');
    const textarea = container.querySelector('#lt-input');

    const updatePlaysUi = () => {
      if (disposed) return;
      playsLabel.innerHTML = `Replays remaining: <strong>${playsLeft}</strong>`;
      playBtn.disabled = playsLeft <= 0 || isPlaying;
    };

    const playClip = () => {
      if (disposed || playsLeft <= 0 || isPlaying) return;
      let consumed = false;
      isPlaying = true;
      statusLabel.textContent = lang === 'uz' ? '⏳ Audio yuklanmoqda...' : '⏳ Starting audio...';
      updatePlaysUi();

      speakText(item.sentence, {
        rate: settings.ttsRate || 1.0,
        voiceName: settings.ttsVoice || '',
        onStart: () => {
          if (disposed) return;
          if (!consumed) {
            consumed = true;
            playsLeft = Math.max(0, playsLeft - 1);
          }
          statusLabel.textContent = lang === 'uz' ? '🔊 Eshiting va yozing...' : '🔊 Playing audio...';
          eq.classList.add('playing');
          updatePlaysUi();
        },
        onEnd: () => {
          if (disposed) return;
          isPlaying = false;
          eq.classList.remove('playing');
          statusLabel.textContent = 'Play Sentence Audio';
          updatePlaysUi();
        },
        onError: () => {
          if (disposed) return;
          isPlaying = false;
          eq.classList.remove('playing');
          statusLabel.textContent = lang === 'uz' ? '👆 Eshitish uchun ▶ tugmasini bosing' : '👆 Click ▶ to play audio';
          updatePlaysUi();
        }
      });
    };

    playBtn.addEventListener('click', () => {
      unlockSpeech();
      playClip();
    });
    const focusTimer = setTimeout(() => { if (!disposed) textarea.focus(); }, 60);
    const autoPlayTimer = setTimeout(() => playClip(), 200);
    registerCleanup(() => {
      disposed = true;
      clearTimeout(focusTimer);
      clearTimeout(autoPlayTimer);
      stopSpeaking();
    });
    getAnswer = () => textarea.value;
  }

  // 5. WRITE ABOUT THE PHOTO / INTERACTIVE WRITING / WRITING SAMPLE
  else if (type === 'write_photo' || type === 'writing_sample' || type === 'interactive_writing') {
    if (type === 'write_photo') {
      const scene = getSceneById(item.sceneId);
      container.innerHTML = `
        <h3 class="det-q-prompt">${lang === 'uz' ? 'Rasmni tasvirlab yozing' : 'Write a description of the image below'}</h3>
        <p class="det-q-hint">${lang === 'uz' ? 'Kamida 2–3 ta aniq va boy gap yozishga harakat qiling (1 daqiqa).' : 'Aim for 2–4 detailed sentences describing people, actions, and setting.'}</p>
        <div class="photo-split">
          <div class="scene-frame">${scene.svg}</div>
          <div>
            <textarea id="wr-text" class="det-textarea" style="min-height:245px;" placeholder="${lang === 'uz' ? 'Tasvirni ingliz tilida yozing...' : 'Describe the image in English...'}"></textarea>
            <div class="word-counter">
              <span id="wr-wc">0 ${lang === 'uz' ? 'so‘z' : 'words'}</span>
              <span>${lang === 'uz' ? 'Tavsiya: 35–70 so‘z' : 'Target: 35–70 words'}</span>
            </div>
          </div>
        </div>
      `;
      const ta = container.querySelector('#wr-text');
      const wc = container.querySelector('#wr-wc');
      ta.addEventListener('input', () => {
        wc.textContent = `${countWords(ta.value)} ${lang === 'uz' ? 'so‘z' : 'words'}`;
      });
      setTimeout(() => ta.focus(), 50);
      getAnswer = () => ta.value;
    } else if (type === 'writing_sample') {
      container.innerHTML = `
        <h3 class="det-q-prompt">${lang === 'uz' ? 'Yozma namuna (Writing Sample)' : 'Writing Sample'}</h3>
        <div class="card" style="background:var(--bg);margin-bottom:16px;padding:16px 20px;">
          <div style="font-size:16.5px;font-weight:700;line-height:1.55;">${escapeHtml(item.prompt)}</div>
        </div>
        <textarea id="wr-text" class="det-textarea" style="min-height:230px;" placeholder="${lang === 'uz' ? 'Fikringizni kirish, asosiy qism va xulosa bilan yozing...' : 'Write your structured essay response here...'}"></textarea>
        <div class="word-counter">
          <span id="wr-wc">0 ${lang === 'uz' ? 'so‘z' : 'words'}</span>
          <span>${lang === 'uz' ? 'Tavsiya: 120+ so‘z' : 'Target: 120+ words'}</span>
        </div>
      `;
      const ta = container.querySelector('#wr-text');
      const wc = container.querySelector('#wr-wc');
      ta.addEventListener('input', () => {
        wc.textContent = `${countWords(ta.value)} ${lang === 'uz' ? 'so‘z' : 'words'}`;
      });
      setTimeout(() => ta.focus(), 50);
      getAnswer = () => ta.value;
    } else {
      // Interactive Writing: 2 parts
      let part = 1;
      let part1Text = '';
      let part2Text = '';

      const renderIW = () => {
        if (part === 1) {
          container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span class="tag tag-writing">Part 1 of 2 (5 min)</span>
            </div>
            <h3 class="det-q-prompt">${lang === 'uz' ? 'Asosiy savolga yozma javob bering' : 'Write a response to the prompt'}</h3>
            <div class="card" style="background:var(--bg);margin-bottom:14px;padding:15px 18px;">
              <div style="font-weight:700;">${escapeHtml(item.part1Prompt)}</div>
            </div>
            <textarea id="iw-text" class="det-textarea" placeholder="${lang === 'uz' ? 'Javobingizni yozing...' : 'Write your response...'}">${escapeHtml(part1Text)}</textarea>
            <div class="word-counter">
              <span id="iw-wc">${countWords(part1Text)} ${lang === 'uz' ? 'so‘z' : 'words'}</span>
              <button type="button" id="iw-next-part" class="btn btn-soft btn-sm">${lang === 'uz' ? '2-qismga o‘tish →' : 'Continue to Part 2 →'}</button>
            </div>
          `;
          const ta = container.querySelector('#iw-text');
          const wc = container.querySelector('#iw-wc');
          ta.addEventListener('input', () => {
            part1Text = ta.value;
            wc.textContent = `${countWords(part1Text)} ${lang === 'uz' ? 'so‘z' : 'words'}`;
          });
          container.querySelector('#iw-next-part').addEventListener('click', () => {
            part1Text = ta.value;
            part = 2;
            renderIW();
          });
          setTimeout(() => ta.focus(), 40);
        } else {
          container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span class="tag tag-writing">Part 2 of 2 — Follow-up (3 min)</span>
              <button type="button" id="iw-back-part" class="btn btn-secondary btn-sm">${lang === 'uz' ? '← 1-qismni ko‘rish' : '← View Part 1'}</button>
            </div>
            <div class="card" style="background:var(--bg);margin-bottom:14px;padding:15px 18px;">
              <div style="font-size:12px;font-weight:800;color:var(--ink-muted);margin-bottom:4px;">FOLLOW-UP PROMPT</div>
              <div style="font-weight:700;">${escapeHtml(item.part2Prompt)}</div>
            </div>
            <textarea id="iw-text2" class="det-textarea" placeholder="${lang === 'uz' ? 'Qo‘shimcha savolga javob bering...' : 'Write your follow-up response...'}">${escapeHtml(part2Text)}</textarea>
            <div class="word-counter">
              <span id="iw-wc2">${countWords(part2Text)} ${lang === 'uz' ? 'so‘z' : 'words'}</span>
              <span>${lang === 'uz' ? '1-qism:' : 'Part 1:'} ${countWords(part1Text)} ${lang === 'uz' ? 'so‘z' : 'words'}</span>
            </div>
          `;
          const ta2 = container.querySelector('#iw-text2');
          const wc2 = container.querySelector('#iw-wc2');
          ta2.addEventListener('input', () => {
            part2Text = ta2.value;
            wc2.textContent = `${countWords(part2Text)} ${lang === 'uz' ? 'so‘z' : 'words'}`;
          });
          container.querySelector('#iw-back-part').addEventListener('click', () => {
            part2Text = ta2.value;
            part = 1;
            renderIW();
          });
          setTimeout(() => ta2.focus(), 40);
        }
      };
      renderIW();
      getAnswer = () => ({ part1Text, part2Text, combined: `Part 1:\n${part1Text}\n\nPart 2 Follow-up:\n${part2Text}` });
    }
  }

  // 6. INTERACTIVE READING (6 stages)
  else if (type === 'interactive_reading') {
    let stage = 1; // 1..6
    const answers = {
      stage1: new Array(item.stage1.blanks.length).fill(''),
      stage2: '',
      stage3a: undefined,
      stage3b: undefined,
      stage4: '',
      stage5: ''
    };

    const renderIR = () => {
      let leftHtml = '';
      let rightHtml = '';

      if (stage === 1) {
        const parts = item.stage1.paragraphParts;
        const blanks = item.stage1.blanks;
        leftHtml = parts.map((txt, idx) => {
          let html = `<span>${escapeHtml(txt)}</span>`;
          if (idx < blanks.length) {
            const b = blanks[idx];
            const opts = b.options.map((opt) =>
              `<option value="${escapeHtml(opt)}" ${answers.stage1[idx] === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`
            ).join('');
            html += `<select class="ir-blank-select" data-ir-b="${idx}"><option value="">(${idx + 1}) ---</option>${opts}</select>`;
          }
          return html;
        }).join('');
        rightHtml = `
          <span class="tag tag-reading">Task 1 of 6</span>
          <h4 style="margin:10px 0 8px;">Complete the Sentences</h4>
          <p class="det-q-hint">${lang === 'uz' ? 'Matndagi har bir bo‘shliq uchun eng mos so‘zni tanlang.' : 'Select the best word for each blank inside the passage.'}</p>
        `;
      } else if (stage === 2) {
        leftHtml = `
          <p>${escapeHtml(item.stage2.before)}</p>
          <p style="padding:10px 14px;border:2px dashed var(--accent);border-radius:10px;background:var(--accent-soft);font-weight:700;">
            ${answers.stage2 ? escapeHtml(answers.stage2) : (lang === 'uz' ? '[ Bu yerga mos gapni o‘ng tomondan tanlang ]' : '[ Select the missing sentence from the right ]')}
          </p>
          <p>${escapeHtml(item.stage2.after)}</p>
        `;
        rightHtml = `
          <span class="tag tag-reading">Task 2 of 6</span>
          <h4 style="margin:10px 0 8px;">Complete the Passage</h4>
          <p class="det-q-hint">${lang === 'uz' ? 'Ajratilgan joyga mantiqan mos keladigan gapni tanlang.' : 'Select the best sentence to fill the highlighted gap.'}</p>
          ${item.stage2.options.map((opt, idx) => `
            <button type="button" class="ir-option-card ${answers.stage2 === opt ? 'selected' : ''}" data-ir-opt="${idx}">${escapeHtml(opt)}</button>
          `).join('')}
        `;
      } else if (stage === 3 || stage === 4) {
        const key = stage === 3 ? 'stage3a' : 'stage3b';
        const qObj = item[key];
        leftHtml = item.fullSentences.map((s, idx) => `
          <span class="ir-sentence clickable ${answers[key] === idx ? 'highlighted' : ''}" data-ir-sent="${idx}">${escapeHtml(s)} </span>
        `).join('');
        rightHtml = `
          <span class="tag tag-reading">Task ${stage} of 6</span>
          <h4 style="margin:10px 0 8px;">Highlight the Answer</h4>
          <p style="font-weight:700;margin-bottom:10px;">${escapeHtml(qObj.question)}</p>
          <p class="det-q-hint">${lang === 'uz' ? 'Chap tomondagi matndan javob beruvchi gapni bosing.' : 'Click the sentence in the passage on the left that answers the question.'}</p>
          <div class="stat-chip">${answers[key] !== undefined ? `Selected: Sentence #${answers[key] + 1}` : 'No sentence selected yet'}</div>
        `;
      } else if (stage === 5) {
        leftHtml = item.fullSentences.map((s) => `<span>${escapeHtml(s)} </span>`).join('');
        rightHtml = `
          <span class="tag tag-reading">Task 5 of 6</span>
          <h4 style="margin:10px 0 8px;">Identify the Idea</h4>
          <p style="font-weight:700;margin-bottom:12px;">${escapeHtml(item.stage4.question)}</p>
          ${item.stage4.options.map((opt, idx) => `
            <button type="button" class="ir-option-card ${answers.stage4 === opt ? 'selected' : ''}" data-ir-opt="${idx}">${escapeHtml(opt)}</button>
          `).join('')}
        `;
      } else {
        leftHtml = item.fullSentences.map((s) => `<span>${escapeHtml(s)} </span>`).join('');
        rightHtml = `
          <span class="tag tag-reading">Task 6 of 6</span>
          <h4 style="margin:10px 0 8px;">Title the Passage</h4>
          <p class="det-q-hint">${lang === 'uz' ? 'Matn uchun eng mos sarlavhani tanlang.' : 'Select the best title for the passage.'}</p>
          ${item.stage5.options.map((opt, idx) => `
            <button type="button" class="ir-option-card ${answers.stage5 === opt ? 'selected' : ''}" data-ir-opt="${idx}">${escapeHtml(opt)}</button>
          `).join('')}
        `;
      }

      container.innerHTML = `
        <h3 class="det-q-prompt" style="margin-bottom:14px;">Interactive Reading — ${escapeHtml(item.title || '')}</h3>
        <div class="ir-split">
          <div class="ir-passage-box">${leftHtml}</div>
          <div>
            ${rightHtml}
            <div style="display:flex;justify-content:space-between;gap:10px;margin-top:16px;">
              <button type="button" id="ir-prev" class="btn btn-secondary btn-sm" ${stage === 1 ? 'disabled' : ''}>← ${lang === 'uz' ? 'Oldingi' : 'Prev'}</button>
              ${stage < 6 ? `<button type="button" id="ir-next" class="btn btn-primary btn-sm">${lang === 'uz' ? 'Keyingi qism' : 'Next Part'} →</button>` : `<span class="tag tag-ai">${lang === 'uz' ? 'Oxirgi bosqich — yuborishga tayyor' : 'Final step — ready to submit'}</span>`}
            </div>
          </div>
        </div>
      `;

      container.querySelectorAll('[data-ir-b]').forEach((sel) => {
        sel.addEventListener('change', () => {
          answers.stage1[Number(sel.dataset.irB)] = sel.value;
        });
      });

      container.querySelectorAll('[data-ir-opt]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.irOpt);
          if (stage === 2) answers.stage2 = item.stage2.options[idx];
          if (stage === 5) answers.stage4 = item.stage4.options[idx];
          if (stage === 6) answers.stage5 = item.stage5.options[idx];
          renderIR();
        });
      });

      container.querySelectorAll('[data-ir-sent]').forEach((span) => {
        span.addEventListener('click', () => {
          const idx = Number(span.dataset.irSent);
          if (stage === 3) answers.stage3a = idx;
          if (stage === 4) answers.stage3b = idx;
          renderIR();
        });
      });

      container.querySelector('#ir-prev')?.addEventListener('click', () => {
        if (stage > 1) { stage -= 1; renderIR(); }
      });
      container.querySelector('#ir-next')?.addEventListener('click', () => {
        if (stage < 6) { stage += 1; renderIR(); }
      });
    };

    renderIR();
    getAnswer = () => answers;
  }

  // 7. INTERACTIVE LISTENING
  else if (type === 'interactive_listening') {
    let turnIdx = 0;
    const turnChoices = [];
    let summaryText = '';
    let playsCurrent = 0;
    let disposed = false;
    let activeAutoTimer = null;
    let invalidateTurn = () => {};

    const renderIL = () => {
      if (disposed) return;
      if (activeAutoTimer) {
        clearTimeout(activeAutoTimer);
        activeAutoTimer = null;
      }
      invalidateTurn();

      const turns = item.turns || [];
      const inSummary = turnIdx >= turns.length;

      const historyBubbles = turns.slice(0, Math.min(turnIdx + (inSummary ? 0 : 1), turns.length)).map((tItem, idx) => {
        const chosen = turnChoices[idx];
        const peerLine = idx < turnIdx || inSummary
          ? escapeHtml(tItem.audioText)
          : (lang === 'uz' ? '🔊 Audioni tinglang va mos javobni tanlang' : '🔊 Listen to the audio clip and choose the best response');
        return `
          <div class="il-bubble peer">
            <div class="il-speaker-label">${escapeHtml(item.peerName || 'Speaker')}</div>
            <div>${peerLine}</div>
          </div>
          ${chosen ? `
            <div class="il-bubble you">
              <div class="il-speaker-label">${lang === 'uz' ? 'Siz' : 'You'}</div>
              <div>${escapeHtml(chosen)}</div>
            </div>
          ` : ''}
        `;
      }).join('');

      if (!inSummary) {
        const currentTurn = turns[turnIdx];
        container.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span class="tag tag-listening">Turn ${turnIdx + 1} of ${turns.length}</span>
          </div>
          <h3 class="det-q-prompt">Interactive Listening</h3>
          <p class="det-q-hint">${escapeHtml(item.scenario)}</p>
          <div class="il-chat" id="il-chat">${historyBubbles}</div>
          <div class="audio-box" style="padding:14px 18px;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <button type="button" id="il-play" class="audio-play-btn" style="width:44px;height:44px;font-size:18px;">▶</button>
              <div>
                <div id="il-status" style="font-weight:700;font-size:14px;">${lang === 'uz' ? 'Suhbatdosh gapini eshitish' : 'Play conversation turn'}</div>
                <div id="il-plays" style="font-size:12px;color:var(--ink-muted);">Replays: <strong>${2 - playsCurrent}</strong></div>
              </div>
            </div>
            <div id="il-eq" class="eq-bars"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>
          </div>
          <div>
            ${currentTurn.options.map((opt, i) => `
              <button type="button" class="ir-option-card ${turnChoices[turnIdx] === opt ? 'selected' : ''}" data-il-opt="${i}">${escapeHtml(opt)}</button>
            `).join('')}
          </div>
        `;

        const playBtn = container.querySelector('#il-play');
        const statusEl = container.querySelector('#il-status');
        const playsEl = container.querySelector('#il-plays');
        const eq = container.querySelector('#il-eq');
        let isTurnPlaying = false;
        let turnDisposed = false;
        invalidateTurn = () => { turnDisposed = true; };

        const syncTurnUi = () => {
          if (disposed || turnDisposed) return;
          const left = Math.max(0, 2 - playsCurrent);
          playsEl.innerHTML = `Replays: <strong>${left}</strong>`;
          playBtn.disabled = left <= 0 || isTurnPlaying;
        };

        const playTurn = () => {
          if (disposed || turnDisposed || playsCurrent >= 2 || isTurnPlaying) return;
          let consumed = false;
          isTurnPlaying = true;
          statusEl.textContent = lang === 'uz' ? '⏳ Audio yuklanmoqda...' : '⏳ Starting audio...';
          syncTurnUi();

          speakText(currentTurn.audioText, {
            rate: settings.ttsRate || 1.0,
            voiceName: settings.ttsVoice || '',
            onStart: () => {
              if (disposed || turnDisposed) return;
              if (!consumed) {
                consumed = true;
                playsCurrent += 1;
              }
              statusEl.textContent = lang === 'uz' ? '🔊 Eshiting...' : '🔊 Playing audio...';
              eq.classList.add('playing');
              syncTurnUi();
            },
            onEnd: () => {
              if (disposed || turnDisposed) return;
              isTurnPlaying = false;
              eq.classList.remove('playing');
              statusEl.textContent = lang === 'uz' ? 'Suhbatdosh gapini eshitish' : 'Play conversation turn';
              syncTurnUi();
            },
            onError: () => {
              if (disposed || turnDisposed) return;
              isTurnPlaying = false;
              eq.classList.remove('playing');
              statusEl.textContent = lang === 'uz' ? '👆 Eshitish uchun ▶ tugmasini bosing' : '👆 Click ▶ to play audio';
              syncTurnUi();
            }
          });
        };
        playBtn.addEventListener('click', () => {
          unlockSpeech();
          playTurn();
        });
        activeAutoTimer = setTimeout(() => playTurn(), 160);

        container.querySelectorAll('[data-il-opt]').forEach((btn) => {
          btn.addEventListener('click', () => {
            turnDisposed = true;
            if (activeAutoTimer) {
              clearTimeout(activeAutoTimer);
              activeAutoTimer = null;
            }
            unlockSpeech();
            stopSpeaking();
            turnChoices[turnIdx] = currentTurn.options[Number(btn.dataset.ilOpt)];
            turnIdx += 1;
            playsCurrent = 0;
            renderIL();
          });
        });
      } else {
        invalidateTurn = () => {};
        container.innerHTML = `
          <span class="tag tag-writing">Final Step — Summarize (75s)</span>
          <h3 class="det-q-prompt" style="margin-top:8px;">Summarize the Conversation</h3>
          <p class="det-q-hint">${escapeHtml(item.summaryPrompt)}</p>
          <div class="il-chat" style="max-height:200px;">${historyBubbles}</div>
          <textarea id="il-summary" class="det-textarea" style="min-height:130px;" placeholder="${lang === 'uz' ? 'Suhbat mazmunini qisqacha yozing...' : 'Summarize what was discussed and decided...'}">${escapeHtml(summaryText)}</textarea>
          <div class="word-counter"><span id="il-wc">${countWords(summaryText)} words</span></div>
        `;
        const ta = container.querySelector('#il-summary');
        const wc = container.querySelector('#il-wc');
        ta.addEventListener('input', () => {
          summaryText = ta.value;
          wc.textContent = `${countWords(summaryText)} words`;
        });
        setTimeout(() => { if (!disposed) ta.focus(); }, 40);
      }
    };

    renderIL();
    registerCleanup(() => {
      disposed = true;
      invalidateTurn();
      if (activeAutoTimer) {
        clearTimeout(activeAutoTimer);
        activeAutoTimer = null;
      }
      stopSpeaking();
    });
    getAnswer = () => ({ turnChoices, summaryText });
  }

  // 8. SPEAKING TASKS (read_aloud, speak_photo, read_then_speak, speaking_sample)
  else if (['read_aloud', 'speak_photo', 'read_then_speak', 'speaking_sample'].includes(type)) {
    const recorder = new AudioRecorder();
    let prepRemaining = item.prepSec ?? (type === 'speak_photo' || type === 'read_then_speak' ? 20 : type === 'speaking_sample' ? 30 : 0);
    let phase = prepRemaining > 0 ? 'prep' : 'ready';
    let prepInterval = null;
    let recordingResult = null;
    let micError = '';
    let disposed = false;

    const scene = type === 'speak_photo' ? getSceneById(item.sceneId) : null;

    let promptBlock = '';
    if (type === 'read_aloud') {
      promptBlock = `
        <h3 class="det-q-prompt">${lang === 'uz' ? 'Gapni ovoz chiqarib o‘qing' : 'Speak this sentence aloud'}</h3>
        <div class="card" style="background:var(--bg);padding:24px;margin:14px 0;font-size:20px;font-weight:700;line-height:1.55;">
          “${escapeHtml(item.sentence)}”
        </div>
      `;
    } else if (type === 'speak_photo') {
      promptBlock = `
        <h3 class="det-q-prompt">${lang === 'uz' ? 'Rasm haqida og‘zaki gapiring' : 'Speak about the image below'}</h3>
        <div class="photo-split" style="margin-bottom:16px;">
          <div class="scene-frame">${scene.svg}</div>
          <div class="card" style="background:var(--bg);">
            <div style="font-weight:700;margin-bottom:8px;">${escapeHtml(item.prompt)}</div>
            <p class="det-q-hint" style="margin:0;">${lang === 'uz' ? 'Kamida 30 soniya, iloji boricha 60–90 soniya gapiring.' : 'Speak for at least 30 seconds (up to 90 seconds).'}</p>
          </div>
        </div>
      `;
    } else if (type === 'read_then_speak') {
      promptBlock = `
        <h3 class="det-q-prompt">Read, Then Speak</h3>
        <div class="card" style="background:var(--bg);margin-bottom:16px;padding:18px 22px;">
          <div style="font-size:17px;font-weight:800;margin-bottom:10px;">${escapeHtml(item.prompt)}</div>
          <ul style="margin:0;padding-left:20px;color:var(--ink-muted);">
            ${(item.bullets || []).map((b) => `<li style="margin-bottom:4px;">${escapeHtml(b)}</li>`).join('')}
          </ul>
        </div>
      `;
    } else {
      promptBlock = `
        <h3 class="det-q-prompt">Speaking Sample</h3>
        <div class="card" style="background:var(--bg);margin-bottom:16px;padding:18px 22px;">
          <div style="font-size:17px;font-weight:800;">${escapeHtml(item.prompt)}</div>
        </div>
      `;
    }

    container.innerHTML = `
      ${promptBlock}
      <div id="spk-box" class="record-box"></div>
    `;
    const box = container.querySelector('#spk-box');

    const startRecording = async () => {
      if (disposed || phase === 'recording') return;
      if (prepInterval) { clearInterval(prepInterval); prepInterval = null; }
      phase = 'recording';
      micError = '';
      onRecordingStart?.();
      renderRecorderBox();
      try {
        await recorder.start({
          onLevel: (lvl) => {
            if (disposed) return;
            const fill = box.querySelector('#mic-fill');
            if (fill) fill.style.width = `${lvl}%`;
          },
          onTranscript: (tr) => {
            if (disposed) return;
            const prev = box.querySelector('#live-tr');
            if (prev) prev.textContent = tr || '...';
          }
        });
        if (disposed) {
          recorder.abort();
          return;
        }
      } catch (err) {
        if (disposed) return;
        micError = err?.message || 'Microphone access blocked.';
        phase = 'fallback';
        renderRecorderBox();
      }
    };

    const stopRecording = async () => {
      if (disposed || !recorder.isRecording) return;
      recordingResult = await recorder.stop();
      if (disposed) return;
      phase = 'recorded';
      renderRecorderBox();
    };

    const renderRecorderBox = () => {
      if (phase === 'prep') {
        box.innerHTML = `
          <div style="font-size:15px;font-weight:800;margin-bottom:8px;">
            ⏳ ${lang === 'uz' ? 'Tayyorgarlik vaqti:' : 'Preparation time:'} <span id="prep-sec">${prepRemaining}s</span>
          </div>
          <p class="det-q-hint" style="margin-bottom:12px;">${lang === 'uz' ? 'Fikrlaringizni jamlang, vaqt tugagach mikrofon avtomatik yoqiladi.' : 'Review the prompt. Recording starts automatically when preparation ends.'}</p>
          <button type="button" id="spk-start-now" class="btn btn-primary btn-sm">🎙️ ${lang === 'uz' ? 'Hoziroq yozishni boshlash' : 'Start Recording Now'}</button>
        `;
        box.querySelector('#spk-start-now')?.addEventListener('click', startRecording);
      } else if (phase === 'ready') {
        box.innerHTML = `
          <p class="det-q-hint" style="margin-bottom:12px;">${lang === 'uz' ? 'Tayyor bo‘lgach mikrofon tugmasini bosing.' : 'Press Record when ready to read aloud.'}</p>
          <button type="button" id="spk-start-btn" class="btn btn-primary">🎙️ ${lang === 'uz' ? 'Yozishni boshlash' : 'Record Now'}</button>
        `;
        box.querySelector('#spk-start-btn')?.addEventListener('click', startRecording);
      } else if (phase === 'recording') {
        box.innerHTML = `
          <div style="font-weight:800;font-size:15px;"><span class="rec-dot"></span> ${lang === 'uz' ? 'Ovoz yozilmoqda...' : 'Recording in progress...'}</div>
          <div class="mic-meter-wrap"><div id="mic-fill" class="mic-meter-fill"></div></div>
          <button type="button" id="spk-stop-btn" class="btn btn-danger btn-sm">⏹ ${lang === 'uz' ? 'Yozishni to‘xtatish' : 'Stop Recording'}</button>
          <div class="transcript-preview" id="live-tr">${lang === 'uz' ? 'Jonli nutq matni (brauzer qo‘llab-quvvatlasa shu yerda chiqadi)...' : 'Listening for speech...'}</div>
        `;
        box.querySelector('#spk-stop-btn')?.addEventListener('click', stopRecording);
      } else if (phase === 'recorded') {
        box.innerHTML = `
          <div style="font-weight:800;color:#187A38;margin-bottom:10px;">✓ ${lang === 'uz' ? 'Ovoz yozib olindi' : 'Audio recorded'} (${recordingResult.durationSec}s)</div>
          ${recordingResult.objectUrl ? `<audio controls src="${recordingResult.objectUrl}" style="width:100%;max-width:420px;margin-bottom:10px;"></audio>` : ''}
          ${recordingResult.liveTranscript ? `<div class="transcript-preview"><strong>Transcript:</strong> ${escapeHtml(recordingResult.liveTranscript)}</div>` : ''}
        `;
      } else {
        box.innerHTML = `
          <div class="banner banner-warn" style="margin-bottom:10px;text-align:left;">
            <div><strong>${lang === 'uz' ? 'Mikrofon ishlamadi:' : 'Microphone unavailable:'}</strong> ${escapeHtml(micError)}</div>
          </div>
          <textarea id="spk-fallback-text" class="det-textarea" style="min-height:110px;" placeholder="${lang === 'uz' ? 'Mikrofonsiz test qilish uchun javobingizni matn ko‘rinishida yozib ko‘rishingiz mumkin...' : 'Fallback: type what you would say to test evaluation...'}"></textarea>
        `;
      }
    };

    renderRecorderBox();

    if (phase === 'prep') {
      prepInterval = setInterval(() => {
        prepRemaining -= 1;
        const el = box.querySelector('#prep-sec');
        if (el) el.textContent = `${prepRemaining}s`;
        if (prepRemaining <= 0) {
          startRecording();
        }
      }, 1000);
    }

    registerCleanup(() => {
      disposed = true;
      if (prepInterval) clearInterval(prepInterval);
      recorder.abort();
    });

    getAnswer = async () => {
      if (recorder.isRecording) {
        recordingResult = await recorder.stop();
      }
      if (phase === 'fallback') {
        const fb = box.querySelector('#spk-fallback-text')?.value || '';
        const fbWords = countWords(fb);
        const estSec = fbWords > 0 ? Math.max(8, Math.min(180, Math.round((fbWords / 130) * 60))) : 0;
        return { base64: '', mimeType: '', durationSec: estSec, liveTranscript: fb, objectUrl: '' };
      }
      return recordingResult || { base64: '', mimeType: '', durationSec: 0, liveTranscript: '', objectUrl: '' };
    };
  }

  // 9. INTERACTIVE SPEAKING (6-turn audio-only interview, 35s/turn, 1 play only)
  else if (type === 'interactive_speaking') {
    const turns = Array.isArray(item.turns) && item.turns.length > 0
      ? item.turns
      : [{ audioText: 'Tell me about a skill or topic you enjoy learning about and why it matters to you.' }];
    const turnDurationSec = item.turnDurationSec || 35;
    const recorder = new AudioRecorder();

    let turnIdx = 0;
    let phase = 'listening'; // 'listening' | 'blocked' | 'recording' | 'fallback' | 'done'
    let turnRemaining = turnDurationSec;
    let turnTimerId = null;
    let autoPlayTimer = null;
    let audioRetryAllowed = false;
    let disposed = false;
    let finishingTurn = false;
    const turnAnswers = [];

    const clearTurnTimers = () => {
      if (turnTimerId) { clearInterval(turnTimerId); turnTimerId = null; }
      if (autoPlayTimer) { clearTimeout(autoPlayTimer); autoPlayTimer = null; }
    };

    const renderIS = () => {
      if (disposed) return;

      if (phase === 'done' || turnIdx >= turns.length) {
        onSubmitReady?.(true);
        const answeredCount = turnAnswers.filter((a) => a.durationSec > 0 || a.transcript).length;
        container.innerHTML = `
          <div class="det-is-wrap">
            <div class="det-is-complete-card">
              <div class="det-is-badge-ok">✓</div>
              <h3 class="det-q-prompt" style="margin:0 0 6px;">${lang === 'uz' ? 'Suhbat yakunlandi!' : 'Interactive Speaking Complete!'}</h3>
              <p class="det-q-hint" style="margin:0 0 14px;">
                ${lang === 'uz'
                  ? `${answeredCount}/${turns.length} ta suhbat savoliga javob yozib olindi. Natijani ko‘rish uchun javobni yuboring.`
                  : `Recorded responses for ${answeredCount}/${turns.length} interview questions. Submit to see your DET evaluation.`}
              </p>
              <div class="det-is-dots">
                ${turns.map((_, idx) => `<span class="det-is-dot ${idx < turnAnswers.length ? 'done' : ''}">${idx + 1}</span>`).join('')}
              </div>
            </div>
          </div>
        `;
        return;
      }

      onSubmitReady?.(false);
      const speakerSvg = `
        <div class="det-is-avatar-ring ${phase === 'listening' ? 'speaking' : ''}">
          <div class="det-is-avatar">
            <svg width="42" height="42" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <circle cx="24" cy="17" r="7.5" fill="#1CB0F6"/>
              <path d="M11 39C11 32 16.5 27.5 24 27.5C31.5 27.5 37 32 37 39" fill="#1CB0F6"/>
            </svg>
          </div>
        </div>
      `;

      let stageBody = '';
      if (phase === 'listening') {
        stageBody = `
          <div class="det-is-status-title">${lang === 'uz' ? 'Savolni diqqat bilan tinglang...' : 'Listen carefully to the question...'}</div>
          <p class="det-q-hint" style="margin:0;">${lang === 'uz' ? 'Audio faqat 1 marta chalinadi. Tugashi bilan mikrofon avtomatik yoqiladi.' : 'Each question plays once. Your microphone starts automatically afterward.'}</p>
        `;
      } else if (phase === 'blocked') {
        stageBody = `
          <div class="det-is-status-title">${lang === 'uz' ? 'Savolni eshitish uchun bosing' : 'Click to hear the question'}</div>
          <p class="det-q-hint" style="margin:0 0 12px;">${lang === 'uz' ? 'Har bir savol faqat 1 marta eshitiladi.' : 'Audio plays once per question.'}</p>
          <button type="button" id="is-play-once" class="btn btn-primary btn-sm">▶ ${lang === 'uz' ? 'Savolni eshitish (1x)' : 'Play Question (1x)'}</button>
        `;
      } else if (phase === 'recording') {
        stageBody = `
          <div class="det-is-rec-row">
            <span class="rec-dot"></span>
            <span>${lang === 'uz' ? 'Javob yozilmoqda...' : 'Recording your answer...'}</span>
            <span class="det-is-turn-timer" id="is-turn-sec">${turnRemaining}s</span>
          </div>
          <div class="mic-meter-wrap" style="max-width:420px;margin:10px auto;"><div id="is-mic-fill" class="mic-meter-fill"></div></div>
          <button type="button" id="is-finish-turn" class="btn btn-primary btn-sm">⏹ ${turnIdx < turns.length - 1 ? (lang === 'uz' ? 'Javobni tugatib keyingisiga o‘tish →' : 'Done & Next Question →') : (lang === 'uz' ? 'Suhbatni yakunlash ✓' : 'Finish Interview ✓')}</button>
          <div class="transcript-preview" id="is-live-tr">${lang === 'uz' ? 'Jonli nutq matni (brauzer qo‘llab-quvvatlasa)...' : 'Listening for speech...'}</div>
        `;
      } else if (phase === 'fallback') {
        stageBody = `
          <div class="banner banner-warn" style="margin-bottom:10px;text-align:left;">
            <span>${lang === 'uz' ? 'Mikrofon topilmadi — ushbu savolga javobingizni qisqacha matn bilan yozib davom etishingiz mumkin:' : 'Microphone unavailable — type what you would say for this turn:'}</span>
          </div>
          <textarea id="is-fallback-text" class="det-textarea" style="min-height:95px;" placeholder="${lang === 'uz' ? 'Javobingizni ingliz tilida yozing...' : 'Type your response in English...'}"></textarea>
          <div style="margin-top:10px;display:flex;justify-content:flex-end;">
            <button type="button" id="is-fallback-next" class="btn btn-primary btn-sm">${turnIdx < turns.length - 1 ? (lang === 'uz' ? 'Keyingi savol →' : 'Next Question →') : (lang === 'uz' ? 'Yakunlash ✓' : 'Finish ✓')}</button>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="det-is-wrap">
          <div class="det-is-top">
            <span class="tag tag-speaking">Question ${turnIdx + 1} of ${turns.length}</span>
            ${item.topicTitle ? `<span class="tag">${escapeHtml(item.topicTitle)}</span>` : ''}
            <span class="det-is-dots-inline">
              ${turns.map((_, idx) => `<span class="det-is-pip ${idx < turnIdx ? 'done' : idx === turnIdx ? 'active' : ''}"></span>`).join('')}
            </span>
          </div>
          <h3 class="det-q-prompt" style="margin-bottom:6px;">Interactive Speaking</h3>
          <p class="det-q-hint" style="margin-bottom:14px;">${escapeHtml(item.scenario || (lang === 'uz' ? 'Savolni tinglang va 35 soniya ichida javob bering.' : 'Listen to each prompt once and respond within 35 seconds.'))}</p>
          <div class="det-is-stage">
            ${speakerSvg}
            <div class="det-is-name">${escapeHtml(item.interviewerName || 'Interviewer')}</div>
            <div class="det-is-body">${stageBody}</div>
          </div>
        </div>
      `;

      if (phase === 'blocked') {
        container.querySelector('#is-play-once')?.addEventListener('click', () => {
          unlockSpeech();
          playCurrentPrompt();
        });
      } else if (phase === 'recording') {
        container.querySelector('#is-finish-turn')?.addEventListener('click', () => finishCurrentTurn());
      } else if (phase === 'fallback') {
        container.querySelector('#is-fallback-next')?.addEventListener('click', () => submitFallbackTurn());
      }
    };

    const startTurnRecording = async () => {
      if (disposed || phase === 'recording' || phase === 'done') return;
      clearTurnTimers();
      phase = 'recording';
      turnRemaining = turnDurationSec;
      renderIS();

      try {
        await recorder.start({
          onLevel: (lvl) => {
            if (disposed) return;
            const fill = container.querySelector('#is-mic-fill');
            if (fill) fill.style.width = `${lvl}%`;
          },
          onTranscript: (tr) => {
            if (disposed) return;
            const el = container.querySelector('#is-live-tr');
            if (el) el.textContent = tr || '...';
          }
        });
        if (disposed) {
          recorder.abort();
          return;
        }
        turnTimerId = setInterval(() => {
          if (disposed || phase !== 'recording') return;
          turnRemaining -= 1;
          const secEl = container.querySelector('#is-turn-sec');
          if (secEl) secEl.textContent = `${Math.max(0, turnRemaining)}s`;
          if (turnRemaining <= 0) {
            finishCurrentTurn();
          }
        }, 1000);
      } catch {
        if (disposed) return;
        phase = 'fallback';
        renderIS();
      }
    };

    const advanceAfterTurn = () => {
      turnIdx += 1;
      finishingTurn = false;
      if (turnIdx >= turns.length) {
        phase = 'done';
        renderIS();
      } else {
        phase = 'listening';
        renderIS();
        autoPlayTimer = setTimeout(() => playCurrentPrompt(), 220);
      }
    };

    const finishCurrentTurn = async () => {
      if (disposed || finishingTurn || phase !== 'recording') return;
      finishingTurn = true;
      clearTurnTimers();

      const currentTurn = turns[turnIdx];
      let res = null;
      if (recorder.isRecording) {
        res = await recorder.stop();
      }
      if (disposed) return;

      turnAnswers.push({
        question: currentTurn.audioText,
        transcript: res?.liveTranscript || '',
        durationSec: res?.durationSec || 0,
        objectUrl: res?.objectUrl || '',
        base64: res?.base64 || '',
        mimeType: res?.mimeType || ''
      });

      advanceAfterTurn();
    };

    const submitFallbackTurn = () => {
      if (disposed || finishingTurn || phase !== 'fallback') return;
      finishingTurn = true;
      const currentTurn = turns[turnIdx];
      const fb = container.querySelector('#is-fallback-text')?.value?.trim() || '';
      const fbWords = countWords(fb);
      const estSec = fbWords > 0 ? Math.max(6, Math.min(35, Math.round((fbWords / 130) * 60))) : 0;
      turnAnswers.push({
        question: currentTurn.audioText,
        transcript: fb,
        durationSec: estSec,
        objectUrl: '',
        base64: '',
        mimeType: ''
      });
      advanceAfterTurn();
    };

    const playCurrentPrompt = () => {
      if (disposed || turnIdx >= turns.length) return;
      const myTurnIdx = turnIdx;
      const currentTurn = turns[myTurnIdx];
      phase = 'listening';
      audioRetryAllowed = true;
      renderIS();

      speakText(currentTurn.audioText, {
        rate: settings.ttsRate || 1.0,
        voiceName: settings.ttsVoice || '',
        onStart: () => {
          audioRetryAllowed = false;
        },
        onEnd: () => {
          if (disposed || myTurnIdx !== turnIdx) return;
          startTurnRecording();
        },
        onError: () => {
          if (disposed || myTurnIdx !== turnIdx) return;
          if (audioRetryAllowed) {
            audioRetryAllowed = false;
            phase = 'blocked';
            renderIS();
          } else {
            startTurnRecording();
          }
        }
      });
    };

    renderIS();
    autoPlayTimer = setTimeout(() => playCurrentPrompt(), 180);

    registerCleanup(() => {
      disposed = true;
      clearTurnTimers();
      stopSpeaking();
      recorder.abort();
    });

    getAnswer = async () => {
      clearTurnTimers();
      stopSpeaking();
      if (recorder.isRecording && turnIdx < turns.length) {
        const res = await recorder.stop();
        turnAnswers.push({
          question: turns[turnIdx].audioText,
          transcript: res?.liveTranscript || '',
          durationSec: res?.durationSec || 0,
          objectUrl: res?.objectUrl || '',
          base64: res?.base64 || '',
          mimeType: res?.mimeType || ''
        });
      } else if (phase === 'fallback' && turnIdx < turns.length) {
        const fb = container.querySelector('#is-fallback-text')?.value?.trim() || '';
        const fbWords = countWords(fb);
        const estSec = fbWords > 0 ? Math.max(6, Math.min(35, Math.round((fbWords / 130) * 60))) : 0;
        turnAnswers.push({
          question: turns[turnIdx].audioText,
          transcript: fb,
          durationSec: estSec,
          objectUrl: '',
          base64: '',
          mimeType: ''
        });
      }
      const combinedTranscript = turnAnswers.map((tA) => tA.transcript).filter(Boolean).join(' ');
      const totalDurationSec = turnAnswers.reduce((sum, tA) => sum + (tA.durationSec || 0), 0);
      return { turns: turnAnswers, combinedTranscript, totalDurationSec };
    };
  }

  return {
    getAnswer,
    cleanup: () => {
      cleanupFns.forEach((fn) => {
        try { fn(); } catch {}
      });
      cleanupFns = [];
    }
  };
}

export async function gradeAnyItem({ item, answer, settings = {} }) {
  const type = item.type;
  const lang = settings.uiLang || 'uz';
  const hasApi = Boolean(String(settings.apiKey || '').trim());

  if (type === 'read_select') {
    return gradeReadSelect(item, answer);
  }
  if (type === 'fill_blanks') {
    return gradeFillBlanks(item, answer);
  }
  if (type === 'read_complete') {
    return gradeReadComplete(item, answer);
  }
  if (type === 'listen_type') {
    return gradeListenType(item, answer);
  }
  if (type === 'interactive_reading') {
    return gradeInteractiveReading(item, answer);
  }

  if (type === 'interactive_listening') {
    const turnChoices = answer?.turnChoices || [];
    const summaryText = answer?.summaryText || '';
    let aiSummaryEval = null;
    let summaryDetScore = null;

    if (summaryText.trim()) {
      if (hasApi) {
        try {
          aiSummaryEval = await evaluateWriting({
            apiKey: settings.apiKey,
            model: settings.model,
            taskType: 'Interactive Listening Summary',
            prompt: item.summaryPrompt,
            userResponse: summaryText,
            wordCount: countWords(summaryText),
            feedbackLang: lang
          });
          summaryDetScore = aiSummaryEval.estimatedScore;
        } catch {
          aiSummaryEval = await evaluateWritingSmart({
            taskType: 'interactive_listening',
            prompt: item.summaryPrompt,
            userResponse: summaryText,
            lang
          });
          summaryDetScore = aiSummaryEval.estimatedScore;
        }
      } else {
        aiSummaryEval = await evaluateWritingSmart({
          taskType: 'interactive_listening',
          prompt: item.summaryPrompt,
          userResponse: summaryText,
          lang
        });
        summaryDetScore = aiSummaryEval.estimatedScore;
      }
    }

    const base = gradeInteractiveListening(item, turnChoices, summaryDetScore);
    return { ...base, aiFeedback: aiSummaryEval, summaryText };
  }

  // Writing tasks
  if (['write_photo', 'writing_sample', 'interactive_writing'].includes(type)) {
    const text = type === 'interactive_writing' ? (answer?.combined || '') : String(answer || '');
    const prompt = type === 'interactive_writing'
      ? `Part 1: ${item.part1Prompt}\nPart 2 Follow-up: ${item.part2Prompt}`
      : item.prompt;
    const wc = countWords(text);

    let aiFeedback;
    if (hasApi && wc >= 4) {
      try {
        aiFeedback = await evaluateWriting({
          apiKey: settings.apiKey,
          model: settings.model,
          taskType: type,
          prompt,
          userResponse: text,
          imageDescription: item.imageDescription || '',
          wordCount: wc,
          feedbackLang: lang
        });
      } catch (err) {
        aiFeedback = await evaluateWritingSmart({
          taskType: type,
          prompt,
          userResponse: text,
          imageDescription: item.imageDescription || '',
          lang
        });
        aiFeedback.apiError = err?.message || 'Gemini fallback';
      }
    } else {
      aiFeedback = await evaluateWritingSmart({
        taskType: type,
        prompt,
        userResponse: text,
        imageDescription: item.imageDescription || '',
        lang
      });
    }

    const detScore = aiFeedback.estimatedScore;
    return {
      type,
      detScore,
      pctScore: Math.round(((detScore - 10) / 150) * 100),
      correct: detScore >= 110,
      userSummary: `${wc} words`,
      expected: '120+ DET benchmark',
      aiFeedback,
      userResponse: text
    };
  }

  // Speaking tasks
  if (['read_aloud', 'speak_photo', 'read_then_speak', 'speaking_sample'].includes(type)) {
    const rec = answer || {};
    const promptText = type === 'read_aloud'
      ? `Read aloud verbatim: "${item.sentence}"`
      : type === 'read_then_speak'
        ? `${item.prompt} (${(item.bullets || []).join('; ')})`
        : item.prompt;

    let aiFeedback;
    if (hasApi && (rec.base64 || (rec.liveTranscript && rec.liveTranscript.trim().length > 4))) {
      try {
        aiFeedback = await evaluateSpeaking({
          apiKey: settings.apiKey,
          model: settings.model,
          taskType: type,
          prompt: promptText,
          audioBase64: rec.base64 || '',
          mimeType: rec.mimeType || 'audio/webm',
          transcript: rec.liveTranscript || '',
          imageDescription: item.imageDescription || '',
          durationSec: rec.durationSec || 0,
          feedbackLang: lang
        });
      } catch (err) {
        aiFeedback = await evaluateSpeakingSmart({
          taskType: type,
          prompt: promptText,
          transcript: rec.liveTranscript || '',
          targetSentence: item.sentence || '',
          imageDescription: item.imageDescription || '',
          durationSec: rec.durationSec || 0,
          lang
        });
        aiFeedback.apiError = err?.message || 'Gemini fallback';
      }
    } else {
      aiFeedback = await evaluateSpeakingSmart({
        taskType: type,
        prompt: promptText,
        transcript: rec.liveTranscript || '',
        targetSentence: item.sentence || '',
        imageDescription: item.imageDescription || '',
        durationSec: rec.durationSec || 0,
        lang
      });
    }

    const detScore = aiFeedback.estimatedScore;
    return {
      type,
      detScore,
      pctScore: Math.round(((detScore - 10) / 150) * 100),
      correct: detScore >= 110,
      userSummary: `${Math.round(rec.durationSec || 0)}s audio`,
      expected: type === 'read_aloud' ? item.sentence : '120+ DET benchmark',
      aiFeedback,
      audioUrl: rec.objectUrl || ''
    };
  }

  if (type === 'interactive_speaking') {
    const turns = Array.isArray(answer?.turns) ? answer.turns : [];
    const totalTurns = Array.isArray(item.turns) ? item.turns.length : turns.length;
    const answeredTurns = turns.filter((tA) => (tA.durationSec || 0) > 0 || (tA.transcript || '').trim()).length;
    const totalDurationSec = turns.reduce((sum, tA) => sum + (Number(tA.durationSec) || 0), 0);
    const combinedTranscript = turns.map((tA) => tA.transcript).filter(Boolean).join(' ').trim();
    const qaPrompt = turns
      .map((tA, i) => `Q${i + 1}: ${tA.question}\nA${i + 1}: ${tA.transcript || `[${Math.round(tA.durationSec || 0)}s audio]`}`)
      .join('\n\n') || (item.scenario || 'Interactive Speaking 6-question interview');
    const firstAudio = turns.find((tA) => tA.base64);

    let aiFeedback;
    if (hasApi && (firstAudio?.base64 || combinedTranscript.length > 4)) {
      try {
        aiFeedback = await evaluateSpeaking({
          apiKey: settings.apiKey,
          model: settings.model,
          taskType: 'interactive_speaking',
          prompt: qaPrompt,
          audioBase64: firstAudio?.base64 || '',
          mimeType: firstAudio?.mimeType || 'audio/webm',
          transcript: combinedTranscript,
          imageDescription: item.scenario || '',
          durationSec: totalDurationSec,
          feedbackLang: lang
        });
      } catch (err) {
        aiFeedback = await evaluateSpeakingSmart({
          taskType: 'interactive_speaking',
          prompt: qaPrompt,
          transcript: combinedTranscript,
          imageDescription: item.scenario || '',
          durationSec: totalDurationSec,
          lang
        });
        aiFeedback.apiError = err?.message || 'Gemini fallback';
      }
    } else {
      aiFeedback = await evaluateSpeakingSmart({
        taskType: 'interactive_speaking',
        prompt: qaPrompt,
        transcript: combinedTranscript,
        imageDescription: item.scenario || '',
        durationSec: totalDurationSec,
        lang
      });
    }

    const detScore = aiFeedback.estimatedScore;
    return {
      type: 'interactive_speaking',
      detScore,
      pctScore: Math.round(((detScore - 10) / 150) * 100),
      correct: detScore >= 110,
      answeredTurns,
      totalTurns,
      turnAnswers: turns.map((tA) => ({
        question: tA.question,
        transcript: tA.transcript,
        durationSec: tA.durationSec,
        objectUrl: tA.objectUrl || ''
      })),
      userSummary: `${answeredTurns}/${totalTurns} turns (${Math.round(totalDurationSec)}s)`,
      expected: '120+ DET benchmark',
      aiFeedback
    };
  }

  return {
    type,
    detScore: pctToDetScore(50),
    pctScore: 50,
    correct: false
  };
}

const GUIDE_ICONS = {
  speaking: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect x="10" y="3" width="8" height="14" rx="4" fill="#1CB0F6"/><path d="M6.5 13.5C6.5 17.64 9.86 21 14 21C18.14 21 21.5 17.64 21.5 13.5" stroke="#1CB0F6" stroke-width="2.4" stroke-linecap="round"/><path d="M14 21V25M10.5 25H17.5" stroke="#1CB0F6" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  writing: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M18.6 4.4L23.6 9.4L10.4 22.6L4.5 23.5L5.4 17.6L18.6 4.4Z" fill="#FFC800" stroke="#F59E0B" stroke-width="1.4" stroke-linejoin="round"/><path d="M16.2 6.8L21.2 11.8" stroke="#EA580C" stroke-width="2"/><path d="M18.6 4.4L20.5 2.5C21.3 1.7 22.6 1.7 23.4 2.5L25.5 4.6C26.3 5.4 26.3 6.7 25.5 7.5L23.6 9.4L18.6 4.4Z" fill="#FCA5A5"/></svg>`,
  reading: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M3.5 7.5C3.5 6.4 4.4 5.5 5.5 5.5H11C12.7 5.5 14 6.8 14 8.5V22.5C14 21.4 12.7 20.5 11 20.5H5.5C4.4 20.5 3.5 19.6 3.5 18.5V7.5Z" fill="#86EFAC" stroke="#58CC02" stroke-width="2.2" stroke-linejoin="round"/><path d="M24.5 7.5C24.5 6.4 23.6 5.5 22.5 5.5H17C15.3 5.5 14 6.8 14 8.5V22.5C14 21.4 15.3 20.5 17 20.5H22.5C23.6 20.5 24.5 19.6 24.5 18.5V7.5Z" fill="#DCFCE7" stroke="#58CC02" stroke-width="2.2" stroke-linejoin="round"/></svg>`,
  listening: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M5 11.5H9.5L15.5 6.5V21.5L9.5 16.5H5C4.2 16.5 3.5 15.8 3.5 15V13C3.5 12.2 4.2 11.5 5 11.5Z" fill="#1CB0F6"/><path d="M18.8 10.2C20.2 12.1 20.2 15.9 18.8 17.8" stroke="#1CB0F6" stroke-width="2.3" stroke-linecap="round"/><path d="M22.2 7.5C24.8 11 24.8 17 22.2 20.5" stroke="#1CB0F6" stroke-width="2.3" stroke-linecap="round"/></svg>`
};

function formatCriterionMeta(key, isSpeaking, lang = 'uz') {
  const uz = lang === 'uz';
  const k = String(key || '').trim();
  const map = {
    content: {
      label: 'Content',
      hint: uz ? 'Moslik · Uslub · Rivojlantirish' : 'Relevance · Style · Development'
    },
    taskRelevance: {
      label: 'Content',
      hint: uz ? 'Moslik · Rivojlantirish' : 'Relevance · Development'
    },
    relevance: {
      label: 'Content',
      hint: uz ? 'Moslik · Rivojlantirish' : 'Relevance · Development'
    },
    discourseCoherence: {
      label: 'Discourse Coherence',
      hint: uz ? 'Aniqlik · Bog‘liqlik · Tuzilma' : 'Clarity · Cohesion · Structure'
    },
    coherence: {
      label: 'Discourse Coherence',
      hint: uz ? 'Aniqlik · Bog‘liqlik · Tuzilma' : 'Clarity · Cohesion · Structure'
    },
    lexis: {
      label: 'Lexis (Vocabulary)',
      hint: isSpeaking
        ? (uz ? 'Xilma-xillik · So‘z tanlash' : 'Diversity · Sophistication')
        : (uz ? 'Xilma-xillik · Akademik · Imlo' : 'Diversity · Choice · Spelling')
    },
    vocabulary: {
      label: 'Lexis (Vocabulary)',
      hint: isSpeaking
        ? (uz ? 'Xilma-xillik · So‘z tanlash' : 'Diversity · Sophistication')
        : (uz ? 'Xilma-xillik · Akademik · Imlo' : 'Diversity · Choice · Spelling')
    },
    grammar: {
      label: 'Grammar',
      hint: isSpeaking
        ? (uz ? 'Murakkablik · Aniqlik' : 'Complexity · Accuracy')
        : (uz ? 'Murakkablik · Aniqlik · Tinish' : 'Complexity · Accuracy · Punct.')
    },
    fluency: {
      label: 'Fluency',
      hint: uz ? 'Tezlik · Pauzalar · Fillerlar' : 'Speed · Pauses · Fillers'
    },
    pronunciation: {
      label: 'Pronunciation',
      hint: uz ? 'Tushunarlilik · Urg‘u · Intonatsiya' : 'Intelligibility · Stress · Intonation'
    }
  };
  return map[k] || { label: k, hint: '' };
}

export function renderScoringGuideHtml(lang = 'uz', { showFrequency = true } = {}) {
  const uz = lang === 'uz';
  const scopeLabel = (scope) => {
    if (scope === 'writing') return uz ? 'Faqat Writing' : 'Writing only';
    if (scope === 'speaking') return uz ? 'Faqat Speaking' : 'Speaking only';
    return 'Writing & Speaking';
  };
  const scopeTag = (scope) => (scope === 'writing' ? 'tag-writing' : scope === 'speaking' ? 'tag-speaking' : 'tag-ai');

  return `
    <section class="det-score-guide" aria-label="DET Official Scoring Rules">
      <div class="card det-score-guide-card">
        <div class="card-header" style="margin-bottom:8px;">
          <div>
            <h2 class="det-guide-title">${uz ? 'Baholash tizimini tushunish (Understand scoring)' : 'Understand scoring'}</h2>
            <p class="det-guide-sub">${uz
              ? 'Ballar 10–160 shkalada baholanadi. 4 ta asosiy ko‘nikmaning o‘rtachasi Umumiy (Overall) ballni beradi.'
              : 'Scores are on a scale of 10–160. Individual subscores average to the overall score.'}</p>
          </div>
          <span class="tag tag-ai">Official DET Rules</span>
        </div>

        <div class="det-score-strip">
          <div class="det-score-unit">${GUIDE_ICONS.speaking}<span>Speaking</span></div>
          <div class="det-score-unit">${GUIDE_ICONS.writing}<span>Writing</span></div>
          <div class="det-score-unit">${GUIDE_ICONS.reading}<span>Reading</span></div>
          <div class="det-score-unit">${GUIDE_ICONS.listening}<span>Listening</span></div>
        </div>

        <p class="det-guide-sub" style="margin:18px 0 10px;">${uz
          ? 'Integratsiyalashgan subscore’lar ikkita asosiy ko‘nikmaning o‘rtacha qiymatidir:'
          : 'Integrated subscores are the average of two individual subscores.'}</p>

        <div class="det-score-strip">
          <div class="det-score-unit">
            <div class="det-score-pair">${GUIDE_ICONS.writing}<span class="det-plus">+</span>${GUIDE_ICONS.speaking}</div>
            <span>Production</span>
          </div>
          <div class="det-score-unit">
            <div class="det-score-pair">${GUIDE_ICONS.reading}<span class="det-plus">+</span>${GUIDE_ICONS.writing}</div>
            <span>Literacy</span>
          </div>
          <div class="det-score-unit">
            <div class="det-score-pair">${GUIDE_ICONS.listening}<span class="det-plus">+</span>${GUIDE_ICONS.reading}</div>
            <span>Comprehension</span>
          </div>
          <div class="det-score-unit">
            <div class="det-score-pair">${GUIDE_ICONS.speaking}<span class="det-plus">+</span>${GUIDE_ICONS.listening}</div>
            <span>Conversation</span>
          </div>
        </div>
      </div>

      <div class="card det-score-guide-card">
        <div class="card-header" style="margin-bottom:10px;">
          <div>
            <h3 class="card-title">${uz ? 'Writing va Speaking baholash mezonlari (6 ta rasmiy qoida)' : 'Official Writing & Speaking Rubric (6 Criteria)'}</h3>
            <p class="det-guide-sub" style="margin-top:2px;">${uz
              ? 'Smart Free Engine va Gemini AI javoblaringizni aynan shu mezonlar bo‘yicha tekshiradi.'
              : 'Both Smart Free Engine and Gemini AI grade your responses against these 6 DET criteria.'}</p>
          </div>
        </div>
        <div class="det-rubric-grid">
          ${DET_SCORING_RUBRIC.map((r) => `
            <div class="det-rubric-card">
              <div class="det-rubric-head">
                <strong>${escapeHtml(uz ? r.titleUz : r.titleEn)}</strong>
                <span class="tag ${scopeTag(r.scope)}">${escapeHtml(scopeLabel(r.scope))}</span>
              </div>
              <p class="det-rubric-desc">${escapeHtml(uz ? r.descUz : r.descEn)}</p>
            </div>
          `).join('')}
        </div>
      </div>

      ${showFrequency ? `
        <div class="card det-score-guide-card">
          <div class="card-header" style="margin-bottom:10px;">
            <div>
              <h3 class="card-title">${uz ? 'Rasmiy DET savol turlari soni (To‘liq Mock tarkibi)' : 'Official Question Frequency (Full Mock Blueprint)'}</h3>
              <p class="det-guide-sub" style="margin-top:2px;">${uz
                ? 'To‘liq Mock Imtihon rasmiy DET chastotasi asosida tuzilgan (barcha 13 ta rasmiy tur faol).'
                : 'Full Mock Exam follows the official DET frequency table across all 13 active task types.'}</p>
            </div>
          </div>
          <div class="det-freq-table-wrap">
            <table class="det-freq-table">
              <thead>
                <tr>
                  <th>Question Type</th>
                  <th style="text-align:right;">Frequency</th>
                </tr>
              </thead>
              <tbody>
                ${DET_FREQUENCY_TABLE.map((row) => `
                  <tr class="${row.inMock ? '' : 'muted-row'}">
                    <td>
                      <span>${escapeHtml(row.name)}</span>
                      ${row.inMock ? '' : `<span class="tag" style="margin-left:6px;">${uz ? 'Tez kunda' : 'Coming soon'}</span>`}
                    </td>
                    <td style="text-align:right;font-weight:700;">${escapeHtml(row.frequency)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    </section>
  `;
}

export function renderFeedbackCard({ item, result, lang = 'uz', onSaveMistake }) {
  const wrap = document.createElement('div');
  wrap.className = 'feedback-card';

  const badgeClass = result.detScore >= 120 ? 'tag-speaking' : result.detScore >= 90 ? 'tag-writing' : 'tag-danger';
  let bodyHtml = '';

  if (result.type === 'read_select') {
    bodyHtml = `
      <p style="margin:12px 0;">
        <strong>${escapeHtml(item.word)}</strong> —
        ${item.isReal
          ? (lang === 'uz' ? 'haqiqiy inglizcha so‘z.' : 'is a real English word.')
          : (lang === 'uz' ? 'soxta (mavjud bo‘lmagan) so‘z.' : 'is NOT a real English word.')}
      </p>
      <div>${result.correct ? '✅ ' + (lang === 'uz' ? 'To‘g‘ri topdingiz!' : 'Correct!') : '❌ ' + (lang === 'uz' ? 'Xato javob.' : 'Incorrect.')}</div>
    `;
  } else if (result.type === 'fill_blanks') {
    bodyHtml = `
      <div style="margin:12px 0;">
        <div><strong>${lang === 'uz' ? 'To‘liq so‘z:' : 'Full word:'}</strong> <span style="color:var(--green);font-weight:800;">${escapeHtml(result.expected)}</span></div>
        <div><strong>${lang === 'uz' ? 'Sizning javobingiz:' : 'Your input:'}</strong> ${escapeHtml(result.userSummary)}</div>
      </div>
    `;
  } else if (result.type === 'read_complete') {
    const chips = (result.details || []).map((d) => `
      <span class="tag ${d.ok ? 'tag-speaking' : 'tag-danger'}" style="margin:3px;">
        ${escapeHtml(d.prefix)}<strong>${escapeHtml(d.expected)}</strong> ${!d.ok && d.got ? `(${escapeHtml(d.prefix + d.got)})` : ''}
      </span>
    `).join('');
    bodyHtml = `
      <div style="margin:12px 0;">
        <div style="font-weight:700;margin-bottom:8px;">${result.correctCount}/${result.totalBlanks} ${lang === 'uz' ? 'ta bo‘shliq to‘g‘ri' : 'blanks exact'} (${result.pctScore}%)</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${chips}</div>
      </div>
    `;
  } else if (result.type === 'listen_type') {
    const words = (result.wordDiff || []).map((w) =>
      `<span class="tag ${w.ok ? 'tag-speaking' : 'tag-danger'}" style="margin:2px;">${escapeHtml(w.expected)}${!w.ok && w.got ? ` ≠ ${escapeHtml(w.got)}` : ''}</span>`
    ).join('');
    bodyHtml = `
      <div style="margin:12px 0;">
        <div><strong>${lang === 'uz' ? 'Asl gap:' : 'Correct sentence:'}</strong> ${escapeHtml(result.expected)}</div>
        <div style="margin-top:6px;"><strong>${lang === 'uz' ? 'Siz yozgan:' : 'You typed:'}</strong> ${escapeHtml(result.userSummary)}</div>
        <div style="margin-top:10px;display:flex;flex-wrap:wrap;">${words}</div>
      </div>
    `;
  } else if (result.type === 'interactive_reading') {
    bodyHtml = `
      <div style="margin:12px 0;">
        <div style="font-weight:800;margin-bottom:8px;">${result.passed}/${result.totalChecks} ${lang === 'uz' ? 'ta topshiriq to‘g‘ri' : 'checks passed'} (${result.pctScore}%)</div>
        ${(result.checks || []).map((c) => `
          <div style="font-size:13px;padding:6px 10px;border-radius:8px;background:var(--bg);margin-bottom:5px;">
            ${c.ok ? '✅' : '❌'} <strong>${escapeHtml(c.stage)}:</strong> ${escapeHtml(c.expected)}
          </div>
        `).join('')}
      </div>
    `;
  } else if (result.type === 'interactive_listening') {
    bodyHtml = `
      <div style="margin:12px 0;">
        <div style="font-weight:800;margin-bottom:8px;">${result.hits}/${result.totalTurns} ${lang === 'uz' ? 'dialog javobi to‘g‘ri' : 'conversation turns matched'}</div>
        ${(result.turnDetails || []).map((d, i) => `
          <div style="font-size:13px;padding:6px 10px;border-radius:8px;background:var(--bg);margin-bottom:5px;">
            ${d.ok ? '✅' : '❌'} <strong>Turn ${i + 1}:</strong> ${escapeHtml(d.expected)}
          </div>
        `).join('')}
      </div>
    `;
  } else if (result.type === 'interactive_speaking') {
    bodyHtml = `
      <div style="margin:12px 0;">
        <div style="font-weight:800;margin-bottom:8px;">${result.answeredTurns}/${result.totalTurns} ${lang === 'uz' ? 'ta suhbat savoli yozildi' : 'interview questions recorded'}</div>
        ${(result.turnAnswers || []).map((tA, i) => `
          <div class="det-is-review-row">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px;">Q${i + 1}: ${escapeHtml(tA.question)}</div>
            <div style="font-size:12.5px;color:var(--ink-muted);margin-bottom:${tA.objectUrl ? '6px' : '0'};">
              ${tA.transcript ? escapeHtml(tA.transcript) : `${Math.round(tA.durationSec || 0)}s audio`}
            </div>
            ${tA.objectUrl ? `<audio controls src="${escapeHtml(tA.objectUrl)}" style="width:100%;max-width:380px;height:32px;"></audio>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  if (result.audioUrl) {
    bodyHtml += `
      <div style="margin:10px 0 4px;">
        <audio controls src="${escapeHtml(result.audioUrl)}" style="width:100%;max-width:420px;display:block;"></audio>
      </div>
    `;
  }

  if (result.aiFeedback) {
    const fb = result.aiFeedback;
    const critEntries = Object.entries(fb.criteria || {});
    const wordDiffHtml = Array.isArray(fb.wordDiff) && fb.wordDiff.length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">${fb.wordDiff.map((w) =>
          `<span class="tag ${w.ok ? 'tag-speaking' : 'tag-danger'}">${escapeHtml(w.expected)}</span>`
        ).join('')}</div>`
      : '';
    const isSpeaking = ['read_aloud', 'speak_photo', 'read_then_speak', 'speaking_sample', 'interactive_speaking'].includes(result.type);
    const smartChips = [];
    if (fb.isSmartFreeEval) {
      smartChips.push(`<span class="tag tag-ai">⚡ ${escapeHtml(fb.engineLabel || 'Smart DET Rubric Engine (Free)')}</span>`);
    }
    if (fb.wpm > 0) {
      smartChips.push(`<span class="tag tag-speaking">${fb.wpm} WPM</span>`);
    }
    if (Number.isFinite(fb.stats?.lexicalDiversityPct) && fb.stats.lexicalDiversityPct > 0) {
      smartChips.push(`<span class="tag tag-reading">Lexis Variety: ${fb.stats.lexicalDiversityPct}%</span>`);
    }
    if (fb.stats?.advancedWords?.length) {
      smartChips.push(`<span class="tag tag-reading">C1/AWL: ${fb.stats.advancedWords.length}</span>`);
    }
    if (fb.stats?.connectors?.length) {
      smartChips.push(`<span class="tag tag-writing">Connectors: ${fb.stats.connectors.length}</span>`);
    }
    if (!isSpeaking && fb.stats?.spellingErrors > 0) {
      smartChips.push(`<span class="tag tag-danger">Spelling: ${fb.stats.spellingErrors}</span>`);
    }
    if (!isSpeaking && fb.stats?.punctuationErrors > 0) {
      smartChips.push(`<span class="tag tag-danger">Punctuation: ${fb.stats.punctuationErrors}</span>`);
    }
    if (isSpeaking && (fb.stats?.fillers > 0 || fb.stats?.repetitions > 0)) {
      smartChips.push(`<span class="tag tag-warn">Fillers: ${fb.stats.fillers || 0} · Repeats: ${fb.stats.repetitions || 0}</span>`);
    }

    bodyHtml += `
      <div style="margin-top:14px;">
        ${smartChips.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">${smartChips.join('')}</div>` : ''}
        ${fb.isOfflineEstimate && !fb.isSmartFreeEval ? `<div class="banner banner-warn" style="margin-bottom:12px;"><span>${escapeHtml(t(lang, 'offlineEvalNote'))}${fb.apiError ? ` (${escapeHtml(fb.apiError)})` : ''}</span></div>` : ''}
        <p style="margin:0 0 12px;font-weight:600;">${escapeHtml(fb.summary)}</p>
        ${wordDiffHtml}
        ${fb.transcript ? `<div class="transcript-preview" style="margin-bottom:12px;"><strong>Transcript:</strong> ${escapeHtml(fb.transcript)}</div>` : ''}
        <div class="criteria-grid">
          ${critEntries.map(([k, v]) => {
            const metaCrit = formatCriterionMeta(k, isSpeaking, lang);
            return `
              <div class="criteria-box">
                <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--ink-muted);">${escapeHtml(metaCrit.label)}</div>
                <div style="font-size:20px;font-weight:800;margin:2px 0;">${escapeHtml(v)}</div>
                ${metaCrit.hint ? `<div class="criteria-sub">${escapeHtml(metaCrit.hint)}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        ${(() => {
          const validFixes = (fb.corrections || []).filter(
            (c) => String(c?.original || '').trim() || String(c?.corrected || '').trim()
          );
          if (!validFixes.length) return '';
          return `
            <div style="margin-top:14px;">
              <div style="font-weight:800;margin-bottom:8px;">${lang === 'uz' ? 'Tuzatishlar va yaxshilash' : 'Corrections & Upgrades'}</div>
              ${validFixes.map((c) => {
                const ctxBefore = c.contextBefore ? `<span class="corr-ctx">${escapeHtml(c.contextBefore)}</span>` : '';
                const ctxAfter = c.contextAfter ? `<span class="corr-ctx">${escapeHtml(c.contextAfter)}</span>` : '';
                return `
                  <div class="correction-item">
                    <div>${ctxBefore}<span class="corr-old">${escapeHtml(c.original)}</span>${ctxAfter}<span class="corr-arrow">→</span>${ctxBefore}<span class="corr-new">${escapeHtml(c.corrected)}</span>${ctxAfter}</div>
                    ${c.explanation ? `<div style="color:var(--ink-muted);font-size:12.5px;margin-top:4px;">${escapeHtml(c.explanation)}</div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `;
        })()}
        ${fb.upgradedVersion || fb.modelAnswer ? `
          <div style="margin-top:14px;background:var(--green-soft);border:1px solid #B7E8C7;border-radius:12px;padding:14px;">
            <div style="font-size:12px;font-weight:800;color:#187A38;margin-bottom:6px;">★ 140+ BAND MODEL RESPONSE</div>
            <div style="font-size:13.5px;line-height:1.6;">${escapeHtml(fb.upgradedVersion || fb.modelAnswer)}</div>
          </div>
        ` : ''}
        ${(fb.keyTips || []).length ? `
          <ul style="margin:12px 0 0;padding-left:18px;font-size:13px;color:var(--ink-muted);">
            ${fb.keyTips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;
  }

  wrap.innerHTML = `
    <div class="feedback-score-row">
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="tag ${badgeClass}">DET Band</span>
        <div class="det-score-badge"><strong>${result.detScore}</strong> / 160</div>
      </div>
      ${onSaveMistake ? `<button type="button" id="fb-save-mistake" class="btn btn-secondary btn-sm">+ ${escapeHtml(t(lang, 'saveMistakeBtn'))}</button>` : ''}
    </div>
    ${bodyHtml}
  `;

  if (onSaveMistake) {
    const saveBtn = wrap.querySelector('#fb-save-mistake');
    saveBtn?.addEventListener('click', () => {
      onSaveMistake();
      saveBtn.textContent = `✓ ${t(lang, 'savedMistake')}`;
      saveBtn.disabled = true;
    });
  }

  return wrap;
}
