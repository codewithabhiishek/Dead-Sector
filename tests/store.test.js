import test from 'node:test';
import assert from 'node:assert/strict';

// In-memory mock for localStorage
class LocalStorageMock {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.localStorage = new LocalStorageMock();

// Storage helper functions under test (mirroring store.ts implementation logic)
function loadBest() {
  try {
    return {
      best: Number(localStorage.getItem("ds_best") ?? 0) || 0,
      bestWave: Number(localStorage.getItem("ds_best_wave") ?? 0) || 0,
    };
  } catch {
    return { best: 0, bestWave: 0 };
  }
}

function saveBest(score, wave) {
  try {
    const prev = loadBest();
    if (score > prev.best) localStorage.setItem("ds_best", String(score));
    if (wave > prev.bestWave) localStorage.setItem("ds_best_wave", String(wave));
  } catch {
    /* ignore */
  }
}

function loadMuted() {
  try {
    return localStorage.getItem("ds_muted") === "1";
  } catch {
    return false;
  }
}

function saveMuted(m) {
  try {
    localStorage.setItem("ds_muted", m ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function loadDifficulty() {
  try {
    const v = localStorage.getItem("ds_difficulty");
    return v === "recruit" || v === "nightmare" ? v : "veteran";
  } catch {
    return "veteran";
  }
}

function saveDifficulty(d) {
  try {
    localStorage.setItem("ds_difficulty", d);
  } catch {
    /* ignore */
  }
}

function loadUnlocked() {
  try {
    const v = Number(localStorage.getItem("ds_unlocked") ?? 1);
    return Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1;
  } catch {
    return 1;
  }
}

function saveUnlocked(w) {
  try {
    localStorage.setItem("ds_unlocked", String(w));
  } catch {
    /* ignore */
  }
}

function loadAutoAim() {
  try {
    const v = localStorage.getItem("ds_auto_aim");
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function saveAutoAim(enabled) {
  try {
    localStorage.setItem("ds_auto_aim", enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

test('loadBest returns 0 for default values', () => {
  localStorage.clear();
  const res = loadBest();
  assert.equal(res.best, 0);
  assert.equal(res.bestWave, 0);
});

test('saveBest preserves higher scores and waves monotonically', () => {
  localStorage.clear();
  saveBest(500, 3);
  assert.deepEqual(loadBest(), { best: 500, bestWave: 3 });

  // Lower score should not overwrite
  saveBest(300, 2);
  assert.deepEqual(loadBest(), { best: 500, bestWave: 3 });

  // Higher wave updates wave, lower score doesn't decrease score
  saveBest(400, 5);
  assert.deepEqual(loadBest(), { best: 500, bestWave: 5 });

  // Higher score updates score
  saveBest(1200, 4);
  assert.deepEqual(loadBest(), { best: 1200, bestWave: 5 });
});

test('loadMuted / saveMuted handles boolean flags correctly', () => {
  localStorage.clear();
  assert.equal(loadMuted(), false);
  saveMuted(true);
  assert.equal(loadMuted(), true);
  saveMuted(false);
  assert.equal(loadMuted(), false);
});

test('loadDifficulty defaults to veteran and sanitizes invalid values', () => {
  localStorage.clear();
  assert.equal(loadDifficulty(), "veteran");

  saveDifficulty("recruit");
  assert.equal(loadDifficulty(), "recruit");

  saveDifficulty("nightmare");
  assert.equal(loadDifficulty(), "nightmare");

  // Invalid value fallback
  localStorage.setItem("ds_difficulty", "hacker_mode");
  assert.equal(loadDifficulty(), "veteran");
});

test('loadUnlocked validates positive integers', () => {
  localStorage.clear();
  assert.equal(loadUnlocked(), 1);

  saveUnlocked(5);
  assert.equal(loadUnlocked(), 5);

  localStorage.setItem("ds_unlocked", "-10");
  assert.equal(loadUnlocked(), 1);

  localStorage.setItem("ds_unlocked", "invalid");
  assert.equal(loadUnlocked(), 1);
});

test('loadAutoAim defaults to enabled (true) and toggles cleanly', () => {
  localStorage.clear();
  assert.equal(loadAutoAim(), true);

  saveAutoAim(false);
  assert.equal(loadAutoAim(), false);

  saveAutoAim(true);
  assert.equal(loadAutoAim(), true);
});
