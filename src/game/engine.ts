/* DEAD SECTOR — canvas game engine. Scrolling world, camera follow, all visuals procedural. */

import {
  store,
  loadBest,
  saveBest,
  loadMuted,
  saveMuted,
  loadDifficulty,
  saveDifficulty,
  loadUnlocked,
  saveUnlocked,
  type BannerMsg,
  type Difficulty,
} from "./store";
import { sfx } from "./audio";

/* ---------------------------------- types ---------------------------------- */

type ZKind = "walker" | "runner" | "spitter" | "brute" | "boss";

interface Zombie {
  kind: ZKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  score: number;
  phase: number;
  flashT: number;
  atkT: number;
  lungeT: number;
  spitT: number;
  waypoint: { x: number; y: number } | null;
  waypointT: number;
  prog: number; // time spent failing to close distance (anti-stuck tracker)
  lastD: number;
  burnT: number; // incinerator burn time remaining
  burnDps: number;
  dead: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  pierce: number;
  life: number;
  hitIds: Set<Zombie>;
  col: string; // tracer color
  w: number; // tracer width
}

interface Acid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  dmg: number;
  big: boolean; // boss plasma orb
}

type PickupKind = "medkit" | "frenzy" | "power" | "shield" | "nuke";

interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
  t: number;
  life: number;
}

interface Particle {
  kind: "blood" | "spark" | "shell" | "smoke" | "chunk" | "ring" | "acid" | "dust";
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  t: number;
  life: number;
  crit: boolean;
}

interface Weapon {
  name: string;
  dmg: number;
  rof: number;
  mag: number;
  reload: number;
  pellets: number;
  spread: number;
  speed: number;
  pierce: number;
  kick: number;
}

type ObsKind = "building" | "container" | "car" | "barrier" | "sandbag" | "crate";

interface Obs {
  kind: ObsKind;
  x: number;
  y: number;
  w: number;
  h: number;
  low: boolean;
  col: string;
  col2: string;
  fire: boolean;
  fireT: number;
  seed: number;
}

interface Decal {
  k: "grass" | "crater" | "crack" | "rubble" | "oil" | "bone";
  x: number;
  y: number;
  r: number;
  pts?: number[];
}

interface GoreDecal {
  x: number;
  y: number;
  r: number;
  c: string;
}

const WEAPONS: Weapon[] = [
  { name: "M9 SIDEARM", dmg: 13, rof: 4.4, mag: 12, reload: 0.85, pellets: 1, spread: 0.05, speed: 820, pierce: 0, kick: 2.2 },
  { name: "VECTOR SMG", dmg: 9, rof: 11.5, mag: 34, reload: 1.05, pellets: 1, spread: 0.1, speed: 860, pierce: 0, kick: 1.5 },
  { name: "RIOT SHOTGUN", dmg: 10, rof: 2.7, mag: 6, reload: 1.35, pellets: 6, spread: 0.3, speed: 740, pierce: 0, kick: 6 },
  { name: "AK-74 RIFLE", dmg: 17, rof: 7.6, mag: 30, reload: 1.2, pellets: 1, spread: 0.05, speed: 940, pierce: 1, kick: 2.4 },
  { name: "M134 MINIGUN", dmg: 11, rof: 16.5, mag: 140, reload: 2.0, pellets: 1, spread: 0.14, speed: 900, pierce: 1, kick: 1.2 },
  { name: "M6 INCINERATOR", dmg: 13, rof: 3.2, mag: 8, reload: 1.5, pellets: 6, spread: 0.34, speed: 640, pierce: 0, kick: 5 },
  { name: "ARC-9 RAILGUN", dmg: 96, rof: 2.1, mag: 6, reload: 1.7, pellets: 1, spread: 0.008, speed: 1700, pierce: 99, kick: 7 },
];
const TIER_AT = [0, 12, 35, 75, 140, 220, 330]; // kills needed for tier index
// weapon a fresh deployment starts with when inserting directly into a later wave
const START_TIER = [0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6];

const COMBO_WINDOW = 2.2;

export interface DiffSpec {
  label: string;
  hp: number;
  dmg: number;
  spd: number;
  count: number;
  score: number;
  blurb: string;
}

export const DIFFS: Record<Difficulty, DiffSpec> = {
  recruit: { label: "RECRUIT", hp: 0.7, dmg: 0.65, spd: 0.88, count: 0.75, score: 0.75, blurb: "Thinner horde · softer bites · score ×0.75" },
  veteran: { label: "VETERAN", hp: 1, dmg: 1, spd: 1, count: 1, score: 1, blurb: "The intended nightmare · score ×1.0" },
  nightmare: { label: "NIGHTMARE", hp: 1.4, dmg: 1.3, spd: 1.14, count: 1.3, score: 1.6, blurb: "Denser · faster · meaner · score ×1.6" },
};

const WORLD_W = 3400;
const WORLD_H = 2300;
const ROAD_Y = 1000; // horizontal road centerline
const ROAD_HALF = 80;
const ROAD_X = 2150; // vertical road centerline
const VROAD_HALF = 66;
const CX = WORLD_W / 2;
const CY = WORLD_H / 2;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

/* ---------------------------------- engine ---------------------------------- */

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tile: CanvasPattern | null = null;
  private raf = 0;
  private lastT = 0;
  private w = 800;
  private h = 600;
  private dpr = 1;
  private destroyed = false;

  private phase: "menu" | "playing" | "paused" | "gameover" = "menu";

  // camera
  private cam = { x: CX, y: CY };

  // world
  private obstacles: Obs[] = [];
  private lamps: { x: number; y: number }[] = [];
  private decals: Decal[] = [];
  private goreDecals: GoreDecal[] = [];

  // input
  private keys = new Set<string>();
  private mouseX = 400;
  private mouseY = 300;
  private mouseDown = false;
  private touchVec = { x: 0, y: 0, active: false };
  private touchFiring = false;
  private touchSprint = false;

  // player
  private px = CX;
  private py = CY;
  private pvx = 0;
  private pvy = 0;
  private hp = 100;
  private readonly maxHp = 100;
  private aim = 0;
  private moveA = 0;
  private moving = false;
  private sprinting = false;
  private stamina = 100;
  private canSprint = true;
  private runPhase = 0;
  private stepT = 0;
  private invulnT = 0;
  private dashT = 0;
  private dashCd = 0;
  private dashDx = 0;
  private dashDy = 0;
  private ghosts: { x: number; y: number; a: number; aim: number }[] = [];
  private muzzleT = 0;
  private muzzleX = 0;
  private muzzleY = 0;
  private fireT = 0;
  private reloadT = -1;
  private ammo = WEAPONS[0].mag;
  private spreadKick = 0;
  private dead = false;
  private hitT = 0;
  private hitKillT = 0;
  private diffKey: Difficulty = "veteran";
  private surge = false;
  private bossSpawned = false;
  private deadWave = 1;

  // progression
  private score = 0;
  private kills = 0;
  private tier = 0;
  private combo = 0;
  private comboT = 0;
  private maxCombo = 0;
  private shots = 0;
  private hits = 0;
  private runT = 0;
  private frenzyT = 0;
  private powerT = 0;
  private shieldT = 0;
  private heartT = 0;

  // wave
  private wave = 0;
  private toSpawn = 0;
  private spawnT = 0;
  private intermission = -1;
  private boss: Zombie | null = null;

  // entities
  private zombies: Zombie[] = [];
  private bullets: Bullet[] = [];
  private acids: Acid[] = [];
  private pickups: Pickup[] = [];
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private ambient: Zombie[] = [];
  private spores: { x: number; y: number; vy: number; ph: number }[] = [];
  private fogs: { x: number; y: number; r: number; s: number; ph: number }[] = [];

  // feel
  private shakeT = 0;
  private shakeMag = 0;
  private freezeT = 0;
  private hurtT = 0;
  private bannerKey = 0;
  private hudT = 0;
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    sfx.muted = loadMuted();
    this.diffKey = loadDifficulty();
    this.buildTile();
    this.buildWorld();
    this.resize();
    this.seedAmbient();
    this.attach();
    this.syncHud(true);
    this.lastT = performance.now();
    const loop = (t: number) => {
      if (this.destroyed) return;
      this.raf = requestAnimationFrame(loop);
      let dt = (t - this.lastT) / 1000;
      this.lastT = t;
      dt = clamp(dt, 0, 0.05);
      this.time += dt;
      if (this.freezeT > 0) {
        this.freezeT -= dt;
        dt *= 0.12;
      }
      this.update(dt);
      this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }

  /* ------------------------------ world building ------------------------------ */

  private buildTile() {
    const t = document.createElement("canvas");
    t.width = 256;
    t.height = 256;
    const g = t.getContext("2d")!;
    g.fillStyle = "#141a13";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 520; i++) {
      g.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.16)" : "rgba(150,170,120,0.05)";
      const s = rand(1, 2.4);
      g.fillRect(rand(0, 256), rand(0, 256), s, s);
    }
    g.strokeStyle = "rgba(0,0,0,0.22)";
    for (let i = 0; i < 4; i++) {
      g.lineWidth = rand(0.5, 1.2);
      g.beginPath();
      let x = rand(0, 256);
      let y = rand(0, 256);
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += rand(-46, 46);
        y += rand(-46, 46);
        g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const x = rand(0, 256);
      const y = rand(0, 256);
      const r = rand(14, 44);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(0,0,0,0.14)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    this.tile = this.ctx.createPattern(t, "repeat");
  }

  private obsFits(x: number, y: number, w: number, h: number): boolean {
    const m = 90;
    if (x < m || y < m || x + w > WORLD_W - m || y + h > WORLD_H - m) return false;
    // keep roads clear
    if (y < ROAD_Y + ROAD_HALF + 34 && y + h > ROAD_Y - ROAD_HALF - 34) return false;
    if (x < ROAD_X + VROAD_HALF + 34 && x + w > ROAD_X - VROAD_HALF - 34) return false;
    // keep the central drop-zone plaza clear
    const nx = clamp(CX, x, x + w);
    const ny = clamp(CY, y, y + h);
    if (dist2(nx, ny, CX, CY) < 380 * 380) return false;
    // no overlap with existing
    for (const o of this.obstacles) {
      if (x < o.x + o.w + 46 && x + w + 46 > o.x && y < o.y + o.h + 46 && y + h + 46 > o.y) return false;
    }
    return true;
  }

  private placeObs(kind: ObsKind, w: number, h: number, col: string, col2: string, low: boolean, fire = false) {
    for (let i = 0; i < 80; i++) {
      const x = rand(0, WORLD_W - w);
      const y = rand(0, WORLD_H - h);
      if (this.obsFits(x, y, w, h)) {
        this.obstacles.push({ kind, x, y, w, h, low, col, col2, fire, fireT: rand(0, 0.2), seed: Math.floor(rand(0, 9999)) });
        return;
      }
    }
  }

  private buildWorld() {
    this.obstacles = [];
    this.lamps = [];
    this.decals = [];
    this.goreDecals = [];

    const bCols: [string, string][] = [
      ["#232a31", "#1a2026"],
      ["#20262b", "#171c20"],
      ["#262d2a", "#1b211e"],
      ["#2a2620", "#1e1b16"],
    ];
    for (let i = 0; i < 7; i++) {
      const c = bCols[i % bCols.length];
      this.placeObs("building", rand(260, 430), rand(190, 310), c[0], c[1], false);
    }
    const cCols: [string, string][] = [
      ["#6e3a24", "#54291a"],
      ["#49522f", "#373e22"],
      ["#31404d", "#232e38"],
      ["#5c4a26", "#453819"],
    ];
    for (let i = 0; i < 5; i++) {
      const c = cCols[i % cCols.length];
      if (Math.random() < 0.5) this.placeObs("container", 176, 66, c[0], c[1], false);
      else this.placeObs("container", 66, 176, c[0], c[1], false);
    }
    const carCols: [string, string][] = [
      ["#5a3a3a", "#3d2626"],
      ["#3f4a55", "#2a323b"],
      ["#4d4a35", "#353323"],
      ["#555b60", "#3a3e42"],
    ];
    for (let i = 0; i < 6; i++) {
      const c = carCols[i % carCols.length];
      const vert = Math.random() < 0.4;
      this.placeObs("car", vert ? 40 : 84, vert ? 84 : 40, c[0], c[1], false, i < 2);
    }
    for (let i = 0; i < 5; i++) {
      if (Math.random() < 0.5) this.placeObs("barrier", 150, 20, "#3a3d40", "#2b2e31", false);
      else this.placeObs("barrier", 20, 150, "#3a3d40", "#2b2e31", false);
    }
    for (let i = 0; i < 4; i++) this.placeObs("sandbag", 132, 28, "#4d4632", "#3a3524", true);
    for (let i = 0; i < 5; i++) this.placeObs("crate", 42, 42, "#3f4626", "#2e341b", true);

    // street lamps along both roads
    for (let x = 260; x < WORLD_W - 200; x += rand(380, 520)) {
      this.lamps.push({ x, y: ROAD_Y - ROAD_HALF - 26 });
      if (Math.random() < 0.7) this.lamps.push({ x: x + rand(120, 260), y: ROAD_Y + ROAD_HALF + 26 });
    }
    for (let y = 300; y < WORLD_H - 200; y += rand(400, 560)) {
      this.lamps.push({ x: ROAD_X - VROAD_HALF - 26, y });
    }

    // ground decals
    for (let i = 0; i < 80; i++) this.decals.push({ k: "grass", x: rand(40, WORLD_W - 40), y: rand(40, WORLD_H - 40), r: rand(22, 74) });
    for (let i = 0; i < 16; i++) this.decals.push({ k: "crater", x: rand(60, WORLD_W - 60), y: rand(60, WORLD_H - 60), r: rand(24, 58) });
    for (let i = 0; i < 30; i++) {
      const pts: number[] = [];
      let x = 0;
      let y = 0;
      const segs = 4 + Math.floor(rand(0, 4));
      for (let s = 0; s < segs; s++) {
        x += rand(-80, 80);
        y += rand(-80, 80);
        pts.push(x, y);
      }
      this.decals.push({ k: "crack", x: rand(80, WORLD_W - 80), y: rand(80, WORLD_H - 80), r: 110, pts });
    }
    for (let i = 0; i < 24; i++) this.decals.push({ k: "rubble", x: rand(50, WORLD_W - 50), y: rand(50, WORLD_H - 50), r: rand(10, 22) });
    for (let i = 0; i < 12; i++) this.decals.push({ k: "oil", x: rand(60, WORLD_W - 60), y: rand(60, WORLD_H - 60), r: rand(18, 40) });
    for (let i = 0; i < 26; i++) this.decals.push({ k: "bone", x: rand(40, WORLD_W - 40), y: rand(40, WORLD_H - 40), r: rand(4, 9) });
  }

  /* ------------------------------ lifecycle ------------------------------ */

  private onKeyDown = (e: KeyboardEvent) => {
    const c = e.code;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(c)) {
      e.preventDefault();
    }
    if (c === "KeyM") {
      this.toggleMute();
      return;
    }
    if (c === "Enter" || c === "Space") {
      if (this.phase === "menu" || this.phase === "gameover") {
        if (c === "Enter" || (c === "Space" && this.phase === "gameover")) {
          // quick-deploy: menu continues from latest progress, game over retries the fallen wave
          this.start(this.phase === "gameover" ? this.deadWave : loadUnlocked());
        }
        return;
      }
    }
    if (c === "KeyP" || c === "Escape") {
      if (this.phase === "playing") this.pause();
      else if (this.phase === "paused") this.resume();
      return;
    }
    if (this.phase !== "playing") return;
    this.keys.add(c);
    if (c === "KeyR") this.startReload();
    if (c === "Space") this.dash();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = true;
    if (e.button === 2 && this.phase === "playing") this.dash();
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false;
  };

  private onCtx = (e: Event) => e.preventDefault();

  private onResize = () => this.resize();

  private onBlur = () => {
    if (this.phase === "playing") this.pause();
  };

  private attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("blur", this.onBlur);
    this.canvas.addEventListener("contextmenu", this.onCtx);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("blur", this.onBlur);
    this.canvas.removeEventListener("contextmenu", this.onCtx);
    sfx.stopDrone();
  }

  private resize() {
    this.dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.seedSpores();
    this.seedFog();
  }

  /* ------------------------------ public API ------------------------------ */

  start(fromWave = 1) {
    sfx.unlock();
    sfx.ui();
    this.reset();
    this.phase = "playing";
    sfx.startDrone();
    const w0 = clamp(Math.round(fromWave), 1, 999);
    // inserting mid-campaign: arm the operator for that wave
    if (w0 > 1) {
      const t = START_TIER[Math.min(w0, 11) - 1];
      this.tier = t;
      this.ammo = WEAPONS[t].mag;
      this.reloadT = -1;
      this.banner("DEPLOYED", `${WEAPONS[t].name} · WAVE ${w0}`, "toxic");
    }
    this.startWave(w0);
    this.syncHud(true);
  }

  private bumpUnlocked(n: number) {
    if (n > loadUnlocked()) {
      saveUnlocked(n);
      store.set({ unlocked: n });
    }
  }

  pause() {
    if (this.phase !== "playing") return;
    this.phase = "paused";
    this.keys.clear();
    this.mouseDown = false;
    sfx.ui();
    this.syncHud(true);
  }

  resume() {
    if (this.phase !== "paused") return;
    this.phase = "playing";
    this.lastT = performance.now();
    sfx.ui();
    this.syncHud(true);
  }

  toMenu() {
    sfx.ui();
    sfx.stopDrone();
    this.phase = "menu";
    this.zombies = [];
    this.bullets = [];
    this.acids = [];
    this.pickups = [];
    this.texts = [];
    this.boss = null;
    this.dead = false;
    this.seedAmbient();
    this.syncHud(true);
  }

  toggleMute(): boolean {
    sfx.unlock();
    const m = !sfx.muted;
    sfx.setMuted(m);
    saveMuted(m);
    store.set({ muted: m });
    return m;
  }

  dashAction() {
    if (this.phase === "playing") this.dash();
  }

  setDifficulty(k: Difficulty) {
    this.diffKey = k;
    saveDifficulty(k);
    store.set({ difficulty: k });
    sfx.unlock();
    sfx.ui();
  }

  setTouchMove(x: number, y: number, active: boolean) {
    this.touchVec.x = x;
    this.touchVec.y = y;
    this.touchVec.active = active;
  }

  setTouchFire(on: boolean) {
    this.touchFiring = on;
  }

  setTouchSprint(on: boolean) {
    this.touchSprint = on;
  }

  get isTouch(): boolean {
    return typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }

  /* -------------------------------- setup -------------------------------- */

  private reset() {
    this.zombies = [];
    this.bullets = [];
    this.acids = [];
    this.pickups = [];
    this.particles = [];
    this.texts = [];
    this.ambient = [];
    this.boss = null;
    this.goreDecals = [];
    this.px = CX;
    this.py = CY;
    this.cam.x = CX;
    this.cam.y = CY;
    this.pvx = 0;
    this.pvy = 0;
    this.hp = this.maxHp;
    this.stamina = 100;
    this.canSprint = true;
    this.sprinting = false;
    this.dead = false;
    this.invulnT = 0;
    this.dashT = 0;
    this.dashCd = 0;
    this.ghosts = [];
    this.fireT = 0;
    this.reloadT = -1;
    this.ammo = WEAPONS[0].mag;
    this.score = 0;
    this.kills = 0;
    this.tier = 0;
    this.combo = 0;
    this.comboT = 0;
    this.maxCombo = 0;
    this.shots = 0;
    this.hits = 0;
    this.runT = 0;
    this.frenzyT = 0;
    this.powerT = 0;
    this.shieldT = 0;
    this.wave = 0;
    this.intermission = -1;
    this.bossSpawned = false;
    this.surge = false;
    this.hurtT = 0;
    this.shakeT = 0;
  }

  private seedAmbient() {
    this.ambient = [];
    for (let i = 0; i < 12; i++) {
      this.ambient.push(
        this.makeZombie(Math.random() < 0.3 ? "runner" : "walker", rand(200, WORLD_W - 200), rand(200, WORLD_H - 200), 1)
      );
    }
  }

  private seedSpores() {
    this.spores = [];
    const n = Math.floor((this.w * this.h) / 38000);
    for (let i = 0; i < n; i++) {
      this.spores.push({ x: rand(0, this.w), y: rand(0, this.h), vy: rand(6, 20), ph: rand(0, 6.28) });
    }
  }

  private seedFog() {
    this.fogs = [];
    for (let i = 0; i < 6; i++) {
      this.fogs.push({
        x: rand(0, this.w),
        y: rand(0, this.h),
        r: rand(180, 380),
        s: rand(8, 22),
        ph: rand(0, 6.28),
      });
    }
  }

  /* --------------------------------- waves --------------------------------- */

  private startWave(n: number) {
    this.wave = n;
    const isBoss = n % 5 === 0;
    const patriarch = isBoss && n >= 10;
    this.bossSpawned = false;
    this.surge = !isBoss && n >= 7 && n % 7 === 0;
    const total = this.waveCount(n);
    this.toSpawn = total;
    this.spawnT = 1.1;
    this.intermission = -1;
    sfx.waveHorn(isBoss || this.surge);
    const title = isBoss
      ? patriarch
        ? "THE PATRIARCH AWAKENS"
        : "ABOMINATION DETECTED"
      : this.surge
        ? "MUTATION SURGE"
        : n <= 10
          ? `WAVE ${n} / 10`
          : `OVERTIME — WAVE ${n}`;
    const sub = isBoss
      ? patriarch
        ? "FINAL ASSAULT — IT SHOOTS BACK"
        : "MASSIVE SIGNATURE — IT SHOOTS BACK"
      : this.surge
        ? `${total} MUTATED HOSTILES — FAST & TOXIC`
        : n > 10
          ? `${total} HOSTILES — ENDLESS PROTOCOL · ×1.5 SCORE`
          : `${total} HOSTILES INBOUND`;
    this.banner(title, sub, isBoss || this.surge ? "blood" : "toxic");
  }

  private waveCount(n: number): number {
    // waves 5-7 bite noticeably harder, pressure keeps climbing after
    const mid = n >= 5 ? 1 + (Math.min(n, 12) - 4) * 0.08 : 1;
    let total = Math.min(95, Math.floor((6 + n * 3.2 + Math.pow(n, 1.24)) * DIFFS[this.diffKey].count * mid));
    if (n % 5 === 0) total = Math.max(6, Math.floor(total * 0.55));
    return total;
  }

  private banner(text: string, sub: string, tone: BannerMsg["tone"]) {
    this.bannerKey++;
    store.set({ banner: { text, sub, tone, key: this.bannerKey } });
  }

  private hpScale() {
    const linear = 1 + (this.wave - 1) * 0.2;
    // waves 5-7 ramp hard, everything past wave 10 keeps compounding
    const mid = this.wave >= 5 ? Math.pow(1.06, Math.min(this.wave, 10) - 4) : 1;
    return this.wave > 10 ? linear * mid * Math.pow(1.07, this.wave - 10) : linear * mid;
  }

  private spdScale() {
    return 1 + Math.min(this.wave, 40) * 0.022;
  }

  private pickKind(): ZKind {
    const r = Math.random();
    if (this.surge) return r < 0.45 ? "spitter" : "runner";
    const pBrute = this.wave >= 4 ? Math.min(0.2, 0.05 + this.wave * 0.014) : 0;
    const pSpit = this.wave >= 3 ? Math.min(0.24, 0.07 + this.wave * 0.017) : 0;
    const pRun = this.wave >= 2 ? Math.min(0.34, 0.1 + this.wave * 0.024) : 0;
    if (r < pBrute) return "brute";
    if (r < pBrute + pSpit) return "spitter";
    if (r < pBrute + pSpit + pRun) return "runner";
    return "walker";
  }

  private makeZombie(kind: ZKind, x: number, y: number, hpMul: number): Zombie {
    const base = {
      x,
      y,
      vx: 0,
      vy: 0,
      phase: rand(0, 6.28),
      flashT: 0,
      atkT: 0,
      lungeT: 0,
      spitT: rand(1, 2.4),
      waypoint: null as { x: number; y: number } | null,
      waypointT: 0,
      prog: 0,
      lastD: 0,
      burnT: 0,
      burnDps: 0,
      dead: false,
    };
    const D = DIFFS[this.diffKey];
    const hs = this.hpScale() * hpMul * D.hp;
    const ss = this.spdScale() * D.spd;
    const ds = (1 + Math.max(0, this.wave - 1) * 0.035) * D.dmg;
    switch (kind) {
      case "runner":
        return { ...base, kind, r: 11, hp: 16 * hs, maxHp: 16 * hs, speed: rand(118, 148) * ss, dmg: 6 * ds, score: 15 };
      case "spitter":
        return { ...base, kind, r: 12, hp: 30 * hs, maxHp: 30 * hs, speed: rand(55, 68) * ss, dmg: 5 * ds, score: 25 };
      case "brute":
        return { ...base, kind, r: 24, hp: 150 * hs, maxHp: 150 * hs, speed: rand(34, 42) * ss, dmg: 22 * ds, score: 60 };
      case "boss": {
        const patriarch = this.wave >= 10;
        const bhp = patriarch
          ? 1700 * (1 + (Math.floor(this.wave / 10) - 1) * 0.5)
          : 950 * (1 + (this.wave / 5 - 1) * 0.4);
        return {
          ...base,
          kind,
          r: patriarch ? 50 : 44,
          hp: bhp * D.hp,
          maxHp: bhp * D.hp,
          speed: (patriarch ? 38 : 32) * ss,
          dmg: (patriarch ? 36 : 30) * ds,
          score: 500,
        };
      }
      default:
        return { ...base, kind, r: 14, hp: 26 * hs, maxHp: 26 * hs, speed: rand(52, 72) * ss, dmg: 8 * ds, score: 10 };
    }
  }

  private spawnEdgePos(margin: number): { x: number; y: number } {
    const R = Math.hypot(this.w, this.h) / 2 + margin;
    for (let i = 0; i < 24; i++) {
      const a = rand(0, Math.PI * 2);
      const x = clamp(this.px + Math.cos(a) * R, 30, WORLD_W - 30);
      const y = clamp(this.py + Math.sin(a) * R * 0.85, 30, WORLD_H - 30);
      // never spawn inside solid cover
      if (!this.pointInSolid(x, y, 20)) return { x, y };
    }
    return { x: CX, y: clamp(CY - 300, 30, WORLD_H - 30) };
  }

  private pointInSolid(x: number, y: number, pad: number): boolean {
    for (const o of this.obstacles) {
      if (o.low) continue;
      if (x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.h + pad) return true;
    }
    return false;
  }

  private spawnZombie() {
    const p = this.spawnEdgePos(70);
    const z = this.makeZombie(this.pickKind(), p.x, p.y, 1);
    const res = this.collideObs(z.x, z.y, z.r);
    z.x = res.x;
    z.y = res.y;
    this.zombies.push(z);
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        kind: "smoke",
        x: z.x,
        y: z.y,
        vx: rand(-30, 30),
        vy: rand(-40, -10),
        t: 0,
        life: rand(0.4, 0.7),
        size: rand(8, 16),
        color: "rgba(120,150,90,0.25)",
        rot: 0,
        vr: 0,
      });
    }
  }

  private spawnBoss() {
    const p = this.spawnEdgePos(140);
    const b = this.makeZombie("boss", p.x, p.y, 1);
    this.zombies.push(b);
    this.boss = b;
    this.addShake(10, 0.5);
  }

  /* ------------------------------ collision ------------------------------ */

  private collideObs(x: number, y: number, r: number): { x: number; y: number; hit: Obs | null } {
    let hit: Obs | null = null;
    for (const o of this.obstacles) {
      const nx = clamp(x, o.x, o.x + o.w);
      const ny = clamp(y, o.y, o.y + o.h);
      const dx = x - nx;
      const dy = y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        hit = o;
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          x = nx + (dx / d) * r;
          y = ny + (dy / d) * r;
        } else {
          const l = x - o.x;
          const rt = o.x + o.w - x;
          const tp = y - o.y;
          const bt = o.y + o.h - y;
          const m = Math.min(l, rt, tp, bt);
          if (m === l) x = o.x - r;
          else if (m === rt) x = o.x + o.w + r;
          else if (m === tp) y = o.y - r;
          else y = o.y + o.h + r;
        }
      }
    }
    return { x, y, hit };
  }

  private segHitsObs(x1: number, y1: number, x2: number, y2: number, o: Obs): boolean {
    let tmin = 0;
    let tmax = 1;
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (Math.abs(dx) < 1e-9) {
      if (x1 < o.x || x1 > o.x + o.w) return false;
    } else {
      let t1 = (o.x - x1) / dx;
      let t2 = (o.x + o.w - x1) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
    if (Math.abs(dy) < 1e-9) {
      if (y1 < o.y || y1 > o.y + o.h) return false;
    } else {
      let t1 = (o.y - y1) / dy;
      let t2 = (o.y + o.h - y1) / dy;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
    return true;
  }

  /* -------------------------------- update -------------------------------- */

  private update(dt: number) {
    if (this.phase === "menu") {
      this.updateAmbient(dt);
      this.updateParticles(dt);
      this.updateAtmos(dt);
      this.updateCamera(dt);
      this.updateFires(dt);
      return;
    }
    if (this.phase !== "playing" && this.phase !== "gameover") return;

    this.updateAtmos(dt);
    this.updateFires(dt);

    if (this.phase === "gameover") {
      this.updateZombies(dt, true);
      this.updateParticles(dt);
      this.updateTexts(dt);
      return;
    }

    this.runT += dt;
    this.muzzleT = Math.max(0, this.muzzleT - dt);
    this.hitT = Math.max(0, this.hitT - dt);
    this.hitKillT = Math.max(0, this.hitKillT - dt);
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.frenzyT = Math.max(0, this.frenzyT - dt);
    this.powerT = Math.max(0, this.powerT - dt);
    this.shieldT = Math.max(0, this.shieldT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt * 2.4);
    this.spreadKick = Math.max(0, this.spreadKick - dt * 3);
    this.comboT -= dt;
    if (this.comboT <= 0 && this.combo > 0) this.combo = 0;

    if (this.hp < 30 && !this.dead) {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        sfx.heart();
        this.heartT = 0.95;
      }
    }

    this.updatePlayer(dt);
    this.updateCamera(dt);
    this.updateFiring(dt);
    this.updateBullets(dt);
    this.updateWave(dt);
    this.updateZombies(dt, false);
    this.updateAcids(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);

    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.1;
      this.syncHud(false);
    }
  }

  private updateAtmos(dt: number) {
    for (const s of this.spores) {
      s.y -= s.vy * dt;
      s.x += Math.sin(this.time * 0.7 + s.ph) * 8 * dt;
      if (s.y < -6) {
        s.y = this.h + 6;
        s.x = rand(0, this.w);
      }
    }
    for (const f of this.fogs) {
      f.x += Math.sin(this.time * 0.05 + f.ph) * f.s * dt;
      f.y += Math.cos(this.time * 0.04 + f.ph) * f.s * 0.6 * dt;
      if (f.x < -f.r) f.x = this.w + f.r;
      if (f.x > this.w + f.r) f.x = -f.r;
      if (f.y < -f.r) f.y = this.h + f.r;
      if (f.y > this.h + f.r) f.y = -f.r;
    }
    this.shakeT = Math.max(0, this.shakeT - dt);
  }

  private updateFires(dt: number) {
    for (const o of this.obstacles) {
      if (!o.fire) continue;
      o.fireT -= dt;
      if (o.fireT <= 0) {
        o.fireT = rand(0.09, 0.16);
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        this.particles.push({
          kind: "smoke",
          x: cx + rand(-14, 14),
          y: cy + rand(-8, 8),
          vx: rand(-12, 12),
          vy: rand(-70, -38),
          t: 0,
          life: rand(0.7, 1.3),
          size: rand(7, 13),
          color: "rgba(60,60,58,0.3)",
          rot: 0,
          vr: 0,
        });
        if (Math.random() < 0.5) {
          this.particles.push({
            kind: "spark",
            x: cx + rand(-10, 10),
            y: cy + rand(-6, 6),
            vx: rand(-40, 40),
            vy: rand(-140, -60),
            t: 0,
            life: rand(0.2, 0.45),
            size: 1.6,
            color: "#ffb347",
            rot: 0,
            vr: 0,
          });
        }
      }
    }
  }

  private updateAmbient(dt: number) {
    for (const z of this.ambient) {
      if (!z.waypoint || dist2(z.x, z.y, z.waypoint.x, z.waypoint.y) < 900) {
        z.waypoint = { x: rand(120, WORLD_W - 120), y: rand(120, WORLD_H - 120) };
      }
      const a = Math.atan2(z.waypoint.y - z.y, z.waypoint.x - z.x);
      z.x += Math.cos(a) * z.speed * 0.4 * dt;
      z.y += Math.sin(a) * z.speed * 0.4 * dt;
      z.phase += dt * 3;
    }
  }

  private moveInput(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    if (this.touchVec.active) {
      x += this.touchVec.x;
      y += this.touchVec.y;
    }
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y };
  }

  private updatePlayer(dt: number) {
    if (this.dead) return;
    const mv = this.moveInput();
    this.moving = mv.x !== 0 || mv.y !== 0;
    if (this.moving) this.moveA = Math.atan2(mv.y, mv.x);

    // sprint + stamina
    const wantSprint = (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.touchSprint) && this.moving && this.dashT <= 0;
    if (wantSprint && this.canSprint && this.stamina > 0) {
      this.sprinting = true;
      this.stamina = Math.max(0, this.stamina - 30 * dt);
      if (this.stamina <= 0) this.canSprint = false;
    } else {
      this.sprinting = false;
      this.stamina = Math.min(100, this.stamina + 24 * dt);
      if (!this.canSprint && this.stamina >= 26) this.canSprint = true;
    }

    const spd = this.sprinting ? 400 : 262;
    const accel = 1 - Math.exp(-14 * dt);

    if (this.dashT > 0) {
      this.dashT -= dt;
      this.pvx = this.dashDx * 940;
      this.pvy = this.dashDy * 940;
      this.ghosts.push({ x: this.px, y: this.py, a: 0.5, aim: this.aim });
    } else {
      this.pvx += (mv.x * spd - this.pvx) * accel;
      this.pvy += (mv.y * spd - this.pvy) * accel;
    }
    this.px += this.pvx * dt;
    this.py += this.pvy * dt;

    const res = this.collideObs(this.px, this.py, 13);
    this.px = res.x;
    this.py = res.y;
    this.px = clamp(this.px, 26, WORLD_W - 26);
    this.py = clamp(this.py, 26, WORLD_H - 26);

    // footsteps + dust
    const vel = Math.hypot(this.pvx, this.pvy);
    if (vel > 40 && this.dashT <= 0) {
      this.runPhase += vel * dt * 0.085;
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = this.sprinting ? 0.23 : 0.34;
        sfx.step(this.sprinting);
        if (this.sprinting || Math.random() < 0.4) {
          this.particles.push({
            kind: "dust",
            x: this.px - Math.cos(this.moveA) * 10 + rand(-4, 4),
            y: this.py - Math.sin(this.moveA) * 10 + rand(-4, 4),
            vx: -Math.cos(this.moveA) * rand(10, 40) + rand(-14, 14),
            vy: -Math.sin(this.moveA) * rand(10, 40) + rand(-14, 14),
            t: 0,
            life: rand(0.3, 0.55),
            size: rand(2.4, 4.6),
            color: "rgba(150,145,115,0.16)",
            rot: 0,
            vr: 0,
          });
        }
      }
    }

    for (const g of this.ghosts) g.a -= dt * 2.4;
    this.ghosts = this.ghosts.filter((g) => g.a > 0);

    // aim (mouse is screen-space → convert to world)
    if (this.touchFiring) {
      let best: Zombie | null = null;
      let bd = 760 * 760;
      for (const z of this.zombies) {
        const d = dist2(z.x, z.y, this.px, this.py);
        if (d < bd) {
          bd = d;
          best = z;
        }
      }
      if (best) this.aim = Math.atan2(best.y - this.py, best.x - this.px);
    } else {
      const wx = this.cam.x - this.w / 2 + this.mouseX;
      const wy = this.cam.y - this.h / 2 + this.mouseY;
      this.aim = Math.atan2(wy - this.py, wx - this.px);
    }
  }

  private updateCamera(dt: number) {
    if (this.phase === "menu") {
      // slow cinematic drift over the sector
      const tx = CX + Math.cos(this.time * 0.07) * 460;
      const ty = CY + Math.sin(this.time * 0.052) * 330;
      const k = 1 - Math.exp(-1.4 * dt);
      this.cam.x += (tx - this.cam.x) * k;
      this.cam.y += (ty - this.cam.y) * k;
    } else if (this.phase === "playing") {
      const look = this.isTouch ? 0 : 86;
      const tx = this.px + Math.cos(this.aim) * look;
      const ty = this.py + Math.sin(this.aim) * look;
      const k = 1 - Math.exp(-6.5 * dt);
      this.cam.x += (tx - this.cam.x) * k;
      this.cam.y += (ty - this.cam.y) * k;
    }
    if (WORLD_W <= this.w) this.cam.x = WORLD_W / 2;
    else this.cam.x = clamp(this.cam.x, this.w / 2, WORLD_W - this.w / 2);
    if (WORLD_H <= this.h) this.cam.y = WORLD_H / 2;
    else this.cam.y = clamp(this.cam.y, this.h / 2, WORLD_H - this.h / 2);
  }

  private dash() {
    if (this.dashCd > 0 || this.dashT > 0 || this.dead) return;
    const mv = this.moveInput();
    let dx = mv.x;
    let dy = mv.y;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(this.aim);
      dy = Math.sin(this.aim);
    }
    const l = Math.hypot(dx, dy) || 1;
    this.dashDx = dx / l;
    this.dashDy = dy / l;
    this.dashT = 0.17;
    this.dashCd = 1.5;
    this.invulnT = Math.max(this.invulnT, 0.22);
    sfx.dash();
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        kind: "smoke",
        x: this.px - this.dashDx * 14,
        y: this.py - this.dashDy * 14,
        vx: -this.dashDx * rand(40, 130) + rand(-30, 30),
        vy: -this.dashDy * rand(40, 130) + rand(-30, 30),
        t: 0,
        life: rand(0.25, 0.45),
        size: rand(6, 12),
        color: "rgba(163,245,46,0.22)",
        rot: 0,
        vr: 0,
      });
    }
  }

  private weapon(): Weapon {
    return WEAPONS[this.tier];
  }

  private startReload() {
    if (this.reloadT >= 0 || this.ammo >= this.weapon().mag || this.dead) return;
    this.reloadT = this.weapon().reload * (this.frenzyT > 0 ? 0.7 : 1);
    sfx.reload();
  }

  private updateFiring(dt: number) {
    if (this.reloadT >= 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        this.reloadT = -1;
        this.ammo = this.weapon().mag;
        sfx.reloadDone();
      }
      return;
    }
    const wantFire = this.mouseDown || this.touchFiring;
    this.fireT -= dt;
    if (!wantFire || this.fireT > 0 || this.dead) return;
    if (this.ammo <= 0) {
      sfx.empty();
      this.startReload();
      this.fireT = 0.25;
      return;
    }
    const w = this.weapon();
    this.fireT = 1 / (w.rof * (this.frenzyT > 0 ? 1.7 : 1));
    this.ammo--;
    this.shots += w.pellets;
    const spread = w.spread + this.spreadKick * 0.05 + (this.sprinting ? 0.05 : 0) + (this.moving ? 0.02 : 0);
    const mOff = this.tier === 6 ? 30 : this.tier === 5 ? 27 : 24;
    const mx = this.px + Math.cos(this.aim) * mOff;
    const my = this.py + Math.sin(this.aim) * mOff;
    const dmgMul = this.powerT > 0 ? 1.75 : 1;
    const col =
      this.tier === 6 ? "#7ce7ff" : this.tier === 5 ? "#ff8b3d" : this.tier === 2 ? "#ffcf8a" : "#ffe9a8";
    const bw = this.tier === 6 ? 4 : this.tier === 5 ? 3.4 : this.tier === 2 ? 2.4 : 2;
    for (let i = 0; i < w.pellets; i++) {
      const a = this.aim + rand(-spread, spread);
      const spd = w.speed * rand(0.92, 1.08);
      this.bullets.push({
        x: mx,
        y: my,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        dmg: w.dmg * dmgMul * rand(0.9, 1.1),
        pierce: w.pierce,
        life: this.tier === 5 ? 0.55 : 0.95,
        hitIds: new Set(),
        col,
        w: bw,
      });
    }
    this.muzzleT = 0.05;
    this.muzzleX = mx;
    this.muzzleY = my;
    this.spreadKick = Math.min(1.6, this.spreadKick + 0.35);
    this.addShake(w.kick * 0.5, 0.09);
    this.px -= Math.cos(this.aim) * w.kick * 0.4;
    this.py -= Math.sin(this.aim) * w.kick * 0.4;
    sfx.shoot(this.tier);
    // shell casing
    const ea = this.aim + Math.PI / 2 + rand(-0.4, 0.4);
    this.particles.push({
      kind: "shell",
      x: this.px + Math.cos(this.aim) * 10,
      y: this.py + Math.sin(this.aim) * 10,
      vx: Math.cos(ea) * rand(90, 160),
      vy: Math.sin(ea) * rand(90, 160) - 60,
      t: 0,
      life: 0.9,
      size: 3,
      color: "#ffd166",
      rot: rand(0, 6.28),
      vr: rand(-14, 14),
    });
    if (this.ammo <= 0) this.startReload();
  }

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      const ox = b.x;
      const oy = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < -40 || b.x > WORLD_W + 40 || b.y < -40 || b.y > WORLD_H + 40) b.life = 0;
      // walls block bullets (low cover does not)
      for (const o of this.obstacles) {
        if (o.low) continue;
        if (this.segHitsObs(ox, oy, b.x, b.y, o)) {
          b.life = 0;
          for (let i = 0; i < 4; i++) {
            const a = Math.atan2(-b.vy, -b.vx) + rand(-0.8, 0.8);
            this.particles.push({
              kind: "spark",
              x: b.x,
              y: b.y,
              vx: Math.cos(a) * rand(60, 200),
              vy: Math.sin(a) * rand(60, 200),
              t: 0,
              life: rand(0.12, 0.28),
              size: 1.6,
              color: "#ffd9a0",
              rot: 0,
              vr: 0,
            });
          }
          if (Math.random() < 0.25) sfx.zHit();
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const z of this.zombies) {
        if (z.dead || b.hitIds.has(z)) continue;
        const rr = z.r + 4;
        if (dist2(b.x, b.y, z.x, z.y) < rr * rr) {
          b.hitIds.add(z);
          this.hits++;
          const crit = Math.random() < 0.12;
          const dmg = b.dmg * (crit ? 2 : 1);
          z.hp -= dmg;
          z.flashT = 0.09;
          const ka = Math.atan2(b.vy, b.vx);
          // incinerator rounds ignite the target
          if (this.tier === 5) {
            z.burnT = 2.2;
            z.burnDps = 9 * (this.powerT > 0 ? 1.75 : 1);
          }
          // railgun impact — cyan spark burst + shove
          if (b.w >= 4) {
            for (let i = 0; i < 6; i++) {
              const sa = ka + rand(-1.1, 1.1);
              this.particles.push({
                kind: "spark",
                x: b.x,
                y: b.y,
                vx: Math.cos(sa) * rand(120, 320),
                vy: Math.sin(sa) * rand(120, 320),
                t: 0,
                life: rand(0.15, 0.3),
                size: 1.8,
                color: "#7ce7ff",
                rot: 0,
                vr: 0,
              });
            }
            this.addShake(3, 0.1);
          }
          const kb = z.kind === "brute" || z.kind === "boss" ? 14 : 90;
          z.x += Math.cos(ka) * kb * 0.1;
          z.y += Math.sin(ka) * kb * 0.1;
          this.blood(b.x, b.y, ka, z.kind === "brute" || z.kind === "boss" ? 10 : 6);
          this.texts.push({
            x: z.x + rand(-10, 10),
            y: z.y - z.r - 6,
            text: String(Math.round(dmg)),
            color: crit ? "#ffd166" : "#e8f5d8",
            size: crit ? 21 : 14,
            t: 0,
            life: 0.7,
            crit,
          });
          this.hitT = 0.13;
          sfx.hitmark();
          if (Math.random() < 0.4) sfx.zHit();
          if (z.hp <= 0) this.killZombie(z, ka);
          if (b.pierce > 0) b.pierce--;
          else {
            b.life = 0;
            break;
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
  }

  private updateWave(dt: number) {
    if (this.intermission >= 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.startWave(this.wave + 1);
      return;
    }
    const aliveCap = Math.min(120, 26 + this.wave * 5);
    if (this.toSpawn > 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.zombies.length < aliveCap) {
        const burst =
          this.wave >= 8 && Math.random() < 0.3 ? 3 : this.wave >= 5 && Math.random() < 0.35 ? 2 : 1;
        for (let i = 0; i < burst && this.toSpawn > 0; i++) {
          this.spawnZombie();
          this.toSpawn--;
        }
        this.spawnT = Math.max(0.2, 1.3 - this.wave * 0.09) * rand(0.7, 1.3);
      }
    } else if (this.zombies.length === 0) {
      // wave cleared
      const cleared = this.wave;
      const heal = cleared >= 10 ? 40 : 10;
      this.hp = Math.min(this.maxHp, this.hp + heal);
      this.stamina = 100;
      if (cleared === 10) {
        this.banner("SECTOR PURGED", "ALL 10 WAVES CLEARED — OVERTIME: ENDLESS · ×1.5 SCORE", "toxic");
      } else {
        this.banner("WAVE CLEARED", `+${heal} HP RECOVERED — REGROUPING`, "bone");
      }
      sfx.waveClear();
      this.bumpUnlocked(cleared + 1);
      this.intermission = cleared === 10 ? 4 : 3;
    }
    // spawn boss alongside wave 5,10,... — exactly ONE per wave
    if (this.wave % 5 === 0 && !this.bossSpawned && !this.boss && this.toSpawn <= Math.floor(this.toSpawnInit() / 2)) {
      this.spawnBoss();
      this.bossSpawned = true;
    }
  }

  private toSpawnInit(): number {
    return this.waveCount(this.wave);
  }

  private updateZombies(dt: number, noPlayer: boolean) {
    const list = this.zombies;
    for (const z of list) {
      if (z.dead) continue;
      z.flashT = Math.max(0, z.flashT - dt);
      z.atkT = Math.max(0, z.atkT - dt);
      z.lungeT = Math.max(0, z.lungeT - dt);
      z.waypointT = Math.max(0, z.waypointT - dt);
      z.phase += dt * (z.kind === "runner" ? 11 : 5);

      // burning damage over time
      if (z.burnT > 0 && !noPlayer) {
        z.burnT -= dt;
        z.hp -= z.burnDps * dt;
        if (Math.random() < dt * 13) {
          this.particles.push({
            kind: "spark",
            x: z.x + rand(-z.r * 0.6, z.r * 0.6),
            y: z.y + rand(-z.r * 0.6, z.r * 0.6),
            vx: rand(-24, 24),
            vy: rand(-95, -40),
            t: 0,
            life: rand(0.2, 0.42),
            size: 2,
            color: Math.random() < 0.5 ? "#ff8b3d" : "#ffd166",
            rot: 0,
            vr: 0,
          });
        }
        if (z.hp <= 0 && !z.dead) {
          this.killZombie(z, rand(0, Math.PI * 2));
          continue;
        }
      }

      // steer toward waypoint (obstacle avoidance) or player
      let tx = this.px;
      let ty = this.py;
      if (z.waypoint && z.waypointT > 0) {
        tx = z.waypoint.x;
        ty = z.waypoint.y;
        if (dist2(z.x, z.y, tx, ty) < 42 * 42) {
          z.waypoint = null;
          tx = this.px;
          ty = this.py;
        }
      } else if (z.waypoint) {
        z.waypoint = null;
      }
      const d = Math.hypot(tx - z.x, ty - z.y) || 1;
      const dirX = (tx - z.x) / d;
      const dirY = (ty - z.y) / d;

      if (z.kind === "spitter" && !noPlayer && !z.waypoint) {
        z.spitT -= dt;
        const pd = Math.hypot(this.px - z.x, this.py - z.y) || 1;
        const want = 250;
        let mx = 0;
        let my = 0;
        const pdirX = (this.px - z.x) / pd;
        const pdirY = (this.py - z.y) / pd;
        if (pd > want + 40) {
          mx = pdirX;
          my = pdirY;
        } else if (pd < want - 60) {
          mx = -pdirX;
          my = -pdirY;
        } else {
          mx = -pdirY;
          my = pdirX;
        }
        z.x += mx * z.speed * dt;
        z.y += my * z.speed * dt;
        if (z.spitT <= 0 && pd < 620 && !this.dead) {
          z.spitT = rand(1.9, 2.7);
          const a = Math.atan2(this.py - z.y, this.px - z.x) + rand(-0.12, 0.12);
          this.acids.push({ x: z.x, y: z.y, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, life: 2.6, dmg: 10 * DIFFS[this.diffKey].dmg, big: false });
          sfx.spit();
          z.lungeT = 0.2;
        }
      } else {
        z.x += dirX * z.speed * dt;
        z.y += dirY * z.speed * dt;
      }

      // boss plasma volley — deadly at range, hits harder than spitter acid
      if (z.kind === "boss" && !noPlayer && !this.dead) {
        z.spitT -= dt;
        const pd = Math.hypot(this.px - z.x, this.py - z.y) || 1;
        if (z.spitT <= 0 && pd < 980) {
          const patriarch = this.wave >= 10;
          const n = patriarch ? 7 : 5;
          const baseA = Math.atan2(this.py - z.y, this.px - z.x);
          const spread = patriarch ? 0.66 : 0.5;
          const dd = DIFFS[this.diffKey].dmg;
          for (let i = 0; i < n; i++) {
            const a = baseA + (i - (n - 1) / 2) * (spread / Math.max(1, n - 1));
            this.acids.push({
              x: z.x,
              y: z.y,
              vx: Math.cos(a) * rand(300, 355),
              vy: Math.sin(a) * rand(300, 355),
              life: 2.6,
              dmg: (patriarch ? 20 : 15) * dd,
              big: true,
            });
          }
          sfx.plasma();
          this.addShake(4, 0.16);
          z.lungeT = 0.25;
          z.spitT = patriarch ? rand(1.7, 2.1) : rand(2.2, 2.7);
          // the Patriarch calls reinforcements
          if (patriarch && this.zombies.length < 70 && Math.random() < 0.45) {
            for (let i = 0; i < 2; i++) {
              const sa = rand(0, Math.PI * 2);
              const np = this.collideObs(
                clamp(z.x + Math.cos(sa) * 70, 20, WORLD_W - 20),
                clamp(z.y + Math.sin(sa) * 70, 20, WORLD_H - 20),
                11
              );
              this.zombies.push(this.makeZombie("runner", np.x, np.y, 1));
            }
            this.floatLabel(z.x, z.y - z.r - 22, "REINFORCEMENTS", "#ff4b52");
          }
        }
      }

      // collide with the world
      const res = this.collideObs(z.x, z.y, z.r);
      if (res.hit && !z.waypoint) {
        // route around the blocking obstacle via its best *free* corner
        const o = res.hit;
        const corners = [
          { x: o.x - z.r - 6, y: o.y - z.r - 6 },
          { x: o.x + o.w + z.r + 6, y: o.y - z.r - 6 },
          { x: o.x - z.r - 6, y: o.y + o.h + z.r + 6 },
          { x: o.x + o.w + z.r + 6, y: o.y + o.h + z.r + 6 },
        ].sort(
          (p, q) =>
            dist2(z.x, z.y, p.x, p.y) +
            dist2(p.x, p.y, this.px, this.py) -
            dist2(z.x, z.y, q.x, q.y) -
            dist2(q.x, q.y, this.px, this.py)
        );
        for (const cn of corners) {
          if (!this.pointInSolid(cn.x, cn.y, z.r)) {
            z.waypoint = cn;
            z.waypointT = 1.6;
            break;
          }
        }
      }
      z.x = res.x;
      z.y = res.y;

      // hostiles can never leave the sector (no more unreachable stragglers)
      z.x = clamp(z.x, 16, WORLD_W - 16);
      z.y = clamp(z.y, 16, WORLD_H - 16);

      // anti-stuck: if a hostile can't close distance for a while, it breaks through
      const pd = Math.hypot(this.px - z.x, this.py - z.y);
      if (!noPlayer && !this.dead && z.kind !== "spitter") {
        if (z.lastD > 0 && pd > z.lastD - z.speed * dt * 0.35) z.prog += dt;
        else z.prog = Math.max(0, z.prog - dt * 2);
        if (z.prog > 4.5 && pd > 300) {
          const a = rand(0, Math.PI * 2);
          const rr = rand(230, 320);
          const np = this.collideObs(
            clamp(this.px + Math.cos(a) * rr, 20, WORLD_W - 20),
            clamp(this.py + Math.sin(a) * rr, 20, WORLD_H - 20),
            z.r
          );
          z.x = np.x;
          z.y = np.y;
          z.waypoint = null;
          z.prog = 0;
          for (let i = 0; i < 4; i++) {
            this.particles.push({
              kind: "smoke",
              x: z.x,
              y: z.y,
              vx: rand(-40, 40),
              vy: rand(-50, -10),
              t: 0,
              life: rand(0.3, 0.5),
              size: rand(6, 11),
              color: "rgba(120,150,90,0.28)",
              rot: 0,
              vr: 0,
            });
          }
        }
      }
      z.lastD = pd;

      // wounded hostiles drip blood on the asphalt
      if (z.hp < z.maxHp * 0.45 && Math.random() < dt * 5) {
        this.goreDecals.push({ x: z.x + rand(-6, 6), y: z.y + rand(-6, 6), r: rand(1.6, 3.6), c: "rgba(92,12,18,0.5)" });
        if (this.goreDecals.length > 320) this.goreDecals.splice(0, this.goreDecals.length - 320);
      }

      // attack player
      if (!noPlayer && !this.dead) {
        const pr = z.r + 15;
        if (dist2(z.x, z.y, this.px, this.py) < pr * pr && z.atkT <= 0) {
          z.atkT = 0.9;
          z.lungeT = 0.22;
          this.damagePlayer(z.dmg, z.x, z.y, z.kind === "brute" || z.kind === "boss");
        }
      }
    }

    // separation
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.dead) continue;
        const rr = a.r + b.r;
        const d2 = dist2(a.x, a.y, b.x, b.y);
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const push = ((rr - d) / d) * 0.5;
          const wa = b.r / (a.r + b.r);
          const wb = a.r / (a.r + b.r);
          a.x -= (a.x - b.x) * push * wa * 1.6;
          a.y -= (a.y - b.y) * push * wa * 1.6;
          b.x += (a.x - b.x) * push * wb * 0.1;
          b.y += (a.y - b.y) * push * wb * 0.1;
        }
      }
    }
    this.zombies = list.filter((z) => !z.dead);
    if (this.boss && this.boss.dead) this.boss = null;
  }

  private updateAcids(dt: number) {
    for (const a of this.acids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.life -= dt;
      if (a.x < -20 || a.x > WORLD_W + 20 || a.y < -20 || a.y > WORLD_H + 20) {
        a.life = 0;
        continue;
      }
      const hitR = a.big ? 27 : 20;
      if (!this.dead && dist2(a.x, a.y, this.px, this.py) < hitR * hitR) {
        this.damagePlayer(a.dmg, a.x, a.y, a.big);
        sfx.acidHit();
        this.acidSplat(a.x, a.y);
        if (a.big) this.addShake(6, 0.2);
        a.life = 0;
      }
    }
    this.acids = this.acids.filter((a) => a.life > 0);
  }

  private updatePickups(dt: number) {
    for (const p of this.pickups) {
      p.t += dt;
      p.life -= dt;
      const rr = 26 + 15;
      if (dist2(p.x, p.y, this.px, this.py) < rr * rr) {
        p.life = 0;
        this.applyPickup(p);
      }
    }
    this.pickups = this.pickups.filter((p) => p.life > 0);
  }

  private applyPickup(p: Pickup) {
    switch (p.kind) {
      case "medkit":
        this.hp = Math.min(this.maxHp, this.hp + 32);
        sfx.medkit();
        this.floatLabel(p.x, p.y, "+32 HP", "#7dffa0");
        break;
      case "frenzy":
        this.frenzyT = 8;
        sfx.pickup();
        this.floatLabel(p.x, p.y, "FRENZY — FIRE RATE UP", "#ffd166");
        break;
      case "power":
        this.powerT = 8;
        sfx.pickup();
        this.floatLabel(p.x, p.y, "HOLLOW POINTS — DMG UP", "#ff9d5c");
        break;
      case "shield":
        this.shieldT = 6;
        sfx.pickup();
        this.floatLabel(p.x, p.y, "BARRIER SHIELD", "#6be3ff");
        break;
      case "nuke":
        sfx.nuke();
        this.floatLabel(p.x, p.y, "TACTICAL NUKE", "#d4ff4d");
        this.addShake(20, 0.6);
        this.freezeT = 0.09;
        this.particles.push({ kind: "ring", x: this.px, y: this.py, vx: 0, vy: 0, t: 0, life: 0.6, size: 10, color: "#d4ff4d", rot: 0, vr: 0 });
        for (const z of this.zombies) {
          if (z.dead) continue;
          z.hp -= 420;
          this.blood(z.x, z.y, rand(0, 6.28), 8);
          if (z.hp <= 0) this.killZombie(z, rand(0, 6.28));
        }
        break;
    }
  }

  private floatLabel(x: number, y: number, text: string, color: string) {
    this.texts.push({ x, y: y - 18, text, color, size: 15, t: 0, life: 1.1, crit: false });
  }

  private dropPickup(x: number, y: number, force?: PickupKind) {
    if (this.pickups.length >= 7 && !force) return;
    let kind: PickupKind;
    if (force) kind = force;
    else {
      // medkits are the primary supply drop — and the horde drops them far
      // more often while the operator is badly wounded
      const lowHp = this.hp < this.maxHp * 0.45;
      const r = Math.random();
      const pNuke = 0.012;
      const pMed = lowHp ? 0.17 : 0.105;
      const pFren = 0.05;
      const pPow = 0.05;
      const pShield = 0.03;
      if (r < pNuke) kind = "nuke";
      else if (r < pNuke + pMed) kind = "medkit";
      else if (r < pNuke + pMed + pFren) kind = "frenzy";
      else if (r < pNuke + pMed + pFren + pPow) kind = "power";
      else if (r < pNuke + pMed + pFren + pPow + pShield) kind = "shield";
      else return;
    }
    let px = clamp(x, 40, WORLD_W - 40);
    let py = clamp(y, 40, WORLD_H - 40);
    const res = this.collideObs(px, py, 16);
    px = res.x;
    py = res.y;
    this.pickups.push({ kind, x: px, y: py, t: rand(0, 3), life: 16 });
  }

  /* ------------------------------ combat core ------------------------------ */

  private blood(x: number, y: number, angle: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = angle + rand(-1.1, 1.1);
      const s = rand(60, 260);
      this.particles.push({
        kind: "blood",
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        t: 0,
        life: rand(0.25, 0.55),
        size: rand(1.6, 3.6),
        color: Math.random() < 0.5 ? "#a51420" : "#e5222e",
        rot: 0,
        vr: 0,
      });
    }
  }

  private acidSplat(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const a = rand(0, 6.28);
      const s = rand(30, 130);
      this.particles.push({
        kind: "acid",
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        t: 0,
        life: rand(0.25, 0.5),
        size: rand(2, 4),
        color: "#a8e62e",
        rot: 0,
        vr: 0,
      });
    }
  }

  private goreSplat(x: number, y: number, big: boolean) {
    const n = big ? 10 : 6;
    for (let i = 0; i < n; i++) {
      const a = rand(0, 6.28);
      const d = rand(0, big ? 36 : 20);
      this.goreDecals.push({
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        r: rand(3, big ? 15 : 9),
        c: Math.random() < 0.5 ? "rgba(96,10,16,0.5)" : "rgba(140,16,24,0.42)",
      });
    }
    if (this.goreDecals.length > 320) this.goreDecals.splice(0, this.goreDecals.length - 320);
  }

  private killZombie(z: Zombie, angle: number) {
    if (z.dead) return;
    z.dead = true;
    this.hitKillT = 0.2;
    sfx.killTick();
    const big = z.kind === "brute" || z.kind === "boss";
    this.kills++;
    this.combo++;
    this.comboT = COMBO_WINDOW;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    if (this.combo > 1 && this.combo % 5 === 0) {
      sfx.combo(this.combo);
      this.floatLabel(z.x, z.y - 20, `KILL STREAK ×${this.combo}`, "#d4ff4d");
    }
    const mult = 1 + Math.min(this.combo, 40) * 0.1;
    const gained = Math.round(z.score * mult * DIFFS[this.diffKey].score * (this.wave > 10 ? 1.5 : 1));
    this.score += gained;
    this.texts.push({
      x: z.x,
      y: z.y - z.r - 16,
      text: `+${gained}`,
      color: "#a3f52e",
      size: big ? 19 : 13,
      t: 0,
      life: 0.9,
      crit: false,
    });

    // gore + particles
    this.goreSplat(z.x, z.y, big);
    this.blood(z.x, z.y, angle, big ? 18 : 9);
    for (let i = 0; i < (big ? 7 : 3); i++) {
      this.particles.push({
        kind: "chunk",
        x: z.x,
        y: z.y,
        vx: rand(-160, 160),
        vy: rand(-200, -40),
        t: 0,
        life: rand(0.4, 0.7),
        size: rand(2.5, big ? 6 : 4.5),
        color: "#7a1420",
        rot: rand(0, 6.28),
        vr: rand(-10, 10),
      });
    }
    sfx.zDie(big);
    sfx.splat();
    this.freezeT = Math.max(this.freezeT, big ? 0.055 : 0.028);
    this.addShake(big ? 7 : 2.5, 0.18);

    // drops
    if (z.kind === "boss") {
      this.dropPickup(z.x - 30, z.y, "medkit");
      this.dropPickup(z.x + 30, z.y - 20, "power");
      this.dropPickup(z.x, z.y + 30, "frenzy");
    } else {
      this.dropPickup(z.x, z.y);
    }

    this.checkTier();
  }

  private checkTier() {
    let t = 0;
    for (let i = 0; i < TIER_AT.length; i++) if (this.kills >= TIER_AT[i]) t = i;
    if (t > this.tier) {
      this.tier = t;
      const w = WEAPONS[t];
      this.ammo = w.mag;
      this.reloadT = -1;
      this.fireT = 0.2;
      sfx.tierUp();
      this.banner("WEAPON UPGRADED", w.name, "toxic");
      this.floatLabel(this.px, this.py - 40, w.name, "#d4ff4d");
    }
  }

  private damagePlayer(amount: number, sx: number, sy: number, heavy: boolean) {
    if (this.invulnT > 0 || this.dashT > 0 || this.dead) return;
    if (this.shieldT > 0) {
      sfx.acidHit();
      this.addShake(3, 0.12);
      for (let i = 0; i < 8; i++) {
        const a = Math.atan2(this.py - sy, this.px - sx) + rand(-0.9, 0.9);
        this.particles.push({
          kind: "spark",
          x: this.px + Math.cos(a) * 20,
          y: this.py + Math.sin(a) * 20,
          vx: Math.cos(a) * rand(80, 220),
          vy: Math.sin(a) * rand(80, 220),
          t: 0,
          life: 0.3,
          size: 2,
          color: "#6be3ff",
          rot: 0,
          vr: 0,
        });
      }
      return;
    }
    this.hp -= amount;
    this.invulnT = 0.7;
    this.hurtT = 1;
    this.combo = 0;
    sfx.hurt();
    this.addShake(heavy ? 13 : 8, 0.3);
    // knockback
    const a = Math.atan2(this.py - sy, this.px - sx);
    const kb = heavy ? 130 : 60;
    this.px = clamp(this.px + Math.cos(a) * kb * 0.3, 26, WORLD_W - 26);
    this.py = clamp(this.py + Math.sin(a) * kb * 0.3, 26, WORLD_H - 26);
    const res = this.collideObs(this.px, this.py, 13);
    this.px = res.x;
    this.py = res.y;
    this.blood(this.px, this.py, a, 6);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  private die() {
    this.dead = true;
    sfx.gameOver();
    sfx.stopDrone();
    this.goreSplat(this.px, this.py, true);
    for (let i = 0; i < 26; i++) {
      const a = rand(0, 6.28);
      const s = rand(60, 320);
      this.particles.push({
        kind: i % 3 === 0 ? "chunk" : "blood",
        x: this.px,
        y: this.py,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        t: 0,
        life: rand(0.4, 0.9),
        size: rand(2, 5),
        color: i % 2 === 0 ? "#a51420" : "#e5222e",
        rot: rand(0, 6.28),
        vr: rand(-8, 8),
      });
    }
    this.addShake(18, 0.7);
    this.freezeT = 0.12;
    const { best, bestWave } = loadBest();
    const newBest = this.score > best;
    saveBest(this.score, this.wave);
    // the wave you fell on stays selectable — no forced restart from zero
    this.deadWave = this.wave;
    this.bumpUnlocked(this.wave);
    const stats = {
      score: this.score,
      wave: this.wave,
      kills: this.kills,
      maxCombo: this.maxCombo,
      accuracy: this.shots > 0 ? clamp(this.hits / this.shots, 0, 1) : 0,
      time: this.runT,
      newBest,
      best: Math.max(best, this.score),
      bestWave: Math.max(bestWave, this.wave),
    };
    setTimeout(() => {
      if (this.destroyed) return;
      this.phase = "gameover";
      store.set({ phase: "gameover", stats });
      this.syncHud(true);
    }, 900);
  }

  private addShake(mag: number, t: number) {
    this.shakeMag = Math.max(this.shakeMag * (this.shakeT > 0 ? 1 : 0), mag);
    this.shakeT = Math.max(this.shakeT, t);
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.t += dt;
      if (p.kind === "shell" || p.kind === "chunk") p.vy += 640 * dt;
      if (p.kind === "blood" || p.kind === "acid") {
        p.vx *= 1 - 6 * dt;
        p.vy *= 1 - 6 * dt;
      }
      if (p.kind === "smoke" || p.kind === "dust") p.vy -= 20 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.t < p.life);
    if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
  }

  private updateTexts(dt: number) {
    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter((t) => t.t < t.life);
  }

  /* --------------------------------- HUD sync --------------------------------- */

  private syncHud(force: boolean) {
    const w = this.weapon();
    const nextAt = this.tier < TIER_AT.length - 1 ? TIER_AT[this.tier + 1] : 0;
    const prevAt = TIER_AT[this.tier];
    let patch: Parameters<typeof store.set>[0];
    if (force) {
      patch = { phase: this.phase };
    } else {
      patch = {};
    }
    patch = {
      ...patch,
      hp: Math.ceil(this.hp),
      maxHp: this.maxHp,
      shield: this.shieldT,
      score: this.score,
      best: Math.max(loadBest().best, this.score),
      bestWave: loadBest().bestWave,
      wave: this.wave,
      left: this.toSpawn + this.zombies.length,
      kills: this.kills,
      tierKills: nextAt === 0 ? 0 : nextAt - this.kills,
      tierProgress: nextAt === 0 ? 1 : clamp((this.kills - prevAt) / (nextAt - prevAt), 0, 1),
      weapon: w.name,
      weaponTier: this.tier,
      ammo: this.ammo,
      mag: w.mag,
      reloading: this.reloadT >= 0 ? 1 - this.reloadT / (w.reload * (this.frenzyT > 0 ? 0.7 : 1)) : -1,
      combo: this.combo,
      comboMult: 1 + Math.min(this.combo, 40) * 0.1,
      comboFrac: this.combo > 0 ? clamp(this.comboT / COMBO_WINDOW, 0, 1) : 0,
      dashFrac: 1 - clamp(this.dashCd / 1.5, 0, 1),
      stamina: this.stamina,
      sprinting: this.sprinting,
      buffs: { frenzy: this.frenzyT, power: this.powerT, shield: this.shieldT },
      boss:
        this.boss && !this.boss.dead
          ? { name: this.wave >= 10 ? "THE PATRIARCH" : "THE ABOMINATION", frac: clamp(this.boss.hp / this.boss.maxHp, 0, 1) }
          : null,
      hurt: this.hurtT,
      lowHp: this.hp > 0 && this.hp < 30,
      time: this.runT,
      difficulty: this.diffKey,
    };
    store.set(patch);
  }

  /* --------------------------------- render --------------------------------- */

  private vis(x: number, y: number, m: number): boolean {
    return (
      x > this.cam.x - this.w / 2 - m &&
      x < this.cam.x + this.w / 2 + m &&
      y > this.cam.y - this.h / 2 - m &&
      y < this.cam.y + this.h / 2 + m
    );
  }

  private render() {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    let ox = 0;
    let oy = 0;
    if (this.shakeT > 0) {
      const m = this.shakeMag * (this.shakeT > 0.15 ? 1 : this.shakeT / 0.15);
      ox = rand(-m, m);
      oy = rand(-m, m);
    } else {
      this.shakeMag = 0;
    }

    c.save();
    c.translate(Math.round(this.w / 2 - this.cam.x + ox), Math.round(this.h / 2 - this.cam.y + oy));

    const vx0 = this.cam.x - this.w / 2 - 60;
    const vy0 = this.cam.y - this.h / 2 - 60;
    const vx1 = this.cam.x + this.w / 2 + 60;
    const vy1 = this.cam.y + this.h / 2 + 60;

    this.drawGround(c, vx0, vy0, vx1, vy1);
    this.drawObstacles(c);

    if (this.phase === "menu") {
      for (const z of this.ambient) if (this.vis(z.x, z.y, 60)) this.drawZombie(c, z);
    } else {
      this.drawPickups(c);
      for (const z of this.zombies) if (this.vis(z.x, z.y, 80)) this.drawZombie(c, z);
      if (!this.dead) this.drawPlayer(c);
      this.drawBullets(c);
      this.drawAcids(c);
    }

    this.drawParticles(c);
    this.drawDarkness(c, vx0, vy0, vx1, vy1);
    this.drawLights(c);
    this.drawTexts(c);

    c.restore();

    // screen-space atmosphere
    this.drawFog(c);
    this.drawSpores(c);
    if (this.phase !== "menu") {
      this.drawIndicators(c);
      this.drawMinimap(c);
    }
    if (this.phase === "playing" && !this.isTouch) this.drawCrosshair(c);
  }

  private drawGround(c: CanvasRenderingContext2D, vx0: number, vy0: number, vx1: number, vy1: number) {
    // void beyond the sector
    c.fillStyle = "#05080a";
    c.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);

    // sector floor
    const gx0 = Math.max(0, vx0);
    const gy0 = Math.max(0, vy0);
    const gx1 = Math.min(WORLD_W, vx1);
    const gy1 = Math.min(WORLD_H, vy1);
    if (this.tile) {
      c.fillStyle = this.tile;
      c.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    }

    // roads
    const roadY0 = ROAD_Y - ROAD_HALF;
    const roadY1 = ROAD_Y + ROAD_HALF;
    const roadX0 = ROAD_X - VROAD_HALF;
    const roadX1 = ROAD_X + VROAD_HALF;
    c.fillStyle = "#0b0e0b";
    if (vy1 > roadY0 && vy0 < roadY1) c.fillRect(gx0, roadY0, gx1 - gx0, roadY1 - roadY0);
    if (vx1 > roadX0 && vx0 < roadX1) c.fillRect(roadX0, gy0, roadX1 - roadX0, gy1 - gy0);
    c.strokeStyle = "rgba(232,224,200,0.07)";
    c.lineWidth = 3;
    if (vy1 > roadY0 && vy0 < roadY1) {
      c.beginPath();
      c.moveTo(gx0, roadY0);
      c.lineTo(gx1, roadY0);
      c.moveTo(gx0, roadY1);
      c.lineTo(gx1, roadY1);
      c.stroke();
    }
    if (vx1 > roadX0 && vx0 < roadX1) {
      c.beginPath();
      c.moveTo(roadX0, gy0);
      c.lineTo(roadX0, gy1);
      c.moveTo(roadX1, gy0);
      c.lineTo(roadX1, gy1);
      c.stroke();
    }
    // lane dashes
    c.fillStyle = "rgba(210,220,160,0.09)";
    const dx0 = Math.max(0, vx0);
    const dx1 = Math.min(WORLD_W, vx1);
    for (let x = Math.floor(dx0 / 90) * 90; x < dx1; x += 90) {
      if (x > roadX0 - 60 && x < roadX1 + 20) continue;
      c.fillRect(x, ROAD_Y - 2.5, 46, 5);
    }
    const dy0 = Math.max(0, vy0);
    const dy1 = Math.min(WORLD_H, vy1);
    for (let y = Math.floor(dy0 / 90) * 90; y < dy1; y += 90) {
      if (y > roadY0 - 60 && y < roadY1 + 20) continue;
      c.fillRect(ROAD_X - 2.5, y, 5, 46);
    }

    // decals
    for (const d of this.decals) {
      if (!this.vis(d.x, d.y, d.r + 60)) continue;
      switch (d.k) {
        case "grass": {
          c.fillStyle = "rgba(29,41,23,0.55)";
          c.beginPath();
          c.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          c.arc(d.x + d.r * 0.6, d.y + d.r * 0.3, d.r * 0.66, 0, Math.PI * 2);
          c.arc(d.x - d.r * 0.5, d.y + d.r * 0.45, d.r * 0.55, 0, Math.PI * 2);
          c.fill();
          break;
        }
        case "crater": {
          c.fillStyle = "rgba(6,9,6,0.75)";
          c.beginPath();
          c.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = "rgba(0,0,0,0.5)";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(d.x, d.y, d.r * 0.72, 0, Math.PI * 2);
          c.stroke();
          c.strokeStyle = "rgba(150,160,130,0.08)";
          c.lineWidth = 2;
          c.beginPath();
          c.arc(d.x, d.y, d.r, -2.4, -0.6);
          c.stroke();
          break;
        }
        case "crack": {
          c.strokeStyle = "rgba(0,0,0,0.35)";
          c.lineWidth = 1.4;
          c.beginPath();
          c.moveTo(d.x, d.y);
          const pts = d.pts ?? [];
          for (let i = 0; i < pts.length; i += 2) c.lineTo(d.x + pts[i], d.y + pts[i + 1]);
          c.stroke();
          break;
        }
        case "rubble": {
          c.fillStyle = "rgba(62,68,62,0.8)";
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + d.r;
            c.beginPath();
            c.arc(d.x + Math.cos(a) * d.r * 0.6, d.y + Math.sin(a) * d.r * 0.5, d.r * 0.42, 0, Math.PI * 2);
            c.fill();
          }
          c.fillStyle = "rgba(40,44,40,0.9)";
          c.beginPath();
          c.arc(d.x, d.y, d.r * 0.4, 0, Math.PI * 2);
          c.fill();
          break;
        }
        case "oil": {
          c.fillStyle = "rgba(4,7,9,0.5)";
          c.beginPath();
          c.ellipse(d.x, d.y, d.r * 1.7, d.r, 0.4, 0, Math.PI * 2);
          c.fill();
          break;
        }
        case "bone": {
          c.fillStyle = "rgba(214,206,178,0.14)";
          c.save();
          c.translate(d.x, d.y);
          c.rotate(d.r);
          c.fillRect(-d.r, -1.4, d.r * 2, 2.8);
          c.fillRect(-1.4, -d.r * 0.7, 2.8, d.r * 1.4);
          c.restore();
          break;
        }
      }
    }

    // persistent gore
    for (const gd of this.goreDecals) {
      if (!this.vis(gd.x, gd.y, gd.r + 20)) continue;
      c.fillStyle = gd.c;
      c.beginPath();
      c.arc(gd.x, gd.y, gd.r, 0, Math.PI * 2);
      c.fill();
    }

    // drop-zone plaza markings
    if (this.vis(CX, CY, 340)) {
      c.strokeStyle = "rgba(163,245,46,0.09)";
      c.lineWidth = 3;
      c.setLineDash([26, 18]);
      c.beginPath();
      c.arc(CX, CY, 240, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.font = "700 26px Oxanium, monospace";
      c.textAlign = "center";
      c.fillStyle = "rgba(163,245,46,0.09)";
      c.fillText("SECTOR 9 // DROP ZONE", CX, CY - 258);
      c.fillStyle = "rgba(229,34,46,0.08)";
      c.font = "700 18px Oxanium, monospace";
      c.fillText("NO EXIT — AUTHORIZED PERSONNEL ONLY", CX, CY + 282);
    }

    // perimeter fence
    c.strokeStyle = "rgba(0,0,0,0.6)";
    c.lineWidth = 8;
    c.strokeRect(-6, -6, WORLD_W + 12, WORLD_H + 12);
    c.strokeStyle = "rgba(163,245,46,0.22)";
    c.lineWidth = 4;
    c.setLineDash([30, 20]);
    c.strokeRect(0, 0, WORLD_W, WORLD_H);
    c.setLineDash([]);
    // fence posts
    c.fillStyle = "#1a2416";
    for (let x = 0; x <= WORLD_W; x += 170) {
      c.fillRect(x - 5, -11, 10, 22);
      c.fillRect(x - 5, WORLD_H - 11, 10, 22);
    }
    for (let y = 170; y < WORLD_H; y += 170) {
      c.fillRect(-11, y - 5, 22, 10);
      c.fillRect(WORLD_W - 11, y - 5, 22, 10);
    }
    // blinking perimeter warning lamps
    const lampOn = Math.sin(this.time * 3.2) > -0.2 ? 1 : 0.15;
    c.fillStyle = `rgba(229,34,46,${0.6 * lampOn})`;
    for (const [lx, ly] of [
      [0, 0],
      [WORLD_W, 0],
      [0, WORLD_H],
      [WORLD_W, WORLD_H],
    ] as const) {
      c.beginPath();
      c.arc(lx, ly, 7, 0, Math.PI * 2);
      c.fill();
    }
  }

  private drawObstacles(c: CanvasRenderingContext2D) {
    // shadows
    for (const o of this.obstacles) {
      if (!this.vis(o.x + o.w / 2, o.y + o.h / 2, Math.max(o.w, o.h))) continue;
      c.fillStyle = "rgba(0,0,0,0.35)";
      c.fillRect(o.x + 7, o.y + 10, o.w, o.h);
    }
    for (const o of this.obstacles) {
      if (!this.vis(o.x + o.w / 2, o.y + o.h / 2, Math.max(o.w, o.h))) continue;
      switch (o.kind) {
        case "building": {
          c.fillStyle = o.col;
          c.fillRect(o.x, o.y, o.w, o.h);
          c.strokeStyle = "rgba(0,0,0,0.55)";
          c.lineWidth = 3;
          c.strokeRect(o.x, o.y, o.w, o.h);
          c.strokeStyle = "rgba(255,255,255,0.05)";
          c.lineWidth = 2;
          c.strokeRect(o.x + 10, o.y + 10, o.w - 20, o.h - 20);
          // roof furniture
          c.fillStyle = o.col2;
          c.fillRect(o.x + 24, o.y + 22, 44, 34);
          c.fillRect(o.x + o.w - 78, o.y + o.h - 62, 52, 40);
          c.strokeStyle = "rgba(0,0,0,0.4)";
          c.lineWidth = 1.5;
          for (let i = 1; i < 4; i++) {
            c.beginPath();
            c.moveTo(o.x + 24, o.y + 22 + i * 8.5);
            c.lineTo(o.x + 68, o.y + 22 + i * 8.5);
            c.stroke();
          }
          // roof vents + pipe run
          c.fillStyle = o.col2;
          c.beginPath();
          c.arc(o.x + o.w * 0.5 + 42, o.y + 32, 10, 0, Math.PI * 2);
          c.arc(o.x + o.w * 0.5 + 66, o.y + 32, 7, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = "rgba(0,0,0,0.4)";
          c.lineWidth = 4;
          c.beginPath();
          c.moveTo(o.x + 30, o.y + o.h * 0.52);
          c.lineTo(o.x + o.w - 40, o.y + o.h * 0.52);
          c.stroke();
          // flickering toxic skylight
          const sky = 0.5 + 0.5 * Math.sin(this.time * 2.6 + o.seed);
          c.fillStyle = `rgba(163,245,46,${0.05 + sky * 0.08})`;
          c.fillRect(o.x + o.w * 0.3, o.y + o.h * 0.68, 26, 18);
          c.strokeStyle = "rgba(0,0,0,0.5)";
          c.lineWidth = 2;
          c.strokeRect(o.x + o.w * 0.3, o.y + o.h * 0.68, 26, 18);
          if (o.seed % 3 === 0) {
            c.strokeStyle = "rgba(163,245,46,0.12)";
            c.lineWidth = 3;
            c.beginPath();
            c.arc(o.x + o.w / 2, o.y + o.h / 2, Math.min(o.w, o.h) * 0.2, 0, Math.PI * 2);
            c.stroke();
            c.fillStyle = "rgba(163,245,46,0.1)";
            c.beginPath();
            c.arc(o.x + o.w / 2, o.y + o.h / 2, 7, 0, Math.PI * 2);
            c.fill();
          }
          break;
        }
        case "container": {
          c.fillStyle = o.col;
          c.fillRect(o.x, o.y, o.w, o.h);
          c.strokeStyle = "rgba(0,0,0,0.5)";
          c.lineWidth = 2.5;
          c.strokeRect(o.x, o.y, o.w, o.h);
          c.strokeStyle = "rgba(0,0,0,0.25)";
          c.lineWidth = 2;
          if (o.w > o.h) {
            for (let x = o.x + 14; x < o.x + o.w - 8; x += 15) {
              c.beginPath();
              c.moveTo(x, o.y + 3);
              c.lineTo(x, o.y + o.h - 3);
              c.stroke();
            }
          } else {
            for (let y = o.y + 14; y < o.y + o.h - 8; y += 15) {
              c.beginPath();
              c.moveTo(o.x + 3, y);
              c.lineTo(o.x + o.w - 3, y);
              c.stroke();
            }
          }
          c.fillStyle = o.col2;
          c.fillRect(o.x, o.y, 8, o.h);
          c.fillRect(o.x + o.w - 8, o.y, 8, o.h);
          break;
        }
        case "car": {
          c.fillStyle = o.col;
          c.fillRect(o.x, o.y, o.w, o.h);
          c.strokeStyle = "rgba(0,0,0,0.55)";
          c.lineWidth = 2;
          c.strokeRect(o.x, o.y, o.w, o.h);
          c.fillStyle = o.col2;
          if (o.w > o.h) {
            c.fillRect(o.x + o.w * 0.24, o.y + 5, o.w * 0.42, o.h - 10);
            c.fillStyle = "rgba(140,180,190,0.12)";
            c.fillRect(o.x + o.w * 0.66, o.y + 5, o.w * 0.12, o.h - 10);
          } else {
            c.fillRect(o.x + 5, o.y + o.h * 0.24, o.w - 10, o.h * 0.42);
            c.fillStyle = "rgba(140,180,190,0.12)";
            c.fillRect(o.x + 5, o.y + o.h * 0.66, o.w - 10, o.h * 0.12);
          }
          if (o.fire) {
            const fx = o.x + o.w / 2;
            const fy = o.y + o.h / 2;
            const fl = 0.7 + 0.3 * Math.sin(this.time * 23 + o.seed);
            c.fillStyle = `rgba(255,120,30,${0.5 * fl})`;
            c.beginPath();
            c.moveTo(fx - 10, fy + 6);
            c.lineTo(fx - 2, fy - 14 * fl);
            c.lineTo(fx + 4, fy + 6);
            c.closePath();
            c.fill();
            c.fillStyle = `rgba(255,220,110,${0.55 * fl})`;
            c.beginPath();
            c.moveTo(fx - 4, fy + 6);
            c.lineTo(fx + 1, fy - 7 * fl);
            c.lineTo(fx + 6, fy + 6);
            c.closePath();
            c.fill();
          }
          break;
        }
        case "barrier": {
          c.fillStyle = o.col;
          c.fillRect(o.x, o.y, o.w, o.h);
          c.strokeStyle = "rgba(0,0,0,0.5)";
          c.lineWidth = 2;
          c.strokeRect(o.x, o.y, o.w, o.h);
          c.save();
          c.beginPath();
          c.rect(o.x, o.y, o.w, o.h);
          c.clip();
          c.fillStyle = "rgba(201,162,39,0.4)";
          const horiz = o.w > o.h;
          for (let i = -1; i < (horiz ? o.w : o.h) / 18 + 1; i++) {
            c.save();
            if (horiz) {
              c.translate(o.x + i * 18, o.y);
              c.transform(1, 0, -0.6, 1, 0, 0);
              c.fillRect(0, 0, 9, o.h);
            } else {
              c.translate(o.x, o.y + i * 18);
              c.transform(1, 0, 0, 1, 0, 0);
              c.fillRect(0, 0, o.w, 9);
            }
            c.restore();
          }
          c.restore();
          break;
        }
        case "sandbag": {
          c.fillStyle = o.col;
          c.fillRect(o.x, o.y, o.w, o.h);
          c.strokeStyle = "rgba(0,0,0,0.45)";
          c.lineWidth = 2;
          c.strokeRect(o.x, o.y, o.w, o.h);
          c.fillStyle = o.col2;
          const horiz = o.w > o.h;
          if (horiz) {
            for (let x = o.x + 4; x < o.x + o.w - 12; x += 22) {
              c.beginPath();
              c.ellipse(x + 9, o.y + o.h * 0.3, 10, 5, 0, 0, Math.PI * 2);
              c.fill();
              c.beginPath();
              c.ellipse(x + 16, o.y + o.h * 0.72, 10, 5, 0, 0, Math.PI * 2);
              c.fill();
            }
          } else {
            for (let y = o.y + 4; y < o.y + o.h - 12; y += 22) {
              c.beginPath();
              c.ellipse(o.x + o.w * 0.3, y + 9, 5, 10, 0, 0, Math.PI * 2);
              c.fill();
              c.beginPath();
              c.ellipse(o.x + o.w * 0.72, y + 16, 5, 10, 0, 0, Math.PI * 2);
              c.fill();
            }
          }
          break;
        }
        case "crate": {
          c.fillStyle = o.col;
          c.fillRect(o.x, o.y, o.w, o.h);
          c.strokeStyle = "rgba(0,0,0,0.5)";
          c.lineWidth = 2;
          c.strokeRect(o.x, o.y, o.w, o.h);
          c.beginPath();
          c.moveTo(o.x, o.y);
          c.lineTo(o.x + o.w, o.y + o.h);
          c.moveTo(o.x + o.w, o.y);
          c.lineTo(o.x, o.y + o.h);
          c.stroke();
          c.fillStyle = "rgba(163,245,46,0.2)";
          c.beginPath();
          c.arc(o.x + o.w / 2, o.y + o.h / 2, 4, 0, Math.PI * 2);
          c.fill();
          break;
        }
      }
    }
    // lamp posts
    for (const l of this.lamps) {
      if (!this.vis(l.x, l.y, 40)) continue;
      c.fillStyle = "#0a0d0a";
      c.beginPath();
      c.arc(l.x, l.y, 5, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#151a14";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(l.x, l.y);
      c.lineTo(l.x, l.y + (l.y < ROAD_Y ? 14 : -14));
      c.stroke();
      c.fillStyle = "rgba(255,224,150,0.75)";
      c.beginPath();
      c.arc(l.x, l.y, 2.4, 0, Math.PI * 2);
      c.fill();
    }
  }

  private drawDarkness(c: CanvasRenderingContext2D, vx0: number, vy0: number, vx1: number, vy1: number) {
    const lx = this.phase === "menu" ? this.cam.x : this.px;
    const ly = this.phase === "menu" ? this.cam.y : this.py;
    const flicker = 1 + Math.sin(this.time * 11) * 0.015 + Math.sin(this.time * 3.7) * 0.02;
    // nightfall: the sector gets darker as waves climb
    const night = this.phase === "menu" ? 0 : Math.min(1, Math.max(0, this.wave - 6) * 0.055);
    const inner = (120 - night * 30) * flicker;
    const outer = 900 - night * 170;
    const gr = c.createRadialGradient(lx, ly, inner, lx, ly, outer);
    gr.addColorStop(0, "rgba(3,7,5,0)");
    gr.addColorStop(0.45, `rgba(3,7,5,${0.34 + night * 0.1})`);
    gr.addColorStop(1, `rgba(2,5,3,${0.9 + night * 0.05})`);
    c.fillStyle = gr;
    c.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  }

  private drawLights(c: CanvasRenderingContext2D) {
    c.save();
    c.globalCompositeOperation = "lighter";

    // player flashlight cone toward aim
    if (!this.dead && this.phase !== "menu") {
      const flick = 0.92 + 0.08 * Math.sin(this.time * 13);
      const cone = c.createRadialGradient(this.px, this.py, 20, this.px, this.py, 470);
      cone.addColorStop(0, `rgba(214,255,170,${0.13 * flick})`);
      cone.addColorStop(1, "rgba(214,255,170,0)");
      c.fillStyle = cone;
      c.beginPath();
      c.moveTo(this.px, this.py);
      c.arc(this.px, this.py, 470, this.aim - 0.44, this.aim + 0.44);
      c.closePath();
      c.fill();
      const halo = c.createRadialGradient(this.px, this.py, 0, this.px, this.py, 240);
      halo.addColorStop(0, "rgba(190,240,150,0.07)");
      halo.addColorStop(1, "rgba(190,240,150,0)");
      c.fillStyle = halo;
      c.fillRect(this.px - 240, this.py - 240, 480, 480);
    }

    // street lamps
    for (const l of this.lamps) {
      if (!this.vis(l.x, l.y, 220)) continue;
      const flick = 0.85 + 0.15 * Math.sin(this.time * 7 + l.x);
      const g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, 200);
      g.addColorStop(0, `rgba(255,214,140,${0.13 * flick})`);
      g.addColorStop(1, "rgba(255,214,140,0)");
      c.fillStyle = g;
      c.fillRect(l.x - 200, l.y - 200, 400, 400);
    }

    // burning wrecks
    for (const o of this.obstacles) {
      if (!o.fire) continue;
      const fx = o.x + o.w / 2;
      const fy = o.y + o.h / 2;
      if (!this.vis(fx, fy, 200)) continue;
      const flick = 0.7 + 0.3 * Math.sin(this.time * 19 + o.seed);
      const g = c.createRadialGradient(fx, fy, 0, fx, fy, 170);
      g.addColorStop(0, `rgba(255,140,50,${0.16 * flick})`);
      g.addColorStop(1, "rgba(255,140,50,0)");
      c.fillStyle = g;
      c.fillRect(fx - 170, fy - 170, 340, 340);
    }

    // muzzle light
    if (this.muzzleT > 0) {
      const a = this.muzzleT / 0.05;
      const mg = c.createRadialGradient(this.muzzleX, this.muzzleY, 0, this.muzzleX, this.muzzleY, 150);
      mg.addColorStop(0, `rgba(255,210,120,${0.34 * a})`);
      mg.addColorStop(1, "rgba(255,210,120,0)");
      c.fillStyle = mg;
      c.fillRect(this.muzzleX - 150, this.muzzleY - 150, 300, 300);
    }
    c.restore();
  }

  private drawFog(c: CanvasRenderingContext2D) {
    for (const f of this.fogs) {
      const gr = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      gr.addColorStop(0, "rgba(130,168,120,0.05)");
      gr.addColorStop(1, "rgba(130,168,120,0)");
      c.fillStyle = gr;
      c.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
  }

  private drawSpores(c: CanvasRenderingContext2D) {
    c.fillStyle = "rgba(190,245,130,0.35)";
    for (const s of this.spores) {
      const a = 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(this.time * 2 + s.ph));
      c.globalAlpha = a;
      c.fillRect(s.x, s.y, 2, 2);
    }
    c.globalAlpha = 1;
  }

  private drawZombie(c: CanvasRenderingContext2D, z: Zombie) {
    const bob = Math.sin(z.phase) * 1.8;
    const lunge = 1 + z.lungeT * 1.4;
    const r = z.r * lunge;
    c.save();
    c.translate(z.x, z.y);
    // shadow
    c.fillStyle = "rgba(0,0,0,0.35)";
    c.beginPath();
    c.ellipse(0, r * 0.7, r * 0.95, r * 0.45, 0, 0, Math.PI * 2);
    c.fill();

    const pal = {
      walker: { body: "#5d8f3a", dark: "#39591f", eye: "#d4ff4d" },
      runner: { body: "#b3502e", dark: "#77301a", eye: "#ffd166" },
      spitter: { body: "#8fb32e", dark: "#5c751c", eye: "#d4ff4d" },
      brute: { body: "#6e3b4a", dark: "#45222d", eye: "#ff4b52" },
      boss: { body: "#7a1f2b", dark: "#4a0f17", eye: "#ff4b52" },
    }[z.kind];

    // arms
    const aimA = Math.atan2(this.py - z.y, this.px - z.x);
    const perp = aimA + Math.PI / 2;
    // arms reach hungrily toward the target
    const swing = Math.sin(z.phase * 1.4) * r * 0.22;
    c.fillStyle = pal.dark;
    for (const s of [-1, 1]) {
      const ax = Math.cos(perp) * r * 0.5 * s + Math.cos(aimA) * (r * 0.88 + swing * s);
      const ay = Math.sin(perp) * r * 0.5 * s + Math.sin(aimA) * (r * 0.88 + swing * s);
      c.beginPath();
      c.arc(ax, ay, r * 0.32, 0, Math.PI * 2);
      c.fill();
    }
    // body
    const bg = c.createRadialGradient(-r * 0.3, -r * 0.3 + bob * 0.3, r * 0.2, 0, bob * 0.3, r * 1.15);
    bg.addColorStop(0, pal.body);
    bg.addColorStop(1, pal.dark);
    c.fillStyle = bg;
    c.beginPath();
    c.arc(0, bob * 0.3, r, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "rgba(0,0,0,0.45)";
    c.stroke();

    // rot spots (seeded per-hostile so they don't swim)
    const sd = z.r * 7.31;
    c.fillStyle = "rgba(16,26,10,0.42)";
    for (let i = 0; i < 3; i++) {
      const sa = sd + i * 2.1;
      c.beginPath();
      c.arc(Math.cos(sa) * r * 0.42, Math.sin(sa) * r * 0.42 + bob * 0.3, r * (0.12 + (i % 2) * 0.06), 0, Math.PI * 2);
      c.fill();
    }

    // burning overlay
    if (z.burnT > 0) {
      c.fillStyle = `rgba(255,120,40,${0.24 + 0.1 * Math.sin(this.time * 21 + z.r)})`;
      c.beginPath();
      c.arc(0, bob * 0.3, r * 0.95, 0, Math.PI * 2);
      c.fill();
    }

    if (z.kind === "brute" || z.kind === "boss") {
      c.strokeStyle = "rgba(0,0,0,0.5)";
      c.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(0, bob * 0.3, r * (0.45 + i * 0.22), -0.9, 0.9);
        c.stroke();
      }
    }
    if (z.kind === "boss") {
      c.fillStyle = pal.dark;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + this.time * 0.4;
        c.beginPath();
        c.moveTo(Math.cos(a) * r, Math.sin(a) * r + bob * 0.3);
        c.lineTo(Math.cos(a + 0.18) * (r + 12), Math.sin(a + 0.18) * (r + 12) + bob * 0.3);
        c.lineTo(Math.cos(a + 0.36) * r, Math.sin(a + 0.36) * r + bob * 0.3);
        c.fill();
      }
    }
    if (z.kind === "spitter") {
      const pulse = 1 + Math.sin(this.time * 6 + z.phase) * 0.15;
      c.fillStyle = "#cdeb45";
      c.beginPath();
      c.arc(-Math.cos(aimA) * r * 0.3, -Math.sin(aimA) * r * 0.3 + bob * 0.3, r * 0.42 * pulse, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(90,120,10,0.8)";
      c.beginPath();
      c.arc(-Math.cos(aimA) * r * 0.3, -Math.sin(aimA) * r * 0.3 + bob * 0.3, r * 0.2 * pulse, 0, Math.PI * 2);
      c.fill();
    }
    // eyes
    for (const s of [-1, 1]) {
      const ex = Math.cos(aimA) * r * 0.45 + Math.cos(perp) * r * 0.28 * s;
      const ey = Math.sin(aimA) * r * 0.45 + Math.sin(perp) * r * 0.28 * s + bob * 0.3;
      const er = Math.max(1.6, r * 0.13);
      c.globalAlpha = 0.28;
      c.fillStyle = pal.eye;
      c.beginPath();
      c.arc(ex, ey, er * 2.4, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
      c.beginPath();
      c.arc(ex, ey, er, 0, Math.PI * 2);
      c.fill();
    }

    // hit flash
    if (z.flashT > 0) {
      c.globalAlpha = (z.flashT / 0.09) * 0.8;
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(0, bob * 0.3, r, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
    c.restore();

    // hp bar (when damaged, non-boss)
    if (z.hp < z.maxHp && z.kind !== "boss") {
      const bw = z.r * 2;
      const frac = clamp(z.hp / z.maxHp, 0, 1);
      c.fillStyle = "rgba(0,0,0,0.6)";
      c.fillRect(z.x - bw / 2, z.y - z.r - 12, bw, 4);
      c.fillStyle = frac > 0.4 ? "#a3f52e" : "#e5222e";
      c.fillRect(z.x - bw / 2, z.y - z.r - 12, bw * frac, 4);
    }
  }

  private drawPlayer(c: CanvasRenderingContext2D) {
    // ghosts — bone-colored afterimages, clearly the operator
    for (const g of this.ghosts) {
      c.globalAlpha = g.a * 0.45;
      c.fillStyle = "#e8e0c8";
      c.beginPath();
      c.arc(g.x, g.y, 13, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    const blink = this.invulnT > 0 && this.dashT <= 0 && Math.floor(this.time * 18) % 2 === 0;
    c.save();
    c.translate(this.px, this.py);
    c.globalAlpha = blink ? 0.45 : 1;

    // shadow
    c.fillStyle = "rgba(0,0,0,0.4)";
    c.beginPath();
    c.ellipse(0, 10, 14, 7, 0, 0, Math.PI * 2);
    c.fill();

    // boots (visible when running)
    if (this.moving || this.dashT > 0) {
      const stride = Math.sin(this.runPhase) * 6;
      const bperp = this.moveA + Math.PI / 2;
      c.fillStyle = "#20261a";
      for (const s of [-1, 1]) {
        const off = stride * s;
        c.beginPath();
        c.arc(
          Math.cos(this.moveA) * off + Math.cos(bperp) * 5 * s,
          Math.sin(this.moveA) * off + Math.sin(bperp) * 5 * s + 3,
          3.4,
          0,
          Math.PI * 2
        );
        c.fill();
      }
    }

    // gun
    c.save();
    c.rotate(this.aim);
    this.drawGun(c);
    c.restore();

    // body — sand-khaki uniform, reads instantly against the green horde
    const bg = c.createRadialGradient(-4, -5, 2, 0, 0, 16);
    bg.addColorStop(0, "#d9c79c");
    bg.addColorStop(1, "#8f7d55");
    c.fillStyle = bg;
    c.beginPath();
    c.arc(0, 0, 13, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "rgba(38,28,12,0.6)";
    c.stroke();
    // chest rig
    c.fillStyle = "#5a4f33";
    c.fillRect(-6, -3, 12, 7);
    c.fillStyle = "#3c3521";
    c.fillRect(-6, -3, 12, 2);
    // helmet — charcoal steel with bone-white visor
    c.fillStyle = "#2b3238";
    c.beginPath();
    c.arc(0, 0, 8, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(0,0,0,0.5)";
    c.lineWidth = 1.5;
    c.stroke();
    c.strokeStyle = "rgba(255,255,255,0.85)";
    c.lineWidth = 1.8;
    c.beginPath();
    c.arc(0, 0, 8, this.aim - 0.6, this.aim + 0.6);
    c.stroke();
    // red shoulder insignia
    c.fillStyle = "#e5222e";
    c.beginPath();
    c.arc(-Math.cos(this.aim + Math.PI / 2) * 10, -Math.sin(this.aim + Math.PI / 2) * 10, 2.2, 0, Math.PI * 2);
    c.fill();
    // hands
    c.fillStyle = "#e3b98d";
    const hx = Math.cos(this.aim) * 12;
    const hy = Math.sin(this.aim) * 12;
    const perp = this.aim + Math.PI / 2;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.arc(hx + Math.cos(perp) * 4 * s, hy + Math.sin(perp) * 4 * s, 3, 0, Math.PI * 2);
      c.fill();
    }

    // muzzle flash
    if (this.muzzleT > 0) {
      const a = this.muzzleT / 0.05;
      const mDist = this.tier === 6 ? 34 : this.tier === 5 ? 30 : this.tier === 2 ? 29 : 26;
      const fLen = this.tier === 6 ? 26 : this.tier === 2 || this.tier === 5 ? 20 : 14;
      const fWid = this.tier === 2 || this.tier === 5 ? 8 : 5;
      c.save();
      c.translate(Math.cos(this.aim) * mDist, Math.sin(this.aim) * mDist);
      c.rotate(this.aim);
      c.globalAlpha = a;
      c.fillStyle = this.tier === 6 ? "#aee9ff" : "#ffe9a8";
      c.beginPath();
      c.moveTo(0, -fWid);
      c.lineTo(fLen, 0);
      c.lineTo(0, fWid);
      c.lineTo(3, 0);
      c.closePath();
      c.fill();
      c.restore();
    }
    c.restore();

    // shield ring
    if (this.shieldT > 0) {
      const pulse = 0.55 + 0.25 * Math.sin(this.time * 7);
      c.save();
      c.translate(this.px, this.py);
      c.rotate(this.time * 1.5);
      c.strokeStyle = `rgba(107,227,255,${pulse})`;
      c.lineWidth = 2.5;
      c.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const rr = 21;
        if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.stroke();
      c.restore();
    }
  }

  private drawGun(c: CanvasRenderingContext2D) {
    const dark = "#1c2217";
    const mid = "#2b3322";
    const lite = "#4a5638";
    const metal = "#39424c";
    const wood = "#5c4a26";
    switch (this.tier) {
      case 0: {
        // M9 sidearm
        c.fillStyle = dark;
        c.fillRect(5, -2.5, 14, 5);
        c.fillStyle = metal;
        c.fillRect(19, -1.5, 5, 3);
        c.fillStyle = lite;
        c.fillRect(5, -2.5, 12, 1.4);
        break;
      }
      case 1: {
        // VECTOR SMG
        c.fillStyle = dark;
        c.fillRect(4, -3, 19, 6);
        c.fillStyle = mid;
        c.fillRect(11, 3, 4.5, 9);
        c.fillStyle = dark;
        c.fillRect(12, 4.5, 2.5, 6.5);
        c.fillRect(17, 3, 3, 6);
        c.fillStyle = metal;
        c.fillRect(23, -1.5, 5, 3);
        c.fillStyle = lite;
        c.fillRect(5, -3, 16, 1.4);
        break;
      }
      case 2: {
        // RIOT SHOTGUN — twin barrels + wooden pump
        c.fillStyle = dark;
        c.fillRect(2, -2.8, 7, 5.6);
        c.fillStyle = metal;
        c.fillRect(5, -4.2, 24, 3.6);
        c.fillRect(5, 0.6, 24, 3.6);
        c.fillStyle = "#232a31";
        c.fillRect(27, -4.2, 2.4, 3.6);
        c.fillRect(27, 0.6, 2.4, 3.6);
        c.fillStyle = wood;
        c.fillRect(14, -2.4, 8, 4.8);
        c.fillStyle = lite;
        c.fillRect(5, -4.2, 22, 1.1);
        break;
      }
      case 3: {
        // AK-74 — curved mag, wood stock, front post
        c.fillStyle = wood;
        c.fillRect(-1, -2.2, 5, 4.4);
        c.fillStyle = dark;
        c.fillRect(3, -3, 19, 6);
        c.save();
        c.translate(11, 3);
        c.rotate(0.42);
        c.fillStyle = "#3a3122";
        c.fillRect(-2.2, 0, 5, 9.5);
        c.restore();
        c.fillStyle = metal;
        c.fillRect(22, -1.5, 9, 3);
        c.fillRect(29, -3.6, 1.6, 2.2);
        c.fillStyle = lite;
        c.fillRect(4, -3, 16, 1.3);
        break;
      }
      case 4: {
        // M134 MINIGUN — spinning barrel cluster
        c.fillStyle = "#232b1c";
        c.fillRect(5, -5, 13, 10);
        c.fillStyle = dark;
        c.fillRect(7, -3.6, 9, 7.2);
        const spin = this.time * 16;
        for (let i = 0; i < 3; i++) {
          const off = Math.sin(spin + i * 2.094) * 3.4;
          c.fillStyle = metal;
          c.fillRect(18, off - 1.1, 15, 2.2);
          c.fillStyle = "#59646e";
          c.fillRect(31, off - 1.1, 2.4, 2.2);
        }
        c.strokeStyle = "#161b12";
        c.lineWidth = 1.6;
        c.beginPath();
        c.arc(33.5, 0, 3.4, 0, Math.PI * 2);
        c.stroke();
        break;
      }
      case 5: {
        // M6 INCINERATOR — fuel tank, hose, nozzle, live pilot light
        c.fillStyle = dark;
        c.fillRect(5, -3.5, 21, 7);
        c.fillStyle = "#7a4a2c";
        c.fillRect(8, -10.5, 12, 5.6);
        c.beginPath();
        c.arc(8, -7.7, 2.8, Math.PI / 2, Math.PI * 1.5);
        c.arc(20, -7.7, 2.8, -Math.PI / 2, Math.PI / 2);
        c.fill();
        c.strokeStyle = dark;
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(12, -10.5);
        c.lineTo(12, -4.9);
        c.moveTo(16, -10.5);
        c.lineTo(16, -4.9);
        c.stroke();
        c.strokeStyle = "#151a10";
        c.lineWidth = 1.8;
        c.beginPath();
        c.moveTo(8, -7.5);
        c.quadraticCurveTo(2, -6, 3, -2);
        c.stroke();
        c.fillStyle = metal;
        c.beginPath();
        c.moveTo(26, -5);
        c.lineTo(31, 0);
        c.lineTo(26, 5);
        c.closePath();
        c.fill();
        // pilot light — always hungry
        const fl = 2.4 + Math.sin(this.time * 19) * 1.1;
        c.fillStyle = "rgba(255,139,61,0.85)";
        c.beginPath();
        c.moveTo(31, -2);
        c.lineTo(31 + fl * 1.8, 0);
        c.lineTo(31, 2);
        c.closePath();
        c.fill();
        c.fillStyle = "#ffd166";
        c.beginPath();
        c.arc(31, 0, 1.4, 0, Math.PI * 2);
        c.fill();
        break;
      }
      default: {
        // ARC-9 RAILGUN — twin rails + pulsing energy core
        c.fillStyle = dark;
        c.fillRect(-1, -2, 5, 4);
        c.fillStyle = "#232b33";
        c.fillRect(3, -2.6, 23, 5.2);
        c.fillStyle = metal;
        c.fillRect(24, -4.4, 11, 2.2);
        c.fillRect(24, 2.2, 11, 2.2);
        c.fillStyle = "#59646e";
        c.fillRect(33, -4.4, 2.4, 2.2);
        c.fillRect(33, 2.2, 2.4, 2.2);
        // core
        const pr = 3 + Math.sin(this.time * 9) * 0.9;
        c.fillStyle = "rgba(124,231,255,0.22)";
        c.beginPath();
        c.arc(14, 0, pr + 4.5, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#7ce7ff";
        c.beginPath();
        c.arc(14, 0, pr, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#e8fbff";
        c.beginPath();
        c.arc(14, 0, pr * 0.45, 0, Math.PI * 2);
        c.fill();
        // capacitor cells
        for (let i = 0; i < 3; i++) {
          c.fillStyle = `rgba(124,231,255,${0.35 + 0.3 * Math.sin(this.time * 6 + i * 1.7)})`;
          c.fillRect(5 + i * 4, -1.4, 2.2, 2.8);
        }
        break;
      }
    }
  }

  private drawBullets(c: CanvasRenderingContext2D) {
    for (const b of this.bullets) {
      const lx = b.x - b.vx * 0.022;
      const ly = b.y - b.vy * 0.022;
      const col = this.powerT > 0 ? "#ffb347" : b.col;
      const lw = b.w;
      // glow pass
      c.globalAlpha = 0.28;
      c.strokeStyle = col;
      c.lineWidth = lw * 2.6;
      c.beginPath();
      c.moveTo(lx, ly);
      c.lineTo(b.x, b.y);
      c.stroke();
      // core pass
      c.globalAlpha = 1;
      c.lineWidth = lw;
      c.beginPath();
      c.moveTo(lx, ly);
      c.lineTo(b.x, b.y);
      c.stroke();
      // railgun tip flare
      if (lw >= 4) {
        c.globalAlpha = 0.85;
        c.fillStyle = "#d8f7ff";
        c.beginPath();
        c.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }
    }
    c.globalAlpha = 1;
  }

  private drawAcids(c: CanvasRenderingContext2D) {
    for (const a of this.acids) {
      if (a.big) {
        // boss plasma orb — burning core + motion trail
        const tx = a.x - a.vx * 0.03;
        const ty = a.y - a.vy * 0.03;
        c.strokeStyle = "rgba(255,107,61,0.35)";
        c.lineWidth = 7;
        c.beginPath();
        c.moveTo(tx, ty);
        c.lineTo(a.x, a.y);
        c.stroke();
        const pulse = 1 + Math.sin(this.time * 24 + a.x) * 0.12;
        c.fillStyle = "rgba(255,107,61,0.3)";
        c.beginPath();
        c.arc(a.x, a.y, 13 * pulse, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#ff6b3d";
        c.beginPath();
        c.arc(a.x, a.y, 8 * pulse, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#ffd166";
        c.beginPath();
        c.arc(a.x - 2, a.y - 2, 3.4, 0, Math.PI * 2);
        c.fill();
        continue;
      }
      c.fillStyle = "rgba(168,230,46,0.3)";
      c.beginPath();
      c.arc(a.x, a.y, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#a8e62e";
      c.beginPath();
      c.arc(a.x, a.y, 5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#e2ff8a";
      c.beginPath();
      c.arc(a.x - 1, a.y - 1, 2, 0, Math.PI * 2);
      c.fill();
    }
  }

  private drawPickups(c: CanvasRenderingContext2D) {
    for (const p of this.pickups) {
      if (!this.vis(p.x, p.y, 120)) continue;
      const bobY = Math.sin(p.t * 3) * 4;
      const blink = p.life < 3 && Math.floor(p.t * 6) % 2 === 0;
      const conf: Record<PickupKind, { col: string; glow: string }> = {
        medkit: { col: "#e5222e", glow: "rgba(229,34,46,0.35)" },
        frenzy: { col: "#ffd166", glow: "rgba(255,209,102,0.35)" },
        power: { col: "#ff9d5c", glow: "rgba(255,157,92,0.35)" },
        shield: { col: "#6be3ff", glow: "rgba(107,227,255,0.35)" },
        nuke: { col: "#d4ff4d", glow: "rgba(212,255,77,0.45)" },
      };
      const cf = conf[p.kind];
      // loot beacon
      if (!blink) {
        const beam = c.createLinearGradient(p.x, p.y - 110, p.x, p.y);
        beam.addColorStop(0, "rgba(0,0,0,0)");
        beam.addColorStop(1, cf.glow);
        c.fillStyle = beam;
        c.globalAlpha = 0.5;
        c.fillRect(p.x - 4, p.y - 110, 8, 110);
        c.globalAlpha = 1;
      }
      if (blink) continue;
      c.save();
      c.translate(p.x, p.y + bobY);
      const g = c.createRadialGradient(0, 0, 2, 0, 0, 26);
      g.addColorStop(0, cf.glow);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.fillRect(-26, -26, 52, 52);
      c.rotate(Math.sin(p.t * 2) * 0.12);
      c.fillStyle = "#131a10";
      c.strokeStyle = cf.col;
      c.lineWidth = 2;
      c.beginPath();
      c.rect(-11, -11, 22, 22);
      c.fill();
      c.stroke();
      c.fillStyle = cf.col;
      if (p.kind === "medkit") {
        c.fillRect(-7, -2.5, 14, 5);
        c.fillRect(-2.5, -7, 5, 14);
      } else if (p.kind === "frenzy") {
        for (let i = -1; i <= 1; i++) c.fillRect(i * 5 - 1.5, -7, 3, 14);
      } else if (p.kind === "power") {
        c.beginPath();
        c.moveTo(2, -8);
        c.lineTo(-5, 1);
        c.lineTo(-1, 1);
        c.lineTo(-2, 8);
        c.lineTo(5, -1);
        c.lineTo(1, -1);
        c.closePath();
        c.fill();
      } else if (p.kind === "shield") {
        c.beginPath();
        c.moveTo(0, -8);
        c.lineTo(7, -4);
        c.lineTo(7, 3);
        c.lineTo(0, 8);
        c.lineTo(-7, 3);
        c.lineTo(-7, -4);
        c.closePath();
        c.fill();
      } else {
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
          c.beginPath();
          c.arc(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 3.4, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = "#131a10";
        c.beginPath();
        c.arc(0, 0, 2.4, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
  }

  private drawParticles(c: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const f = 1 - p.t / p.life;
      if (p.kind === "ring") {
        const r = 20 + (p.t / p.life) * 1500;
        c.globalAlpha = f * 0.8;
        c.strokeStyle = p.color;
        c.lineWidth = 6 * f + 1;
        c.beginPath();
        c.arc(p.x, p.y, r, 0, Math.PI * 2);
        c.stroke();
        c.globalAlpha = 1;
        continue;
      }
      c.globalAlpha = f;
      if (p.kind === "shell") {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.color;
        c.fillRect(-2.5, -1, 5, 2);
        c.restore();
      } else if (p.kind === "smoke" || p.kind === "dust") {
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.size * (1 + p.t * 2), 0, Math.PI * 2);
        c.fill();
      } else if (p.kind === "spark") {
        c.strokeStyle = p.color;
        c.lineWidth = p.size;
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        c.stroke();
      } else {
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }
  }

  private drawTexts(c: CanvasRenderingContext2D) {
    c.textAlign = "center";
    for (const t of this.texts) {
      const f = t.t / t.life;
      const y = t.y - f * 34;
      const pop = t.crit ? 1 + Math.max(0, 0.35 - f * 2) : 1;
      c.globalAlpha = f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3;
      c.font = `800 ${t.size * pop}px Oxanium, monospace`;
      c.strokeStyle = "rgba(0,0,0,0.75)";
      c.lineWidth = 3;
      c.strokeText(t.text, t.x, y);
      c.fillStyle = t.color;
      c.fillText(t.text, t.x, y);
    }
    c.globalAlpha = 1;
  }

  private drawIndicators(c: CanvasRenderingContext2D) {
    // COD-style edge markers — no hostile can ever hide offscreen again
    if (this.phase === "gameover") return;
    const inset = 26;
    const x0 = inset;
    const y0 = inset + (this.boss ? 46 : 0);
    const x1 = this.w - inset;
    const y1 = this.h - inset;
    const cx = this.w / 2;
    const cy = this.h / 2;
    let drawn = 0;
    for (const z of this.zombies) {
      if (z.dead || drawn >= 40) continue;
      const sx = z.x - this.cam.x + cx;
      const sy = z.y - this.cam.y + cy;
      if (sx > x0 && sx < x1 && sy > y0 && sy < y1) continue;
      const a = Math.atan2(sy - cy, sx - cx);
      const tx = Math.cos(a);
      const ty = Math.sin(a);
      const sxr = Math.abs(tx) > 1e-6 ? (tx > 0 ? x1 - cx : x0 - cx) / tx : Infinity;
      const syr = Math.abs(ty) > 1e-6 ? (ty > 0 ? y1 - cy : y0 - cy) / ty : Infinity;
      const t = Math.min(Math.abs(sxr), Math.abs(syr));
      const ex = cx + tx * t;
      const ey = cy + ty * t;
      const worldD = Math.hypot(z.x - this.px, z.y - this.py);
      const alpha = clamp(1.15 - worldD / 1600, 0.3, 0.95);
      const col =
        z.kind === "boss"
          ? "#ff4b52"
          : z.kind === "spitter"
            ? "#cdeb45"
            : z.kind === "runner"
              ? "#ffb347"
              : z.kind === "brute"
                ? "#e8e0c8"
                : "#a3f52e";
      const size = z.kind === "boss" ? 13 + Math.sin(this.time * 8) * 2.5 : z.kind === "brute" ? 10 : 7.5;
      c.save();
      c.translate(ex, ey);
      c.rotate(a);
      c.globalAlpha = alpha;
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(size, 0);
      c.lineTo(-size * 0.7, size * 0.62);
      c.lineTo(-size * 0.35, 0);
      c.lineTo(-size * 0.7, -size * 0.62);
      c.closePath();
      c.fill();
      c.restore();
      drawn++;
    }
    c.globalAlpha = 1;
  }

  private drawMinimap(c: CanvasRenderingContext2D) {
    if (this.isTouch) return; // touch layout uses the pause button + edge markers instead
    if (this.w < 680) return; // too narrow — would overlap the vitals panel
    const mw = 178;
    const mh = Math.round((mw * WORLD_H) / WORLD_W);
    const x0 = this.w - mw - 14;
    const y0 = 14;
    const s = mw / WORLD_W;

    c.fillStyle = "rgba(7,11,7,0.78)";
    c.fillRect(x0, y0, mw, mh);
    c.strokeStyle = "rgba(163,245,46,0.35)";
    c.lineWidth = 1.5;
    c.strokeRect(x0, y0, mw, mh);

    // roads
    c.strokeStyle = "rgba(232,224,200,0.18)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x0, y0 + ROAD_Y * s);
    c.lineTo(x0 + mw, y0 + ROAD_Y * s);
    c.moveTo(x0 + ROAD_X * s, y0);
    c.lineTo(x0 + ROAD_X * s, y0 + mh);
    c.stroke();

    // obstacles
    for (const o of this.obstacles) {
      c.fillStyle = o.kind === "building" ? "rgba(140,160,140,0.4)" : "rgba(120,130,110,0.25)";
      c.fillRect(x0 + o.x * s, y0 + o.y * s, Math.max(1.5, o.w * s), Math.max(1.5, o.h * s));
    }

    // camera view
    c.strokeStyle = "rgba(232,224,200,0.16)";
    c.lineWidth = 1;
    c.strokeRect(x0 + (this.cam.x - this.w / 2) * s, y0 + (this.cam.y - this.h / 2) * s, this.w * s, this.h * s);

    // pickups
    for (const p of this.pickups) {
      c.fillStyle = "#d4ff4d";
      c.fillRect(x0 + p.x * s - 1.5, y0 + p.y * s - 1.5, 3, 3);
    }
    // hostiles
    c.fillStyle = "#e5222e";
    for (const z of this.zombies) {
      if (z.kind === "boss") continue;
      c.fillRect(x0 + z.x * s - 1, y0 + z.y * s - 1, 2, 2);
    }
    if (this.boss && !this.boss.dead) {
      const pulse = 2.5 + Math.sin(this.time * 6) * 1.2;
      c.fillStyle = "#ff4b52";
      c.beginPath();
      c.arc(x0 + this.boss.x * s, y0 + this.boss.y * s, pulse, 0, Math.PI * 2);
      c.fill();
    }
    // player
    const pxm = x0 + this.px * s;
    const pym = y0 + this.py * s;
    c.save();
    c.translate(pxm, pym);
    c.rotate(this.aim);
    c.fillStyle = "#a3f52e";
    c.beginPath();
    c.moveTo(5, 0);
    c.lineTo(-3.5, -3.5);
    c.lineTo(-3.5, 3.5);
    c.closePath();
    c.fill();
    c.restore();

    c.font = "700 8px Oxanium, monospace";
    c.textAlign = "left";
    c.fillStyle = "rgba(163,245,46,0.55)";
    c.fillText("TAC-MAP // SECTOR 9", x0 + 5, y0 + mh - 5);
  }

  private drawCrosshair(c: CanvasRenderingContext2D) {
    const x = this.mouseX;
    const y = this.mouseY;
    const gap = 7 + this.spreadKick * 9 + (this.sprinting ? 5 : 0);
    const col = this.ammo <= 0 && this.reloadT < 0 ? "#e5222e" : "#a3f52e";
    c.strokeStyle = col;
    c.lineWidth = 1.6;
    c.globalAlpha = 0.9;
    c.beginPath();
    c.arc(x, y, 2.2, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      c.beginPath();
      c.moveTo(x + Math.cos(a) * gap, y + Math.sin(a) * gap);
      c.lineTo(x + Math.cos(a) * (gap + 7), y + Math.sin(a) * (gap + 7));
      c.stroke();
    }
    // hitmarker — white flash on hit, red X on kill confirm
    if (this.hitT > 0 || this.hitKillT > 0) {
      const kill = this.hitKillT > 0;
      const a = kill ? this.hitKillT / 0.2 : this.hitT / 0.13;
      c.strokeStyle = kill ? "#ff4b52" : "#ffffff";
      c.lineWidth = kill ? 2.4 : 1.8;
      c.globalAlpha = Math.min(1, a * 1.2);
      for (let i = 0; i < 4; i++) {
        const an = (i / 4) * Math.PI * 2 + Math.PI / 4;
        c.beginPath();
        c.moveTo(x + Math.cos(an) * 3.5, y + Math.sin(an) * 3.5);
        c.lineTo(x + Math.cos(an) * 9.5, y + Math.sin(an) * 9.5);
        c.stroke();
      }
      c.globalAlpha = 0.9;
    }
    if (this.reloadT >= 0) {
      const w = this.weapon();
      const frac = 1 - this.reloadT / (w.reload * (this.frenzyT > 0 ? 0.7 : 1));
      c.strokeStyle = "#ffd166";
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(x, y, gap + 12, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
}
