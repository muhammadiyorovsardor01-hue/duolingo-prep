const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SESSION_TTL_SEC = 60 * 60 * 24 * 90; // 90 days
const DEV_STORE_PATH = path.join(os.tmpdir(), 'det-prep-dev-accounts.json');

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function getRedisConfig() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim().replace(/\/+$/, '');
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim();
  if (url && token) {
    return { url, token };
  }
  return null;
}

async function redisCmd(cfg, args) {
  const resp = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });
  if (!resp.ok) {
    throw new Error(`Redis REST HTTP ${resp.status}`);
  }
  const data = await resp.json();
  if (data && data.error) {
    throw new Error(data.error);
  }
  return data ? data.result : null;
}

function readDevStore() {
  try {
    if (!fs.existsSync(DEV_STORE_PATH)) return {};
    return JSON.parse(fs.readFileSync(DEV_STORE_PATH, 'utf8') || '{}') || {};
  } catch {
    return {};
  }
}

function writeDevStore(store) {
  fs.writeFileSync(DEV_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function createStoreAdapter() {
  const redisCfg = getRedisConfig();
  if (redisCfg) {
    return {
      mode: 'cloud',
      cloudConfigured: true,
      async get(key) {
        const raw = await redisCmd(redisCfg, ['GET', key]);
        return raw ? JSON.parse(raw) : null;
      },
      async set(key, value, ttlSec) {
        const serialized = JSON.stringify(value);
        if (ttlSec) {
          await redisCmd(redisCfg, ['SET', key, serialized, 'EX', String(ttlSec)]);
        } else {
          await redisCmd(redisCfg, ['SET', key, serialized]);
        }
      },
      async del(key) {
        await redisCmd(redisCfg, ['DEL', key]);
      }
    };
  }

  if (process.env.VERCEL) {
    return {
      mode: 'unconfigured',
      cloudConfigured: false
    };
  }

  return {
    mode: 'local-dev',
    cloudConfigured: true,
    async get(key) {
      const store = readDevStore();
      const entry = store[key];
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        delete store[key];
        writeDevStore(store);
        return null;
      }
      return entry.value;
    },
    async set(key, value, ttlSec) {
      const store = readDevStore();
      store[key] = {
        value,
        expiresAt: ttlSec ? Date.now() + ttlSec * 1000 : null
      };
      writeDevStore(store);
    },
    async del(key) {
      const store = readDevStore();
      delete store[key];
      writeDevStore(store);
    }
  };
}

function readJsonBody(req, maxBytes = 512 * 1024) {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8').trim();
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase();
}

function isValidUsername(u) {
  return /^[a-z0-9_.-]{3,24}$/.test(u);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHex) {
  try {
    const actual = crypto.scryptSync(String(password), String(salt), 64);
    const expected = Buffer.from(String(expectedHex), 'hex');
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function stripSensitiveState(state) {
  if (!state || typeof state !== 'object') return null;
  const settings = state.settings && typeof state.settings === 'object'
    ? { ...state.settings, apiKey: '' }
    : { apiKey: '' };
  return {
    settings,
    examHistory: Array.isArray(state.examHistory) ? state.examHistory.slice(0, 30) : [],
    practiceStats: state.practiceStats && typeof state.practiceStats === 'object' ? state.practiceStats : {},
    dailyActivity: state.dailyActivity && typeof state.dailyActivity === 'object' ? state.dailyActivity : {},
    mistakes: Array.isArray(state.mistakes) ? state.mistakes.slice(0, 200) : [],
    seenIds: state.seenIds && typeof state.seenIds === 'object' ? state.seenIds : {},
    recentWords: Array.isArray(state.recentWords) ? state.recentWords.slice(-120) : []
  };
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const store = createStoreAdapter();

  let body = {};
  if (req.method === 'POST') {
    try {
      body = await readJsonBody(req);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message || 'Invalid JSON body' });
      return;
    }
  } else if (req.method === 'GET') {
    const u = new URL(req.url || '/', 'http://localhost');
    body = { action: u.searchParams.get('action') || 'status' };
  } else {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  const action = String(body.action || 'status');

  if (action === 'status') {
    sendJson(res, 200, {
      ok: true,
      cloudConfigured: store.cloudConfigured,
      mode: store.mode
    });
    return;
  }

  if (!store.cloudConfigured) {
    sendJson(res, 503, {
      ok: false,
      code: 'CLOUD_NOT_CONFIGURED',
      error: 'Cloud database (Upstash Redis / Vercel KV) is not linked on Vercel yet.'
    });
    return;
  }

  try {
    if (action === 'register') {
      const username = normalizeUsername(body.username);
      const password = String(body.password || '');
      if (!isValidUsername(username)) {
        sendJson(res, 400, { ok: false, code: 'INVALID_USERNAME', error: 'Username must be 3-24 characters (a-z, 0-9, _, ., -).' });
        return;
      }
      if (password.length < 6 || password.length > 128) {
        sendJson(res, 400, { ok: false, code: 'INVALID_PASSWORD', error: 'Password must be at least 6 characters.' });
        return;
      }

      const userKey = `det_prep_user:${username}`;
      const existing = await store.get(userKey);
      if (existing) {
        sendJson(res, 409, { ok: false, code: 'USERNAME_TAKEN', error: 'This username is already registered.' });
        return;
      }

      const { salt, hash } = hashPassword(password);
      const now = new Date().toISOString();
      const userRecord = {
        username,
        salt,
        passwordHash: hash,
        createdAt: now,
        updatedAt: now,
        state: stripSensitiveState(body.state)
      };
      await store.set(userKey, userRecord);

      const token = crypto.randomBytes(32).toString('hex');
      await store.set(`det_prep_sess:${token}`, { username, createdAt: now }, SESSION_TTL_SEC);

      sendJson(res, 200, {
        ok: true,
        username,
        token,
        updatedAt: now,
        mode: store.mode,
        state: userRecord.state
      });
      return;
    }

    if (action === 'login') {
      const username = normalizeUsername(body.username);
      const password = String(body.password || '');
      if (!isValidUsername(username) || !password) {
        sendJson(res, 400, { ok: false, code: 'INVALID_CREDENTIALS', error: 'Invalid username or password.' });
        return;
      }

      const userKey = `det_prep_user:${username}`;
      const userRecord = await store.get(userKey);
      if (!userRecord || !verifyPassword(password, userRecord.salt, userRecord.passwordHash)) {
        sendJson(res, 401, { ok: false, code: 'INVALID_CREDENTIALS', error: 'Incorrect username or password.' });
        return;
      }

      const token = crypto.randomBytes(32).toString('hex');
      await store.set(`det_prep_sess:${token}`, { username, createdAt: new Date().toISOString() }, SESSION_TTL_SEC);

      sendJson(res, 200, {
        ok: true,
        username,
        token,
        updatedAt: userRecord.updatedAt,
        mode: store.mode,
        state: userRecord.state || null
      });
      return;
    }

    if (action === 'logout') {
      const token = String(body.token || '').trim();
      if (token) {
        await store.del(`det_prep_sess:${token}`);
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (action === 'sync_get' || action === 'sync_save') {
      const token = String(body.token || '').trim();
      if (!token) {
        sendJson(res, 401, { ok: false, code: 'UNAUTHORIZED', error: 'Missing session token.' });
        return;
      }
      const sess = await store.get(`det_prep_sess:${token}`);
      if (!sess || !sess.username) {
        sendJson(res, 401, { ok: false, code: 'SESSION_EXPIRED', error: 'Session expired. Please sign in again.' });
        return;
      }

      const userKey = `det_prep_user:${sess.username}`;
      const userRecord = await store.get(userKey);
      if (!userRecord) {
        sendJson(res, 404, { ok: false, code: 'USER_NOT_FOUND', error: 'Account not found.' });
        return;
      }

      if (action === 'sync_get') {
        sendJson(res, 200, {
          ok: true,
          username: userRecord.username,
          updatedAt: userRecord.updatedAt,
          mode: store.mode,
          state: userRecord.state || null
        });
        return;
      }

      const now = new Date().toISOString();
      userRecord.state = stripSensitiveState(body.state);
      userRecord.updatedAt = now;
      await store.set(userKey, userRecord);
      sendJson(res, 200, {
        ok: true,
        username: userRecord.username,
        updatedAt: now,
        mode: store.mode
      });
      return;
    }

    sendJson(res, 400, { ok: false, error: 'Unsupported action' });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err?.message || 'Account service error' });
  }
}

module.exports = handler;
