const MAX_CHUNK_LEN = 180;
const MAX_TOTAL_LEN = 500;
const UPSTREAM_TIMEOUT_MS = 8000;

function splitTextForTts(text, maxLen = MAX_CHUNK_LEN) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  if (normalized.length <= maxLen) return [normalized];

  const chunks = [];
  let remaining = normalized;

  const pushPiece = (piece) => {
    const clean = piece.trim();
    if (!clean) return;
    if (clean.length <= maxLen) {
      chunks.push(clean);
      return;
    }
    let rest = clean;
    while (rest.length > maxLen) {
      let cut = rest.lastIndexOf(' ', maxLen);
      if (cut <= 0) cut = maxLen;
      chunks.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push(rest);
  };

  while (remaining.length > maxLen) {
    const slice = remaining.slice(0, maxLen + 1);
    let cut = -1;

    for (let i = slice.length - 1; i >= Math.floor(maxLen * 0.45); i--) {
      if ('.?!;'.includes(slice[i]) && (i + 1 >= slice.length || slice[i + 1] === ' ')) {
        cut = i + 1;
        break;
      }
    }

    if (cut === -1) {
      for (let i = slice.length - 1; i >= Math.floor(maxLen * 0.4); i--) {
        if (slice[i] === ',' && (i + 1 >= slice.length || slice[i + 1] === ' ')) {
          cut = i + 1;
          break;
        }
      }
    }

    if (cut === -1) {
      cut = slice.lastIndexOf(' ');
    }

    if (cut <= 0) {
      cut = maxLen;
    }

    pushPiece(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) {
    pushPiece(remaining);
  }

  return chunks;
}

async function fetchChunkMp3(chunk) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`Upstream TTS HTTP ${response.status}`);
    }

    const arrayBuf = await response.arrayBuffer();
    if (!arrayBuf || arrayBuf.byteLength === 0) {
      throw new Error('Upstream TTS returned empty audio');
    }

    return Buffer.from(arrayBuf);
  } finally {
    clearTimeout(timer);
  }
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let rawQ = req.query?.q;
  if (rawQ === undefined) {
    try {
      rawQ = new URL(req.url || '/', 'http://localhost').searchParams.get('q');
    } catch {
      rawQ = '';
    }
  }
  if (Array.isArray(rawQ)) rawQ = rawQ[0];

  const cleanText = String(rawQ || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TOTAL_LEN);
  if (!cleanText) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Missing text query parameter q' }));
    return;
  }

  try {
    const chunks = splitTextForTts(cleanText, MAX_CHUNK_LEN);
    const buffers = [];
    for (const chunk of chunks) {
      const buf = await fetchChunkMp3(chunk);
      buffers.push(buf);
    }

    const mp3Buffer = Buffer.concat(buffers);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(mp3Buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    res.end(mp3Buffer);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'TTS upstream failed', detail: err?.message || 'Unknown error' }));
  }
}

module.exports = handler;
