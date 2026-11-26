import {
  loadState,
  onStateSaved,
  sanitizeStateForCloud,
  mergeStates,
  applyMergedState
} from './storage.js';

const AUTH_STORAGE_KEY = 'det_prep_auth_v1';
const LOCAL_PROFILES_KEY = 'det_prep_local_profiles_v1';

let autoSyncTimer = null;
let lastCloudPullAt = 0;
let initialized = false;

function readJsonStore(key, fallback = null) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStore(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getAuthSession() {
  const sess = readJsonStore(AUTH_STORAGE_KEY, null);
  if (!sess || typeof sess !== 'object' || !sess.username) return null;
  return sess;
}

function setAuthSession(sess) {
  writeJsonStore(AUTH_STORAGE_KEY, sess);
}

async function sha256Hex(text) {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return btoa(unescape(encodeURIComponent(text)));
}

async function callAccountApi(payload) {
  const res = await fetch('/api/account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = { ok: false, error: `HTTP ${res.status}` };
  }
  return { status: res.status, ...data };
}

export async function checkCloudStatus() {
  try {
    const res = await callAccountApi({ action: 'status' });
    return {
      cloudConfigured: Boolean(res.cloudConfigured),
      mode: res.mode || (res.cloudConfigured ? 'cloud' : 'unconfigured')
    };
  } catch {
    return { cloudConfigured: false, mode: 'offline' };
  }
}

function normalizeUser(raw) {
  return String(raw || '').trim().toLowerCase();
}

export function validateCredentials(username, password) {
  const cleanUser = normalizeUser(username);
  if (!/^[a-z0-9_.-]{3,24}$/.test(cleanUser)) {
    return { ok: false, code: 'INVALID_USERNAME', cleanUser };
  }
  if (String(password || '').length < 6) {
    return { ok: false, code: 'INVALID_PASSWORD', cleanUser };
  }
  return { ok: true, cleanUser };
}

async function saveLocalProfileSnapshot(username, passwordHash, state) {
  const profiles = readJsonStore(LOCAL_PROFILES_KEY, {});
  const prev = profiles[username] || {};
  profiles[username] = {
    username,
    passwordHash: passwordHash || prev.passwordHash,
    updatedAt: new Date().toISOString(),
    state: sanitizeStateForCloud(state)
  };
  writeJsonStore(LOCAL_PROFILES_KEY, profiles);
}

export async function registerAccount(username, password) {
  const check = validateCredentials(username, password);
  if (!check.ok) return { ok: false, code: check.code };
  const cleanUser = check.cleanUser;
  const currentCloudPayload = sanitizeStateForCloud(loadState());

  try {
    const apiRes = await callAccountApi({
      action: 'register',
      username: cleanUser,
      password,
      state: currentCloudPayload
    });

    if (apiRes.ok) {
      setAuthSession({
        username: apiRes.username,
        token: apiRes.token,
        mode: apiRes.mode === 'cloud' || apiRes.mode === 'local-dev' ? 'cloud' : 'local',
        lastSyncedAt: apiRes.updatedAt || new Date().toISOString()
      });
      return { ok: true, username: apiRes.username, mode: 'cloud' };
    }

    if (apiRes.code !== 'CLOUD_NOT_CONFIGURED') {
      return { ok: false, code: apiRes.code || 'ERROR', error: apiRes.error };
    }
  } catch {
    // Fall through to local profile if backend unreachable
  }

  // Fallback: local device profile when Vercel KV / Upstash is not configured yet
  const profiles = readJsonStore(LOCAL_PROFILES_KEY, {});
  if (profiles[cleanUser]) {
    return { ok: false, code: 'USERNAME_TAKEN' };
  }
  const passHash = await sha256Hex(`${cleanUser}:${password}`);
  const now = new Date().toISOString();
  await saveLocalProfileSnapshot(cleanUser, passHash, loadState());
  setAuthSession({
    username: cleanUser,
    token: '',
    mode: 'local',
    lastSyncedAt: now
  });
  return { ok: true, username: cleanUser, mode: 'local', cloudNotConfigured: true };
}

export async function loginAccount(username, password) {
  const check = validateCredentials(username, password);
  if (!check.ok) return { ok: false, code: check.code };
  const cleanUser = check.cleanUser;

  try {
    const apiRes = await callAccountApi({
      action: 'login',
      username: cleanUser,
      password
    });

    if (apiRes.ok) {
      const merged = mergeStates(loadState(), apiRes.state);
      applyMergedState(merged);
      const saveRes = await callAccountApi({
        action: 'sync_save',
        token: apiRes.token,
        state: sanitizeStateForCloud(merged)
      }).catch(() => null);

      const syncedAt = saveRes?.updatedAt || apiRes.updatedAt || new Date().toISOString();
      setAuthSession({
        username: apiRes.username,
        token: apiRes.token,
        mode: 'cloud',
        lastSyncedAt: syncedAt
      });
      lastCloudPullAt = Date.now();
      return { ok: true, username: apiRes.username, mode: 'cloud', merged };
    }

    if (apiRes.code !== 'CLOUD_NOT_CONFIGURED') {
      return { ok: false, code: apiRes.code || 'ERROR', error: apiRes.error };
    }
  } catch {
    // Fall through to local profile
  }

  const profiles = readJsonStore(LOCAL_PROFILES_KEY, {});
  const rec = profiles[cleanUser];
  const passHash = await sha256Hex(`${cleanUser}:${password}`);
  if (!rec || rec.passwordHash !== passHash) {
    return { ok: false, code: 'INVALID_CREDENTIALS', cloudNotConfigured: true };
  }
  const merged = mergeStates(loadState(), rec.state);
  applyMergedState(merged);
  await saveLocalProfileSnapshot(cleanUser, passHash, merged);
  const now = new Date().toISOString();
  setAuthSession({
    username: cleanUser,
    token: '',
    mode: 'local',
    lastSyncedAt: now
  });
  return { ok: true, username: cleanUser, mode: 'local', cloudNotConfigured: true, merged };
}

export async function syncNow({ pushAfterMerge = true } = {}) {
  const sess = getAuthSession();
  if (!sess) return { ok: false, code: 'NOT_LOGGED_IN' };

  if (sess.mode === 'local' || !sess.token) {
    await saveLocalProfileSnapshot(sess.username, null, loadState());
    const now = new Date().toISOString();
    setAuthSession({ ...sess, lastSyncedAt: now });
    return { ok: true, mode: 'local', updatedAt: now };
  }

  const pullRes = await callAccountApi({ action: 'sync_get', token: sess.token });
  if (!pullRes.ok) {
    if (pullRes.code === 'SESSION_EXPIRED' || pullRes.code === 'UNAUTHORIZED') {
      setAuthSession(null);
    }
    return { ok: false, code: pullRes.code, error: pullRes.error };
  }

  const merged = mergeStates(loadState(), pullRes.state);
  applyMergedState(merged);
  lastCloudPullAt = Date.now();

  let syncedAt = pullRes.updatedAt || new Date().toISOString();
  if (pushAfterMerge) {
    const pushRes = await callAccountApi({
      action: 'sync_save',
      token: sess.token,
      state: sanitizeStateForCloud(merged)
    });
    if (pushRes.ok && pushRes.updatedAt) {
      syncedAt = pushRes.updatedAt;
    }
  }

  setAuthSession({ ...sess, lastSyncedAt: syncedAt });
  return { ok: true, mode: 'cloud', updatedAt: syncedAt };
}

export async function logoutAccount() {
  const sess = getAuthSession();
  if (sess?.token) {
    callAccountApi({ action: 'logout', token: sess.token }).catch(() => {});
  }
  setAuthSession(null);
}

export function initAccountAutoSync(onSynced) {
  if (initialized) return;
  initialized = true;

  onStateSaved((state) => {
    const sess = getAuthSession();
    if (!sess) return;
    if (autoSyncTimer) clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(async () => {
      autoSyncTimer = null;
      const curSess = getAuthSession();
      if (!curSess) return;
      if (curSess.mode === 'local' || !curSess.token) {
        await saveLocalProfileSnapshot(curSess.username, null, state);
        setAuthSession({ ...curSess, lastSyncedAt: new Date().toISOString() });
        return;
      }
      try {
        const res = await callAccountApi({
          action: 'sync_save',
          token: curSess.token,
          state: sanitizeStateForCloud(state)
        });
        if (res.ok) {
          setAuthSession({ ...curSess, lastSyncedAt: res.updatedAt || new Date().toISOString() });
        }
      } catch {}
    }, 1200);
  });

  const refreshFromCloud = async () => {
    const sess = getAuthSession();
    if (!sess || sess.mode === 'local' || !sess.token) return;
    if (Date.now() - lastCloudPullAt < 25000) return;
    try {
      const res = await syncNow({ pushAfterMerge: false });
      if (res.ok) {
        onSynced?.(res);
      }
    } catch {}
  };

  refreshFromCloud();
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshFromCloud();
    });
  }
}
