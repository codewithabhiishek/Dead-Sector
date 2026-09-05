/* Tiny external store bridging the canvas engine and the React HUD. */

export type Phase = "menu" | "playing" | "paused" | "gameover" | "victory";

export type Difficulty = "recruit" | "veteran" | "nightmare";

export interface Buffs {
  frenzy: number; // seconds remaining
  power: number;
  shield: number;
}

export interface BossHud {
  name: string;
  frac: number; // 0..1
}

export interface BannerMsg {
  text: string;
  sub: string;
  tone: "toxic" | "blood" | "bone";
  key: number;
}

export interface RunStats {
  score: number;
  wave: number;
  kills: number;
  maxCombo: number;
  accuracy: number; // 0..1
  time: number; // seconds
  newBest: boolean;
  best: number;
  bestWave: number;
}

export interface Snapshot {
  phase: Phase;
  hp: number;
  maxHp: number;
  shield: number; // seconds of shield remaining
  score: number;
  best: number;
  bestWave: number;
  wave: number;
  left: number; // hostiles remaining in wave
  kills: number;
  tierKills: number; // kills needed for next weapon tier (0 = maxed)
  tierProgress: number; // 0..1
  weapon: string;
  weaponTier: number;
  ammo: number;
  mag: number;
  reloading: number; // -1 idle, else 0..1
  combo: number; // current chain
  comboMult: number;
  comboFrac: number; // 0..1 time remaining
  dashFrac: number; // 0..1 readiness
  stamina: number; // 0..100
  sprinting: boolean;
  buffs: Buffs;
  boss: BossHud | null;
  hurt: number; // 0..1 red flash
  lowHp: boolean;
  time: number; // seconds survived
  banner: BannerMsg | null;
  stats: RunStats | null;
  muted: boolean;
  waveClearHeal: boolean;
  difficulty: Difficulty;
  unlocked: number; // highest selectable wave (progress)
  fullscreen: boolean;
  autoAim: boolean;
}

const defaultSnap: Snapshot = {
  phase: "menu",
  hp: 100,
  maxHp: 100,
  shield: 0,
  score: 0,
  best: 0,
  bestWave: 0,
  wave: 1,
  left: 0,
  kills: 0,
  tierKills: 12,
  tierProgress: 0,
  weapon: "M9 SIDEARM",
  weaponTier: 0,
  ammo: 12,
  mag: 12,
  reloading: -1,
  combo: 0,
  comboMult: 1,
  comboFrac: 0,
  dashFrac: 1,
  stamina: 100,
  sprinting: false,
  buffs: { frenzy: 0, power: 0, shield: 0 },
  boss: null,
  hurt: 0,
  lowHp: false,
  time: 0,
  banner: null,
  stats: null,
  muted: false,
  waveClearHeal: false,
  difficulty: "veteran",
  unlocked: loadUnlocked(),
  fullscreen: false,
  autoAim: loadAutoAim(),
};

type Listener = () => void;

class Store {
  private listeners = new Set<Listener>();
  private snap: Snapshot = { ...defaultSnap };

  get = (): Snapshot => this.snap;

  set(patch: Partial<Snapshot>): void {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l());
  }

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };
}

export const store = new Store();

export function loadBest(): { best: number; bestWave: number } {
  try {
    return {
      best: Number(localStorage.getItem("ds_best") ?? 0) || 0,
      bestWave: Number(localStorage.getItem("ds_best_wave") ?? 0) || 0,
    };
  } catch {
    return { best: 0, bestWave: 0 };
  }
}

export function saveBest(score: number, wave: number): void {
  try {
    const prev = loadBest();
    if (score > prev.best) localStorage.setItem("ds_best", String(score));
    if (wave > prev.bestWave) localStorage.setItem("ds_best_wave", String(wave));
  } catch {
    /* ignore */
  }
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem("ds_muted") === "1";
  } catch {
    return false;
  }
}

export function saveMuted(m: boolean): void {
  try {
    localStorage.setItem("ds_muted", m ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function loadDifficulty(): Difficulty {
  try {
    const v = localStorage.getItem("ds_difficulty");
    return v === "recruit" || v === "nightmare" ? v : "veteran";
  } catch {
    return "veteran";
  }
}

export function saveDifficulty(d: Difficulty): void {
  try {
    localStorage.setItem("ds_difficulty", d);
  } catch {
    /* ignore */
  }
}

export function loadUnlocked(): number {
  try {
    const v = Number(localStorage.getItem("ds_unlocked") ?? 1);
    return Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1;
  } catch {
    return 1;
  }
}

export function saveUnlocked(w: number): void {
  try {
    localStorage.setItem("ds_unlocked", String(w));
  } catch {
    /* ignore */
  }
}

export function loadAutoAim(): boolean {
  try {
    // Default to true for accessible laptop play if not set
    const v = localStorage.getItem("ds_auto_aim");
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function saveAutoAim(enabled: boolean): void {
  try {
    localStorage.setItem("ds_auto_aim", enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

